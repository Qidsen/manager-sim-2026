// Турниры: построение сезона, таблицы, переход между стадиями, призовые.
import { LEAGUES, LEAGUE_BY_ID } from '../data/leagues';
import { NATIONS, NATION_BY_CODE } from '../data/nations';
import { roundRobin, swissPairings, bracketOrder, potGroups, leagueDates, DATES, INTL_DAYS, SUMMER_DAYS, cupDatesFor } from './fixtures';
import { shuffle, rand } from './rng';
import { teamRep, teamCountry, isNat, teamName } from './teams';

const COUNTRY_CUP = {
  ENG: 'Кубок Англии', ESP: 'Кубок Короля', ITA: 'Кубок Италии', GER: 'Кубок Германии', FRA: 'Кубок Франции', NED: 'Кубок Нидерландов',
  POR: 'Кубок Португалии', TUR: 'Кубок Турции', UKR: 'Кубок України', BEL: 'Кубок Бельгии', SCO: 'Кубок Шотландии', BRA: 'Кубок Бразилии',
  ARG: 'Кубок Аргентины', USA: 'Открытый кубок США', KSA: 'Кубок Короля (KSA)',
};

const roundName = (n) => ({ 2: 'Финал', 4: '1/2 финала', 8: '1/4 финала', 16: '1/8 финала', 32: '1/16 финала', 64: '1/32 финала', 128: '1/64 финала' }[n] || `Раунд (${n})`);

function newRow(id) {
  return { id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] };
}
function mkMatch(h, a, day, gi = 0) {
  return { h, a, hg: null, ag: null, day, gi, gl: null, pen: null };
}

function addSchedule(W, compId, stageIdx, stage) {
  stage.dates.forEach((d, r) => {
    (W.sched[d] ||= []).push({ c: compId, s: stageIdx, r });
  });
}

// ---------- стадии ----------
function rrStage(name, groups, legs, dates, adv) {
  const gs = groups.map((teams) => ({ teams, rows: Object.fromEntries(teams.map((t) => [t, newRow(t)])) }));
  const perGroup = groups.map((teams) => roundRobin(teams, legs));
  const nR = Math.max(...perGroup.map((r) => r.length));
  const rounds = [];
  for (let r = 0; r < nR; r++) {
    const ms = [];
    perGroup.forEach((gr, gi) => {
      if (gr[r]) for (const [h, a] of gr[r]) ms.push(mkMatch(h, a, dates[r], gi));
    });
    rounds.push(ms);
  }
  return { t: 'rr', name, groups: gs, rounds, dates: dates.slice(0, nR), adv };
}

function swissStage(name, teams, nRounds, dates, W) {
  const rr = swissPairings(teams, nRounds, (t) => teamCountry(W, t));
  return {
    t: 'rr', name, swiss: true, groups: [{ teams, rows: Object.fromEntries(teams.map((t) => [t, newRow(t)])) }],
    rounds: rr.map((pairs, r) => pairs.map(([h, a]) => mkMatch(h, a, dates[r], 0))), dates: dates.slice(0, nRounds), adv: { type: 'swiss' },
  };
}

function koStage(name, pairs, legs, dates, neutral = false) {
  // pairs: [[сеяный, несеяный]]; в двухматчевом противостоянии ответный матч дома у сеяного
  const ties = pairs.map(([a, b]) => {
    const m = [];
    if (legs === 2) {
      m.push(mkMatch(b, a, dates[0]));
      m.push(mkMatch(a, b, dates[1]));
    } else {
      m.push(mkMatch(a, b, dates[0]));
    }
    return { a, b, m, w: null };
  });
  const rounds = [];
  for (let r = 0; r < legs; r++) rounds.push(ties.map((t) => t.m[r]));
  return { t: 'ko', name, ties, legs, rounds, dates: dates.slice(0, legs), neutral };
}

