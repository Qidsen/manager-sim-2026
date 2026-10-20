import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { C, T, Card, Btn, Bar, Seg, Chips, Stat, Empty } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import PlayerRow from '../ui/playerRow';
import { NATION_BY_CODE } from '../data/nations';
import { natIndex, callUp, teamName } from '../engine/teams';
import { nextMatches, lastResults, scoreText, compsOfTeam } from '../engine/query';
import { fmtShort, POSITIONS, POS_RU, LINE } from '../engine/util';
import { resignNation } from '../engine/sim';

export default function NationScreen() {
  const G = useG();
  const W = G.W;
  const u = W.user;
  if (!u.nation) return <Page title="Сборная" back><Empty text="Вы не тренируете сборную. Предложения появляются в разделе «Карьера»." /></Page>;
  const n = NATION_BY_CODE[u.nation];
  const team = `n:${u.nation}`;
  const nat = W.nations[u.nation];
  const next = nextMatches(W, team, 4);
  const last = lastResults(W, team, 4);
  const comps = compsOfTeam(W, team).filter((c) => c.kind !== 'friendly');
  return (
    <Page title={`${n.flag} ${n.name}`} sub={`Задача: ${u.natTarget}`} back>
      <Card>
        <View style={{ flexDirection: 'row' }}>
          <Stat label="Сила" value={Math.round(nat.rep)} />
          <Stat label="Вызвано" value={nat.squad.length} />
          <Stat label="Доверие" value={`${Math.round(u.natConf)}%`} />
        </View>
        <Bar value={u.natConf} style={{ marginTop: 10 }} color={u.natConf < 30 ? C.red : C.accent} />
      </Card>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <Btn small title="Вызов игроков" style={{ flex: 1 }} onPress={() => G.push('callup')} />
        <Btn small kind="ghost" title="Тактика" style={{ flex: 1 }} onPress={() => G.push('tactics', { team })} />
      </View>
      <Card title="Автовызов" icon="sync-outline">
        <Seg options={[{ value: false, label: 'Я сам' }, { value: true, label: 'Автоматически' }]} value={!!u.autoCall} onChange={(v) => { u.autoCall = v; if (v) callUp(W, u.nation); G.refresh(); }} />
        <T muted size={12} style={{ marginTop: 6 }}>При автовызове состав обновляется перед каждым окном сборных.</T>
      </Card>
      {comps.length ? (
        <Card title="Турниры" icon="trophy-outline">
          {comps.map((c) => (
            <Btn key={c.id} small kind="ghost" title={c.name} style={{ marginBottom: 6 }} onPress={() => G.push('comp', { id: c.id })} />
          ))}
        </Card>
      ) : null}
      <Card title="Матчи" icon="calendar-outline">
        {last.map(({ m }, i) => <T key={`l${i}`} size={13} style={{ paddingVertical: 3 }}>{fmtShort(W.year, m.day)} · {teamName(W, m.h)} {scoreText(m)} {teamName(W, m.a)}</T>)}
        {next.map(({ m, comp }, i) => <T key={`n${i}`} size={13} muted style={{ paddingVertical: 3 }}>{fmtShort(W.year, m.day)} · {teamName(W, m.h)} — {teamName(W, m.a)} · {comp.kind === 'friendly' ? 'товарищеский' : comp.name}</T>)}
        {!last.length && !next.length ? <T muted>Матчей нет</T> : null}
      </Card>
      <Btn title="Уйти из сборной" kind="danger" onPress={() => G.dialog({ title: 'Покинуть сборную?', text: 'Вы перестанете быть тренером сборной.', buttons: [{ title: 'Уйти', kind: 'danger', onPress: () => { resignNation(W); G.pop(); G.refresh(); } }, { title: 'Отмена', kind: 'ghost' }] })} />
    </Page>
  );
}

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
