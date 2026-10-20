import React, { useState } from 'react';
import { View } from 'react-native';
import { C, T, Seg, Card, Btn, Empty, SectionLabel } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import PlayerRow from '../ui/playerRow';
import { LINE, LINE_ORDER, money, playerValue } from '../engine/util';
import { squadOf, playerAvgRating } from '../engine/query';
import { teamName } from '../engine/teams';

export function sortSquad(list) {
  return list.slice().sort((a, b) => LINE_ORDER[LINE[a.pos]] - LINE_ORDER[LINE[b.pos]] || b.ovr - a.ovr);
}

export default function SquadScreen() {
  const G = useG();
  const W = G.W;
  const u = W.user;
  const teams = [];
  if (u.club) teams.push({ value: u.club, label: 'Клуб' });
  if (u.nation) teams.push({ value: `n:${u.nation}`, label: 'Сборная' });
  const [team, setTeam] = useState(teams[0]?.value);
  const [seg, setSeg] = useState('squad');
  const cur = teams.find((t) => t.value === team) ? team : teams[0]?.value;

  if (!cur) return <Page title="Команда"><Empty text="У вас сейчас нет команды." /></Page>;

  const list = sortSquad(squadOf(W, cur));
  const isClub = !cur.startsWith('n:');
  const wages = isClub ? list.reduce((s, p) => s + p.wage, 0) : 0;
  const avg = list.length ? Math.round(list.reduce((s, p) => s + p.ovr, 0) / list.length) : 0;

  return (
    <Page title={teamName(W, cur)} sub={isClub ? `${list.length} игроков · зарплаты ${money(wages)}/нед.` : `${list.length} вызванных игроков`}>
      {teams.length > 1 ? <Seg options={teams} value={cur} onChange={setTeam} style={{ marginBottom: 10 }} /> : null}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
        <Btn title="Тактика и состав" icon="clipboard" small style={{ flex: 1 }} onPress={() => G.push('tactics', { team: cur })} />
        {!isClub ? <Btn title="Вызов" icon="person-add" small kind="ghost" style={{ flex: 1 }} onPress={() => G.push('callup')} /> : null}
      </View>
      <Seg options={[{ value: 'squad', label: 'Состав' }, { value: 'stats', label: 'Статистика' }, { value: 'money', label: 'Контракты' }]} value={seg} onChange={setSeg} style={{ marginBottom: 6 }} />
      <T muted size={12} style={{ marginTop: 8 }}>Средний рейтинг состава: <T bold size={12}>{avg}</T></T>
      {list.map((p, idx) => {
        const line = LINE[p.pos];
        const head = idx === 0 || LINE[list[idx - 1].pos] !== line ? (
          <SectionLabel key={`h${line}`}>{{ G: 'Вратари', D: 'Защитники', M: 'Полузащитники', A: 'Нападающие' }[line]}</SectionLabel>
        ) : null;
        let right = null;
        if (seg === 'stats') {
          const r = playerAvgRating(p);
          right = (
            <T size={12} muted style={{ width: 120, textAlign: 'right' }}>
              {isClub ? `${p.st.app} и · ${p.st.g} г · ${p.st.as} п${r ? ` · ${r.toFixed(1)}` : ''}` : `${p.caps} м · ${p.ng} г`}
            </T>
          );
        } else if (seg === 'money') {
          right = (
            <View style={{ alignItems: 'flex-end', width: 110 }}>
              <T size={12}>{money(playerValue(p))}</T>
              <T size={11} muted>{isClub ? `${money(p.wage)}/н · до ${p.contract + 1}` : teamName(W, p.club)}</T>
            </View>
          );
        }
        return (
          <React.Fragment key={p.id}>
            {head}
            <PlayerRow p={p} right={right} onPress={() => G.push('player', { id: p.id })} sub={!isClub ? (p.club ? W.clubs[p.club]?.short : '') : null} />
          </React.Fragment>
        );
      })}
      {isClub && W.clubs[cur].academy.length ? (
        <Card title="Академия" style={{ marginTop: 14 }} onPress={() => G.push('club', { tab: 'academy' })} right={<T muted size={12}>Открыть ›</T>}>
          <T muted size={13}>{W.clubs[cur].academy.length} воспитанников ждут решения</T>
        </Card>
      ) : null}
    </Page>
  );
}
