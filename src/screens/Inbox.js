import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { C, T, Card, Btn, Empty } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import { fmtShort } from '../engine/util';

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
          <Card key={m.id} onPress={() => { m.read = true; setOpen(isOpen ? null : m.id); G.refresh(); }} style={!m.read ? { borderColor: C.accent } : null}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <T bold={!m.read} size={14} style={{ flex: 1 }} numberOfLines={isOpen ? 3 : 1}>{m.title}</T>
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
