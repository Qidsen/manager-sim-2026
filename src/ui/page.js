import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { C } from './kit';
import { useG } from './ctx';

export default function Page({ title, sub, back, right, children, scroll = true, pad = true }) {
  const G = useG();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={s.head}>
        {back ? (
          <Pressable onPress={G.pop} hitSlop={12} style={{ paddingRight: 10 }}>
            <Text style={{ color: C.accent, fontSize: 26, lineHeight: 28 }}>‹</Text>
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={1}>{title}</Text>
          {sub ? <Text style={s.sub} numberOfLines={1}>{sub}</Text> : null}
        </View>
        {right}
      </View>
      {scroll ? (
        <ScrollView contentContainerStyle={pad ? { padding: 14, paddingBottom: 40 } : null} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, pad && { paddingHorizontal: 14 }]}>{children}</View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  title: { color: C.text, fontSize: 19, fontWeight: '800' },
  sub: { color: C.muted, fontSize: 12, marginTop: 1 },
});
