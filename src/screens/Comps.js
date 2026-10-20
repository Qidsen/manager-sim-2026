import React, { useMemo, useState } from 'react';
import Crest from '../ui/Crest';
import { View, Text, Pressable } from 'react-native';
import { C, F, T, Seg, Chips, Card, Row, Empty, FormDots, Btn, Icon } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import { compGroups, topScorers, scoreText, userTeamIds } from '../engine/query';
import { sortRows, compStageName } from '../engine/comps';
import { teamName, teamFlag, isUserTeam } from '../engine/teams';
import { fmtShort, seasonLabel } from '../engine/util';
import { LEAGUES } from '../data/leagues';

const ORDER = ['Чемпионаты', 'Национальные кубки', 'Международные клубные', 'Сборные', 'Товарищеские'];

export function CompsList() {
  const G = useG();
  const W = G.W;
  const mine = userTeamIds(W);
  const all = Object.values(W.comps);
  const my = all.filter((c) => mine.some((t) => (c.teams || []).includes(t)) && c.kind !== 'friendly');
  const groups = {};
  for (const c of all) (groups[compGroups(c)] ||= []).push(c);
  const lorder = LEAGUES.map((l) => `L:${l.id}`);
  groups['Чемпионаты']?.sort((a, b) => lorder.indexOf(a.id) - lorder.indexOf(b.id));

  const item = (c) => {
    const st = c.stages[c.stages.length - 1];
    return (
      <Row key={c.id} onPress={() => G.push('comp', { id: c.id })}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: (c.done ? C.gold : C.blue) + '1F', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={c.done ? 'trophy' : c.kind === 'league' ? 'list' : c.scope === 'nat' ? 'flag' : 'git-network'} size={17} color={c.done ? C.gold : C.blue} />
        </View>
        <View style={{ flex: 1 }}>
          <T bold size={14}>{c.name}</T>
          <T muted size={12}>{c.done ? `Победитель: ${c.winner ? teamName(W, c.winner) : (c.qualified ? `${c.qualified.length} команд прошли` : '—')}` : st?.name}</T>
        </View>
        <Icon name="chevron-forward" size={16} color={C.dim} />
      </Row>
    );
  };

  return (
    <>
      {my.length ? <Card title="Ваши турниры" icon="star">{my.map(item)}</Card> : null}
      {ORDER.filter((k) => groups[k]?.length).map((k) => (
        <Card key={k} title={k} icon={{ 'Чемпионаты': 'list', 'Национальные кубки': 'ribbon', 'Международные клубные': 'globe', 'Сборные': 'flag', 'Товарищеские': 'people' }[k]}>{groups[k].map(item)}</Card>
      ))}
    </>
  );
}

export function CompView({ id, initial, bare }) {
  const G = useG();
  const W = G.W;
  const comp = W.comps[id];
  const hasTable = comp?.stages.some((s) => s.t === 'rr');
  const [tab, setTab] = useState(initial || (hasTable ? 'table' : 'matches'));
  const [stageIdx, setStageIdx] = useState(comp ? comp.stages.length - 1 : 0);
  if (!comp) return <Empty text="Турнир завершён и больше не доступен." />;
  const stage = comp.stages[Math.min(stageIdx, comp.stages.length - 1)];
  return (
    <>
      {bare ? null : (
        <Seg
          options={[...(hasTable ? [{ value: 'table', label: 'Таблица' }] : []), { value: 'matches', label: 'Матчи' }, { value: 'scorers', label: 'Бомбардиры' }]}
          value={tab}
          onChange={setTab}
          style={{ marginBottom: 10 }}
        />
      )}
      {comp.stages.length > 1 && tab !== 'scorers' ? (
        <Chips options={comp.stages.map((s, i) => ({ value: i, label: s.name }))} value={Math.min(stageIdx, comp.stages.length - 1)} onChange={setStageIdx} style={{ marginBottom: 10 }} />
      ) : null}
      {tab === 'table' ? (stage.t === 'rr' ? <Tables W={W} comp={comp} stage={stage} /> : <Ties W={W} stage={stage} />) : null}
      {tab === 'matches' ? (stage.t === 'ko' ? <Ties W={W} stage={stage} /> : <Rounds W={W} stage={stage} comp={comp} />) : null}
      {tab === 'scorers' ? <Scorers W={W} comp={comp} /> : null}
    </>
  );
}

