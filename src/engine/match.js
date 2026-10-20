// Движок матча: поминутная симуляция с текстовой трансляцией.
import { rand, chance, weighted, pick, randInt, poisson } from './rng';
import { FORMATIONS, LINE, slotRating, clamp } from './util';

// ---------- выбор состава ----------
export function available(p) {
  return p && p.inj <= 0 && !(p.ban > 0);
}

function condFactor(fit) {
  return fit >= 85 ? 1 : fit >= 70 ? 0.97 : fit >= 55 ? 0.9 : 0.8;
}

export function autoLineup(W, pool, form, opts = {}) {
  const slots = FORMATIONS[form] || FORMATIONS['4-3-3'];
  const cand = pool.map((id) => W.players[id]).filter((p) => available(p));
  const used = new Set();
  const xi = new Array(11).fill(null);
  // сначала вратарь, потом остальные по «дефицитности»
  const order = slots.map((s, i) => i).sort((a, b) => (slots[a][0] === 'GK' ? -1 : slots[b][0] === 'GK' ? 1 : 0));
  for (const i of order) {
    const pos = slots[i][0];
    let best = null;
    let bv = -1;
    for (const p of cand) {
      if (used.has(p.id)) continue;
      const v = slotRating(p, pos) * (opts.ignoreFit ? 1 : condFactor(p.fit));
      if (v > bv) { bv = v; best = p; }
    }
    if (best) { xi[i] = best.id; used.add(best.id); }
  }
  const rest = cand.filter((p) => !used.has(p.id)).sort((a, b) => b.ovr * condFactor(b.fit) - a.ovr * condFactor(a.fit));
  const bench = [];
  const gk = rest.find((p) => p.pos === 'GK');
  if (gk) bench.push(gk.id);
  for (const p of rest) {
    if (bench.length >= 9) break;
    if (!bench.includes(p.id)) bench.push(p.id);
  }
  return { xi, bench };
}

// Состав с учётом ручных настроек пользователя
export function resolveLineup(W, pool, tactic) {
  if (tactic.auto || !tactic.xi) return autoLineup(W, pool, tactic.form);
  const slots = FORMATIONS[tactic.form];
  const inPool = new Set(pool);
  const xi = tactic.xi.map((id) => (id && inPool.has(id) && available(W.players[id]) ? id : null));
  const used = new Set(xi.filter(Boolean));
  const cand = pool.map((id) => W.players[id]).filter((p) => available(p) && !used.has(p.id));
  for (let i = 0; i < 11; i++) {
    if (xi[i]) continue;
    let best = null;
    let bv = -1;
    for (const p of cand) {
      if (used.has(p.id)) continue;
      const v = slotRating(p, slots[i][0]) * condFactor(p.fit);
      if (v > bv) { bv = v; best = p; }
    }
    if (best) { xi[i] = best.id; used.add(best.id); }
  }
  let bench = (tactic.bench || []).filter((id) => inPool.has(id) && !used.has(id) && available(W.players[id]));
  const rest = cand.filter((p) => !used.has(p.id) && !bench.includes(p.id)).sort((a, b) => b.ovr - a.ovr);
  for (const p of rest) {
    if (bench.length >= 9) break;
    bench.push(p.id);
  }
  bench = bench.slice(0, 9);
  return { xi, bench };
}

// ---------- сила команды ----------
function strengths(W, side) {
  const slots = FORMATIONS[side.tac.form];
  const sum = { G: 0, D: 0, M: 0, A: 0 };
  const cnt = { G: 0, D: 0, M: 0, A: 0 };
  for (let i = 0; i < 11; i++) {
    const id = side.xi[i];
    const pos = slots[i][0];
    const ln = LINE[pos];
    cnt[ln]++;
    if (!id) continue; // удалён — дыра
    const p = W.players[id];
    const f = side.fit[id] ?? p.fit;
    sum[ln] += slotRating(p, pos) * condFactor(f) * (0.95 + (side.mor ?? 70) / 1400);
  }
  const avg = (k) => (cnt[k] ? sum[k] / cnt[k] : 40);
  // недобор игроков (удаления) уже снизил суммы
  const red = side.xi.filter((x) => !x).length;
  const g = avg('G');
  const d = avg('D');
  const m = avg('M');
  const a = avg('A');
  const ment = side.tac.ment - 2;
  const press = side.tac.press - 1;
  const A = 0.5 * a + 0.32 * m + 0.18 * d + (cnt.A - 3) * 1.2 + ment * 2.2 - red * 3;
  const D = 0.5 * d + 0.25 * m + 0.25 * g + (cnt.D - 4) * 1.4 - ment * 2.2 - red * 3 + press * 0.6;
  const M = m + (cnt.M - 3) * 1.6 + press * 1.5 - red * 4;
  return { A, D, M, G: g };
}

