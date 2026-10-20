import React from 'react';
import { View, Text } from 'react-native';
import { C, T, Card, Row } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import { saveGame } from '../storage';

export default function MoreScreen() {
  const G = useG();
  const W = G.W;
  const u = W.user;
  const unread = W.inbox.filter((m) => !m.read).length;
  const items = [
    u.club && ['🏟️', 'Клуб', 'Финансы, стадион, база, академия', () => G.push('club')],
    ['🌍', 'Сборная', u.nation ? 'Вызов, тактика, матчи' : 'Вы не тренируете сборную', () => G.push('nation')],
    ['✉️', `Почта${unread ? ` (${unread})` : ''}`, 'Сообщения и предложения', () => G.push('inbox')],
    ['📰', 'Новости', 'Трансферы и победители', () => G.push('news')],
    ['👔', 'Карьера', 'Репутация, трофеи, предложения работы', () => G.push('career')],
    ['📜', 'История турниров', 'Все чемпионы по сезонам', () => G.push('history')],
    ['💾', 'Сохранить', 'Игра сохраняется сама, но можно и вручную', async () => { await saveGame(W); G.alert('Сохранено', 'Прогресс записан.'); }],
    ['🚪', 'В главное меню', 'С сохранением', () => G.toMenu()],
  ].filter(Boolean);
  return (
    <Page title="Ещё">
      <Card>
        {items.map(([icon, title, sub, fn]) => (
          <Row key={title} onPress={fn}>
            <Text style={{ fontSize: 22, width: 32 }}>{icon}</Text>
            <View style={{ flex: 1 }}>
              <T bold>{title}</T>
              <T muted size={12}>{sub}</T>
            </View>
            <T muted>›</T>
          </Row>
        ))}
      </Card>
      <T muted size={11} center>Manager Sim 2026 · версия 1.0</T>
    </Page>
  );
}
