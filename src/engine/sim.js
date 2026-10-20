// Основной цикл игры: дни, матчи, тренировки, финансы, трансферы, смена сезона.
import { LEAGUES, LEAGUE_BY_ID } from '../data/leagues';
import { NATIONS, NATION_BY_CODE } from '../data/nations';
import { rand, randInt, chance, pick, shuffle, weighted, gauss, getState, seed } from './rng';
import { recalcOvr, playerValue, wageFor, clamp, POS_WEIGHTS, ATTRS, LINE, money, fmtDate, seasonLabel } from './util';
import { createMatch, simulateFull, applyResults, winnerSide, quickMatch } from './match';
import { buildSeason, buildFinals, recordResult, recordFriendly, koContext, sortRows, addFriendly, healComp } from './comps';
import { INTL_DAYS, SUMMER_DAYS, isWindow, WINDOWS } from './fixtures';
import { teamName, teamPool, teamTactic, isNat, natCode, isUserTeam, callUp, invalidateNatIndex, teamRep } from './teams';
import { levelOfRep, youthPlayer, newStats, newFin, fillNations, makePlayer, randomName } from './gen';

// ================= сообщения =================
export function mail(W, title, body, opts = {}) {
  W.inbox.unshift({ id: `${W.year}-${W.day}-${Math.floor(rand() * 1e6)}`, y: W.year, d: W.day, title, body, read: false, ...opts });
  if (W.inbox.length > 250) W.inbox.length = 250;
  if (opts.stop) W._stop = true;
}
export function news(W, text) {
  W.news.unshift({ y: W.year, d: W.day, text });
  if (W.news.length > 150) W.news.length = 150;
}

function logErr(W, where, e) {
  (W.errors ||= []).push({ where, msg: String(e?.message || e).slice(0, 300), stack: String(e?.stack || '').slice(0, 400), y: W.year, d: W.day, t: Date.now() });
  if (W.errors.length > 20) W.errors.splice(0, W.errors.length - 20);
}

// ================= новая игра =================
export function newGame(W, { club, nation, name }) {
  W.user = {
    name: name || 'Тренер', club: club || null, nation: nation || null,
    rep: club ? clamp(W.clubs[club].rep - 8, 30, 90) : clamp((W.nations[nation]?.rep || 60) - 5, 30, 90),
    conf: 65, natConf: 65, trophies: [], career: [], autoSubs: true, autoCall: false, target: null, natTarget: null,
  };
  buildSeason(W, null);
  startOfSeason(W, true);
  W.rng = getState();
  return W;
}

function startOfSeason(W, first = false) {
  const u = W.user;
  if (u.club) {
    const c = W.clubs[u.club];
    preseasonFriendlies(W);
    if (c.league) {
      const order = W.leagues[c.league].clubs.slice().sort((a, b) => W.clubs[b].rep - W.clubs[a].rep);
      u.target = Math.min(order.indexOf(c.id) + 1 + 1, order.length);
      if (order.indexOf(c.id) === 0) u.target = 1;
      const L = LEAGUE_BY_ID[c.league];
      mail(W, `Сезон ${seasonLabel(W.year)}: задача от руководства`,
        `Руководство «${c.name}» ждёт место не ниже ${u.target}-го в турнире «${L.name}».\n\nБюджет клуба: ${money(c.balance)}.\nЛетнее трансферное окно открыто до 31 августа.`);
    }
  }
  if (u.nation) {
    u.natTarget = W.nations[u.nation].rep >= 78 ? 'выход из группы и борьба за медали' : W.nations[u.nation].rep >= 65 ? 'выход на финальный турнир' : 'достойное выступление в отборе';
    nationFriendlies(W);
    if (first || !W.nations[u.nation].squad?.length) callUp(W, u.nation);
    mail(W, `Сборная: задача федерации`, `Федерация рассчитывает на ${u.natTarget}. Вызов игроков — во вкладке «Сборная».`);
  }
  if (first) {
    mail(W, 'Добро пожаловать!', `Вы — новый главный тренер${u.club ? ` клуба «${W.clubs[u.club].name}»` : ''}${u.nation ? `${u.club ? ' и' : ''} сборной ${NATION_BY_CODE[u.nation].name}` : ''}.\n\nНажимайте «Продолжить», чтобы двигаться по календарю. Игра остановится перед вашими матчами и при важных событиях.`);
  }
}

function preseasonFriendlies(W) {
  const u = W.user;
  if (!u.club) return;
  const c = W.clubs[u.club];
  const opp = shuffle(Object.values(W.clubs).filter((x) => x.id !== c.id && Math.abs(x.rep - c.rep) < 12));
  [17, 24, 31].forEach((d, i) => {
    const o = opp[i];
    if (!o || d < W.day) return;
    if (chance(0.5)) addFriendly(W, c.id, o.id, d, 'Предсезонный товарищеский матч');
    else addFriendly(W, o.id, c.id, d, 'Предсезонный товарищеский матч');
  });
}

function nationFriendlies(W) {
  const u = W.user;
  if (!u.nation) return;
  const me = `n:${u.nation}`;
  const busy = new Set();
  for (const d of [...INTL_DAYS, ...SUMMER_DAYS]) {
    for (const e of W.sched[d] || []) {
      const st = W.comps[e.c]?.stages[e.s];
      if (!st) continue;
      for (const m of st.rounds[e.r] || []) if (m.h === me || m.a === me) busy.add(d);
    }
  }
  const myRep = W.nations[u.nation].rep;
  const opp = NATIONS.filter((n) => n.code !== u.nation && Math.abs(W.nations[n.code].rep - myRep) < 15);
  for (const d of INTL_DAYS) {
    if (busy.has(d) || d < W.day || !opp.length) continue;
    const o = `n:${pick(opp).code}`;
    if (chance(0.5)) addFriendly(W, me, o, d, 'Товарищеский матч сборных');
    else addFriendly(W, o, me, d, 'Товарищеский матч сборных');
  }
}

// ================= матчи =================
function teamSpec(W, id) {
  const pool = teamPool(W, id);
  const tac = teamTactic(W, id);
  const ps = pool.map((x) => W.players[x]).filter(Boolean);
  const mor = ps.length ? ps.reduce((s, p) => s + p.mor, 0) / ps.length : 70;
  const user = isUserTeam(W, id);
  return {
    ref: id, name: teamName(W, id), short: isNat(id) ? natCode(id) : W.clubs[id].short, pool, tac, mor,
    isUser: user, autoSubs: user ? W.user.autoSubs !== false : true,
  };
}

