// 2D-трансляция с видом сверху. Каждая игровая минута — один непрерывный ролик:
// заранее считаем плавные траектории всех 22 игроков и мяча (сплайны), а затем
// проигрываем их одной анимацией на нативном потоке — 60 кадров без рывков.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { C, F } from './kit';
import { teamShape } from '../engine/playbyplay';

const DOT = 16;
const BALL = 9;
const SAMPLES = 72; // точек траектории на минуту
const WEIGHT = { pass: 1, dribble: 1.3, tackle: 0.9, cross: 1.2, corner: 1.1, clear: 1, goal: 0.9, save: 0.9, miss: 0.9, post: 0.9, var: 0.9, foul: 1, penspot: 1.5, fkspot: 1.5, kick: 1 };
const SHOT = { goal: 'ГОЛ!', save: 'сейв', miss: 'мимо', post: 'штанга!', var: 'VAR: отмена' };
const LONG = new Set(['cross', 'corner', 'clear']);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const surname = (W, S, si, slot) => {
  const side = si === 0 ? S.h : S.a;
  const id = side.xi[slot];
  const p = id ? W.players[id] : null;
  if (!p) return null;
  const parts = p.n.split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : p.n;
};

// Catmull-Rom по ключевым точкам (times — возрастающие)
function spline(times, pts, t) {
  const n = times.length;
  if (t <= times[0]) return pts[0];
  if (t >= times[n - 1]) return pts[n - 1];
  let k = 0;
  while (k < n - 2 && t > times[k + 1]) k++;
  const t0 = times[k];
  const t1 = times[k + 1];
  const u = t1 > t0 ? (t - t0) / (t1 - t0) : 1;
  const p0 = pts[Math.max(0, k - 1)];
  const p1 = pts[k];
  const p2 = pts[k + 1];
  const p3 = pts[Math.min(n - 1, k + 2)];
  const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
  return { x: cr(p0.x, p1.x, p2.x, p3.x), y: cr(p0.y, p1.y, p2.y, p3.y) };
}
const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);

// Строим траектории на минуту
function buildPlan(S, steps, prev) {
  const wsum = steps.reduce((s, st) => s + (WEIGHT[st.kind] || 1), 0) || 1;
  const times = [0];
  let acc = 0;
  for (const st of steps) {
    acc += (WEIGHT[st.kind] || 1) / wsum;
    times.push(Math.min(0.97, acc * 0.97));
  }
  // ключевые позиции игроков на каждом шаге
  const keys = [prev.players];
  steps.forEach((st) => {
    const hs = teamShape(S.h, true, st.x, st.y, st.side === 0);
    const as = teamShape(S.a, false, st.x, st.y, st.side === 1);
    const pos = [...hs, ...as];
    const carrier = st.slot >= 0 ? st.side * 11 + st.slot : -1;
    if (carrier >= 0) pos[carrier] = { x: clamp(st.x + (st.side === 0 ? -0.012 : 0.012), 0.015, 0.985), y: st.y };
    // ближайший защитник прессингует владельца мяча
    const defBase = st.side === 0 ? 11 : 0;
    let best = -1;
    let bd = 9;
    for (let i = 1; i < 11; i++) {
      const p = pos[defBase + i];
      const d = (p.x - st.x) ** 2 + (p.y - st.y) ** 2;
      if (d < bd) { bd = d; best = defBase + i; }
    }
    if (best >= 0 && !['goal', 'kick'].includes(st.kind)) {
      const dir = st.side === 0 ? 1 : -1;
      pos[best] = { x: clamp(st.x + dir * 0.035, 0.02, 0.98), y: clamp(st.y + (pos[best].y > st.y ? 0.025 : -0.025), 0.04, 0.96) };
    }
    keys.push(pos);
  });
  // траектории игроков: сплайн + лёгкое «живое» покачивание
  const grid = Array.from({ length: SAMPLES + 1 }, (_, i) => i / SAMPLES);
  const players = [];
  for (let i = 0; i < 22; i++) {
    const pts = keys.map((k) => k[i]);
    const ph = i * 1.7;
    const xs = [];
    const ys = [];
    for (const t of grid) {
      const p = spline(times, pts, t);
      const sway = Math.sin(t * 6.3 + ph) * 0.004;
      xs.push(clamp(p.x + sway, 0.01, 0.99));
      ys.push(clamp(p.y + Math.cos(t * 5.1 + ph) * 0.006, 0.02, 0.98));
    }
    players.push({ xs, ys });
  }
  // мяч: держится у игрока, затем летит к следующему
  const bx = [];
  const by = [];
  const lift = [];
  const bPts = [prev.ball, ...steps.map((st) => ({ x: st.kind === 'goal' ? (st.x > 0.5 ? 0.997 : 0.003) : st.x, y: st.y }))];
  for (const t of grid) {
    let k = 0;
    while (k < steps.length - 1 && t > times[k + 1]) k++;
    if (t >= times[times.length - 1]) {
      const last = bPts[bPts.length - 1];
      bx.push(last.x); by.push(last.y); lift.push(0);
      continue;
    }
    const st = steps[k];
    const a = bPts[k];
    const b = bPts[k + 1];
    const t0 = times[k];
    const t1 = times[k + 1];
    const dribble = st.kind === 'dribble';
    const depart = dribble ? t0 : t0 + (t1 - t0) * 0.38;
    if (t < depart) { bx.push(a.x); by.push(a.y); lift.push(0); continue; }
    const u = clamp((t - depart) / Math.max(0.0001, t1 - depart), 0, 1);
    const e = dribble ? u : 1 - (1 - u) ** 2;
    bx.push(a.x + (b.x - a.x) * e);
    by.push(a.y + (b.y - a.y) * e);
    const dist = Math.hypot(b.x - a.x, (b.y - a.y) * 0.6);
    const high = LONG.has(st.kind) || dist > 0.3;
    lift.push(high ? Math.sin(Math.PI * u) * Math.min(1, dist * 2.2) : 0);
  }
  const end = { players: players.map((p) => ({ x: p.xs[SAMPLES], y: p.ys[SAMPLES] })), ball: { x: bx[SAMPLES], y: by[SAMPLES] } };
  return { grid, times, players, ball: { xs: bx, ys: by, lift }, end };
}

