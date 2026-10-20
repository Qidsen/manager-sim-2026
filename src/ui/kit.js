// Дизайн-система Manager Sim 2026: «матчдэй под прожекторами».
// Глубокий ночной фон, золото прожекторов как фирменный акцент, зелёный — победы и рост,
// узкий спортивный шрифт для цифр и заголовков, как в телетрансляциях.
import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export const C = {
  bg: '#0A0F1C',
  bg2: '#0E1526',
  card: '#131B2E',
  card2: '#1B2539',
  card3: '#232F47',
  line: '#26324B',
  text: '#EEF2FA',
  muted: '#8D99B3',
  dim: '#5B6782',
  gold: '#FFB547',
  goldDeep: '#E08A1E',
  accent: '#2BD67B', // зелёный: победы, рост, «в порядке»
  accentDim: 'rgba(43,214,123,0.16)',
  goldDim: 'rgba(255,181,71,0.15)',
  red: '#FF5A6A',
  redDim: 'rgba(255,90,106,0.15)',
  orange: '#FF9447',
  blue: '#4C8DFF',
  blueDim: 'rgba(76,141,255,0.16)',
  pitch: '#0F5132',
  pitch2: '#13603B',
  pitchLine: 'rgba(255,255,255,0.22)',
};

// Узкий шрифт для цифр и заголовков; подгружается в App.js
export const F = {
  d6: 'Oswald_500Medium',
  d7: 'Oswald_600SemiBold',
  d8: 'Oswald_700Bold',
};

export const tap = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};
export const thud = () => {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
};

export function Icon({ name, size = 20, color = C.text, style }) {
  return <Ionicons name={name} size={size} color={color} style={style} />;
}

export function ratingColor(v) {
  if (v >= 85) return C.gold;
  if (v >= 77) return C.accent;
  if (v >= 68) return '#9BE15D';
  if (v >= 58) return C.orange;
  return C.red;
}

// Рейтинг — залитая плашка, как карточка игрока
export function Rating({ v, size = 'md' }) {
  const s = size === 'lg' ? 52 : size === 'sm' ? 30 : 36;
  const col = ratingColor(v);
  return (
    <View style={[st.rating, { width: s, height: s * 0.86, backgroundColor: col + '22', borderColor: col + '88' }]}>
      <Text style={{ color: col, fontFamily: F.d8, fontSize: s * 0.5 }}>{Math.round(v)}</Text>
    </View>
  );
}