export function prepareMatch(W, e, m, verbose = false) {
  const comp = W.comps[e.c];
  const stage = comp.stages[e.s];
  const neutral = !!(stage.neutral || comp.neutralAll);
  const ko = koContext(W, comp, stage, e.r, m);
  return createMatch(W, teamSpec(W, m.h), teamSpec(W, m.a), { neutral, ko, verbose });
}

export function finalizeMatch(W, e, m, S) {
  const comp = W.comps[e.c];
  const competitive = comp.kind !== 'friendly';
  const national = isNat(m.h);
  applyResults(W, S, { competitive, national });
  // дисквалификации: отбывают те, кто не играл
  if (!national) {
    for (const [side, cid] of [[S.h, m.h], [S.a, m.a]]) {
      for (const pid of W.clubs[cid].squad) {
        const p = W.players[pid];
        if (p.ban > 0 && !side.played.has(pid)) p.ban--;
      }
    }
  }
  const res = { hg: S.score[0], ag: S.score[1], gl: S.goals.map((g) => g.slice()), pen: S.pens };
  if (comp.id === 'FR') recordFriendly(W, m, res);
  else recordResult(W, comp, e.s, m, res);
  // выручка от билетов
  const stage = comp.stages[e.s];
  if (!national && !stage.neutral) ticketIncome(W, m.h, comp);
  // доверие и репутация тренера
  for (const [idx, id] of [[0, m.h], [1, m.a]]) {
    if (!isUserTeam(W, id) || !competitive) continue;
    const my = S.score[idx];
    const th = S.score[1 - idx];
    const opp = idx === 0 ? m.a : m.h;
    const strong = teamRep(W, opp) - teamRep(W, id);
    const r = my > th ? 1 : my < th ? -1 : 0;
    if (national) {
      W.user.natConf = clamp(W.user.natConf + (r > 0 ? 3 : r < 0 ? -5 + Math.max(0, strong) / 4 : strong > 0 ? 1 : -1), 0, 100);
    } else {
      W.user.conf = clamp(W.user.conf + (r > 0 ? 2.5 : r < 0 ? -4 + Math.max(0, strong) / 5 : strong > 0 ? 1 : -1), 0, 100);
    }
    if (r > 0 && strong > 5) W.user.rep = clamp(W.user.rep + 0.4, 1, 99);
    if (r < 0 && strong < -5) W.user.rep = clamp(W.user.rep - 0.2, 1, 99);
  }
  // кубковый вылет пользователя
  checkSacking(W);
}

export function demandFactor(c) {
  const L = c.league ? LEAGUE_BY_ID[c.league] : null;
  return 0.4 + 0.6 * Math.min(1, (L ? L.tv : 0.1) / 0.8);
}
export function fairPrice(c) {
  return Math.round((10 + c.rep * 0.5) * (0.5 + 0.5 * demandFactor(c)));
}

function ticketIncome(W, cid, comp) {
  const c = W.clubs[cid];
  if (!c) return;
  const fair = fairPrice(c);
  const big = comp.kind === 'cup' && comp.scope === 'club' && !comp.id.startsWith('CUP') ? 0.15 : 0;
  const ratio = clamp((0.3 + c.rep * 0.0075 + big - (c.stadium.price - fair) / (fair * 2.5)) * (0.55 + 0.45 * demandFactor(c)), 0.08, 1);
  const att = Math.round(c.stadium.cap * ratio);
  const inc = att * c.stadium.price;
  c.balance += inc;
  c.fin.tickets += inc;
  c.lastAtt = att;
}

export function todaysEntries(W) {
  return W.sched[W.day] || [];
}

export function userMatchToday(W) {
  if (!W.user) return null;
  for (const e of todaysEntries(W)) {
    const comp = W.comps[e.c];
    const st = comp?.stages[e.s];
    if (!st) continue;
    for (const m of st.rounds[e.r] || []) {
      if (m.hg === null && (isUserTeam(W, m.h) || isUserTeam(W, m.a))) return { e, m, comp, stage: st };
    }
  }
  return null;
}

function playDayMatches(W) {
  const entries = todaysEntries(W).slice();
  for (const e of entries) {
    const comp = W.comps[e.c];
    const st = comp?.stages[e.s];
    if (!st) continue;
    for (const m of (st.rounds[e.r] || []).slice()) {
      if (m.hg !== null || !m.h || !m.a) continue;
      try {
        const S = prepareMatch(W, e, m, false);
        quickMatch(W, S);
        finalizeMatch(W, e, m, S);
      } catch (err) {
        // один сломанный матч не должен останавливать всю игру
        logErr(W, `match ${e.c}`, err);
        if (m.hg === null) {
          try {
            if (comp.id === 'FR') recordFriendly(W, m, { hg: 0, ag: 0, gl: [] });
            else recordResult(W, comp, e.s, m, { hg: 1, ag: 0, gl: [], pen: null });
          } catch (err2) {
            logErr(W, `match-fallback ${e.c}`, err2);
            m.hg = 1; m.ag = 0; m.gl = [];
          }
        }
      }
    }
  }
}

// ================= перенос матчей =================
// Матчи, которые по какой-то причине не сыграли в свой день, переносятся на ближайший день.
// Матч без соперника засчитывается технической победой.
export function repairSchedule(W, userShift = 0) {
  let moved = 0;
  // битые записи расписания
  for (const d in W.sched) {
    const before = W.sched[d].length;
    W.sched[d] = W.sched[d].filter((e) => W.comps[e.c]?.stages[e.s]?.rounds[e.r]);
    moved += before - W.sched[d].length;
  }
  for (const cid in W.comps) {
    const comp = W.comps[cid];
    try {
      if (healComp(W, comp)) moved++;
    } catch (e) {
      (W.errors ||= []).push({ where: `heal ${cid}`, msg: String(e?.message || e), stack: String(e?.stack || '').slice(0, 300), y: W.year, d: W.day, t: Date.now() });
    }
    comp.stages.forEach((st, si) => {
      st.rounds.forEach((r, ri) => {
        for (const m of r) {
          if (m.hg !== null) continue;
          if (!m.h || !m.a) {
            if (cid === 'FR') { m.hg = 0; m.ag = 0; m.gl = []; continue; }
            const res = { hg: m.h ? 3 : 0, ag: m.a ? 3 : 0, gl: [] };
            if (!m.h && !m.a) res.ag = 0;
            recordResult(W, comp, si, m, res);
            moved++;
            continue;
          }
          if (m.day < W.day) {
            const isUser = isUserTeam(W, m.h) || isUserTeam(W, m.a);
            const nd = W.day + (isUser ? userShift : 0);
            m.day = nd;
            const list = (W.sched[nd] ||= []);
            if (!list.some((e) => e.c === cid && e.s === si && e.r === ri)) list.push({ c: cid, s: si, r: ri });
            if (isUser) mail(W, 'Матч перенесён', `Матч ${teamName(W, m.h)} — ${teamName(W, m.a)} (${comp.name}) перенесён на ${fmtDate(W.year, nd)}.`);
            moved++;
          }
        }
      });
    });
  }
  return moved;
}

