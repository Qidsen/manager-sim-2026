// Правление: цели на сезон, прогресс и надёжность положения тренера.
import React from 'react';
import { View, Text } from 'react-native';
import { C, F, T, Card, Bar, Icon, Empty } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import { evalObjective, jobSecurity, IMP, IMP_COLOR, CAT, makeObjectives } from '../engine/board';
import { seasonLabel } from '../engine/util';

const STATE = {
  done: ['Выполнено', '#2BD67B', 'checkmark-circle'],
  ok: ['По графику', '#4C8DFF', 'trending-up'],
  risk: ['Под угрозой', '#FF9F43', 'alert-circle'],
  fail: ['Провал', '#FF5A6A', 'close-circle'],
  wait: ['Впереди', '#6B768C', 'time'],
};

export default function BoardScreen() {
  const G = useG();
  const W = G.W;
  const u = W.user;
  if (!u.club) return <Page title="Правление" back><Empty text="Правление есть только у тренера клуба." /></Page>;
  if (!u.objs?.length) makeObjectives(W);
  const c = W.clubs[u.club];
  const js = jobSecurity(u.conf);
  const fans = Math.round(u.fans ?? 60);
  return (
    <Page title="Правление" sub={`${c.name} · сезон ${seasonLabel(W.year)}`} back>
      <Card>
        <T muted size={11}>НАДЁЖНОСТЬ ПОЛОЖЕНИЯ</T>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ color: js.color, fontFamily: F.d8, fontSize: 26 }}>{js.ru}</Text>
          <Text style={{ color: js.color, fontFamily: F.d8, fontSize: 22 }}>{Math.round(u.conf)}%</Text>
        </View>
        <Bar value={u.conf} color={js.color} height={8} style={{ marginTop: 8 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
          <T muted size={12}>Настроение фанатов</T>
          <T size={12} bold color={fans >= 60 ? C.accent : fans >= 35 ? C.orange : C.red}>{fans >= 75 ? 'восторг' : fans >= 55 ? 'довольны' : fans >= 35 ? 'ворчат' : 'требуют перемен'} · {fans}%</T>
        </View>
        <Bar value={fans} color={fans >= 60 ? C.accent : fans >= 35 ? C.orange : C.red} height={5} style={{ marginTop: 4 }} />
        <T muted size={11} style={{ marginTop: 10 }}>Доверие растёт от выполненных целей и побед. Если оно упадёт до нуля — вас уволят.</T>
      </Card>
      {u.objs.map((o, i) => {
        const e = evalObjective(W, o);
        const [lbl, col, ic] = STATE[e.state];
        return (
          <Card key={i}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Icon name={CAT[o.cat].icon} size={15} color={C.muted} />
              <T muted size={12} style={{ flex: 1 }}>{CAT[o.cat].ru.toUpperCase()}</T>
              <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: IMP_COLOR[o.imp] + '26' }}>
                <Text style={{ color: IMP_COLOR[o.imp], fontSize: 11, fontWeight: '800' }}>{IMP[o.imp].toUpperCase()}</Text>
              </View>
            </View>
            <T bold size={15}>{o.text}</T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <Icon name={ic} size={16} color={col} />
              <T size={13} color={col} bold>{lbl}</T>
              <T muted size={13}>· {e.prog}</T>
            </View>
          </Card>
        );
      })}
    </Page>
  );
}
