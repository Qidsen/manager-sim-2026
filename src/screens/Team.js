import React from 'react';
import Crest from '../ui/Crest';
import { View } from 'react-native';
import { C, T, Card, Stat } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import PlayerRow from '../ui/playerRow';
import { teamName, isNat, natCode, teamFlag } from '../engine/teams';
import { squadOf, nextMatches, lastResults, scoreText, clubLeaguePos } from '../engine/query';
import { sortSquad } from './Squad';
import { money, fmtShort } from '../engine/util';
import { LEAGUE_BY_ID } from '../data/leagues';
import { NATION_BY_CODE } from '../data/nations';

export default function TeamScreen({ id }) {
  const G = useG();
  const W = G.W;
  const nat = isNat(id);
  const list = sortSquad(squadOf(W, id));
  const c = nat ? null : W.clubs[id];
  const pos = c ? clubLeaguePos(W, id) : null;
  const avg = list.length ? Math.round(list.slice().sort((a, b) => b.ovr - a.ovr).slice(0, 11).reduce((s, p) => s + p.ovr, 0) / Math.min(11, list.length)) : 0;
  const next = nextMatches(W, id, 3);
  const last = lastResults(W, id, 3);
  return (
    <Page title={teamName(W, id)} sub={nat ? NATION_BY_CODE[natCode(id)]?.conf : c.league ? LEAGUE_BY_ID[c.league].name : NATION_BY_CODE[c.country]?.name} back>
      <View style={{ alignItems: 'center', marginBottom: 12 }}><Crest W={W} id={id} size={84} /></View>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        {[
          ['Репутация', Math.round(nat ? W.nations[natCode(id)].rep : c.rep)],
          ['Сила основы', avg],
          ...(pos ? [['Место', `${pos.pos}/${pos.total}`]] : []),
          ...(c ? [['Стадион', `${Math.round(c.stadium.cap / 1000)}k`]] : []),
        ].map(([l, v]) => (
          <View key={l} style={{ flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: C.line }}>
            <T muted size={10} numberOfLines={1}>{l}</T>
            <T display size={20}>{v}</T>
          </View>
        ))}
      </View>
      {next.length || last.length ? (
        <Card title="Матчи" icon="calendar-outline">
          {last.map(({ m }, i) => (
            <View key={`l${i}`} style={{ flexDirection: 'row', gap: 10, paddingVertical: 6, alignItems: 'center' }}>
              <T muted size={12} style={{ width: 50 }}>{fmtShort(W.year, m.day)}</T>
              <T size={13} style={{ flex: 1 }} numberOfLines={1}>{teamName(W, m.h)} — {teamName(W, m.a)}</T>
              <T display size={16}>{scoreText(m)}</T>
            </View>
          ))}
          {next.map(({ m, comp }, i) => (
            <View key={`n${i}`} style={{ flexDirection: 'row', gap: 10, paddingVertical: 6, alignItems: 'center' }}>
              <T muted size={12} style={{ width: 50 }}>{fmtShort(W.year, m.day)}</T>
              <T size={13} style={{ flex: 1 }} numberOfLines={1}>{teamName(W, m.h)} — {teamName(W, m.a)}</T>
              <T muted size={11} numberOfLines={1} style={{ maxWidth: 100 }}>{comp.kind === 'friendly' ? 'товарищ.' : comp.name}</T>
            </View>
          ))}
        </Card>
      ) : null}
      <Card title={nat ? 'Вызванные игроки' : 'Состав'} icon="people-outline">
        {list.map((p) => (
          <PlayerRow key={p.id} p={p} W={W} showClub={nat} onPress={() => G.push('player', { id: p.id })} />
        ))}
      </Card>
    </Page>
  );
}
