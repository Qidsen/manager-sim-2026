// Генерация мира: клубы, игроки, сборные.
import { LEAGUES, BG_CLUBS } from '../data/leagues';
import { NATIONS, NATION_BY_CODE } from '../data/nations';
import { NAME_POOLS, NATION_POOL } from '../data/names';
import { REAL_SQUADS } from '../data/realSquads';
import { rand, randInt, gauss, pick, weighted, seed, getState, chance } from './rng';
import { ATTRS, POS_WEIGHTS, recalcOvr, wageFor, clamp, FORMATION_NAMES } from './util';

export const DOMESTIC = {
  ENG1: 0.35, ENG2: 0.6, ESP1: 0.6, ITA1: 0.45, GER1: 0.48, FRA1: 0.55, NED1: 0.55, POR1: 0.42, TUR1: 0.5, UKR1: 0.85,
  BEL1: 0.4, SCO1: 0.5, BRA1: 0.85, ARG1: 0.88, USA1: 0.5, KSA1: 0.6,
};
const REGION_OF_COUNTRY = { BRA: 'SA', ARG: 'SA', USA: 'NA', KSA: 'AS' };

const TEMPLATE = [
  ['GK', 0], ['GK', 1], ['GK', 2],
  ['CB', 0], ['CB', 0], ['CB', 1], ['CB', 2],
  ['LB', 0], ['LB', 1], ['RB', 0], ['RB', 1],
  ['DM', 0], ['DM', 1], ['CM', 0], ['CM', 0], ['CM', 1],
  ['AM', 0], ['AM', 2], ['LW', 0], ['LW', 1], ['RW', 0], ['RW', 1],
  ['ST', 0], ['ST', 1], ['ST', 2],
];

export const levelOfRep = (rep) => 25 + rep * 0.65;
export const nationTarget = (str) => 18 + str * 0.72;

const COLORS = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#fb8c00', '#00acc1', '#6d4c41', '#3949ab', '#d81b60', '#7cb342', '#546e7a', '#f4511e', '#c0ca33', '#5e35b1', '#00897b'];

export function randomName(nat) {
  const pool = NAME_POOLS[NATION_POOL[nat] || 'en'] || NAME_POOLS.en;
  return `${pick(pool.first)} ${pick(pool.last)}`;
}

export function makePlayer(W, { pos, ovr, age, nat, pot, club = null, name, wageRep = 70 }) {
  const id = W.nextPid++;
  const w = POS_WEIGHTS[pos];
  const a = {};
  for (const k of ATTRS) {
    const key = w[k] || 0;
    let v;
    if (k === 'gk') v = pos === 'GK' ? ovr + gauss(0, 2) : randInt(8, 22);
    else if (pos === 'GK') v = ovr * 0.55 + gauss(0, 6);
    else if (key >= 0.2) v = ovr + 2 + gauss(0, 4);
    else if (key > 0) v = ovr - 3 + gauss(0, 5);
    else v = ovr - 14 + gauss(0, 7);
    a[k] = Math.round(clamp(v, 10, 99) * 10) / 10;
  }
  const p = { id, n: name || randomName(nat), nat, age, pos, a, ovr: 0, pot: 0, club, wage: 0, contract: 0, fit: 100, mor: 70, inj: 0, st: newStats(), car: { app: 0, g: 0 }, caps: 0, ng: 0 };
  // подгоняем ключевые атрибуты под целевой рейтинг
  recalcOvr(p);
  for (let it = 0; it < 3; it++) {
    const diff = ovr - p.ovr;
    if (Math.abs(diff) < 0.5) break;
    for (const k in w) p.a[k] = Math.round(clamp(p.a[k] + diff, 10, 99) * 10) / 10;
    recalcOvr(p);
  }
  if (pot === undefined || pot === null) {
    if (age <= 23) pot = Math.round(clamp(p.ovr + Math.max(0, gauss((24 - age) * 2.2, 4)), p.ovr, 95));
    else pot = p.ovr;
  }
  p.pot = Math.max(pot, p.ovr);
  p.wage = wageFor(p.ovr, age, wageRep);
  p.contract = W.year + randInt(1, 5);
  W.players[id] = p;
  return p;
}

export function newStats() {
  return { app: 0, g: 0, as: 0, rs: 0, yc: 0, rc: 0, cs: 0 };
}

