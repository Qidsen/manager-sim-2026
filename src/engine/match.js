// Движок матча: поминутная симуляция с текстовой трансляцией.
import { rand, chance, weighted, pick, randInt } from './rng';
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
  if (S.verbose) S.ev.push({ min: S.min, side, text, ...extra });
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
  const tired = side.xi
    .map((id, i) => ({ id, i }))
    .filter((x) => x.id && slots[x.i][0] !== 'GK' && (side.fit[x.id] ?? 100) < 72)
    .sort((a, b) => side.fit[a.id] - side.fit[b.id]);
  let n = 0;
  for (const t of tired) {
    if (n >= 2 || side.subsLeft <= 0) break;
    const sub = bestSubFor(W, side, slots[t.i][0]);
    if (sub && W.players[sub].ovr >= W.players[t.id].ovr - 8) {
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
  return weighted(items, (x) => x[1])[0];
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

export function stepMinute(W, S) {
  if (S.done) return;
  if (S.phase === 'pens') return;
  S.min++;
  const maxMin = S.phase === 'et' ? 120 : 90;
  if (S.min === 46 && S.phase === 'play') log(S, -1, `Перерыв. ${S.h.short} ${S.score[0]}:${S.score[1]} ${S.a.short}. Начинается второй тайм.`, { type: 'ht' });

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
  const pChance = 0.19 * Math.exp((A.A - Dd.D) / 35) * tempo;
  if (rand() < pChance) {
    const shooter = pickShooter(W, side);
    if (shooter) {
      const sp = W.players[shooter];
      S.shots[att]++;
      const onT = rand() < clamp(0.36 + (sp.a.sho - 65) / 160, 0.2, 0.6);
      const gkId = gkOf(W, opp);
      const gk = gkId ? W.players[gkId] : null;
      const gkv = gk ? (gk.pos === 'GK' ? gk.a.gk : 25) : 10;
      if (onT) {
        S.sot[att]++;
        const pGoal = clamp(0.33 * Math.exp((sp.a.sho * 0.55 + A.A * 0.45 - gkv) / 22), 0.08, 0.7);
        if (rand() < pGoal) {
          S.score[att]++;
          const as = chance(0.72) ? pickAssister(W, side, shooter) : null;
          S.goals.push([S.min, att, shooter, as]);
          addRating(S, shooter, 1.0);
          if (as) addRating(S, as, 0.6);
          if (gkId) addRating(S, gkId, -0.35);
          for (const id of onPitch(opp)) if (LINE[W.players[id].pos] === 'D') addRating(S, id, -0.15);
          if (S.verbose) {
            let txt = fill(pick(T.goal), { p: sp.n });
            if (as) txt += ' ' + fill(pick(T.assist), { a: W.players[as].n });
            log(S, att, txt, { type: 'goal', score: [...S.score] });
          }
          S.cache = null;
        } else {
          if (gkId) addRating(S, gkId, 0.18);
          if (S.verbose) log(S, att, fill(pick(T.save), { p: shortName(sp), g: gk ? shortName(gk) : 'вратарь' }), { type: 'save' });
          if (chance(0.35)) S.corners[att]++;
        }
      } else {
        addRating(S, shooter, -0.05);
        if (S.verbose && chance(0.5)) log(S, att, fill(pick(T.miss), { p: shortName(sp) }), { type: 'miss' });
        if (chance(0.2)) S.corners[att]++;
      }
    }
  } else if (S.verbose && chance(0.035)) {
    log(S, att, fill(pick(T.chance), { t: side.name }), { type: 'info' });
  }

  // карточки
  for (let si = 0; si < 2; si++) {
    const sd = sideOf(S, si);
    if (rand() < 0.0175 + (sd.tac.press - 1) * 0.003) {
      const f = pickFouler(W, sd);
      if (f) {
        const p = W.players[f];
        if (rand() < 0.035) {
          if (S.verbose) log(S, si, fill(T.red[0], { p: p.n }), { type: 'red' });
          addRating(S, f, -1.5);
          p.ban = (p.ban || 0) + 2;
          removePlayer(S, sd, f);
        } else if (sd.yc[f]) {
          if (S.verbose) log(S, si, fill(T.red[1], { p: p.n }), { type: 'red' });
          addRating(S, f, -1.2);
          p.ban = (p.ban || 0) + 1;
          removePlayer(S, sd, f);
        } else {
          sd.yc[f] = 1;
          addRating(S, f, -0.3);
          if (S.verbose) log(S, si, fill(pick(T.yellow), { p: p.n }), { type: 'yellow' });
        }
      }
    }
    // травмы
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
    // усталость (пересчёт раз в 5 минут)
    if (S.min % 5 === 0) {
      const drain = 5 * (0.19 + (sd.tac.press - 1) * 0.05 + (sd.tac.tempo - 1) * 0.02);
      for (const id of sd.xi) {
        if (!id) continue;
        const p = W.players[id];
        sd.fit[id] = Math.max(15, (sd.fit[id] ?? p.fit) - drain * (1.25 - p.a.phy / 250) - (p.age > 31 ? 0.2 : 0));
      }
    }
  }

  // ИИ: замены и смена тактики
  if (S.min === 58 || S.min === 66 || S.min === 74 || S.min === 82) {
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

  if (S.min >= maxMin) {
    const needWin = S.ko && S.ko.needWinner;
    const agg = S.ko && S.ko.prev ? [S.score[0] + S.ko.prev[0], S.score[1] + S.ko.prev[1]] : S.score;
    if (needWin && agg[0] === agg[1]) {
      if (S.phase === 'play') {
        S.phase = 'et';
        log(S, -1, 'Ничья в основное время — назначено дополнительное время.', { type: 'ht' });
        return;
      }
      penalties(W, S);
      return;
    }
    finishLive(S);
  }
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
  while (!S.done && guard++ < 200) stepMinute(W, S);
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
        p.st.rs += r;
        p.car.app++;
      }
      p.mor = clamp(p.mor + (won ? 3 : lost ? -3 : 0) + (r >= 7.5 ? 2 : r < 5.8 ? -2 : 0), 10, 100);
      if (p.injNew) {
        p.inj = p.injNew;
        delete p.injNew;
      }
    }
    // те, кто не играл, теряют немного морали
    if (sd.yc && competitive && !national) for (const id in sd.yc) W.players[id].st.yc++;
  }
  for (const [, side, scorer, as] of S.goals) {
    const p = W.players[scorer];
    if (national) p.ng++;
    else if (competitive) {
      p.st.g++;
      p.car.g++;
      if (as) W.players[as].st.as++;
    }
  }
}
