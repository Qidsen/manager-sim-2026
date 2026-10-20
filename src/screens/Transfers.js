import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { C, F, T, Seg, Chips, Card, Btn, Field, Empty, Icon, Badge, Rating, tap } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import PlayerRow, { PosBadge } from '../ui/playerRow';
import { POSITIONS, POS_RU, money, playerValue, fmtShort } from '../engine/util';
import { answerOffer } from '../engine/sim';
import { counterOffer, sellerName, ROLES } from '../engine/market';
import { isWindow, WINDOWS } from '../engine/fixtures';

const OVR = [{ value: 0, label: 'Любой' }, { value: 65, label: '65+' }, { value: 70, label: '70+' }, { value: 75, label: '75+' }, { value: 80, label: '80+' }, { value: 85, label: '85+' }];
const PRICE = [{ value: Infinity, label: 'Любая цена' }, { value: 2e6, label: 'до €2 млн' }, { value: 1e7, label: 'до €10 млн' }, { value: 3e7, label: 'до €30 млн' }, { value: 8e7, label: 'до €80 млн' }];
const AGE = [{ value: 99, label: 'Любой' }, { value: 21, label: '≤21' }, { value: 24, label: '≤24' }, { value: 28, label: '≤28' }];

export default function TransfersScreen() {
  const G = useG();
  const W = G.W;
  const u = W.user;
  const [seg, setSeg] = useState('search');
  const [pos, setPos] = useState('ALL');
  const [age, setAge] = useState(99);
  const [minOvr, setMinOvr] = useState(0);
  const [maxPrice, setMaxPrice] = useState(Infinity);
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);

  if (!u.club) return <Page title="Трансферы"><Empty text="Трансферы доступны тренеру клуба." icon="swap-horizontal" /></Page>;
  const my = W.clubs[u.club];
  const open = isWindow(W.day);
  const nextWin = W.day < WINDOWS[1][0] ? `откроется ${fmtShort(W.year, WINDOWS[1][0])}` : 'откроется 1 июля';

  const search = (fa = false) => {
    const qq = q.trim().toLowerCase();
    const out = [];
    for (const id in W.players) {
      const p = W.players[id];
      if (p.club === my.id || p.aca || p.pros) continue;
      if (fa && !p.fa) continue;
      if (pos !== 'ALL' && p.pos !== pos) continue;
      if (p.age > age || p.ovr < minOvr) continue;
      if (qq && !p.n.toLowerCase().includes(qq)) continue;
      if (!p.fa && playerValue(p) > maxPrice) continue;
      out.push(p);
    }
    out.sort((a, b) => b.ovr - a.ovr || a.age - b.age);
    setRes(out.slice(0, 80));
  };

  const offers = W.offers.filter((o) => W.players[o.pid]?.club === my.id);
  const talks = Object.values(W.negs || {}).filter((n) => n.status === 'open' && W.players[n.pid]);

  return (
    <Page title="Трансферы" sub={`Бюджет ${money(my.balance)}`}>
      <View style={[st.window, { backgroundColor: open ? C.accentDim : C.card, borderColor: open ? C.accent + '55' : C.line }]}>
        <Icon name={open ? 'lock-open' : 'lock-closed'} size={18} color={open ? C.accent : C.muted} />
        <View style={{ flex: 1 }}>
          <T bold size={14}>{open ? 'Трансферное окно открыто' : `Окно закрыто · ${nextWin}`}</T>
          <T muted size={11}>Со свободными агентами можно договариваться в любое время</T>
        </View>
      </View>
      <Pressable onPress={() => { tap(); G.push('scouting'); }} style={[st.window, { backgroundColor: C.card, borderColor: C.line }]}>
        <Icon name="eye" size={18} color={C.gold} />
        <View style={{ flex: 1 }}>
          <T bold size={14}>Скаутская сеть</T>
          <T muted size={11}>{(W.scouting?.scouts?.length || 0)} скаут(ов) · отчётов: {Object.keys(W.scouting?.reports || {}).length}{W.scouting?.unseen ? ` · новых: ${W.scouting.unseen}` : ''}</T>
        </View>
        <Icon name="chevron-forward" size={18} color={C.muted} />
      </Pressable>

      <Chips
        options={[
          { value: 'search', label: 'Поиск' },
          { value: 'fa', label: 'Свободные агенты' },
          { value: 'talks', label: `Переговоры${talks.length ? ` · ${talks.length}` : ''}` },
          { value: 'offers', label: `Предложения${offers.length ? ` · ${offers.length}` : ''}` },
          { value: 'list', label: 'На продаже' },
        ]}
        value={seg}
        onChange={(v) => { setSeg(v); setRes(null); }}
        style={{ marginBottom: 12 }}
      />

      {seg === 'search' || seg === 'fa' ? (
        <>
          <Card title="Фильтры" icon="options-outline">
            <Chips options={[{ value: 'ALL', label: 'Все позиции' }, ...POSITIONS.map((p) => ({ value: p, label: POS_RU[p] }))]} value={pos} onChange={setPos} style={{ marginBottom: 10 }} />
            <Chips options={OVR} value={minOvr} onChange={setMinOvr} style={{ marginBottom: 10 }} />
            {seg === 'search' ? <Chips options={PRICE} value={maxPrice} onChange={setMaxPrice} style={{ marginBottom: 10 }} /> : null}
            <Seg options={AGE} value={age} onChange={setAge} style={{ marginBottom: 10 }} />
            <Field value={q} onChangeText={setQ} placeholder="Поиск по имени" style={{ marginBottom: 10 }} />
            <Btn title="НАЙТИ" icon="search" onPress={() => search(seg === 'fa')} />
          </Card>
          {res ? (
            res.length ? (
              <Card title={`Найдено: ${res.length}${res.length === 80 ? '+' : ''}`} icon="people-outline">
                {res.map((p) => (
                  <PlayerRow
                    key={p.id}
                    p={p}
                    W={W}
                    showClub
                    onPress={() => G.push('player', { id: p.id })}
                    right={
                      <View style={{ alignItems: 'flex-end', width: 76 }}>
                        <Text style={st.price}>{p.fa ? 'бесплатно' : money(playerValue(p))}</Text>
                        <T muted size={10}>{p.fa ? `${money(p.wage)}/нед` : 'стоимость'}</T>
                      </View>
                    }
                  />
                ))}
              </Card>
            ) : (
              <Empty text="Никого не нашли. Ослабьте фильтры." icon="search" />
            )
          ) : null}
        </>
      ) : null}

      {seg === 'talks' ? (
        talks.length ? (
          <Card title="Идут переговоры" icon="chatbubbles-outline">
            {talks.map((n) => {
              const p = W.players[n.pid];
              const last = n.log[n.log.length - 1];
              return (
                <Pressable key={n.pid} onPress={() => { tap(); G.push('negotiate', { pid: n.pid, kind: n.kind }); }} style={st.talk}>
                  <PosBadge pos={p.pos} />
                  <View style={{ flex: 1 }}>
                    <T bold size={14} numberOfLines={1}>{p.n}</T>
                    <T muted size={12} numberOfLines={2}>{last?.text}</T>
                  </View>
                  <Badge text={n.kind === 'renew' ? 'ПРОДЛЕНИЕ' : n.kind === 'loan' ? 'АРЕНДА' : n.stage === 'fee' ? 'С КЛУБОМ' : 'КОНТРАКТ'} color={C.gold} />
                </Pressable>
              );
            })}
          </Card>
        ) : (
          <Empty text="Активных переговоров нет. Найдите игрока и нажмите «Начать переговоры»." icon="chatbubbles-outline" />
        )
      ) : null}

      {seg === 'offers' ? (
        offers.length ? (
          offers.map((o) => <OfferCard key={o.id} o={o} />)
        ) : (
          <Empty text="Предложений нет. Выставьте игроков на трансфер в их карточках — покупатели появятся в трансферное окно." icon="mail-open-outline" />
        )
      ) : null}

      {seg === 'list' ? (
        (() => {
          const listed = my.squad.map((x) => W.players[x]).filter((p) => p.listed);
          return listed.length ? (
            <Card title="Выставлены на трансфер" icon="pricetag-outline">
              {listed.map((p) => (
                <PlayerRow key={p.id} p={p} onPress={() => G.push('player', { id: p.id })} right={<Text style={st.price}>{money(playerValue(p))}</Text>} />
              ))}
            </Card>
          ) : (
            <Empty text="Никто не выставлен на продажу." icon="pricetag-outline" />
          );
        })()
      ) : null}
    </Page>
  );
}

