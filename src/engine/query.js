// Выборки для интерфейса
import { isNat, natCode, teamName } from './teams';
import { sortRows } from './comps';
import { LEAGUE_BY_ID, LEAGUES } from '../data/leagues';

export function teamMatches(W, teamId) {
  // все матчи команды в текущем сезоне, по дате
  const out = [];
  for (const cid in W.comps) {
    const comp = W.comps[cid];
    comp.stages.forEach((st, si) => {
      st.rounds.forEach((r, ri) => {
        for (const m of r) {
          if (m.h === teamId || m.a === teamId) out.push({ m, comp, stage: st, si, ri, day: m.day });
        }
      });
    });
  }
  return out.sort((a, b) => a.day - b.day);
}

export function nextMatches(W, teamId, n = 5) {
  return teamMatches(W, teamId).filter((x) => x.m.hg === null && x.day >= W.day).slice(0, n);
}
export function lastResults(W, teamId, n = 5) {
  const all = teamMatches(W, teamId).filter((x) => x.m.hg !== null);
  return all.slice(Math.max(0, all.length - n)).reverse();
}

export function resultLetter(m, teamId) {
  const my = m.h === teamId ? m.hg : m.ag;
  const th = m.h === teamId ? m.ag : m.hg;
  if (my > th) return 'W';
  if (my < th) return 'L';
  if (m.pen) {
    const myP = m.h === teamId ? m.pen[0] : m.pen[1];
    const thP = m.h === teamId ? m.pen[1] : m.pen[0];
    return myP > thP ? 'W' : 'L';
  }
  return 'D';
}

export function userTeamIds(W) {
  const out = [];
  if (W.user?.club) out.push(W.user.club);
  if (W.user?.nation) out.push(`n:${W.user.nation}`);
  return out;
}

export function nextUserFixture(W) {
  let best = null;
  for (const t of userTeamIds(W)) {
    const n = nextMatches(W, t, 1)[0];
    if (n && (!best || n.day < best.day)) best = { ...n, team: t };
  }
  return best;
}

export function compsOfTeam(W, teamId) {
  return Object.values(W.comps).filter((c) => (c.teams || []).includes(teamId) || c.stages.some((s) => s.rounds.some((r) => r.some((m) => m.h === teamId || m.a === teamId))));
}

export function topScorers(W, comp, n = 20) {
  const g = {};
  const a = {};
  for (const st of comp.stages) for (const r of st.rounds) for (const m of r) {
    if (!m.gl) continue;
    for (const [, , pid, as, how] of m.gl) {
      if (how === 'og') continue;
      g[pid] = (g[pid] || 0) + 1;
      if (as) a[as] = (a[as] || 0) + 1;
    }
  }
  return Object.keys(g)
    .map((pid) => ({ p: W.players[pid], pid, g: g[pid], a: a[pid] || 0 }))
    .filter((x) => x.p)
    .sort((x, y) => y.g - x.g || y.a - x.a)
    .slice(0, n);
}

export function leagueTable(W, lid) {
  const comp = W.comps[`L:${lid}`];
  if (!comp) return [];
  return sortRows(comp.stages[0].groups[0].rows, W);
}

export function clubLeaguePos(W, cid) {
  const c = W.clubs[cid];
  if (!c?.league) return null;
  const t = leagueTable(W, c.league);
  const i = t.findIndex((r) => r.id === cid);
  return i >= 0 ? { pos: i + 1, row: t[i], total: t.length, table: t } : null;
}

export function compGroups(comp) {
  // список категорий для экрана турниров
  if (comp.kind === 'league' && comp.scope === 'club') return 'Чемпионаты';
  if (comp.scope === 'club' && comp.id.startsWith('CUP')) return 'Национальные кубки';
  if (comp.scope === 'club') return 'Международные клубные';
  if (comp.kind === 'friendly') return 'Товарищеские';
  if (comp.unl || comp.unlPO || comp.id === 'UNL' || comp.id === 'UNLF') return 'Лига наций УЕФА';
  return 'Сборные';
}

export function scoreText(m) {
  if (m.hg === null) return '–:–';
  let s = `${m.hg}:${m.ag}`;
  if (m.pen) s += ` (п. ${m.pen[0]}:${m.pen[1]})`;
  return s;
}

export function playerAvgRating(p) {
  return p.st.app ? p.st.rs / p.st.app : null;
}

export function squadOf(W, teamId) {
  if (isNat(teamId)) return (W.nations[natCode(teamId)].squad || []).map((id) => W.players[id]).filter(Boolean);
  return W.clubs[teamId].squad.map((id) => W.players[id]).filter(Boolean);
}

export const LEAGUE_ORDER = LEAGUES.map((l) => l.id);
export { LEAGUE_BY_ID };