// ================= день =================
export function processDay(W) {
  if (W.day % 7 === 3) repairSchedule(W, 1);
  // вызовы в сборные перед окном
  if (INTL_DAYS.includes(W.day + 1) || W.day + 1 === SUMMER_DAYS[0]) nationCallups(W);
  if (W.day === 343) {
    buildFinals(W);
    nationCallups(W);
    if (W.user?.nation) {
      const me = `n:${W.user.nation}`;
      const fin = Object.values(W.comps).find((c) => c.scope === 'nat' && c.kind === 'cup' && c.teams.includes(me));
      if (fin) mail(W, `${fin.name}`, `Сборная квалифицировалась на ${fin.name}! Проверьте заявку перед стартом турнира.`, { stop: true });
      else {
        const quals = Object.values(W.comps).filter((c) => c.kind === 'qual' && c.teams.includes(me));
        if (quals.length) {
          W.user.natConf = clamp(W.user.natConf - 30, 0, 100);
          mail(W, 'Сборная не прошла отбор', 'Федерация разочарована: команда не попала на финальный турнир.', { stop: true });
        }
      }
    }
  }
  playDayMatches(W);
  try {
    dailyTick(W);
  } catch (err) {
    logErr(W, 'dailyTick', err);
  }
  try {
    handleEvents(W);
  } catch (err) {
    logErr(W, 'events', err);
  }
  W.day++;
  if (W.day >= 365) rollover(W);
  W.rng = getState();
}

function nationCallups(W) {
  for (const n of NATIONS) {
    if (W.user?.nation === n.code && !W.user.autoCall && W.nations[n.code].squad?.length >= 18) continue;
    callUp(W, n.code);
  }
}

// Двигаемся вперёд до матча пользователя или важного события
export function advance(W, maxDays = 400) {
  W._stop = false;
  for (let i = 0; i < maxDays; i++) {
    const um = userMatchToday(W);
    if (um) return { kind: 'match', ...um };
    processDay(W);
    if (W._stop) return { kind: 'stop' };
  }
  return { kind: 'idle' };
}

// Быстро сыграть матч пользователя без трансляции
export function quickPlayUserMatch(W) {
  const um = userMatchToday(W);
  if (!um) return null;
  const S = prepareMatch(W, um.e, um.m, true);
  simulateFull(W, S);
  finalizeMatch(W, um.e, um.m, S);
  return S;
}

function handleEvents(W) {
  const evs = W._events || [];
  W._events = [];
  for (const ev of evs) {
    if (ev.type === 'trophy' && ev.w) {
      news(W, `${teamName(W, ev.w)} — победитель турнира «${ev.name}» (${seasonLabel(W.year)})`);
      if (isUserTeam(W, ev.w)) {
        W.user.trophies.push({ y: W.year, name: ev.name, team: teamName(W, ev.w) });
        W.user.rep = clamp(W.user.rep + (ev.comp.startsWith('L:') || ev.comp === 'UCL' || ev.comp === 'WC' ? 6 : 3), 1, 99);
        if (isNat(ev.w)) W.user.natConf = 100;
        else W.user.conf = clamp(W.user.conf + 25, 0, 100);
        mail(W, '🏆 Трофей!', `Ваша команда выиграла турнир «${ev.name}»! Поздравляем!`, { stop: true });
      }
    }
  }
}

// ================= ежедневные процессы =================
let plCache = null;
let plKey = '';
function playerList(W) {
  const key = `${W.nextPid}:${W._natStamp || 0}`;
  if (plCache && plKey === key) return plCache;
  plCache = Object.values(W.players);
  plKey = key;
  return plCache;
}

function dailyTick(W) {
  const day = W.day;
  const userClub = W.user?.club ? W.clubs[W.user.club] : null;
  for (const p of playerList(W)) {
    if (p.inj <= 0 && p.fit >= 100) continue;
    const club = p.club ? W.clubs[p.club] : null;
    const int = club?.training.int ?? 1;
    const med = club?.staff.med ?? 2;
    if (p.inj > 0) {
      p.inj -= chance(0.08 * med) ? 2 : 1;
      if (p.inj <= 0) {
        p.inj = 0;
        p.fit = Math.min(p.fit, 70);
        if (userClub && p.club === userClub.id) mail(W, `${p.n} восстановился`, `${p.n} вернулся к тренировкам после травмы.`);
      }
    } else if (p.fit < 100) {
      p.fit = Math.min(100, Math.round(p.fit + 6.5 - int * 1.2));
    }
  }
  if (day % 7 === 4) weekly(W);
  if (isWindow(day)) {
    aiTransfers(W, day < 100 ? 4 : 2);
    userIncomingOffers(W);
  }
  if (day === WINDOWS[0][1] || day === WINDOWS[1][1]) mail(W, 'Трансферное окно закрылось', 'Покупки и продажи снова станут доступны в следующее окно. Свободных агентов можно подписывать в любое время.');
  if (day === WINDOWS[1][0]) mail(W, 'Зимнее трансферное окно открыто', 'Окно открыто до конца января.');
  if (day === 280) youthIntake(W);
  if (day === 300) contractWarnings(W);
  // стадион
  for (const cid in W.clubs) {
    const c = W.clubs[cid];
    if (c.stadium.up && c.stadium.up.until <= day + W.year * 365) {
      c.stadium.cap += c.stadium.up.add;
      if (userClub && c.id === userClub.id) mail(W, 'Стадион расширен', `Новая вместимость: ${c.stadium.cap.toLocaleString('ru-RU')} мест.`);
      c.stadium.up = null;
    }
  }
  // предложения истекают
  W.offers = W.offers.filter((o) => o.until >= W.year * 365 + day);
}