export function CompScreen({ id }) {
  const G = useG();
  const W = G.W;
  const comp = W.comps[id];
  return (
    <Page title={comp ? comp.name : 'Турнир'} sub={comp?.done && comp.winner ? `Победитель: ${teamName(W, comp.winner)}` : comp?.stages[comp.stages.length - 1]?.name} back>
      <CompView id={id} />
    </Page>
  );
}

function Tables({ W, comp, stage }) {
  const G = useG();
  const zones = comp.kind === 'league' && comp.lid ? zoneFor(comp.lid) : null;
  const legend = comp.kind === 'league' && comp.lid ? legendFor(comp.lid) : [];
  return (
    <>
      {stage.groups.map((g, gi) => tableCard(g, gi))}
      {legend.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 4, marginBottom: 10 }}>
          {legend.map(([col, l]) => (
            <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: col }} />
              <T muted size={11}>{l}</T>
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
  function tableCard(g, gi) {
    const rows = sortRows(g.rows, W);
    return (
      <Card key={gi} title={stage.groups.length > 1 || stage.groupNames ? compStageName(comp, stage, gi) : null}>
        <View style={{ flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: C.line }}>
          <T muted size={11} style={{ width: 24 }}>#</T>
          <T muted size={11} style={{ flex: 1 }}>Команда</T>
          {['И', 'В', 'Н', 'П', 'Мячи', 'О'].map((h) => (
            <T key={h} muted size={11} style={{ width: h === 'Мячи' ? 44 : 24, textAlign: 'center' }}>{h}</T>
          ))}
        </View>
        {rows.map((r, i) => {
          const me = isUserTeam(W, r.id);
          const zc = zones ? zones(i, rows.length) : null;
          return (
            <Pressable key={r.id} onPress={() => G.push('team', { id: r.id })} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: C.line, backgroundColor: me ? C.goldDim : 'transparent', borderRadius: me ? 6 : 0 }}>
              <View style={{ width: 24, flexDirection: 'row', alignItems: 'center' }}>
                {zc ? <View style={{ width: 3, height: 16, backgroundColor: zc, marginRight: 3, borderRadius: 2 }} /> : null}
                <T size={12} muted>{i + 1}</T>
              </View>
              <Crest W={W} id={r.id} size={18} style={{ marginRight: 6 }} />
              <T size={13} bold={me} style={{ flex: 1 }} numberOfLines={1}>{teamName(W, r.id)}</T>
              {[r.p, r.w, r.d, r.l].map((v, k) => <T key={k} size={12} style={{ width: 24, textAlign: 'center' }}>{v}</T>)}
              <T size={12} style={{ width: 44, textAlign: 'center' }}>{r.gf}:{r.ga}</T>
              <Text style={{ width: 26, textAlign: 'center', color: me ? C.gold : C.text, fontFamily: F.d8, fontSize: 15 }}>{r.pts}</Text>
            </Pressable>
          );
        })}
      </Card>
    );
  }
}

function legendFor(lid) {
  const L = LEAGUES.find((l) => l.id === lid);
  const out = [];
  if (L.euro) out.push([C.blue, 'Лига чемпионов'], [C.orange, 'Лига Европы'], [C.accent, 'Лига конференций']);
  if (L.lib) out.push([C.blue, 'Копа Либертадорес']);
  if (L.afc) out.push([C.blue, 'Лига чемпионов АФК']);
  if (L.concacaf) out.push([C.blue, 'Кубок КОНКАКАФ']);
  if (L.up) out.push([C.accent, 'Повышение']);
  if (L.down) out.push([C.red, 'Вылет']);
  return out;
}

function zoneFor(lid) {
  const L = LEAGUES.find((l) => l.id === lid);
  return (i, n) => {
    if (L.euro) {
      if (i < L.euro.ucl) return C.blue;
      if (i < L.euro.ucl + L.euro.uel) return C.orange;
      if (i < L.euro.ucl + L.euro.uel + L.euro.uecl) return C.accent;
    }
    if (L.lib && i < L.lib) return C.blue;
    if (L.afc && i < L.afc) return C.blue;
    if (L.concacaf && i < L.concacaf) return C.blue;
    if (L.up && i < 3) return C.accent;
    if (L.down && i >= n - 3) return C.red;
    return null;
  };
}

