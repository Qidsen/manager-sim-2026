import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, T, Card, Btn, Bar, Rating, Field, Seg, Stat, Badge, ratingColor } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import { POS_FULL, POS_RU, ATTRS, ATTR_RU, money, playerValue, clamp } from '../engine/util';
import { NATION_BY_CODE } from '../data/nations';
import { makeBid, requestLoan, quickSell, releasePlayer, renewContract, renewDemand, talkToPlayer, wageDemand, askingPrice, promoteYouth, releaseYouth } from '../engine/sim';
import { playerAvgRating } from '../engine/query';

export default function PlayerScreen({ id }) {
  const G = useG();
  const W = G.W;
  const p = W.players[id];
  const u = W.user;
  const [bidOpen, setBidOpen] = useState(false);
  if (!p) return <Page title="Игрок" back><T muted>Игрок завершил карьеру.</T></Page>;
  const my = u.club ? W.clubs[u.club] : null;
  const mine = my && p.club === my.id;
  const club = p.club ? W.clubs[p.club] : null;
  const scout = my ? my.staff.scout : 2;
  const err = mine ? 2 : Math.max(1, 7 - scout);
  const potLo = clamp(p.pot - err, p.ovr, 99);
  const potHi = clamp(p.pot + err, p.ovr, 99);
  const avg = playerAvgRating(p);
  const nation = NATION_BY_CODE[p.nat];
  const natTeam = u.nation === p.nat ? W.nations[u.nation] : null;
  const called = natTeam?.squad.includes(p.id);

  const show = (r) => {
    G.alert(r.status === 'accepted' ? 'Готово' : r.status === 'counter' ? 'Встречное предложение' : 'Ответ', r.msg);
    G.refresh();
  };

  return (
    <Page title={p.n} sub={`${POS_FULL[p.pos]} · ${p.age} лет`} back>
      <LinearGradient colors={[(club?.color || '#4C8DFF') + '40', C.card]} style={ps.hero}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={[ps.ovrBox, { borderColor: ratingColor(p.ovr) }]}>
            <Text style={[ps.ovr, { color: ratingColor(p.ovr) }]}>{p.ovr}</Text>
            <Text style={ps.ovrLbl}>{POS_RU[p.pos]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ps.nat}>{nation?.flag || ''} {(nation?.name || p.nat).toUpperCase()}</Text>
            <T display size={22} numberOfLines={1}>{club ? club.name : p.fa ? 'Свободный агент' : p.aca ? 'Академия' : 'Внутренний чемпионат'}</T>
            {p.loan ? <T muted size={12}>аренда из «{W.clubs[p.loan.from]?.name || '—'}»</T> : null}
          </View>
        </View>
        <View style={ps.facts}>
          <Fact label="Потенциал" value={potLo === potHi ? `${potLo}` : `${potLo}–${potHi}`} color={ratingColor(p.pot)} />
          <Fact label="Стоимость" value={money(playerValue(p))} />
          {club || p.fa ? <Fact label="Зарплата/нед" value={money(p.wage)} /> : null}
          {club ? <Fact label="Контракт" value={`до ${p.contract + 1}`} /> : null}
        </View>
        {p.inj > 0 || p.ban > 0 ? (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {p.inj > 0 ? <Badge icon="medkit" text={`ТРАВМА · ~${Math.ceil(p.inj / 7)} НЕД.`} color={C.red} /> : null}
            {p.ban > 0 ? <Badge icon="square" text={`ДИСКВАЛИФИКАЦИЯ · ${p.ban}`} color={C.red} /> : null}
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 14 }}>
          <View style={{ flex: 1 }}>
            <T muted size={11}>Готовность {Math.round(p.fit)}%</T>
            <Bar value={p.fit} color={p.fit < 70 ? C.orange : C.accent} height={6} style={{ marginTop: 4 }} />
          </View>
          <View style={{ flex: 1 }}>
            <T muted size={11}>Мораль {Math.round(p.mor)}%</T>
            <Bar value={p.mor} color={p.mor < 40 ? C.red : p.mor < 60 ? C.orange : C.blue} height={6} style={{ marginTop: 4 }} />
          </View>
        </View>
      </LinearGradient>

      <Card title="Навыки" icon="analytics-outline">
        {ATTRS.filter((k) => (p.pos === 'GK' ? true : k !== 'gk')).map((k) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9 }}>
            <T size={13} style={{ width: 92 }} muted>{ATTR_RU[k]}</T>
            <Bar value={p.a[k]} color={ratingColor(p.a[k])} height={8} style={{ flex: 1 }} />
            <Text style={{ width: 28, textAlign: 'right', color: ratingColor(p.a[k]), fontFamily: F.d8, fontSize: 17 }}>{Math.round(p.a[k])}</Text>
          </View>
        ))}
      </Card>

      <Card title="Статистика" icon="stats-chart-outline">
        <View style={{ flexDirection: 'row' }}>
          <Stat label="Матчи" value={p.st.app} />
          <Stat label="Голы" value={p.st.g} />
          <Stat label="Пасы" value={p.st.as} />
          <Stat label="Оценка" value={avg ? avg.toFixed(2) : '—'} />
        </View>
        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          <Stat label="Карьера: матчи" value={p.car.app} />
          <Stat label="Карьера: голы" value={p.car.g} />
          <Stat label="За сборную" value={`${p.caps} / ${p.ng}`} />
        </View>
      </Card>

      {natTeam ? (
        <Btn
          title={called ? 'Исключить из сборной' : 'Вызвать в сборную'}
          kind={called ? 'ghost' : 'gold'}
          style={{ marginBottom: 10 }}
          onPress={() => {
            if (called) natTeam.squad = natTeam.squad.filter((x) => x !== p.id);
            else if (natTeam.squad.length >= 26) return G.alert('Заявка заполнена', 'В сборную можно вызвать не больше 26 игроков.');
            else natTeam.squad.push(p.id);
            u.autoCall = false;
            G.refresh();
          }}
        />
      ) : null}

      {mine && p.aca ? (
        <View style={{ gap: 8 }}>
          <Btn title="Перевести в первую команду" onPress={() => show(promoteYouth(W, p.id))} />
          <Btn title="Отчислить" kind="danger" onPress={() => { releaseYouth(W, p.id); G.pop(); G.refresh(); }} />
        </View>
      ) : mine ? (
        <View style={{ gap: 8 }}>
          <Btn title="Поговорить с игроком" kind="ghost" onPress={() => G.dialog({
            title: `Разговор: ${p.n}`,
            text: 'Что сказать игроку?',
            buttons: [
              { title: 'Похвалить', onPress: () => show(talkToPlayer(W, p.id, 'praise')) },
              { title: 'Потребовать большего', kind: 'ghost', onPress: () => show(talkToPlayer(W, p.id, 'demand')) },
              { title: 'Пообещать игровое время', kind: 'ghost', onPress: () => show(talkToPlayer(W, p.id, 'time')) },
              { title: 'Отмена', kind: 'ghost' },
            ],
          })} />
          {!p.loan ? (
            <Btn title="Продлить контракт" kind="ghost" onPress={() => {
              const d = renewDemand(W, p);
              G.dialog({
                title: 'Продление контракта',
                text: `${p.n} хочет ${money(d)} в неделю (сейчас ${money(p.wage)}). На сколько лет продлить?`,
                buttons: [1, 2, 3, 4].map((y) => ({ title: `+${y} ${y === 1 ? 'год' : y < 5 ? 'года' : 'лет'}`, kind: 'ghost', onPress: () => show(renewContract(W, p.id, y)) })).concat([{ title: 'Отмена', kind: 'ghost' }]),
              });
            }} />
          ) : null}
          {!p.loan ? <Btn title={p.listed ? 'Снять с трансфера' : 'Выставить на трансфер'} kind="ghost" onPress={() => { p.listed = !p.listed; G.refresh(); }} /> : null}
          {!p.loan ? <Btn title={`Продать сразу (~${money(playerValue(p) * 0.7)})`} kind="ghost" onPress={() => G.dialog({ title: 'Быстрая продажа', text: 'Игрок уйдёт первому покупателю за ~70% стоимости. Продолжить?', buttons: [{ title: 'Продать', onPress: () => { const r = quickSell(W, p.id); show(r); if (r.status === 'accepted') G.pop(); } }, { title: 'Отмена', kind: 'ghost' }] })} /> : null}
          <Btn title={p.loan ? 'Вернуть из аренды' : 'Расторгнуть контракт'} kind="danger" onPress={() => G.dialog({ title: p.loan ? 'Вернуть игрока?' : 'Расторгнуть контракт?', text: p.loan ? 'Игрок вернётся в свой клуб.' : 'Клуб выплатит половину оставшейся зарплаты.', buttons: [{ title: 'Да', kind: 'danger', onPress: () => { const r = releasePlayer(W, p.id); show(r); if (r.status === 'accepted') G.pop(); } }, { title: 'Отмена', kind: 'ghost' }] })} />
        </View>
      ) : my && !p.aca ? (
        <View style={{ gap: 8 }}>
          {bidOpen ? <BidForm W={W} p={p} my={my} onDone={(r) => { setBidOpen(false); show(r); }} /> : <Btn title={p.fa ? 'Предложить контракт' : 'Сделать предложение'} onPress={() => setBidOpen(true)} />}
          {club && !p.loan ? <Btn title="Попросить в аренду" kind="ghost" onPress={() => show(requestLoan(W, p.id))} /> : null}
        </View>
      ) : null}
    </Page>
  );
}

