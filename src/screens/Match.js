import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, FlatList, ScrollView } from 'react-native';
import { C, T, Card, Btn, Seg, Bar, Rating, ratingColor } from '../ui/kit';
import { useG } from '../ui/ctx';
import { userMatchToday, prepareMatch, finalizeMatch } from '../engine/sim';
import { stepMinute, simulateFull, doSub } from '../engine/match';
import { teamName, teamFlag, teamColor, isUserTeam, isNat } from '../engine/teams';
import { FORMATIONS, MENTALITY, POS_RU, slotRating, fmtDate } from '../engine/util';
import { PosBadge } from '../ui/playerRow';

const SPEEDS = { 1: 420, 2: 180, 4: 60 };
const ICON = { goal: '⚽', yellow: '🟨', red: '🟥', sub: '🔁', inj: '🚑', save: '🧤', miss: '↗️', ht: '⏱', ft: '🏁', pens: '🎯', info: '·' };

export default function MatchScreen() {
  const G = useG();
  const W = G.W;
  const um = useRef(userMatchToday(W)).current;
  const S = useRef(null);
  const [phase, setPhase] = useState('pre');
  const [, setN] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [subOut, setSubOut] = useState(null);
  const [panel, setPanel] = useState(null); // 'subs' | 'tactic'
  const finalized = useRef(false);

  const me = um ? (isUserTeam(W, um.m.h) ? 0 : 1) : 0;

  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(() => {
      const s = S.current;
      if (!s) return;
      const before = s.ev.length;
      stepMinute(W, s);
      const newEv = s.ev.slice(before);
      // автопауза: перерыв, травма своего игрока, удаление
      if (s.min === 45 && s.phase === 'play') setRunning(false);
      if (newEv.some((e) => e.side === me && (e.type === 'inj' || e.type === 'red')) && !W.user.autoSubs) setRunning(false);
      if (s.done) {
        setRunning(false);
        finish();
      }
      setN((n) => n + 1);
    }, SPEEDS[speed]);
    return () => clearInterval(t);
  }, [running, speed]);

  if (!um) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <T center muted>Сегодня у вас нет матча.</T>
        <Btn title="Назад" style={{ marginTop: 16 }} onPress={G.pop} />
      </View>
    );
  }
  const { e, m, comp, stage } = um;

  function finish() {
    if (finalized.current) return;
    finalized.current = true;
    finalizeMatch(W, e, m, S.current);
    setPhase('post');
    G.refresh();
    G.save(true);
  }

  const start = (quick = false) => {
    S.current = prepareMatch(W, e, m, true);
    setPhase('live');
    if (quick) {
      simulateFull(W, S.current);
      finish();
    } else setRunning(true);
  };

  const s = S.current;
  const title = comp.kind === 'friendly' ? m.label || 'Товарищеский матч' : `${comp.name} · ${stage.name}`;

  if (phase === 'pre') {
    const mySide = me === 0 ? m.h : m.a;
    return (
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
        <T muted center size={12}>{fmtDate(W.year, W.day, true)}</T>
        <T bold center size={14} style={{ marginTop: 4 }}>{title}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 20 }}>
          <TeamHead W={W} id={m.h} />
          <Text style={{ color: C.muted, fontSize: 20, fontWeight: '800' }}>VS</Text>
          <TeamHead W={W} id={m.a} />
        </View>
        {stage.neutral ? <T muted center size={12} style={{ marginBottom: 10 }}>Нейтральное поле</T> : null}
        <Btn title="▶ Начать матч" onPress={() => start(false)} style={{ marginBottom: 10 }} />
        <Btn title="Тактика и состав" kind="ghost" onPress={() => G.push('tactics', { team: mySide })} style={{ marginBottom: 10 }} />
        <Btn title="Быстрый результат" kind="ghost" onPress={() => start(true)} style={{ marginBottom: 10 }} />
        <Btn title="Назад" kind="ghost" onPress={G.pop} style={{ marginBottom: 10 }} />
        <Card title="Автозамены">
          <Seg options={[{ value: false, label: 'Вручную' }, { value: true, label: 'Автоматически' }]} value={!!W.user.autoSubs} onChange={(v) => { W.user.autoSubs = v; G.refresh(); }} />
          <T muted size={12} style={{ marginTop: 6 }}>В ручном режиме игра встанет на паузу при травме или удалении вашего игрока.</T>
        </Card>
      </ScrollView>
    );
  }

  const side = me === 0 ? s.h : s.a;
  const totalPoss = s.poss[0] + s.poss[1];
  const pct0 = Math.round((s.poss[0] / totalPoss) * 100);
  const scorers = (si) => s.goals.filter((g) => g[1] === si).map((g) => `${(W.players[g[2]]?.n || '').split(' ').slice(-1)[0]} ${g[0]}'`).join(', ');
  const header = (
    <View style={{ backgroundColor: '#111a15', borderBottomWidth: 1, borderBottomColor: C.line }}>
      <View style={{ flexDirection: 'row', height: 4 }}>
        <View style={{ flex: 1, backgroundColor: me === 0 ? C.accent : teamColor(W, m.h) }} />
        <View style={{ flex: 1, backgroundColor: me === 1 ? C.accent : teamColor(W, m.a) }} />
      </View>
      <View style={{ padding: 14, paddingBottom: 10 }}>
        <T muted center size={11} numberOfLines={1}>{title.toUpperCase()}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 26 }}>{teamFlag(W, m.h)}</Text>
            <T bold size={14} center numberOfLines={2} color={me === 0 ? C.accent : C.text} style={{ marginTop: 4 }}>{s.h.name}</T>
          </View>
          <View style={{ alignItems: 'center', minWidth: 110 }}>
            <View style={{ backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4, borderWidth: 1, borderColor: C.line }}>
              <Text style={{ color: C.text, fontSize: 38, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{s.score[0]}:{s.score[1]}</Text>
            </View>
            {s.pens ? <T size={12} muted style={{ marginTop: 2 }}>пен. {s.pens[0]}:{s.pens[1]}</T> : null}
            <View style={{ marginTop: 6, backgroundColor: s.done ? C.card2 : C.gold, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ color: s.done ? C.muted : '#000', fontWeight: '800', fontSize: 12 }}>{s.done ? 'КОНЕЦ' : `${Math.min(s.min, s.phase === 'et' ? 120 : 90)}'`}</Text>
            </View>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 26 }}>{teamFlag(W, m.a)}</Text>
            <T bold size={14} center numberOfLines={2} color={me === 1 ? C.accent : C.text} style={{ marginTop: 4 }}>{s.a.name}</T>
          </View>
        </View>
        {s.goals.length ? (
          <View style={{ flexDirection: 'row', marginTop: 8, gap: 10 }}>
            <T size={11} muted style={{ flex: 1, textAlign: 'center' }} numberOfLines={2}>{scorers(0)}</T>
            <T size={11} muted style={{ flex: 1, textAlign: 'center' }} numberOfLines={2}>{scorers(1)}</T>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 }}>
          <T size={11} bold style={{ width: 32 }}>{pct0}%</T>
          <View style={{ flex: 1, height: 6, borderRadius: 3, overflow: 'hidden', flexDirection: 'row', backgroundColor: C.line }}>
            <View style={{ width: `${pct0}%`, backgroundColor: me === 0 ? C.accent : C.blue }} />
            <View style={{ flex: 1, backgroundColor: me === 1 ? C.accent : C.blue, opacity: 0.55 }} />
          </View>
          <T size={11} bold style={{ width: 32, textAlign: 'right' }}>{100 - pct0}%</T>
        </View>
        <T size={11} muted center style={{ marginTop: 4 }}>владение · удары {s.shots[0]} ({s.sot[0]}) — {s.shots[1]} ({s.sot[1]})</T>
      </View>
      <Bar value={s.min} max={s.phase === 'et' || s.min > 90 ? 120 : 90} color={C.gold} height={3} style={{ borderRadius: 0 }} />
    </View>
  );

  if (phase === 'post') {
    const all = [...[...s.h.played].map((id) => [id, 0]), ...[...s.a.played].map((id) => [id, 1])];
    const best = all.reduce((b, x) => ((s.rating[x[0]] || 0) > (s.rating[b?.[0]] || 0) ? x : b), null);
    const mine = [...side.played].map((id) => W.players[id]).filter(Boolean).sort((a, b) => (s.rating[b.id] || 0) - (s.rating[a.id] || 0));
    return (
      <View style={{ flex: 1 }}>
        {header}
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
          <Card title="Голы">
            {s.goals.length ? s.goals.map(([min, sd, pid, as], i) => (
              <T key={i} size={13} style={{ paddingVertical: 2 }}>{min}' ⚽ {W.players[pid]?.n} ({sd === 0 ? s.h.short : s.a.short}){as ? ` · пас ${W.players[as]?.n}` : ''}</T>
            )) : <T muted>Голов не было</T>}
          </Card>
          {best ? <Card title="Игрок матча"><T bold>{W.players[best[0]]?.n} · {(s.rating[best[0]] || 0).toFixed(1)}</T></Card> : null}
          <Card title="Оценки ваших игроков">
            {mine.map((p) => (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 8 }}>
                <PosBadge pos={p.pos} />
                <T size={13} style={{ flex: 1 }} numberOfLines={1}>{p.n}</T>
                <T bold size={14} color={ratingColor(40 + (s.rating[p.id] || 6) * 6)}>{(s.rating[p.id] || 6).toFixed(1)}</T>
              </View>
            ))}
          </Card>
          <Btn title="Продолжить" onPress={() => G.pop()} />
        </ScrollView>
      </View>
    );
  }

  // live
  const slots = FORMATIONS[side.tac.form];
  return (
    <View style={{ flex: 1 }}>
      {header}
      <View style={{ flexDirection: 'row', gap: 6, padding: 10 }}>
        <Btn small title={running ? '⏸ Пауза' : '▶ Играть'} style={{ flex: 1.2 }} onPress={() => { setPanel(null); setRunning(!running); }} />
        <Btn small kind="ghost" title={`x${speed}`} style={{ flex: 0.6 }} onPress={() => setSpeed(speed === 1 ? 2 : speed === 2 ? 4 : 1)} />
        <Btn small kind={panel === 'subs' ? 'gold' : 'ghost'} title={`Замены (${side.subsLeft})`} style={{ flex: 1 }} onPress={() => { setRunning(false); setPanel(panel === 'subs' ? null : 'subs'); setSubOut(null); }} />
        <Btn small kind={panel === 'tactic' ? 'gold' : 'ghost'} title="Тактика" style={{ flex: 0.9 }} onPress={() => { setRunning(false); setPanel(panel === 'tactic' ? null : 'tactic'); }} />
      </View>
      {panel === 'tactic' ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
          <T muted size={12} style={{ marginBottom: 4 }}>Настрой: {MENTALITY[side.tac.ment]}</T>
          <Seg options={MENTALITY.map((x, i) => ({ value: i, label: ['−−', '−', '=', '+', '++'][i] }))} value={side.tac.ment} onChange={(v) => { side.tac.ment = v; s.cache = null; setN((n) => n + 1); }} />
          <T muted size={12} style={{ marginVertical: 4 }}>Прессинг</T>
          <Seg options={['Низкий', 'Средний', 'Высокий'].map((x, i) => ({ value: i, label: x }))} value={side.tac.press} onChange={(v) => { side.tac.press = v; s.cache = null; setN((n) => n + 1); }} />
        </View>
      ) : null}
      {panel === 'subs' ? (
        <ScrollView style={{ maxHeight: 330, paddingHorizontal: 12 }}>
          <T muted size={12} style={{ marginBottom: 4 }}>{subOut ? 'Кого выпустить?' : 'Кого заменить?'}</T>
          {!subOut
            ? side.xi.map((id, i) => {
                if (!id) return null;
                const p = W.players[id];
                return (
                  <Pressable key={id} onPress={() => side.subsLeft > 0 && setSubOut(id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: C.line }}>
                    <T size={11} muted style={{ width: 26 }}>{POS_RU[slots[i][0]]}</T>
                    <T size={13} style={{ flex: 1 }} numberOfLines={1}>{p.n}{side.injured?.has(id) ? ' 🚑' : ''}{side.yc[id] ? ' 🟨' : ''}</T>
                    <Bar value={side.fit[id] ?? p.fit} color={(side.fit[id] ?? p.fit) < 65 ? C.orange : C.accent} style={{ width: 50 }} />
                    <T size={12} bold style={{ width: 30, textAlign: 'right' }}>{(s.rating[id] || 6.2).toFixed(1)}</T>
                  </Pressable>
                );
              })
            : side.bench.map((id) => {
                const p = W.players[id];
                const slotPos = slots[side.xi.indexOf(subOut)]?.[0];
                return (
                  <Pressable key={id} onPress={() => { doSub(W, s, me, subOut, id); setSubOut(null); setN((n) => n + 1); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: C.line }}>
                    <PosBadge pos={p.pos} />
                    <T size={13} style={{ flex: 1 }} numberOfLines={1}>{p.n}</T>
                    <T size={12} muted>на {POS_RU[slotPos]}: {slotPos ? Math.round(slotRating(p, slotPos)) : p.ovr}</T>
                  </Pressable>
                );
              })}
          {subOut ? <Btn small kind="ghost" title="Отмена" onPress={() => setSubOut(null)} style={{ marginVertical: 8 }} /> : null}
        </ScrollView>
      ) : null}
      <FlatList
        data={s.ev.slice(-80).reverse()}
        keyExtractor={(_, i) => String(s.ev.length - i)}
        contentContainerStyle={{ padding: 12, paddingBottom: 30 }}
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: C.line, backgroundColor: item.type === 'goal' ? C.accentDim : 'transparent', borderRadius: 6 }}>
            <T muted size={12} style={{ width: 30, textAlign: 'right' }}>{item.min}'</T>
            <Text style={{ width: 20 }}>{ICON[item.type] || ''}</Text>
            <T size={13} style={{ flex: 1 }} color={item.side === me ? C.text : item.side === -1 ? C.gold : '#c9d4cd'}>{item.text}</T>
          </View>
        )}
      />
      {!running && !s.done ? (
        <View style={{ padding: 10, borderTopWidth: 1, borderTopColor: C.line }}>
          <Btn small kind="ghost" title="Досимулировать до конца" onPress={() => { simulateFull(W, s); finish(); setN((n) => n + 1); }} />
        </View>
      ) : null}
    </View>
  );
}

function TeamHead({ W, id }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 40 }}>{teamFlag(W, id)}</Text>
      <T bold center size={16} style={{ marginTop: 6 }} numberOfLines={2}>{teamName(W, id)}</T>
    </View>
  );
}
