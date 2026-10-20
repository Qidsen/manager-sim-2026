// Пресс-конференция и неожиданные события: выбор ответа влияет на мораль, правление и фанатов.
import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { C, F, T, Card, Btn, Icon, Empty, tap } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import { answerPress, skipPress, resolveEvent, managerStyle } from '../engine/stories';

function Option({ text, onPress, i }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card2, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.line, marginBottom: 8 }, pressed && { borderColor: C.gold, opacity: 0.85 }]}>
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.goldDim, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.gold, fontFamily: F.d8, fontSize: 13 }}>{String.fromCharCode(1040 + i)}</Text>
      </View>
      <T size={14} style={{ flex: 1, lineHeight: 19 }}>{text}</T>
    </Pressable>
  );
}

export function PressScreen() {
  const G = useG();
  const W = G.W;
  const [note, setNote] = useState(null);
  const pr = W.press;
  const style = managerStyle(W.user);
  if (!pr) {
    return (
      <Page title="Пресс-конференция" back>
        {note ? <Card style={{ borderColor: C.accent + '55' }}><T size={13}>Итог: {note}</T></Card> : null}
        <Empty text="Журналисты разошлись. Следующая пресс-конференция — после важного матча." icon="mic-outline" />
        <Card title="Ваш образ в прессе" icon="person-circle-outline">
          <T bold size={16} color={C.gold}>{style.ru}</T>
          <T muted size={13} style={{ marginTop: 4 }}>{style.d}</T>
        </Card>
      </Page>
    );
  }
  const q = pr.qs[pr.i];
  return (
    <Page title="Пресс-конференция" sub={pr.title} back>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
        {pr.qs.map((_, i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < pr.i ? C.accent : i === pr.i ? C.gold : C.line }} />)}
      </View>
      {note ? <T size={12} color={C.accent} style={{ marginBottom: 8 }}>Итог прошлого ответа: {note}</T> : null}
      <Card>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Icon name="mic" size={22} color={C.gold} />
          <T size={16} bold style={{ flex: 1, lineHeight: 22 }}>{q.q}</T>
        </View>
      </Card>
      {q.opts.map((o, i) => (
        <Option key={i} i={i} text={o.t} onPress={() => { const n = answerPress(W, i); setNote(n || 'без последствий'); G.refresh(); G.save(); }} />
      ))}
      <Btn title="Уйти без ответа" kind="ghost" small style={{ marginTop: 6 }} onPress={() => { skipPress(W); G.refresh(); G.pop(); }} />
      <T muted size={11} center style={{ marginTop: 8 }}>Игнор прессы немного злит правление и фанатов.</T>
    </Page>
  );
}

export function EventsScreen() {
  const G = useG();
  const W = G.W;
  const [res, setRes] = useState(null);
  const list = W.events || [];
  return (
    <Page title="События" sub="Решения тренера" back>
      {res ? (
        <Card style={{ borderColor: C.accent + '55', backgroundColor: C.accentDim }}>
          <T size={14}>{res}</T>
        </Card>
      ) : null}
      {list.length ? list.map((ev) => (
        <Card key={ev.id} title={ev.title} icon="flash-outline">
          <T size={14} style={{ lineHeight: 20, marginBottom: 12 }}>{ev.text}</T>
          {ev.opts.map((o, i) => (
            <Option key={o.k} i={i} text={o.t} onPress={() => {
              const r = resolveEvent(W, ev.id, o.k);
              setRes(r);
              G.refresh();
              G.save();
              if (W._openRenew) { const pid = W._openRenew; W._openRenew = null; G.push('negotiate', { pid, kind: 'renew' }); }
            }} />
          ))}
        </Card>
      )) : <Empty text="Сейчас ничего не требует вашего решения." icon="checkmark-done-outline" />}
    </Page>
  );
}