function BidForm({ W, p, my, onDone }) {
  const ask = askingPrice(W, p);
  const demand = wageDemand(W, p, my.id);
  const [fee, setFee] = useState(String(Math.round(ask / 1e5) / 10));
  const [wage, setWage] = useState(String(Math.round(demand / 100) / 10));
  const [years, setYears] = useState(3);
  return (
    <Card title={p.fa ? 'Контракт со свободным агентом' : 'Предложение о трансфере'}>
      {!p.fa ? (
        <>
          <T muted size={12}>Сумма, млн € (ориентир ~{money(ask)})</T>
          <Field value={fee} onChangeText={setFee} keyboardType="numeric" style={{ marginTop: 4, marginBottom: 10 }} />
        </>
      ) : null}
      <T muted size={12}>Зарплата, тыс. € в неделю (игрок хочет ~{money(demand)})</T>
      <Field value={wage} onChangeText={setWage} keyboardType="numeric" style={{ marginTop: 4, marginBottom: 10 }} />
      <T muted size={12} style={{ marginBottom: 4 }}>Срок контракта</T>
      <Seg options={[1, 2, 3, 4, 5].map((y) => ({ value: y, label: `${y} г.` }))} value={years} onChange={setYears} style={{ marginBottom: 12 }} />
      <Btn
        title="Отправить"
        onPress={() => {
          const f = p.fa ? 0 : Math.round(parseFloat(fee.replace(',', '.')) * 1e6) || 0;
          const w = Math.round(parseFloat(wage.replace(',', '.')) * 1000) || 0;
          onDone(makeBid(W, p.id, f, w, years));
        }}
      />
    </Card>
  );
}

function Fact({ label, value, color }) {
  return (
    <View style={ps.fact}>
      <Text style={[ps.factVal, color && { color }]} numberOfLines={1}>{value}</Text>
      <Text style={ps.factLbl}>{label}</Text>
    </View>
  );
}

const ps = StyleSheet.create({
  hero: { borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.line },
  ovrBox: { width: 76, height: 84, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg2 },
  ovr: { fontFamily: F.d8, fontSize: 40 },
  ovrLbl: { color: C.muted, fontFamily: F.d7, fontSize: 14, letterSpacing: 1 },
  nat: { color: C.muted, fontFamily: F.d7, fontSize: 13, letterSpacing: 1 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  fact: { flexGrow: 1, flexBasis: '45%', backgroundColor: 'rgba(5,8,15,0.5)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 8, alignItems: 'center' },
  factVal: { color: C.text, fontFamily: F.d8, fontSize: 18 },
  factLbl: { color: C.muted, fontSize: 10, marginTop: 1 },
});