function weekly(W) {
  // тренировки и развитие — раз в 4 недели (с учётом всех четырёх недель)
  const monthly = Math.floor(W.day / 7) % 4 === 0;
  if (monthly) for (const p of playerList(W)) {
    const club = p.club ? W.clubs[p.club] : null;
    const tf = club ? [0.82, 1, 1.15][club.training.int] * (0.9 + club.staff.coach * 0.04) : 0.9;
    let d;
    if (p.age <= 20) d = (p.pot - p.ovr) * 0.0078;
    else if (p.age <= 23) d = (p.pot - p.ovr) * 0.0052;
    else if (p.age <= 27) d = (p.pot - p.ovr) * 0.0025;
    else if (p.age <= 29) d = 0;
    else d = -(p.age - 29) * 0.022;
    d = (d * (d > 0 ? tf : 1 / tf) + gauss(0, 0.05)) * 4;
    if (p.inj > 20 && d > 0) d *= 0.5;
    if (Math.abs(d) < 0.001) continue;
    const w = POS_WEIGHTS[p.pos];
    for (const k of ATTRS) {
      const kw = w[k] || 0;
      p.a[k] = Math.round(clamp(p.a[k] + d * (kw > 0 ? 1 : 0.3) * (0.7 + rand() * 0.6), 5, 99) * 10) / 10;
    }
    recalcOvr(p);
    if (p.ovr > p.pot) p.pot = p.ovr;
    // мораль понемногу возвращается к норме
    p.mor = Math.round(p.mor + (70 - p.mor) * 0.28);
    // травмы на тренировках
    if (club && p.inj <= 0 && chance(0.006 * [0.6, 1, 1.6][club.training.int] * (6 - club.staff.med) / 3)) {
      p.inj = randInt(3, 21);
      if (W.user?.club === club.id) mail(W, `Травма: ${p.n}`, `${p.n} травмировался на тренировке и пропустит около ${Math.ceil(p.inj / 7)} нед.`);
    }
  }
  // финансы
  for (const cid in W.clubs) {
    const c = W.clubs[cid];
    let wages = 0;
    for (const pid of c.squad) wages += W.players[pid]?.wage || 0;
    wages += c.academy.length * 500;
    const staff = (c.staff.coach + c.staff.med + c.staff.scout + c.youthLvl) * 9000 * (0.5 + c.rep / 100);
    const L = c.league ? LEAGUE_BY_ID[c.league] : null;
    const tv = L ? (L.tv * 18e6 * (0.7 + 0.6 * clamp((c.rep - 50) / 50, 0, 1))) / 52 : 3e6 / 52;
    const sponsor = (Math.max(0, c.rep - 40) ** 2 * 18000) / 52;
    c.balance = Math.round(c.balance + tv + sponsor - wages - staff);
    c.fin.tv += Math.round(tv);
    c.fin.sponsor += Math.round(sponsor);
    c.fin.wages += Math.round(wages);
    c.fin.staff += Math.round(staff);
  }
  const u = W.user;
  if (u?.club) {
    const c = W.clubs[u.club];
    if (c.balance < -20e6 && !c._debtWarned) {
      c._debtWarned = true;
      mail(W, 'Финансовые проблемы', 'Клуб в глубоком минусе. Руководство требует сократить расходы — продайте игроков или снизьте зарплаты.', { stop: true });
      u.conf = clamp(u.conf - 10, 0, 100);
    }
  }
}

// ================= трансферы ИИ =================
const DESIRED = { GK: 3, CB: 4, LB: 2, RB: 2, DM: 2, CM: 3, AM: 2, LW: 2, RW: 2, ST: 3 };
const STARTERS = { GK: 1, CB: 2, LB: 1, RB: 1, DM: 1, CM: 2, AM: 1, LW: 1, RW: 1, ST: 1 };

function clubNeed(W, c) {
  const L = levelOfRep(c.rep);
  const cnt = {};
  const good = {};
  for (const pid of c.squad) {
    const p = W.players[pid];
    cnt[p.pos] = (cnt[p.pos] || 0) + 1;
    if (p.ovr >= L - 2 && p.age <= 32) good[p.pos] = (good[p.pos] || 0) + 1;
  }
  let best = null;
  let bv = -99;
  for (const pos in DESIRED) {
    const v = (STARTERS[pos] - (good[pos] || 0)) * 2 + (DESIRED[pos] - (cnt[pos] || 0)) + rand() * 1.5;
    if (v > bv) { bv = v; best = pos; }
  }
  return best;
}

let idsCache = null;
let idsStamp = -1;
function allIds(W) {
  if (idsCache && idsStamp === W.nextPid) return idsCache;
  idsCache = Object.keys(W.players);
  idsStamp = W.nextPid;
  return idsCache;
}

export function movePlayer(W, p, toClubId, fee, { loan = false } = {}) {
  const from = p.club ? W.clubs[p.club] : null;
  if (from) {
    from.squad = from.squad.filter((x) => x !== p.id);
    from.academy = from.academy.filter((x) => x !== p.id);
    if (fee) { from.balance += fee; from.fin.sales += fee; }
    if (from.tactic.xi) from.tactic.xi = from.tactic.xi.map((x) => (x === p.id ? null : x));
    if (from.tactic.bench) from.tactic.bench = from.tactic.bench.filter((x) => x !== p.id);
  }
  const to = W.clubs[toClubId];
  if (fee) { to.balance -= fee; to.fin.buys += fee; }
  to.squad.push(p.id);
  if (loan) p.loan = { from: from?.id || null, until: W.year };
  p.club = toClubId;
  p.home = false;
  p.fa = false;
  p.listed = false;
  p.youth = false;
  p.aca = false;
  p.mor = clamp(p.mor + 8, 0, 100);
  if (from && from.squad.length < 19) replenish(W, from);
}

function replenish(W, c) {
  while (c.squad.length < 21) {
    const p = youthPlayer(W, c, randInt(17, 19));
    c.squad.push(p.id);
  }
  invalidateNatIndex(W);
}

function aiTransfers(W, attempts) {
  const ids = allIds(W);
  const clubs = Object.values(W.clubs).filter((c) => c.id !== W.user?.club);
  for (let k = 0; k < attempts; k++) {
    const buyer = weighted(clubs, (c) => (c.league ? 2 : 1) * (c.rep / 50) ** 2);
    if (buyer.squad.length >= 30) continue;
    const need = clubNeed(W, buyer);
    const L = levelOfRep(buyer.rep);
    let best = null;
    let bv = -1;
    for (let i = 0; i < 350; i++) {
      const p = W.players[ids[Math.floor(rand() * ids.length)]];
      if (!p || p.pos !== need || p.club === buyer.id || p.aca || p.loan) continue;
      if (W.user?.club && p.club === W.user.club) continue;
      if (p.ovr < L - 1 || p.ovr > L + 7 || p.age > 32 || p.inj > 30) continue;
      const seller = p.club ? W.clubs[p.club] : null;
      if (seller && seller.rep > buyer.rep + 2) continue;
      const val = playerValue(p);
      const fee = seller ? val * 1.15 : p.fa ? 0 : val * 0.6;
      if (fee > buyer.balance * 0.55) continue;
      const v = p.ovr - p.age * 0.25 + (p.pot - p.ovr) * 0.2;
      if (v > bv) { bv = v; best = { p, fee }; }
    }
    if (!best) continue;
    const { p, fee } = best;
    const fromName = p.club ? W.clubs[p.club].name : p.fa ? 'свободный агент' : 'внутренний чемпионат';
    const realFee = Math.round(fee * (0.95 + rand() * 0.3));
    p.wage = wageFor(p.ovr, p.age, buyer.rep);
    p.contract = W.year + randInt(2, 5);
    movePlayer(W, p, buyer.id, realFee);
    if (realFee >= 15e6 || buyer.league) {
      if (realFee >= 15e6 || buyer.rep >= 80) news(W, `${p.n} (${p.ovr}) переходит из «${fromName}» в «${buyer.name}» за ${realFee ? money(realFee) : 'бесплатно'}`);
    }
    // лишних отпускаем
    if (buyer.squad.length > 30) releaseWorst(W, buyer);
  }
}