// ---------- таблицы ----------
export function sortRows(rows, W) {
  return Object.values(rows).sort((x, y) => y.pts - x.pts || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf || teamRep(W, y.id) - teamRep(W, x.id));
}
function applyToTable(stage, m) {
  if (stage.t !== 'rr') return;
  const g = stage.groups[m.gi];
  const H = g.rows[m.h];
  const A = g.rows[m.a];
  if (!H || !A) return;
  H.p++; A.p++;
  H.gf += m.hg; H.ga += m.ag; A.gf += m.ag; A.ga += m.hg;
  if (m.hg > m.ag) { H.w++; A.l++; H.pts += 3; H.form.push('W'); A.form.push('L'); }
  else if (m.hg < m.ag) { A.w++; H.l++; A.pts += 3; H.form.push('L'); A.form.push('W'); }
  else { H.d++; A.d++; H.pts++; A.pts++; H.form.push('D'); A.form.push('D'); }
  if (H.form.length > 5) H.form.shift();
  if (A.form.length > 5) A.form.shift();
}

// Победитель противостояния
function tieWinner(tie) {
  const last = tie.m[tie.m.length - 1];
  if (last.hg === null) return null;
  let ga = 0;
  let gb = 0;
  for (const m of tie.m) {
    if (m.h === tie.a) { ga += m.hg; gb += m.ag; } else { ga += m.ag; gb += m.hg; }
  }
  if (ga > gb) return tie.a;
  if (gb > ga) return tie.b;
  if (last.pen) {
    const [ph, pa] = last.pen;
    const homeWon = ph > pa;
    return homeWon ? last.h : last.a;
  }
  return tie.a;
}

// Сумма предыдущих матчей противостояния для расчёта общего счёта (с точки зрения хозяев текущего матча)
export function koContext(W, comp, stage, roundIdx, m) {
  if (stage.t !== 'ko') return null;
  const tie = stage.ties.find((t) => t.m[roundIdx] === m || t.m.includes(m));
  if (!tie) return null;
  const isLast = tie.m.indexOf(m) === tie.m.length - 1;
  if (!isLast) return { needWinner: false };
  let prev = [0, 0];
  for (const x of tie.m) {
    if (x === m) break;
    if (x.h === m.h) prev = [prev[0] + x.hg, prev[1] + x.ag];
    else prev = [prev[0] + x.ag, prev[1] + x.hg];
  }
  return { needWinner: true, prev: tie.m.length > 1 ? prev : null };
}

// ---------- запись результата ----------
export function recordResult(W, comp, stageIdx, m, res) {
  m.hg = res.hg;
  m.ag = res.ag;
  m.gl = res.gl;
  m.pen = res.pen || null;
  const stage = comp.stages[stageIdx];
  applyToTable(stage, m);
  prizeForMatch(W, comp, m);
  checkStageDone(W, comp, stageIdx);
}

function stageDone(stage) {
  return stage.rounds.every((r) => r.every((m) => m.hg !== null));
}

function checkStageDone(W, comp, stageIdx) {
  const stage = comp.stages[stageIdx];
  if (stage.finished || !stageDone(stage)) return;
  stage.finished = true;
  try {
    advanceStage(W, comp, stageIdx, stage);
  } catch (e) {
    // не оставляем турнир в подвешенном состоянии: попробуем ещё раз при следующей проверке календаря
    stage.finished = false;
    throw e;
  }
}

// Турнир, у которого последняя стадия доиграна, но следующая так и не создана
export function healComp(W, comp) {
  if (comp.done || comp.kind === 'friendly' || !comp.stages.length) return false;
  const i = comp.stages.length - 1;
  const st = comp.stages[i];
  if (!stageDone(st)) return false;
  st.finished = false;
  checkStageDone(W, comp, i);
  return true;
}

