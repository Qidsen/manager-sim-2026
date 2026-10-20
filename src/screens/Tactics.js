import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, useWindowDimensions } from 'react-native';
import { C, T, Seg, Chips, Card, Btn, ratingColor, F, Icon } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import PlayerRow from '../ui/playerRow';
import { FORMATIONS, MENTALITY, PRESSING, TEMPO, POS_RU, POS_FULL, slotRating, BASE_FORMATIONS, customKey, registerCustomFormations, posFromSpot, NEAR } from '../engine/util';
import { resolveLineup, autoLineup } from '../engine/match';
import { teamPool, teamTactic, teamName } from '../engine/teams';

export function Pitch({ W, form, xi, selected, onSlot, width }) {
  const slots = FORMATIONS[form];
  const h = width * 1.15;
  return (
    <View style={{ width, height: h, backgroundColor: C.pitch, borderRadius: 18, overflow: 'hidden', alignSelf: 'center', borderWidth: 2, borderColor: C.pitchLine }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <View key={`s${i}`} style={{ position: 'absolute', left: 0, right: 0, top: (h / 10) * i, height: h / 10, backgroundColor: i % 2 ? C.pitch2 : C.pitch }} />
      ))}
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
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: sel ? C.gold : 'rgba(5,8,15,0.85)', borderWidth: 2.5, borderColor: sel ? '#fff' : p ? ratingColor(r) : C.red, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: sel ? '#1A1206' : '#fff', fontFamily: F.d8, fontSize: 18 }}>{p ? r : '!'}</Text>
            </View>
            <Text numberOfLines={1} style={{ color: '#fff', fontSize: 12, fontFamily: F.d7, marginTop: 2, textShadowColor: '#000', textShadowRadius: 4 }}>
              {p ? p.n.split(' ').slice(-1)[0] : 'пусто'}
            </Text>
            <Text style={{ color: '#cfe8d6', fontSize: 9 }}>{POS_RU[pos]}{p && p.pos !== pos ? ` (${POS_RU[p.pos]})` : ''}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function TacticsBody({ team }) {
  const G = useG();
  const W = G.W;
  const { width } = useWindowDimensions();
  const tac = teamTactic(W, team);
  const pool = teamPool(W, team);
  const [sel, setSel] = useState(null); // индекс слота
  const [edit, setEdit] = useState(false);
  const [swapIn, setSwapIn] = useState(null); // игрок из резерва ждёт, кого из запасных заменить
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
    <>
      <Chips options={Object.keys(FORMATIONS)} value={tac.form} onChange={(f) => { tac.form = f; if (tac.auto) tac.xi = null; G.refresh(); }} style={{ marginBottom: 8 }} />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <Btn small icon="create-outline" title={BASE_FORMATIONS.includes(tac.form) ? 'Своя схема на основе этой' : 'Редактировать схему'} kind="ghost" style={{ flex: 1 }} onPress={() => setEdit(true)} />
      </View>
      {edit ? <FormationEditor W={W} G={G} tac={tac} width={Math.min(width - 28, 420)} onClose={() => setEdit(false)} /> : null}
      <Pitch W={W} form={tac.form} xi={lu.xi} selected={sel} onSlot={onSlot} width={Math.min(width - 28, 420)} />
      <T muted size={12} center style={{ marginVertical: 8 }}>
        {sel === null ? 'Нажмите на игрока на поле, затем на другого игрока или запасного, чтобы поменять их местами.' : 'Выберите, кого поставить на эту позицию.'}
      </T>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <Btn small title={tac.auto ? '✓ Автосостав включён' : 'Включить автосостав'} kind={tac.auto ? 'primary' : 'ghost'} style={{ flex: 1 }} onPress={() => { tac.auto = !tac.auto; if (tac.auto) { tac.xi = null; tac.bench = null; } G.refresh(); }} />
        <Btn small title="Лучшие 11" kind="ghost" style={{ flex: 1 }} onPress={() => { const a = autoLineup(W, pool, tac.form); commit(a.xi, a.bench); }} />
      </View>
      <Card title="Установки" icon="options-outline">
        <T muted size={12} style={{ marginBottom: 6 }}>Настрой: {MENTALITY[tac.ment]}</T>
        <Seg options={MENTALITY.map((m, i) => ({ value: i, label: ['−−', '−', '=', '+', '++'][i] }))} value={tac.ment} onChange={(v) => { tac.ment = v; G.refresh(); }} />
        <T muted size={12} style={{ marginVertical: 6 }}>Прессинг</T>
        <Seg options={PRESSING.map((m, i) => ({ value: i, label: m }))} value={tac.press} onChange={(v) => { tac.press = v; G.refresh(); }} />
        <T muted size={12} style={{ marginVertical: 6 }}>Темп</T>
        <Seg options={TEMPO.map((m, i) => ({ value: i, label: m }))} value={tac.tempo} onChange={(v) => { tac.tempo = v; G.refresh(); }} />
        <T muted size={11} style={{ marginTop: 8 }}>Высокий прессинг и быстрый темп сильнее утомляют игроков. Атакующий настрой создаёт больше моментов, но открывает оборону.</T>
      </Card>
      <Card title={`Запасные · ${lu.bench.length}/9`} icon="people-outline">
        {swapIn ? (
          <View style={{ backgroundColor: C.goldDim, borderRadius: 10, padding: 10, marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <T size={13} style={{ flex: 1 }}>Скамейка заполнена. Нажмите на запасного, которого заменит {W.players[swapIn]?.n}.</T>
            <Pressable onPress={() => setSwapIn(null)}><T color={C.gold} bold size={13}>Отмена</T></Pressable>
          </View>
        ) : null}
        {lu.bench.map((id) => (
          <PlayerRow
            key={id}
            p={W.players[id]}
            selected={!!swapIn}
            onPress={() => {
              if (swapIn) {
                commit(lu.xi, lu.bench.map((x) => (x === id ? swapIn : x)));
                setSwapIn(null);
                return;
              }
              onBench(id);
            }}
            right={!swapIn && sel === null ? (
              <Pressable hitSlop={8} onPress={() => commit(lu.xi, lu.bench.filter((x) => x !== id))} style={{ padding: 6 }}>
                <Icon name="arrow-down-circle-outline" size={24} color={C.muted} />
              </Pressable>
            ) : undefined}
          />
        ))}
        {sel === null && !swapIn ? <T muted size={11} style={{ marginTop: 6 }}>↓ — убрать в резерв. Чтобы выпустить в основу — нажмите на игрока на поле, затем на запасного.</T> : null}
      </Card>
      {others.length ? (
        <Card title="Вне заявки" icon="person-remove-outline">
          {others.map((p) => (
            <PlayerRow
              key={p.id}
              p={p}
              onPress={() => (p.inj > 0 || p.ban > 0 ? G.push('player', { id: p.id }) : onBench(p.id))}
              right={sel === null && p.inj <= 0 && !(p.ban > 0) ? (
                <Pressable hitSlop={8} onPress={() => {
                  if (lu.bench.length < 9) commit(lu.xi, [...lu.bench, p.id]);
                  else setSwapIn(p.id);
                }} style={{ padding: 6 }}>
                  <Icon name="arrow-up-circle-outline" size={24} color={C.accent} />
                </Pressable>
              ) : undefined}
            />
          ))}
        </Card>
      ) : null}
    </>
  );
}

// Редактор своей схемы: выберите точку — затем место на поле, куда её поставить.
function FormationEditor({ W, G, tac, width, onClose }) {
  const isCustom = !BASE_FORMATIONS.includes(tac.form);
  const [slots, setSlots] = useState(() => FORMATIONS[tac.form].map((s) => s.slice()));
  const [sel, setSel] = useState(null);
  const [name, setName] = useState(isCustom ? tac.form.replace(/^★ /, '') : `Моя ${tac.form}`);
  const h = width * 1.15;

  const place = (e) => {
    if (sel === null || sel === 0) return;
    const { locationX, locationY } = e.nativeEvent;
    const x = Math.max(0.06, Math.min(0.94, locationX / width));
    const y = Math.max(0.14, Math.min(0.92, 1 - locationY / h));
    const pos = posFromSpot(x, y);
    const next = slots.slice();
    next[sel] = [pos === 'GK' ? 'CB' : pos, +x.toFixed(3), +y.toFixed(3)];
    setSlots(next);
  };
  const setPos = (pos) => {
    if (sel === null || sel === 0) return;
    const next = slots.slice();
    next[sel] = [pos, next[sel][1], next[sel][2]];
    setSlots(next);
  };
  const shape = (() => {
    const d = slots.slice(1).filter((s) => s[2] < 0.36).length;
    const m = slots.slice(1).filter((s) => s[2] >= 0.36 && s[2] < 0.72).length;
    return `${d}-${m}-${10 - d - m}`;
  })();
  const save = () => {
    const nm = name.trim().slice(0, 18);
    if (!nm) return G.alert('Название', 'Введите название схемы.');
    if (BASE_FORMATIONS.includes(customKey(nm))) return G.alert('Название', 'Такое имя занято.');
    W.customForms ||= {};
    if (isCustom && tac.form !== customKey(nm)) delete W.customForms[tac.form.replace(/^★ /, '')];
    W.customForms[nm] = slots;
    registerCustomFormations(W);
    tac.form = customKey(nm);
    if (tac.auto) tac.xi = null;
    G.save?.();
    G.refresh();
    onClose();
  };
  const remove = () => {
    G.dialog?.({
      title: 'Удалить схему?',
      text: `«${tac.form}» будет удалена у всех ваших команд.`,
      buttons: [
        { title: 'Отмена', kind: 'ghost' },
        { title: 'Удалить', kind: 'danger', onPress: () => { delete W.customForms[tac.form.replace(/^★ /, '')]; registerCustomFormations(W); G.refresh(); onClose(); } },
      ],
    });
  };
  const cur = sel !== null ? slots[sel] : null;
  const opts = cur && cur[0] !== 'GK' ? [cur[0], ...(NEAR[cur[0]] || []), posFromSpot(cur[1], cur[2])].filter((v, i, a) => v !== 'GK' && a.indexOf(v) === i) : [];

  return (
    <Card title={`Редактор схемы · ${shape}`} icon="construct-outline">
      <T muted size={12} style={{ marginBottom: 8 }}>
        {sel === null ? 'Нажмите на точку, затем на место на поле, куда её передвинуть.' : sel === 0 ? 'Вратарь всегда стоит в воротах.' : 'Теперь нажмите на поле — игрок переместится туда.'}
      </T>
      <View style={{ width, height: h, backgroundColor: C.pitch, borderRadius: 18, overflow: 'hidden', alignSelf: 'center', borderWidth: 2, borderColor: C.gold }}>
        <Pressable onPress={place} style={{ position: 'absolute', left: 0, top: 0, width, height: h }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <View key={`s${i}`} pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: (h / 10) * i, height: h / 10, backgroundColor: i % 2 ? C.pitch2 : C.pitch }} />
          ))}
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: h / 2, height: 2, backgroundColor: C.pitchLine }} />
          <View pointerEvents="none" style={{ position: 'absolute', left: width / 2 - 40, top: h / 2 - 40, width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: C.pitchLine }} />
          <View pointerEvents="none" style={{ position: 'absolute', left: width * 0.25, width: width * 0.5, bottom: 0, height: h * 0.14, borderWidth: 2, borderColor: C.pitchLine, borderBottomWidth: 0 }} />
        </Pressable>
        {slots.map(([pos, x, y], i) => {
          const on = sel === i;
          return (
            <Pressable key={i} onPress={() => setSel(on ? null : i)} hitSlop={6} style={{ position: 'absolute', left: x * width - 22, top: Math.min(h - 48, (1 - y) * h - 22), width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.gold : 'rgba(5,8,15,0.85)', borderWidth: 2.5, borderColor: on ? '#fff' : C.pitchLine }}>
              <Text style={{ color: on ? '#1A1206' : '#fff', fontFamily: F.d7, fontSize: 13 }}>{POS_RU[pos]}</Text>
            </Pressable>
          );
        })}
      </View>
      {opts.length ? (
        <>
          <T muted size={12} style={{ marginTop: 10, marginBottom: 6 }}>Роль точки: {POS_FULL[cur[0]]}</T>
          <Chips options={opts.map((o) => ({ value: o, label: POS_RU[o] }))} value={cur[0]} onChange={setPos} />
        </>
      ) : null}
      <T muted size={12} style={{ marginTop: 12, marginBottom: 6 }}>Название</T>
      <TextInput value={name} onChangeText={setName} maxLength={18} placeholder="Например, Мой прессинг" placeholderTextColor={C.dim} style={{ backgroundColor: C.card2, borderRadius: 12, borderWidth: 1, borderColor: C.line, color: C.text, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 }} />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <Btn small title="Отмена" kind="ghost" style={{ flex: 1 }} onPress={onClose} />
        {isCustom ? <Btn small title="Удалить" kind="danger" style={{ flex: 1 }} onPress={remove} /> : null}
        <Btn small title="Сохранить" kind="gold" style={{ flex: 1.3 }} onPress={save} />
      </View>
    </Card>
  );
}

export default function TacticsScreen({ team }) {
  const G = useG();
  return (
    <Page title="Тактика" sub={teamName(G.W, team)} back>
      <TacticsBody team={team} />
    </Page>
  );
}
