import React, { useEffect, useRef, useState } from 'react';
import Crest from '../ui/Crest';
import { View, Text, Pressable, FlatList, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, T, Card, Btn, Seg, Bar, Icon, IconBtn, Rating, ratingColor, tap, thud } from '../ui/kit';
import { useG } from '../ui/ctx';
import { userMatchToday, prepareMatch, finalizeMatch } from '../engine/sim';
import { stepMinute, simulateFull, doSub, resolveLineup, clockLabel } from '../engine/match';
import MatchPitch from '../ui/MatchPitch';
import { buildSequence } from '../engine/playbyplay';
import { teamName, teamFlag, teamColor, teamPool, teamTactic, isUserTeam } from '../engine/teams';
import { FORMATIONS, MENTALITY, POS_RU, slotRating, fmtDate } from '../engine/util';
import { PosBadge } from '../ui/playerRow';
import { lastResults, resultLetter } from '../engine/query';
import { bcStart, bcEnd, logError } from '../diag';

// длительность одной игровой минуты на экране, мс
const SPEEDS = { 1: 2600, 2: 1400, 4: 650, 8: 200 };
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
  const [view, setView] = useState('feed');
  const [showPitch, setShowPitch] = useState(true);
  const { width: winW } = useWindowDimensions();
  const finalized = useRef(false);
  const [seq, setSeq] = useState({ id: 0, steps: [] });
  const prevBall = useRef(null);
  const [shown, setShown] = useState(1); // сколько событий ленты уже «случилось» на экране
  const [disp, setDisp] = useState([0, 0]); // счёт на табло (обновляется, когда мяч долетел)
  const reveal = useRef(null);

  const me = um ? (isUserTeam(W, um.m.h) ? 0 : 1) : 0;

  const showAll = () => {
    const s = S.current;
    if (!s) return;
    if (reveal.current) clearTimeout(reveal.current);
    setShown(s.ev.length);
    setDisp([...s.score]);
  };

  useEffect(() => {
    if (!running) return undefined;
    let timer = null;
    let alive = true;
    const ms = SPEEDS[speed];
    const tick = () => {
      if (!alive) return;
      const s = S.current;
      if (!s) return;
      const before = s.ev.length;
      stepMinute(W, s);
      const newEv = s.ev.slice(before);
      // розыгрыш для поля
      let steps = [];
      try {
        steps = buildSequence(W, s, prevBall.current);
      } catch (err) {
        steps = [];
      }
      if (steps.length) {
        const last = steps[steps.length - 1];
        prevBall.current = { x: last.x, y: last.y, side: last.side, slot: last.slot };
        if (['goal', 'save', 'miss', 'post', 'var'].includes(last.kind)) prevBall.current = { x: 0.5, y: 0.5, side: last.kind === 'save' ? last.side : 1 - (s.ball?.side ?? 0), slot: -1 };
      }
      setSeq((q) => ({ id: q.id + 1, steps }));
      // лента и табло догоняют мяч к концу розыгрыша
      if (reveal.current) clearTimeout(reveal.current);
      const delay = showPitch && ms >= 450 ? ms * 0.85 : 0;
      reveal.current = setTimeout(() => {
        setShown(s.ev.length);
        setDisp([...s.score]);
        if (newEv.some((e) => e.type === 'goal')) thud();
      }, delay);
      let stop = false;
      if (s.htPause) {
        s.htPause = false;
        stop = true;
      }
      if (newEv.some((e) => e.side === me && (e.type === 'inj' || e.type === 'red')) && W.user.autoSubs === false) stop = true;
      if (s.done) {
        stop = true;
        setTimeout(() => { showAll(); finish(); }, delay + 300);
      }
      setN((n) => n + 1);
      if (stop) {
        setTimeout(() => setRunning(false), delay);
        return;
      }
      timer = setTimeout(tick, ms);
    };
    timer = setTimeout(tick, 60);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
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
      setShown(S.current.ev.length);
      setDisp([...S.current.score]);
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
  const live = phase === 'live';
  const score = live ? disp : s.score;
  const goalsShown = live ? s.goals.slice(0, disp[0] + disp[1]) : s.goals;
  const scorers = (si) => goalsShown.filter((g) => g[1] === si).map((g) => `${(W.players[g[2]]?.n || '').split(' ').slice(-1)[0]}${g[4] === 'pen' ? ' (п)' : g[4] === 'og' ? ' (авт)' : ''} ${g[0]}'`);
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
            <Crest W={W} id={m.h} size={40} />
            <Text style={[st.bugName, me === 0 && { color: C.gold }]} numberOfLines={2}>{s.h.name}</Text>
          </View>
          <View style={{ alignItems: 'center', minWidth: 124 }}>
            <View style={st.scoreBox}>
              <Text style={st.scoreNum}>{score[0]}</Text>
              <Text style={st.scoreSep}>:</Text>
              <Text style={st.scoreNum}>{score[1]}</Text>
            </View>
            {s.pens ? <T size={12} muted style={{ marginTop: 2 }}>пен. {s.pens[0]}:{s.pens[1]}</T> : null}
            <View style={[st.minute, s.done && { backgroundColor: C.card3 }, running && { backgroundColor: C.accent }]}>
              {running ? <View style={st.liveDot} /> : null}
              <Text style={[st.minuteText, s.done && { color: C.muted }]}>{minute}</Text>
            </View>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Crest W={W} id={m.a} size={40} />
            <Text style={[st.bugName, me === 1 && { color: C.gold }]} numberOfLines={2}>{s.a.name}</Text>
          </View>
        </View>
        {goalsShown.length ? (
          <View style={{ flexDirection: 'row', marginTop: 8, gap: 16 }}>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>{scorers(0).map((x, i) => <T key={i} size={11} muted>{x} ⚽</T>)}</View>
            <View style={{ flex: 1 }}>{scorers(1).map((x, i) => <T key={i} size={11} muted>⚽ {x}</T>)}</View>
          </View>
        ) : null}
        <View style={st.statRow}>
          <StatLine label="Владение" a={`${pct0}%`} b={`${100 - pct0}%`} va={pct0} vb={100 - pct0} me={me} />
          <StatLine label="xG · удары" a={`${(s.xg || [0, 0])[0].toFixed(2)} · ${s.shots[0]}`} b={`${s.shots[1]} · ${(s.xg || [0, 0])[1].toFixed(2)}`} va={(s.xg || [0, 0])[0]} vb={(s.xg || [0, 0])[1]} me={me} />
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
          <FullStats W={W} s={s} me={me} />
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
          <MatchPitch W={W} S={s} me={me} seq={seq.steps} seqId={seq.id} minuteMs={SPEEDS[speed]} width={Math.min(winW - 28, 520)} />
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
              : side.bench.slice().sort((x, y) => { const sp = slots[side.xi.indexOf(subOut)]?.[0]; return sp ? slotRating(W.players[y], sp) - slotRating(W.players[x], sp) : 0; }).map((id) => {
                  const p = W.players[id];
                  const slotPos = slots[side.xi.indexOf(subOut)]?.[0];
                  const bf = side.fit[id] ?? p.fit;
                  return (
                    <Pressable key={id} onPress={() => { thud(); doSub(W, s, me, subOut, id); setSubOut(null); setN((n) => n + 1); }} style={st.subRow}>
                      <PosBadge pos={p.pos} size="sm" />
                      <T size={14} style={{ flex: 1 }} numberOfLines={1}>{p.n}</T>
                      <Bar value={bf} color={bf < 65 ? C.red : bf < 78 ? C.orange : C.accent} style={{ width: 40 }} />
                      <T size={12} muted>на {POS_RU[slotPos]}</T>
                      <Rating v={slotPos ? Math.round(slotRating(p, slotPos)) : p.ovr} size="sm" />
                    </Pressable>
                  );
                })}
            {subOut ? <Btn small kind="ghost" title="Отмена" onPress={() => setSubOut(null)} style={{ marginVertical: 8 }} /> : null}
          </ScrollView>
        </View>
      ) : null}
      {!panel ? (
        <View style={{ paddingHorizontal: 14, paddingTop: 8 }}>
          <Seg options={[{ value: 'feed', label: 'Лента' }, { value: 'stats', label: 'Статистика' }]} value={view} onChange={setView} />
        </View>
      ) : null}
      {view === 'stats' && !panel ? (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 110 }}>
          <FullStats W={W} s={s} me={me} />
        </ScrollView>
      ) : (
      <FlatList
        data={s.ev.slice(0, Math.max(1, shown)).slice(-80).reverse()}
        keyExtractor={(_, i) => String(Math.max(1, shown) - i)}
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
      )}
      <View style={st.controls}>
        <Pressable onPress={() => { tap(); setPanel(null); setRunning(!running); }} style={[st.play, s.done && { opacity: 0.4 }]} disabled={s.done}>
          <Icon name={running ? 'pause' : 'play'} size={26} color="#1A1206" />
        </Pressable>
        <CtrlBtn icon="speedometer" label={`x${speed}`} onPress={() => setSpeed(speed === 1 ? 2 : speed === 2 ? 4 : speed === 4 ? 8 : 1)} />
        <CtrlBtn icon={showPitch ? 'list' : 'football-outline'} label={showPitch ? 'Лента' : 'Поле'} active={false} onPress={() => setShowPitch(!showPitch)} />
        <CtrlBtn icon="swap-vertical" label={`Замены ${side.subsLeft}`} active={panel === 'subs'} onPress={() => { setRunning(false); setPanel(panel === 'subs' ? null : 'subs'); setSubOut(null); }} />
        <CtrlBtn icon="options" label="Тактика" active={panel === 'tactic'} onPress={() => { setRunning(false); setPanel(panel === 'tactic' ? null : 'tactic'); }} />
        <CtrlBtn icon="play-skip-forward" label="До конца" onPress={() => { setRunning(false); simulateFull(W, s); showAll(); finish(); setN((n) => n + 1); }} />
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

