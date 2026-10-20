// Единый интерфейс для клубов и сборных: id клуба 'c12', сборной 'n:UKR'
import { NATION_BY_CODE } from '../data/nations';

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
export function teamColor(W, id) {
  if (isNat(id)) return '#90a4ae';
  return W.clubs[id]?.color || '#888';
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