function releaseWorst(W, c) {
  const sorted = c.squad.map((x) => W.players[x]).sort((a, b) => a.ovr - b.ovr + (b.age - a.age) * 0.3);
  const p = sorted[0];
  if (!p) return;
  c.squad = c.squad.filter((x) => x !== p.id);
  p.club = null;
  p.fa = true;
  p.listed = false;
}

function userIncomingOffers(W) {
  const u = W.user;
  if (!u?.club) return;
  const my = W.clubs[u.club];
  const L = levelOfRep(my.rep);
  for (const pid of my.squad) {
    const p = W.players[pid];
    if (p.loan) continue;
    const isStar = p.ovr >= L + 3;
    const pr = p.listed ? 0.12 : isStar ? 0.004 : 0;
    if (!pr || !chance(pr)) continue;
    if (W.offers.some((o) => o.pid === pid)) continue;
    const val = playerValue(p);
    const buyers = Object.values(W.clubs).filter((c) => c.id !== my.id && c.balance > val * 0.9 && Math.abs(levelOfRep(c.rep) - p.ovr) < 9 && (p.listed || c.rep >= my.rep - 3));
    if (!buyers.length) continue;
    const b = pick(buyers);
    const fee = Math.round(val * (p.listed ? 0.75 + rand() * 0.4 : 1.15 + rand() * 0.45) / 1e5) * 1e5;
    const id = `o${W.year}${W.day}${pid}`;
    W.offers.push({ id, pid, from: b.id, fee, until: W.year * 365 + W.day + 6 });
    mail(W, `Предложение за ${p.n}`, `«${b.name}» предлагает ${money(fee)} за ${p.n} (${p.ovr}, ${p.age} лет). Оценочная стоимость: ${money(val)}.\nОтветьте в разделе «Трансферы → Предложения» в течение недели.`, { stop: true, kind: 'offer', ref: id });
  }
}

// ================= действия пользователя =================
export function canTrade(W) {
  return isWindow(W.day);
}

export function askingPrice(W, p) {
  const val = playerValue(p);
  if (!p.club) return p.fa ? 0 : Math.round(val * 0.75);
  const c = W.clubs[p.club];
  const rank = c.squad.map((x) => W.players[x]).sort((a, b) => b.ovr - a.ovr).findIndex((x) => x.id === p.id);
  let mult = 1.15 + (rank < 11 ? 0.35 : 0) + (rank < 3 ? 0.4 : 0);
  if (p.contract <= W.year) mult -= 0.35;
  if (p.listed) mult -= 0.25;
  return Math.round((val * mult) / 1e4) * 1e4;
}

export function wageDemand(W, p, clubId) {
  const c = W.clubs[clubId];
  const base = wageFor(p.ovr, p.age, c.rep);
  return Math.round(Math.max(base, p.wage * 1.1) / 100) * 100;
}

export function makeBid(W, pid, fee, wage, years) {
  const u = W.user;
  const my = W.clubs[u.club];
  const p = W.players[pid];
  if (!p) return { status: 'error', msg: 'Игрок не найден' };
  if (p.club === my.id) return { status: 'error', msg: 'Это ваш игрок' };
  if (p.loan) return { status: 'rejected', msg: 'Игрок находится в аренде — купить его сейчас нельзя.' };
  if (!p.fa && !canTrade(W)) return { status: 'error', msg: 'Трансферное окно закрыто. Свободных агентов можно подписывать в любое время.' };
  if (my.squad.length >= 36) return { status: 'error', msg: 'В составе слишком много игроков (максимум 36).' };
  if (fee > my.balance) return { status: 'error', msg: `Не хватает денег: на счету ${money(my.balance)}.` };
  const seller = p.club ? W.clubs[p.club] : null;
  if (seller && seller.rep > my.rep + 14 && p.ovr > levelOfRep(my.rep) + 2) return { status: 'rejected', msg: `${p.n} не хочет переходить в клуб такого уровня.` };
  if (p.ovr > levelOfRep(my.rep) + 14 && u.rep < 70) return { status: 'rejected', msg: `${p.n} не заинтересован в переходе: у клуба недостаточно высокий статус.` };
  const demand = wageDemand(W, p, my.id);
  if (wage < demand * 0.95) return { status: 'wage', msg: `Игрок хочет не меньше ${money(demand)} в неделю.`, demand };
  const ask = askingPrice(W, p);
  if (fee + 1 < ask) {
    if (fee >= ask * 0.82) return { status: 'counter', msg: `${seller ? `«${seller.name}»` : 'Клуб игрока'} готов отдать игрока за ${money(ask)}.`, ask };
    return { status: 'rejected', msg: `${seller ? `«${seller.name}»` : 'Клуб'} отклонил предложение. Ориентир — около ${money(ask)}.` };
  }
  p.wage = Math.round(wage);
  p.contract = W.year + clamp(years, 1, 5) - 1;
  const fromName = seller ? seller.name : p.fa ? 'свободный агент' : 'внутренний чемпионат';
  movePlayer(W, p, my.id, fee);
  mail(W, `Новичок: ${p.n}`, `${p.n} подписал контракт до лета ${p.contract + 1} года. Сумма сделки: ${money(fee)}. Зарплата: ${money(p.wage)}/нед.`);
  news(W, `${p.n} переходит из «${fromName}» в «${my.name}» за ${fee ? money(fee) : 'бесплатно'}`);
  return { status: 'accepted', msg: `Сделка состоялась! ${p.n} теперь ваш игрок.` };
}