// Полная статистика матча
function FullStats({ W, s, me }) {
  const z = (k) => s[k] || [0, 0];
  const tot = s.poss[0] + s.poss[1] || 1;
  const p0 = Math.round((s.poss[0] / tot) * 100);
  // передачи и точность — от владения и паса игроков на поле
  const passStats = (si) => {
    const sd = si === 0 ? s.h : s.a;
    const ids = [...sd.played];
    const avgPas = ids.length ? ids.reduce((a, id) => a + (W.players[id]?.a.pas || 60), 0) / ids.length : 60;
    const share = si === 0 ? p0 / 100 : 1 - p0 / 100;
    const mins = Math.max(1, Math.min(s.min, 120));
    const passes = Math.round(share * 9.6 * mins * (0.85 + sd.tac.tempo * 0.08));
    const acc = Math.round(Math.max(62, Math.min(93, 70 + (avgPas - 60) * 0.55 + (share - 0.5) * 20)));
    return { passes, acc };
  };
  const ps = [passStats(0), passStats(1)];
  const rows = [
    ['Ожидаемые голы (xG)', z('xg')[0].toFixed(2), z('xg')[1].toFixed(2), z('xg')[0], z('xg')[1]],
    ['Владение', `${p0}%`, `${100 - p0}%`, p0, 100 - p0],
    ['Удары', s.shots[0], s.shots[1], s.shots[0], s.shots[1]],
    ['Удары в створ', s.sot[0], s.sot[1], s.sot[0], s.sot[1]],
    ['Большие моменты', z('big')[0], z('big')[1], z('big')[0], z('big')[1]],
    ['Сейвы', z('saves')[0], z('saves')[1], z('saves')[0], z('saves')[1]],
    ['Передачи', ps[0].passes, ps[1].passes, ps[0].passes, ps[1].passes],
    ['Точность передач', `${ps[0].acc}%`, `${ps[1].acc}%`, ps[0].acc, ps[1].acc],
    ['Угловые', s.corners[0], s.corners[1], s.corners[0], s.corners[1]],
    ['Офсайды', z('offs')[0], z('offs')[1], z('offs')[0], z('offs')[1]],
    ['Фолы', z('fouls')[0], z('fouls')[1], z('fouls')[0], z('fouls')[1]],
    ['Жёлтые карточки', z('ycN')[0], z('ycN')[1], z('ycN')[0], z('ycN')[1]],
    ['Красные карточки', z('rcN')[0], z('rcN')[1], z('rcN')[0], z('rcN')[1]],
  ];
  return (
    <Card title="Статистика матча" icon="stats-chart">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
        <T bold size={13} color={me === 0 ? C.gold : C.text} numberOfLines={1} style={{ flex: 1 }}>{s.h.short || s.h.name}</T>
        <T bold size={13} color={me === 1 ? C.gold : C.text} numberOfLines={1} style={{ flex: 1, textAlign: 'right' }}>{s.a.short || s.a.name}</T>
      </View>
      {rows.map(([l, a, b, va, vb]) => <StatLine key={l} label={l} a={`${a}`} b={`${b}`} va={+va || 0} vb={+vb || 0} me={me} />)}
    </Card>
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
        <Crest W={W} id={id} size={46} />
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
