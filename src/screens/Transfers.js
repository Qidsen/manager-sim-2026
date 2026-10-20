import React, { useState } from 'react';
import { View } from 'react-native';
import { C, T, Seg, Chips, Card, Btn, Field, Empty, Badge } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import PlayerRow from '../ui/playerRow';
import { POSITIONS, POS_RU, money, playerValue } from '../engine/util';
import { canTrade, answerOffer, askingPrice } from '../engine/sim';
import { isWindow } from '../engine/fixtures';

export default function TransfersScreen() {
  const G = useG();
  const W = G.W;
  const u = W.user;
  const [seg, setSeg] = useState('search');
  const [pos, setPos] = useState('ALL');
  const [age, setAge] = useState(99);
  const [minOvr, setMinOvr] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);

  if (!u.club) return <Page title="Трансферы"><Empty text="Трансферы доступны тренеру клуба." /></Page>;
  const my = W.clubs[u.club];

  const search = (fa = false) => {
    const minO = parseInt(minOvr, 10) || 0;
    const maxP = parseFloat(String(maxPrice).replace(',', '.')) * 1e6 || Infinity;
    const qq = q.trim().toLowerCase();
    const out = [];
    for (const id in W.players) {
      const p = W.players[id];
      if (p.club === my.id || p.aca) continue;
      if (fa && !p.fa) continue;
      if (pos !== 'ALL' && p.pos !== pos) continue;
      if (p.age > age || p.ovr < minO) continue;
      if (qq && !p.n.toLowerCase().includes(qq)) continue;
      if (playerValue(p) > maxP) continue;
      out.push(p);
    }
    out.sort((a, b) => b.ovr - a.ovr || a.age - b.age);
    setRes(out.slice(0, 80));
  };

  const offers = W.offers.filter((o) => W.players[o.pid]?.club === my.id);

  return (
    <Page title="Трансферы" sub={`Бюджет: ${money(my.balance)}`}>
      <Card style={{ backgroundColor: isWindow(W.day) ? C.accentDim : C.card2 }}>
        <T bold>{isWindow(W.day) ? '🟢 Трансферное окно открыто' : '🔴 Трансферное окно закрыто'}</T>
        <T muted size={12} style={{ marginTop: 4 }}>Окна: 1 июля – 31 августа и 1–31 января. Свободных агентов можно подписывать в любое время.</T>
      </Card>
      <Seg options={[{ value: 'search', label: 'Поиск' }, { value: 'fa', label: 'Свободные' }, { value: 'offers', label: `Офферы${offers.length ? ` (${offers.length})` : ''}` }, { value: 'list', label: 'Продаю' }]} value={seg} onChange={(v) => { setSeg(v); setRes(null); }} style={{ marginBottom: 12 }} />

      {seg === 'search' || seg === 'fa' ? (
        <>
          <Chips options={[{ value: 'ALL', label: 'Все' }, ...POSITIONS.map((p) => ({ value: p, label: POS_RU[p] }))]} value={pos} onChange={setPos} style={{ marginBottom: 10 }} />
          <Seg options={[{ value: 99, label: 'Любой' }, { value: 21, label: '≤21' }, { value: 25, label: '≤25' }, { value: 29, label: '≤29' }]} value={age} onChange={setAge} style={{ marginBottom: 10 }} />
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            <Field value={minOvr} onChangeText={setMinOvr} placeholder="Рейтинг от" keyboardType="numeric" style={{ flex: 1, minWidth: 0 }} />
            <Field value={maxPrice} onChangeText={setMaxPrice} placeholder="Цена до, млн" keyboardType="numeric" style={{ flex: 1, minWidth: 0 }} />
          </View>
          <Field value={q} onChangeText={setQ} placeholder="Имя игрока" style={{ marginBottom: 10 }} />
          <Btn title="Найти" onPress={() => search(seg === 'fa')} style={{ marginBottom: 12 }} />
          {res ? (
            res.length ? (
              res.map((p) => (
                <PlayerRow key={p.id} p={p} W={W} showClub onPress={() => G.push('player', { id: p.id })} right={<T size={12} muted style={{ width: 74, textAlign: 'right' }}>{p.fa ? 'бесплатно' : money(askingPrice(W, p))}</T>} />
              ))
            ) : (
              <Empty text="Никого не нашли. Ослабьте фильтры." />
            )
          ) : null}
        </>
      ) : null}

      {seg === 'offers' ? (
        offers.length ? (
          offers.map((o) => {
            const p = W.players[o.pid];
            return (
              <Card key={o.id}>
                <T bold>{p.n} ({p.ovr}, {p.age})</T>
                <T muted size={13} style={{ marginVertical: 4 }}>«{W.clubs[o.from].name}» предлагает {money(o.fee)} · стоимость {money(playerValue(p))}</T>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  <Btn small title="Принять" style={{ flex: 1 }} onPress={() => { const r = answerOffer(W, o.id, true); G.alert(r.status === 'accepted' ? 'Сделка' : 'Не получилось', r.msg); G.refresh(); }} />
                  <Btn small title="Отклонить" kind="ghost" style={{ flex: 1 }} onPress={() => { answerOffer(W, o.id, false); G.refresh(); }} />
                </View>
              </Card>
            );
          })
        ) : (
          <Empty text="Предложений нет. Выставьте игроков на трансфер в их карточках — покупатели появятся в трансферное окно." />
        )
      ) : null}

      {seg === 'list' ? (
        (() => {
          const listed = my.squad.map((x) => W.players[x]).filter((p) => p.listed);
          return listed.length ? listed.map((p) => <PlayerRow key={p.id} p={p} onPress={() => G.push('player', { id: p.id })} right={<T size={12} muted>{money(playerValue(p))}</T>} />) : <Empty text="Никто не выставлен на продажу." />;
        })()
      ) : null}
    </Page>
  );
}