export function requestLoan(W, pid) {
  const u = W.user;
  const my = W.clubs[u.club];
  const p = W.players[pid];
  if (!canTrade(W)) return { status: 'error', msg: 'Трансферное окно закрыто.' };
  if (!p.club || p.loan) return { status: 'error', msg: 'Этого игрока нельзя взять в аренду.' };
  const seller = W.clubs[p.club];
  const rank = seller.squad.map((x) => W.players[x]).sort((a, b) => b.ovr - a.ovr).findIndex((x) => x.id === p.id);
  if (rank < 14) return { status: 'rejected', msg: `«${seller.name}» рассчитывает на игрока и не отдаёт его в аренду.` };
  if (my.rep > seller.rep + 5) return { status: 'rejected', msg: 'Клуб игрока не отдаёт его в аренду клубу выше уровнем.' };
  if (my.balance < p.wage * 30) return { status: 'error', msg: 'Не хватает денег на зарплату игрока.' };
  movePlayer(W, p, my.id, 0, { loan: true });
  mail(W, `Аренда: ${p.n}`, `${p.n} перешёл в аренду из «${seller.name}» до конца сезона. Зарплату платит ваш клуб.`);
  return { status: 'accepted', msg: `${p.n} взят в аренду до конца сезона.` };
}

export function quickSell(W, pid) {
  const u = W.user;
  const my = W.clubs[u.club];
  const p = W.players[pid];
  if (!canTrade(W)) return { status: 'error', msg: 'Трансферное окно закрыто — можно выставить игрока на трансфер, предложения придут в следующее окно.' };
  if (p.loan) return { status: 'error', msg: 'Арендованного игрока продать нельзя.' };
  if (my.squad.length <= 16) return { status: 'error', msg: 'Слишком мало игроков в составе.' };
  const val = playerValue(p);
  const fee = Math.round((val * 0.7) / 1e4) * 1e4;
  const buyers = Object.values(W.clubs).filter((c) => c.id !== my.id && c.balance > fee && c.squad.length < 32 && Math.abs(levelOfRep(c.rep) - p.ovr) < 12);
  if (!buyers.length) return { status: 'error', msg: 'Покупателей не нашлось.' };
  const b = pick(buyers);
  p.wage = wageFor(p.ovr, p.age, b.rep);
  movePlayer(W, p, b.id, fee);
  news(W, `${p.n} переходит из «${my.name}» в «${b.name}» за ${money(fee)}`);
  return { status: 'accepted', msg: `${p.n} продан в «${b.name}» за ${money(fee)}.` };
}

export function answerOffer(W, offerId, accept) {
  const o = W.offers.find((x) => x.id === offerId);
  if (!o) return { status: 'error', msg: 'Предложение больше не действует.' };
  W.offers = W.offers.filter((x) => x.id !== offerId);
  const p = W.players[o.pid];
  if (!accept || p.club !== W.user.club) return { status: 'rejected', msg: 'Предложение отклонено.' };
  if (!canTrade(W)) return { status: 'error', msg: 'Трансферное окно уже закрыто.' };
  const b = W.clubs[o.from];
  p.wage = wageFor(p.ovr, p.age, b.rep);
  movePlayer(W, p, b.id, o.fee);
  news(W, `${p.n} переходит из «${W.clubs[W.user.club].name}» в «${b.name}» за ${money(o.fee)}`);
  return { status: 'accepted', msg: `${p.n} продан в «${b.name}» за ${money(o.fee)}.` };
}

export function releasePlayer(W, pid) {
  const my = W.clubs[W.user.club];
  const p = W.players[pid];
  if (p.loan) {
    // досрочное возвращение арендованного
    const back = p.loan.from && W.clubs[p.loan.from];
    my.squad = my.squad.filter((x) => x !== p.id);
    if (back) { back.squad.push(p.id); p.club = back.id; } else { p.club = null; p.fa = true; }
    p.loan = null;
    return { status: 'accepted', msg: `${p.n} вернулся в свой клуб.` };
  }
  const weeks = Math.max(0, (p.contract - W.year + 1) * 52 - Math.floor(W.day / 7));
  const cost = Math.round(weeks * p.wage * 0.5);
  if (cost > my.balance) return { status: 'error', msg: `Расторжение стоит ${money(cost)} — не хватает денег.` };
  my.balance -= cost;
  my.fin.wages += cost;
  my.squad = my.squad.filter((x) => x !== p.id);
  if (my.tactic.xi) my.tactic.xi = my.tactic.xi.map((x) => (x === p.id ? null : x));
  p.club = null;
  p.fa = true;
  p.listed = false;
  return { status: 'accepted', msg: `Контракт с ${p.n} расторгнут. Компенсация: ${money(cost)}.` };
}

export function renewDemand(W, p) {
  const c = W.clubs[p.club];
  return Math.round((Math.max(p.wage, wageFor(p.ovr, p.age, c.rep)) * (p.mor < 45 ? 1.3 : 1.05)) / 100) * 100;
}
export function renewContract(W, pid, years) {
  const p = W.players[pid];
  if (p.mor < 25) return { status: 'rejected', msg: `${p.n} недоволен и отказывается обсуждать новый контракт.` };
  if (p.age >= 34 && years > 1) return { status: 'rejected', msg: `${p.n} готов подписать контракт только на 1 год.` };
  const w = renewDemand(W, p);
  p.wage = w;
  p.contract = W.year + clamp(years, 1, 5);
  p.mor = clamp(p.mor + 5, 0, 100);
  return { status: 'accepted', msg: `${p.n} продлил контракт до лета ${p.contract + 1}. Зарплата: ${money(w)}/нед.` };
}

export function promoteYouth(W, pid) {
  const my = W.clubs[W.user.club];
  const p = W.players[pid];
  my.academy = my.academy.filter((x) => x !== pid);
  my.squad.push(pid);
  p.aca = false;
  p.youth = false;
  p.wage = wageFor(p.ovr, p.age, my.rep * 0.5);
  p.contract = W.year + 3;
  return { status: 'accepted', msg: `${p.n} переведён в первую команду и подписал контракт на 3 года.` };
}
export function releaseYouth(W, pid) {
  const my = W.clubs[W.user.club];
  my.academy = my.academy.filter((x) => x !== pid);
  delete W.players[pid];
  invalidateNatIndex(W);
}

export function talkToPlayer(W, pid, kind) {
  const p = W.players[pid];
  const avg = p.st.app ? p.st.rs / p.st.app : 6.5;
  let d;
  let msg;
  if (kind === 'praise') {
    d = avg >= 6.9 ? 8 : avg >= 6.4 ? 3 : -2;
    msg = d > 0 ? `${p.n} благодарит за доверие.` : `${p.n} не понимает, за что его хвалят — игра ведь не клеится.`;
  } else if (kind === 'demand') {
    d = avg < 6.4 ? 5 : -7;
    msg = d > 0 ? `${p.n} обещает прибавить.` : `${p.n} обижен — он считает, что играет хорошо.`;
  } else {
    d = p.mor < 50 ? 6 : 2;
    msg = `${p.n} рад, что его ждёт игровая практика.`;
  }
  p.talked = W.year * 365 + W.day;
  p.mor = clamp(p.mor + d, 5, 100);
  return { status: d >= 0 ? 'accepted' : 'rejected', msg };
}