// ---------- комментарии ----------
const T = {
  goal: [
    '{p} хладнокровно реализует момент — ГОЛ!', 'ГОЛ! {p} бьёт в дальний угол, вратарь бессилен.', '{p} замыкает прострел — мяч в сетке!',
    'Удар {p} со средней дистанции — и это ГОЛ!', 'ГОЛ! {p} выигрывает борьбу и пробивает в упор.', '{p} обыгрывает защитника и забивает!',
    'Головой! {p} после подачи — ГОЛ!', '{p} добивает мяч после отскока — счёт меняется!',
  ],
  assist: ['Передача от {a}.', 'Голевой пас — {a}.', 'Ассистировал {a}.'],
  save: ['{p} пробил в створ, но {g} на месте.', '{g} тащит удар {p}!', 'Опасно! {p} бьёт, {g} отбивает на угловой.', '{g} забирает мяч после удара {p}.'],
  miss: ['{p} пробил мимо ворот.', 'Удар {p} над перекладиной.', '{p} не попал в створ из хорошей позиции.', 'Штанга! {p} был в сантиметрах от гола.'],
  yellow: ['Жёлтая карточка: {p} за грубый фол.', '{p} получает предупреждение.', 'Судья показывает жёлтую {p}.'],
  red: ['Красная карточка! {p} удалён с поля.', '{p} получает вторую жёлтую и уходит с поля.'],
  injury: ['{p} получил травму и не может продолжать.', 'Неприятный момент — {p} хромает, похоже, травма.'],
  sub: ['Замена: {in} вместо {out}.'],
  chance: ['{t} владеет мячом в середине поля.', '{t} пытается навязать свою игру.', 'Затяжная атака {t}.', '{t} проводит позиционную атаку.'],
};
const fill = (tpl, o) => tpl.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const shortName = (p) => {
  const parts = p.n.split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : p.n;
};

// ---------- матч ----------
export function createMatch(W, home, away, opts = {}) {
  // home/away: { ref, name, short, pool, tac, mor }
  const mk = (t) => {
    const lu = resolveLineup(W, t.pool, t.tac);
    const fit = {};
    for (const id of [...lu.xi, ...lu.bench]) if (id) fit[id] = W.players[id].fit;
    return {
      ref: t.ref, name: t.name, short: t.short, isUser: !!t.isUser, autoSubs: t.isUser ? !!t.autoSubs : true,
      tac: { ...t.tac }, xi: lu.xi, bench: lu.bench, fit, subsLeft: 5, subWindows: 3, played: new Set(lu.xi.filter(Boolean)),
      mor: t.mor ?? 70, yc: {}, off: new Set(),
    };
  };
  const S = {
    h: mk(home), a: mk(away), min: 0, score: [0, 0], ev: [], goals: [], poss: [1, 1], shots: [0, 0], sot: [0, 0], corners: [0, 0],
    rating: {}, neutral: !!opts.neutral, ko: opts.ko || null, phase: 'play', pens: null, verbose: !!opts.verbose, done: false, cache: null, cacheMin: -9,
  };
  for (const side of [S.h, S.a]) for (const id of side.xi) if (id) S.rating[id] = 6.2;
  if (S.verbose) S.ev.push({ min: 0, side: -1, text: 'Стартовый свисток! Матч начался.' });
  return S;
}

function sideOf(S, i) {
  return i === 0 ? S.h : S.a;
}

function onPitch(side) {
  return side.xi.filter(Boolean);
}

function addRating(S, id, v) {
  if (S.rating[id] === undefined) S.rating[id] = 6.2;
  S.rating[id] = clamp(S.rating[id] + v, 3, 10);
}

function log(S, side, text, extra = {}) {
  if (S.verbose) S.ev.push({ min: S.min, mt: S.plus ? `${S.min}+${S.plus}` : `${S.min}`, side, text, ...extra });
}

export function doSub(W, S, sideIdx, outId, inId, silent = false) {
  const side = sideOf(S, sideIdx);
  const i = side.xi.indexOf(outId);
  if (i < 0 || !side.bench.includes(inId) || side.subsLeft <= 0) return false;
  side.xi[i] = inId;
  side.bench = side.bench.filter((x) => x !== inId);
  side.subsLeft--;
  side.played.add(inId);
  if (S.rating[inId] === undefined) S.rating[inId] = 6.2;
  S.cache = null;
  if (!silent) log(S, sideIdx, fill(T.sub[0], { in: W.players[inId].n, out: W.players[outId].n }), { type: 'sub' });
  return true;
}

function bestSubFor(W, side, slotPos) {
  let best = null;
  let bv = -1;
  for (const id of side.bench) {
    const p = W.players[id];
    if (!p) continue;
    const v = slotRating(p, slotPos) * condFactor(side.fit[id] ?? p.fit);
    if (v > bv) { bv = v; best = id; }
  }
  return best;
}