function advanceStage(W, comp, stageIdx, stage) {
  if (stage.t === 'ko') for (const t of stage.ties) t.w = tieWinner(t);
  const next = comp.plan[stageIdx + 1];
  if (!next) {
    finishComp(W, comp);
    return;
  }
  // кто проходит дальше
  let pairs;
  let teams;
  if (stage.t === 'rr' && stage.adv?.type === 'swiss') {
    const table = sortRows(stage.groups[0].rows, W).map((r) => r.id);
    comp.seeded = table.slice(0, 8);
    const po = table.slice(8, 24);
    pairs = [];
    for (let i = 0; i < 8; i++) pairs.push([po[i], po[15 - i]]);
  } else if (stage.t === 'rr') {
    teams = advanceFromGroups(W, stage, stage.adv.n);
    const ord = bracketOrder(teams.length);
    pairs = [];
    for (let i = 0; i < ord.length; i += 2) pairs.push([teams[ord[i]], teams[ord[i + 1]]]);
  } else {
    const winners = stage.ties.map((t) => t.w);
    if (next.afterPlayoff) {
      // 1/8 финала: сеяные против победителей плей-офф
      pairs = reorderSeeded(comp.seeded, winners);
    } else if (next.draw === 'random') {
      const pool = shuffle([...winners, ...(comp.byes || [])]);
      comp.byes = [];
      pairs = [];
      for (let i = 0; i + 1 < pool.length; i += 2) pairs.push([pool[i], pool[i + 1]]);
    } else {
      pairs = [];
      for (let i = 0; i + 1 < winners.length; i += 2) pairs.push([winners[i], winners[i + 1]]);
    }
  }
  const nTeams = pairs.length * 2;
  const st = koStage(next.name || roundName(nTeams), pairs, next.legs || 1, next.dates, !!next.neutral);
  comp.stages.push(st);
  comp.cur = comp.stages.length - 1;
  addSchedule(W, comp.id, comp.cur, st);
  // если дата раунда уже прошла (на всякий случай) — сдвигаем
  for (let r = 0; r < st.dates.length; r++) {
    if (st.dates[r] < W.day) {
      const nd = W.day + 1 + r;
      st.dates[r] = nd;
      for (const m of st.rounds[r]) m.day = nd;
      (W.sched[nd] ||= []).push({ c: comp.id, s: comp.cur, r });
    }
  }
}

function reorderSeeded(seeded, poWinners) {
  // сетка 1/8: 1 и 2 сеяный разведены
  const base = seeded.map((s, i) => [s, poWinners[7 - i]]);
  const order = [0, 7, 3, 4, 1, 6, 2, 5];
  return order.map((i) => base[i]);
}

export function advanceFromGroups(W, stage, n) {
  const tiers = [];
  for (const g of stage.groups) {
    sortRows(g.rows, W).forEach((r, pos) => {
      (tiers[pos] ||= []).push(r);
    });
  }
  const out = [];
  for (const tier of tiers) {
    const sorted = tier.slice().sort((x, y) => y.pts / Math.max(1, y.p) - x.pts / Math.max(1, x.p) || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf);
    for (const r of sorted) {
      if (out.length >= n) break;
      out.push(r.id);
    }
    if (out.length >= n) break;
  }
  return out;
}

function finishComp(W, comp) {
  comp.done = true;
  const last = comp.stages[comp.stages.length - 1];
  if (comp.kind === 'qual') {
    comp.qualified = advanceFromGroups(W, last, last.adv.n);
    return;
  }
  let winner = null;
  if (last.t === 'ko') winner = last.ties[0]?.w;
  else winner = sortRows(last.groups[0].rows, W)[0]?.id;
  comp.winner = winner;
  if (comp.kind === 'friendly') return;
  const key = comp.hist || comp.id;
  (W.history[key] ||= []).push({ y: W.year, w: winner, name: comp.name });
  if (winner && comp.prizes?.champ && !isNat(winner)) payPrize(W, winner, comp.prizes.champ);
  (W._events ||= []).push({ type: 'trophy', comp: comp.id, name: comp.name, w: winner });
}

// ---------- призовые ----------
function payPrize(W, clubId, amount) {
  const c = W.clubs[clubId];
  if (!c || !amount) return;
  amount = Math.round(amount);
  c.balance += amount;
  c.fin.prize += amount;
}
function prizeForMatch(W, comp, m) {
  const pr = comp.prizes;
  if (!pr) return;
  if (isNat(m.h)) return;
  if (m.hg > m.ag) payPrize(W, m.h, pr.win);
  else if (m.hg < m.ag) payPrize(W, m.a, pr.win);
  else { payPrize(W, m.h, pr.draw); payPrize(W, m.a, pr.draw); }
}
export function payParticipation(W, comp) {
  if (!comp.prizes?.part) return;
  for (const t of comp.teams) if (!isNat(t)) payPrize(W, t, comp.prizes.part);
}

