import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { C, Btn, T, Card, Row, Bar, Badge, FormDots } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import { advance } from '../engine/sim';
import { fmtDate, fmtShort, money, seasonLabel } from '../engine/util';
import { nextUserFixture, clubLeaguePos, lastResults, resultLetter, scoreText, userTeamIds } from '../engine/query';
import { teamName, teamFlag, isNat } from '../engine/teams';
import { NATION_BY_CODE } from '../data/nations';
import { isWindow } from '../engine/fixtures';

export default function HomeScreen() {
  const G = useG();
  const W = G.W;
  const u = W.user;
  const club = u.club ? W.clubs[u.club] : null;
  const nat = u.nation ? NATION_BY_CODE[u.nation] : null;
  const next = nextUserFixture(W);
  const unread = W.inbox.filter((m) => !m.read).length;

  const onContinue = async () => {
    const r = await G.run('Идёт время…', () => advance(W));
    if (!r) return;
    if (r.kind === 'match') G.push('match');
    else if (r.kind === 'stop') {
      const m = W.inbox.find((x) => !x.read);
      if (m) {
        G.dialog({
          title: m.title,
          text: m.body,
          buttons: [
            { title: 'Понятно', onPress: () => { m.read = true; G.refresh(); } },
            { title: 'Открыть почту', onPress: () => { m.read = true; G.push('inbox'); } },
          ],
        });
      }
    } else if (!u.club && !u.nation) {
      G.push('career');
    }
  };

  const pos = club ? clubLeaguePos(W, club.id) : null;

  return (
    <Page
      title={fmtDate(W.year, W.day, true)}
      sub={`Сезон ${seasonLabel(W.year)} · ${u.name}${isWindow(W.day) ? ' · трансферное окно открыто' : ''}`}
      right={
        <Pressable onPress={() => G.push('inbox')} hitSlop={10} style={{ paddingLeft: 10 }}>
          <Text style={{ fontSize: 22 }}>✉️</Text>
          {unread ? (
            <View style={{ position: 'absolute', right: -6, top: -4, backgroundColor: C.red, borderRadius: 9, minWidth: 18, paddingHorizontal: 4, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{unread}</Text>
            </View>
          ) : null}
        </Pressable>
      }
    >
      {next ? (
        <Card title={next.comp.kind === 'friendly' ? (next.m.label || 'Товарищеский матч') : next.comp.kind === 'league' ? `${next.comp.name} · ${next.ri + 1}-й тур` : `${next.comp.name} · ${next.stage.name}`} right={<T muted size={12}>{fmtShort(W.year, next.day)}</T>}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TeamBlock W={W} id={next.m.h} />
            <Text style={{ color: C.muted, fontSize: 16, fontWeight: '700', marginHorizontal: 8 }}>vs</Text>
            <TeamBlock W={W} id={next.m.a} />
          </View>
          {next.day === W.day ? <Badge text="СЕГОДНЯ" color={C.gold} style={{ alignSelf: 'center', marginTop: 10 }} /> : null}
        </Card>
      ) : (
        <Card>
          <T muted center>{u.club || u.nation ? 'В ближайшее время матчей нет' : 'Вы без работы. Загляните в «Карьеру» — там предложения.'}</T>
        </Card>
      )}

      <Btn title="Продолжить ▶" onPress={onContinue} style={{ marginBottom: 14, paddingVertical: 16 }} />

      {club ? (
        <Card title={club.name} onPress={() => G.push('club')} right={<T muted size={12}>Клуб ›</T>}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <T muted size={12}>Баланс</T>
              <T bold size={17} color={club.balance < 0 ? C.red : C.text}>{money(club.balance)}</T>
            </View>
            {pos ? (
              <View style={{ alignItems: 'flex-end' }}>
                <T muted size={12}>Место в лиге</T>
                <T bold size={17}>{pos.pos} / {pos.total}{u.target ? <T muted size={12}>  (цель {u.target})</T> : null}</T>
              </View>
            ) : null}
          </View>
          <T muted size={12} style={{ marginTop: 10 }}>Доверие руководства</T>
          <Bar value={u.conf} color={u.conf < 30 ? C.red : u.conf < 55 ? C.orange : C.accent} height={7} style={{ marginTop: 4 }} />
        </Card>
      ) : null}

      {nat ? (
        <Card title={`Сборная · ${nat.name}`} onPress={() => G.push('nation')} right={<Text style={{ fontSize: 20 }}>{nat.flag}</Text>}>
          <T muted size={13}>Задача: {u.natTarget}</T>
          <T muted size={12} style={{ marginTop: 8 }}>Доверие федерации</T>
          <Bar value={u.natConf} color={u.natConf < 30 ? C.red : u.natConf < 55 ? C.orange : C.accent} height={7} style={{ marginTop: 4 }} />
        </Card>
      ) : null}

      {pos ? (
        <Card title="Таблица" onPress={() => G.push('comp', { id: `L:${club.league}` })} right={<T muted size={12}>Вся ›</T>}>
          {pos.table.slice(Math.max(0, Math.min(pos.pos - 3, pos.total - 5)), Math.max(0, Math.min(pos.pos - 3, pos.total - 5)) + 5).map((r) => {
            const i = pos.table.indexOf(r);
            const me = r.id === club.id;
            return (
              <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5, gap: 8 }}>
                <T muted size={13} style={{ width: 22 }}>{i + 1}</T>
                <T size={14} bold={me} color={me ? C.accent : C.text} style={{ flex: 1 }} numberOfLines={1}>{teamName(W, r.id)}</T>
                <FormDots form={r.form} />
                <T muted size={13} style={{ width: 28, textAlign: 'right' }}>{r.p}</T>
                <T bold size={14} style={{ width: 30, textAlign: 'right' }}>{r.pts}</T>
              </View>
            );
          })}
        </Card>
      ) : null}

      {userTeamIds(W).map((tid) => {
        const res = lastResults(W, tid, 5);
        if (!res.length) return null;
        return (
          <Card key={tid} title={`Последние матчи${isNat(tid) ? ' сборной' : ''}`}>
            {res.map(({ m, comp }, i) => {
              const L = resultLetter(m, tid);
              return (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 8 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 5, backgroundColor: L === 'W' ? C.accent : L === 'L' ? C.red : C.muted, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#06210f', fontSize: 11, fontWeight: '800' }}>{L === 'W' ? 'В' : L === 'L' ? 'П' : 'Н'}</Text>
                  </View>
                  <T size={13} style={{ flex: 1 }} numberOfLines={1}>{teamName(W, m.h)} — {teamName(W, m.a)}</T>
                  <T bold size={13}>{scoreText(m)}</T>
                </View>
              );
            })}
          </Card>
        );
      })}

      <Card title="Новости" onPress={() => G.push('news')} right={<T muted size={12}>Все ›</T>}>
        {W.news.slice(0, 4).map((n, i) => (
          <T key={i} size={13} style={{ paddingVertical: 4 }} numberOfLines={2}>• {n.text}</T>
        ))}
        {!W.news.length ? <T muted size={13}>Пока тихо.</T> : null}
      </Card>
    </Page>
  );
}

function TeamBlock({ W, id }) {
  const G = useG();
  return (
    <Pressable style={{ flex: 1, alignItems: 'center' }} onPress={() => G.push('team', { id })}>
      <Text style={{ fontSize: 28 }}>{teamFlag(W, id)}</Text>
      <T bold center size={15} numberOfLines={2} style={{ marginTop: 4 }}>{teamName(W, id)}</T>
    </Pressable>
  );
}