function aiSubs(W, S, sideIdx, force = false) {
  const side = sideOf(S, sideIdx);
  if (side.subsLeft <= 0) return;
  const slots = FORMATIONS[side.tac.form];
  // травмированные — в первую очередь
  for (let i = 0; i < 11; i++) {
    const id = side.xi[i];
    if (!id) continue;
    if (side.injured?.has(id)) {
      const sub = bestSubFor(W, side, slots[i][0]);
      if (sub) doSub(W, S, sideIdx, id, sub);
    }
  }
  if (force) return;
  // плановые замены: уставшие и игроки с низкой оценкой; к 82-й минуте используем почти все замены
  const late = S.min >= 80;
  const limit = S.min < 65 ? 1 : 2;
  const cands = side.xi
    .map((id, i) => ({ id, i }))
    .filter((x) => x.id && slots[x.i][0] !== 'GK' && !side.injured?.has(x.id))
    .map((x) => ({ ...x, fit: side.fit[x.id] ?? W.players[x.id].fit, r: S.rating[x.id] ?? 6.2 }))
    .filter((x) => x.fit < 80 || x.r < 6.0 || late || (side.yc[x.id] && S.min >= 60))
    .sort((a, b) => a.fit + a.r * 4 - (b.fit + b.r * 4));
  let n = 0;
  for (const t of cands) {
    if (n >= limit || side.subsLeft <= 1) break;
    const sub = bestSubFor(W, side, slots[t.i][0]);
    if (sub && W.players[sub].ovr >= W.players[t.id].ovr - 10) {
      doSub(W, S, sideIdx, t.id, sub);
      n++;
    }
  }
}

function pickShooter(W, side) {
  const slots = FORMATIONS[side.tac.form];
  const items = [];
  for (let i = 0; i < 11; i++) {
    const id = side.xi[i];
    if (!id) continue;
    const pos = slots[i][0];
    const w = { GK: 0, CB: 0.55, LB: 0.55, RB: 0.55, DM: 0.7, CM: 1.4, AM: 2.3, LW: 2.3, RW: 2.3, ST: 3.3 }[pos];
    items.push([id, w * (W.players[id].a.sho / 65)]);
  }
  return items.length ? weighted(items, (x) => x[1])[0] : null;
}
function pickAssister(W, side, shooter) {
  const slots = FORMATIONS[side.tac.form];
  const items = [];
  for (let i = 0; i < 11; i++) {
    const id = side.xi[i];
    if (!id || id === shooter) continue;
    const pos = slots[i][0];
    const w = { GK: 0.05, CB: 0.3, LB: 1, RB: 1, DM: 0.8, CM: 1.6, AM: 2.4, LW: 2.2, RW: 2.2, ST: 1.4 }[pos];
    items.push([id, w * (W.players[id].a.pas / 60) ** 2]);
  }
  return items.length ? weighted(items, (x) => x[1])[0] : null;
}
function gkOf(W, side) {
  const slots = FORMATIONS[side.tac.form];
  for (let i = 0; i < 11; i++) if (slots[i][0] === 'GK' && side.xi[i]) return side.xi[i];
  return side.xi.find(Boolean);
}
function pickFouler(W, side) {
  const items = onPitch(side).map((id) => [id, LINE[W.players[id].pos] === 'G' ? 0.1 : LINE[W.players[id].pos] === 'D' ? 1.6 : 1]);
  return items.length ? weighted(items, (x) => x[1])[0] : null;
}

function removePlayer(S, side, id) {
  const i = side.xi.indexOf(id);
  if (i >= 0) side.xi[i] = null;
  side.off.add(id);
  S.cache = null;
}

// Часы матча: минуты + добавленное время (45+2', 90+4')
export function clockLabel(S) {
  return S.plus ? `${S.min}+${S.plus}` : `${S.min}`;
}

const BUILD = [
  '{p} проходит по флангу и навешивает — защита выносит.', 'Длинная передача {p} — мяч уходит за лицевую.', '{p} пытается обыграть двоих, но теряет мяч.',
  '{t} терпеливо разыгрывает мяч у чужой штрафной.', '{p} в подкате срывает атаку соперника.', 'Быстрый отрыв {t}, но {p} не успевает за передачей.',
  '{p} отдаёт пас между линиями — опасно, но защитник успевает.', 'Прессинг {t}: {p} отбирает мяч на чужой половине.',
];

function pickLine(W, side, lines) {
  const slots = FORMATIONS[side.tac.form];
  const ids = side.xi.filter((id, i) => id && lines.includes(LINE[slots[i][0]]));
  return ids.length ? pick(ids) : side.xi.find(Boolean);
}

function setBall(S, att, x, y, kind, pid) {
  // x: 0 — ворота хозяев, 1 — ворота гостей
  S.ball = { x: clamp(x, 0, 1), y: clamp(y, 0, 1), kind, side: att, pid, how: S.curHow || null, t: (S.ballT = (S.ballT || 0) + 1) };
}
const toward = (att, v) => (att === 0 ? v : 1 - v);

// Общая модель вероятностей: используется и в трансляции, и в быстром расчёте
export function edge(A, D) {
  return Math.exp(clamp((A.A - D.D) / 44, -0.65, 0.65));
}
export function rates(ratio, tempo) {
  return { pen: 0.0034 * ratio, corner: 0.088 * Math.sqrt(ratio), fk: 0.011 * ratio, open: 0.172 * ratio * tempo };
}
export function onTarget(sho, gkv) {
  return clamp(0.38 + (sho - gkv) / 320, 0.26, 0.55);
}
export function convert(sho, gkv, ratio) {
  return clamp(0.44 * Math.exp((sho - gkv) / 75), 0.15, 0.65);
}
export function penConvert(sho, gkv) {
  return clamp(0.68 + (sho - gkv) / 250, 0.6, 0.86);
}

