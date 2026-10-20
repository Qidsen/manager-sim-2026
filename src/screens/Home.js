import React, { useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { C, Btn, T, Card, Bar, FormDots, ratingColor } from '../ui/kit';
import { useG } from '../ui/ctx';
import { advance } from '../engine/sim';
import { fmtDate, fmtShort, money, seasonLabel } from '../engine/util';
import { nextUserFixture, clubLeaguePos, lastResults, resultLetter, scoreText, userTeamIds } from '../engine/query';
import { teamName, teamFlag, teamColor, isNat } from '../engine/teams';
import { NATION_BY_CODE } from '../data/nations';
import { isWindow } from '../engine/fixtures';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Время идёт порциями по несколько дней, чтобы экран не замирал
export async function continueGame(G) {
  const W = G.W;
  const u = W.user;
  let r = { kind: 'idle' };
  let days = 0;
  G.setBusy(`Идёт время… ${fmtShort(W.year, W.day)}`);
  await wait(40);
  try {
    while (days < 400) {
      r = advance(W, 3);
      days += 3;
      if (r.kind !== 'idle') break;
      if (!u.club && !u.nation) break;
      G.setBusy(`Идёт время… ${fmtShort(W.year, W.day)}`);
      await wait(0);
    }
  } catch (e) {
    console.warn(e);
    G.setBusy(null);
    G.alert('Ошибка', String(e?.message || e));
    return;
  }
  G.setBusy(null);
  G.refresh();
  G.save(true);
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
  } else if (!u.club && !u.nation) G.push('career');
}

