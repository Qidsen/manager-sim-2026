import React from 'react';
import { View } from 'react-native';
import { C, T, Card, Btn, Bar, Empty, Row } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import { acceptJob, jobOffers } from '../engine/sim';
import { NATION_BY_CODE } from '../data/nations';
import { LEAGUE_BY_ID, LEAGUES } from '../data/leagues';
import { teamName } from '../engine/teams';
import { seasonLabel, fmtShort } from '../engine/util';

export default function CareerScreen() {
  const G = useG();
  const W = G.W;
  const u = W.user;
  const unemployed = !u.club && !u.nation;
  return (
    <Page title="Карьера" sub={u.name} back>
      <Card title="Тренер">
        <T muted size={12}>Репутация</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <Bar value={u.rep} height={8} style={{ flex: 1 }} color={C.gold} />
          <T bold>{Math.round(u.rep)}</T>
        </View>
        <T size={14} style={{ marginTop: 10 }}>Клуб: <T bold size={14}>{u.club ? W.clubs[u.club].name : '—'}</T></T>
        <T size={14} style={{ marginTop: 4 }}>Сборная: <T bold size={14}>{u.nation ? NATION_BY_CODE[u.nation].name : '—'}</T></T>
      </Card>

      <Card title="Предложения работы">
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

      <Card title="Трофеи">
        {u.trophies.length ? u.trophies.map((t, i) => <T key={i} size={14} style={{ paddingVertical: 3 }}>🏆 {t.name} — {t.team} ({seasonLabel(t.y)})</T>) : <T muted size={13}>Трофеев пока нет.</T>}
      </Card>
      <Card title="История">
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
      {W.news.length ? W.news.map((n, i) => (
        <Row key={i}>
          <T muted size={11} style={{ width: 46 }}>{fmtShort(n.y, n.d)}</T>
          <T size={13} style={{ flex: 1 }}>{n.text}</T>
        </Row>
      )) : <Empty text="Новостей пока нет." />}
    </Page>
  );
}

export function HistoryScreen() {
  const G = useG();
  const W = G.W;
  const keys = Object.keys(W.history).filter((k) => W.history[k].length);
  const order = (k) => (k.startsWith('L:') ? 0 : k.startsWith('CUP') ? 1 : ['UCL', 'UEL', 'UECL', 'LIB', 'AFC', 'CON'].includes(k) ? 2 : 3);
  keys.sort((a, b) => order(a) - order(b));
  return (
    <Page title="История турниров" back>
      {keys.length ? keys.map((k) => {
        const h = W.history[k];
        return (
          <Card key={k} title={h[h.length - 1].name}>
            {h.slice().reverse().map((x, i) => (
              <T key={i} size={13} style={{ paddingVertical: 2 }}>{seasonLabel(x.y)} — {x.w ? teamName(W, x.w) : '—'}</T>
            ))}
          </Card>
        );
      }) : <Empty text="Первые победители появятся в конце сезона." />}
    </Page>
  );
}