function shotOutcome(W, S, att, shooter, quality, how) {
  S.curHow = how;
  try {
    shotOutcomeInner(W, S, att, shooter, quality, how);
  } finally {
    S.curHow = null;
  }
}

function shotOutcomeInner(W, S, att, shooter, quality, how) {
  // quality: множитель вероятности гола (пенальти > удар с игры > удар головой > штрафной)
  const side = sideOf(S, att);
  const opp = sideOf(S, 1 - att);
  const sp = W.players[shooter];
  const A = S.cache ? S.cache[att] : strengths(W, side);
  S.shots[att]++;
  const gkId = gkOf(W, opp);
  const gk = gkId ? W.players[gkId] : null;
  const gkv = gk ? (gk.pos === 'GK' ? gk.a.gk : 25) : 10;
  const Dd = S.cache ? S.cache[1 - att] : strengths(W, opp);
  const ratio = edge(A, Dd);
  const onT = how === 'pen' ? 0.9 : onTarget(sp.a.sho, gkv);
  const gy = 0.5 + (rand() - 0.5) * 0.22;
  if (rand() < onT) {
    S.sot[att]++;
    const base = how === 'pen' ? penConvert(sp.a.sho, gkv) / 0.9 : convert(sp.a.sho, gkv, ratio) * quality;
    if (rand() < base) {
      // гол, но иногда его отменяют после VAR
      if (how !== 'pen' && rand() < 0.035) {
        setBall(S, att, toward(att, 0.995), gy, 'var', shooter);
        log(S, att, `${sp.n} забивает… но VAR фиксирует офсайд. Гол отменён!`, { type: 'var' });
        return;
      }
      const as = how === 'pen' || how === 'fk' ? null : chance(how === 'corner' ? 0.9 : 0.72) ? pickAssister(W, side, shooter) : null;
      scoreGoal(W, S, att, shooter, as, how);
      setBall(S, att, toward(att, 1.0), gy, 'goal', shooter);
      return;
    }
    if (gkId) addRating(S, gkId, how === 'pen' ? 0.8 : 0.18);
    // рикошет в свои ворота
    if (how === 'open' && rand() < 0.012) {
      const d = pickLine(W, opp, ['D']);
      if (d) {
        S.score[att]++;
        S.goals.push([S.min, att, d, null, 'og']);
        addRating(S, d, -0.8);
        log(S, att, `Автогол! После удара ${shortName(sp)} мяч рикошетит от ${W.players[d].n} в ворота.`, { type: 'goal', og: true, score: [...S.score] });
        setBall(S, att, toward(att, 1.0), gy, 'goal', d);
        S.cache = null;
        return;
      }
    }
    setBall(S, att, toward(att, 0.975), gy, 'save', gkId);
    if (how === 'pen') log(S, att, `${gk ? gk.n : 'Вратарь'} отражает пенальти от ${sp.n}!`, { type: 'save' });
    else log(S, att, fill(pick(T.save), { p: shortName(sp), g: gk ? shortName(gk) : 'вратарь' }), { type: 'save' });
    if (chance(0.35)) S.corners[att]++;
  } else {
    addRating(S, shooter, -0.05);
    const post = rand() < 0.08;
    setBall(S, att, toward(att, 0.99), post ? 0.42 : rand() < 0.5 ? 0.3 : 0.7, post ? 'post' : 'miss', shooter);
    if (how === 'pen') log(S, att, `${sp.n} не забивает пенальти — мимо ворот!`, { type: 'miss' });
    else if (post) log(S, att, `Штанга! ${shortName(sp)} был в сантиметрах от гола.`, { type: 'miss' });
    else if (chance(0.55)) log(S, att, fill(pick(T.miss.slice(0, 3)), { p: shortName(sp) }), { type: 'miss' });
  }
}

function scoreGoal(W, S, att, shooter, as, how) {
  const side = sideOf(S, att);
  const opp = sideOf(S, 1 - att);
  const sp = W.players[shooter];
  S.score[att]++;
  S.goals.push([S.min, att, shooter, as, how]);
  addRating(S, shooter, 1.0);
  if (as) addRating(S, as, 0.6);
  const gkId = gkOf(W, opp);
  if (gkId) addRating(S, gkId, -0.35);
  for (const id of onPitch(opp)) if (LINE[W.players[id].pos] === 'D') addRating(S, id, -0.15);
  if (S.verbose) {
    let txt;
    if (how === 'pen') txt = `ГОЛ! ${sp.n} уверенно реализует пенальти.`;
    else if (how === 'fk') txt = `ГОЛ! ${sp.n} кладёт штрафной точно в девятку!`;
    else if (how === 'corner') txt = `ГОЛ! ${sp.n} головой замыкает подачу с углового.`;
    else txt = fill(pick(T.goal), { p: sp.n });
    if (as) txt += ' ' + fill(pick(T.assist), { a: W.players[as].n });
    log(S, att, txt, { type: 'goal', score: [...S.score] });
  }
  S.cache = null;
}

