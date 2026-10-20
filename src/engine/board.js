// Цели правления на сезон (как Board Objectives в FC 27): несколько категорий с разной важностью,
// прогресс в течение сезона, итоговая оценка и надёжность положения тренера.
import { clamp, money, seasonLabel } from './util';
import { sortRows } from './comps';
import { LEAGUE_BY_ID } from '../data/leagues';
import { levelOfRep } from './gen';

export const IMP = { 1: 'Низкая', 2: 'Средняя', 3: 'Высокая', 4: 'Критическая' };
export const IMP_COLOR = { 1: '#6B768C', 2: '#4C8DFF', 3: '#FF9F43', 4: '#FF5A6A' };
export const CAT = {
  league: { ru: 'Чемпионат', icon: 'podium' },
  cup: { ru: 'Кубок страны', icon: 'trophy' },
  cont: { ru: 'Еврокубки', icon: 'globe' },
  finance: { ru: 'Финансы', icon: 'wallet' },
  youth: { ru: 'Молодёжь', icon: 'school' },
  brand: { ru: 'Бренд клуба', icon: 'megaphone' },
};

const inStage = (st, cid) => st.rounds.some((r) => r.some((m) => m.h === cid || m.a === cid));

// Как далеко клуб прошёл в кубке
export function cupProgress(W, comp, cid) {
  let reached = -1;
  comp.stages.forEach((st, i) => { if (inStage(st, cid)) reached = i; });
  const won = !!(comp.done && comp.winner === cid);
  let out = false;
  if (comp.done && !won) out = true;
  else if (reached >= 0) {
    const st = comp.stages[reached];
    if (st.t === 'ko') {
      const tie = st.ties.find((t) => t.a === cid || t.b === cid);
      if (tie?.w && tie.w !== cid) out = true;
    } else if (comp.stages.length - 1 > reached) {
      if (st.swiss) {
        const rank = sortRows(st.groups[0].rows, W).findIndex((r) => r.id === cid);
        if (rank >= 8 || comp.stages.length - 1 >= 2) out = true;
      } else out = true;
    }
  }
  return { reached: won ? comp.plan.length : reached, out, won, alive: reached >= 0 && !out && !won };
}
const stageName = (comp, i) => (i >= comp.plan.length ? 'победа' : comp.plan[i]?.name || comp.stages[0]?.name || 'групповой этап');

function contComp(W, cid) {
  return Object.values(W.comps).find((c) => c.scope === 'club' && c.kind === 'cup' && !c.id.startsWith('CUP:') && c.teams?.includes(cid));
}