export default function HomeScreen() {
  const G = useG();
  const W = G.W;
  const u = W.user;
  const club = u.club ? W.clubs[u.club] : null;
  const nat = u.nation ? NATION_BY_CODE[u.nation] : null;
  const next = nextUserFixture(W);
  const unread = W.inbox.filter((m) => !m.read).length;
  const pos = club ? clubLeaguePos(W, club.id) : null;
  const accent = club ? club.color : C.accent;
  const today = next && next.day === W.day;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        {/* шапка */}
        <View style={[s.hero, { borderBottomColor: accent }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <T muted size={12}>{fmtDate(W.year, W.day, true)} · сезон {seasonLabel(W.year)}</T>
              <Text style={s.heroTitle} numberOfLines={1}>{club ? club.name : nat ? `Сборная: ${nat.name}` : 'Без работы'}</Text>
              <T muted size={13}>{u.name}{club && nat ? ` · сборная ${nat.flag}` : ''}</T>
            </View>
            <Pressable onPress={() => G.push('inbox')} hitSlop={10} style={s.mailBtn}>
              <Text style={{ fontSize: 20 }}>✉️</Text>
              {unread ? (
                <View style={s.mailDot}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{unread}</Text></View>
              ) : null}
            </Pressable>
          </View>
          {isWindow(W.day) ? <View style={s.windowPill}><Text style={{ color: C.accent, fontSize: 11, fontWeight: '700' }}>ТРАНСФЕРНОЕ ОКНО ОТКРЫТО</Text></View> : null}
        </View>

        <View style={{ padding: 14 }}>
          {/* ближайший матч */}
          {next ? (
            <Pressable onPress={() => (today ? G.push('match') : G.push('team', { id: next.m.h === next.team ? next.m.a : next.m.h }))}>
              <View style={[s.matchCard, today && { borderColor: C.gold }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <T muted size={12} numberOfLines={1} style={{ flex: 1 }}>
                    {next.comp.kind === 'friendly' ? next.m.label || 'Товарищеский матч' : next.comp.kind === 'league' ? `${next.comp.name} · ${next.ri + 1}-й тур` : `${next.comp.name} · ${next.stage.name}`}
                  </T>
                  <T size={12} bold color={today ? C.gold : C.muted}>{today ? 'СЕГОДНЯ' : fmtShort(W.year, next.day)}</T>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TeamBlock W={W} id={next.m.h} me={next.m.h === next.team} />
                  <Text style={{ color: C.dim, fontSize: 15, fontWeight: '800', marginHorizontal: 6 }}>VS</Text>
                  <TeamBlock W={W} id={next.m.a} me={next.m.a === next.team} />
                </View>
              </View>
            </Pressable>
          ) : (
            <Card><T muted center>{u.club || u.nation ? 'Ближайших матчей нет — жмите «Продолжить».' : 'Вы без работы. Предложения — в разделе «Карьера».'}</T></Card>
          )}

          {/* быстрые показатели */}
          <View style={s.tiles}>
            {club ? <Tile label="Баланс" value={money(club.balance)} color={club.balance < 0 ? C.red : C.text} onPress={() => G.push('club')} /> : null}
            {pos ? <Tile label={`Место${u.target ? ` · цель ${u.target}` : ''}`} value={`${pos.pos} из ${pos.total}`} color={u.target && pos.pos <= u.target ? C.accent : C.orange} onPress={() => G.push('comp', { id: `L:${club.league}` })} /> : null}
            {club ? <Tile label="Руководство" value={`${Math.round(u.conf)}%`} color={u.conf < 30 ? C.red : u.conf < 55 ? C.orange : C.accent} bar={u.conf} /> : null}
            {nat ? <Tile label="Федерация" value={`${Math.round(u.natConf)}%`} color={u.natConf < 30 ? C.red : C.accent} bar={u.natConf} onPress={() => G.push('nation')} /> : null}
          </View>

          {pos ? (
            <Card title="Турнирная таблица" onPress={() => G.push('comp', { id: `L:${club.league}` })} right={<T muted size={12}>Вся ›</T>}>
              {(() => {
                const from = Math.max(0, Math.min(pos.pos - 3, pos.total - 5));
                return pos.table.slice(from, from + 5).map((r, k) => {
                  const me = r.id === club.id;
                  return (
                    <View key={r.id} style={[s.tblRow, me && { backgroundColor: C.accentDim }]}>
                      <T muted size={13} style={{ width: 24, textAlign: 'center' }}>{from + k + 1}</T>
                      <T size={14} bold={me} style={{ flex: 1 }} numberOfLines={1}>{teamName(W, r.id)}</T>
                      <FormDots form={r.form} />
                      <T muted size={12} style={{ width: 26, textAlign: 'right' }}>{r.p}</T>
                      <T bold size={14} style={{ width: 30, textAlign: 'right' }}>{r.pts}</T>
                    </View>
                  );
                });
              })()}
            </Card>
          ) : null}

          {userTeamIds(W).map((tid) => {
            const res = lastResults(W, tid, 5);
            if (!res.length) return null;
            return (
              <Card key={tid} title={isNat(tid) ? 'Последние матчи сборной' : 'Последние матчи'}>
                {res.map(({ m }, i) => {
                  const L = resultLetter(m, tid);
                  const col = L === 'W' ? C.accent : L === 'L' ? C.red : C.muted;
                  return (
                    <View key={i} style={s.resRow}>
                      <View style={[s.resBadge, { backgroundColor: col }]}>
                        <Text style={{ color: '#06210f', fontSize: 11, fontWeight: '900' }}>{L === 'W' ? 'В' : L === 'L' ? 'П' : 'Н'}</Text>
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
              <T key={i} size={13} style={{ paddingVertical: 5, lineHeight: 18 }} numberOfLines={2}>{n.text}</T>
            ))}
            {!W.news.length ? <T muted size={13}>Пока тихо.</T> : null}
          </Card>
        </View>
      </ScrollView>

      {/* кнопка всегда под рукой */}
      <View style={s.cta}>
        <Btn title={today ? '⚽  К матчу' : 'Продолжить  ▶'} kind={today ? 'gold' : 'primary'} onPress={() => (today ? G.push('match') : continueGame(G))} style={{ paddingVertical: 16 }} />
      </View>
    </View>
  );
}

function Tile({ label, value, color, bar, onPress }) {
  const body = (
    <View style={s.tile}>
      <T muted size={11} numberOfLines={1}>{label}</T>
      <T bold size={17} color={color} numberOfLines={1} style={{ marginTop: 4 }}>{value}</T>
      {bar !== undefined ? <Bar value={bar} color={color} height={4} style={{ marginTop: 8 }} /> : null}
    </View>
  );
  return onPress ? <Pressable style={{ flexBasis: '47%', flexGrow: 1 }} onPress={onPress}>{body}</Pressable> : <View style={{ flexBasis: '47%', flexGrow: 1 }}>{body}</View>;
}

function TeamBlock({ W, id, me }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <View style={[s.flagCircle, { borderColor: me ? C.accent : teamColor(W, id) }]}>
        <Text style={{ fontSize: 26 }}>{teamFlag(W, id)}</Text>
      </View>
      <T bold center size={15} numberOfLines={2} style={{ marginTop: 8 }} color={me ? C.accent : C.text}>{teamName(W, id)}</T>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, backgroundColor: '#111a15', borderBottomWidth: 3 },
  heroTitle: { color: C.text, fontSize: 26, fontWeight: '900', marginVertical: 2 },
  mailBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' },
  mailDot: { position: 'absolute', right: -2, top: -2, backgroundColor: C.red, borderRadius: 9, minWidth: 18, height: 18, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  windowPill: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: C.accentDim },
  matchCard: { backgroundColor: C.card, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1.5, borderColor: C.line },
  flagCircle: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card2 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  tile: { backgroundColor: C.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.line },
  tblRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 8, borderRadius: 8 },
  resRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 },
  resBadge: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  cta: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, paddingBottom: 10, backgroundColor: 'rgba(12,18,15,0.94)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
});
