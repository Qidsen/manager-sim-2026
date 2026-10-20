// Общие компоненты интерфейса
import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput } from 'react-native';

export const C = {
  bg: '#0c120f',
  card: '#151e19',
  card2: '#1b2620',
  line: '#26332b',
  text: '#e9f1eb',
  muted: '#8ea096',
  dim: '#5d6e64',
  accent: '#3ddc84',
  accentDim: '#1f6b43',
  gold: '#ffc845',
  red: '#ff5f5f',
  orange: '#ff9f43',
  blue: '#4da3ff',
  pitch: '#14532d',
  pitchLine: '#2f7d4c',
};

export function ratingColor(v) {
  if (v >= 85) return C.gold;
  if (v >= 77) return C.accent;
  if (v >= 68) return '#a3e05a';
  if (v >= 58) return C.orange;
  return C.red;
}

export function Rating({ v, size = 'md' }) {
  const s = size === 'lg' ? 40 : size === 'sm' ? 26 : 32;
  return (
    <View style={[st.rating, { width: s, height: s * 0.8, borderColor: ratingColor(v) }]}>
      <Text style={[st.ratingText, { color: ratingColor(v), fontSize: s * 0.42 }]}>{Math.round(v)}</Text>
    </View>
  );
}

export function Card({ children, style, title, right, onPress }) {
  const body = (
    <View style={[st.card, style]}>
      {title ? (
        <View style={st.cardHead}>
          <Text style={st.cardTitle}>{title}</Text>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
  if (onPress) return <Pressable onPress={onPress}>{({ pressed }) => <View style={{ opacity: pressed ? 0.75 : 1 }}>{body}</View>}</Pressable>;
  return body;
}

export function Btn({ title, onPress, kind = 'primary', style, disabled, small, icon }) {
  const bg = kind === 'primary' ? C.accent : kind === 'danger' ? '#3a1a1a' : kind === 'gold' ? C.gold : C.card2;
  const fg = kind === 'primary' || kind === 'gold' ? '#06210f' : kind === 'danger' ? C.red : C.text;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [st.btn, small && st.btnSmall, { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 }, kind === 'ghost' && { borderWidth: 1, borderColor: C.line }, style]}
    >
      <Text style={[st.btnText, small && { fontSize: 13 }, { color: fg }]}>{icon ? `${icon}  ` : ''}{title}</Text>
    </Pressable>
  );
}

export function Seg({ options, value, onChange, style }) {
  return (
    <View style={[st.seg, style]}>
      {options.map((o) => {
        const val = typeof o === 'object' ? o.value : o;
        const label = typeof o === 'object' ? o.label : o;
        const on = val === value;
        return (
          <Pressable key={String(val)} onPress={() => onChange(val)} style={[st.segItem, on && st.segOn]}>
            <Text style={[st.segText, on && { color: '#06210f', fontWeight: '700' }]} numberOfLines={1}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chips({ options, value, onChange, style }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={style} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
      {options.map((o) => {
        const val = typeof o === 'object' ? o.value : o;
        const label = typeof o === 'object' ? o.label : o;
        const on = val === value;
        return (
          <Pressable key={String(val)} onPress={() => onChange(val)} style={[st.chip, on && st.chipOn]}>
            <Text style={[st.chipText, on && { color: '#06210f' }]}>{label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Bar({ value, max = 100, color = C.accent, height = 5, style }) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <View style={[{ height, backgroundColor: C.line, borderRadius: height, overflow: 'hidden' }, style]}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color }} />
    </View>
  );
}

export function Row({ children, style, onPress }) {
  if (onPress)
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [st.row, style, pressed && { backgroundColor: C.card2 }]}>
        {children}
      </Pressable>
    );
  return <View style={[st.row, style]}>{children}</View>;
}

export function T({ children, style, muted, bold, size, color, numberOfLines, center }) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[{ color: color || (muted ? C.muted : C.text), fontSize: size || 15 }, bold && { fontWeight: '700' }, center && { textAlign: 'center' }, style]}
    >
      {children}
    </Text>
  );
}

export function H({ children, style }) {
  return <Text style={[st.h, style]}>{children}</Text>;
}

export function Badge({ text, color = C.accent, style }) {
  return (
    <View style={[st.badge, { borderColor: color }, style]}>
      <Text style={[st.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

export function Stat({ label, value, color }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ color: color || C.text, fontSize: 18, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: C.muted, fontSize: 11, marginTop: 2, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

export function Field({ value, onChangeText, placeholder, keyboardType, style }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.dim}
      keyboardType={keyboardType}
      style={[st.field, style]}
    />
  );
}

export function Empty({ text }) {
  return (
    <View style={{ padding: 24, alignItems: 'center' }}>
      <Text style={{ color: C.muted, textAlign: 'center' }}>{text}</Text>
    </View>
  );
}

export function FormDots({ form }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {form.map((f, i) => (
        <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: f === 'W' ? C.accent : f === 'L' ? C.red : C.muted }} />
      ))}
    </View>
  );
}

export const st = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.line },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { color: C.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  btn: { paddingVertical: 13, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  btnText: { fontSize: 15, fontWeight: '700' },
  seg: { flexDirection: 'row', backgroundColor: C.card2, borderRadius: 10, padding: 3 },
  segItem: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segOn: { backgroundColor: C.accent },
  segText: { color: C.muted, fontSize: 13 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: C.card2, borderWidth: 1, borderColor: C.line },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { color: C.text, fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, gap: 10 },
  rating: { borderWidth: 1.5, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  ratingText: { fontWeight: '800' },
  h: { color: C.text, fontSize: 22, fontWeight: '800', marginBottom: 12 },
  badge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  field: { backgroundColor: C.card2, color: C.text, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, borderWidth: 1, borderColor: C.line },
});
