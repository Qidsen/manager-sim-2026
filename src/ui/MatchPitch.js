// 2D-трансляция: каждая минута — розыгрыш из пасов, ведений, отборов и ударов.
// Мяч плавно идёт от игрока к игроку, команды смещаются за мячом.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { C, F } from './kit';
import { teamShape } from '../engine/playbyplay';

const DOT = 15;
const BALL = 9;
const WEIGHT = { pass: 1, dribble: 1.25, tackle: 0.9, shot: 0.6, cross: 1.15, corner: 0.9, clear: 0.9, goal: 0.7, save: 0.7, miss: 0.7, post: 0.7, var: 0.7, foul: 1, penspot: 1.4, fkspot: 1.4, kick: 1 };
const SHOT = { goal: 'ГОЛ!', save: 'сейв', miss: 'мимо', post: 'штанга!', var: 'VAR: отмена' };

const surname = (W, S, si, slot) => {
  const side = si === 0 ? S.h : S.a;
  const id = side.xi[slot];
  const p = id ? W.players[id] : null;
  if (!p) return null;
  const parts = p.n.split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : p.n;
};

export default function MatchPitch({ W, S, me, seq, seqId, minuteMs, width }) {
  const h = Math.round(width * 0.6);
  const dots = useRef(Array.from({ length: 22 }, () => new Animated.ValueXY({ x: width / 2, y: h / 2 }))).current;
  const ball = useRef(new Animated.ValueXY({ x: width / 2 - BALL / 2, y: h / 2 - BALL / 2 })).current;
  const flash = useRef(new Animated.Value(0)).current;
  const anim = useRef(null);
  const timers = useRef([]);
  const [caption, setCaption] = useState('');
  const [holder, setHolder] = useState(-1);
  const [tag, setTag] = useState(null);

  const px = (x) => x * width;
  const py = (y) => y * h;

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
    const total = Math.max(120, minuteMs * 0.94);
    const wsum = steps.reduce((s, st) => s + (WEIGHT[st.kind] || 1), 0);
    let t = 0;
    const names = [];
    const groups = steps.map((st) => {
      const dur = (total * (WEIGHT[st.kind] || 1)) / wsum;
      const hs = teamShape(S.h, true, st.x, st.y, st.side === 0);
      const as = teamShape(S.a, false, st.x, st.y, st.side === 1);
      const targets = [...hs, ...as];
      const carrier = st.slot >= 0 ? st.side * 11 + st.slot : -1;
      if (carrier >= 0) {
        const behind = st.side === 0 ? -0.012 : 0.012;
        targets[carrier] = { x: Math.min(0.985, Math.max(0.015, st.x + behind)), y: st.y };
      }
      // подписи по ходу розыгрыша
      const at = t;
      timers.current.push(
        setTimeout(() => {
          if (st.slot >= 0 && ['pass', 'dribble', 'tackle', 'cross', 'penspot', 'fkspot', 'kick', 'clear'].includes(st.kind)) {
            const nm = surname(W, S, st.side, st.slot);
            if (nm && names[names.length - 1] !== nm) names.push(nm);
            const prefix = st.kind === 'tackle' ? 'отбор: ' : st.kind === 'clear' ? 'вынос: ' : st.kind === 'penspot' ? 'пенальти: ' : st.kind === 'fkspot' ? 'штрафной: ' : '';
            setCaption(prefix ? `${prefix}${nm || ''}` : names.slice(-4).join(' → '));
          }
          if (st.kind === 'corner') setCaption('угловой');
          if (SHOT[st.kind]) setCaption(`${names.slice(-3).join(' → ')}${names.length ? ' — ' : ''}${SHOT[st.kind]}`);
          if (st.kind === 'foul') setCaption('фол в штрафной!');
          setHolder(carrier);
          setTag(SHOT[st.kind] ? { text: SHOT[st.kind].toUpperCase(), side: st.side } : null);
          if (st.kind === 'goal') {
            flash.setValue(0);
            Animated.sequence([
              Animated.timing(flash, { toValue: 1, duration: 200, useNativeDriver: true }),
              Animated.delay(Math.max(700, minuteMs * 0.9)),
              Animated.timing(flash, { toValue: 0, duration: 350, useNativeDriver: true }),
            ]).start();
          }
        }, at)
      );
      t += dur;
      const ease = st.kind === 'dribble' ? Easing.inOut(Easing.sin) : Easing.out(Easing.quad);
      const bx = st.kind === 'goal' ? (st.x > 0.5 ? 0.995 : 0.005) : st.x;
      return Animated.parallel([
        ...targets.map((tg, i) =>
          Animated.timing(dots[i], {
            toValue: { x: px(tg.x) - DOT / 2, y: py(tg.y) - DOT / 2 },
            duration: dur,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          })
        ),
        Animated.timing(ball, {
          toValue: { x: px(bx) - BALL / 2, y: py(st.y) - BALL / 2 },
          duration: st.kind === 'shot' || SHOT[st.kind] ? dur * 0.6 : dur * 0.85,
          easing: ease,
          useNativeDriver: true,
        }),
      ]);
    });
    anim.current = Animated.sequence(groups);
    anim.current.start();
  }, [seqId]);

  const homeCol = me === 0 ? C.gold : C.blue;
  const awayCol = me === 1 ? C.gold : C.blue;
  const lastGoal = S.goals[S.goals.length - 1];

  return (
    <View>
      <View style={[st.pitch, { width, height: h }]}>
        {Array.from({ length: 12 }).map((_, i) => (
          <View key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: (width / 12) * i, width: width / 12, backgroundColor: i % 2 ? C.pitch2 : C.pitch }} />
        ))}
        <View style={[st.line, { left: 4, right: 4, top: 4, bottom: 4, borderWidth: 1.5 }]} />
        <View style={[st.line, { left: width / 2, top: 4, bottom: 4, width: 0, borderLeftWidth: 1.5 }]} />
        <View style={[st.line, { left: width / 2 - h * 0.15, top: h / 2 - h * 0.15, width: h * 0.3, height: h * 0.3, borderRadius: h * 0.15, borderWidth: 1.5 }]} />
        <View style={[st.line, { left: 4, top: h * 0.22, width: width * 0.14, height: h * 0.56, borderWidth: 1.5 }]} />
        <View style={[st.line, { right: 4, top: h * 0.22, width: width * 0.14, height: h * 0.56, borderWidth: 1.5 }]} />
        <View style={[st.line, { left: 4, top: h * 0.37, width: width * 0.05, height: h * 0.26, borderWidth: 1.5 }]} />
        <View style={[st.line, { right: 4, top: h * 0.37, width: width * 0.05, height: h * 0.26, borderWidth: 1.5 }]} />
        <View style={[st.goal, { left: 0, top: h * 0.42, height: h * 0.16 }]} />
        <View style={[st.goal, { right: 0, top: h * 0.42, height: h * 0.16 }]} />

        {dots.map((v, i) => {
          const si = i < 11 ? 0 : 1;
          const side = si === 0 ? S.h : S.a;
          if (!side.xi[i % 11]) return null;
          const isGk = i % 11 === 0;
          const col = si === 0 ? homeCol : awayCol;
          const hold = i === holder;
          return (
            <Animated.View
              key={i}
              style={[
                st.dot,
                {
                  backgroundColor: isGk ? '#ECEFF4' : col,
                  borderColor: hold ? '#fff' : isGk ? col : 'rgba(0,0,0,0.5)',
                  borderWidth: hold ? 2.5 : 1.5,
                  transform: [{ translateX: v.x }, { translateY: v.y }],
                },
              ]}
            />
          );
        })}
        <Animated.View style={[st.ballShadow, { transform: [{ translateX: ball.x }, { translateY: ball.y }] }]} />
        <Animated.View style={[st.ball, { transform: [{ translateX: ball.x }, { translateY: ball.y }] }]} />

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
  goal: { position: 'absolute', width: 4, backgroundColor: 'rgba(255,255,255,0.8)' },
  dot: { position: 'absolute', left: 0, top: 0, width: DOT, height: DOT, borderRadius: DOT / 2 },
  ball: { position: 'absolute', left: 0, top: 0, width: BALL, height: BALL, borderRadius: BALL / 2, backgroundColor: '#fff', borderWidth: 1, borderColor: '#111' },
  ballShadow: { position: 'absolute', left: 2, top: 3, width: BALL, height: BALL, borderRadius: BALL / 2, backgroundColor: 'rgba(0,0,0,0.35)' },
  tag: { position: 'absolute', top: 8, backgroundColor: 'rgba(5,8,15,0.78)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { color: '#fff', fontFamily: F.d7, fontSize: 13, letterSpacing: 0.6 },
  goalFlash: { backgroundColor: 'rgba(5,8,15,0.55)', alignItems: 'center', justifyContent: 'center' },
  goalText: { color: C.gold, fontFamily: F.d8, fontSize: 54, letterSpacing: 4 },
  goalSub: { color: '#fff', fontFamily: F.d7, fontSize: 15, letterSpacing: 2 },
  capRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, paddingTop: 7 },
  capDot: { width: 8, height: 8, borderRadius: 4 },
  cap: { flex: 1, color: C.text, fontFamily: F.d6, fontSize: 14, letterSpacing: 0.3 },
});