export function Card({ children, style, title, right, onPress, icon, pad = true }) {
  const body = (
    <View style={[st.card, !pad && { padding: 0 }, style]}>
      {title ? (
        <View style={[st.cardHead, !pad && { paddingHorizontal: 14, paddingTop: 14 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            {icon ? <Icon name={icon} size={14} color={C.muted} /> : null}
            <Text style={st.cardTitle} numberOfLines={1}>{title}</Text>
          </View>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
  if (onPress)
    return (
      <Pressable onPress={() => { tap(); onPress(); }}>
        {({ pressed }) => <View style={{ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }}>{body}</View>}
      </Pressable>
    );
  return body;
}

export function More({ text = 'Все' }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Text style={{ color: C.gold, fontSize: 12, fontWeight: '700' }}>{text}</Text>
      <Icon name="chevron-forward" size={13} color={C.gold} />
    </View>
  );
}

export function Btn({ title, onPress, kind = 'primary', style, disabled, small, icon }) {
  const fg = kind === 'primary' || kind === 'gold' ? '#1A1206' : kind === 'green' ? '#04210F' : kind === 'danger' ? C.red : C.text;
  const inner = (
    <View style={[st.btnInner, small && st.btnSmall]}>
      {icon ? <Icon name={icon} size={small ? 15 : 18} color={fg} /> : null}
      <Text style={[st.btnText, small && { fontSize: 14 }, { color: fg }]} numberOfLines={1}>{title}</Text>
    </View>
  );
  return (
    <Pressable
      onPress={disabled ? undefined : () => { tap(); onPress && onPress(); }}
      style={({ pressed }) => [{ opacity: disabled ? 0.4 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}
    >
      {kind === 'primary' || kind === 'gold' ? (
        <LinearGradient colors={[C.gold, C.goldDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.btn, small && { borderRadius: 11 }]}>{inner}</LinearGradient>
      ) : (
        <View style={[st.btn, small && { borderRadius: 11 }, kind === 'green' && { backgroundColor: C.accent }, kind === 'ghost' && { backgroundColor: C.card2, borderWidth: 1, borderColor: C.line }, kind === 'danger' && { backgroundColor: C.redDim }]}>{inner}</View>
      )}
    </Pressable>
  );
}

export function IconBtn({ name, onPress, badge, color = C.text, bg = C.card2, size = 42 }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} hitSlop={8} style={({ pressed }) => [{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 }]}>
      <Icon name={name} size={size * 0.48} color={color} />
      {badge ? (
        <View style={st.badgeDot}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
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
          <Pressable key={String(val)} onPress={() => { tap(); onChange(val); }} style={[st.segItem, on && st.segOn]}>
            <Text style={[st.segText, on && { color: '#1A1206', fontWeight: '800' }]} numberOfLines={1}>{label}</Text>
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
          <Pressable key={String(val)} onPress={() => { tap(); onChange(val); }} style={[st.chip, on && st.chipOn]}>
            <Text style={[st.chipText, on && { color: '#1A1206' }]}>{label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Bar({ value, max = 100, color = C.accent, height = 5, style }) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <View style={[{ height, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: height, overflow: 'hidden' }, style]}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color, borderRadius: height }} />
    </View>
  );
}

export function Row({ children, style, onPress }) {
  if (onPress)
    return (
      <Pressable onPress={() => { tap(); onPress(); }} style={({ pressed }) => [st.row, style, pressed && { backgroundColor: 'rgba(255,255,255,0.04)' }]}>
        {children}
      </Pressable>
    );
  return <View style={[st.row, style]}>{children}</View>;
}

export function T({ children, style, muted, bold, size, color, numberOfLines, center, display }) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        { color: color || (muted ? C.muted : C.text), fontSize: size || 15 },
        bold && { fontWeight: '700' },
        display && { fontFamily: F.d7, fontWeight: undefined, letterSpacing: 0.2 },
        center && { textAlign: 'center' },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function H({ children, style }) {
  return <Text style={[st.h, style]}>{children}</Text>;
}

export function Badge({ text, color = C.accent, style, icon }) {
  return (
    <View style={[st.badge, { backgroundColor: color + '22' }, style]}>
      {icon ? <Icon name={icon} size={11} color={color} /> : null}
      <Text style={[st.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

export function Stat({ label, value, color }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ color: color || C.text, fontSize: 22, fontFamily: F.d7 }}>{value}</Text>
      <Text style={{ color: C.muted, fontSize: 11, marginTop: 1, textAlign: 'center' }}>{label}</Text>
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

export function Empty({ text, icon = 'football-outline' }) {
  return (
    <View style={{ padding: 28, alignItems: 'center', gap: 10 }}>
      <Icon name={icon} size={34} color={C.dim} />
      <Text style={{ color: C.muted, textAlign: 'center', lineHeight: 20 }}>{text}</Text>
    </View>
  );
}

export function FormDots({ form }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {form.map((f, i) => (
        <View key={i} style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: f === 'W' ? C.accent : f === 'L' ? C.red : C.dim, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#0A0F1C', fontSize: 9, fontWeight: '900' }}>{f === 'W' ? 'В' : f === 'L' ? 'П' : 'Н'}</Text>
        </View>
      ))}
    </View>
  );
}

export function SectionLabel({ children, style }) {
  return <Text style={[st.section, style]}>{children}</Text>;
}

export const st = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.line },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { color: C.muted, fontSize: 13, fontFamily: F.d7, letterSpacing: 1.2, textTransform: 'uppercase' },
  btn: { borderRadius: 14, backgroundColor: C.card2 },
  btnInner: { flexDirection: 'row', gap: 8, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { paddingVertical: 9, paddingHorizontal: 12 },
  btnText: { fontSize: 16, fontFamily: F.d7, letterSpacing: 0.6 },
  seg: { flexDirection: 'row', backgroundColor: C.bg2, borderRadius: 12, padding: 3, borderWidth: 1, borderColor: C.line },
  segItem: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  segOn: { backgroundColor: C.gold },
  segText: { color: C.muted, fontSize: 13, fontWeight: '600' },
  chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 18, backgroundColor: C.card2, borderWidth: 1, borderColor: C.line },
  chipOn: { backgroundColor: C.gold, borderColor: C.gold },
  chipText: { color: C.text, fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, gap: 11 },
  rating: { borderWidth: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  h: { color: C.text, fontSize: 28, fontFamily: F.d8, marginBottom: 12, letterSpacing: 0.3 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  badgeDot: { position: 'absolute', right: -3, top: -3, backgroundColor: C.red, borderRadius: 9, minWidth: 18, height: 18, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.bg },
  field: { backgroundColor: C.bg2, color: C.text, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, borderWidth: 1, borderColor: C.line },
  section: { color: C.muted, fontSize: 12, fontFamily: F.d7, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 16, marginBottom: 6 },
});
