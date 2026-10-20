import React, { useMemo, useState } from 'react';
import Crest from '../ui/Crest';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { C, F, T, Card, Empty, SubTabs, Icon, Badge, tap } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import { teamMatches, resultLetter, scoreText, userTeamIds, topScorers } from '../engine/query';
import { teamName, teamFlag, isNat } from '../engine/teams';
import { dayToDate, fmtShort, seasonLabel } from '../engine/util';
import { CompView, CompsList } from './Comps';
import { sortRows } from '../engine/comps';
import { cupProgress } from '../engine/board';
import { HistoryBody } from './Career';

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function Schedule() {
  const G = useG();
  const W = G.W;
  const teams = userTeamIds(W);
  const [only, setOnly] = useState('all');
  const list = useMemo(() => {
    const all = [];
    for (const t of teams) for (const x of teamMatches(W, t)) all.push({ ...x, team: t });
    return all.sort((a, b) => a.day - b.day);
  }, [G.tick]);
  const shown = list.filter((x) => only === 'all' || (only === 'res' ? x.m.hg !== null : x.m.hg === null));
  if (!list.length) return <Empty text="Матчей пока нет." icon="calendar-outline" />;
  let lastMonth = -1;
  return (
    <>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
        {[['all', 'Все'], ['next', 'Предстоящие'], ['res', 'Результаты']].map(([k, l]) => (
          <Pressable key={k} onPress={() => { tap(); setOnly(k); }} style={[st.filter, only === k && st.filterOn]}>
            <Text style={[st.filterT, only === k && { color: '#1A1206' }]}>{l}</Text>
          </Pressable>
        ))}
      </View>
      {shown.map(({ m, comp, stage, ri, team }, i) => {
        const d = dayToDate(W.year, m.day);
        const mo = d.getUTCMonth();
        const head = mo !== lastMonth ? <Text key={`m${i}`} style={st.month}>{MONTHS[mo].toUpperCase()} {d.getUTCFullYear()}</Text> : null;
        lastMonth = mo;
        const home = m.h === team;
        const opp = home ? m.a : m.h;
        const played = m.hg !== null;
        const L = played ? resultLetter(m, team) : null;
        const isToday = m.day === W.day && !played;
        const label = comp.kind === 'friendly' ? 'Товарищеский' : comp.kind === 'league' ? `${comp.name} · ${ri + 1} тур` : `${comp.name} · ${stage.name}`;
        return (
          <React.Fragment key={`${comp.id}-${m.day}-${opp}`}>
            {head}
            <Pressable onPress={() => { tap(); isToday ? G.push('match') : G.push('team', { id: opp }); }} style={[st.fix, isToday && { borderColor: C.gold + '88' }]}>
              <View style={st.date}>
                <Text style={st.dateD}>{d.getUTCDate()}</Text>
                <Text style={st.dateM}>{['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][d.getUTCDay()]}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[st.ha, { backgroundColor: home ? C.accentDim : C.blueDim, color: home ? C.accent : C.blue }]}>{home ? 'Д' : 'Г'}</Text>
                  <Crest W={W} id={opp} size={18} />
                  <T bold size={14} numberOfLines={1} style={{ flexShrink: 1 }}>{teamName(W, opp)}</T>
                </View>
                <T muted size={11} numberOfLines={1} style={{ marginTop: 3 }}>{isNat(team) ? 'Сборная · ' : ''}{label}</T>
              </View>
              {played ? (
                <View style={[st.score, { backgroundColor: L === 'W' ? C.accentDim : L === 'L' ? C.redDim : C.card3 }]}>
                  <Text style={[st.scoreT, { color: L === 'W' ? C.accent : L === 'L' ? C.red : C.text }]}>{home ? scoreText(m) : scoreText({ ...m, hg: m.ag, ag: m.hg, pen: m.pen ? [m.pen[1], m.pen[0]] : null })}</Text>
                </View>
              ) : isToday ? (
                <Badge text="СЕГОДНЯ" color={C.gold} />
              ) : (
                <Icon name="chevron-forward" size={16} color={C.dim} />
              )}
            </Pressable>
          </React.Fragment>
        );
      })}
    </>
  );
}

const inStage = (st, t) => st.rounds.some((r) => r.some((m) => m.h === t || m.a === t));
const ORDER = { league: 0, cup: 1, qual: 2 };

// Все турниры моей команды и сборной на одном экране
function MyComps() {
  const G = useG();
  const W = G.W;
  const teams = userTeamIds(W);
  const items = [];
  for (const c of Object.values(W.comps)) {
    if (c.kind === 'friendly') continue;
    for (const t of teams) if (c.stages.some((st) => inStage(st, t)) || c.teams?.includes(t)) { items.push({ c, t }); break; }
  }
  items.sort((a, b) => (isNat(a.t) - isNat(b.t)) || (ORDER[a.c.kind] ?? 3) - (ORDER[b.c.kind] ?? 3) || (a.c.id.startsWith('CUP') ? -1 : 1));
  if (!items.length) return <Empty text="Турниров пока нет." icon="trophy-outline" />;
  return items.map(({ c, t }) => <CompBlock key={c.id} W={W} G={G} c={c} t={t} />);
}

function CompBlock({ W, G, c, t }) {
  let si = -1;
  c.stages.forEach((st, i) => { if (inStage(st, t)) si = i; });
  const st = si >= 0 ? c.stages[si] : c.stages[0];
  let status = null;
  let col = C.muted;
  if (c.kind === 'cup') {
    const pr = cupProgress(W, c, t);
    if (pr.won) { status = 'ПОБЕДА В ТУРНИРЕ'; col = C.gold; }
    else if (pr.out) { status = `ВЫБЫЛИ · ${(st?.name || '').toUpperCase()}`; col = C.red; }
    else if (pr.reached >= 0) { status = (st?.name || '').toUpperCase(); col = C.accent; }
  } else if (c.done) { status = c.winner === t ? 'ЧЕМПИОН' : 'ЗАВЕРШЁН'; col = c.winner === t ? C.gold : C.muted; }
  // ближайший матч в этом турнире
  let next = null;
  for (const s2 of c.stages) for (const r of s2.rounds) for (const m of r) if (m.hg === null && (m.h === t || m.a === t) && (!next || m.day < next.day)) next = m;
  return (
    <Card title={`${isNat(t) ? 'Сборная · ' : ''}${c.name}`} icon={c.kind === 'league' ? 'list' : isNat(t) ? 'flag' : 'trophy'} onPress={() => G.push('comp', { id: c.id })} right={status ? <Text style={{ color: col, fontSize: 10.5, fontWeight: '800' }} numberOfLines={1}>{status}</Text> : null}>
      {st?.t === 'rr' ? <MiniTable W={W} st={st} t={t} /> : st?.t === 'ko' ? <MiniTie W={W} st={st} t={t} /> : null}
      {next ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <Icon name="calendar-outline" size={13} color={C.muted} />
          <T muted size={12}>Дальше: {fmtShort(W.year, next.day)} · {next.h === t ? 'дома' : 'в гостях'} с</T>
          <Crest W={W} id={next.h === t ? next.a : next.h} size={15} />
          <T size={12} bold numberOfLines={1} style={{ flexShrink: 1 }}>{teamName(W, next.h === t ? next.a : next.h)}</T>
        </View>
      ) : null}
    </Card>
  );
}

function MiniTable({ W, st, t }) {
  const g = st.groups.find((x) => x.teams.includes(t)) || st.groups[0];
  const gi = st.groups.indexOf(g);
  const rows = sortRows(g.rows, W);
  const me = rows.findIndex((r) => r.id === t);
  let show = rows.map((r, i) => i);
  if (rows.length > 12) show = show.filter((i) => i < 4 || Math.abs(i - me) <= 2 || i >= rows.length - 2);
  const out = [];
  show.forEach((i, k) => {
    if (k > 0 && i - show[k - 1] > 1) out.push(<T key={`gap${i}`} muted size={11} center>···</T>);
    const r = rows[i];
    const mine = r.id === t;
    out.push(
      <View key={r.id} style={[st2.row, mine && { backgroundColor: C.goldDim }]}>
        <T size={12} muted style={{ width: 20 }}>{i + 1}</T>
        <Crest W={W} id={r.id} size={16} />
        <T size={13} bold={mine} color={mine ? C.gold : C.text} numberOfLines={1} style={{ flex: 1 }}>{teamName(W, r.id)}</T>
        <T size={12} muted style={{ width: 24, textAlign: 'center' }}>{r.p}</T>
        <T size={12} muted style={{ width: 34, textAlign: 'center' }}>{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</T>
        <Text style={{ width: 26, textAlign: 'center', color: mine ? C.gold : C.text, fontFamily: F.d8, fontSize: 14 }}>{r.pts}</Text>
      </View>
    );
  });
  return (
    <View>
      {st.groups.length > 1 ? <T muted size={11} style={{ marginBottom: 4 }}>{st.groupNames?.[gi] || `${st.name} · группа ${String.fromCharCode(65 + gi)}`}</T> : null}
      <View style={[st2.row, { paddingVertical: 2 }]}>
        <T muted size={10} style={{ width: 20 }}>#</T>
        <T muted size={10} style={{ flex: 1, marginLeft: 22 }}>КОМАНДА</T>
        <T muted size={10} style={{ width: 24, textAlign: 'center' }}>И</T>
        <T muted size={10} style={{ width: 34, textAlign: 'center' }}>РМ</T>
        <T muted size={10} style={{ width: 26, textAlign: 'center' }}>О</T>
      </View>
      {out}
    </View>
  );
}

function MiniTie({ W, st, t }) {
  const tie = st.ties.find((x) => x.a === t || x.b === t);
  if (!tie) return null;
  return (
    <View>
      <T muted size={11} style={{ marginBottom: 4 }}>{st.name}</T>
      {tie.m.map((m, i) => (
        <View key={i} style={st2.row}>
          <T muted size={11} style={{ width: 44 }}>{fmtShort(W.year, m.day)}</T>
          <T size={13} bold={m.h === t} numberOfLines={1} style={{ flex: 1, textAlign: 'right' }}>{teamName(W, m.h)}</T>
          <Crest W={W} id={m.h} size={15} />
          <T bold size={13} style={{ minWidth: 46, textAlign: 'center' }}>{scoreText(m)}</T>
          <Crest W={W} id={m.a} size={15} />
          <T size={13} bold={m.a === t} numberOfLines={1} style={{ flex: 1 }}>{teamName(W, m.a)}</T>
        </View>
      ))}
      {tie.w ? <T size={12} color={tie.w === t ? C.accent : C.red} style={{ marginTop: 4 }}>{tie.w === t ? 'Проходите дальше' : `Дальше проходит ${teamName(W, tie.w)}`}</T> : null}
    </View>
  );
}

const st2 = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 4, borderRadius: 6 },
});

