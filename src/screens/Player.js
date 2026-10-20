import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, T, Card, Btn, Bar, Rating, Field, Seg, Stat, Badge, ratingColor } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import { POS_FULL, POS_RU, ATTRS, ATTR_RU, money, playerValue, clamp, DEV_ROLES, NEAR, ovrAs, retrainWeeks, dynParts, dynOvr, growthOf, GROWTH } from '../engine/util';
import { potRange, reportView, squadRanks, RANKS, rankMismatch, watchPlayer, signProspect } from '../engine/career';
import { NATION_BY_CODE } from '../data/nations';
import { ROLES } from '../engine/market';
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
  const pr = potRange(W, p);
  const potLo = pr.lo;
  const potHi = pr.hi;
  const dp = dynParts(p);
  const dyn = dynOvr(p);
  const rank = p.club ? squadRanks(W, p.club)[p.id] : null;
  const mism = mine ? rankMismatch(W, p) : 0;
  const rep = !mine && pr.known && (pr.report || p.age >= 28) ? reportView(W, p) : null;
  const gpKnown = mine ? growthOf(p) : pr.report?.gp ? GROWTH[pr.report.gp] : null;
  const watching = W.scouting?.watch?.includes(p.id);
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
          <View style={[ps.ovrBox, { borderColor: ratingColor(dyn) }]}>
            <Text style={[ps.ovr, { color: ratingColor(dyn) }]}>{dyn}</Text>
            <Text style={ps.ovrLbl}>{POS_RU[p.pos]}{p.alt?.length ? ` · ${p.alt.map((x) => POS_RU[x]).join(' ')}` : ''}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ps.nat}>{nation?.flag || ''} {(nation?.name || p.nat).toUpperCase()}</Text>
            <T display size={22} numberOfLines={1}>{club ? club.name : p.fa ? 'Свободный агент' : p.aca ? 'Академия' : p.pros ? 'Юниор без клуба' : 'Внутренний чемпионат'}</T>
            {p.loan ? <T muted size={12}>аренда из «{W.clubs[p.loan.from]?.name || '—'}»</T> : null}
            {rank ? <Text style={{ color: RANKS[rank].color, fontFamily: F.d7, fontSize: 13, marginTop: 2 }}>{RANKS[rank].ru.toUpperCase()}{mism > 0 && p.role ? `  ·  обещано: ${ROLES[p.role]?.short?.toLowerCase() || ''}` : ''}</Text> : null}
          </View>
        </View>
        <View style={ps.facts}>
          <Fact label="Потенциал" value={!pr.known ? '?' : potLo === potHi ? `${potLo}` : `${potLo}–${potHi}`} color={pr.known ? ratingColor((potLo + potHi) / 2) : C.muted} />
          <Fact label="База" value={`${p.ovr}`} />
          <Fact label="Стоимость" value={money(playerValue(p))} />
          {club || p.fa ? <Fact label="Зарплата/нед" value={money(p.wage)} /> : null}
          {club ? <Fact label="Контракт" value={`до ${p.contract + 1}`} /> : null}
          {mine && p.role ? <Fact label="Роль" value={ROLES[p.role]?.short || '—'} /> : null}
        </View>
        {p.inj > 0 || p.ban > 0 ? (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {p.inj > 0 ? <Badge icon="medkit" text={`ТРАВМА · ~${Math.ceil(p.inj / 7)} НЕД.`} color={C.red} /> : null}
            {p.ban > 0 ? <Badge icon="square" text={`ДИСКВАЛИФИКАЦИЯ · ${p.ban}`} color={C.red} /> : null}
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
          <View style={{ flex: 1 }}>
            <T muted size={11}>Свежесть {Math.round(p.fit)}%</T>
            <Bar value={p.fit} color={p.fit < 70 ? C.orange : C.accent} height={6} style={{ marginTop: 4 }} />
          </View>
          <View style={{ flex: 1 }}>
            <T muted size={11}>Тонус {Math.round(p.shp ?? 80)}%</T>
            <Bar value={p.shp ?? 80} color={(p.shp ?? 80) < 60 ? C.orange : C.gold} height={6} style={{ marginTop: 4 }} />
          </View>
          <View style={{ flex: 1 }}>
            <T muted size={11}>Мораль {Math.round(p.mor)}%</T>
            <Bar value={p.mor} color={p.mor < 40 ? C.red : p.mor < 60 ? C.orange : C.blue} height={6} style={{ marginTop: 4 }} />
          </View>
        </View>
      </LinearGradient>

      <Card title="Текущий рейтинг" icon="pulse-outline">
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 10 }}>
          <Text style={{ color: ratingColor(dyn), fontFamily: F.d8, fontSize: 30 }}>{dyn}</Text>
          <T muted size={13} style={{ marginBottom: 5 }}>= база {p.ovr} {dyn - p.ovr >= 0 ? '+' : '−'} {Math.abs(dyn - p.ovr)}</T>
        </View>
        {[['Форма', dp.form, 'Средняя оценка последних матчей'], ['Мораль', dp.mor, 'Настроение игрока'], ['Тонус', dp.shp, 'Игровая практика']].map(([l, v, d]) => (
          <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 7 }}>
            <T size={13} style={{ width: 64 }}>{l}</T>
            <View style={{ flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, flexDirection: 'row' }}>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>{v < 0 ? <View style={{ width: `${Math.min(100, (-v / 4) * 100)}%`, height: 8, backgroundColor: C.red, borderRadius: 4 }} /> : null}</View>
              <View style={{ width: 2, backgroundColor: C.line }} />
              <View style={{ flex: 1 }}>{v > 0 ? <View style={{ width: `${Math.min(100, (v / 4) * 100)}%`, height: 8, backgroundColor: C.accent, borderRadius: 4 }} /> : null}</View>
            </View>
            <Text style={{ width: 34, textAlign: 'right', color: v > 0.05 ? C.accent : v < -0.05 ? C.red : C.muted, fontFamily: F.d7, fontSize: 14 }}>{v > 0 ? '+' : ''}{v.toFixed(1)}</Text>
          </View>
        ))}
        {p.rr?.length ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <T muted size={12}>Последние оценки:</T>
            {p.rr.map((r, i) => (
              <View key={i} style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: (r >= 7.3 ? C.accent : r >= 6.5 ? C.blue : r >= 6 ? C.orange : C.red) + '30' }}>
                <Text style={{ color: r >= 7.3 ? C.accent : r >= 6.5 ? C.blue : r >= 6 ? C.orange : C.red, fontFamily: F.d7, fontSize: 13 }}>{r.toFixed(1)}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {p.frag > 0 ? <T size={12} color={C.orange} style={{ marginTop: 8 }}>Недавно восстановился после травмы — высокий риск повторной.</T> : null}
        {p.potTr && p.potTr.at > W.year * 365 + W.day - 60 && (mine || pr.report) ? <T size={12} color={p.potTr.d > 0 ? C.accent : C.red} style={{ marginTop: 6 }}>Потенциал недавно {p.potTr.d > 0 ? 'вырос' : 'снизился'} ({p.potTr.d > 0 ? '+' : ''}{p.potTr.d})</T> : null}
      </Card>

      {gpKnown ? (
        <Card title="Профиль роста" icon="git-commit-outline">
          <T bold size={15} color={C.gold}>{gpKnown.ru}</T>
          <T muted size={13} style={{ marginTop: 4 }}>{gpKnown.d}</T>
        </Card>
      ) : null}

      {!mine && my && !p.aca ? (
        rep ? (
          <Card title={pr.report ? `Отчёт скаута · ${pr.report.by}` : 'Оценка'} icon="eye-outline">
            {[['Тактика', rep.tactic, rep.tacticGood ? C.accent : C.muted], ['Будущее', rep.future, C.gold], ['Финансы', rep.finance, C.text], ['Статус', rep.status, C.text]].filter((x) => x[1]).map(([l, v, col]) => (
              <View key={l} style={{ marginBottom: 8 }}>
                <T muted size={11}>{l.toUpperCase()}</T>
                <T size={14} color={col}>{v}</T>
              </View>
            ))}
            {p.pros ? <Btn title={`Подписать в академию · ${money(p.pros.fee)}`} icon="school" onPress={() => show(signProspect(W, p.id))} /> : null}
          </Card>
        ) : (
          <Card title="Потенциал неизвестен" icon="eye-off-outline">
            <T muted size={13} style={{ marginBottom: 10 }}>Отправьте скаута — он оценит потенциал, профиль роста и то, как игрок впишется в вашу команду.</T>
            <Btn title={watching ? 'Скаут уже в пути' : 'Отправить скаута'} icon="eye" kind={watching ? 'ghost' : 'primary'} onPress={() => (watching ? null : show(watchPlayer(W, p.id)))} />
          </Card>
        )
      ) : null}

      <Card title="Навыки" icon="analytics-outline">
        {ATTRS.filter((k) => (p.pos === 'GK' ? true : k !== 'gk')).map((k) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9 }}>
            <T size={13} style={{ width: 92 }} muted>{ATTR_RU[k]}</T>
            <Bar value={p.a[k]} color={ratingColor(p.a[k])} height={8} style={{ flex: 1 }} />
            <Text style={{ width: 28, textAlign: 'right', color: ratingColor(p.a[k]), fontFamily: F.d8, fontSize: 17 }}>{Math.round(p.a[k])}</Text>
          </View>
        ))}
      </Card>

      {mine ? <DevCard W={W} p={p} onChange={() => G.refresh()} /> : null}

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
          <Btn title="Поговорить с игроком" icon="chatbubble-ellipses" kind="ghost" onPress={() => G.dialog({
            title: `Разговор: ${p.n}`,
            text: 'Что сказать игроку?',
            buttons: [
              { title: 'Похвалить', onPress: () => show(talkToPlayer(W, p.id, 'praise')) },
              { title: 'Потребовать большего', kind: 'ghost', onPress: () => show(talkToPlayer(W, p.id, 'demand')) },
              { title: 'Пообещать игровое время', kind: 'ghost', onPress: () => show(talkToPlayer(W, p.id, 'time')) },
              { title: 'Отмена', kind: 'ghost' },
            ],
          })} />
          {!p.loan ? <Btn title="Переговоры о продлении" icon="document-text" kind="ghost" onPress={() => G.push('negotiate', { pid: p.id, kind: 'renew' })} /> : null}
          {!p.loan ? <Btn title={p.listed ? 'Снять с трансфера' : 'Выставить на трансфер'} icon="pricetag" kind="ghost" onPress={() => { p.listed = !p.listed; G.refresh(); }} /> : null}
          {!p.loan ? <Btn title={`Продать сразу (~${money(playerValue(p) * 0.7)})`} kind="ghost" onPress={() => G.dialog({ title: 'Быстрая продажа', text: 'Игрок уйдёт первому покупателю за ~70% стоимости. Продолжить?', buttons: [{ title: 'Продать', onPress: () => { const r = quickSell(W, p.id); show(r); if (r.status === 'accepted') G.pop(); } }, { title: 'Отмена', kind: 'ghost' }] })} /> : null}
          <Btn title={p.loan ? 'Вернуть из аренды' : 'Расторгнуть контракт'} kind="danger" onPress={() => G.dialog({ title: p.loan ? 'Вернуть игрока?' : 'Расторгнуть контракт?', text: p.loan ? 'Игрок вернётся в свой клуб.' : 'Клуб выплатит половину оставшейся зарплаты.', buttons: [{ title: 'Да', kind: 'danger', onPress: () => { const r = releasePlayer(W, p.id); show(r); if (r.status === 'accepted') G.pop(); } }, { title: 'Отмена', kind: 'ghost' }] })} />
        </View>
      ) : my && !p.aca && !p.pros ? (
        <View style={{ gap: 8 }}>
          <Btn title={p.fa ? 'Переговоры о контракте' : 'Начать переговоры'} icon="chatbubbles" onPress={() => G.push('negotiate', { pid: p.id, kind: 'buy' })} />
          {club && !p.loan ? <Btn title="Попросить в аренду" icon="repeat" kind="ghost" onPress={() => G.push('negotiate', { pid: p.id, kind: 'loan' })} /> : null}
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

function DevCard({ W, p, onChange }) {
  const dev = p.dev || { role: null, int: 1, newPos: null, prog: 0, focus: 'auto' };
  const set = (patch) => {
    p.dev = { ...dev, ...patch };
    onChange();
  };
  const roles = DEV_ROLES[p.pos] || [];
  const near = (NEAR[p.pos] || []).filter((x) => x !== p.pos);
  const role = roles.find((r) => r[0] === dev.role);
  return (
    <Card title="Развитие" icon="trending-up">
      <T muted size={12} style={{ marginBottom: 6 }}>Роль — какие навыки растут в первую очередь</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        <Pressable onPress={() => set({ role: null })} style={[dv.chip, !dev.role && dv.chipOn]}>
          <Text style={[dv.chipT, !dev.role && { color: '#1A1206' }]}>Сбалансированно</Text>
        </Pressable>
        {roles.map(([key, label]) => (
          <Pressable key={key} onPress={() => set({ role: key })} style={[dv.chip, dev.role === key && dv.chipOn]}>
            <Text style={[dv.chipT, dev.role === key && { color: '#1A1206' }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {role ? (
        <T size={12} color={C.gold} style={{ marginBottom: 10 }}>Приоритет: {role[2].map((k) => ATTR_RU[k].toLowerCase()).join(' и ')}</T>
      ) : <View style={{ height: 6 }} />}
      <T muted size={12} style={{ marginBottom: 6 }}>Индивидуальная нагрузка</T>
      <Seg options={[{ value: 0, label: 'Лёгкая' }, { value: 1, label: 'Обычная' }, { value: 2, label: 'Высокая' }]} value={dev.int ?? 1} onChange={(v) => set({ int: v })} style={{ marginBottom: 6 }} />
      <T muted size={11} style={{ marginBottom: 12 }}>{dev.int === 2 ? 'Рост +20%, но выше риск травмы.' : dev.int === 0 ? 'Рост −15%, игрок свежее и реже травмируется.' : 'Стандартный темп развития.'}</T>
      <T muted size={12} style={{ marginBottom: 6 }}>Переучить на позицию{p.alt?.length ? ` · освоены: ${p.alt.map((x) => POS_RU[x]).join(', ')}` : ''}</T>
      {near.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Pressable onPress={() => set({ newPos: null, prog: 0 })} style={[dv.chip, !dev.newPos && dv.chipOn]}>
            <Text style={[dv.chipT, !dev.newPos && { color: '#1A1206' }]}>Оставить {POS_RU[p.pos]}</Text>
          </Pressable>
          {near.map((pos) => (
            <Pressable key={pos} onPress={() => set({ newPos: pos, prog: dev.newPos === pos ? dev.prog : 0 })} style={[dv.chip, dev.newPos === pos && dv.chipOn]}>
              <Text style={[dv.chipT, dev.newPos === pos && { color: '#1A1206' }]}>{POS_RU[pos]} · {Math.round(ovrAs(p, pos))}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <T muted size={12}>Для вратаря переучивание недоступно.</T>
      )}
      {dev.newPos ? (
        <View style={{ marginTop: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T size={12}>{POS_FULL[p.pos]} → {POS_FULL[dev.newPos]}</T>
            <T size={12} bold color={C.gold}>{Math.round(dev.prog || 0)}%</T>
          </View>
          <Bar value={dev.prog || 0} color={C.gold} height={6} style={{ marginTop: 4 }} />
          <T muted size={11} style={{ marginTop: 4 }}>Около {Math.max(1, Math.round((retrainWeeks(p.pos, dev.newPos) * (100 - (dev.prog || 0))) / 100))} нед. Рейтинг на новой позиции сейчас: {Math.round(ovrAs(p, dev.newPos))}.</T>
        </View>
      ) : null}
    </Card>
  );
}

const dv = StyleSheet.create({
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: C.card2, borderWidth: 1, borderColor: C.line },
  chipOn: { backgroundColor: C.gold, borderColor: C.gold },
  chipT: { color: C.text, fontSize: 12, fontWeight: '700' },
});
