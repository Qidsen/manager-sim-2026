// Розыгрыш одной минуты для визуализации: цепочка пасов, ведений, отборов и ударов.
// Координаты: x — 0 у ворот хозяев, 1 у ворот гостей; y — 0..1 поперёк поля.
import { FORMATIONS } from './util';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const R = Math.random; // только для визуала, не влияет на результат матча

// Позиции команды при данном положении мяча
export function teamShape(side, isHome, bx, by, hasBall) {
  const slots = FORMATIONS[side.tac.form];
  const shift = (bx - 0.5) * 0.5;
  const push = hasBall ? 0.06 : -0.03;
  return slots.map(([pos, lx, ly]) => {
    const gk = pos === 'GK';
    let x = 0.05 + ly * 0.62;
    if (!isHome) x = 1 - x;
    x += (gk ? 0.12 : 1) * shift + (gk ? 0 : isHome ? push : -push);
    let y = isHome ? lx : 1 - lx;
    y += (by - 0.5) * (gk ? 0.1 : 0.25);
    return { x: clamp(x, 0.03, 0.97), y: clamp(y, 0.05, 0.95) };
  });
}

function shapeOf(S, si, bx, by, hasSide) {
  const side = si === 0 ? S.h : S.a;
  return teamShape(side, si === 0, bx, by, hasSide === si);
}