export default function SeasonScreen() {
  const G = useG();
  const W = G.W;
  const u = W.user;
  const club = u.club ? W.clubs[u.club] : null;
  const leagueId = club?.league ? `L:${club.league}` : null;
  const [tab, setTab] = useState('fixtures');
  const tabs = [
    { value: 'fixtures', label: 'Расписание', icon: 'calendar' },
    { value: 'mine', label: 'Мои турниры', icon: 'layers' },
    ...(leagueId ? [{ value: 'table', label: 'Таблица', icon: 'list' }, { value: 'scorers', label: 'Бомбардиры', icon: 'football' }] : []),
    { value: 'comps', label: 'Все турниры', icon: 'trophy' },
    { value: 'history', label: 'История', icon: 'time' },
  ];
  return (
    <Page title="Сезон" sub={`${seasonLabel(W.year)}${club ? ` · ${W.comps[leagueId]?.name || ''}` : ''}`} tabs={<SubTabs options={tabs} value={tab} onChange={setTab} />}>
      {tab === 'fixtures' ? <Schedule /> : null}
      {tab === 'mine' ? <MyComps /> : null}
      {tab === 'table' && leagueId ? <CompView key="t" id={leagueId} initial="table" bare /> : null}
      {tab === 'scorers' && leagueId ? <CompView key="s" id={leagueId} initial="scorers" bare /> : null}
      {tab === 'comps' ? <CompsList /> : null}
      {tab === 'history' ? <HistoryBody /> : null}
    </Page>
  );
}

const st = StyleSheet.create({
  filter: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: C.card2, borderWidth: 1, borderColor: C.line },
  filterOn: { backgroundColor: C.gold, borderColor: C.gold },
  filterT: { color: C.text, fontSize: 13, fontWeight: '700' },
  month: { color: C.muted, fontFamily: F.d7, fontSize: 12, letterSpacing: 1.4, marginTop: 14, marginBottom: 6 },
  fix: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 14, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: C.line },
  date: { width: 42, alignItems: 'center', backgroundColor: C.bg2, borderRadius: 10, paddingVertical: 4 },
  dateD: { color: C.text, fontFamily: F.d8, fontSize: 19 },
  dateM: { color: C.muted, fontSize: 10, fontWeight: '700', marginTop: -2 },
  ha: { fontFamily: F.d8, fontSize: 11, paddingHorizontal: 5, borderRadius: 4, overflow: 'hidden' },
  score: { borderRadius: 9, paddingHorizontal: 9, paddingVertical: 3, minWidth: 50, alignItems: 'center' },
  scoreT: { fontFamily: F.d8, fontSize: 17 },
});