function MatchRow({ W, m, showDate = true }) {
  const G = useG();
  const me = isUserTeam(W, m.h) || isUserTeam(W, m.a);
  const open = () => {
    if (m.hg === null) return G.push('team', { id: isUserTeam(W, m.h) ? m.a : m.h });
    const goals = (m.gl || []).map(([min, side, pid]) => `${min}' ${W.players[pid]?.n || '—'} (${side === 0 ? teamName(W, m.h) : teamName(W, m.a)})`);
    G.dialog({ title: `${teamName(W, m.h)} ${scoreText(m)} ${teamName(W, m.a)}`, text: goals.length ? goals.join('\n') : 'Голов не было.' });
  };
  return (
    <Pressable onPress={open} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 6, borderBottomWidth: 0.5, borderBottomColor: C.line, backgroundColor: me ? C.accentDim : 'transparent' }}>
      {showDate ? <T muted size={11} style={{ width: 42 }}>{fmtShort(W.year, m.day)}</T> : null}
      <T size={13} style={{ flex: 1, textAlign: 'right' }} numberOfLines={1}>{teamName(W, m.h)}</T>
      <Crest W={W} id={m.h} size={16} />
      <T bold size={13} style={{ minWidth: 46, textAlign: 'center' }}>{scoreText(m)}</T>
      <Crest W={W} id={m.a} size={16} />
      <T size={13} style={{ flex: 1 }} numberOfLines={1}>{teamName(W, m.a)}</T>
    </Pressable>
  );
}

function Rounds({ W, stage, comp }) {
  const firstOpen = stage.rounds.findIndex((r) => r.some((m) => m.hg === null));
  const [r, setR] = useState(firstOpen >= 0 ? firstOpen : stage.rounds.length - 1);
  const ri = Math.max(0, Math.min(r, stage.rounds.length - 1));
  const round = stage.rounds[ri] || [];
  if (!stage.rounds.length) return <Empty text="Матчей пока нет." />;
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Btn small kind="ghost" title="‹" onPress={() => setR(Math.max(0, ri - 1))} />
        <T bold>{comp.kind === 'friendly' ? 'Матч' : 'Тур'} {ri + 1} из {stage.rounds.length}</T>
        <Btn small kind="ghost" title="›" onPress={() => setR(Math.min(stage.rounds.length - 1, ri + 1))} />
      </View>
      {round.map((m, i) => <MatchRow key={i} W={W} m={m} />)}
    </Card>
  );
}

function Ties({ W, stage }) {
  return (
    <Card title={stage.name}>
      {stage.ties.map((t, i) => (
        <View key={i} style={{ paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: C.line }}>
          {t.m.map((m, k) => <MatchRow key={k} W={W} m={m} />)}
          {t.w ? <T size={12} color={C.accent} style={{ marginTop: 2 }}>Проходит: {teamName(W, t.w)}</T> : null}
        </View>
      ))}
    </Card>
  );
}

function Scorers({ W, comp }) {
  const G = useG();
  const list = useMemo(() => topScorers(W, comp, 25), [comp, G.tick]);
  if (!list.length) return <Empty text="Голов пока нет." />;
  return (
    <Card>
      {list.map((x, i) => (
        <Row key={x.pid} onPress={() => G.push('player', { id: x.p.id })}>
          <T muted size={12} style={{ width: 20 }}>{i + 1}</T>
          <View style={{ flex: 1 }}>
            <T size={14} bold numberOfLines={1}>{x.p.n}</T>
            <T muted size={12} numberOfLines={1}>{x.p.club ? W.clubs[x.p.club]?.name : ''}</T>
          </View>
          <T muted size={12}>{x.a} пас</T>
          <T bold size={16} style={{ width: 30, textAlign: 'right' }}>{x.g}</T>
        </Row>
      ))}
    </Card>
  );
}
