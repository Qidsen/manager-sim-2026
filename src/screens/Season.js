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

export default function SeasonScreen() {
  const G = useG();
  const W = G.W;
  const u = W.user;
  const club = u.club ? W.clubs[u.club] : null;
  const leagueId = club?.league ? `L:${club.league}` : null;
  const [tab, setTab] = useState('fixtures');
  const tabs = [
    { value: 'fixtures', label: 'Расписание', icon: 'calendar' },
    ...(leagueId ? [{ value: 'table', label: 'Таблица', icon: 'list' }, { value: 'scorers', label: 'Бомбардиры', icon: 'football' }] : []),
    { value: 'comps', label: 'Все турниры', icon: 'trophy' },
    { value: 'history', label: 'История', icon: 'time' },
  ];
  return (
    <Page title="Сезон" sub={`${seasonLabel(W.year)}${club ? ` · ${W.comps[leagueId]?.name || ''}` : ''}`} tabs={<SubTabs options={tabs} value={tab} onChange={setTab} />}>
      {tab === 'fixtures' ? <Schedule /> : null}
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
