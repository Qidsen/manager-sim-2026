import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { C, Btn, T } from '../ui/kit';
import { useG } from '../ui/ctx';
import { hasSave, loadGame, deleteSave } from '../storage';
import { seasonLabel, fmtDate } from '../engine/util';

export default function TitleScreen() {
  const G = useG();
  const [save, setSave] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const ok = await hasSave();
      if (ok) {
        const w = await loadGame();
        setSave(w);
      }
      setLoading(false);
    })();
  }, []);

  const club = save?.user?.club ? save.clubs[save.user.club]?.name : null;

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', marginBottom: 48 }}>
        <Text style={{ fontSize: 64 }}>⚽</Text>
        <Text style={{ color: C.text, fontSize: 40, fontWeight: '900', letterSpacing: 3, marginTop: 8 }}>MANAGER SIM</Text>
        <Text style={{ color: C.gold, fontSize: 28, fontWeight: '900', letterSpacing: 8, marginTop: 2 }}>2026</Text>
        <Text style={{ color: C.accent, fontSize: 15, fontWeight: '700', letterSpacing: 2, marginTop: 4 }}>ФУТБОЛЬНЫЙ МЕНЕДЖЕР</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={C.accent} />
      ) : (
        <View style={{ gap: 12 }}>
          {save ? (
            <>
              <Btn title="Продолжить карьеру" onPress={() => G.startGame(save)} />
              <T muted center size={13}>
                {save.user?.name} · {club || (save.user?.nation ? 'Сборная' : 'Без клуба')} · {fmtDate(save.year, save.day)} · сезон {seasonLabel(save.year)}
              </T>
            </>
          ) : null}
          <Btn title="Новая игра" kind={save ? 'ghost' : 'primary'} onPress={() => {
            if (save) {
              G.dialog({
                title: 'Начать заново?',
                text: 'Текущее сохранение будет перезаписано после старта новой игры.',
                buttons: [{ title: 'Да, новая игра', onPress: () => G.newGame() }, { title: 'Отмена' }],
              });
            } else G.newGame();
          }} />
          {save ? (
            <Btn title="Удалить сохранение" kind="danger" onPress={() => G.dialog({
              title: 'Удалить сохранение?',
              text: 'Это действие нельзя отменить.',
              buttons: [{ title: 'Удалить', kind: 'danger', onPress: async () => { await deleteSave(); setSave(null); } }, { title: 'Отмена' }],
            })} />
          ) : null}
        </View>
      )}
    </View>
  );
}
