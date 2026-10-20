// Карьера тренера в духе FC 27: тренировочный план недели, игровой тонус, динамический потенциал,
// ранги в составе и скаутская сеть.
import { rand, randInt, chance, pick, gauss, weighted } from './rng';
import { clamp, dynOvr, dynDelta, growthOf, GROWTH, playerValue, wageFor, POS_RU, POS_FULL, LINE, FORMATIONS, slotRating, money, fmtShort } from './util';
import { NATIONS, NATION_BY_CODE } from '../data/nations';
import { LEAGUES } from '../data/leagues';
import { makePlayer, levelOfRep, randomName } from './gen';
import { invalidateNatIndex } from './teams';

const absDay = (W) => W.year * 365 + W.day;

// ================= тренировочный план недели =================
export const PLANS = {
  rest: { ru: 'Восстановление', icon: 'bed', d: 'Свежесть быстро растёт, тонус и развитие проседают. Травм меньше.', base: 58, rec: 2.5, grow: 0.85, inj: 0.5, int: 0 },
  bal: { ru: 'Сбалансированно', d: 'Стандартная неделя: держим форму и спокойно развиваемся.', icon: 'scale', base: 70, rec: 0, grow: 1, inj: 1, int: 1 },
  sharp: { ru: 'Игровая практика', d: 'Квадраты и двусторонки: запасные набирают тонус, но устают.', icon: 'football', base: 84, rec: -1, grow: 1, inj: 1.1, int: 1 },
  intense: { ru: 'Интенсив', d: 'Развитие +20%, но игроки медленнее восстанавливаются и чаще травмируются.', icon: 'flame', base: 74, rec: -2, grow: 1.2, inj: 1.7, int: 2 },
};
export function userPlan(W) {
  return PLANS[W.user?.plan] ? W.user.plan : 'bal';
}
export function setPlan(W, key) {
  if (!PLANS[key] || !W.user?.club) return;
  W.user.plan = key;
  W.clubs[W.user.club].training.int = PLANS[key].int;
}

// Двусторонняя игра для тех, кто мало играет (раз в неделю)
export function practiceMatch(W) {
  const u = W.user;
  if (!u?.club) return { status: 'error', msg: 'Нет клуба.' };
  const wk = Math.floor(absDay(W) / 7);
  if (u.practiceWk === wk) return { status: 'error', msg: 'Двусторонка на этой неделе уже была.' };
  u.practiceWk = wk;
  const c = W.clubs[u.club];
  const now = absDay(W);
  const list = c.squad.map((id) => W.players[id]).filter((p) => p && p.inj <= 0 && now - (p.lp || 0) > 4);
  let injured = null;
  for (const p of list) {
    p.shp = clamp((p.shp ?? 70) + 10, 30, 100);
    p.fit = clamp(p.fit - 12, 30, 100);
    if (!injured && chance(0.012)) {
      p.inj = randInt(3, 10);
      injured = p;
    }
  }
  return {
    status: 'accepted',
    msg: `${list.length} игроков провели двустороннюю игру: тонус +10, свежесть −12.${injured ? `\n\n${injured.n} получил лёгкую травму (~${injured.inj} дн.).` : ''}`,
  };
}

// ================= еженедельные процессы =================
export function weeklyCareer(W) {
  const now = absDay(W);
  const userClub = W.user?.club || null;
  const plan = PLANS[userPlan(W)];
  const preseason = W.day < 45;
  for (const id in W.players) {
    const p = W.players[id];
    if (p.shp === undefined) p.shp = 75;
    const played = now - (p.lp || -99) <= 7;
    if (!played) {
      let base;
      if (!p.club) base = p.fa ? 50 : 65;
      else if (p.club === userClub) base = plan.base;
      else base = 62 + (W.clubs[p.club]?.training.int ?? 1) * 4;
      if (preseason) base += 10;
      p.shp = Math.round(p.shp + (base - p.shp) * 0.35);
      p.frm = Math.round((p.frm || 0) * 0.85 * 100) / 100;
    }
    if (p.frag > 0) p.frag = Math.max(0, p.frag - 7);
    // юные таланты из скаутских отчётов исчезают, если их не подписали
    if (p.pros && p.pros.until < now) {
      delete W.players[id];
      if (W.scouting) W.scouting.youth = (W.scouting.youth || []).filter((x) => x !== p.id);
    }
  }
  scoutingWeek(W);
}

