import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { C, F, T, Card, Btn, Empty, Icon } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import { fmtShort } from '../engine/util';

function iconFor(m) {
  const t = m.title;
  if (m.kind === 'offer' || t.startsWith('Предложение')) return ['cash', C.accent];
  if (t.includes('Травма')) return ['medkit', C.red];
  if (t.includes('восстановился')) return ['fitness', C.accent];
  if (t.includes('Трофей')) return ['trophy', C.gold];
  if (t.includes('академ')) return ['school', C.blue];
  if (t.includes('окно')) return ['swap-horizontal', C.gold];
  if (t.includes('уволен') || t.includes('Финансовые')) return ['warning', C.red];
  if (t.includes('Итоги') || t.includes('задача')) return ['clipboard', C.blue];
  if (t.includes('контракт') || t.includes('Контракт')) return ['document-text', C.orange];
  if (t.includes('перенесён')) return ['calendar', C.orange];
  return ['mail', C.muted];
}

export default function InboxScreen() {
  const G = useG();
  const W = G.W;
  const [open, setOpen] = useState(null);
  return (
    <Page
      title="Почта"
      sub={`${W.inbox.filter((m) => !m.read).length} непрочитанных`}
      back
      right={<Pressable onPress={() => { W.inbox.forEach((m) => (m.read = true)); G.refresh(); }}><T color={C.accent} size={13}>Прочитать все</T></Pressable>}
    >
      {!W.inbox.length ? <Empty text="Писем нет." /> : null}
      {W.inbox.map((m) => {
        const isOpen = open === m.id;
        return (
          <Card key={m.id} onPress={() => { m.read = true; setOpen(isOpen ? null : m.id); G.refresh(); }} style={!m.read ? { borderColor: C.gold + '77' } : null}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: iconFor(m)[1] + '22', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={iconFor(m)[0]} size={17} color={iconFor(m)[1]} />
              </View>
              <T bold={!m.read} size={14} style={{ flex: 1 }} numberOfLines={isOpen ? 3 : 1} color={m.read ? C.muted : C.text}>{m.title}</T>
              <T muted size={11}>{fmtShort(m.y, m.d)}</T>
            </View>
            {isOpen ? (
              <>
                <T size={14} style={{ marginTop: 8, lineHeight: 20 }}>{m.body}</T>
                {m.kind === 'offer' ? <Btn small title="К предложениям" style={{ marginTop: 10 }} onPress={() => G.setTab('transfers')} /> : null}
              </>
            ) : null}
          </Card>
        );
      })}
    </Page>
  );
}
