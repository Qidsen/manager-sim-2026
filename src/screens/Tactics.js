import React, { useState } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { C, T, Seg, Chips, Card, Btn, ratingColor } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import PlayerRow from '../ui/playerRow';
import { FORMATIONS, FORMATION_NAMES, MENTALITY, PRESSING, TEMPO, POS_RU, slotRating } from '../engine/util';
import { resolveLineup, autoLineup } from '../engine/match';
import { teamPool, teamTactic, teamName } from '../engine/teams';

export function Pitch({ W, form, xi, selected, onSlot, width }) {
  const slots = FORMATIONS[form];
  const h = width * 1.15;
  return (
    <View style={{ width, height: h, backgroundColor: C.pitch, borderRadius: 14, overflow: 'hidden', alignSelf: 'center', borderWidth: 2, borderColor: C.pitchLine }}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: h / 2, height: 2, backgroundColor: C.pitchLine }} />
      <View style={{ position: 'absolute', left: width / 2 - 40, top: h / 2 - 40, width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: C.pitchLine }} />
      <View style={{ position: 'absolute', left: width * 0.25, width: width * 0.5, bottom: 0, height: h * 0.14, borderWidth: 2, borderColor: C.pitchLine, borderBottomWidth: 0 }} />
      <View style={{ position: 'absolute', left: width * 0.25, width: width * 0.5, top: 0, height: h * 0.14, borderWidth: 2, borderColor: C.pitchLine, borderTopWidth: 0 }} />
      {slots.map(([pos, x, y], i) => {
        const p = xi[i] ? W.players[xi[i]] : null;
        const r = p ? Math.round(slotRating(p, pos)) : 0;
        const sel = selected === i;
        const left = x * width - 34;
        const top = (1 - y) * h - 26 - (y < 0.1 ? 12 : 0);
        return (
          <Pressable key={i} onPress={() => onSlot(i)} style={{ position: 'absolute', left, top, width: 68, alignItems: 'center' }}>
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: sel ? C.gold : '#0b2416', borderWidth: 2, borderColor: p ? ratingColor(r) : C.red, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: sel ? '#000' : '#fff', fontWeight: '800', fontSize: 13 }}>{p ? r : '!'}</Text>
            </View>
            <Text numberOfLines={1} style={{ color: '#fff', fontSize: 10, fontWeight: '700', marginTop: 2, textShadowColor: '#000', textShadowRadius: 3 }}>
              {p ? p.n.split(' ').slice(-1)[0] : 'пусто'}
            </Text>
            <Text style={{ color: '#cfe8d6', fontSize: 9 }}>{POS_RU[pos]}{p && p.pos !== pos ? ` (${POS_RU[p.pos]})` : ''}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TacticsScreen({ team }) {
  const G = useG();
  const W = G.W;
  const { width } = useWindowDimensions();
  const tac = teamTactic(W, team);
  const pool = teamPool(W, team);
  const [sel, setSel] = useState(null); // индекс слота
  const lu = resolveLineup(W, pool, tac);

  const commit = (xi, bench) => {
    tac.xi = xi;
    tac.bench = bench;
    tac.auto = false;
    G.refresh();
  };

  const onSlot = (i) => {
    if (sel === null) return setSel(i);
    if (sel === i) return setSel(null);
    const xi = lu.xi.slice();
    [xi[sel], xi[i]] = [xi[i], xi[sel]];
    setSel(null);
    commit(xi, lu.bench);
  };

  const onBench = (pid) => {
    if (sel === null) return G.push('player', { id: pid });
    const xi = lu.xi.slice();
    const out = xi[sel];
    xi[sel] = pid;
    const bench = lu.bench.filter((x) => x !== pid);
    if (out) bench.unshift(out);
    setSel(null);
    commit(xi, bench.slice(0, 9));
  };

  const inXI = new Set(lu.xi.filter(Boolean));
  const inBench = new Set(lu.bench);
  const others = pool.map((id) => W.players[id]).filter((p) => p && !inXI.has(p.id) && !inBench.has(p.id)).sort((a, b) => b.ovr - a.ovr);

  return (
    <Page title="Тактика" sub={teamName(W, team)} back>
      <Chips options={FORMATION_NAMES} value={tac.form} onChange={(f) => { tac.form = f; if (tac.auto) tac.xi = null; G.refresh(); }} style={{ marginBottom: 12 }} />
      <Pitch W={W} form={tac.form} xi={lu.xi} selected={sel} onSlot={onSlot} width={Math.min(width - 28, 420)} />
      <T muted size={12} center style={{ marginVertical: 8 }}>
        {sel === null ? 'Нажмите на игрока на поле, затем на другого игрока или запасного, чтобы поменять их местами.' : 'Выберите, кого поставить на эту позицию.'}
      </T>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <Btn small title={tac.auto ? '✓ Автосостав включён' : 'Включить автосостав'} kind={tac.auto ? 'primary' : 'ghost'} style={{ flex: 1 }} onPress={() => { tac.auto = !tac.auto; if (tac.auto) { tac.xi = null; tac.bench = null; } G.refresh(); }} />
        <Btn small title="Лучшие 11" kind="ghost" style={{ flex: 1 }} onPress={() => { const a = autoLineup(W, pool, tac.form); commit(a.xi, a.bench); }} />
      </View>
      <Card title="Установки">
        <T muted size={12} style={{ marginBottom: 6 }}>Настрой: {MENTALITY[tac.ment]}</T>
        <Seg options={MENTALITY.map((m, i) => ({ value: i, label: ['−−', '−', '=', '+', '++'][i] }))} value={tac.ment} onChange={(v) => { tac.ment = v; G.refresh(); }} />
        <T muted size={12} style={{ marginVertical: 6 }}>Прессинг</T>
        <Seg options={PRESSING.map((m, i) => ({ value: i, label: m }))} value={tac.press} onChange={(v) => { tac.press = v; G.refresh(); }} />
        <T muted size={12} style={{ marginVertical: 6 }}>Темп</T>
        <Seg options={TEMPO.map((m, i) => ({ value: i, label: m }))} value={tac.tempo} onChange={(v) => { tac.tempo = v; G.refresh(); }} />
        <T muted size={11} style={{ marginTop: 8 }}>Высокий прессинг и быстрый темп сильнее утомляют игроков. Атакующий настрой создаёт больше моментов, но открывает оборону.</T>
      </Card>
      <Card title="Запасные">
        {lu.bench.map((id) => (
          <PlayerRow key={id} p={W.players[id]} onPress={() => onBench(id)} selected={false} />
        ))}
      </Card>
      {others.length ? (
        <Card title="Вне заявки">
          {others.map((p) => (
            <PlayerRow key={p.id} p={p} onPress={() => (p.inj > 0 || p.ban > 0 ? G.push('player', { id: p.id }) : onBench(p.id))} />
          ))}
        </Card>
      ) : null}
    </Page>
  );
}
