// Эмблема команды: настоящий логотип клуба или флаг страны / сборной.
import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { teamFlag, isNat } from '../engine/teams';
import { clubLogo, onLogos } from '../logos';

const failed = new Set();

export default function Crest({ W, id, size = 22, style }) {
  const [, setV] = useState(0);
  const [err, setErr] = useState(false);
  useEffect(() => onLogos(setV), []);
  const club = !id || isNat(id) ? null : W.clubs[id];
  const url = club ? clubLogo(club, size > 40 ? 160 : 96) : null;
  if (url && !err && !failed.has(url)) {
    return (
      <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
        <Image
          source={{ uri: url, cache: 'force-cache' }}
          style={{ width: size, height: size }}
          resizeMode="contain"
          onError={() => { failed.add(url); setErr(true); }}
        />
      </View>
    );
  }
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Text style={{ fontSize: Math.round(size * 0.78), lineHeight: Math.round(size * 1.05) }}>{id ? teamFlag(W, id) : ''}</Text>
    </View>
  );
}