export function stepMinute(W, S) {
  if (S.done || S.phase === 'pens') return;
  // ----- часы -----
  if (S.hk === undefined) {
    S.hk = 0;
    S.plus = 0;
    S.stops = [randInt(1, 4), randInt(2, 6)];
  }
  const boundary = S.phase === 'et' ? (S.hk === 0 ? 105 : 120) : S.hk === 0 ? 45 : 90;
  if (S.min < boundary) S.min++;
  else if (S.plus < S.stops[S.hk]) S.plus++;
  else {
    // конец тайма
    S.plus = 0;
    if (S.hk === 0) {
      S.hk = 1;
      S.htPause = true;
      setBall(S, 0, 0.5, 0.5, 'ht');
      log(S, -1, S.phase === 'et' ? `Перерыв в дополнительное время. ${S.h.short} ${S.score[0]}:${S.score[1]} ${S.a.short}.` : `Перерыв. ${S.h.short} ${S.score[0]}:${S.score[1]} ${S.a.short}. Команды уходят в раздевалку.`, { type: 'ht' });
      return;
    }
    endOfPeriod(W, S);
    return;
  }
  if (S.min === 1 && !S.plus) setBall(S, 0, 0.5, 0.5, 'kick');

  if (!S.cache || S.min - S.cacheMin >= 5) {
    S.cache = [strengths(W, S.h), strengths(W, S.a)];
    S.cacheMin = S.min;
    if (!S.neutral) {
      S.cache[0].A += 1.8; S.cache[0].M += 1.8; S.cache[0].D += 1.2;
    }
  }
  const [sh, sa] = S.cache;
  const ph = 1 / (1 + Math.exp(-(sh.M - sa.M) / 30));
  const att = rand() < ph ? 0 : 1;
  S.poss[att]++;
  const A = S.cache[att];
  const Dd = S.cache[1 - att];
  const side = sideOf(S, att);
  const opp = sideOf(S, 1 - att);
  const tempo = 1 + (side.tac.tempo - 1) * 0.08 + (opp.tac.tempo - 1) * 0.04;
  const ratio = edge(A, Dd);
  const R = rates(ratio, tempo);
  const pChance = R.open;
  S.fouls ||= [0, 0];
  S.offs ||= [0, 0];
  const r = rand();
  if (r < R.pen) {
    // пенальти
    const fouler = pickLine(W, opp, ['D', 'M']);
    S.fouls[1 - att]++;
    const taker = onPitch(side).map((id) => W.players[id]).filter((p) => p.pos !== 'GK').sort((a, b) => b.a.sho - a.a.sho)[0];
    log(S, att, `Фол в штрафной! ${fouler ? W.players[fouler].n : 'Защитник'} сбивает соперника — судья ставит пенальти.`, { type: 'pen' });
    setBall(S, att, toward(att, 0.89), 0.5, 'pen', taker?.id);
    if (fouler && rand() < 0.2) {
      const fp = W.players[fouler];
      if (opp.yc[fouler]) { log(S, 1 - att, fill(T.red[1], { p: fp.n }), { type: 'red' }); fp.ban = (fp.ban || 0) + 1; addRating(S, fouler, -1.2); removePlayer(S, opp, fouler); }
      else { opp.yc[fouler] = 1; addRating(S, fouler, -0.3); log(S, 1 - att, `${fp.n} получает жёлтую за фол.`, { type: 'yellow' }); }
    }
    if (taker) shotOutcome(W, S, att, taker.id, 1, 'pen');
  } else if (r < R.pen + R.corner) {
    // угловой
    S.corners[att]++;
    setBall(S, att, toward(att, 0.995), rand() < 0.5 ? 0.01 : 0.99, 'corner');
    if (rand() < 0.13) {
      const header = weighted(onPitch(side).map((id) => W.players[id]).filter((p) => p.pos !== 'GK'), (p) => (p.a.phy / 50) ** 3 + (['CB', 'ST'].includes(p.pos) ? 1.5 : 0));
      if (header) {
        if (S.verbose && chance(0.5)) log(S, att, `Угловой. Подача в штрафную — ${shortName(header)} выпрыгивает выше всех…`, { type: 'corner' });
        shotOutcome(W, S, att, header.id, 0.55, 'corner');
      }
    } else if (S.verbose && chance(0.12)) log(S, att, `Угловой у ворот соперника. Защита справляется.`, { type: 'corner' });
  } else if (r < R.pen + R.corner + R.fk) {
    // опасный штрафной
    S.fouls[1 - att]++;
    const taker = onPitch(side).map((id) => W.players[id]).filter((p) => p.pos !== 'GK').sort((a, b) => b.a.tec + b.a.sho - (a.a.tec + a.a.sho))[0];
    setBall(S, att, toward(att, 0.78), 0.4 + rand() * 0.2, 'fk', taker?.id);
    if (taker) {
      if (S.verbose) log(S, att, `Штрафной в опасной зоне. К мячу подходит ${shortName(taker)}.`, { type: 'fk' });
      shotOutcome(W, S, att, taker.id, 0.35, 'fk');
    }
  } else if (rand() < pChance) {
    const shooter = pickShooter(W, side);
    if (shooter) shotOutcome(W, S, att, shooter, 1, 'open');
  } else {
    // обычная игра: мяч в середине/на подступах
    const depth = 0.38 + rand() * 0.34 + (A.A - Dd.D) / 200;
    setBall(S, att, toward(att, depth), 0.12 + rand() * 0.76, 'play', null);
    if (rand() < 0.022) {
      S.offs[att]++;
      if (S.verbose && chance(0.5)) {
        const st = pickLine(W, side, ['A']);
        log(S, att, `${st ? shortName(W.players[st]) : 'Нападающий'} в офсайде.`, { type: 'info' });
      }
    } else if (S.verbose && rand() < 0.07) {
      const pl = pickLine(W, rand() < 0.75 ? side : opp, ['M', 'A', 'D']);
      log(S, att, fill(pick(BUILD), { t: side.name, p: pl ? shortName(W.players[pl]) : '' }), { type: 'info' });
    }
  }

  // фолы, карточки, травмы, усталость
  for (let si = 0; si < 2; si++) {
    const sd = sideOf(S, si);
    if (rand() < 0.11 + (sd.tac.press - 1) * 0.02) S.fouls[si]++;
    if (rand() < 0.0175 + (sd.tac.press - 1) * 0.003) {
      const f = pickFouler(W, sd);
      if (f) {
        const p = W.players[f];
        if (rand() < 0.035) {
          log(S, si, fill(T.red[0], { p: p.n }), { type: 'red' });
          addRating(S, f, -1.5);
          p.ban = (p.ban || 0) + 2;
          removePlayer(S, sd, f);
        } else if (sd.yc[f]) {
          log(S, si, fill(T.red[1], { p: p.n }), { type: 'red' });
          addRating(S, f, -1.2);
          p.ban = (p.ban || 0) + 1;
          removePlayer(S, sd, f);
        } else {
          sd.yc[f] = 1;
          addRating(S, f, -0.3);
          log(S, si, fill(pick(T.yellow), { p: p.n }), { type: 'yellow' });
        }
      }
    }
    if (rand() < 0.0011) {
      const ids = onPitch(sd);
      const v = ids.length ? pick(ids) : null;
      if (v) {
        const p = W.players[v];
        sd.injured = sd.injured || new Set();
        sd.injured.add(v);
        p.injNew = randInt(3, 10) + (chance(0.3) ? randInt(10, 50) : 0);
        log(S, si, fill(pick(T.injury), { p: p.n }), { type: 'inj', pid: v });
        if (sd.autoSubs || !sd.isUser) aiSubs(W, S, si, true);
      }
    }
    if (S.min % 5 === 0 && !S.plus) {
      const drain = 5 * (0.33 + (sd.tac.press - 1) * 0.06 + (sd.tac.tempo - 1) * 0.03);
      for (const id of sd.xi) {
        if (!id) continue;
        const p = W.players[id];
        sd.fit[id] = Math.max(15, (sd.fit[id] ?? p.fit) - drain * (1.25 - p.a.phy / 250) - (p.age > 31 ? 0.25 : 0));
      }
    }
  }

  // ИИ: замены и смена тактики
  if (!S.plus && (S.min === 60 || S.min === 68 || S.min === 76 || S.min === 83)) {
    for (let si = 0; si < 2; si++) {
      const sd = sideOf(S, si);
      if (!sd.isUser || sd.autoSubs) aiSubs(W, S, si);
      if (!sd.isUser) {
        const diff = S.score[si] - S.score[1 - si];
        if (S.min >= 66 && diff < 0 && sd.tac.ment < 4) { sd.tac.ment++; S.cache = null; }
        if (S.min >= 74 && diff > 0 && sd.tac.ment > 1) { sd.tac.ment--; S.cache = null; }
      }
    }
  }
}

