import React from 'react';
import { View, Text } from 'react-native';
import { C, F, Row, T, Rating, Bar, Icon } from './kit';
import { POS_RU, LINE, money, playerValue } from '../engine/util';
import { NATION_BY_CODE } from '../data/nations';

export const LINE_COLOR = { G: '#FFB547', D: '#4C8DFF', M: '#2BD67B', A: '#FF5A6A' };

export function PosBadge({ pos, size = 'md' }) {
  const c = LINE_COLOR[LINE[pos]];
  const w = size === 'sm' ? 30 : 36;
  return (
    <View style={{ width: w, paddingVertical: size === 'sm' ? 2 : 4, borderRadius: 7, backgroundColor: c + '20', borderWidth: 1, borderColor: c + '55', alignItems: 'center' }}>
      <Text style={{ color: c, fontSize: size === 'sm' ? 11 : 13, fontFamily: F.d7 }}>{POS_RU[pos]}</Text>
    </View>
  );
}

function Tag({ icon, text, color }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: color + '1F', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 }}>
      <Icon name={icon} size={10} color={color} />
      {text ? <Text style={{ color, fontSize: 10.5, fontWeight: '800' }}>{text}</Text> : null}
    </View>
  );
}

export default function PlayerRow({ p, onPress, right, sub, W, showClub, selected }) {
  const fitCol = p.fit < 60 ? C.red : p.fit < 75 ? C.orange : C.accent;
  return (
    <Row onPress={onPress} style={[{ paddingVertical: 10 }, selected ? { backgroundColor: C.goldDim, borderRadius: 12, paddingHorizontal: 6, marginHorizontal: -6 } : null]}>
      <PosBadge pos={p.pos} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 13 }}>{NATION_BY_CODE[p.nat]?.flag || '🏳️'}</Text>
          <T bold size={15} numberOfLines={1} style={{ flexShrink: 1 }}>{p.n}</T>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
          <T muted size={12}>{p.age} лет</T>
          {sub ? <T muted size={12} numberOfLines={1}>· {sub}</T> : null}
          {showClub && W ? <T muted size={12} numberOfLines={1} style={{ flexShrink: 1 }}>· {p.club ? W.clubs[p.club]?.name : p.fa ? 'свободный агент' : 'внутр. чемпионат'}</T> : null}
          {p.inj > 0 ? <Tag icon="medkit" text={`${Math.ceil(p.inj / 7)} нед`} color={C.red} /> : null}
          {p.ban > 0 ? <Tag icon="square" text={`${p.ban}`} color={C.red} /> : null}
          {p.listed ? <Tag icon="pricetag" text="продаётся" color={C.gold} /> : null}
          {p.loan ? <Tag icon="repeat" text="аренда" color={C.blue} /> : null}
        </View>
        {!showClub ? <Bar value={p.fit} height={3} color={fitCol} style={{ marginTop: 6, width: 96 }} /> : null}
      </View>
      {right !== undefined ? right : null}
      <Rating v={p.ovr} />
    </Row>
  );
}

export function valueText(p) {
  return money(playerValue(p));
}