// Тренировочный план пользователя: восстановление свежести по дням
export function planRecovery(W, p) {
  if (!W.user?.club || p.club !== W.user.club) return 0;
  return PLANS[userPlan(W)].rec;
}
export function planGrowth(W, p) {
  if (!W.user?.club || p.club !== W.user.club) return 1;
  return PLANS[userPlan(W)].grow;
}
export function planInjury(W, p) {
  if (!W.user?.club || p.club !== W.user.club) return 1;
  return PLANS[userPlan(W)].inj;
}

// ================= динамический потенциал =================
// Раз в месяц: отличная игра поднимает потолок, долгий провал или отсутствие практики — снижает.
export function monthlyPotential(W) {
  const changes = [];
  const userClub = W.user?.club;
  for (const id in W.players) {
    const p = W.players[id];
    if (p.age > 26 || p.pros) continue;
    let d = 0;
    const app = p.st.app;
    const avg = app ? p.st.rs / app : 0;
    const recent = p.rr && p.rr.length >= 3 ? p.rr.reduce((s, x) => s + x, 0) / p.rr.length : avg;
    const g = growthOf(p);
    if (app >= 3 && recent >= 7.3 && chance(0.3 * g.v ** 0.5)) d = recent >= 7.7 ? 2 : 1;
    else if (app >= 5 && recent < 6.25 && chance(0.25)) d = -1;
    else if (p.age <= 22 && !p.aca && W.day > 150 && app === 0 && p.club && chance(0.15)) d = -1;
    if (!d) continue;
    const before = p.pot;
    p.pot = clamp(p.pot + d, p.ovr, 95);
    if (p.pot === before) continue;
    p.potTr = { d: p.pot - before, at: absDay(W) };
    if (userClub && p.club === userClub) changes.push(`${p.n}: ${before} → ${p.pot}${d > 0 ? ' ▲' : ' ▼'}`);
  }
  return changes;
}

// ================= ранги в составе (Squad Ranks) =================
export const RANKS = {
  star: { ru: 'Звезда', color: '#FFB547', ord: 0 },
  key: { ru: 'Ключевой', color: '#2BD67B', ord: 1 },
  first: { ru: 'Основа', color: '#4C8DFF', ord: 2 },
  rot: { ru: 'Ротация', color: '#A7B1C6', ord: 3 },
  sub: { ru: 'Запас', color: '#6B768C', ord: 4 },
  pros: { ru: 'Перспектива', color: '#B07CFF', ord: 5 },
};
const rankCache = new Map();
export function squadRanks(W, clubId) {
  const c = W.clubs[clubId];
  if (!c) return {};
  const key = `${clubId}:${W.year}:${W.day}:${c.squad.length}`;
  const hit = rankCache.get(clubId);
  if (hit && hit.key === key) return hit.map;
  const ps = c.squad.map((id) => W.players[id]).filter(Boolean);
  // вклад: динамический рейтинг с поправкой на позицию в схеме
  const val = (p) => dynOvr(p) + (p.inj > 30 ? -3 : 0);
  const sorted = ps.slice().sort((a, b) => val(b) - val(a));
  const top = sorted[0] ? val(sorted[0]) : 70;
  const map = {};
  sorted.forEach((p, i) => {
    let r;
    if (i < 2 && val(p) >= top - 2) r = 'star';
    else if (i < 6) r = 'key';
    else if (i < 13) r = 'first';
    else if (i < 19) r = 'rot';
    else r = 'sub';
    if ((r === 'sub' || r === 'rot') && p.age <= 21 && p.pot - p.ovr >= 7) r = 'pros';
    map[p.id] = r;
  });
  rankCache.set(clubId, { key, map });
  return map;
}
// Соответствие обещанной роли и реального ранга
const ROLE_RANK = { key: 1, first: 2, rotation: 3, backup: 4, prospect: 5 };
export function rankMismatch(W, p) {
  if (!p.role || !p.club) return 0;
  const r = squadRanks(W, p.club)[p.id];
  if (!r) return 0;
  const want = ROLE_RANK[p.role] ?? 3;
  const have = RANKS[r].ord === 0 ? 1 : RANKS[r].ord;
  if (r === 'pros' && p.role === 'prospect') return 0;
  return have - want; // >0 — игрок ниже обещанного статуса
}

