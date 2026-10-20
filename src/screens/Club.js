import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C, F, T, Card, Btn, Seg, Bar, Stat, Empty, Icon } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import PlayerRow from '../ui/playerRow';
import { money, clamp } from '../engine/util';
import { upgradeStadium, upgradeFacility, facilityCost, fairPrice } from '../engine/sim';

const FIN_IN = [['tickets', 'Билеты', 'ticket'], ['tv', 'Телеправа', 'tv'], ['sponsor', 'Спонсоры', 'ribbon'], ['prize', 'Призовые', 'trophy'], ['sales', 'Продажи игроков', 'person-remove']];
const FIN_OUT = [['wages', 'Зарплаты', 'people'], ['staff', 'Персонал', 'medkit'], ['buys', 'Покупки игроков', 'person-add'], ['build', 'Строительство', 'construct']];

export default function ClubScreen({ tab: initial }) {
  const G = useG();
  const W = G.W;
  const [tab, setTab] = useState(initial || 'fin');
  if (!W.user.club) return <Page title="Клуб" back><Empty text="У вас нет клуба." /></Page>;
  const c = W.clubs[W.user.club];
  const show = (r) => { G.alert(r.status === 'accepted' ? 'Готово' : 'Не получилось', r.msg); G.refresh(); };
  const fair = fairPrice(c);

  return (
    <Page title={c.name} sub={`Баланс ${money(c.balance)}`} back>
      <Seg options={[{ value: 'fin', label: 'Финансы' }, { value: 'stadium', label: 'Стадион' }, { value: 'train', label: 'База' }, { value: 'academy', label: 'Академия' }]} value={tab} onChange={setTab} style={{ marginBottom: 12 }} />

      {tab === 'fin' ? (
        (() => {
          const inc = FIN_IN.reduce((s2, [k]) => s2 + c.fin[k], 0);
          const out = FIN_OUT.reduce((s2, [k]) => s2 + c.fin[k], 0);
          const wages = c.squad.reduce((s2, x) => s2 + W.players[x].wage, 0);
          const maxV = Math.max(1, ...FIN_IN.map(([k]) => c.fin[k]), ...FIN_OUT.map(([k]) => c.fin[k]));
          const rowF = ([k, l, icon], col) => (
            <View key={k} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Icon name={icon} size={14} color={C.muted} />
                <T size={13} style={{ flex: 1 }}>{l}</T>
                <Text style={{ color: col, fontFamily: F.d7, fontSize: 15 }}>{money(c.fin[k])}</Text>
              </View>
              <Bar value={c.fin[k]} max={maxV} color={col} height={5} />
            </View>
          );
          return (
            <>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <View style={[cs.big, { borderColor: (inc - out >= 0 ? C.accent : C.red) + '55' }]}>
                  <T muted size={11}>Итог сезона</T>
                  <Text style={[cs.bigVal, { color: inc - out >= 0 ? C.accent : C.red }]}>{money(inc - out)}</Text>
                </View>
                <View style={cs.big}>
                  <T muted size={11}>Зарплаты в неделю</T>
                  <Text style={cs.bigVal}>{money(wages)}</Text>
                </View>
              </View>
              <Card title="Доходы" icon="trending-up">{FIN_IN.map((r) => rowF(r, C.accent))}</Card>
              <Card title="Расходы" icon="trending-down">{FIN_OUT.map((r) => rowF(r, C.red))}</Card>
              <T muted size={12} center>Годовой фонд зарплат: {money(wages * 52)}</T>
            </>
          );
        })()
      ) : null}

      {tab === 'stadium' ? (
        <>
          <Card>
            <View style={{ flexDirection: 'row' }}>
              <Stat label="Вместимость" value={c.stadium.cap.toLocaleString('ru-RU')} />
              <Stat label="Последняя посещаемость" value={c.lastAtt ? c.lastAtt.toLocaleString('ru-RU') : '—'} />
            </View>
            {c.lastAtt ? <Bar value={c.lastAtt} max={c.stadium.cap} style={{ marginTop: 10 }} /> : null}
          </Card>
          <Card title="Цена билета" icon="ticket-outline">
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Btn small kind="ghost" title="−5" onPress={() => { c.stadium.price = clamp(c.stadium.price - 5, 5, 300); G.refresh(); }} />
              <T bold size={22}>€{c.stadium.price}</T>
              <Btn small kind="ghost" title="+5" onPress={() => { c.stadium.price = clamp(c.stadium.price + 5, 5, 300); G.refresh(); }} />
            </View>
            <T muted size={12} style={{ marginTop: 8 }}>Болельщики считают справедливой цену около €{fair}. Дороже — меньше зрителей.</T>
          </Card>
          <Card title="Расширение" icon="construct-outline">
            {c.stadium.up ? (
              <T>Идёт строительство: +{c.stadium.up.add} мест.</T>
            ) : (
              <>
                <T muted size={13} style={{ marginBottom: 10 }}>+5 000 мест за {money(5000 * 4500)}. Срок — около 5 месяцев.</T>
                <Btn title="Начать расширение" onPress={() => show(upgradeStadium(W))} />
              </>
            )}
          </Card>
        </>
      ) : null}

      {tab === 'train' ? (
        <>
          <Card title="Тренировки" icon="barbell-outline" onPress={() => { G.setTab('squad'); }}>
            <T muted size={13}>План недели, двусторонние игры и тонус игроков — во вкладке «Команда → Тренировки».</T>
          </Card>
          <Card title="Персонал и инфраструктура" icon="business-outline">
            {[['coach', 'Тренерский штаб', 'Развитие игроков'], ['med', 'Медицинский центр', 'Восстановление и травмы'], ['scout', 'Скаутский отдел', 'Точность оценки потенциала'], ['youth', 'Академия', 'Качество воспитанников']].map(([k, l, d]) => {
              const lvl = k === 'youth' ? c.youthLvl : c.staff[k];
              return (
                <View key={k} style={{ paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: C.line }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <T bold size={14}>{l}</T>
                      <T muted size={12}>{d}</T>
                    </View>
                    <T color={C.gold} style={{ marginRight: 10 }}>{'★'.repeat(lvl)}{'☆'.repeat(5 - lvl)}</T>
                  </View>
                  {lvl < 5 ? <Btn small kind="ghost" title={`Улучшить за ${money(facilityCost(c, k))}`} style={{ marginTop: 6 }} onPress={() => show(upgradeFacility(W, k))} /> : null}
                </View>
              );
            })}
          </Card>
        </>
      ) : null}

      {tab === 'academy' ? (
        c.academy.length ? (
          <Card title="Воспитанники" icon="school-outline">
            {c.academy.map((id) => W.players[id]).filter(Boolean).map((p) => (
              <PlayerRow key={p.id} p={p} onPress={() => G.push('player', { id: p.id })} />
            ))}
            <T muted size={12} style={{ marginTop: 8 }}>Новый набор приходит каждую весну. Воспитанники, не переведённые в основу до 19 лет, покидают клуб.</T>
          </Card>
        ) : (
          <Empty text="В академии сейчас никого. Новый набор — весной." />
        )
      ) : null}
    </Page>
  );
}

const cs = StyleSheet.create({
  big: { flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: C.line },
  bigVal: { color: C.text, fontFamily: F.d8, fontSize: 24, marginTop: 2 },
});