// ---------- постановка целей ----------
export function makeObjectives(W) {
  const u = W.user;
  if (!u?.club) return [];
  const c = W.clubs[u.club];
  const rep = c.rep;
  const objs = [];
  if (c.league) {
    const order = W.leagues[c.league].clubs.slice().sort((a, b) => W.clubs[b].rep - W.clubs[a].rep);
    const idx = order.indexOf(c.id);
    const target = idx === 0 ? 1 : Math.min(idx + 2, order.length);
    u.target = target;
    const L = LEAGUE_BY_ID[c.league];
    const text = target === 1 ? `Выиграть «${L.name}»` : target >= order.length - 3 ? `Сохранить место в «${L.name}» (не ниже ${target}-го)` : `Финишировать не ниже ${target}-го места`;
    objs.push({ cat: 'league', imp: rep >= 78 || target === 1 ? 4 : 3, target, text });
  }
  const cup = W.comps[`CUP:${c.country}`];
  if (cup?.teams?.includes(c.id)) {
    const X = rep >= 85 ? 2 : rep >= 75 ? 3 : rep >= 65 ? 4 : 5;
    const t = clamp(cup.plan.length - X, 1, cup.plan.length - 1);
    objs.push({ cat: 'cup', imp: rep >= 82 ? 2 : 1, comp: cup.id, target: t, text: `«${cup.name}»: дойти до стадии «${stageName(cup, t)}»` });
  }
  const cont = contComp(W, c.id);
  if (cont) {
    const ue = cont.id === 'UCL' || cont.id === 'UEL' || cont.id === 'UECL';
    let t;
    if (cont.id === 'UCL') t = rep >= 88 ? 3 : rep >= 82 ? 2 : 1;
    else if (ue) t = rep >= 80 ? 3 : 2;
    else t = rep >= 80 ? 2 : 1;
    t = clamp(t, 1, cont.plan.length - 1);
    objs.push({ cat: 'cont', imp: cont.id === 'UCL' && rep >= 85 ? 3 : 2, comp: cont.id, target: t, text: `«${cont.name}»: дойти до стадии «${stageName(cont, t)}»` });
  }
  const budget = Math.max(1.5e6, Math.round((c.balance * 0.45) / 1e5) * 1e5);
  objs.push({ cat: 'finance', imp: c.balance < 5e6 ? 3 : 2, target: budget, text: `Чистые траты на трансферы — не больше ${money(budget)}` });
  const yApps = rep >= 85 ? 10 : rep >= 72 ? 20 : 30;
  objs.push({ cat: 'youth', imp: rep >= 85 ? 1 : 2, target: yApps, text: `Игроки до 21 года — ${yApps}+ матчей за сезон` });
  if (rep >= 80) {
    const lvl = Math.round(levelOfRep(rep) + 3);
    objs.push({ cat: 'brand', imp: 1, target: lvl, text: `Звёздный трансфер: подписать игрока с рейтингом ${lvl}+` });
  } else {
    const att = Math.round(clamp(0.55 + rep / 400, 0.6, 0.85) * 100);
    objs.push({ cat: 'brand', imp: 1, target: att, text: `Средняя заполняемость стадиона — ${att}%+` });
  }
  u.objs = objs.map((o) => ({ ...o, y: W.year }));
  u.signed = [];
  c.attSum = 0;
  c.attN = 0;
  return u.objs;
}

// ---------- текущее состояние цели ----------
// state: done | ok | risk | fail | wait
export function evalObjective(W, o, final = false) {
  const u = W.user;
  const c = W.clubs[u.club];
  if (!c) return { state: 'wait', prog: '—' };
  switch (o.cat) {
    case 'league': {
      const comp = W.comps[`L:${c.league}`];
      if (!comp) return { state: 'wait', prog: '—' };
      const rows = sortRows(comp.stages[0].groups[0].rows, W);
      const pos = rows.findIndex((r) => r.id === c.id) + 1;
      const played = rows.find((r) => r.id === c.id)?.p || 0;
      if (final || comp.done) return { state: pos <= o.target ? 'done' : 'fail', prog: `${pos}-е место` };
      if (played < 3) return { state: 'wait', prog: played ? `${pos}-е место` : 'сезон не начался' };
      return { state: pos <= o.target ? 'ok' : pos <= o.target + 3 ? 'risk' : 'fail', prog: `сейчас ${pos}-е место` };
    }
    case 'cup':
    case 'cont': {
      const comp = W.comps[o.comp];
      if (!comp) return { state: final ? 'fail' : 'wait', prog: '—' };
      const pr = cupProgress(W, comp, c.id);
      const where = pr.won ? 'трофей!' : pr.reached >= 0 ? stageName(comp, pr.reached) : 'ещё не стартовал';
      if (pr.reached >= o.target) return { state: 'done', prog: where };
      if (pr.out || final) return { state: 'fail', prog: `вылет: ${where}` };
      return { state: pr.reached < 0 ? 'wait' : 'ok', prog: where };
    }
    case 'finance': {
      const net = c.fin.buys - c.fin.sales;
      const st = net <= o.target ? (net <= o.target * 0.8 ? 'ok' : 'risk') : 'fail';
      return { state: final ? (net <= o.target ? 'done' : 'fail') : st, prog: `потрачено ${money(Math.max(0, net))}` };
    }
    case 'youth': {
      const apps = c.squad.map((id) => W.players[id]).filter((p) => p && p.age <= 21).reduce((s, p) => s + p.st.app, 0);
      if (apps >= o.target) return { state: 'done', prog: `${apps} матчей` };
      if (final) return { state: 'fail', prog: `${apps} из ${o.target}` };
      const exp = o.target * Math.min(1, W.day / 300);
      return { state: apps >= exp * 0.8 ? 'ok' : W.day < 120 ? 'wait' : 'risk', prog: `${apps} из ${o.target}` };
    }
    case 'brand': {
      if (o.text.startsWith('Звёздный')) {
        const hit = (u.signed || []).some((s) => s.ovr >= o.target);
        return { state: hit ? 'done' : final ? 'fail' : W.day > 215 ? 'risk' : 'wait', prog: hit ? 'подписан' : 'пока нет' };
      }
      const pct = c.attN ? Math.round((c.attSum / c.attN) * 100) : null;
      if (pct === null) return { state: final ? 'fail' : 'wait', prog: 'нет домашних матчей' };
      const ok = pct >= o.target;
      return { state: final ? (ok ? 'done' : 'fail') : ok ? 'ok' : pct >= o.target - 6 ? 'risk' : 'fail', prog: `${pct}%` };
    }
    default:
      return { state: 'wait', prog: '—' };
  }
}

