import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C, F, T, Seg, Card, Btn, Empty, SectionLabel, SubTabs, Rating, Icon } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import PlayerRow, { PosBadge } from '../ui/playerRow';
import { LINE, LINE_ORDER, money, playerValue, fmtShort } from '../engine/util';
import { squadOf, playerAvgRating, nextMatches, lastResults, scoreText, resultLetter } from '../engine/query';
import { teamName } from '../engine/teams';
import { ROLES } from '../engine/market';
import { squadRanks, rankMismatch, PLANS, userPlan, setPlan, practiceMatch } from '../engine/career';
import { Bar } from '../ui/kit';
import { TacticsBody } from './Tactics';
import { NATION_BY_CODE } from '../data/nations';

export function sortSquad(list) {
  return list.slice().sort((a, b) => LINE_ORDER[LINE[a.pos]] - LINE_ORDER[LINE[b.pos]] || b.ovr - a.ovr);
}
const LINE_RU = { G: 'Вратари', D: 'Защитники', M: 'Полузащитники', A: 'Нападающие' };

function Grouped({ list, render }) {
  return list.map((p, idx) => {
    const line = LINE[p.pos];
    const head = idx === 0 || LINE[list[idx - 1].pos] !== line ? <SectionLabel>{LINE_RU[line]} · {list.filter((x) => LINE[x.pos] === line).length}</SectionLabel> : null;
    return (
      <React.Fragment key={p.id}>
        {head}
        {render(p)}
      </React.Fragment>
    );
  });
}

