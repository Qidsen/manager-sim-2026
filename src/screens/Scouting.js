// Скаутская сеть: найм скаутов, задания по странам, отчёты и юные таланты.
import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { C, F, T, Card, Btn, Seg, Chips, Empty, Icon, SubTabs, Badge } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import PlayerRow from '../ui/playerRow';
import { POS_RU, POSITIONS, money, fmtShort } from '../engine/util';
import { NATION_BY_CODE } from '../data/nations';
import { scoutingState, scoutCandidates, hireScout, fireScout, assignScout, COUNTRIES, MAX_SCOUTS, potRange, dismissReport, dismissAllReports, isShort, toggleShort } from '../engine/career';

const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

export default function ScoutingScreen() {
  const G = useG();
  const W = G.W;
  const [tab, setTab] = useState('scouts');
  const [assign, setAssign] = useState(null);
  if (!W.user.club) return <Page title="Скаутинг" back><Empty text="Скаутская сеть доступна тренеру клуба." /></Page>;
  const sc = scoutingState(W);
  const club = W.clubs[W.user.club];
  if (sc.unseen && tab === 'reports') sc.unseen = 0;
  const show = (r) => { G.alert(r.status === 'accepted' ? 'Готово' : 'Не получилось', r.msg); G.refresh(); };
  const reports = Object.entries(sc.reports)
    .map(([pid, r]) => ({ p: W.players[pid], r }))
    .filter((x) => x.p && !x.p.pros && x.p.club !== W.user.club)
    .sort((a, b) => b.r.at - a.r.at);
  const youth = sc.youth.map((id) => W.players[id]).filter((p) => p?.pros);

  return (
    <Page
      title="Скаутинг"
      sub={`Скаутов ${sc.scouts.length}/${MAX_SCOUTS} · баланс ${money(club.balance)}`}
      back
      tabs={
        <SubTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: 'scouts', label: 'Скауты', icon: 'people' },
            { value: 'reports', label: 'Отчёты', icon: 'document-text', badge: sc.unseen || null },
            { value: 'youth', label: 'Юниоры', icon: 'school', badge: youth.length || null },
          ]}
        />
      }
    >
      {tab === 'scouts' ? (
        <>
          {sc.scouts.length ? (
            sc.scouts.map((s) => (
              <Card key={s.id} title={s.n} icon="person-outline" right={<T muted size={12}>{money(s.wage)}/нед</T>}>
                <View style={{ flexDirection: 'row', gap: 16, marginBottom: 8 }}>
                  <View><T muted size={11}>ОПЫТ</T><T color={C.gold}>{stars(s.exp)}</T></View>
                  <View><T muted size={11}>ОЦЕНКА</T><T color={C.gold}>{stars(s.jud)}</T></View>
                </View>
                {s.task ? (
                  <View style={{ backgroundColor: C.card2, borderRadius: 12, padding: 10, marginBottom: 8 }}>
                    <T size={14} bold>{s.task.type === 'youth' ? 'Ищет юниоров' : 'Ищет игроков'} · {NATION_BY_CODE[s.task.nat]?.flag} {NATION_BY_CODE[s.task.nat]?.name}</T>
                    <T muted size={12} style={{ marginTop: 2 }}>
                      {s.task.pos ? POS_RU[s.task.pos] : 'любая позиция'}
                      {s.task.type === 'senior' ? ` · ${s.task.age === 'u21' ? 'до 21' : s.task.age === 'u25' ? 'до 25' : 'любой возраст'}` : ''} · осталось {s.task.left} нед.
                    </T>
                  </View>
                ) : (
                  <T muted size={13} style={{ marginBottom: 8 }}>Без задания.</T>
                )}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Btn small title={s.task ? 'Новое задание' : 'Дать задание'} style={{ flex: 1 }} onPress={() => setAssign(assign === s.id ? null : s.id)} />
                  <Btn small kind="ghost" title="Уволить" onPress={() => G.dialog({ title: `Уволить ${s.n}?`, buttons: [{ title: 'Уволить', kind: 'danger', onPress: () => { fireScout(W, s.id); G.refresh(); } }, { title: 'Отмена', kind: 'ghost' }] })} />
                </View>
                {assign === s.id ? <AssignForm onDone={(task) => { assignScout(W, s.id, task); setAssign(null); G.refresh(); }} /> : null}
              </Card>
            ))
          ) : (
            <Empty text="У вас пока нет скаутов. Наймите кого-нибудь из кандидатов ниже." icon="eye-outline" />
          )}
          {sc.scouts.length < MAX_SCOUTS ? (
            <Card title="Кандидаты" icon="person-add-outline">
              <T muted size={12} style={{ marginBottom: 6 }}>Опыт — сколько игроков находит скаут и насколько они подходят клубу. Оценка — точность потенциала в отчётах; от 3★ он определяет и профиль роста.</T>
              {scoutCandidates(W).map((s) => (
                <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, borderBottomWidth: 0.5, borderBottomColor: C.line }}>
                  <View style={{ flex: 1 }}>
                    <T bold size={14}>{s.n}</T>
                    <T muted size={12}>опыт <Text style={{ color: C.gold }}>{stars(s.exp)}</Text> · оценка <Text style={{ color: C.gold }}>{stars(s.jud)}</Text></T>
                    <T muted size={11}>{money(s.fee)} сразу · {money(s.wage)}/нед</T>
                  </View>
                  <Btn small title="Нанять" onPress={() => show(hireScout(W, s.id))} />
                </View>
              ))}
            </Card>
          ) : null}
        </>
      ) : null}

      {tab === 'reports' ? (
        reports.length ? (
          <Card title={`Отчёты · ${reports.length}`} icon="document-text-outline" right={<Pressable onPress={() => G.dialog({ title: 'Очистить отчёты?', text: 'Все отчёты, кроме игроков из шорт-листа, будут удалены. Скауты не будут предлагать этих игроков год.', buttons: [{ title: 'Очистить', kind: 'danger', onPress: () => { dismissAllReports(W); G.refresh(); } }, { title: 'Отмена', kind: 'ghost' }] })}><T color={C.red} size={12} bold>Очистить</T></Pressable>}>
            <T muted size={11} style={{ marginBottom: 4 }}>☆ — в шорт-лист, ✕ — убрать отчёт (скаут больше не будет предлагать игрока).</T>
            {reports.map(({ p, r }) => {
              const pr = potRange(W, p);
              const star = isShort(W, p.id);
              return (
                <PlayerRow
                  key={p.id}
                  p={p}
                  W={W}
                  showClub
                  onPress={() => G.push('player', { id: p.id })}
                  right={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 2 }}>
                      <View style={{ alignItems: 'flex-end' }}>
                        <T muted size={10}>ПОТ.</T>
                        <Text style={{ color: C.gold, fontFamily: F.d7, fontSize: 15 }}>{pr.lo === pr.hi ? pr.lo : `${pr.lo}–${pr.hi}`}</Text>
                      </View>
                      <Pressable hitSlop={6} onPress={() => { toggleShort(W, p.id); G.refresh(); }}><Icon name={star ? 'star' : 'star-outline'} size={20} color={star ? C.gold : C.muted} /></Pressable>
                      <Pressable hitSlop={6} onPress={() => { dismissReport(W, p.id); G.refresh(); }}><Icon name="close-circle-outline" size={20} color={C.muted} /></Pressable>
                    </View>
                  }
                />
              );
            })}
          </Card>
        ) : (
          <Empty text="Отчётов пока нет. Дайте скаутам задание или отправьте скаута посмотреть игрока из его карточки." icon="document-text-outline" />
        )
      ) : null}

      {tab === 'youth' ? (
        youth.length ? (
          <Card title="Найденные таланты" icon="school-outline" right={<Pressable onPress={() => { dismissAllReports(W, true); G.refresh(); }}><T color={C.red} size={12} bold>Очистить</T></Pressable>}>
            <T muted size={12} style={{ marginBottom: 4 }}>Юниоры без контракта. Подпишите их в академию, пока предложение действует.</T>
            {youth.map((p) => {
              const pr = potRange(W, p);
              return (
                <PlayerRow
                  key={p.id}
                  p={p}
                  onPress={() => G.push('player', { id: p.id })}
                  sub={`до ${fmtShort(Math.floor(p.pros.until / 365), p.pros.until % 365)} · ${money(p.pros.fee)}`}
                  right={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 2 }}>
                      <View style={{ alignItems: 'flex-end' }}>
                        <T muted size={10}>ПОТ.</T>
                        <Text style={{ color: C.gold, fontFamily: F.d7, fontSize: 15 }}>{pr.lo}–{pr.hi}</Text>
                      </View>
                      <Pressable hitSlop={6} onPress={() => { dismissReport(W, p.id); G.refresh(); }}><Icon name="close-circle-outline" size={20} color={C.muted} /></Pressable>
                    </View>
                  }
                />
              );
            })}
          </Card>
        ) : (
          <Empty text="Отправьте скаута искать юниоров в нужную страну — каждые 2 недели он будет приносить нового таланта." icon="school-outline" />
        )
      ) : null}
    </Page>
  );
}

