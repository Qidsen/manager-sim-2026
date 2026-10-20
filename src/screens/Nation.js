import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Bar, Btn, C, Card, Chips, Empty, F, Icon, Row, Seg, Stat, T } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import PlayerRow from '../ui/playerRow';
import { NATION_BY_CODE } from '../data/nations';
import { natIndex, callUp, teamName, teamFlag } from '../engine/teams';
import { nextMatches, lastResults, scoreText, compsOfTeam, resultLetter } from '../engine/query';
import { fmtShort, POSITIONS, POS_RU, LINE } from '../engine/util';
import { resignNation } from '../engine/sim';

export default function NationScreen() {
  const G = useG();
  const W = G.W;
  const u = W.user;
  if (!u.nation) return <Page title="Сборная" back><Empty text="Вы не тренируете сборную. Предложения появляются в «Офис → Карьера»." icon="flag-outline" /></Page>;
  const n = NATION_BY_CODE[u.nation];
  const team = `n:${u.nation}`;
  const nat = W.nations[u.nation];
  const next = nextMatches(W, team, 5);
  const last = lastResults(W, team, 5);
  const comps = compsOfTeam(W, team).filter((c) => c.kind !== 'friendly');
  const row = (m, comp, played, i) => {
    const home = m.h === team;
    const opp = home ? m.a : m.h;
    const L = played ? resultLetter(m, team) : null;
    return (
      <View key={i} style={ns.row}>
        <Text style={ns.date}>{fmtShort(W.year, m.day)}</Text>
        <Text style={{ fontSize: 15 }}>{teamFlag(W, opp)}</Text>
        <View style={{ flex: 1 }}>
          <T size={14} bold numberOfLines={1}>{home ? '' : '@ '}{teamName(W, opp)}</T>
          <T muted size={11} numberOfLines={1}>{comp.kind === 'friendly' ? 'Товарищеский' : comp.name}</T>
        </View>
        {played ? (
          <View style={[ns.score, { backgroundColor: L === 'W' ? C.accentDim : L === 'L' ? C.redDim : C.card3 }]}>
            <Text style={[ns.scoreT, { color: L === 'W' ? C.accent : L === 'L' ? C.red : C.text }]}>{home ? `${m.hg}:${m.ag}` : `${m.ag}:${m.hg}`}</Text>
          </View>
        ) : null}
      </View>
    );
  };
  return (
    <Page title={n.name} sub="Сборная" back>
      <View style={ns.hero}>
        <Text style={{ fontSize: 46 }}>{n.flag}</Text>
        <View style={{ flex: 1 }}>
          <T muted size={11}>ЗАДАЧА ФЕДЕРАЦИИ</T>
          <T bold size={15} style={{ marginTop: 2 }}>{u.natTarget}</T>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        <View style={ns.tile}><T muted size={11}>Сила</T><Text style={ns.tileV}>{Math.round(nat.rep)}</Text></View>
        <View style={ns.tile}><T muted size={11}>Вызвано</T><Text style={ns.tileV}>{nat.squad.length}<Text style={{ color: C.muted, fontSize: 15 }}>/26</Text></Text></View>
        <View style={ns.tile}>
          <T muted size={11}>Доверие</T>
          <Text style={[ns.tileV, { color: u.natConf < 30 ? C.red : C.accent }]}>{Math.round(u.natConf)}%</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <Btn small title="Вызов" icon="person-add" style={{ flex: 1 }} onPress={() => G.push('callup')} />
        <Btn small kind="ghost" title="Тактика" icon="clipboard" style={{ flex: 1 }} onPress={() => G.push('tactics', { team })} />
      </View>
      <Card title="Вызов перед окнами" icon="sync-outline">
        <Seg options={[{ value: false, label: 'Я сам' }, { value: true, label: 'Автоматически' }]} value={!!u.autoCall} onChange={(v) => { u.autoCall = v; if (v) callUp(W, u.nation); G.refresh(); }} />
      </Card>
      {next.length ? <Card title="Ближайшие матчи" icon="calendar-outline">{next.map(({ m, comp }, i) => row(m, comp, false, i))}</Card> : null}
      {last.length ? <Card title="Результаты" icon="time-outline">{last.map(({ m, comp }, i) => row(m, comp, true, i))}</Card> : null}
      {comps.length ? (
        <Card title="Турниры" icon="trophy-outline">
          {comps.map((c) => (
            <Row key={c.id} onPress={() => G.push('comp', { id: c.id })}>
              <Icon name={c.done ? 'trophy' : 'flag'} size={17} color={c.done ? C.gold : C.blue} />
              <T size={14} style={{ flex: 1 }} numberOfLines={1}>{c.name}</T>
              <Icon name="chevron-forward" size={16} color={C.dim} />
            </Row>
          ))}
        </Card>
      ) : null}
      <Btn title="Уйти из сборной" kind="danger" small onPress={() => G.dialog({ title: 'Покинуть сборную?', text: 'Вы перестанете быть тренером сборной.', buttons: [{ title: 'Уйти', kind: 'danger', onPress: () => { resignNation(W); G.pop(); G.refresh(); } }, { title: 'Отмена', kind: 'ghost' }] })} />
    </Page>
  );
}