// ---------- построение сезона ----------
export function buildSeason(W, qual) {
  W.comps = {};
  W.sched = {};
  // лиги
  for (const L of LEAGUES) {
    const teams = W.leagues[L.id].clubs.slice();
    const rr = roundRobin(teams, L.rr);
    const dates = leagueDates(rr.length);
    const groups = [{ teams, rows: Object.fromEntries(teams.map((t) => [t, newRow(t)])) }];
    const stage = { t: 'rr', name: L.name, groups, rounds: rr.map((pairs, r) => pairs.map(([h, a]) => mkMatch(h, a, dates[r], 0))), dates, adv: null };
    const comp = { id: `L:${L.id}`, name: L.name, short: L.name, kind: 'league', scope: 'club', lid: L.id, country: L.country, stages: [stage], plan: [{}], cur: 0, teams, prizes: null };
    W.comps[comp.id] = comp;
    addSchedule(W, comp.id, 0, stage);
  }
  // национальные кубки
  const byCountry = {};
  for (const L of LEAGUES) (byCountry[L.country] ||= []).push(...W.leagues[L.id].clubs);
  for (const country in byCountry) {
    const teams = byCountry[country];
    const n = teams.length;
    let size = 2;
    while (size < n) size *= 2;
    const nRounds = Math.log2(size);
    const dates = cupDatesFor(nRounds);
    const sorted = teams.slice().sort((a, b) => W.clubs[b].rep - W.clubs[a].rep);
    const byes = sorted.slice(0, size - n);
    const playing = shuffle(sorted.slice(size - n));
    const pairs = [];
    for (let i = 0; i + 1 < playing.length; i += 2) pairs.push([playing[i], playing[i + 1]]);
    const plan = [];
    for (let r = 0; r < nRounds; r++) {
      const left = size / 2 ** r;
      plan.push({ name: roundName(left), legs: 1, dates: [dates[r]], draw: 'random', neutral: r === nRounds - 1 });
    }
    const tvf = Math.max(...LEAGUES.filter((l) => l.country === country).map((l) => l.tv));
    const comp = {
      id: `CUP:${country}`, name: COUNTRY_CUP[country] || `Кубок ${country}`, kind: 'cup', scope: 'club', country, stages: [], plan, cur: 0, teams,
      byes, prizes: { win: Math.round(150000 * tvf), draw: 0, champ: Math.round(3e6 * tvf) }, hist: `CUP:${country}`,
    };
    const st = koStage(plan[0].name, pairs, 1, plan[0].dates);
    comp.stages.push(st);
    W.comps[comp.id] = comp;
    addSchedule(W, comp.id, 0, st);
  }
  buildContinental(W, qual);
  buildInternational(W);
}

function leagueTop(W, lid, n, qual) {
  if (qual && qual[lid]) return qual[lid].slice(0, n);
  return W.leagues[lid].clubs.slice().sort((a, b) => W.clubs[b].rep - W.clubs[a].rep).slice(0, n);
}

function bgClubs(W, region) {
  return Object.values(W.clubs).filter((c) => !c.league && c.region === region).sort((a, b) => b.rep + rand() * 4 - (a.rep + rand() * 4)).map((c) => c.id);
}