export default function MatchPitch({ W, S, me, seq, seqId, minuteMs, width }) {
  const h = Math.round(width * 0.62);
  const t = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const anim = useRef(null);
  const timers = useRef([]);
  const state = useRef(null);
  const [plan, setPlan] = useState(null);
  const [caption, setCaption] = useState('');
  const [holder, setHolder] = useState(-1);
  const [tag, setTag] = useState(null);

  // начальная расстановка
  if (!state.current) {
    const hs = teamShape(S.h, true, 0.5, 0.5, true);
    const as = teamShape(S.a, false, 0.5, 0.5, false);
    state.current = { players: [...hs, ...as], ball: { x: 0.5, y: 0.5 } };
  }

  useEffect(() => () => {
    anim.current?.stop();
    timers.current.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (!seq || !seq.length) return;
    anim.current?.stop();
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const fast = minuteMs < 450;
    const steps = fast ? seq.slice(-1) : seq;
    let p;
    try {
      p = buildPlan(S, steps, state.current);
    } catch (e) {
      return;
    }
    state.current = p.end;
    setPlan({ ...p, steps, minuteMs, id: seqId });
  }, [seqId]);

  // запускаем ролик до отрисовки нового кадра — без скачков
  useLayoutEffect(() => {
    if (!plan) return;
    const p = plan;
    const steps = p.steps;
    const minuteMs = p.minuteMs;
    const total = Math.max(150, minuteMs * 0.96);
    // подписи и события по ходу розыгрыша
    const names = [];
    steps.forEach((st, i) => {
      const at = p.times[i + 1] * total * (st.kind === 'dribble' ? 0.6 : 1);
      timers.current.push(
        setTimeout(() => {
          const carrier = st.slot >= 0 ? st.side * 11 + st.slot : -1;
          if (st.slot >= 0 && ['pass', 'dribble', 'tackle', 'cross', 'penspot', 'fkspot', 'kick', 'clear'].includes(st.kind)) {
            const nm = surname(W, S, st.side, st.slot);
            if (nm && names[names.length - 1] !== nm) names.push(nm);
            const prefix = st.kind === 'tackle' ? 'отбор: ' : st.kind === 'clear' ? 'вынос: ' : st.kind === 'penspot' ? 'пенальти: ' : st.kind === 'fkspot' ? 'штрафной: ' : '';
            setCaption(prefix ? `${prefix}${nm || ''}` : names.slice(-4).join(' → '));
          }
          if (st.kind === 'corner') setCaption('угловой');
          if (SHOT[st.kind]) setCaption(`${names.slice(-3).join(' → ')}${names.length ? ' — ' : ''}${SHOT[st.kind]}${S.lastXg && st.kind !== 'var' ? `  ·  xG ${S.lastXg.toFixed(2)}` : ''}`);
          if (st.kind === 'foul') setCaption('фол в штрафной!');
          setHolder(carrier);
          setTag(SHOT[st.kind] ? { text: SHOT[st.kind].toUpperCase(), side: st.side } : null);
          if (st.kind === 'goal') {
            flash.setValue(0);
            Animated.sequence([
              Animated.timing(flash, { toValue: 1, duration: 220, useNativeDriver: true }),
              Animated.delay(Math.max(800, minuteMs * 0.9)),
              Animated.timing(flash, { toValue: 0, duration: 380, useNativeDriver: true }),
            ]).start();
          }
        }, Math.max(0, at - 40))
      );
    });
    t.setValue(0);
    anim.current = Animated.timing(t, { toValue: 1, duration: total, easing: Easing.linear, useNativeDriver: true });
    anim.current.start();
  }, [plan]);

  const inputRange = plan?.grid;
  const dots = useMemo(() => {
    if (!plan) return null;
    return plan.players.map((pl) => ({
      x: t.interpolate({ inputRange, outputRange: pl.xs.map((v) => v * width - DOT / 2) }),
      y: t.interpolate({ inputRange, outputRange: pl.ys.map((v) => v * h - DOT / 2) }),
    }));
  }, [plan, width]);
  const ballAnim = useMemo(() => {
    if (!plan) return null;
    return {
      x: t.interpolate({ inputRange, outputRange: plan.ball.xs.map((v) => v * width - BALL / 2) }),
      y: t.interpolate({ inputRange, outputRange: plan.ball.ys.map((v, i) => v * h - BALL / 2 - plan.ball.lift[i] * 10) }),
      sy: t.interpolate({ inputRange, outputRange: plan.ball.ys.map((v) => v * h - BALL / 2 + 2) }),
      sc: t.interpolate({ inputRange, outputRange: plan.ball.lift.map((l) => 1 + l * 0.55) }),
    };
  }, [plan, width]);

  const homeCol = me === 0 ? C.gold : '#4C8DFF';
  const awayCol = me === 1 ? C.gold : '#4C8DFF';
  const awayAlt = me === 1 ? C.gold : '#E8EDF7';
  const lastGoal = S.goals[S.goals.length - 1];
  const start = state.current;

  return (
    <View>
      <View style={[st.pitch, { width, height: h }]}>
        {Array.from({ length: 14 }).map((_, i) => (
          <View key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: (width / 14) * i, width: width / 14, backgroundColor: i % 2 ? C.pitch2 : C.pitch }} />
        ))}
        <View style={[st.line, { left: 4, right: 4, top: 4, bottom: 4, borderWidth: 1.5 }]} />
        <View style={[st.line, { left: width / 2, top: 4, bottom: 4, width: 0, borderLeftWidth: 1.5 }]} />
        <View style={[st.line, { left: width / 2 - h * 0.15, top: h / 2 - h * 0.15, width: h * 0.3, height: h * 0.3, borderRadius: h * 0.15, borderWidth: 1.5 }]} />
        <View style={[st.spot, { left: width / 2 - 2, top: h / 2 - 2 }]} />
        <View style={[st.line, { left: 4, top: h * 0.2, width: width * 0.15, height: h * 0.6, borderWidth: 1.5 }]} />
        <View style={[st.line, { right: 4, top: h * 0.2, width: width * 0.15, height: h * 0.6, borderWidth: 1.5 }]} />
        <View style={[st.line, { left: 4, top: h * 0.36, width: width * 0.055, height: h * 0.28, borderWidth: 1.5 }]} />
        <View style={[st.line, { right: 4, top: h * 0.36, width: width * 0.055, height: h * 0.28, borderWidth: 1.5 }]} />
        <View style={[st.spot, { left: width * 0.105, top: h / 2 - 2 }]} />
        <View style={[st.spot, { right: width * 0.105, top: h / 2 - 2 }]} />
        <View style={[st.goal, { left: 0, top: h * 0.43, height: h * 0.14 }]} />
        <View style={[st.goal, { right: 0, top: h * 0.43, height: h * 0.14 }]} />

        {Array.from({ length: 22 }).map((_, i) => {
          const si = i < 11 ? 0 : 1;
          const side = si === 0 ? S.h : S.a;
          if (!side.xi[i % 11]) return null;
          const isGk = i % 11 === 0;
          const col = si === 0 ? homeCol : me === 1 ? awayCol : awayAlt;
          const hold = i === holder;
          const pos = dots ? { transform: [{ translateX: dots[i].x }, { translateY: dots[i].y }] } : { transform: [{ translateX: start.players[i].x * width - DOT / 2 }, { translateY: start.players[i].y * h - DOT / 2 }] };
          return (
            <Animated.View key={i} style={[st.dot, pos, { backgroundColor: isGk ? (si === 0 ? '#1EC27A' : '#FF8A3D') : col, borderColor: hold ? '#fff' : 'rgba(0,0,0,0.55)', borderWidth: hold ? 2.5 : 1.2 }]}>
              <Text style={[st.num, { color: col === '#E8EDF7' || col === C.gold ? '#111' : '#fff' }]}>{(i % 11) + 1}</Text>
            </Animated.View>
          );
        })}
        {ballAnim ? (
          <>
            <Animated.View style={[st.ballShadow, { transform: [{ translateX: ballAnim.x }, { translateY: ballAnim.sy }] }]} />
            <Animated.View style={[st.ball, { transform: [{ translateX: ballAnim.x }, { translateY: ballAnim.y }, { scale: ballAnim.sc }] }]} />
          </>
        ) : (
          <View style={[st.ball, { transform: [{ translateX: width / 2 - BALL / 2 }, { translateY: h / 2 - BALL / 2 }] }]} />
        )}

        {tag && tag.text !== 'ГОЛ!' ? (
          <View style={[st.tag, tag.side === 0 ? { right: 10 } : { left: 10 }]}>
            <Text style={st.tagText}>{tag.text}</Text>
          </View>
        ) : null}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, st.goalFlash, { opacity: flash }]}>
          <Text style={st.goalText}>ГОЛ!</Text>
          {lastGoal ? <Text style={st.goalSub}>{(W.players[lastGoal[2]]?.n || '').toUpperCase()}</Text> : null}
        </Animated.View>
      </View>
      <View style={st.capRow}>
        <View style={[st.capDot, { backgroundColor: holder >= 0 ? (holder < 11 ? homeCol : awayCol) : C.dim }]} />
        <Text style={st.cap} numberOfLines={1}>{caption || ' '}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  pitch: { borderRadius: 14, overflow: 'hidden', alignSelf: 'center', backgroundColor: C.pitch },
  line: { position: 'absolute', borderColor: C.pitchLine },
  spot: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: C.pitchLine },
  goal: { position: 'absolute', width: 4, backgroundColor: 'rgba(255,255,255,0.85)' },
  dot: { position: 'absolute', left: 0, top: 0, width: DOT, height: DOT, borderRadius: DOT / 2, alignItems: 'center', justifyContent: 'center' },
  num: { fontSize: 8, fontWeight: '800' },
  ball: { position: 'absolute', left: 0, top: 0, width: BALL, height: BALL, borderRadius: BALL / 2, backgroundColor: '#fff', borderWidth: 1, borderColor: '#111' },
  ballShadow: { position: 'absolute', left: 1, top: 1, width: BALL, height: BALL * 0.7, borderRadius: BALL / 2, backgroundColor: 'rgba(0,0,0,0.35)' },
  tag: { position: 'absolute', top: 8, backgroundColor: 'rgba(5,8,15,0.78)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { color: '#fff', fontFamily: F.d7, fontSize: 13, letterSpacing: 0.6 },
  goalFlash: { backgroundColor: 'rgba(5,8,15,0.55)', alignItems: 'center', justifyContent: 'center' },
  goalText: { color: C.gold, fontFamily: F.d8, fontSize: 54, letterSpacing: 4 },
  goalSub: { color: '#fff', fontFamily: F.d7, fontSize: 15, letterSpacing: 2 },
  capRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, paddingTop: 7 },
  capDot: { width: 8, height: 8, borderRadius: 4 },
  cap: { flex: 1, color: C.text, fontFamily: F.d6, fontSize: 14, letterSpacing: 0.3 },
});
