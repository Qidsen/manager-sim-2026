import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, FlatList, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, T, Card, Btn, Seg, Bar, Icon, IconBtn, Rating, ratingColor, tap, thud } from '../ui/kit';
import { useG } from '../ui/ctx';
import { userMatchToday, prepareMatch, finalizeMatch } from '../engine/sim';
import { stepMinute, simulateFull, doSub, resolveLineup, clockLabel } from '../engine/match';
import MatchPitch from '../ui/MatchPitch';
import { teamName, teamFlag, teamColor, teamPool, teamTactic, isUserTeam } from '../engine/teams';
import { FORMATIONS, MENTALITY, POS_RU, slotRating, fmtDate } from '../engine/util';
import { PosBadge } from '../ui/playerRow';
import { lastResults, resultLetter } from '../engine/query';
import { bcStart, bcEnd, logError } from '../diag';

const SPEEDS = { 1: 420, 2: 180, 4: 60 };
const EV = {
  goal: { icon: 'football', color: C.accent },
  yellow: { icon: 'square', color: '#FFD23F' },
  red: { icon: 'square', color: C.red },
  sub: { icon: 'swap-vertical', color: C.blue },
  inj: { icon: 'medkit', color: C.red },
  save: { icon: 'hand-left', color: C.muted },
  miss: { icon: 'arrow-up-circle-outline', color: C.dim },
  ht: { icon: 'time', color: C.gold },
  ft: { icon: 'flag', color: C.gold },
  pens: { icon: 'locate', color: C.gold },
  info: { icon: 'ellipse', color: C.dim },
  corner: { icon: 'flag-outline', color: C.muted },
  fk: { icon: 'locate-outline', color: C.orange },
  pen: { icon: 'alert-circle', color: C.gold },
  var: { icon: 'tv', color: C.orange },
};

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
  const [showPitch, setShowPitch] = useState(true);
  const { width: winW } = useWindowDimensions();
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
      if (newEv.some((e) => e.type === 'goal')) thud();
      if (s.htPause) {
        s.htPause = false;
        setRunning(false);
      }
      if (newEv.some((e) => e.side === me && (e.type === 'inj' || e.type === 'red')) && W.user.autoSubs === false) setRunning(false);
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
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: C.bg }}>
        <T center muted>Сегодня у вас нет матча.</T>
        <Btn title="Назад" style={{ marginTop: 16 }} onPress={G.pop} />
      </View>
    );
  }
  const { e, m, comp, stage } = um;

  function finish() {
    if (finalized.current) return;
    finalized.current = true;
    try {
      finalizeMatch(W, e, m, S.current);
    } catch (err) {
      logError(W, 'finalizeMatch', err);
    }
    bcEnd(W, 'match', 0);
    setPhase('post');
    G.refresh();
    G.save(true);
  }

  const start = (quick = false) => {
    thud();
    bcStart(W, 'match');
    S.current = prepareMatch(W, e, m, true);
    setPhase('live');
    if (quick) {
      simulateFull(W, S.current);
      finish();
    } else setRunning(true);
  };

  const title = comp.kind === 'friendly' ? m.label || 'Товарищеский матч' : `${comp.name} · ${stage.name}`;

  // ---------- перед матчем ----------
  if (phase === 'pre') {
    const mySide = me === 0 ? m.h : m.a;
    const opp = me === 0 ? m.a : m.h;
    const myLu = resolveLineup(W, teamPool(W, mySide), teamTactic(W, mySide));
    const opLu = resolveLineup(W, teamPool(W, opp), teamTactic(W, opp));
    const avg = (lu) => {
      const ps = lu.xi.filter(Boolean).map((id) => W.players[id]);
      return ps.length ? Math.round(ps.reduce((a, p) => a + p.ovr, 0) / ps.length) : 0;
    };
    const form = (id) => lastResults(W, id, 5).map(({ m: mm }) => resultLetter(mm, id)).reverse();
    const keyPlayers = opLu.xi.filter(Boolean).map((id) => W.players[id]).sort((a, b) => b.ovr - a.ovr).slice(0, 3);
    const slots = FORMATIONS[teamTactic(W, mySide).form];
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
          <LinearGradient colors={[teamColor(W, m.h) + '55', C.bg]} style={{ paddingTop: 10, paddingHorizontal: 14, paddingBottom: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <IconBtn name="chevron-back" onPress={G.pop} size={38} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={st.kicker}>{fmtDate(W.year, W.day, true).toUpperCase()}</Text>
                <Text style={st.kicker2} numberOfLines={1}>{title.toUpperCase()}</Text>
              </View>
              <View style={{ width: 38 }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 18 }}>
              <TeamHead W={W} id={m.h} me={me === 0} avg={avg(me === 0 ? myLu : opLu)} form={form(m.h)} />
              <Text style={st.vsBig}>VS</Text>
              <TeamHead W={W} id={m.a} me={me === 1} avg={avg(me === 1 ? myLu : opLu)} form={form(m.a)} />
            </View>
            {stage.neutral ? <T muted center size={12} style={{ marginTop: 10 }}>Нейтральное поле</T> : null}
          </LinearGradient>

          <View style={{ paddingHorizontal: 14 }}>
            <Card title={`Ваш состав · ${teamTactic(W, mySide).form}`} icon="people" right={<Pressable onPress={() => G.push('tactics', { team: mySide })}><Text style={{ color: C.gold, fontWeight: '700', fontSize: 12 }}>Изменить</Text></Pressable>}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {myLu.xi.map((id, i) => {
                  const p = id ? W.players[id] : null;
                  return (
                    <View key={i} style={st.xiChip}>
                      <Text style={st.xiPos}>{POS_RU[slots[i][0]]}</Text>
                      <Text style={st.xiName} numberOfLines={1}>{p ? p.n.split(' ').slice(-1)[0] : '—'}</Text>
                      {p ? <Text style={[st.xiOvr, { color: ratingColor(p.ovr) }]}>{p.ovr}</Text> : null}
                    </View>
                  );
                })}
              </View>
            </Card>
            <Card title="Опасные игроки соперника" icon="warning-outline">
              {keyPlayers.map((p) => (
                <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 }}>
                  <PosBadge pos={p.pos} size="sm" />
                  <T size={14} style={{ flex: 1 }} numberOfLines={1}>{p.n}</T>
                  <Rating v={p.ovr} size="sm" />
                </View>
              ))}
            </Card>
            <Card title="Замены" icon="swap-vertical">
              <Seg options={[{ value: true, label: 'Автоматически' }, { value: false, label: 'Вручную' }]} value={W.user.autoSubs !== false} onChange={(v) => { W.user.autoSubs = v; G.refresh(); }} />
              <T muted size={12} style={{ marginTop: 6 }}>В ручном режиме игра встаёт на паузу при травме или удалении вашего игрока.</T>
            </Card>
          </View>
        </ScrollView>
        <View style={st.bottom}>
          <Btn title="НАЧАТЬ МАТЧ" icon="play" onPress={() => start(false)} />
          <Btn title="Быстрый результат" icon="flash" kind="ghost" small onPress={() => start(true)} style={{ marginTop: 8 }} />
        </View>
      </View>
    );
  }

  const s = S.current;
  const side = me === 0 ? s.h : s.a;
  const totalPoss = s.poss[0] + s.poss[1] || 1;
  const pct0 = Math.round((s.poss[0] / totalPoss) * 100);
  const scorers = (si) => s.goals.filter((g) => g[1] === si).map((g) => `${(W.players[g[2]]?.n || '').split(' ').slice(-1)[0]}${g[4] === 'pen' ? ' (п)' : g[4] === 'og' ? ' (авт)' : ''} ${g[0]}'`);
  const minute = s.done ? 'FT' : s.min === 0 ? "0'" : `${clockLabel(s)}'`;

  const header = (
    <LinearGradient colors={['#141E33', C.bg]} style={{ borderBottomWidth: 1, borderBottomColor: C.line }}>
      <View style={{ flexDirection: 'row', height: 3 }}>
        <View style={{ flex: 1, backgroundColor: me === 0 ? C.gold : teamColor(W, m.h) }} />
        <View style={{ flex: 1, backgroundColor: me === 1 ? C.gold : teamColor(W, m.a) }} />
      </View>
      <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12 }}>
        <Text style={[st.kicker2, { textAlign: 'center' }]} numberOfLines={1}>{title.toUpperCase()}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 30 }}>{teamFlag(W, m.h)}</Text>
            <Text style={[st.bugName, me === 0 && { color: C.gold }]} numberOfLines={2}>{s.h.name}</Text>
          </View>
          <View style={{ alignItems: 'center', minWidth: 124 }}>
            <View style={st.scoreBox}>
              <Text style={st.scoreNum}>{s.score[0]}</Text>
              <Text style={st.scoreSep}>:</Text>
              <Text style={st.scoreNum}>{s.score[1]}</Text>
            </View>
            {s.pens ? <T size={12} muted style={{ marginTop: 2 }}>пен. {s.pens[0]}:{s.pens[1]}</T> : null}
            <View style={[st.minute, s.done && { backgroundColor: C.card3 }, running && { backgroundColor: C.accent }]}>
              {running ? <View style={st.liveDot} /> : null}
              <Text style={[st.minuteText, s.done && { color: C.muted }]}>{minute}</Text>
            </View>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 30 }}>{teamFlag(W, m.a)}</Text>
            <Text style={[st.bugName, me === 1 && { color: C.gold }]} numberOfLines={2}>{s.a.name}</Text>
          </View>
        </View>
        {s.goals.length ? (
          <View style={{ flexDirection: 'row', marginTop: 8, gap: 16 }}>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>{scorers(0).map((x, i) => <T key={i} size={11} muted>{x} ⚽</T>)}</View>
            <View style={{ flex: 1 }}>{scorers(1).map((x, i) => <T key={i} size={11} muted>⚽ {x}</T>)}</View>
          </View>
        ) : null}
        <View style={st.statRow}>
          <StatLine label="Владение" a={`${pct0}%`} b={`${100 - pct0}%`} va={pct0} vb={100 - pct0} me={me} />
          <StatLine label="Удары (в створ)" a={`${s.shots[0]} (${s.sot[0]})`} b={`${s.shots[1]} (${s.sot[1]})`} va={s.shots[0]} vb={s.shots[1]} me={me} />
          {phase === 'post' ? (
            <>
              <StatLine label="Угловые" a={`${s.corners[0]}`} b={`${s.corners[1]}`} va={s.corners[0]} vb={s.corners[1]} me={me} />
              <StatLine label="Фолы" a={`${(s.fouls || [0, 0])[0]}`} b={`${(s.fouls || [0, 0])[1]}`} va={(s.fouls || [0, 0])[0]} vb={(s.fouls || [0, 0])[1]} me={me} />
              <StatLine label="Офсайды" a={`${(s.offs || [0, 0])[0]}`} b={`${(s.offs || [0, 0])[1]}`} va={(s.offs || [0, 0])[0]} vb={(s.offs || [0, 0])[1]} me={me} />
            </>
          ) : null}
        </View>
      </View>
      <Bar value={s.min} max={s.phase === 'et' || s.min > 90 ? 120 : 90} color={C.gold} height={3} style={{ borderRadius: 0 }} />
    </LinearGradient>
  );

  // ---------- итог ----------
  if (phase === 'post') {
    const all = [...[...s.h.played].map((id) => [id, 0]), ...[...s.a.played].map((id) => [id, 1])];
    const best = all.reduce((b, x) => ((s.rating[x[0]] || 0) > (s.rating[b?.[0]] || 0) ? x : b), null);
    const mine = [...side.played].map((id) => W.players[id]).filter(Boolean).sort((a, b) => (s.rating[b.id] || 0) - (s.rating[a.id] || 0));
    const my = s.score[me];
    const th = s.score[1 - me];
    const res = my > th || (s.pens && s.pens[me] > s.pens[1 - me]) ? 'ПОБЕДА' : my < th || s.pens ? 'ПОРАЖЕНИЕ' : 'НИЧЬЯ';
    const resCol = res === 'ПОБЕДА' ? C.accent : res === 'ПОРАЖЕНИЕ' ? C.red : C.gold;
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {header}
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 120 }}>
          <View style={[st.resultBanner, { borderColor: resCol + '66', backgroundColor: resCol + '18' }]}>
            <Text style={[st.resultText, { color: resCol }]}>{res}</Text>
          </View>
          {best ? (
            <LinearGradient colors={['#3A2A0E', C.card]} style={st.motm}>
              <Icon name="star" size={22} color={C.gold} />
              <View style={{ flex: 1 }}>
                <Text style={st.kicker}>ИГРОК МАТЧА</Text>
                <T display size={22} numberOfLines={1}>{W.players[best[0]]?.n}</T>
              </View>
              <Text style={[st.bigRate, { color: C.gold }]}>{(s.rating[best[0]] || 0).toFixed(1)}</Text>
            </LinearGradient>
          ) : null}
          <Card title="Оценки ваших игроков" icon="stats-chart">
            {mine.map((p) => {
              const r = s.rating[p.id] || 6;
              const col = r >= 7.5 ? C.accent : r >= 6.5 ? '#9BE15D' : r >= 5.8 ? C.orange : C.red;
              const g = s.goals.filter((x) => x[2] === p.id).length;
              const a = s.goals.filter((x) => x[3] === p.id).length;
              return (
                <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 }}>
                  <PosBadge pos={p.pos} size="sm" />
                  <T size={14} style={{ flex: 1 }} numberOfLines={1}>{p.n}{g ? `  ⚽${g > 1 ? '×' + g : ''}` : ''}{a ? `  🅰${a > 1 ? '×' + a : ''}` : ''}</T>
                  <View style={[st.rateChip, { backgroundColor: col + '22' }]}>
                    <Text style={{ color: col, fontFamily: F.d8, fontSize: 16 }}>{r.toFixed(1)}</Text>
                  </View>
                </View>
              );
            })}
          </Card>
        </ScrollView>
        <View style={st.bottom}>
          <Btn title="ПРОДОЛЖИТЬ" icon="checkmark" onPress={() => G.pop()} />
        </View>
      </View>
    );
  }

  // ---------- трансляция ----------
  const slots = FORMATIONS[side.tac.form];
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {header}
      {showPitch && !panel ? (
        <View style={{ paddingTop: 10, paddingHorizontal: 14 }}>
          <MatchPitch S={s} me={me} tickMs={SPEEDS[speed]} width={Math.min(winW - 28, 520)} />
        </View>
      ) : null}
      {panel === 'tactic' ? (
        <View style={st.sheet}>
          <Text style={st.sheetTitle}>НАСТРОЙ · {MENTALITY[side.tac.ment].toUpperCase()}</Text>
          <Seg options={MENTALITY.map((x, i) => ({ value: i, label: ['−−', '−', '=', '+', '++'][i] }))} value={side.tac.ment} onChange={(v) => { side.tac.ment = v; s.cache = null; setN((n) => n + 1); }} />
          <Text style={[st.sheetTitle, { marginTop: 10 }]}>ПРЕССИНГ</Text>
          <Seg options={['Низкий', 'Средний', 'Высокий'].map((x, i) => ({ value: i, label: x }))} value={side.tac.press} onChange={(v) => { side.tac.press = v; s.cache = null; setN((n) => n + 1); }} />
        </View>
      ) : null}
      {panel === 'subs' ? (
        <View style={[st.sheet, { maxHeight: 340 }]}>
          <Text style={st.sheetTitle}>{subOut ? 'КОГО ВЫПУСТИТЬ?' : `КОГО ЗАМЕНИТЬ? · ОСТАЛОСЬ ЗАМЕН: ${side.subsLeft}`}</Text>
          <ScrollView>
            {!subOut
              ? side.xi.map((id, i) => {
                  if (!id) return null;
                  const p = W.players[id];
                  const fit = side.fit[id] ?? p.fit;
                  return (
                    <Pressable key={id} onPress={() => { if (side.subsLeft > 0) { tap(); setSubOut(id); } }} style={st.subRow}>
                      <Text style={st.subPos}>{POS_RU[slots[i][0]]}</Text>
                      <T size={14} style={{ flex: 1 }} numberOfLines={1}>{p.n}</T>
                      {side.injured?.has(id) ? <Icon name="medkit" size={14} color={C.red} /> : null}
                      {side.yc[id] ? <Icon name="square" size={12} color="#FFD23F" /> : null}
                      <Bar value={fit} color={fit < 65 ? C.red : fit < 78 ? C.orange : C.accent} style={{ width: 46 }} />
                      <Text style={{ color: C.text, fontFamily: F.d7, fontSize: 15, width: 30, textAlign: 'right' }}>{(s.rating[id] || 6.2).toFixed(1)}</Text>
                    </Pressable>
                  );
                })
              : side.bench.map((id) => {
                  const p = W.players[id];
                  const slotPos = slots[side.xi.indexOf(subOut)]?.[0];
                  return (
                    <Pressable key={id} onPress={() => { thud(); doSub(W, s, me, subOut, id); setSubOut(null); setN((n) => n + 1); }} style={st.subRow}>
                      <PosBadge pos={p.pos} size="sm" />
                      <T size={14} style={{ flex: 1 }} numberOfLines={1}>{p.n}</T>
                      <T size={12} muted>на {POS_RU[slotPos]}</T>
                      <Rating v={slotPos ? Math.round(slotRating(p, slotPos)) : p.ovr} size="sm" />
                    </Pressable>
                  );
                })}
            {subOut ? <Btn small kind="ghost" title="Отмена" onPress={() => setSubOut(null)} style={{ marginVertical: 8 }} /> : null}
          </ScrollView>
        </View>
      ) : null}
      <FlatList
        data={s.ev.slice(-80).reverse()}
        keyExtractor={(_, i) => String(s.ev.length - i)}
        contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 8, paddingBottom: 110 }}
        renderItem={({ item }) => {
          const ev = EV[item.type] || EV.info;
          const isGoal = item.type === 'goal';
          const sideCol = item.side === me ? C.gold : item.side === -1 ? 'transparent' : C.blue;
          return (
            <View style={[st.ev, isGoal && { backgroundColor: item.side === me ? C.accentDim : C.redDim }]}>
              <View style={[st.evSide, { backgroundColor: sideCol }]} />
              <Text style={st.evMin}>{item.mt || item.min}'</Text>
              <View style={[st.evIcon, { backgroundColor: ev.color + '22' }]}>
                <Icon name={ev.icon} size={13} color={ev.color} />
              </View>
              <T size={13.5} style={{ flex: 1, lineHeight: 19 }} color={item.side === -1 ? C.gold : isGoal ? C.text : '#C9D2E3'} bold={isGoal}>{item.text}</T>
            </View>
          );
        }}
      />
      <View style={st.controls}>
        <Pressable onPress={() => { tap(); setPanel(null); setRunning(!running); }} style={[st.play, s.done && { opacity: 0.4 }]} disabled={s.done}>
          <Icon name={running ? 'pause' : 'play'} size={26} color="#1A1206" />
        </Pressable>
        <CtrlBtn icon="speedometer" label={`x${speed}`} onPress={() => setSpeed(speed === 1 ? 2 : speed === 2 ? 4 : 1)} />
        <CtrlBtn icon={showPitch ? 'list' : 'football-outline'} label={showPitch ? 'Лента' : 'Поле'} active={false} onPress={() => setShowPitch(!showPitch)} />
        <CtrlBtn icon="swap-vertical" label={`Замены ${side.subsLeft}`} active={panel === 'subs'} onPress={() => { setRunning(false); setPanel(panel === 'subs' ? null : 'subs'); setSubOut(null); }} />
        <CtrlBtn icon="options" label="Тактика" active={panel === 'tactic'} onPress={() => { setRunning(false); setPanel(panel === 'tactic' ? null : 'tactic'); }} />
        <CtrlBtn icon="play-skip-forward" label="До конца" onPress={() => { setRunning(false); simulateFull(W, s); finish(); setN((n) => n + 1); }} />
      </View>
    </View>
  );
}