function OfferCard({ o }) {
  const G = useG();
  const W = G.W;
  const p = W.players[o.pid];
  const b = W.clubs[o.from];
  const [ask, setAsk] = useState(null);
  const val = playerValue(p);
  const pct = Math.round((o.fee / val) * 100);
  const act = (r) => {
    if (r.error) return G.alert('Нельзя', r.error);
    if (r.status) G.alert(r.status === 'accepted' ? 'Сделка' : 'Готово', r.msg);
    setAsk(null);
    G.refresh();
  };
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Rating v={p.ovr} />
        <View style={{ flex: 1 }}>
          <T bold size={15}>{p.n}</T>
          <T muted size={12}>{POS_RU[p.pos]} · {p.age} лет · стоимость {money(val)}</T>
        </View>
      </View>
      <View style={st.offerBox}>
        <T muted size={12}>«{b.name}» предлагает</T>
        <Text style={st.offerSum}>{money(o.fee)}</Text>
        <T size={12} bold color={pct >= 100 ? C.accent : pct >= 80 ? C.orange : C.red}>{pct}% от стоимости</T>
      </View>
      {(o.log || []).slice(-3).map((m, i) => (
        <T key={i} size={12} muted={m.who === 'them'} color={m.who === 'me' ? C.gold : undefined} style={{ marginBottom: 3 }}>{m.who === 'me' ? 'Вы: ' : ''}{m.text}</T>
      ))}
      {ask !== null ? (
        <View style={{ marginTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Btn small kind="ghost" title="−" onPress={() => setAsk(Math.max(o.fee, ask - Math.max(1e5, Math.round(ask * 0.03 / 1e5) * 1e5)))} />
            <Text style={[st.offerSum, { flex: 1, textAlign: 'center', fontSize: 22 }]}>{money(ask)}</Text>
            <Btn small kind="ghost" title="+" onPress={() => setAsk(ask + Math.max(1e5, Math.round(ask * 0.03 / 1e5) * 1e5))} />
          </View>
          <Btn small title="ПОПРОСИТЬ БОЛЬШЕ" icon="send" style={{ marginTop: 8 }} onPress={() => act(counterOffer(W, o.id, ask))} />
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        <Btn small kind="green" title="Принять" icon="checkmark" style={{ flex: 1 }} onPress={() => act(answerOffer(W, o.id, true))} />
        {ask === null ? <Btn small kind="ghost" title="Торговаться" style={{ flex: 1 }} onPress={() => setAsk(Math.round((o.fee * 1.2) / 1e5) * 1e5)} /> : null}
        <Btn small kind="danger" title="Нет" style={{ flex: 0.6 }} onPress={() => act(answerOffer(W, o.id, false))} />
      </View>
    </Card>
  );
}

const st = StyleSheet.create({
  window: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1 },
  price: { color: C.text, fontFamily: F.d7, fontSize: 15 },
  talk: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  offerBox: { alignItems: 'center', backgroundColor: C.bg2, borderRadius: 14, paddingVertical: 10, marginVertical: 10, borderWidth: 1, borderColor: C.line },
  offerSum: { color: C.gold, fontFamily: F.d8, fontSize: 30 },
});