function endOfPeriod(W, S) {
  const needWin = S.ko && S.ko.needWinner;
  const agg = S.ko && S.ko.prev ? [S.score[0] + S.ko.prev[0], S.score[1] + S.ko.prev[1]] : S.score;
  if (needWin && agg[0] === agg[1]) {
    if (S.phase === 'play') {
      S.phase = 'et';
      S.hk = 0;
      S.min = 90;
      S.stops = [randInt(0, 2), randInt(1, 3)];
      S.htPause = true;
      log(S, -1, 'Ничья в основное время — назначено дополнительное время.', { type: 'ht' });
      return;
    }
    penalties(W, S);
    return;
  }
  finishLive(S);
}

function penalties(W, S) {
  S.phase = 'pens';
  const takers = [S.h, S.a].map((sd) => onPitch(sd).map((id) => W.players[id]).sort((a, b) => b.a.sho - a.a.sho));
  const pens = [0, 0];
  const lines = [];
  for (let r = 0; r < 30; r++) {
    for (let si = 0; si < 2; si++) {
      const list = takers[si];
      const p = list[r % Math.max(1, list.length)];
      const ok = rand() < (p ? clamp(0.62 + p.a.sho / 600, 0.6, 0.85) : 0.7);
      if (ok) pens[si]++;
      lines.push(`${p ? shortName(p) : '—'} (${si === 0 ? S.h.short : S.a.short}) — ${ok ? 'забил' : 'не забил'}`);
    }
    if (r >= 4 && pens[0] !== pens[1]) break;
    if (r < 4) {
      const left = 4 - r;
      if (pens[0] > pens[1] + left || pens[1] > pens[0] + left) break;
    }
  }
  S.pens = pens;
  log(S, -1, `Серия пенальти: ${lines.join('; ')}. Итог — ${pens[0]}:${pens[1]}.`, { type: 'pens' });
  finishLive(S);
}