// ================= скаутская сеть =================
const SCOUT_FIRST = ['Марко', 'Хорхе', 'Ганс', 'Пьер', 'Олег', 'Том', 'Луиш', 'Андрей', 'Карлос', 'Ян', 'Дэвид', 'Матео', 'Сергей', 'Пол', 'Юрген', 'Франк'];
const SCOUT_LAST = ['Росси', 'Перейра', 'Мюллер', 'Дюбуа', 'Коваленко', 'Уилсон', 'Сантуш', 'Бойко', 'Гарсия', 'Новак', 'Браун', 'Фернандес', 'Шевчук', 'Кларк', 'Шмидт', 'Лоран'];

export function scoutingState(W) {
  if (!W.scouting) W.scouting = { scouts: [], pool: [], reports: {}, youth: [], watch: [], poolDay: -99 };
  return W.scouting;
}
export const MAX_SCOUTS = 3;
const scoutWage = (s) => Math.round((1500 + (s.exp + s.jud) ** 2 * 260) / 100) * 100;
const scoutFee = (s) => Math.round((s.exp + s.jud) ** 2 * 18000 / 1000) * 1000;

export function scoutCandidates(W) {
  const sc = scoutingState(W);
  if (absDay(W) - sc.poolDay > 30 || !sc.pool.length) {
    sc.pool = Array.from({ length: 5 }, (_, i) => {
      const exp = clamp(Math.round(1 + rand() * 4.4), 1, 5);
      const jud = clamp(Math.round(1 + rand() * 4.4), 1, 5);
      const s = { id: `s${absDay(W)}${i}${randInt(0, 999)}`, n: `${pick(SCOUT_FIRST)} ${pick(SCOUT_LAST)}`, exp, jud, task: null };
      s.wage = scoutWage(s);
      s.fee = scoutFee(s);
      return s;
    });
    sc.poolDay = absDay(W);
  }
  return sc.pool;
}
export function hireScout(W, sid) {
  const sc = scoutingState(W);
  const c = W.clubs[W.user.club];
  if (sc.scouts.length >= MAX_SCOUTS) return { status: 'error', msg: `Максимум ${MAX_SCOUTS} скаута. Уволите кого-то — освободится место.` };
  const s = sc.pool.find((x) => x.id === sid);
  if (!s) return { status: 'error', msg: 'Кандидат уже недоступен.' };
  if (c.balance < s.fee) return { status: 'error', msg: `Не хватает денег: подъёмные ${money(s.fee)}.` };
  c.balance -= s.fee;
  c.fin.staff += s.fee;
  sc.pool = sc.pool.filter((x) => x.id !== sid);
  sc.scouts.push(s);
  return { status: 'accepted', msg: `${s.n} присоединился к скаутской службе. Дайте ему задание.` };
}
export function fireScout(W, sid) {
  const sc = scoutingState(W);
  sc.scouts = sc.scouts.filter((s) => s.id !== sid);
}

// задание: { type: 'senior'|'youth', nat, pos|null, age: 'u21'|'u25'|'any', weeks, left }
export function assignScout(W, sid, task) {
  const s = scoutingState(W).scouts.find((x) => x.id === sid);
  if (!s) return;
  s.task = task ? { ...task, left: task.weeks, made: 0 } : null;
}

export const COUNTRIES = (() => {
  const set = new Set(LEAGUES.map((L) => L.country));
  return NATIONS.filter((n) => set.has(n.code) || n.str >= 70).sort((a, b) => b.str - a.str);
})();

// Отчёт: оценка потенциала с ошибкой, зависящей от «оценки» скаута
function makeReport(W, p, s) {
  const err = Math.max(1, 6 - s.jud);
  const off = Math.round(gauss(0, err * 0.45));
  const mid = p.pot + off;
  const lo = clamp(mid - err, p.ovr, 99);
  const hi = clamp(mid + err, lo, 99);
  return { by: s.n, at: absDay(W), lo, hi, gp: s.jud >= 3 ? growthKey2(p) : null };
}
const growthKey2 = (p) => { growthOf(p); return p.gp; };