const ns = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.card, borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.line },
  tile: { flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: C.line },
  tileV: { color: C.text, fontFamily: F.d8, fontSize: 24, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  date: { color: C.muted, fontFamily: F.d7, fontSize: 13, width: 50 },
  score: { borderRadius: 9, paddingHorizontal: 9, paddingVertical: 3, minWidth: 46, alignItems: 'center' },
  scoreT: { fontFamily: F.d8, fontSize: 16 },
});

export function CallupScreen() {
  const G = useG();
  const W = G.W;
  const u = W.user;
  const [line, setLine] = useState('ALL');
  if (!u.nation) return <Page title="Вызов" back><Empty text="Нет сборной." /></Page>;
  const nat = W.nations[u.nation];
  const pool = (natIndex(W)[u.nation] || []).map((id) => W.players[id]).filter((p) => p && !p.aca);
  const list = pool.filter((p) => line === 'ALL' || LINE[p.pos] === line).sort((a, b) => b.ovr - a.ovr).slice(0, 120);
  const sel = new Set(nat.squad);
  const toggle = (p) => {
    if (sel.has(p.id)) nat.squad = nat.squad.filter((x) => x !== p.id);
    else if (nat.squad.length >= 26) return G.alert('Заявка заполнена', 'Максимум 26 игроков.');
    else nat.squad.push(p.id);
    u.autoCall = false;
    G.refresh();
  };
  const cnt = (l) => nat.squad.filter((id) => W.players[id] && LINE[W.players[id].pos] === l).length;
  return (
    <Page title="Вызов в сборную" sub={`Вызвано ${nat.squad.length}/26 · ВР ${cnt('G')} · ЗЩ ${cnt('D')} · ПЗ ${cnt('M')} · НП ${cnt('A')}`} back>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
        <Btn small title="Автовызов" style={{ flex: 1 }} onPress={() => { callUp(W, u.nation); G.refresh(); }} />
        <Btn small kind="ghost" title="Очистить" style={{ flex: 1 }} onPress={() => { nat.squad = []; G.refresh(); }} />
      </View>
      <Chips options={[{ value: 'ALL', label: 'Все' }, { value: 'G', label: 'Вратари' }, { value: 'D', label: 'Защитники' }, { value: 'M', label: 'Полузащитники' }, { value: 'A', label: 'Нападающие' }]} value={line} onChange={setLine} style={{ marginBottom: 10 }} />
      {list.map((p) => (
        <PlayerRow key={p.id} p={p} W={W} showClub selected={sel.has(p.id)} onPress={() => toggle(p)} right={<Text style={{ fontSize: 18 }}>{sel.has(p.id) ? '✅' : '➕'}</Text>} />
      ))}
    </Page>
  );
}
