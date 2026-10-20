import React from 'react';
import Crest from '../ui/Crest';
import { View, StyleSheet } from 'react-native';
import { C, T, Card, Btn, Bar, Empty, Row, Icon } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import { acceptJob, jobOffers } from '../engine/sim';
import { managerStyle } from '../engine/stories';
import { NATION_BY_CODE } from '../data/nations';
import { LEAGUE_BY_ID, LEAGUES } from '../data/leagues';
import { teamName, teamFlag, isUserTeam } from '../engine/teams';
import { seasonLabel, fmtShort } from '../engine/util';

export default function CareerScreen() {
  const G = useG();
  const W = G.W;
  const u = W.user;
  const unemployed = !u.club && !u.nation;
  return (
    <Page title="Карьера" sub={u.name} back>
      <View style={cs.hero}>
        <View style={cs.avatar}><Icon name="person" size={30} color={C.gold} /></View>
        <View style={{ flex: 1 }}>
          <T display size={24} numberOfLines={1}>{u.name}</T>
          <T muted size={12}>{u.club ? W.clubs[u.club].name : 'без клуба'}{u.nation ? ` · сборная ${NATION_BY_CODE[u.nation].name}` : ''}</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <Bar value={u.rep} height={6} style={{ flex: 1 }} color={C.gold} />
            <T bold size={13} color={C.gold}>{Math.round(u.rep)}</T>
          </View>
          <T muted size={10} style={{ marginTop: 2 }}>репутация тренера</T>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        {[['Сезонов', W.seasonLog.length + 1], ['Трофеев', u.trophies.length], ['Клубов', new Set([...u.career.map((c) => c.team), u.club ? W.clubs[u.club].name : null].filter(Boolean)).size]].map(([l, v]) => (
          <View key={l} style={cs.tile}><T muted size={11}>{l}</T><T display size={24}>{v}</T></View>
        ))}
      </View>
      {(() => { const st = managerStyle(u); return (
        <Card title="Образ в прессе" icon="mic-outline" onPress={() => G.push('press')}>
          <T bold size={16} color={C.gold}>{st.ru}</T>
          <T muted size={13} style={{ marginTop: 4 }}>{st.d}</T>
        </Card>
      ); })()}
      <Card title="Предложения работы" icon="briefcase-outline">
        {W.jobOffers.length ? (
          W.jobOffers.map((o, i) => {
            const name = o.type === 'club' ? W.clubs[o.id].name : `Сборная: ${NATION_BY_CODE[o.id].name}`;
            const sub = o.type === 'club' ? `${LEAGUE_BY_ID[W.clubs[o.id].league]?.name || ''} · репутация ${Math.round(W.clubs[o.id].rep)}` : `сила ${Math.round(W.nations[o.id].rep)}`;
            return (
              <View key={i} style={{ paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: C.line }}>
                <T bold>{name}</T>
                <T muted size={12}>{sub}</T>
                <Btn small title="Принять" style={{ marginTop: 6 }} onPress={() => G.dialog({
                  title: 'Принять предложение?',
                  text: o.type === 'club' && u.club ? `Вы покинете «${W.clubs[u.club].name}».` : 'Вы приступите к работе немедленно.',
                  buttons: [{ title: 'Принять', onPress: () => { acceptJob(W, o); G.refresh(); } }, { title: 'Отмена', kind: 'ghost' }],
                })} />
              </View>
            );
          })
        ) : (
          <T muted size={13}>Пока предложений нет. Они приходят в конце сезона или после увольнения.</T>
        )}
        {unemployed ? <Btn small kind="ghost" title="Разослать резюме" style={{ marginTop: 10 }} onPress={() => { jobOffers(W, true); G.refresh(); }} /> : null}
      </Card>

      <Card title="Трофеи" icon="trophy-outline">
        {u.trophies.length ? u.trophies.map((t, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.goldDim, alignItems: 'center', justifyContent: 'center' }}><Icon name="trophy" size={16} color={C.gold} /></View>
            <View style={{ flex: 1 }}><T bold size={14}>{t.name}</T><T muted size={11}>{t.team} · {seasonLabel(t.y)}</T></View>
          </View>
        )) : <T muted size={13}>Трофеев пока нет.</T>}
      </Card>
      <Card title="История" icon="time-outline">
        {u.career.length ? u.career.map((c, i) => <T key={i} size={13} style={{ paddingVertical: 3 }}>{seasonLabel(c.y)} · {c.team} — {c.end}</T>) : <T muted size={13}>Карьера только начинается.</T>}
        {W.seasonLog.map((s, i) => s.user ? <T key={`s${i}`} size={13} muted style={{ paddingVertical: 3 }}>{seasonLabel(s.y)}: {s.user.league}, {s.user.pos}-е место (цель {s.user.target})</T> : null)}
      </Card>
    </Page>
  );
}

