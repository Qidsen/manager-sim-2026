import React from 'react';
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
    <Page title={`${teamFlag(W, id)} ${teamName(W, id)}`} sub={nat ? NATION_BY_CODE[natCode(id)]?.conf : c.league ? LEAGUE_BY_ID[c.league].name : NATION_BY_CODE[c.country]?.name} back>
      <Card>
        <View style={{ flexDirection: 'row' }}>
          <Stat label="Репутация" value={Math.round(nat ? W.nations[natCode(id)].rep : c.rep)} />
          <Stat label="Сила основы" value={avg} />
          {pos ? <Stat label="Место" value={`${pos.pos}/${pos.total}`} /> : null}
          {c ? <Stat label="Стадион" value={`${Math.round(c.stadium.cap / 1000)}k`} /> : null}
        </View>
        {c ? <T muted size={12} center style={{ marginTop: 10 }}>Бюджет: {money(c.balance)}</T> : null}
      </Card>
      {next.length || last.length ? (
        <Card title="Матчи">
          {last.map(({ m }, i) => (
            <T key={`l${i}`} size={13} style={{ paddingVertical: 3 }}>{fmtShort(W.year, m.day)} · {teamName(W, m.h)} {scoreText(m)} {teamName(W, m.a)}</T>
          ))}
          {next.map(({ m, comp }, i) => (
            <T key={`n${i}`} size={13} muted style={{ paddingVertical: 3 }}>{fmtShort(W.year, m.day)} · {teamName(W, m.h)} — {teamName(W, m.a)} · {comp.name}</T>
          ))}
        </Card>
      ) : null}
      <Card title={nat ? 'Вызванные игроки' : 'Состав'}>
        {list.map((p) => (
          <PlayerRow key={p.id} p={p} onPress={() => G.push('player', { id: p.id })} sub={nat && p.club ? W.clubs[p.club]?.short : null} />
        ))}
      </Card>
    </Page>
  );
}
