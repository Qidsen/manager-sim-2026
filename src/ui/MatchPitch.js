// 2D-схема матча: 22 игрока и мяч двигаются вместе с ходом игры.
// Хозяева атакуют слева направо. Позиции строятся из схемы команды и смещаются за мячом.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { C, F } from './kit';
import { FORMATIONS } from '../engine/util';

const DOT = 14;
const BALL = 9;

function teamTargets(side, isHome, ball, hasBall) {
  const slots = FORMATIONS[side.tac.form];
  const shift = (ball.x - 0.5) * 0.48;
  const push = hasBall ? 0.05 : -0.03;
  return slots.map(([pos, lx, ly], i) => {
    const gk = pos === 'GK';
    let x = 0.05 + ly * 0.62;
    if (!isHome) x = 1 - x;
    x += (gk ? 0.12 : 1) * shift + (gk ? 0 : isHome ? push : -push);
    let y = isHome ? lx : 1 - lx;
    y += (ball.y - 0.5) * (gk ? 0.1 : 0.22);
    return { x: Math.min(0.97, Math.max(0.03, x)), y: Math.min(0.95, Math.max(0.05, y)), on: !!side.xi[i] };
  });
}

export default function MatchPitch({ S, me, tickMs, width }) {
  const h = Math.round(width * 0.6);
  const ball = S.ball || { x: 0.5, y: 0.5, kind: 'kick', side: 0, t: 0 };
  const dots = useRef(Array.from({ length: 22 }, () => new Animated.ValueXY({ x: width / 2, y: h / 2 }))).current;
  const ballXY = useRef(new Animated.ValueXY({ x: width / 2, y: h / 2 })).current;
  const flash = useRef(new Animated.Value(0)).current;
  const [label, setLabel] = useState(null);
  const lastT = useRef(-1);

  const targets = useMemo(() => {
    const hb = teamTargets(S.h, true, ball, ball.side === 0);
    const ab = teamTargets(S.a, false, ball, ball.side === 1);
    return [...hb, ...ab];
  }, [ball.t, S.h.tac.form, S.a.tac.form]);

  useEffect(() => {
    if (ball.t === lastT.current) return;
    lastT.current = ball.t;
    const dur = Math.max(50, Math.min(700, tickMs * 0.92));
    const anims = targets.map((t, i) =>
      Animated.timing(dots[i], {
        toValue: { x: t.x * width - DOT / 2 + (Math.random() - 0.5) * 6, y: t.y * h - DOT / 2 + (Math.random() - 0.5) * 6 },
        duration: dur,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    );
    anims.push(
      Animated.timing(ballXY, {
        toValue: { x: ball.x * width - BALL / 2, y: ball.y * h - BALL / 2 },
        duration: dur * 0.8,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    );
    Animated.parallel(anims).start();
    if (ball.kind === 'goal') {
      flash.setValue(0);
      Animated.sequence([
        Animated.timing(flash, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.delay(Math.max(400, tickMs * 3)),
        Animated.timing(flash, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
    const KIND = { goal: 'ГОЛ!', save: 'Сейв', miss: 'Мимо', post: 'Штанга!', corner: 'Угловой', pen: 'Пенальти', fk: 'Штрафной', var: 'VAR', ht: 'Перерыв' };
    setLabel(KIND[ball.kind] ? { text: KIND[ball.kind], side: ball.side, kind: ball.kind } : null);
  }, [ball.t]);

  const homeCol = me === 0 ? C.gold : C.blue;
  const awayCol = me === 1 ? C.gold : C.blue;
  const goalSide = ball.side === 0 ? S.h.short : S.a.short;

  return (
    <View style={[st.pitch, { width, height: h }]}>
      {/* полосы газона */}
      {Array.from({ length: 12 }).map((_, i) => (
        <View key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: (width / 12) * i, width: width / 12, backgroundColor: i % 2 ? C.pitch2 : C.pitch }} />
      ))}
      {/* разметка */}
      <View style={[st.line, { left: 4, right: 4, top: 4, bottom: 4, borderWidth: 1.5 }]} />
      <View style={[st.line, { left: width / 2, top: 4, bottom: 4, width: 0, borderLeftWidth: 1.5 }]} />
      <View style={[st.line, { left: width / 2 - h * 0.15, top: h / 2 - h * 0.15, width: h * 0.3, height: h * 0.3, borderRadius: h * 0.15, borderWidth: 1.5 }]} />
      <View style={[st.line, { left: 4, top: h * 0.22, width: width * 0.14, height: h * 0.56, borderWidth: 1.5 }]} />
      <View style={[st.line, { right: 4, top: h * 0.22, width: width * 0.14, height: h * 0.56, borderWidth: 1.5 }]} />
      <View style={[st.line, { left: 4, top: h * 0.37, width: width * 0.05, height: h * 0.26, borderWidth: 1.5 }]} />
      <View style={[st.line, { right: 4, top: h * 0.37, width: width * 0.05, height: h * 0.26, borderWidth: 1.5 }]} />
      <View style={[st.goal, { left: 0, top: h * 0.42, height: h * 0.16 }]} />
      <View style={[st.goal, { right: 0, top: h * 0.42, height: h * 0.16 }]} />

      {/* игроки */}
      {dots.map((v, i) => {
        const home = i < 11;
        const t = targets[i];
        if (!t?.on) return null;
        const isGk = i % 11 === 0;
        const col = home ? homeCol : awayCol;
        return (
          <Animated.View
            key={i}
            style={[
              st.dot,
              { backgroundColor: isGk ? '#ECEFF4' : col, borderColor: isGk ? col : 'rgba(0,0,0,0.45)', transform: [{ translateX: v.x }, { translateY: v.y }] },
            ]}
          />
        );
      })}
      {/* мяч */}
      <Animated.View style={[st.ball, { transform: [{ translateX: ballXY.x }, { translateY: ballXY.y }] }]} />

      {/* подписи событий */}
      {label && label.kind !== 'goal' ? (
        <View style={[st.tag, label.side === 0 ? { right: 10 } : { left: 10 }]}>
          <Text style={st.tagText}>{label.text}</Text>
        </View>
      ) : null}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, st.goalFlash, { opacity: flash }]}>
        <Text style={st.goalText}>ГОЛ!</Text>
        <Text style={st.goalSub}>{goalSide}</Text>
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  pitch: { borderRadius: 14, overflow: 'hidden', alignSelf: 'center', backgroundColor: C.pitch },
  line: { position: 'absolute', borderColor: C.pitchLine },
  goal: { position: 'absolute', width: 4, backgroundColor: 'rgba(255,255,255,0.75)' },
  dot: { position: 'absolute', left: 0, top: 0, width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 1.5 },
  ball: { position: 'absolute', left: 0, top: 0, width: BALL, height: BALL, borderRadius: BALL / 2, backgroundColor: '#fff', borderWidth: 1, borderColor: '#111' },
  tag: { position: 'absolute', top: 8, backgroundColor: 'rgba(5,8,15,0.75)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { color: '#fff', fontFamily: F.d7, fontSize: 13, letterSpacing: 0.6 },
  goalFlash: { backgroundColor: 'rgba(5,8,15,0.55)', alignItems: 'center', justifyContent: 'center' },
  goalText: { color: C.gold, fontFamily: F.d8, fontSize: 54, letterSpacing: 4 },
  goalSub: { color: '#fff', fontFamily: F.d7, fontSize: 16, letterSpacing: 2 },
});