function CtrlBtn({ icon, label, onPress, active }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} style={({ pressed }) => [st.ctrl, active && { backgroundColor: C.goldDim, borderColor: C.gold + '66' }, pressed && { opacity: 0.7 }]}>
      <Icon name={icon} size={18} color={active ? C.gold : C.text} />
      <Text style={[st.ctrlText, active && { color: C.gold }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function StatLine({ label, a, b, va, vb, me }) {
  const tot = va + vb || 1;
  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={st.statVal}>{a}</Text>
        <T muted size={11}>{label}</T>
        <Text style={st.statVal}>{b}</Text>
      </View>
      <View style={{ flexDirection: 'row', height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 4, gap: 2 }}>
        <View style={{ flex: va / tot, backgroundColor: me === 0 ? C.gold : C.blue, borderRadius: 3 }} />
        <View style={{ flex: vb / tot, backgroundColor: me === 1 ? C.gold : C.blue, borderRadius: 3, opacity: 0.8 }} />
      </View>
    </View>
  );
}

function TeamHead({ W, id, me, avg, form }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <View style={[st.ring, { borderColor: me ? C.gold : teamColor(W, id) }]}>
        <Text style={{ fontSize: 36 }}>{teamFlag(W, id)}</Text>
      </View>
      <Text style={[st.headName, me && { color: C.gold }]} numberOfLines={2}>{teamName(W, id)}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
        <Text style={{ color: ratingColor(avg), fontFamily: F.d8, fontSize: 18 }}>{avg}</Text>
        <T muted size={11}>сила</T>
      </View>
      <View style={{ flexDirection: 'row', gap: 3, marginTop: 5 }}>
        {form.map((f, i) => (
          <View key={i} style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: f === 'W' ? C.accent : f === 'L' ? C.red : C.dim }} />
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  kicker: { color: C.muted, fontSize: 12, fontFamily: F.d7, letterSpacing: 1.2 },
  kicker2: { color: C.text, fontSize: 14, fontFamily: F.d7, letterSpacing: 1, marginTop: 1 },
  vsBig: { color: C.dim, fontSize: 26, fontFamily: F.d8, marginHorizontal: 4 },
  ring: { width: 82, height: 82, borderRadius: 41, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg2 },
  headName: { color: C.text, fontSize: 19, fontFamily: F.d8, textAlign: 'center', marginTop: 8 },
  xiChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.bg2, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: C.line },
  xiPos: { color: C.muted, fontFamily: F.d7, fontSize: 12 },
  xiName: { color: C.text, fontSize: 13, fontWeight: '600', maxWidth: 96 },
  xiOvr: { fontFamily: F.d8, fontSize: 14 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 14, paddingBottom: 12, backgroundColor: 'rgba(10,15,28,0.96)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  bugName: { color: C.text, fontSize: 16, fontFamily: F.d7, textAlign: 'center', marginTop: 4 },
  scoreBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#05080F', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 2, borderWidth: 1, borderColor: C.line },
  scoreNum: { color: C.text, fontSize: 42, fontFamily: F.d8, fontVariant: ['tabular-nums'] },
  scoreSep: { color: C.dim, fontSize: 32, fontFamily: F.d8, marginHorizontal: 6 },
  minute: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, backgroundColor: C.gold, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 2 },
  minuteText: { color: '#1A1206', fontFamily: F.d8, fontSize: 15, letterSpacing: 0.5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#04210F' },
  statRow: { marginTop: 6 },
  statVal: { color: C.text, fontFamily: F.d7, fontSize: 14 },
  sheet: { marginHorizontal: 14, marginTop: 10, backgroundColor: C.card, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: C.line },
  sheetTitle: { color: C.muted, fontFamily: F.d7, fontSize: 12, letterSpacing: 1.2, marginBottom: 8 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  subPos: { color: C.muted, fontFamily: F.d7, fontSize: 13, width: 26 },
  ev: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingVertical: 9, paddingRight: 8, borderRadius: 10, marginBottom: 2 },
  evSide: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  evMin: { color: C.muted, fontFamily: F.d7, fontSize: 14, width: 38, textAlign: 'right', marginTop: 1 },
  evIcon: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  controls: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, backgroundColor: 'rgba(10,15,28,0.97)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  play: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  ctrl: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 7, borderRadius: 12, backgroundColor: C.card2, borderWidth: 1, borderColor: C.line },
  ctrlText: { color: C.text, fontSize: 10, fontWeight: '700' },
  resultBanner: { borderRadius: 14, borderWidth: 1, paddingVertical: 8, alignItems: 'center', marginBottom: 12 },
  resultText: { fontFamily: F.d8, fontSize: 24, letterSpacing: 3 },
  motm: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.gold + '55' },
  bigRate: { fontFamily: F.d8, fontSize: 30 },
  rateChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 1, minWidth: 44, alignItems: 'center' },
});