function natWeightFor(club, slotOvr, leagueDef) {
  // возвращает список [код, вес] для выбора национальности
  const list = [];
  const dom = leagueDef ? DOMESTIC[leagueDef.id] ?? 0.6 : 0.7;
  const fac = (code) => {
    const n = NATION_BY_CODE[code];
    if (!n) return 0;
    const t = nationTarget(n.str);
    return Math.exp(-Math.max(0, slotOvr - t) / 3.5);
  };
  const homeW = dom * 20 * fac(club.country);
  list.push([club.country, homeW]);
  let foreign = leagueDef?.foreign;
  if (!foreign) {
    // фоновый клуб: иностранцы из своей конфедерации
    const conf = NATION_BY_CODE[club.country]?.conf || 'UEFA';
    foreign = NATIONS.filter((n) => n.conf === conf && n.code !== club.country).map((n) => [n.code, 1]);
  }
  const fsum = foreign.reduce((s, f) => s + f[1], 0);
  for (const [code, wt] of foreign) {
    if (code === club.country) continue;
    list.push([code, ((1 - dom) * 20 * wt) / fsum * fac(code) * 1.0]);
  }
  // мировые звёзды для богатых клубов
  if (slotOvr > 80) {
    for (const n of NATIONS) if (n.str >= 84) list.push([n.code, 0.4 * fac(n.code)]);
  }
  return list;
}

function genClubSquad(W, club, leagueDef, squads) {
  const real = squads ? squads[club.name] : null;
  if (real && real.length) {
    for (const [name, pos, age, ovr, pot, nat] of real) {
      const p = makePlayer(W, { pos, ovr, age, nat: nat || club.country, pot, club: club.id, name, wageRep: club.rep });
      club.squad.push(p.id);
    }
    return;
  }
  const L = levelOfRep(club.rep);
  for (const [pos, role] of TEMPLATE) {
    let ovr;
    let age;
    if (role === 0) {
      ovr = L + 3 + gauss(0, 2.5);
      age = Math.round(clamp(gauss(26.5, 3.4), 19, 35));
    } else if (role === 1) {
      ovr = L - 4 + gauss(0, 2.5);
      age = Math.round(clamp(gauss(26, 4.5), 18, 36));
    } else {
      ovr = L - 11 + gauss(0, 3);
      age = Math.round(clamp(gauss(20, 2), 17, 24));
    }
    if (age >= 31) ovr -= (age - 30) * 0.6;
    ovr = Math.round(clamp(ovr, 30, 93));
    const natList = natWeightFor(club, ovr, leagueDef);
    const nat = weighted(natList, (x) => x[1])[0];
    const p = makePlayer(W, { pos, ovr, age, nat, club: club.id, wageRep: club.rep });
    club.squad.push(p.id);
  }
}

export function createWorld(seedValue = Date.now() % 1e9, year = 2026, squads = REAL_SQUADS) {
  seed(seedValue);
  const W = {
    v: 1, year, day: 0, nextPid: 1, rng: 0,
    clubs: {}, players: {}, nations: {}, leagues: {}, comps: {}, sched: {},
    inbox: [], history: {}, offers: [], user: null, news: [], jobOffers: [], seasonLog: [],
  };
  let ci = 0;
  for (const L of LEAGUES) {
    W.leagues[L.id] = { id: L.id, clubs: [] };
    for (const [name, short, rep, cap] of L.clubs) {
      const id = `c${ci++}`;
      const club = makeClub(id, name, short, rep, cap, L.country, L.id, REGION_OF_COUNTRY[L.country] || 'EU');
      W.clubs[id] = club;
      W.leagues[L.id].clubs.push(id);
    }
  }
  for (const [name, short, rep, country, region] of BG_CLUBS) {
    const id = `c${ci++}`;
    W.clubs[id] = makeClub(id, name, short, rep, Math.round(8 + rep / 4), country, null, region);
  }
  for (const id in W.clubs) {
    const c = W.clubs[id];
    const L = c.league ? LEAGUES.find((l) => l.id === c.league) : null;
    const demand = 0.4 + 0.6 * Math.min(1, (L ? L.tv : 0.1) / 0.8);
    c.stadium.price = Math.round((10 + c.rep * 0.5) * (0.5 + 0.5 * demand));
    genClubSquad(W, c, L, squads);
  }
  // стартовый рынок свободных агентов: в основном ветераны и игроки среднего уровня
  for (let i = 0; i < 140; i++) {
    const nat = weighted(NATIONS, (n) => n.str ** 2).code;
    const age = Math.round(clamp(gauss(30, 3.5), 21, 36));
    const ovr = Math.round(clamp(gauss(62, 5) - Math.max(0, age - 32) * 1.5, 45, age >= 30 ? 76 : 72));
    const pos = pick(['GK', 'CB', 'CB', 'LB', 'RB', 'DM', 'CM', 'CM', 'AM', 'LW', 'RW', 'ST', 'ST']);
    const p = makePlayer(W, { pos, ovr, age, nat, club: null, wageRep: 60 });
    p.fa = true;
    p.faDays = randInt(0, 60);
    p.wage = Math.round(p.wage * 0.9);
  }
  // сборные
  for (const n of NATIONS) {
    W.nations[n.code] = { code: n.code, rep: n.str, squad: [], tactic: defaultTactic('4-3-3'), elo: 1000 + n.str * 10 };
  }
  fillNations(W);
  W.rng = getState();
  return W;
}

