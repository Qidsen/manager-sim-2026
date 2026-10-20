import React, { useState } from 'react';
import { View } from 'react-native';
import { C, T, Card, Btn, Seg, Bar, Stat, Empty } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import PlayerRow from '../ui/playerRow';
import { money, clamp } from '../engine/util';
import { upgradeStadium, upgradeFacility, facilityCost, fairPrice } from '../engine/sim';

const FIN_IN = [['tickets', 'Билеты'], ['tv', 'Телеправа'], ['sponsor', 'Спонсоры'], ['prize', 'Призовые'], ['sales', 'Продажи игроков']];
const FIN_OUT = [['wages', 'Зарплаты'], ['staff', 'Персонал'], ['buys', 'Покупки игроков'], ['build', 'Строительство']];

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
        <>
          <Card title="Доходы в этом сезоне">
            {FIN_IN.map(([k, l]) => (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <T size={14}>{l}</T><T size={14} color={C.accent}>{money(c.fin[k])}</T>
              </View>
            ))}
          </Card>
          <Card title="Расходы в этом сезоне">
            {FIN_OUT.map(([k, l]) => (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <T size={14}>{l}</T><T size={14} color={C.red}>{money(c.fin[k])}</T>
              </View>
            ))}
          </Card>
          <Card title="Итог">
            {(() => {
              const inc = FIN_IN.reduce((s, [k]) => s + c.fin[k], 0);
              const out = FIN_OUT.reduce((s, [k]) => s + c.fin[k], 0);
              const wages = c.squad.reduce((s, x) => s + W.players[x].wage, 0);
              return (
                <>
                  <T bold size={18} color={inc - out >= 0 ? C.accent : C.red}>{money(inc - out)}</T>
                  <T muted size={13} style={{ marginTop: 6 }}>Зарплатная ведомость: {money(wages)} в неделю ({money(wages * 52)} в год)</T>
                </>
              );
            })()}
          </Card>
        </>
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
          <Card title="Цена билета">
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Btn small kind="ghost" title="−5" onPress={() => { c.stadium.price = clamp(c.stadium.price - 5, 5, 300); G.refresh(); }} />
              <T bold size={22}>€{c.stadium.price}</T>
              <Btn small kind="ghost" title="+5" onPress={() => { c.stadium.price = clamp(c.stadium.price + 5, 5, 300); G.refresh(); }} />
            </View>
            <T muted size={12} style={{ marginTop: 8 }}>Болельщики считают справедливой цену около €{fair}. Дороже — меньше зрителей.</T>
          </Card>
          <Card title="Расширение">
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
          <Card title="Интенсивность тренировок">
            <Seg options={[{ value: 0, label: 'Лёгкая' }, { value: 1, label: 'Обычная' }, { value: 2, label: 'Высокая' }]} value={c.training.int} onChange={(v) => { c.training.int = v; G.refresh(); }} />
            <T muted size={12} style={{ marginTop: 8 }}>Высокая интенсивность ускоряет развитие игроков, но они дольше восстанавливаются и чаще травмируются.</T>
          </Card>
          <Card title="Персонал и инфраструктура">
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
          <Card title="Воспитанники">
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
