import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { C, F, IconBtn } from './kit';
import { useG } from './ctx';

export default function Page({ title, sub, back, right, children, scroll = true, pad = true, bottomSpace = 40, tabs }) {
  const G = useG();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={s.head}>
        {back ? <IconBtn name="chevron-back" onPress={G.pop} size={38} /> : null}
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={1}>{title}</Text>
          {sub ? <Text style={s.sub} numberOfLines={1}>{sub}</Text> : null}
        </View>
        {right}
      </View>
      {tabs || null}
      {scroll ? (
        <ScrollView contentContainerStyle={pad ? { padding: 14, paddingBottom: bottomSpace } : { paddingBottom: bottomSpace }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, pad && { paddingHorizontal: 14 }]}>{children}</View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 10, backgroundColor: C.bg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  title: { color: C.text, fontSize: 23, fontFamily: F.d8, letterSpacing: 0.3 },
  sub: { color: C.muted, fontSize: 12, marginTop: -1 },
});