export function upgradeStadium(W) {
  const c = W.clubs[W.user.club];
  if (c.stadium.up) return { status: 'error', msg: 'Работы уже идут.' };
  const add = 5000;
  const cost = add * 4500;
  if (c.balance < cost) return { status: 'error', msg: `Нужно ${money(cost)}.` };
  c.balance -= cost;
  c.fin.build += cost;
  c.stadium.up = { add, until: W.year * 365 + W.day + 150 };
  return { status: 'accepted', msg: `Расширение на ${add} мест начато. Работы займут около 5 месяцев.` };
}
export function upgradeFacility(W, key) {
  const c = W.clubs[W.user.club];
  const cur = key === 'youth' ? c.youthLvl : c.staff[key];
  if (cur >= 5) return { status: 'error', msg: 'Уже максимальный уровень.' };
  const cost = Math.round((cur + 1) ** 2 * 1.2e6);
  if (c.balance < cost) return { status: 'error', msg: `Нужно ${money(cost)}.` };
  c.balance -= cost;
  c.fin.build += cost;
  if (key === 'youth') c.youthLvl++;
  else c.staff[key]++;
  return { status: 'accepted', msg: 'Уровень повышен.' };
}
export function facilityCost(c, key) {
  const cur = key === 'youth' ? c.youthLvl : c.staff[key];
  return Math.round((cur + 1) ** 2 * 1.2e6);
}

// ================= академия и контракты =================
function youthIntake(W) {
  for (const cid in W.clubs) {
    const c = W.clubs[cid];
    const n = randInt(2, 3 + Math.floor(c.youthLvl / 2));
    if (W.user?.club === cid) {
      const names = [];
      for (let i = 0; i < n; i++) {
        const p = youthPlayer(W, c, randInt(15, 17));
        p.aca = true;
        p.club = cid;
        c.academy.push(p.id);
        names.push(`${p.n} (${p.pos}, ${p.age}, ${p.ovr} → потенциал ~${Math.round(p.pot - 3 + rand() * 6)})`);
      }
      mail(W, 'Новый набор в академию', `В академию пришли:\n${names.join('\n')}\n\nПереводите лучших в первую команду в разделе «Клуб → Академия».`, { stop: true });
    } else if (c.squad.length < 28) {
      for (let i = 0; i < Math.min(2, n); i++) c.squad.push(youthPlayer(W, c, randInt(16, 18)).id);
    }
  }
  invalidateNatIndex(W);
}

function contractWarnings(W) {
  const u = W.user;
  if (!u?.club) return;
  const c = W.clubs[u.club];
  const exp = c.squad.map((x) => W.players[x]).filter((p) => p.contract <= W.year && !p.loan);
  if (exp.length) mail(W, 'Истекающие контракты', `Летом закончатся контракты:\n${exp.map((p) => `${p.n} (${p.ovr}, ${p.age})`).join('\n')}\n\nПродлите их в карточке игрока, иначе игроки уйдут свободными агентами.`, { stop: true });
}

function checkSacking(W) {
  const u = W.user;
  if (u.club && u.conf <= 0) {
    const c = W.clubs[u.club];
    u.career.push({ y: W.year, team: c.name, end: 'уволен' });
    mail(W, 'Вы уволены', `Руководство «${c.name}» приняло решение расстаться с вами. Ищите новую работу в разделе «Карьера».`, { stop: true });
    u.club = null;
    u.conf = 60;
    u.rep = clamp(u.rep - 5, 1, 99);
    jobOffers(W, true);
  }
  if (u.nation && u.natConf <= 0) {
    mail(W, 'Федерация уволила вас', `Федерация ${NATION_BY_CODE[u.nation].name} решила сменить тренера.`, { stop: true });
    u.career.push({ y: W.year, team: NATION_BY_CODE[u.nation].name, end: 'уволен' });
    u.nation = null;
    u.natConf = 60;
    jobOffers(W, true);
  }
}

export function jobOffers(W, force = false) {
  const u = W.user;
  const out = [];
  const cur = u.club;
  const cands = Object.values(W.clubs).filter((c) => c.id !== cur && c.league && c.rep <= u.rep + 4 && c.rep >= u.rep - 18);
  const n = force ? 3 : u.rep > (cur ? W.clubs[cur].rep : 0) + 2 ? randInt(1, 2) : chance(0.25) ? 1 : 0;
  for (const c of shuffle(cands).slice(0, n)) out.push({ type: 'club', id: c.id });
  if (!u.nation && (force || chance(0.35))) {
    const ns = NATIONS.filter((x) => W.nations[x.code].rep <= u.rep + 2 && W.nations[x.code].rep >= u.rep - 25);
    if (ns.length) out.push({ type: 'nation', id: pick(ns).code });
  }
  W.jobOffers = out;
  if (out.length && !force) mail(W, 'Предложения работы', 'Вами интересуются другие команды. Посмотрите раздел «Карьера».', { stop: true });
  return out;
}

export function acceptJob(W, offer) {
  const u = W.user;
  if (offer.type === 'club') {
    if (u.club) u.career.push({ y: W.year, team: W.clubs[u.club].name, end: 'ушёл' });
    u.club = offer.id;
    u.conf = 65;
    W.clubs[offer.id].tactic.auto = true;
    mail(W, 'Новая работа', `Вы возглавили «${W.clubs[offer.id].name}».`);
    if (W.day < 40) preseasonFriendlies(W);
  } else {
    u.nation = offer.id;
    u.natConf = 65;
    callUp(W, offer.id);
    nationFriendlies(W);
    mail(W, 'Новая работа', `Вы возглавили сборную ${NATION_BY_CODE[offer.id].name}.`);
  }
  W.jobOffers = W.jobOffers.filter((o) => o !== offer && !(o.type === offer.type && o.id === offer.id));
}

export function resignNation(W) {
  const u = W.user;
  if (!u.nation) return;
  u.career.push({ y: W.year, team: NATION_BY_CODE[u.nation].name, end: 'ушёл' });
  u.nation = null;
}

