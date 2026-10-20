import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, Btn, T, Card, Bar, FormDots, Icon, IconBtn, More, tap, thud } from '../ui/kit';
import { useG } from '../ui/ctx';
import { advance } from '../engine/sim';
import { fmtDate, fmtShort, money, seasonLabel } from '../engine/util';
import { nextUserFixture, clubLeaguePos, lastResults, resultLetter, scoreText, userTeamIds } from '../engine/query';
import { teamName, teamFlag, teamColor, isNat } from '../engine/teams';
import { NATION_BY_CODE } from '../data/nations';
import { isWindow } from '../engine/fixtures';
import { bcStart, bcEnd, logError } from '../diag';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Время идёт порциями по несколько дней, чтобы экран не замирал
export async function continueGame(G) {
  thud();
  const W = G.W;
  const u = W.user;
  let r = { kind: 'idle' };
  let days = 0;
  G.setBusy(`Идёт время… ${fmtShort(W.year, W.day)}`);
  await wait(40);
  const t0 = Date.now();
  await bcStart(W, 'continue');
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
    logError(W, 'continue', e);
    await bcEnd(W, 'continue-error', Date.now() - t0);
    G.setBusy(null);
    G.save(true);
    G.alert('Ошибка', `${String(e?.message || e)}\n\nОтчёт для разработчика — в «Ещё → Диагностика».`);
    return;
  }
  await bcEnd(W, 'continue', Date.now() - t0);
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
  const tint = club ? club.color : '#4C8DFF';
  const today = next && next.day === W.day;
  const daysTo = next ? next.day - W.day : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* шапка в цветах клуба */}
        <LinearGradient colors={[tint + '66', tint + '14', C.bg]} locations={[0, 0.55, 1]} style={s.hero}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={s.date}>{fmtDate(W.year, W.day, true).toUpperCase()} · {seasonLabel(W.year)}</Text>
              <Text style={s.heroTitle} numberOfLines={1}>{club ? club.name : nat ? nat.name : 'Без работы'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Icon name="person-circle-outline" size={15} color={C.muted} />
                <T muted size={13}>{u.name}{club && nat ? `  ·  ${nat.flag} ${nat.name}` : ''}</T>
              </View>
            </View>
            <IconBtn name="mail" onPress={() => G.push('inbox')} badge={unread} />
          </View>
          {isWindow(W.day) ? (
            <View style={s.window}>
              <Icon name="swap-horizontal" size={12} color={C.gold} />
              <Text style={s.windowText}>ТРАНСФЕРНОЕ ОКНО ОТКРЫТО</Text>
            </View>
          ) : null}
        </LinearGradient>

        <View style={{ paddingHorizontal: 14 }}>
          {/* матчдэй */}
          {next ? (
            <Pressable onPress={() => { tap(); today ? G.push('match') : G.push('team', { id: next.m.h === next.team ? next.m.a : next.m.h }); }}>
              <LinearGradient colors={today ? ['#3A2A0E', C.card] : [C.card2, C.card]} style={[s.matchCard, today && { borderColor: C.gold + '99' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                  <Icon name="trophy-outline" size={13} color={C.muted} />
                  <Text style={s.compLine} numberOfLines={1}>
                    {(next.comp.kind === 'friendly' ? next.m.label || 'Товарищеский матч' : next.comp.kind === 'league' ? `${next.comp.name} · ${next.ri + 1}-й тур` : `${next.comp.name} · ${next.stage.name}`).toUpperCase()}
                  </Text>
                  <View style={[s.when, today && { backgroundColor: C.gold }]}>
                    <Text style={[s.whenText, today && { color: '#1A1206' }]}>{today ? 'СЕГОДНЯ' : daysTo === 1 ? 'ЗАВТРА' : fmtShort(W.year, next.day).toUpperCase()}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TeamBlock W={W} id={next.m.h} me={next.m.h === next.team} />
                  <View style={{ alignItems: 'center', width: 54 }}>
                    <Text style={s.vs}>VS</Text>
                    <T muted size={10}>{next.m.h === next.team ? 'дома' : 'в гостях'}</T>
                  </View>
                  <TeamBlock W={W} id={next.m.a} me={next.m.a === next.team} />
                </View>
              </LinearGradient>
            </Pressable>
          ) : (
            <Card><T muted center>{u.club || u.nation ? 'Ближайших матчей нет — жмите «Продолжить».' : 'Вы без работы. Предложения — в разделе «Карьера».'}</T></Card>
          )}

          {/* ключевые цифры */}
          <View style={s.tiles}>
            {club ? <Tile icon="wallet" label="Бюджет" value={money(club.balance)} color={club.balance < 0 ? C.red : C.text} onPress={() => G.push('club')} /> : null}
            {pos ? <Tile icon="podium" label={u.target ? `Место · цель ${u.target}` : 'Место'} value={`${pos.pos}`} suffix={` из ${pos.total}`} color={u.target && pos.pos <= u.target ? C.accent : C.orange} onPress={() => G.push('comp', { id: `L:${club.league}` })} /> : null}
            {club ? <Tile icon="business" label="Руководство" value={`${Math.round(u.conf)}%`} color={u.conf < 30 ? C.red : u.conf < 55 ? C.orange : C.accent} bar={u.conf} /> : null}
            {nat ? <Tile icon="flag" label="Федерация" value={`${Math.round(u.natConf)}%`} color={u.natConf < 30 ? C.red : C.accent} bar={u.natConf} onPress={() => G.push('nation')} /> : null}
          </View>

          {pos ? (
            <Card title="Турнирная таблица" icon="list" onPress={() => G.push('comp', { id: `L:${club.league}` })} right={<More text="Вся" />}>
              {(() => {
                const from = Math.max(0, Math.min(pos.pos - 3, pos.total - 5));
                return pos.table.slice(from, from + 5).map((r, k) => {
                  const me = r.id === club.id;
                  return (
                    <View key={r.id} style={[s.tblRow, me && { backgroundColor: C.goldDim }]}>
                      <Text style={[s.tblPos, me && { color: C.gold }]}>{from + k + 1}</Text>
                      <T size={14} bold={me} style={{ flex: 1 }} numberOfLines={1}>{teamName(W, r.id)}</T>
                      <FormDots form={r.form.slice(-4)} />
                      <Text style={s.tblPts}>{r.pts}</Text>
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
              <Card key={tid} title={isNat(tid) ? 'Сборная: последние матчи' : 'Последние матчи'} icon="time-outline">
                {res.map(({ m, comp }, i) => {
                  const L = resultLetter(m, tid);
                  const col = L === 'W' ? C.accent : L === 'L' ? C.red : C.dim;
                  const home = m.h === tid;
                  return (
                    <View key={i} style={s.resRow}>
                      <View style={[s.resBadge, { backgroundColor: col }]}>
                        <Text style={s.resLetter}>{L === 'W' ? 'В' : L === 'L' ? 'П' : 'Н'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <T size={14} numberOfLines={1}>{home ? '' : '@ '}{teamName(W, home ? m.a : m.h)}</T>
                        <T muted size={11} numberOfLines={1}>{comp.kind === 'friendly' ? 'Товарищеский' : comp.name}</T>
                      </View>
                      <Text style={s.score}>{scoreText(m)}</Text>
                    </View>
                  );
                })}
              </Card>
            );
          })}

          <Card title="Новости" icon="newspaper-outline" onPress={() => G.push('news')} right={<More />}>
            {W.news.slice(0, 4).map((n, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10, paddingVertical: 6 }}>
                <View style={{ width: 3, borderRadius: 2, backgroundColor: C.gold, opacity: 0.6 }} />
                <T size={13} style={{ flex: 1, lineHeight: 18 }} numberOfLines={2}>{n.text}</T>
              </View>
            ))}
            {!W.news.length ? <T muted size={13}>Пока тихо.</T> : null}
          </Card>
        </View>
      </ScrollView>

      <View style={s.cta}>
        <Btn title={today ? 'К МАТЧУ' : 'ПРОДОЛЖИТЬ'} icon={today ? 'football' : 'play'} onPress={() => (today ? G.push('match') : continueGame(G))} />
      </View>
    </View>
  );
}

function Tile({ icon, label, value, suffix, color, bar, onPress }) {
  const body = (
    <View style={s.tile}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Icon name={icon} size={13} color={C.muted} />
        <T muted size={11} numberOfLines={1} style={{ flex: 1 }}>{label}</T>
        {onPress ? <Icon name="chevron-forward" size={12} color={C.dim} /> : null}
      </View>
      <Text style={[s.tileVal, { color }]} numberOfLines={1}>{value}{suffix ? <Text style={{ color: C.muted, fontSize: 16 }}>{suffix}</Text> : null}</Text>
      {bar !== undefined ? <Bar value={bar} color={color} height={4} style={{ marginTop: 6 }} /> : null}
    </View>
  );
  return onPress ? <Pressable style={{ flexBasis: '47%', flexGrow: 1 }} onPress={() => { tap(); onPress(); }}>{body}</Pressable> : <View style={{ flexBasis: '47%', flexGrow: 1 }}>{body}</View>;
}

function TeamBlock({ W, id, me }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <View style={[s.flagRing, { borderColor: me ? C.gold : teamColor(W, id) }]}>
        <Text style={{ fontSize: 30 }}>{teamFlag(W, id)}</Text>
      </View>
      <Text style={[s.teamName, me && { color: C.gold }]} numberOfLines={2}>{teamName(W, id)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 22 },
  date: { color: C.muted, fontSize: 12, fontFamily: F.d7, letterSpacing: 1.3 },
  heroTitle: { color: C.text, fontSize: 34, fontFamily: F.d8, marginTop: 2, letterSpacing: 0.3 },
  window: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 12, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7, backgroundColor: C.goldDim, borderWidth: 1, borderColor: C.gold + '44' },
  windowText: { color: C.gold, fontSize: 12, fontFamily: F.d7, letterSpacing: 1 },
  matchCard: { borderRadius: 22, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.line },
  compLine: { color: C.muted, fontSize: 12, fontFamily: F.d7, letterSpacing: 1, flex: 1, marginLeft: 6 },
  when: { backgroundColor: C.card3, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  whenText: { color: C.text, fontSize: 12, fontFamily: F.d8, letterSpacing: 0.8 },
  vs: { color: C.dim, fontSize: 24, fontFamily: F.d8 },
  flagRing: { width: 68, height: 68, borderRadius: 34, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg2 },
  teamName: { color: C.text, fontSize: 17, fontFamily: F.d7, textAlign: 'center', marginTop: 8 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  tile: { backgroundColor: C.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: C.line },
  tileVal: { fontSize: 25, fontFamily: F.d8, marginTop: 2 },
  tblRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 6, gap: 10, borderRadius: 9 },
  tblPos: { color: C.muted, width: 20, textAlign: 'center', fontFamily: F.d7, fontSize: 16 },
  tblPts: { color: C.text, width: 30, textAlign: 'right', fontFamily: F.d8, fontSize: 18 },
  resRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 12 },
  resBadge: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  resLetter: { color: '#0A0F1C', fontSize: 14, fontFamily: F.d8 },
  score: { color: C.text, fontSize: 20, fontFamily: F.d8, fontVariant: ['tabular-nums'] },
  cta: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, backgroundColor: 'rgba(10,15,28,0.94)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
});