function buildContinental(W, qual) {
  // Европа
  const used = new Set();
  const take = (arr, n) => {
    const out = [];
    for (const x of arr) {
      if (out.length >= n) break;
      if (!used.has(x)) { out.push(x); used.add(x); }
    }
    return out;
  };
  const ucl = [];
  const uel = [];
  const uecl = [];
  for (const L of LEAGUES) {
    if (!L.euro) continue;
    const order = qual?.[L.id] || leagueTop(W, L.id, 20);
    let i = 0;
    for (const id of order.slice(0, L.euro.ucl)) { ucl.push(id); used.add(id); i++; }
    for (const id of order.slice(i, i + L.euro.uel)) { uel.push(id); used.add(id); }
    i += L.euro.uel;
    for (const id of order.slice(i, i + L.euro.uecl)) { uecl.push(id); used.add(id); }
  }
  const bgEU = bgClubs(W, 'EU');
  ucl.push(...take(bgEU, 36 - ucl.length));
  uel.push(...take(bgEU, 36 - uel.length));
  uecl.push(...take(bgEU, 36 - uecl.length));
  // если фоновых клубов не хватило — добираем из лиг
  const leagueRest = Object.values(W.clubs).filter((c) => c.league && LEAGUE_BY_ID[c.league].euro && LEAGUE_BY_ID[c.league].tier === 1).sort((a, b) => b.rep - a.rep).map((c) => c.id);
  uecl.push(...take(leagueRest, 36 - uecl.length));
  uel.push(...take(leagueRest, 36 - uel.length));

  const ueKo = (dates, fin) => [
    {},
    { name: 'Плей-офф', legs: 2, dates: dates[0] },
    { name: '1/8 финала', legs: 2, dates: dates[1], afterPlayoff: true },
    { name: '1/4 финала', legs: 2, dates: dates[2] },
    { name: '1/2 финала', legs: 2, dates: dates[3] },
    { name: 'Финал', legs: 1, dates: dates[4], neutral: true },
  ];
  const mkUefa = (id, name, teams, nR, swissDates, koDates, prizes) => {
    const st = swissStage('Общий этап', teams, nR, swissDates, W);
    const comp = { id, name, kind: 'cup', scope: 'club', stages: [st], plan: ueKo(koDates), cur: 0, teams, prizes, hist: id };
    W.comps[id] = comp;
    addSchedule(W, id, 0, st);
    payParticipation(W, comp);
  };
  mkUefa('UCL', 'Лига чемпионов', ucl, 8, DATES.uclSwiss, DATES.uclKo, { part: 18.6e6, win: 2.1e6, draw: 0.7e6, champ: 25e6 });
  mkUefa('UEL', 'Лига Европы', uel, 8, DATES.uelSwiss, DATES.uelKo, { part: 4.3e6, win: 0.45e6, draw: 0.15e6, champ: 12e6 });
  mkUefa('UECL', 'Лига конференций', uecl, 6, DATES.ueclSwiss, DATES.ueclKo, { part: 3.2e6, win: 0.4e6, draw: 0.13e6, champ: 7e6 });

  // Либертадорес
  const lib = [...leagueTop(W, 'BRA1', 7, qual), ...leagueTop(W, 'ARG1', 6, qual)];
  lib.push(...bgClubs(W, 'SA').slice(0, 32 - lib.length));
  groupCup(W, 'LIB', 'Копа Либертадорес', lib, 8, DATES.libGroups, [
    { name: '1/8 финала', legs: 2, dates: DATES.libKo[0] },
    { name: '1/4 финала', legs: 2, dates: DATES.libKo[1] },
    { name: '1/2 финала', legs: 2, dates: DATES.libKo[3] },
    { name: 'Финал', legs: 1, dates: DATES.libKo[4], neutral: true },
  ], 16, { part: 3e6, win: 0.33e6, draw: 0.1e6, champ: 24e6 });

  // Азиатская Лига чемпионов
  const afc = [...leagueTop(W, 'KSA1', 4, qual), ...bgClubs(W, 'AS').slice(0, 20)];
  groupCup(W, 'AFC', 'Лига чемпионов АФК', afc, 6, DATES.afcGroups, [
    { name: '1/8 финала', legs: 2, dates: DATES.afcKo[0] },
    { name: '1/4 финала', legs: 1, dates: DATES.afcKo[1] },
    { name: '1/2 финала', legs: 1, dates: DATES.afcKo[2] },
    { name: 'Финал', legs: 1, dates: DATES.afcKo[3], neutral: true },
  ], 16, { part: 1e6, win: 0.1e6, draw: 0.05e6, champ: 10e6 });

  // Кубок чемпионов КОНКАКАФ
  const conc = [...leagueTop(W, 'USA1', 8, qual), ...bgClubs(W, 'NA').slice(0, 8)].sort((a, b) => W.clubs[b].rep - W.clubs[a].rep);
  const ord = bracketOrder(16);
  const pairs = [];
  for (let i = 0; i < 16; i += 2) pairs.push([conc[ord[i]], conc[ord[i + 1]]]);
  const plan = [
    { name: '1/8 финала', legs: 2, dates: DATES.concKo[0] },
    { name: '1/4 финала', legs: 2, dates: DATES.concKo[1] },
    { name: '1/2 финала', legs: 2, dates: DATES.concKo[2] },
    { name: 'Финал', legs: 1, dates: DATES.concKo[4], neutral: true },
  ];
  const st = koStage(plan[0].name, pairs, 2, plan[0].dates);
  const comp = { id: 'CON', name: 'Кубок чемпионов КОНКАКАФ', kind: 'cup', scope: 'club', stages: [st], plan, cur: 0, teams: conc, prizes: { part: 0.5e6, win: 0.1e6, draw: 0.05e6, champ: 5e6 }, hist: 'CON' };
  W.comps.CON = comp;
  addSchedule(W, 'CON', 0, st);
}

