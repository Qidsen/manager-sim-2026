import React from 'react';
import { View, Text } from 'react-native';
import { C, Row, T, Rating, Bar } from './kit';
import { POS_RU, LINE, money, playerValue } from '../engine/util';
import { NATION_BY_CODE } from '../data/nations';

const POS_COLOR = { G: '#ffb020', D: '#4da3ff', M: '#3ddc84', A: '#ff5f5f' };

export function PosBadge({ pos }) {
  const c = POS_COLOR[LINE[pos]];
  return (
    <View style={{ width: 34, paddingVertical: 3, borderRadius: 6, backgroundColor: c + '22', alignItems: 'center' }}>
      <Text style={{ color: c, fontSize: 12, fontWeight: '800' }}>{POS_RU[pos]}</Text>
    </View>
  );
}

export default function PlayerRow({ p, onPress, right, sub, W, showClub, selected }) {
  const tags = [];
  if (p.inj > 0) tags.push(`🚑 ${Math.ceil(p.inj / 7)} нед.`);
  if (p.ban > 0) tags.push(`🟥 ${p.ban}`);
  if (p.listed) tags.push('📋');
  if (p.loan) tags.push('🔁 аренда');
  return (
    <Row onPress={onPress} style={selected ? { backgroundColor: C.accentDim } : null}>
      <PosBadge pos={p.pos} />
      <View style={{ flex: 1 }}>
        <T bold size={14} numberOfLines={1}>
          {NATION_BY_CODE[p.nat]?.flag} {p.n}
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <T muted size={12}>{p.age} л.</T>
          {sub ? <T muted size={12} numberOfLines={1} style={{ flexShrink: 1 }}>{sub}</T> : null}
          {showClub && W ? <T muted size={12} numberOfLines={1} style={{ flexShrink: 1 }}>{p.club ? W.clubs[p.club]?.name : p.fa ? 'свободный агент' : 'внутр. чемпионат'}</T> : null}
          {tags.length ? <T size={12} color={C.orange}>{tags.join(' ')}</T> : null}
        </View>
        {!showClub ? <Bar value={p.fit} height={3} color={p.fit < 70 ? C.orange : C.accent} style={{ marginTop: 5, width: 90 }} /> : null}
      </View>
      {right !== undefined ? right : null}
      <Rating v={p.ovr} />
    </Row>
  );
}

export function valueText(p) {
  return money(playerValue(p));
}