function scoutingWeek(W) {
  const sc = W.scouting;
  const u = W.user;
  if (!sc || !u?.club) return;
  const c = W.clubs[u.club];
  const now = absDay(W);
  // зарплаты скаутов
  for (const s of sc.scouts) {
    c.balance -= s.wage;
    c.fin.staff += s.wage;
  }
  const found = [];
  // точечные просмотры конкретных игроков
  if (sc.watch.length && sc.scouts.length) {
    const best = sc.scouts.slice().sort((a, b) => b.jud - a.jud)[0];
    for (const pid of sc.watch) {
      const p = W.players[pid];
      if (p) { sc.reports[pid] = makeReport(W, p, best); found.push(p.n); }
    }
    sc.watch = [];
  }
  const L = levelOfRep(c.rep);
  for (const s of sc.scouts) {
    const t = s.task;
    if (!t) continue;
    t.left--;
    if (t.type === 'youth') {
      // находим юного таланта каждые 2 недели
      if ((t.weeks - t.left) % 2 === 0) {
        const p = youthProspect(W, t.nat, t.pos, s, c);
        sc.youth.push(p.id);
        sc.reports[p.id] = makeReport(W, p, s);
        found.push(`${p.n} (${p.age} лет, юниор)`);
      }
    } else {
      const n = 1 + (s.exp >= 4 ? 1 : 0) + (s.exp >= 5 && chance(0.5) ? 1 : 0);
      const maxAge = t.age === 'u21' ? 21 : t.age === 'u25' ? 25 : 40;
      const cands = [];
      for (const id in W.players) {
        const p = W.players[id];
        if (p.club === u.club || p.aca || p.pros || p.home) continue;
        if (p.age > maxAge) continue;
        if (t.pos && p.pos !== t.pos) continue;
        const country = p.club ? W.clubs[p.club]?.country : null;
        if (t.nat && p.nat !== t.nat && country !== t.nat) continue;
        if (sc.reports[p.id] && now - sc.reports[p.id].at < 120) continue;
        cands.push(p);
      }
      // опытный скаут находит игроков нужного уровня и с потенциалом
      const pickOne = () => {
        if (!cands.length) return null;
        const p = weighted(cands, (x) => {
          const fit = Math.exp(-Math.abs(Math.max(x.ovr, x.pot - 2) - (L + 2)) / (3 + s.exp));
          return fit * (1 + Math.max(0, x.pot - x.ovr) / 10) + 0.02;
        });
        cands.splice(cands.indexOf(p), 1);
        return p;
      };
      for (let i = 0; i < n; i++) {
        const p = pickOne();
        if (!p) break;
        sc.reports[p.id] = makeReport(W, p, s);
        found.push(`${p.n} (${POS_RU[p.pos]}, ${p.age})`);
      }
    }
    t.made += 1;
    if (t.left <= 0) {
      s.task = null;
      W._scoutDone = (W._scoutDone || []).concat(s.n);
    }
  }
  // чистим старые отчёты об ушедших игроках
  for (const pid in sc.reports) if (!W.players[pid] || now - sc.reports[pid].at > 400) delete sc.reports[pid];
  sc.newCount = (sc.newCount || 0) + found.length;
  return found;
}

export function watchPlayer(W, pid) {
  const sc = scoutingState(W);
  if (!sc.scouts.length) return { status: 'error', msg: 'Сначала наймите скаута в разделе «Скаутинг».' };
  if (sc.watch.includes(pid)) return { status: 'error', msg: 'Скаут уже едет смотреть этого игрока.' };
  if (sc.watch.length >= 6) return { status: 'error', msg: 'Слишком много просмотров на эту неделю.' };
  sc.watch.push(pid);
  return { status: 'accepted', msg: 'Скаут посмотрит игрока, отчёт будет через несколько дней.' };
}

function youthProspect(W, nat, pos, s, club) {
  const n = NATION_BY_CODE[nat];
  const age = randInt(15, 16);
  const quality = (n?.str || 60) / 100;
  const ovr = Math.round(clamp(38 + quality * 14 + gauss(0, 4) + (age - 15) * 3, 30, 66));
  const pot = Math.round(clamp(ovr + 14 + gauss(s.exp * 3 + quality * 6, 6), ovr + 6, 94));
  const p = makePlayer(W, { pos: pos || pick(['GK', 'CB', 'CB', 'LB', 'RB', 'DM', 'CM', 'CM', 'AM', 'LW', 'RW', 'ST', 'ST']), ovr, age, nat, pot, club: null, wageRep: 30 });
  p.pros = { until: absDay(W) + 56, fee: Math.round((20000 + (pot - 60) * 9000 + ovr * 1500) / 1000) * 1000 };
  p.home = true;
  p.wage = 800;
  invalidateNatIndex(W);
  return p;
}