// ================= смена сезона =================
function rollover(W) {
  const u = W.user;
  const qual = {};
  const summary = { y: W.year, champions: [], user: null };
  for (const L of LEAGUES) {
    const comp = W.comps[`L:${L.id}`];
    const table = sortRows(comp.stages[0].groups[0].rows, W).map((r) => r.id);
    qual[L.id] = table;
    summary.champions.push({ league: L.name, w: teamName(W, table[0]) });
    // призовые за место
    table.forEach((cid, i) => {
      const c = W.clubs[cid];
      const pr = (table.length - i) * L.tv * 1.2e6;
      c.balance += pr;
      c.fin.prize += pr;
    });
    if (u.club && table.includes(u.club)) {
      const pos = table.indexOf(u.club) + 1;
      summary.user = { pos, league: L.name, target: u.target };
      const delta = (u.target || pos) - pos;
      u.conf = clamp(u.conf + delta * 6, 0, 100);
      u.rep = clamp(u.rep + delta * 1.2, 1, 99);
    }
  }
  // повышение/вылет в Англии
  const e1 = qual.ENG1;
  const e2 = qual.ENG2;
  if (e1 && e2) {
    const down = e1.slice(-3);
    const up = e2.slice(0, 3);
    W.leagues.ENG1.clubs = W.leagues.ENG1.clubs.filter((x) => !down.includes(x)).concat(up);
    W.leagues.ENG2.clubs = W.leagues.ENG2.clubs.filter((x) => !up.includes(x)).concat(down);
    for (const x of down) W.clubs[x].league = 'ENG2';
    for (const x of up) W.clubs[x].league = 'ENG1';
    news(W, `В Премьер-лигу вышли: ${up.map((x) => W.clubs[x].name).join(', ')}. Покидают: ${down.map((x) => W.clubs[x].name).join(', ')}.`);
    qual.ENG1 = qual.ENG1.filter((x) => !down.includes(x));
  }
  // репутация клубов дрейфует от результатов
  for (const L of LEAGUES) {
    const table = qual[L.id] || [];
    const exp = table.slice().sort((a, b) => W.clubs[b].rep - W.clubs[a].rep);
    table.forEach((cid, i) => {
      const d = exp.indexOf(cid) - i;
      W.clubs[cid].rep = clamp(W.clubs[cid].rep + d * 0.25, 30, 97);
    });
  }
  summary.fin = u.club ? { ...W.clubs[u.club].fin } : null;
  W.seasonLog.push(summary);

  // игроки
  const retire = [];
  for (const id in W.players) {
    const p = W.players[id];
    p.age++;
    p.st = newStats();
    p.ban = 0;
    if (p.loan) {
      const back = p.loan.from ? W.clubs[p.loan.from] : null;
      const cur = W.clubs[p.club];
      if (cur) cur.squad = cur.squad.filter((x) => x !== p.id);
      if (back) { back.squad.push(p.id); p.club = back.id; } else { p.club = null; p.fa = true; }
      p.loan = null;
      if (u.club && cur?.id === u.club) mail(W, 'Аренда завершена', `${p.n} вернулся в свой клуб.`);
    }
    const rp = p.age >= 34 ? (p.age - 33) * 0.3 : p.age >= 32 && p.ovr < 55 ? 0.15 : 0;
    if (chance(rp) || (p.fa && p.age >= 31 && chance(0.5)) || (p.aca && p.age >= 19)) {
      retire.push(p);
      continue;
    }
    if (p.club && p.contract < W.year + 1 && !p.aca) {
      const c = W.clubs[p.club];
      if (c.id === u.club) {
        c.squad = c.squad.filter((x) => x !== p.id);
        if (c.tactic.xi) c.tactic.xi = c.tactic.xi.map((x) => (x === p.id ? null : x));
        p.club = null;
        p.fa = true;
        mail(W, `${p.n} покинул клуб`, `Контракт ${p.n} истёк, игрок стал свободным агентом.`);
      } else if (chance(p.ovr >= levelOfRep(c.rep) - 6 ? 0.8 : 0.4)) {
        p.contract = W.year + randInt(1, 3);
        p.wage = wageFor(p.ovr, p.age, c.rep);
      } else {
        c.squad = c.squad.filter((x) => x !== p.id);
        p.club = null;
        p.fa = true;
      }
    }
  }
  for (const p of retire) {
    if (p.club) {
      const c = W.clubs[p.club];
      c.squad = c.squad.filter((x) => x !== p.id);
      c.academy = c.academy.filter((x) => x !== p.id);
      if (c.tactic.xi) c.tactic.xi = c.tactic.xi.map((x) => (x === p.id ? null : x));
      if (c.id === u.club && p.ovr > 60 && !p.aca) mail(W, `${p.n} завершил карьеру`, `${p.n} (${p.age} лет) объявил о завершении карьеры.`);
    }
    for (const n of Object.values(W.nations)) if (n.squad.includes(p.id)) n.squad = n.squad.filter((x) => x !== p.id);
    delete W.players[p.id];
  }
  // поддержание составов ИИ
  for (const cid in W.clubs) {
    const c = W.clubs[cid];
    if (cid === u.club) continue;
    while (c.squad.length > 30) releaseWorst(W, c);
    if (c.squad.length < 22) {
      // подписываем свободных агентов подходящего уровня, остальное — молодёжь
      const L = levelOfRep(c.rep);
      const fas = Object.values(W.players).filter((p) => p.fa && Math.abs(p.ovr - (L - 3)) < 6).slice(0, 22 - c.squad.length);
      for (const p of fas) {
        p.wage = wageFor(p.ovr, p.age, c.rep);
        p.contract = W.year + randInt(1, 2);
        movePlayer(W, p, c.id, 0);
      }
      while (c.squad.length < 22) {
        const pos = clubNeed(W, c);
        const p = makePlayer(W, { pos, ovr: Math.round(L - 6 + gauss(0, 3)), age: randInt(19, 28), nat: chance(0.6) ? c.country : pick(NATIONS).code, club: c.id, wageRep: c.rep });
        c.squad.push(p.id);
      }
    }
    // владельцы гасят долги ИИ-клубов, чтобы лига не разваливалась
    if (c.balance < -10e6) c.balance = -10e6 + c.balance * 0.1;
    c.fin = newFin();
    c._debtWarned = false;
  }
  if (u.club) {
    const c = W.clubs[u.club];
    c.fin = newFin();
    c._debtWarned = false;
  }
  for (const id in W.nations) W.nations[id].squad = W.nations[id].squad.filter((x) => W.players[x]);
  fillNations(W);
  // сила сборных дрейфует к реальной глубине состава
  invalidateNatIndex(W);
  W.offers = [];
  const champs = summary.champions.map((c) => `${c.league}: ${c.w}`).join('\n');
  W.year++;
  W.day = 0;
  buildSeason(W, qual);
  mail(W, `Итоги сезона ${seasonLabel(W.year - 1)}`, `${summary.user ? `Ваша команда заняла ${summary.user.pos}-е место (цель — ${summary.user.target}).\n\n` : ''}Чемпионы:\n${champs}`, { stop: true, kind: 'season' });
  if (u.club && u.conf <= 0) checkSacking(W);
  jobOffers(W, false);
  startOfSeason(W, false);
}

export function saveSeedState(W) {
  W.rng = getState();
}
export function restoreSeedState(W) {
  seed(W.rng || 1);
}