function nearestSlot(S, si, x, y, shape, exclude = -1) {
  const side = si === 0 ? S.h : S.a;
  let best = -1;
  let bd = 9;
  for (let i = 0; i < 11; i++) {
    if (!side.xi[i] || i === exclude) continue;
    const d = (shape[i].x - x) ** 2 + (shape[i].y - y) ** 2 * 0.6;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

function slotOfPlayer(S, si, pid) {
  const side = si === 0 ? S.h : S.a;
  return side.xi.indexOf(pid);
}

const fwd = (si, v) => (si === 0 ? v : 1 - v); // перевод «глубины атаки» в координату x

// prev: { x, y, side, slot } — где мяч был в конце прошлой минуты
export function buildSequence(W, S, prev) {
  const b = S.ball || { x: 0.5, y: 0.5, kind: 'play', side: 0 };
  const att = b.side ?? 0;
  const opp = 1 - att;
  const steps = [];
  let cur = prev && prev.side !== undefined ? { ...prev } : { x: 0.5, y: 0.5, side: att, slot: -1 };

  const push = (x, y, si, slot, kind) => {
    steps.push({ x: clamp(x, 0.01, 0.99), y: clamp(y, 0.02, 0.98), side: si, slot, kind });
    cur = { x, y, side: si, slot };
  };

  if (b.kind === 'kick' || b.kind === 'ht') {
    const sh = shapeOf(S, att, 0.5, 0.5, att);
    const s1 = nearestSlot(S, att, 0.5, 0.5, sh);
    push(0.5, 0.5, att, s1, 'kick');
    return steps;
  }

  // 1) смена владения: отбор/перехват у соперника
  if (cur.side !== att || cur.slot < 0) {
    const sh = shapeOf(S, att, cur.x, cur.y, att);
    const s = nearestSlot(S, att, cur.x, cur.y, sh);
    if (s >= 0) push(cur.x + (R() - 0.5) * 0.04, cur.y + (R() - 0.5) * 0.06, att, s, cur.slot < 0 ? 'pass' : 'tackle');
  }

  // 2) куда ведёт атака
  const how = b.how || null;
  const isShot = ['goal', 'save', 'miss', 'post', 'var'].includes(b.kind);
  const shooterSlot = b.pid && isShot && b.kind !== 'save' ? slotOfPlayer(S, att, b.pid) : -1;
  let target;
  if (how === 'pen') target = { d: 0.82, y: 0.5 };
  else if (how === 'fk') target = { d: 0.7, y: 0.35 + R() * 0.3 };
  else if (how === 'corner' || b.kind === 'corner') target = { d: 0.86, y: (how ? R() < 0.5 : b.y < 0.5) ? 0.15 : 0.85 };
  else if (isShot) target = { d: 0.78 + R() * 0.08, y: 0.32 + R() * 0.36 };
  else target = { d: clamp(fwd(att, b.x), 0.25, 0.8), y: b.y };

  const startD = fwd(att, cur.x);
  const nPass = b.kind === 'play' ? 2 + Math.floor(R() * 3) : how === 'pen' || how === 'fk' ? 1 + Math.floor(R() * 2) : 3 + Math.floor(R() * 3);
  for (let i = 1; i <= nPass; i++) {
    const t = i / (nPass + (b.kind === 'play' ? 0 : 1));
    const d = startD + (target.d - startD) * t + (R() - 0.5) * 0.06;
    const y = clamp(cur.y + (target.y - cur.y) * t + (R() - 0.5) * 0.35, 0.08, 0.92);
    const x = fwd(att, d);
    const sh = shapeOf(S, att, x, y, att);
    let s = nearestSlot(S, att, x, y, sh, cur.slot);
    if (s < 0) break;
    // иногда игрок сам протаскивает мяч
    if (R() < 0.22 && cur.side === att && cur.slot >= 0) {
      push(fwd(att, Math.min(0.95, fwd(att, cur.x) + 0.06 + R() * 0.08)), clamp(cur.y + (R() - 0.5) * 0.12, 0.06, 0.94), att, cur.slot, 'dribble');
      continue;
    }
    push(sh[s].x, sh[s].y, att, s, 'pass');
  }

  // 3) развязка
  if (b.kind === 'play') {
    // потеря мяча: перехват или вынос
    const sh = shapeOf(S, opp, cur.x, cur.y, opp);
    const s = nearestSlot(S, opp, cur.x, cur.y, sh);
    if (s >= 0) push(cur.x + (R() - 0.5) * 0.05, cur.y + (R() - 0.5) * 0.08, opp, s, 'tackle');
    return steps;
  }
  if (b.kind === 'corner' || how === 'corner') {
    const side = b.y < 0.5 || (how && R() < 0.5) ? 0.01 : 0.99;
    push(fwd(att, 0.995), side, att, cur.slot, 'corner');
    if (!isShot) {
      const dsh = shapeOf(S, opp, fwd(att, 0.9), 0.5, opp);
      const ds = nearestSlot(S, opp, fwd(att, 0.9), 0.5, dsh);
      push(fwd(att, 0.89), 0.4 + R() * 0.2, att, -1, 'cross');
      if (ds >= 0) push(fwd(att, 0.78), 0.5 + (R() - 0.5) * 0.4, opp, ds, 'clear');
      return steps;
    }
    const hs = shooterSlot >= 0 ? shooterSlot : nearestSlot(S, att, fwd(att, 0.9), 0.5, shapeOf(S, att, fwd(att, 0.9), 0.5, att));
    push(fwd(att, 0.9 + R() * 0.03), 0.42 + R() * 0.16, att, hs, 'cross');
  } else if (how === 'pen') {
    const dsh = shapeOf(S, opp, fwd(att, 0.88), 0.5, opp);
    const ds = nearestSlot(S, opp, fwd(att, 0.88), 0.5, dsh);
    if (ds >= 0) push(fwd(att, 0.87), 0.45 + R() * 0.1, opp, ds, 'foul');
    push(fwd(att, 0.89), 0.5, att, shooterSlot >= 0 ? shooterSlot : cur.slot, 'penspot');
  } else if (how === 'fk') {
    push(fwd(att, 0.74), cur.y, att, shooterSlot >= 0 ? shooterSlot : cur.slot, 'fkspot');
  } else if (shooterSlot >= 0 && shooterSlot !== cur.slot) {
    push(fwd(att, 0.8 + R() * 0.08), 0.3 + R() * 0.4, att, shooterSlot, 'pass');
  }
  // удар
  const gy = b.y ?? 0.5;
  const goalX = fwd(att, 1);
  if (b.kind === 'goal' || (b.kind === 'var')) push(goalX, clamp(gy, 0.44, 0.56), att, -1, b.kind === 'var' ? 'var' : 'goal');
  else if (b.kind === 'save') {
    const sh = shapeOf(S, opp, fwd(att, 0.95), 0.5, opp);
    push(fwd(att, 0.965), clamp(gy, 0.4, 0.6), opp, 0, 'save');
    void sh;
  } else if (b.kind === 'post') push(goalX, 0.44, att, -1, 'post');
  else if (b.kind === 'miss') push(goalX, gy < 0.5 ? 0.36 : 0.64, att, -1, 'miss');
  // помечаем удар
  if (steps.length >= 2) steps[steps.length - 2].shot = true;
  return steps;
}