export function signProspect(W, pid) {
  const p = W.players[pid];
  const c = W.clubs[W.user.club];
  if (!p?.pros) return { status: 'error', msg: 'Предложение больше не действует.' };
  if (c.balance < p.pros.fee) return { status: 'error', msg: `Не хватает денег (${money(p.pros.fee)}).` };
  c.balance -= p.pros.fee;
  c.fin.buys += p.pros.fee;
  delete p.pros;
  p.home = false;
  p.aca = true;
  p.youth = true;
  p.club = c.id;
  p.contract = W.year + 3;
  c.academy.push(p.id);
  W.scouting.youth = W.scouting.youth.filter((x) => x !== pid);
  return { status: 'accepted', msg: `${p.n} подписал контракт с академией клуба.` };
}

// ---------- содержимое отчёта (как в FC 27: тактика, будущее, финансы, статус) ----------
export function potRange(W, p) {
  const u = W.user;
  if (u?.club && (p.club === u.club)) {
    const c = W.clubs[u.club];
    const err = c.staff.coach >= 4 ? 1 : 2;
    return { lo: clamp(p.pot - err, p.ovr, 99), hi: clamp(p.pot + err, p.ovr, 99), known: true };
  }
  const r = W.scouting?.reports?.[p.id];
  if (r) return { lo: Math.max(r.lo, p.ovr), hi: Math.max(r.hi, p.ovr), known: true, report: r };
  if (p.age >= 28) return { lo: p.ovr, hi: p.ovr, known: true };
  return { lo: null, hi: null, known: false };
}

export function reportView(W, p) {
  const u = W.user;
  const my = u?.club ? W.clubs[u.club] : null;
  const pr = potRange(W, p);
  const out = {};
  // тактика: как игрок впишется в нашу схему
  if (my) {
    const slots = FORMATIONS[my.tactic.form] || [];
    let best = null;
    slots.forEach(([pos], i) => {
      const v = slotRating(p, pos);
      if (!best || v > best.v) best = { pos, v, i };
    });
    const rivals = my.squad.map((id) => W.players[id]).filter((x) => x && x.id !== p.id);
    const atPos = rivals.map((x) => slotRating(x, best.pos)).sort((a, b) => b - a);
    const cnt = slots.filter((s) => s[0] === best.pos).length;
    const starter = atPos[cnt - 1] ?? 0;
    const diff = Math.round(best.v - starter);
    out.tactic = diff >= 3 ? `Сразу в основу на позицию ${POS_RU[best.pos]} (+${diff} к нынешнему игроку)` : diff >= -1 ? `Будет бороться за место в основе (${POS_RU[best.pos]})` : diff >= -6 ? 'Игрок ротации для нашей схемы' : 'Не усилит текущий состав';
    out.tacticGood = diff >= -1;
  }
  // будущее
  if (pr.known) {
    const mid = (pr.lo + pr.hi) / 2;
    out.future = mid >= 88 ? 'Будущая звезда мирового уровня' : mid >= 83 ? 'Игрок топ-уровня' : mid >= 77 ? 'Крепкий игрок основы для сильного клуба' : mid >= 70 ? 'Надёжный игрок среднего уровня' : 'Ограниченный потенциал';
    if (pr.report?.gp) out.profile = GROWTH[pr.report.gp];
  } else out.future = 'Нужен отчёт скаута';
  // финансы
  const val = playerValue(p);
  if (p.fa) out.finance = `Свободный агент — без трансферной суммы. Запросит около ${money(wageFor(p.ovr, p.age, my?.rep || 70))}/нед.`;
  else if (p.club && my) {
    const left = p.contract - W.year;
    out.finance = `Оценка ${money(val)}. ${left <= 0 ? 'Контракт истекает летом — можно сбить цену или забрать бесплатно.' : left === 1 ? 'Контракт истекает через год — клуб уступит дешевле.' : `Контракт ещё на ${left + 1} г.`}`;
  }
  // статус в клубе
  if (p.club) {
    const r = squadRanks(W, p.club)[p.id];
    const bits = [`В «${W.clubs[p.club].name}»: ${r ? RANKS[r].ru.toLowerCase() : '—'}`];
    if (p.listed) bits.push('выставлен на трансфер');
    if (p.mor < 45) bits.push('недоволен');
    if (p.loan) bits.push('в аренде');
    out.status = bits.join(', ');
  } else out.status = p.fa ? 'Без клуба' : p.pros ? `Юниор без контракта — можно подписать в академию до ${fmtShort(Math.floor(p.pros.until / 365), p.pros.until % 365)}` : 'Играет во внутреннем чемпионате';
  return out;
}