function groupCup(W, id, name, teams, nGroups, groupDates, koPlan, nAdv, prizes, opts = {}) {
  const sorted = teams.slice().sort((a, b) => teamRep(W, b) - teamRep(W, a));
  const groups = potGroups(sorted, nGroups);
  const st = rrStage('Групповой этап', groups, opts.legs || 2, groupDates, { type: 'groups', n: nAdv });
  const comp = { id, name, kind: opts.kind || 'cup', scope: opts.scope || 'club', stages: [st], plan: [{}, ...koPlan], cur: 0, teams, prizes, hist: opts.hist || id, neutralAll: !!opts.neutral };
  if (opts.neutral) st.neutral = true;
  W.comps[id] = comp;
  addSchedule(W, id, 0, st);
  payParticipation(W, comp);
  return comp;
}

// ---------- сборные ----------
const nid = (code) => `n:${code}`;
function confNations(W, conf) {
  return NATIONS.filter((n) => n.conf === conf).map((n) => n.code).sort((a, b) => W.nations[b].rep - W.nations[a].rep);
}

function qualComp(W, id, name, codes, groupSizes, quota, legs, target) {
  const teams = codes.map(nid);
  const nG = groupSizes.length;
  // распределяем по корзинам с учётом размеров групп
  const groups = Array.from({ length: nG }, () => []);
  let idx = 0;
  const sorted = teams.slice();
  const maxSize = Math.max(...groupSizes);
  for (let pot = 0; pot < maxSize; pot++) {
    const slots = shuffle(groups.map((_, i) => i).filter((i) => groupSizes[i] > pot));
    for (const gi of slots) {
      if (idx < sorted.length) groups[gi].push(sorted[idx++]);
    }
  }
  const nR = Math.max(...groups.map((g) => (g.length % 2 ? g.length : g.length - 1) * legs));
  const st = rrStage('Отбор', groups, legs, INTL_DAYS.slice(0, nR), { type: 'groups', n: quota });
  const comp = { id, name, kind: 'qual', scope: 'nat', stages: [st], plan: [{}], cur: 0, teams, target, hist: id };
  W.comps[id] = comp;
  addSchedule(W, id, 0, st);
  return comp;
}

