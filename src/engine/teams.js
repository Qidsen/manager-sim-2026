// Единый интерфейс для клубов и сборных: id клуба 'c12', сборной 'n:UKR'
import { NATION_BY_CODE } from '../data/nations';
import { KITS, NAT_KITS } from '../data/kits';

export const isNat = (id) => typeof id === 'string' && id.startsWith('n:');
export const natCode = (id) => id.slice(2);

export function teamName(W, id) {
  if (!id) return '—';
  if (isNat(id)) return NATION_BY_CODE[natCode(id)]?.name || id;
  return W.clubs[id]?.name || id;
}
export function teamShort(W, id) {
  if (!id) return '—';
  if (isNat(id)) return natCode(id);
  return W.clubs[id]?.short || id;
}
export function teamFlag(W, id) {
  if (isNat(id)) return NATION_BY_CODE[natCode(id)]?.flag || '';
  const c = W.clubs[id];
  return c ? NATION_BY_CODE[c.country]?.flag || '' : '';
}
export function teamRep(W, id) {
  if (isNat(id)) return W.nations[natCode(id)]?.rep || 50;
  return W.clubs[id]?.rep || 50;
}
// Настоящие формы: { home:[футболка, отделка], away:[футболка, отделка] }
export function teamKit(W, id) {
  let k = null;
  if (isNat(id)) k = NAT_KITS[natCode(id)];
  else {
    const c = W.clubs[id];
    if (c) k = KITS[`${c.name}|${c.country}`] || KITS[c.name];
    if (!k && c) { const col = c.color || '#888888'; k = [col, '#FFFFFF', '#F2F2F2', col]; }
  }
  if (!k) k = ['#90A4AE', '#FFFFFF', '#1A1A1A', '#FFFFFF'];
  return { home: [k[0], k[1]], away: [k[2], k[3]] };
}
const rgb = (h) => { const x = parseInt(h.slice(1), 16); return [(x >> 16) & 255, (x >> 8) & 255, x & 255]; };
export const cdist = (a, b) => { const p = rgb(a), q = rgb(b); return Math.sqrt((p[0] - q[0]) ** 2 * 0.3 + (p[1] - q[1]) ** 2 * 0.59 + (p[2] - q[2]) ** 2 * 0.11); };
export const isLight = (h) => { const [r, g, b] = rgb(h); return r * 0.299 + g * 0.587 + b * 0.114 > 150; };
// Формы на матч: гости переодеваются в выездную, если цвета похожи
export function matchKits(W, hId, aId) {
  const H = teamKit(W, hId), A = teamKit(W, aId);
  let a = A.home;
  if (cdist(H.home[0], a[0]) < 70) a = A.away;
  if (cdist(H.home[0], a[0]) < 70) a = isLight(H.home[0]) ? ['#1A1A1A', '#FFFFFF'] : ['#FFFFFF', '#1A1A1A'];
  return { h: H.home, a };
}
export function teamColor(W, id) {
  return teamKit(W, id).home[0];
}
export function teamPool(W, id) {
  if (isNat(id)) {
    const n = W.nations[natCode(id)];
    if (!n.squad || n.squad.length < 14) callUp(W, natCode(id));
    return n.squad;
  }
  return W.clubs[id].squad;
}
export function teamTactic(W, id) {
  if (isNat(id)) return W.nations[natCode(id)].tactic;
  return W.clubs[id].tactic;
}
export function teamCountry(W, id) {
  if (isNat(id)) return natCode(id);
  return W.clubs[id]?.country;
}
export function isUserTeam(W, id) {
  if (!W.user) return false;
  return id === W.user.club || (W.user.nation && id === `n:${W.user.nation}`);
}

let natIndexCache = null;
let natIndexStamp = -1;
export function natIndex(W) {
  if (natIndexCache && natIndexStamp === W.nextPid + (W._natStamp || 0)) return natIndexCache;
  const idx = {};
  for (const id in W.players) {
    const p = W.players[id];
    (idx[p.nat] ||= []).push(p.id);
  }
  natIndexCache = idx;
  natIndexStamp = W.nextPid + (W._natStamp || 0);
  return idx;
}
export function invalidateNatIndex(W) {
  W._natStamp = (W._natStamp || 0) + 1;
}

// Автоматический вызов в сборную: 3 вратаря + лучшие по линиям
export function callUp(W, code, size = 26) {
  const ids = natIndex(W)[code] || [];
  const ps = ids.map((i) => W.players[i]).filter((p) => p && p.inj <= 7);
  const by = (f) => ps.filter(f).sort((a, b) => b.ovr - a.ovr);
  const gk = by((p) => p.pos === 'GK').slice(0, 3);
  const df = by((p) => ['CB', 'LB', 'RB'].includes(p.pos)).slice(0, 9);
  const md = by((p) => ['DM', 'CM', 'AM'].includes(p.pos)).slice(0, 8);
  const at = by((p) => ['LW', 'RW', 'ST'].includes(p.pos)).slice(0, 7);
  let squad = [...gk, ...df, ...md, ...at];
  if (squad.length > size) squad = squad.sort((a, b) => b.ovr - a.ovr).slice(0, size);
  W.nations[code].squad = squad.map((p) => p.id);
  return W.nations[code].squad;
}