function finishLive(S) {
  S.done = true;
  S.phase = 'done';
  let txt = `Финальный свисток. ${S.h.name} ${S.score[0]}:${S.score[1]} ${S.a.name}`;
  if (S.pens) txt += ` (пен. ${S.pens[0]}:${S.pens[1]})`;
  log(S, -1, txt, { type: 'ft' });
}

export function simulateFull(W, S) {
  let guard = 0;
  while (!S.done && guard++ < 300) stepMinute(W, S);
  if (S.phase === 'pens' && !S.done) finishLive(S);
}

export function winnerSide(S) {
  const agg = S.ko && S.ko.prev ? [S.score[0] + S.ko.prev[0], S.score[1] + S.ko.prev[1]] : S.score;
  if (agg[0] > agg[1]) return 0;
  if (agg[1] > agg[0]) return 1;
  if (S.pens) return S.pens[0] > S.pens[1] ? 0 : 1;
  return -1;
}

// Перенос результатов на игроков
export function applyResults(W, S, { competitive = true, national = false } = {}) {
  const res = S.score[0] > S.score[1] ? 0 : S.score[0] < S.score[1] ? 1 : -1;
  for (let si = 0; si < 2; si++) {
    const sd = sideOf(S, si);
    const won = res === si;
    const lost = res === 1 - si;
    const conceded = S.score[1 - si];
    for (const id of sd.played) {
      const p = W.players[id];
      if (!p) continue;
      let r = S.rating[id] ?? 6.2;
      r += won ? 0.45 : lost ? -0.35 : 0;
      if (conceded === 0 && ['G', 'D'].includes(LINE[p.pos])) {
        r += 0.5;
        if (competitive) p.st.cs++;
      }
      r = clamp(r + (rand() - 0.5) * 0.6, 3, 10);
      S.rating[id] = r;
      p.fit = Math.round(sd.fit[id] ?? p.fit);
      if (national) {
        p.caps++;
      } else if (competitive) {
        p.st.app++;
        p.st.rs = Math.round((p.st.rs + r) * 10) / 10;
        p.car.app++;
      }
      p.mor = Math.round(clamp(p.mor + (won ? 3 : lost ? -3 : 0) + (r >= 7.5 ? 2 : r < 5.8 ? -2 : 0), 10, 100));
      if (p.injNew) {
        p.inj = p.injNew;
        delete p.injNew;
      }
    }
    // те, кто не играл, теряют немного морали
    if (sd.yc && competitive && !national) for (const id in sd.yc) W.players[id].st.yc++;
  }
  for (const [, side, scorer, as, how] of S.goals) {
    if (how === 'og') continue;
    const p = W.players[scorer];
    if (national) p.ng++;
    else if (competitive) {
      p.st.g++;
      p.car.g++;
      if (as) W.players[as].st.as++;
    }
  }
}

// ---------- быстрый расчёт матча (для матчей без участия игрока) ----------
// Та же модель сил, что и в поминутной симуляции, но результат считается сразу.

function expectedGoals(W, att, def, attSide, defSide, minutes) {
  const ph = 1 / (1 + Math.exp(-(att.M - def.M) / 30));
  const tempo = 1 + (attSide.tac.tempo - 1) * 0.08 + (defSide.tac.tempo - 1) * 0.04;
  const ratio = edge(att, def);
  const R = rates(ratio, tempo);
  const slots = FORMATIONS[attSide.tac.form];
  let ws = 0;
  let sho = 0;
  let best = 50;
  let air = 50;
  for (let i = 0; i < 11; i++) {
    const id = attSide.xi[i];
    if (!id) continue;
    const p = W.players[id];
    const w = { GK: 0, CB: 0.55, LB: 0.55, RB: 0.55, DM: 0.7, CM: 1.4, AM: 2.3, LW: 2.3, RW: 2.3, ST: 3.3 }[slots[i][0]];
    ws += w;
    sho += w * p.a.sho;
    if (p.pos !== 'GK') { best = Math.max(best, p.a.sho); air = Math.max(air, (p.a.sho + p.a.phy) / 2); }
  }
  sho = ws ? sho / ws : 50;
  const gkId = gkOf(W, defSide);
  const gk = gkId ? W.players[gkId] : null;
  const gkv = gk ? (gk.pos === 'GK' ? gk.a.gk : 25) : 10;
  // доля «прочих» исходов в одной минуте: сначала стандарты, затем атака с игры
  const pSet = R.pen + R.corner + R.fk;
  const perMin =
    R.pen * penConvert(best, gkv) +
    R.corner * 0.13 * onTarget(air, gkv) * convert(air, gkv, ratio) * 0.55 +
    R.fk * onTarget(best, gkv) * convert(best, gkv, ratio) * 0.35 +
    (1 - pSet) * R.open * onTarget(sho, gkv) * convert(sho, gkv, ratio) * 1.012;
  return { lambda: minutes * ph * perMin, shots: minutes * ph * ((1 - pSet) * R.open + R.corner * 0.13 + R.fk + R.pen), ph };
}