export function buildInternational(W) {
  const F = W.year + 1;
  W.intlPlan = [];
  const m = F % 4;
  if (m === 2) {
    // чемпионат мира: отбор по конфедерациям
    qualComp(W, 'WCQ-UEFA', `Отбор ЧМ-${F}: Европа`, confNations(W, 'UEFA'), [5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 4], 16, 2, 'WC');
    qualComp(W, 'WCQ-CONMEBOL', `Отбор ЧМ-${F}: Южная Америка`, confNations(W, 'CONMEBOL'), [10], 7, 1, 'WC');
    qualComp(W, 'WCQ-CAF', `Отбор ЧМ-${F}: Африка`, confNations(W, 'CAF'), [5, 5, 5, 5, 5, 5, 5, 5, 4], 10, 2, 'WC');
    qualComp(W, 'WCQ-AFC', `Отбор ЧМ-${F}: Азия`, confNations(W, 'AFC'), [5, 5, 5, 5, 4, 4], 9, 2, 'WC');
    qualComp(W, 'WCQ-CONCACAF', `Отбор ЧМ-${F}: КОНКАКАФ`, confNations(W, 'CONCACAF'), [5, 5, 5], 5, 2, 'WC');
    qualComp(W, 'WCQ-OFC', `Отбор ЧМ-${F}: Океания`, confNations(W, 'OFC'), [6], 1, 1, 'WC');
    W.intlPlan.push({ id: 'WC', name: `Чемпионат мира ${F}`, size: 48, from: 'WCQ' });
  } else if (m === 0) {
    qualComp(W, 'EQ', `Отбор Евро-${F}`, confNations(W, 'UEFA'), [6, 6, 6, 6, 5, 5, 5, 5, 5, 5], 24, 2, 'EURO');
    W.intlPlan.push({ id: 'EURO', name: `Евро-${F}`, size: 24, from: 'EQ' });
    W.intlPlan.push({ id: 'COPA', name: `Копа Америка ${F}`, size: 16, direct: [...confNations(W, 'CONMEBOL'), ...confNations(W, 'CONCACAF').slice(0, 6)] });
  } else {
    if (m === 3) {
      qualComp(W, 'ACQ', `Отбор Кубка Азии ${F}`, confNations(W, 'AFC'), [4, 4, 4, 4, 4, 4, 4], 24, 2, 'ASIA');
      W.intlPlan.push({ id: 'ASIA', name: `Кубок Азии ${F}`, size: 24, from: 'ACQ' });
    }
    const caf = confNations(W, 'CAF');
    qualComp(W, 'AFQ', `Отбор Кубка Африки ${F}`, caf, [4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 3], 24, 2, 'AFCON');
    W.intlPlan.push({ id: 'AFCON', name: `Кубок Африки ${F}`, size: 24, from: 'AFQ' });
    W.intlPlan.push({ id: 'GOLD', name: `Золотой кубок ${F}`, size: 16, direct: confNations(W, 'CONCACAF').slice(0, 16) });
    // Лига наций УЕФА
    const uefa = confNations(W, 'UEFA');
    const groups = [];
    let i = 0;
    const sizes = [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5];
    for (const s of sizes) { groups.push(uefa.slice(i, i + s).map(nid)); i += s; }
    const st = rrStage('Лига наций', groups, 2, INTL_DAYS.slice(0, 10), null);
    const letters = ['A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'C', 'C', 'C', 'D', 'D'];
    st.groupNames = groups.map((_, gi) => `Лига ${letters[gi]}, группа ${gi + 1}`);
    const comp = { id: 'UNL', name: `Лига наций УЕФА ${W.year}/${String(F % 100).padStart(2, '0')}`, kind: 'league', scope: 'nat', stages: [st], plan: [{}], cur: 0, teams: uefa.map(nid), hist: 'UNL', multiWinner: true };
    W.comps.UNL = comp;
    addSchedule(W, 'UNL', 0, st);
  }
}

// Финальные турниры сборных — создаются после последнего окна сезона
export function buildFinals(W) {
  // Финал четырёх Лиги наций: победители групп лиги A
  const unl = W.comps.UNL;
  if (unl && !W.comps.UNLF) {
    const st0 = unl.stages[0];
    const win = st0.groups.slice(0, 4).map((g) => sortRows(g.rows, W)[0]?.id).filter(Boolean);
    if (win.length === 4) {
      const F = W.year + 1;
      const plan = [
        { name: '1/2 финала', legs: 1, dates: [SUMMER_DAYS[2]], neutral: true },
        { name: 'Финал', legs: 1, dates: [SUMMER_DAYS[5]], neutral: true },
      ];
      const kst = koStage(plan[0].name, [[win[0], win[3]], [win[1], win[2]]], 1, plan[0].dates, true);
      W.comps.UNLF = { id: 'UNLF', name: `Лига наций: Финал четырёх ${F}`, kind: 'cup', scope: 'nat', stages: [kst], plan, cur: 0, teams: win, prizes: null, hist: 'UNLF', neutralAll: true };
      addSchedule(W, 'UNLF', 0, kst);
    }
  }
  for (const plan of W.intlPlan || []) {
    if (W.comps[plan.id]) continue;
    let teams;
    if (plan.direct) teams = plan.direct.map(nid);
    else {
      teams = [];
      for (const cid in W.comps) {
        const c = W.comps[cid];
        if (c.kind === 'qual' && c.target === plan.id) {
          if (!c.qualified) {
            // если отбор не доигран — проходят лучшие по таблице
            c.qualified = advanceFromGroups(W, c.stages[0], c.stages[0].adv.n);
            c.done = true;
          }
          teams.push(...c.qualified);
        }
      }
    }
    teams = teams.slice(0, plan.size);
    const nGroups = teams.length / 4;
    const nAdv = plan.size === 48 ? 32 : plan.size === 24 ? 16 : 8;
    const koDays = SUMMER_DAYS.slice(3);
    const names = nAdv === 32 ? ['1/16 финала', '1/8 финала', '1/4 финала', '1/2 финала', 'Финал'] : nAdv === 16 ? ['1/8 финала', '1/4 финала', '1/2 финала', 'Финал'] : ['1/4 финала', '1/2 финала', 'Финал'];
    const koPlan = names.map((name, i) => ({ name, legs: 1, dates: [koDays[i]], neutral: true }));
    groupCup(W, plan.id, plan.name, teams, nGroups, SUMMER_DAYS.slice(0, 3), koPlan, nAdv, null, { kind: 'cup', scope: 'nat', legs: 1, hist: plan.id, neutral: true });
  }
}

// Товарищеские матчи
export function addFriendly(W, h, a, day, name = 'Товарищеский матч') {
  let comp = W.comps.FR;
  if (!comp) {
    comp = { id: 'FR', name: 'Товарищеские матчи', kind: 'friendly', scope: 'mixed', stages: [{ t: 'list', name: 'Товарищеские', rounds: [], dates: [], neutral: false }], plan: [{}], cur: 0, teams: [] };
    W.comps.FR = comp;
  }
  const st = comp.stages[0];
  const m = mkMatch(h, a, day, 0);
  m.label = name;
  st.rounds.push([m]);
  st.dates.push(day);
  (W.sched[day] ||= []).push({ c: 'FR', s: 0, r: st.rounds.length - 1 });
  return m;
}

export function recordFriendly(W, m, res) {
  m.hg = res.hg;
  m.ag = res.ag;
  m.gl = res.gl;
}

export function compStageName(comp, stage, gi) {
  if (stage.groupNames) return stage.groupNames[gi];
  if (stage.groups && stage.groups.length > 1) return `Группа ${String.fromCharCode(65 + gi)}`;
  return stage.name;
}

// ---------- связь противостояний с матчами после загрузки ----------
// В сохранении (JSON) пары плей-офф и матчи туров становятся разными копиями.
// Привязываем матчи пар обратно к объектам из туров — результаты пишутся именно туда.
export function relinkTies(W) {
  for (const cid in W.comps) {
    for (const st of W.comps[cid].stages) {
      if (st.t !== 'ko' || !st.ties) continue;
      const map = new Map();
      for (const r of st.rounds) for (const m of r) map.set(`${m.h}|${m.a}`, m);
      for (const t of st.ties) t.m = t.m.map((x) => map.get(`${x.h}|${x.a}`) || x);
    }
  }
}

// Чиним турниры, которые успели «доиграться» с неверными победителями пар:
// пересчитываем победителей и пересобираем следующие стадии, если они ещё не сыграны по-настоящему.
export function repairKnockouts(W) {
  relinkTies(W);
  let fixed = 0;
  for (const cid in W.comps) {
    const comp = W.comps[cid];
    if (comp.kind === 'friendly') continue;
    for (let i = 0; i < comp.stages.length; i++) {
      const st = comp.stages[i];
      if (st.t !== 'ko' || !stageDone(st)) continue;
      const winners = st.ties.map((t) => tieWinner(t));
      const changed = st.ties.some((t, k) => t.w !== winners[k]);
      const next = comp.stages[i + 1];
      const nextTeams = next ? new Set(next.rounds.flat().flatMap((m) => [m.h, m.a])) : null;
      const broken = next && (next.rounds.flat().some((m) => !m.h || !m.a) || winners.some((w) => w && !nextTeams.has(w)));
      const nextPlayed = next && next.rounds.flat().some((m) => m.hg !== null && m.h && m.a);
      const wasDoneWrong = !next && comp.done && comp.winner !== winners[0] && st.ties.length === 1;
      if (!changed && !broken && !wasDoneWrong) continue;
      if (next && nextPlayed && !next.rounds.flat().some((m) => !m.h || !m.a)) {
        // следующая стадия уже реально сыграна — оставляем как есть, только обновляем подписи
        st.ties.forEach((t, k) => { t.w = winners[k]; });
        continue;
      }
      // убираем испорченные стадии и их записи в календаре
      const cut = i + 1;
      for (const d in W.sched) W.sched[d] = W.sched[d].filter((e) => !(e.c === cid && e.s >= cut));
      comp.stages.length = cut;
      comp.cur = i;
      if (comp.done) {
        const key = comp.hist || comp.id;
        const h = W.history[key];
        if (h && h.length && h[h.length - 1].y === W.year) h.pop();
        comp.done = false;
        comp.winner = null;
      }
      st.finished = false;
      st.ties.forEach((t) => { t.w = null; });
      checkStageDone(W, comp, i);
      fixed++;
      break;
    }
  }
  return fixed;
}