function AssignForm({ onDone }) {
  const [type, setType] = useState('senior');
  const [nat, setNat] = useState(COUNTRIES[0].code);
  const [pos, setPos] = useState(null);
  const [age, setAge] = useState('u25');
  const [weeks, setWeeks] = useState(4);
  return (
    <View style={{ marginTop: 12, gap: 8 }}>
      <Seg options={[{ value: 'senior', label: 'Игроки' }, { value: 'youth', label: 'Юниоры' }]} value={type} onChange={setType} />
      <T muted size={12}>Страна</T>
      <Chips options={COUNTRIES.map((n) => ({ value: n.code, label: `${n.flag} ${n.name}` }))} value={nat} onChange={setNat} />
      <T muted size={12}>Позиция</T>
      <Chips options={[{ value: null, label: 'Любая' }, ...POSITIONS.map((p) => ({ value: p, label: POS_RU[p] }))]} value={pos} onChange={setPos} />
      {type === 'senior' ? (
        <>
          <T muted size={12}>Возраст</T>
          <Seg options={[{ value: 'u21', label: 'до 21' }, { value: 'u25', label: 'до 25' }, { value: 'any', label: 'любой' }]} value={age} onChange={setAge} />
        </>
      ) : null}
      <T muted size={12}>Срок</T>
      <Seg options={[2, 4, 8].map((w) => ({ value: w, label: `${w} нед.` }))} value={weeks} onChange={setWeeks} />
      <Btn title="Отправить" icon="airplane" onPress={() => onDone({ type, nat, pos, age, weeks })} />
    </View>
  );
}
