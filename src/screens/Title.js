import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, Btn, T, Icon } from '../ui/kit';
import { useG } from '../ui/ctx';
import { hasSave, loadGame, deleteSave } from '../storage';
import { seasonLabel, fmtDate } from '../engine/util';
import { readUnfinished } from '../diag';

export default function TitleScreen() {
  const G = useG();
  const [save, setSave] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await readUnfinished();
      if (await hasSave()) setSave(await loadGame());
      setLoading(false);
    })();
  }, []);

  const club = save?.user?.club ? save.clubs[save.user.club] : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* свет прожекторов */}
      <LinearGradient colors={['rgba(255,181,71,0.22)', 'rgba(255,181,71,0)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.6 }} style={StyleSheet.absoluteFill} />
      <View style={s.lines}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={[s.stripe, { opacity: i % 2 ? 0.035 : 0.06 }]} />
        ))}
      </View>
      <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', marginBottom: 44 }}>
          <View style={s.ball}>
            <Icon name="football" size={46} color={C.bg} />
          </View>
          <Text style={s.logo}>MANAGER SIM</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={s.rule} />
            <Text style={s.year}>2026</Text>
            <View style={s.rule} />
          </View>
          <Text style={s.tag}>ФУТБОЛЬНЫЙ МЕНЕДЖЕР · КЛУБ И СБОРНАЯ</Text>
        </View>
        {loading ? (
          <ActivityIndicator color={C.gold} />
        ) : (
          <View style={{ gap: 12 }}>
            {save ? (
              <View style={s.saveCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <View style={[s.dot, { backgroundColor: club?.color || C.gold }]} />
                  <View style={{ flex: 1 }}>
                    <T display size={22} numberOfLines={1}>{club ? club.name : save.user?.nation ? 'Сборная' : 'Без клуба'}</T>
                    <T muted size={12}>{save.user?.name} · {fmtDate(save.year, save.day)} · сезон {seasonLabel(save.year)}</T>
                  </View>
                </View>
                <Btn title="Продолжить карьеру" icon="play" onPress={() => G.startGame(save)} />
              </View>
            ) : null}
            <Btn
              title="Новая игра"
              icon="add-circle"
              kind={save ? 'ghost' : 'primary'}
              onPress={() => {
                if (save) {
                  G.dialog({
                    title: 'Начать заново?',
                    text: 'Текущее сохранение будет перезаписано после старта новой игры.',
                    buttons: [{ title: 'Да, новая игра', onPress: () => G.newGame() }, { title: 'Отмена', kind: 'ghost' }],
                  });
                } else G.newGame();
              }}
            />
            {save ? (
              <Btn
                title="Удалить сохранение"
                icon="trash-outline"
                kind="danger"
                small
                onPress={() =>
                  G.dialog({
                    title: 'Удалить сохранение?',
                    text: 'Это действие нельзя отменить.',
                    buttons: [{ title: 'Удалить', kind: 'danger', onPress: async () => { await deleteSave(); setSave(null); } }, { title: 'Отмена', kind: 'ghost' }],
                  })
                }
              />
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  lines: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%', flexDirection: 'column' },
  stripe: { flex: 1, backgroundColor: '#2BD67B' },
  ball: { width: 76, height: 76, borderRadius: 38, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center', marginBottom: 18, shadowColor: C.gold, shadowOpacity: 0.6, shadowRadius: 24, shadowOffset: { width: 0, height: 0 } },
  logo: { color: C.text, fontSize: 50, fontFamily: F.d8, letterSpacing: 2 },
  year: { color: C.gold, fontSize: 30, fontFamily: F.d8, letterSpacing: 10, marginLeft: 10 },
  rule: { width: 42, height: 2, backgroundColor: C.gold, opacity: 0.6 },
  tag: { color: C.muted, fontSize: 12, fontFamily: F.d7, letterSpacing: 2, marginTop: 10 },
  saveCard: { backgroundColor: 'rgba(19,27,46,0.92)', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: C.line },
  dot: { width: 14, height: 44, borderRadius: 4 },
});
