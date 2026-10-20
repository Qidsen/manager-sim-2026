import React, { useState, useRef } from 'react';
import { View, Text, Pressable, TextInput, useWindowDimensions } from 'react-native';
import { C, T, Seg, Chips, Card, Btn, ratingColor, F, Icon } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import PlayerRow from '../ui/playerRow';
import { dynDelta } from '../engine/util';
import { PosBadge } from '../ui/playerRow';
import { Bar } from '../ui/kit';
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
        const r = p ? Math.round(slotRating(p, pos) + dynDelta(p)) : 0;
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
            {p ? <View style={{ width: 34, height: 3, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.4)', marginTop: 2 }}><View style={{ width: `${Math.max(0, Math.min(100, p.fit))}%`, height: 3, borderRadius: 2, backgroundColor: p.fit < 65 ? C.red : p.fit < 80 ? C.orange : C.accent }} /></View> : null}
            <Text style={{ color: '#cfe8d6', fontSize: 9 }}>{POS_RU[pos]}{p && p.pos !== pos && !(p.alt || []).includes(pos) ? ` (${POS_RU[p.pos]})` : ''}</Text>
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

  // поставить игрока на выбранную позицию: меняется местами с тем, кто там стоял
  const place = (pid) => {
    const xi = lu.xi.slice();
    let bench = lu.bench.slice();
    const out = xi[sel];
    const j = xi.indexOf(pid);
    if (j >= 0) { xi[j] = out; xi[sel] = pid; }
    else {
      xi[sel] = pid;
      const b = bench.indexOf(pid);
      if (b >= 0) { if (out) bench[b] = out; else bench.splice(b, 1); }
    }
    setSel(null);
    commit(xi, bench.slice(0, 9));
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
      {sel === null ? (
        <T muted size={12} center style={{ marginVertical: 8 }}>Нажмите на игрока на поле — появится список, кем его заменить.</T>
      ) : (
        <Candidates W={W} slots={FORMATIONS[tac.form]} sel={sel} lu={lu} pool={pool} onPick={(pid) => place(pid)} onClose={() => setSel(null)} />
      )}
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

// Редактор своей схемы: поле разбито на линии и колонки — игроки встают ровно.
const ROWS = [
  { y: 0.2, ru: 'Защита' },
  { y: 0.34, ru: 'Опорная зона' },
  { y: 0.48, ru: 'Центр поля' },
  { y: 0.62, ru: 'Атакующая зона' },
  { y: 0.8, ru: 'Нападение' },
];
const COLS = [0.1, 0.23, 0.37, 0.5, 0.63, 0.77, 0.9];
const nearestRow = (y) => ROWS.reduce((b, r, i) => (Math.abs(r.y - y) < Math.abs(ROWS[b].y - y) ? i : b), 0);
const nearestCol = (x) => COLS.reduce((b, c, i) => (Math.abs(c - x) < Math.abs(COLS[b] - x) ? i : b), 0);
// ровная симметричная расстановка n игроков в линии
function rowXs(n, ri) {
  if (n <= 1) return [0.5];
  if (n === 2) return [0.34, 0.66];
  if (n === 3) return ri <= 2 ? [0.3, 0.5, 0.7] : [0.2, 0.5, 0.8];
  if (n === 4) return [0.12, 0.37, 0.63, 0.88];
  return [0.1, 0.3, 0.5, 0.7, 0.9];
}
function align(slots) {
  const next = slots.map((s) => s.slice());
  ROWS.forEach((r, ri) => {
    const idx = next.map((s, i) => i).filter((i) => i > 0 && nearestRow(next[i][2]) === ri).sort((a, b) => next[a][1] - next[b][1]);
    const xs = rowXs(idx.length, ri);
    idx.forEach((i, k) => {
      const s = next[i];
      s[1] = xs[k];
      s[2] = r.y;
      if (!s[3]) s[0] = posFromSpot(s[1], s[2]);
    });
  });
  next[0] = ['GK', 0.5, 0.04];
  return next;
}
const rowCount = (slots, ri) => slots.filter((s, i) => i > 0 && nearestRow(s[2]) === ri).length;

function FormationEditor({ W, G, tac, width, onClose }) {
  const isCustom = !BASE_FORMATIONS.includes(tac.form);
  const [auto, setAuto] = useState(true);
  const [slots, setSlots] = useState(() => align(FORMATIONS[tac.form].map((s) => s.slice(0, 3))));
  const [sel, setSel] = useState(null);
  const [name, setName] = useState(isCustom ? tac.form.replace(/^★ /, '') : `Моя ${tac.form}`);
  const h = width * 1.15;
  const yPx = (y) => (1 - y) * h;

  const pitchRef = useRef(null);
  const onPitchPress = (e) => {
    if (sel === null || sel === 0) return;
    const { pageX, pageY } = e.nativeEvent;
    pitchRef.current?.measure((x, y, w, hh, px, py) => place(pageX - px, pageY - py));
  };
  const place = (locationX, locationY) => {
    const ri = nearestRow(1 - locationY / h);
    const cur = nearestRow(slots[sel][2]);
    if (ri !== cur && rowCount(slots, ri) >= 5) return G.alert('Линия заполнена', 'В одной линии может быть не больше 5 игроков.');
    let next = slots.map((s) => s.slice());
    if (auto) {
      next[sel] = [next[sel][0], locationX / width, ROWS[ri].y];
      next[sel][3] = undefined;
      next = align(next);
    } else {
      const x = COLS[nearestCol(locationX / width)];
      const y = ROWS[ri].y;
      const other = next.findIndex((s, i) => i > 0 && i !== sel && Math.abs(s[1] - x) < 0.01 && Math.abs(s[2] - y) < 0.01);
      if (other > 0) { next[other][1] = next[sel][1]; next[other][2] = next[sel][2]; if (!next[other][3]) next[other][0] = posFromSpot(next[other][1], next[other][2]); }
      next[sel] = [posFromSpot(x, y), x, y];
    }
    setSlots(next);
  };
  const setPos = (pos) => {
    if (sel === null || sel === 0) return;
    const next = slots.map((s) => s.slice());
    next[sel][0] = pos;
    next[sel][3] = 'm';
    setSlots(next);
  };
  const toggleAuto = () => {
    const v = !auto;
    setAuto(v);
    if (v) setSlots(align(slots));
  };
  const counts = ROWS.map((_, ri) => rowCount(slots, ri));
  const shape = counts.filter(Boolean).join('-');
  const save = () => {
    const nm = name.trim().slice(0, 18);
    if (!nm) return G.alert('Название', 'Введите название схемы.');
    if (BASE_FORMATIONS.includes(customKey(nm))) return G.alert('Название', 'Такое имя занято.');
    W.customForms ||= {};
    if (isCustom && tac.form !== customKey(nm)) delete W.customForms[tac.form.replace(/^★ /, '')];
    W.customForms[nm] = slots.map((s) => [s[0], +(+s[1]).toFixed(3), +(+s[2]).toFixed(3)]);
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
  const opts = cur && sel !== 0 ? [posFromSpot(cur[1], cur[2]), cur[0], ...(NEAR[posFromSpot(cur[1], cur[2])] || [])].filter((v, i, a) => v !== 'GK' && a.indexOf(v) === i) : [];

  return (
    <Card title={`Редактор схемы · ${shape}`} icon="construct-outline">
      <T muted size={12} style={{ marginBottom: 8 }}>
        {sel === null ? 'Нажмите на игрока, затем на линию, куда его поставить.' : sel === 0 ? 'Вратарь всегда стоит в воротах.' : auto ? 'Нажмите на нужную линию — игроки в ней выстроятся ровно и симметрично.' : 'Нажмите на клетку сетки.'}
      </T>
      <Seg options={[{ value: true, label: 'Ровные линии' }, { value: false, label: 'Свободная сетка' }]} value={auto} onChange={(v) => v !== auto && toggleAuto()} style={{ marginBottom: 10 }} />
      <View style={{ width, height: h, backgroundColor: C.pitch, borderRadius: 18, overflow: 'hidden', alignSelf: 'center', borderWidth: 2, borderColor: C.gold }}>
        <Pressable ref={pitchRef} onPress={onPitchPress} style={{ position: 'absolute', left: 0, top: 0, width, height: h }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <View key={`s${i}`} pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: (h / 10) * i, height: h / 10, backgroundColor: i % 2 ? C.pitch2 : C.pitch }} />
          ))}
          <View pointerEvents="none" style={{ position: 'absolute', left: width * 0.25, width: width * 0.5, bottom: 0, height: h * 0.14, borderWidth: 2, borderColor: C.pitchLine, borderBottomWidth: 0 }} />
          {ROWS.map((r, ri) => (
            <View key={ri} pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: yPx(r.y) - 1, height: 2, backgroundColor: sel !== null && sel !== 0 ? 'rgba(255,181,71,0.45)' : 'rgba(255,255,255,0.13)' }}>
              <Text style={{ position: 'absolute', left: 6, top: -34, color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: '700' }}>{r.ru.toUpperCase()} · {counts[ri]}</Text>
            </View>
          ))}
          {!auto ? ROWS.map((r, ri) => COLS.map((c, ci) => (
            <View key={`${ri}-${ci}`} pointerEvents="none" style={{ position: 'absolute', left: c * width - 3, top: yPx(r.y) - 3, width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' }} />
          ))) : null}
        </Pressable>
        {slots.map(([pos, x, y], i) => {
          const on = sel === i;
          return (
            <Pressable key={i} onPress={() => setSel(on ? null : i)} hitSlop={4} style={{ position: 'absolute', left: x * width - 21, top: Math.min(h - 46, yPx(y) - 21), width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.gold : 'rgba(5,8,15,0.88)', borderWidth: 2.5, borderColor: on ? '#fff' : C.pitchLine }}>
              <Text style={{ color: on ? '#1A1206' : '#fff', fontFamily: F.d7, fontSize: 13 }}>{POS_RU[pos]}</Text>
            </Pressable>
          );
        })}
      </View>
      {opts.length ? (
        <>
          <T muted size={12} style={{ marginTop: 10, marginBottom: 6 }}>Роль игрока: {POS_FULL[cur[0]]}</T>
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

// Кандидаты на выбранную позицию: все доступные игроки, лучшие для этой позиции — сверху
function Candidates({ W, slots, sel, lu, pool, onPick, onClose }) {
  const [all, setAll] = useState(false);
  const pos = slots[sel][0];
  const curId = lu.xi[sel];
  const cur = curId ? W.players[curId] : null;
  const bench = new Set(lu.bench);
  const list = pool
    .map((id) => W.players[id])
    .filter((p) => p && p.id !== curId && p.inj <= 0 && !(p.ban > 0))
    .map((p) => ({ p, r: Math.round(slotRating(p, pos) + dynDelta(p)), xiAt: lu.xi.indexOf(p.id) }))
    .sort((a, b) => b.r - a.r);
  const shown = all ? list : list.slice(0, 8);
  const tag = (x) => (x.xiAt >= 0 ? [`основа · ${POS_RU[slots[x.xiAt][0]]}`, C.accent] : bench.has(x.p.id) ? ['запас', C.gold] : ['резерв', C.muted]);
  return (
    <Card style={{ marginTop: 10, borderColor: C.gold + '66' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <T bold size={15} style={{ flex: 1 }}>Позиция {POS_RU[pos]}: кого поставить?</T>
        <Pressable onPress={onClose} hitSlop={8}><Icon name="close" size={20} color={C.muted} /></Pressable>
      </View>
      {cur ? <T muted size={12} style={{ marginBottom: 6 }}>Сейчас: {cur.n} · {Math.round(slotRating(cur, pos) + dynDelta(cur))} на позиции · свежесть {Math.round(cur.fit)}%</T> : null}
      {shown.map((x) => {
        const [tg, tc] = tag(x);
        const better = cur ? x.r - Math.round(slotRating(cur, pos) + dynDelta(cur)) : null;
        return (
          <Pressable key={x.p.id} onPress={() => onPick(x.p.id)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: C.line }, pressed && { backgroundColor: C.card2 }]}>
            <PosBadge pos={x.p.pos} size="sm" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <T size={14} numberOfLines={1}>{x.p.n}</T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Text style={{ color: tc, fontSize: 11, fontWeight: '800' }}>{tg}</Text>
                <Bar value={x.p.fit} height={3} color={x.p.fit < 65 ? C.red : x.p.fit < 80 ? C.orange : C.accent} style={{ width: 40 }} />
              </View>
            </View>
            {better !== null && better !== 0 ? <Text style={{ color: better > 0 ? C.accent : C.red, fontSize: 12, fontWeight: '800' }}>{better > 0 ? `+${better}` : better}</Text> : null}
            <View style={{ minWidth: 36, paddingVertical: 4, borderRadius: 8, alignItems: 'center', backgroundColor: ratingColor(x.r) + '22', borderWidth: 1, borderColor: ratingColor(x.r) + '88' }}>
              <Text style={{ color: ratingColor(x.r), fontFamily: F.d8, fontSize: 16 }}>{x.r}</Text>
            </View>
          </Pressable>
        );
      })}
      {list.length > 8 ? <Btn small kind="ghost" title={all ? 'Свернуть' : `Показать всех (${list.length})`} style={{ marginTop: 8 }} onPress={() => setAll(!all)} /> : null}
      <T muted size={11} style={{ marginTop: 8 }}>Число — рейтинг игрока именно на этой позиции с учётом формы. Игрок из основы поменяется позициями, запасной — местами со скамейкой.</T>
    </Card>
  );
}