export function jobSecurity(conf) {
  if (conf >= 75) return { ru: 'Очень надёжно', color: '#2BD67B' };
  if (conf >= 55) return { ru: 'Надёжно', color: '#4C8DFF' };
  if (conf >= 35) return { ru: 'Под вопросом', color: '#FF9F43' };
  return { ru: 'Под угрозой увольнения', color: '#FF5A6A' };
}

// Раз в месяц: правление следит за прогрессом
export function boardMonthly(W, mail) {
  const u = W.user;
  if (!u?.club || !u.objs?.length) return;
  let d = 0;
  for (const o of u.objs) {
    const e = evalObjective(W, o);
    if (e.state === 'fail') d -= 0.7 * o.imp;
    else if (e.state === 'risk') d -= 0.3 * o.imp;
    else if (e.state === 'ok' || e.state === 'done') d += 0.25 * o.imp;
    if (e.state === 'fail' && (o.cat === 'cup' || o.cat === 'cont') && !o.told) {
      o.told = true;
      u.conf = clamp(u.conf - 3 * o.imp, 0, 100);
      mail(W, 'Правление недовольно', `Цель «${o.text}» не выполнена (${e.prog}). Это скажется на оценке сезона.`);
    }
    if (e.state === 'done' && !o.told) {
      o.told = true;
      u.conf = clamp(u.conf + 2 * o.imp, 0, 100);
      mail(W, 'Цель выполнена', `Правление отмечает: «${o.text}» — выполнено (${e.prog}).`);
    }
  }
  u.conf = clamp(u.conf + d, 0, 100);
}

// Итоги сезона по целям
export function boardSeasonEnd(W) {
  const u = W.user;
  if (!u?.club || !u.objs?.length) return null;
  const lines = [];
  let d = 0;
  let w = 0;
  let got = 0;
  for (const o of u.objs) {
    const e = evalObjective(W, o, true);
    const ok = e.state === 'done';
    w += o.imp;
    if (ok) got += o.imp;
    d += ok ? (o.told ? 1 : 4) * o.imp : -(o.told ? 3 : 6) * o.imp;
    lines.push(`${ok ? '✅' : '❌'} ${o.text} — ${e.prog} (${IMP[o.imp].toLowerCase()})`);
  }
  u.conf = clamp(u.conf + d, 0, 100);
  u.rep = clamp(u.rep + (got / Math.max(1, w) - 0.5) * 6, 1, 99);
  const grade = got / Math.max(1, w);
  return { lines, grade, text: `Оценка правления за сезон ${seasonLabel(W.year)}: ${grade >= 0.85 ? 'отлично' : grade >= 0.6 ? 'хорошо' : grade >= 0.4 ? 'удовлетворительно' : 'плохо'}.` };
}