export default function SquadScreen() {
  const G = useG();
  const W = G.W;
  const u = W.user;
  const teams = [];
  if (u.club) teams.push({ value: u.club, label: W.clubs[u.club].name });
  if (u.nation) teams.push({ value: `n:${u.nation}`, label: `Сборная ${NATION_BY_CODE[u.nation].flag}` });
  const [team, setTeam] = useState(teams[0]?.value);
  const [tab, setTab] = useState('squad');
  const cur = teams.find((t) => t.value === team) ? team : teams[0]?.value;

  if (!cur) return <Page title="Команда"><Empty text="У вас сейчас нет команды. Предложения работы — в «Офис → Карьера»." icon="shirt-outline" /></Page>;

  const isClub = !cur.startsWith('n:');
  const list = sortSquad(squadOf(W, cur));
  const club = isClub ? W.clubs[cur] : null;
  const wages = isClub ? list.reduce((s, p) => s + p.wage, 0) : 0;
  const top11 = list.slice().sort((a, b) => b.ovr - a.ovr).slice(0, 11);
  const avg = top11.length ? Math.round(top11.reduce((s, p) => s + p.ovr, 0) / top11.length) : 0;
  const injured = list.filter((p) => p.inj > 0 || p.ban > 0).length;
  const ranks = isClub ? squadRanks(W, cur) : {};

  const tabs = isClub
    ? [
        { value: 'squad', label: 'Состав', icon: 'people' },
        { value: 'tactics', label: 'Тактика', icon: 'clipboard' },
        { value: 'training', label: 'Тренировки', icon: 'barbell' },
        { value: 'stats', label: 'Статистика', icon: 'stats-chart' },
        { value: 'contracts', label: 'Контракты', icon: 'document-text' },
        { value: 'academy', label: 'Академия', icon: 'school', badge: club.academy.length || null },
      ]
    : [
        { value: 'squad', label: 'Вызванные', icon: 'people' },
        { value: 'tactics', label: 'Тактика', icon: 'clipboard' },
        { value: 'stats', label: 'Статистика', icon: 'stats-chart' },
        { value: 'matches', label: 'Матчи', icon: 'calendar' },
      ];
  const t = tabs.find((x) => x.value === tab) ? tab : 'squad';

  return (
    <Page
      title="Команда"
      sub={isClub ? `${list.length} игроков · сила основы ${avg}${injured ? ` · вне игры ${injured}` : ''}` : `${list.length} вызванных · сила ${avg}`}
      tabs={
        <View>
          {teams.length > 1 ? (
            <View style={{ paddingHorizontal: 14, paddingTop: 10 }}>
              <Seg options={teams} value={cur} onChange={(v) => { setTeam(v); setTab('squad'); }} />
            </View>
          ) : null}
          <SubTabs options={tabs} value={t} onChange={setTab} />
        </View>
      }
    >
      {t === 'squad' ? (
        <>
          {!isClub ? <Btn title="Изменить вызов" icon="person-add" small kind="ghost" onPress={() => G.push('callup')} style={{ marginBottom: 4 }} /> : null}
          <Grouped list={list} render={(p) => <PlayerRow p={p} onPress={() => G.push('player', { id: p.id })} rank={isClub ? ranks[p.id] : null} warn={isClub && rankMismatch(W, p) >= 2} sub={!isClub ? (p.club ? W.clubs[p.club]?.short : '') : null} />} />
        </>
      ) : null}

      {t === 'tactics' ? <TacticsBody team={cur} /> : null}

      {t === 'training' && isClub ? <TrainingBody W={W} G={G} list={list} /> : null}

      {t === 'stats' ? (
        <Card pad={false}>
          <View style={[st.head]}>
            <Text style={[st.h, { flex: 1, textAlign: 'left' }]}>ИГРОК</Text>
            {(isClub ? ['И', 'Г', 'П', 'ОЦ'] : ['М', 'Г']).map((h) => <Text key={h} style={st.h}>{h}</Text>)}
          </View>
          {list
            .slice()
            .sort((a, b) => (isClub ? b.st.app - a.st.app || b.st.g - a.st.g : b.caps - a.caps))
            .map((p) => {
              const r = playerAvgRating(p);
              return (
                <View key={p.id} style={st.row}>
                  <PosBadge pos={p.pos} size="sm" />
                  <T size={13} style={{ flex: 1 }} numberOfLines={1}>{p.n}</T>
                  {isClub ? (
                    <>
                      <Text style={st.c}>{p.st.app}</Text>
                      <Text style={[st.c, p.st.g && { color: C.gold }]}>{p.st.g}</Text>
                      <Text style={st.c}>{p.st.as}</Text>
                      <Text style={[st.c, { color: r ? (r >= 7.2 ? C.accent : r >= 6.6 ? C.text : C.orange) : C.dim }]}>{r ? r.toFixed(1) : '—'}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={st.c}>{p.caps}</Text>
                      <Text style={[st.c, p.ng && { color: C.gold }]}>{p.ng}</Text>
                    </>
                  )}
                </View>
              );
            })}
        </Card>
      ) : null}

      {t === 'contracts' && isClub ? (
        <>
          <View style={st.tiles}>
            <View style={st.tile}><T muted size={11}>Зарплаты в неделю</T><Text style={st.tileV}>{money(wages)}</Text></View>
            <View style={st.tile}><T muted size={11}>Истекают летом</T><Text style={[st.tileV, { color: list.some((p) => p.contract <= W.year && !p.loan) ? C.orange : C.text }]}>{list.filter((p) => p.contract <= W.year && !p.loan).length}</Text></View>
          </View>
          <Grouped
            list={list.slice().sort((a, b) => LINE_ORDER[LINE[a.pos]] - LINE_ORDER[LINE[b.pos]] || a.contract - b.contract)}
            render={(p) => (
              <PlayerRow
                p={p}
                onPress={() => G.push('player', { id: p.id })}
                right={
                  <View style={{ alignItems: 'flex-end', width: 92 }}>
                    <Text style={[st.money, p.contract <= W.year && !p.loan && { color: C.orange }]}>{p.loan ? 'аренда' : `до ${p.contract + 1}`}</Text>
                    <T size={11} muted>{money(p.wage)}/нед</T>
                  </View>
                }
              />
            )}
          />
        </>
      ) : null}

      {t === 'academy' && isClub ? (
        club.academy.length ? (
          <>
            <T muted size={12} style={{ marginBottom: 6 }}>Воспитанники растут на тренировках. Переводите лучших в первую команду до 19 лет — иначе они уйдут.</T>
            {club.academy.map((id) => W.players[id]).filter(Boolean).sort((a, b) => b.pot - a.pot).map((p) => (
              <PlayerRow key={p.id} p={p} onPress={() => G.push('player', { id: p.id })} />
            ))}
          </>
        ) : (
          <Empty text="В академии пока никого. Новый набор — каждую весну." icon="school-outline" />
        )
      ) : null}

      {t === 'matches' && !isClub ? (
        <Card title="Матчи сборной" icon="calendar-outline" pad={false}>
          {lastResults(W, cur, 6).map(({ m, comp }, i) => {
            const L = resultLetter(m, cur);
            return (
              <View key={`l${i}`} style={st.row}>
                <View style={[st.res, { backgroundColor: L === 'W' ? C.accent : L === 'L' ? C.red : C.dim }]}><Text style={st.resT}>{L === 'W' ? 'В' : L === 'L' ? 'П' : 'Н'}</Text></View>
                <T size={13} style={{ flex: 1 }} numberOfLines={1}>{teamName(W, m.h)} — {teamName(W, m.a)}</T>
                <Text style={st.money}>{scoreText(m)}</Text>
              </View>
            );
          })}
          {nextMatches(W, cur, 6).map(({ m, comp }, i) => (
            <View key={`n${i}`} style={st.row}>
              <T muted size={12} style={{ width: 52 }}>{fmtShort(W.year, m.day)}</T>
              <T size={13} style={{ flex: 1 }} numberOfLines={1}>{teamName(W, m.h)} — {teamName(W, m.a)}</T>
              <T muted size={11} numberOfLines={1} style={{ maxWidth: 100 }}>{comp.kind === 'friendly' ? 'товарищеский' : comp.name}</T>
            </View>
          ))}
        </Card>
      ) : null}
    </Page>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  h: { color: C.muted, fontFamily: F.d7, fontSize: 12, width: 36, textAlign: 'center', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  c: { color: C.text, fontFamily: F.d7, fontSize: 15, width: 36, textAlign: 'center' },
  tiles: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  tile: { flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: C.line },
  tileV: { color: C.text, fontFamily: F.d8, fontSize: 24, marginTop: 2 },
  money: { color: C.text, fontFamily: F.d7, fontSize: 15 },
  res: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  resT: { color: '#0A0F1C', fontFamily: F.d8, fontSize: 13 },
});

function TrainingBody({ W, G, list }) {
  const plan = userPlan(W);
  const now = W.year * 365 + W.day;
  const wk = Math.floor(now / 7);
  const sorted = list.filter((p) => !p.loan || true).slice().sort((a, b) => (a.shp ?? 80) - (b.shp ?? 80));
  return (
    <>
      <Card title="План на неделю" icon="calendar-outline">
        <View style={{ gap: 8 }}>
          {Object.entries(PLANS).map(([k, pl]) => {
            const on = plan === k;
            return (
              <Card key={k} onPress={() => { setPlan(W, k); G.refresh(); }} style={{ marginBottom: 0, backgroundColor: on ? C.goldDim : C.card2, borderColor: on ? C.gold : C.line, padding: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Icon name={pl.icon} size={20} color={on ? C.gold : C.muted} />
                  <View style={{ flex: 1 }}>
                    <T bold size={15} color={on ? C.gold : C.text}>{pl.ru}</T>
                    <T muted size={12} style={{ marginTop: 2 }}>{pl.d}</T>
                  </View>
                  {on ? <Icon name="checkmark-circle" size={20} color={C.gold} /> : null}
                </View>
              </Card>
            );
          })}
        </View>
      </Card>
      <Card title="Двусторонняя игра" icon="football-outline">
        <T muted size={13} style={{ marginBottom: 10 }}>Тренировочный матч для тех, кто не играл последние дни: +10 тонуса, но −12 свежести. Раз в неделю.</T>
        <Btn title={W.user.practiceWk === wk ? 'Уже проведена на этой неделе' : 'Провести двустороннюю игру'} kind={W.user.practiceWk === wk ? 'ghost' : 'primary'} icon="people" onPress={() => { const r = practiceMatch(W); G.alert(r.status === 'accepted' ? 'Двусторонка' : 'Нельзя', r.msg); G.refresh(); }} />
      </Card>
      <Card title="Игровой тонус" icon="pulse-outline">
        <T muted size={12} style={{ marginBottom: 8 }}>Тонус растёт от игровых минут и падает без практики. Низкий тонус снижает текущий рейтинг и повышает риск травмы.</T>
        {sorted.map((p) => {
          const v = Math.round(p.shp ?? 80);
          const days = p.lp ? now - p.lp : null;
          return (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: C.line }}>
              <PosBadge pos={p.pos} size="sm" />
              <T size={13} style={{ flex: 1 }} numberOfLines={1}>{p.n}</T>
              <T muted size={11} style={{ width: 62, textAlign: 'right' }}>{days === null ? '—' : days <= 0 ? 'сегодня' : `${days} дн. назад`}</T>
              <Bar value={v} color={v < 60 ? C.orange : v < 80 ? C.gold : C.accent} height={6} style={{ width: 70 }} />
              <Text style={{ width: 28, textAlign: 'right', color: v < 60 ? C.orange : C.text, fontFamily: F.d7, fontSize: 14 }}>{v}</Text>
            </View>
          );
        })}
      </Card>
    </>
  );
}
