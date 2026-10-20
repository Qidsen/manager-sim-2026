import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { C, F, T, Card, Btn, Seg, Icon, Rating, Bar, tap, thud } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import { startTalks, offerFee, offerContract, offerLoan, cancelTalks, ROLES, sellerName, interest, naturalRole } from '../engine/market';
import { money, playerValue, roundMoney, POS_RU } from '../engine/util';
import { NATION_BY_CODE } from '../data/nations';

// Шаг для сумм: ~1–2% от величины, округлённый
function stepFor(v) {
  if (v >= 5e7) return 1e6;
  if (v >= 1e7) return 5e5;
  if (v >= 2e6) return 1e5;
  if (v >= 5e5) return 2.5e4;
  if (v >= 1e5) return 5e3;
  if (v >= 2e4) return 1e3;
  return 500;
}

function Amount({ label, value, onChange, hint, presets }) {
  const step = stepFor(value || 1e5);
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <T muted size={12}>{label}</T>
        {hint ? <T muted size={12}>{hint}</T> : null}
      </View>
      <View style={st.amountRow}>
        <Pressable onPress={() => { tap(); onChange(Math.max(0, value - step * 5)); }} style={st.stepBig}><Text style={st.stepText}>−−</Text></Pressable>
        <Pressable onPress={() => { tap(); onChange(Math.max(0, value - step)); }} style={st.step}><Icon name="remove" size={18} color={C.text} /></Pressable>
        <Text style={st.amount} numberOfLines={1}>{money(value)}</Text>
        <Pressable onPress={() => { tap(); onChange(value + step); }} style={st.step}><Icon name="add" size={18} color={C.text} /></Pressable>
        <Pressable onPress={() => { tap(); onChange(value + step * 5); }} style={st.stepBig}><Text style={st.stepText}>++</Text></Pressable>
      </View>
      {presets ? (
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {presets.map(([t, v]) => (
            <Pressable key={t} onPress={() => { tap(); onChange(roundMoney(v)); }} style={st.preset}>
              <Text style={st.presetText}>{t}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Bubble({ m }) {
  if (m.who === 'sys') return <T muted size={12} center style={{ marginVertical: 6, fontStyle: 'italic' }}>{m.text}</T>;
  const me = m.who === 'me';
  const col = m.good ? C.accent : m.bad ? C.red : null;
  return (
    <View style={[st.bubbleWrap, me ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
      <View style={[st.bubble, me ? st.bubbleMe : st.bubbleThem, col && { borderColor: col + '88', backgroundColor: col + '18' }]}>
        <Text style={[st.bubbleText, me && { color: '#1A1206' }, col && { color: C.text }]}>{m.text}</Text>
      </View>
    </View>
  );
}

export default function NegotiateScreen({ pid, kind = 'buy' }) {
  const G = useG();
  const W = G.W;
  const p = W.players[pid];
  const my = W.user.club ? W.clubs[W.user.club] : null;
  const [err, setErr] = useState(null);
  const [, setN] = useState(0);
  const scroll = useRef(null);
  const neg = W.negs?.[pid];

  // поля ввода
  const [fee, setFee] = useState(0);
  const [inst, setInst] = useState(false);
  const [wage, setWage] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [years, setYears] = useState(3);
  const [role, setRole] = useState('first');
  const [share, setShare] = useState(0.5);
  const [loanFee, setLoanFee] = useState(0);
  const [sellOn, setSellOn] = useState(0);
  const [addOn, setAddOn] = useState(0);
  const [buyback, setBuyback] = useState(false);

  useEffect(() => {
    const r = startTalks(W, pid, kind);
    if (r.error) setErr(r.error);
    else syncInputs(r.neg);
    G.refresh();
  }, []);

  function syncInputs(n) {
    if (!n) return;
    if (n.stage === 'fee') setFee(roundMoney(n.fAsk * 0.85));
    if (n.stage === 'contract') {
      setWage(roundMoney(n.wAsk * 0.88));
      setBonus(roundMoney((n.bonusAsk || 0) * 0.5));
      setYears(n.years);
      setRole(n.role);
    }
    if (n.stage === 'loan') {
      setShare(Math.round(n.shareAsk * 10) / 10);
      setLoanFee(0);
    }
  }

  const after = (r) => {
    if (r.error) return G.alert('Нельзя', r.error);
    thud();
    if (r.stage === 'contract') syncInputs(W.negs[pid]);
    if (r.done) G.save(true);
    setN((x) => x + 1);
    G.refresh();
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 80);
  };

  if (!p) return <Page title="Переговоры" back><T muted>Игрок не найден.</T></Page>;
  const nat = NATION_BY_CODE[p.nat];
  const stageNames = kind === 'renew' ? ['Контракт'] : kind === 'loan' ? ['Аренда'] : p.fa ? ['Контракт'] : ['Запрос', 'Трансфер', 'Контракт'];
  const curStage = !neg || stageNames.length === 1 ? 0 : neg.stage === 'wait' ? 0 : neg.stage === 'fee' ? 1 : 2;
  const rival = neg?.rival && neg.status === 'open' ? neg.rival : null;
  const daysLeft = rival ? Math.max(0, rival.until - (W.year * 365 + W.day)) : 0;
  const open = neg && neg.status === 'open';
  const intr = my && kind !== 'renew' ? interest(W, p, my.id) : null;

  return (
    <Page title="Переговоры" sub={kind === 'renew' ? 'Продление контракта' : kind === 'loan' ? 'Аренда до конца сезона' : sellerName(W, p)} back>
      {/* игрок */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Rating v={p.ovr} size="lg" />
          <View style={{ flex: 1 }}>
            <T display size={22} numberOfLines={1}>{p.n}</T>
            <T muted size={12}>{nat?.flag} {POS_RU[p.pos]} · {p.age} лет · стоимость {money(playerValue(p))}</T>
            <T muted size={12}>Сейчас: {money(p.wage)}/нед.{p.club ? ` · контракт до ${p.contract + 1}` : ''}</T>
          </View>
        </View>
        {intr !== null ? (
          <View style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T muted size={11}>Интерес к переходу</T>
              <T size={11} bold color={intr >= 60 ? C.accent : intr >= 35 ? C.orange : C.red}>{intr >= 60 ? 'высокий' : intr >= 35 ? 'средний' : 'низкий'}</T>
            </View>
            <Bar value={intr} color={intr >= 60 ? C.accent : intr >= 35 ? C.orange : C.red} style={{ marginTop: 4 }} />
          </View>
        ) : null}
      </Card>

      {err ? (
        <Card style={{ borderColor: C.red + '66' }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Icon name="close-circle" size={22} color={C.red} />
            <T style={{ flex: 1 }}>{err}</T>
          </View>
        </Card>
      ) : null}

      {neg ? (
        <>
          {/* этапы и терпение */}
          <View style={st.stages}>
            {stageNames.map((n, i) => (
              <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[st.stageDot, i < curStage || neg.status === 'done' ? { backgroundColor: C.accent } : i === curStage ? { backgroundColor: C.gold } : null]}>
                  {i < curStage || neg.status === 'done' ? <Icon name="checkmark" size={12} color="#04210F" /> : <Text style={{ color: '#1A1206', fontFamily: F.d8, fontSize: 12 }}>{i + 1}</Text>}
                </View>
                <Text style={[st.stageText, i === curStage && { color: C.text }]}>{n.toUpperCase()}</Text>
                {i < stageNames.length - 1 ? <View style={st.stageLine} /> : null}
              </View>
            ))}
            <View style={{ flex: 1 }} />
            {open ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <T muted size={11}>терпение</T>
                {Array.from({ length: Math.max(0, neg.pat) }).map((_, i) => <View key={i} style={st.pat} />)}
              </View>
            ) : null}
          </View>

          {/* переписка */}
          <Card pad={false} style={{ paddingVertical: 10 }}>
            <ScrollView ref={scroll} style={{ maxHeight: 300 }} contentContainerStyle={{ paddingHorizontal: 12 }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
              {neg.log.map((m, i) => <Bubble key={i} m={m} />)}
            </ScrollView>
          </Card>

          {rival ? (
            <Card style={{ borderColor: C.red + '88', backgroundColor: C.redDim }}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <Icon name="flash" size={22} color={C.red} />
                <View style={{ flex: 1 }}>
                  <T bold size={14}>Битва за игрока: «{W.clubs[rival.club]?.name}»</T>
                  <T muted size={12}>{neg.stage === 'fee' ? `Их ставка ${money(rival.fee)}. ` : 'Предлагают игроку контракт. '}Осталось {daysLeft} дн. — иначе перехват.</T>
                </View>
              </View>
            </Card>
          ) : null}

          {open && neg.stage === 'wait' ? (
            <Card title="Запрос отправлен" icon="hourglass-outline">
              <T muted size={13}>Клуб рассматривает запрос: ответит, готов ли обсуждать переход и на каких условиях. Обычно это 1–2 дня — продолжайте игру, ответ придёт на почту.</T>
            </Card>
          ) : null}

          {/* ввод */}
          {open && neg.stage === 'fee' ? (
            <Card title="Ваше предложение клубу" icon="cash-outline">
              <Amount label="Сумма трансфера" value={fee} onChange={setFee} hint={`их цена ${money(neg.fAsk)}`}
                presets={[['их цена', neg.fAsk], ['−5%', neg.fAsk * 0.95], ['−10%', neg.fAsk * 0.9], ['−20%', neg.fAsk * 0.8], ['стоимость', playerValue(p)]]} />
              <Seg options={[{ value: false, label: 'Сразу' }, { value: true, label: 'В рассрочку 50/50' }]} value={inst} onChange={setInst} style={{ marginBottom: 12 }} />
              <T muted size={12} style={{ marginBottom: 6 }}>Пункты контракта (делают предложение привлекательнее)</T>
              <T size={12} style={{ marginBottom: 4 }}>Процент продавцу от будущей перепродажи</T>
              <Seg options={[0, 0.1, 0.2, 0.3].map((v) => ({ value: v, label: v ? `${v * 100}%` : 'нет' }))} value={sellOn} onChange={setSellOn} style={{ marginBottom: 10 }} />
              <Amount label="Бонусы продавцу после 25 матчей игрока" value={addOn} onChange={setAddOn} presets={[['нет', 0], ['5%', fee * 0.05], ['10%', fee * 0.1], ['20%', fee * 0.2]]} />
              <T size={12} style={{ marginBottom: 4 }}>Право обратного выкупа за {money(roundMoney(fee * 1.6))} (2 года)</T>
              <Seg options={[{ value: false, label: 'Нет' }, { value: true, label: 'Дать право' }]} value={buyback} onChange={setBuyback} style={{ marginBottom: 12 }} />
              <Btn title="ПРЕДЛОЖИТЬ" icon="send" onPress={() => after(offerFee(W, pid, fee, inst, { sellOn, addOn, buyback }))} />
              <T muted size={11} center style={{ marginTop: 8 }}>Бюджет: {money(my.balance)}</T>
            </Card>
          ) : null}

          {open && neg.stage === 'contract' ? (
            <Card title="Личные условия" icon="document-text-outline">
              <Amount label="Зарплата в неделю" value={wage} onChange={setWage} hint={`просят ${money(neg.wAsk)}`}
                presets={[['их запрос', neg.wAsk], ['−5%', neg.wAsk * 0.95], ['−10%', neg.wAsk * 0.9], ['−20%', neg.wAsk * 0.8]]} />
              <Amount label="Подъёмные (разово)" value={bonus} onChange={setBonus} hint={`просят ${money(neg.bonusAsk || 0)}`}
                presets={[['0', 0], ['половина', (neg.bonusAsk || 0) / 2], ['полностью', neg.bonusAsk || 0], ['×1.5', (neg.bonusAsk || 0) * 1.5]]} />
              <T muted size={12} style={{ marginBottom: 6 }}>Срок контракта</T>
              <Seg options={[1, 2, 3, 4, 5].map((y) => ({ value: y, label: `${y} г.` }))} value={years} onChange={setYears} style={{ marginBottom: 12 }} />
              <T muted size={12} style={{ marginBottom: 6 }}>Роль в команде · ожидает: {ROLES[naturalRole(W, p, my.id)].short.toLowerCase()}</T>
              <Seg options={['key', 'first', 'rotation', 'backup'].concat(p.age <= 21 ? ['prospect'] : []).map((r) => ({ value: r, label: ROLES[r].short }))} value={role} onChange={setRole} style={{ marginBottom: 12 }} />
              <T muted size={11} style={{ marginBottom: 10 }}>Чем выше обещанная роль, тем больше игрок хочет получать — и тем сильнее обидится, если будет сидеть в запасе. Подъёмные помогают сбить зарплату.</T>
              <Btn title="ПРЕДЛОЖИТЬ КОНТРАКТ" icon="send" onPress={() => after(offerContract(W, pid, { wage, years, bonus, role }))} />
            </Card>
          ) : null}

          {open && neg.stage === 'loan' ? (
            <Card title="Условия аренды" icon="repeat">
              <T muted size={12} style={{ marginBottom: 6 }}>Какую часть зарплаты платите вы · зарплата {money(p.wage)}/нед.</T>
              <Seg options={[0.3, 0.5, 0.7, 0.85, 1].map((v) => ({ value: v, label: `${Math.round(v * 100)}%` }))} value={share} onChange={setShare} style={{ marginBottom: 12 }} />
              <Amount label="Плата за аренду" value={loanFee} onChange={setLoanFee} presets={[['0', 0], ['2% стоимости', playerValue(p) * 0.02], ['5%', playerValue(p) * 0.05]]} />
              <Btn title="ПРЕДЛОЖИТЬ" icon="send" onPress={() => after(offerLoan(W, pid, share, loanFee))} />
            </Card>
          ) : null}

          {neg.status === 'done' ? (
            <Card style={{ borderColor: C.accent + '66', backgroundColor: C.accentDim }}>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <Icon name="checkmark-circle" size={40} color={C.accent} />
                <T display size={24}>Сделка закрыта</T>
                <Btn title="К ИГРОКУ" small onPress={() => G.replace('player', { id: pid })} style={{ marginTop: 6, alignSelf: 'stretch' }} />
              </View>
            </Card>
          ) : null}
          {neg.status === 'failed' ? (
            <Card style={{ borderColor: C.red + '66', backgroundColor: C.redDim }}>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <Icon name="close-circle" size={40} color={C.red} />
                <T display size={22}>Переговоры сорваны</T>
                <T muted size={12} center>Вернуться к ним можно будет позже.</T>
              </View>
            </Card>
          ) : null}
          {open ? <Btn title="Выйти из переговоров" kind="ghost" small onPress={() => { cancelTalks(W, pid); G.refresh(); G.pop(); }} /> : null}
        </>
      ) : null}
    </Page>
  );
}

const st = StyleSheet.create({
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  amount: { flex: 1, textAlign: 'center', color: C.text, fontFamily: F.d8, fontSize: 24 },
  step: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.card2, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  stepBig: { width: 38, height: 40, borderRadius: 12, backgroundColor: C.bg2, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: C.muted, fontFamily: F.d8, fontSize: 15 },
  preset: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: C.goldDim, borderWidth: 1, borderColor: C.gold + '44' },
  presetText: { color: C.gold, fontSize: 12, fontWeight: '700' },
  bubbleWrap: { marginVertical: 4 },
  bubble: { maxWidth: '86%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  bubbleMe: { backgroundColor: C.gold, borderColor: C.gold, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: C.card2, borderColor: C.line, borderBottomLeftRadius: 4 },
  bubbleText: { color: C.text, fontSize: 14, lineHeight: 19 },
  stages: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, paddingHorizontal: 2 },
  stageDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.card3, alignItems: 'center', justifyContent: 'center' },
  stageText: { color: C.muted, fontFamily: F.d7, fontSize: 12, letterSpacing: 1 },
  stageLine: { width: 16, height: 2, backgroundColor: C.line },
  pat: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.gold },
});