export function NewsScreen() {
  const G = useG();
  const W = G.W;
  return (
    <Page title="Новости" back>
      {W.news.length ? W.news.map((n, i) => {
        const tr = n.text.includes('переходит') || n.text.includes('подписывает');
        const cup = n.text.includes('победитель') || n.text.includes('вышли');
        const ic = tr ? ['swap-horizontal', C.blue] : cup ? ['trophy', C.gold] : ['newspaper', C.muted];
        return (
          <View key={i} style={{ flexDirection: 'row', gap: 12, backgroundColor: C.card, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.line }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: ic[1] + '22', alignItems: 'center', justifyContent: 'center' }}><Icon name={ic[0]} size={16} color={ic[1]} /></View>
            <View style={{ flex: 1 }}>
              <T size={14} style={{ lineHeight: 19 }}>{n.text}</T>
              <T muted size={11} style={{ marginTop: 3 }}>{fmtShort(n.y, n.d)}</T>
            </View>
          </View>
        );
      }) : <Empty text="Новостей пока нет." icon="newspaper-outline" />}
    </Page>
  );
}

export function HistoryScreen() {
  return (
    <Page title="История турниров" back>
      <HistoryBody />
    </Page>
  );
}

export function HistoryBody() {
  const G = useG();
  const W = G.W;
  const keys = Object.keys(W.history).filter((k) => W.history[k].length);
  const order = (k) => (k.startsWith('L:') ? 0 : k.startsWith('CUP') ? 1 : ['UCL', 'UEL', 'UECL', 'LIB', 'AFC', 'CON'].includes(k) ? 2 : 3);
  keys.sort((a, b) => order(a) - order(b));
  return keys.length ? (
    <>
      {keys.map((k) => {
        const h = W.history[k];
        return (
          <Card key={k} title={h[h.length - 1].name.replace(/\s\d{4}(\/\d{2})?$/, '')} icon="trophy-outline">
            {h.slice().reverse().map((x, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 }}>
                <T muted size={12} style={{ width: 56 }}>{seasonLabel(x.y)}</T>
                <Icon name="trophy" size={13} color={C.gold} />
                {x.w ? <Crest W={W} id={x.w} size={18} /> : null}
                <T size={14} bold={isUserTeam(W, x.w)} color={isUserTeam(W, x.w) ? C.gold : C.text} style={{ flex: 1 }} numberOfLines={1}>{x.w ? teamName(W, x.w) : '—'}</T>
              </View>
            ))}
          </Card>
        );
      })}
    </>
  ) : (
    <Empty text="Первые победители появятся в конце сезона." icon="trophy-outline" />
  );
}

const cs = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.card, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.line },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.goldDim, borderWidth: 2, borderColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  tile: { flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: C.line },
});

export function SocialScreen() {
  const G = useG();
  const W = G.W;
  const list = W.social || [];
  return (
    <Page title="Соцсети" sub="Фанаты, инсайдеры и слухи" back>
      {list.length ? list.map((s, i) => (
        <View key={i} style={{ backgroundColor: C.card, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: s.tone > 0 ? C.accent + '44' : s.tone < 0 ? C.red + '44' : C.line }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: s.who.startsWith('@') && /[А-Я]/.test(s.who[1]) ? C.blue + '33' : C.gold + '33', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={/[А-Я]/.test(s.who[1]) ? 'newspaper' : 'person'} size={13} color={/[А-Я]/.test(s.who[1]) ? C.blue : C.gold} />
            </View>
            <T bold size={13} style={{ flex: 1 }}>{s.who}</T>
            <T muted size={11}>{fmtShort(s.y, s.d)}</T>
          </View>
          <T size={14} style={{ lineHeight: 19 }}>{s.text}</T>
        </View>
      )) : <Empty text="Пока тихо. Соцсети оживут с первыми матчами и трансферами." icon="chatbubbles-outline" />}
    </Page>
  );
}