export function fillNations(W) {
  const byNat = {};
  for (const id in W.players) {
    const p = W.players[id];
    (byNat[p.nat] ||= []).push(p);
  }
  for (const n of NATIONS) {
    const list = byNat[n.code] || [];
    const T = nationTarget(n.str);
    const gks = list.filter((p) => p.pos === 'GK').length;
    const good = list.filter((p) => p.ovr >= T - 6).length;
    const need = Math.max(0, 24 - good);
    const plan = [];
    for (let i = 0; i < Math.max(0, 3 - gks); i++) plan.push('GK');
    const field = ['CB', 'CB', 'LB', 'RB', 'DM', 'CM', 'CM', 'AM', 'LW', 'RW', 'ST', 'ST'];
    for (let i = plan.length; i < need; i++) plan.push(field[i % field.length]);
    for (const pos of plan) {
      const ovr = Math.round(clamp(T - 5 + gauss(0, 3), 30, 88));
      const age = Math.round(clamp(gauss(26, 4), 18, 35));
      const p = makePlayer(W, { pos, ovr, age, nat: n.code, club: null, wageRep: 50 });
      p.home = true; // играет в домашнем чемпионате (вне модели)
    }
  }
}

function makeClub(id, name, short, rep, cap, country, league, region) {
  const fName = pick(FORMATION_NAMES.slice(0, 4));
  return {
    id, name, short, rep, country, league, region,
    color: COLORS[Math.floor(rand() * COLORS.length)],
    squad: [], academy: [],
    stadium: { cap: cap * 1000, price: Math.round(12 + rep * 0.5), up: null },
    balance: Math.max(2e6, Math.round((rep - 45) ** 2 * 50000)),
    tactic: defaultTactic(fName),
    training: { int: 1, focus: 'bal' },
    fin: newFin(),
    youthLvl: Math.round(clamp(rep / 20, 1, 5)),
    staff: { coach: Math.round(clamp(rep / 20, 1, 5)), med: Math.round(clamp(rep / 22, 1, 5)), scout: Math.round(clamp(rep / 22, 1, 5)) },
  };
}

export function newFin() {
  return { tickets: 0, tv: 0, sponsor: 0, prize: 0, sales: 0, wages: 0, buys: 0, build: 0, staff: 0 };
}

export function defaultTactic(form = '4-3-3') {
  return { form, ment: 2, press: 1, tempo: 1, xi: null, bench: null, auto: true };
}

export function youthPlayer(W, club, age) {
  const L = levelOfRep(club.rep);
  const pos = pick(['GK', 'CB', 'CB', 'LB', 'RB', 'DM', 'CM', 'CM', 'AM', 'LW', 'RW', 'ST', 'ST']);
  const ovr = Math.round(clamp(L - 26 + (age - 15) * 4 + gauss(0, 4) + club.youthLvl * 1.5, 25, 70));
  const pot = Math.round(clamp(ovr + 12 + gauss(club.youthLvl * 3, 7), ovr + 3, 94));
  const nat = chance(0.8) ? club.country : (NATIONS.find((n) => n.conf === NATION_BY_CODE[club.country]?.conf && chance(0.1))?.code || club.country);
  const p = makePlayer(W, { pos, ovr, age, nat, pot, club: club.id, wageRep: 30 });
  p.wage = 800;
  p.youth = true;
  return p;
}