export function quickMatch(W, S) {
  // S создан через createMatch без трансляции
  const st = [strengths(W, S.h), strengths(W, S.a)];
  if (!S.neutral) {
    st[0].A += 1.8; st[0].M += 1.8; st[0].D += 1.2;
  }
  const sides = [S.h, S.a];
  const e0 = expectedGoals(W, st[0], st[1], S.h, S.a, 94);
  const e1 = expectedGoals(W, st[1], st[0], S.a, S.h, 94);
  const goalsFor = (si, n, from, to) => {
    const side = sides[si];
    const opp = sides[1 - si];
    for (let k = 0; k < n; k++) {
      const min = randInt(from, to);
      const shooter = pickShooter(W, side);
      if (!shooter) continue;
      const as = chance(0.72) ? pickAssister(W, side, shooter) : null;
      S.score[si]++;
      S.goals.push([min, si, shooter, as]);
      addRating(S, shooter, 1.0);
      if (as) addRating(S, as, 0.6);
      const gkId = gkOf(W, opp);
      if (gkId) addRating(S, gkId, -0.35);
    }
  };
  goalsFor(0, poisson(e0.lambda), 1, 90);
  goalsFor(1, poisson(e1.lambda), 1, 90);
  S.shots = [Math.round(e0.shots), Math.round(e1.shots)];
  S.poss = [Math.round(e0.ph * 100), 100 - Math.round(e0.ph * 100)];
  // карточки, травмы, замены и усталость
  for (let si = 0; si < 2; si++) {
    const sd = sides[si];
    const ny = poisson(1.6);
    for (let k = 0; k < ny; k++) {
      const f = pickFouler(W, sd);
      if (!f) continue;
      if (sd.yc[f]) {
        W.players[f].ban = (W.players[f].ban || 0) + 1;
        addRating(S, f, -1.2);
      } else {
        sd.yc[f] = 1;
        addRating(S, f, -0.3);
      }
    }
    if (chance(0.03)) {
      const f = pickFouler(W, sd);
      if (f) { W.players[f].ban = (W.players[f].ban || 0) + 2; addRating(S, f, -1.5); }
    }
    if (chance(0.1)) {
      const ids = onPitch(sd);
      const v = ids.length ? pick(ids) : null;
      if (v) W.players[v].injNew = randInt(3, 10) + (chance(0.3) ? randInt(10, 50) : 0);
    }
    const drain = 30 * (1 + (sd.tac.press - 1) * 0.18 + (sd.tac.tempo - 1) * 0.09);
    for (const id of onPitch(sd)) {
      const p = W.players[id];
      sd.fit[id] = Math.max(15, (sd.fit[id] ?? p.fit) - drain * (1.25 - p.a.phy / 250));
    }
    // три плановые замены
    const slots = FORMATIONS[sd.tac.form];
    const outs = sd.xi
      .map((id, i) => ({ id, i }))
      .filter((x) => x.id && slots[x.i][0] !== 'GK')
      .sort((a, b) => (sd.fit[a.id] ?? 100) - (sd.fit[b.id] ?? 100))
      .slice(0, 3);
    for (const o of outs) {
      const sub = bestSubFor(W, sd, slots[o.i][0]);
      if (!sub || W.players[sub].ovr < W.players[o.id].ovr - 10) continue;
      sd.xi[o.i] = sub;
      sd.bench = sd.bench.filter((x) => x !== sub);
      sd.played.add(sub);
      sd.fit[sub] = Math.max(15, (sd.fit[sub] ?? W.players[sub].fit) - 8);
      if (S.rating[sub] === undefined) S.rating[sub] = 6.2;
    }
  }
  S.min = 90;
  // плей-офф: дополнительное время и пенальти
  if (S.ko && S.ko.needWinner) {
    const agg = S.ko.prev ? [S.score[0] + S.ko.prev[0], S.score[1] + S.ko.prev[1]] : S.score;
    if (agg[0] === agg[1]) {
      goalsFor(0, poisson(e0.lambda / 3), 91, 120);
      goalsFor(1, poisson(e1.lambda / 3), 91, 120);
      S.min = 120;
      const agg2 = S.ko.prev ? [S.score[0] + S.ko.prev[0], S.score[1] + S.ko.prev[1]] : S.score;
      if (agg2[0] === agg2[1]) {
        let a = 0;
        let b = 0;
        for (let r = 0; r < 5; r++) { if (chance(0.76)) a++; if (chance(0.76)) b++; }
        while (a === b) { if (chance(0.76)) a++; if (chance(0.76)) b++; }
        S.pens = [a, b];
      }
    }
  }
  S.done = true;
  S.phase = 'done';
}
