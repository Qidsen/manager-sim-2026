import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C, F, T, Card, Row, Icon } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import { saveGame } from '../storage';

function Item({ icon, color, title, sub, onPress, badge }) {
  return (
    <Row onPress={onPress} style={{ paddingVertical: 12 }}>
      <View style={[s.icon, { backgroundColor: color + '22' }]}>
        <Icon name={icon} size={19} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <T bold size={15}>{title}</T>
        <T muted size={12}>{sub}</T>
      </View>
      {badge ? (
        <View style={s.badge}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{badge}</Text></View>
      ) : null}
      <Icon name="chevron-forward" size={16} color={C.dim} />
    </Row>
  );
}

export default function MoreScreen() {
  const G = useG();
  const W = G.W;
  const u = W.user;
  const unread = W.inbox.filter((m) => !m.read).length;
  return (
    <Page title="Ещё" sub={u.name}>
      <Card title="Управление" icon="briefcase-outline">
        {u.club ? <Item icon="business" color={C.gold} title="Клуб" sub="Финансы, стадион, база, академия" onPress={() => G.push('club')} /> : null}
        <Item icon="flag" color={C.blue} title="Сборная" sub={u.nation ? 'Вызов, тактика, матчи' : 'Вы не тренируете сборную'} onPress={() => G.push('nation')} />
        <Item icon="person" color={C.accent} title="Карьера" sub="Репутация, трофеи, предложения работы" onPress={() => G.push('career')} />
      </Card>
      <Card title="Информация" icon="information-circle-outline">
        <Item icon="mail" color={C.orange} title="Почта" sub="Сообщения и предложения" badge={unread} onPress={() => G.push('inbox')} />
        <Item icon="newspaper" color={C.blue} title="Новости" sub="Трансферы и победители" onPress={() => G.push('news')} />
        <Item icon="trophy" color={C.gold} title="История турниров" sub="Все чемпионы по сезонам" onPress={() => G.push('history')} />
        <Item icon="server" color={C.accent} title="База игроков" sub="Реальные составы и свой файл" onPress={() => G.push('database')} />
      </Card>
      <Card title="Игра" icon="game-controller-outline">
        <Item icon="save" color={C.muted} title="Сохранить" sub="Игра сохраняется сама, но можно и вручную" onPress={async () => { await saveGame(W); G.alert('Сохранено', 'Прогресс записан.'); }} />
        <Item icon="exit" color={C.red} title="В главное меню" sub="С сохранением" onPress={() => G.toMenu()} />
      </Card>
      <Text style={s.ver}>MANAGER SIM 2026 · ВЕРСИЯ 1.1</Text>
    </Page>
  );
}

const s = StyleSheet.create({
  icon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  badge: { backgroundColor: C.red, borderRadius: 10, minWidth: 20, height: 20, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  ver: { color: C.dim, fontFamily: F.d7, fontSize: 12, letterSpacing: 1.5, textAlign: 'center', marginTop: 4 },
});
