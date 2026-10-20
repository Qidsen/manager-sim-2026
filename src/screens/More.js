import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { C, F, T, Icon, tap } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import { saveGame } from '../storage';
import { money } from '../engine/util';
import { NATION_BY_CODE } from '../data/nations';

function Tile({ icon, color, title, sub, onPress, badge, wide }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} style={({ pressed }) => [s.tile, wide && { flexBasis: '100%' }, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={[s.icon, { backgroundColor: color + '22' }]}>
          <Icon name={icon} size={20} color={color} />
        </View>
        {badge ? <View style={s.badge}><Text style={s.badgeT}>{badge}</Text></View> : null}
      </View>
      <Text style={s.title} numberOfLines={1}>{title}</Text>
      <T muted size={11} numberOfLines={2} style={{ lineHeight: 15 }}>{sub}</T>
    </Pressable>
  );
}

function Group({ title, children }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.group}>{title}</Text>
      <View style={s.grid}>{children}</View>
    </View>
  );
}

export default function OfficeScreen() {
  const G = useG();
  const W = G.W;
  const u = W.user;
  const club = u.club ? W.clubs[u.club] : null;
  const unread = W.inbox.filter((m) => !m.read).length;
  const offers = W.offers.filter((o) => club && W.players[o.pid]?.club === club.id).length;
  return (
    <Page title="Офис" sub={`${u.name}${club ? ` · ${club.name}` : ''}`}>
      <Group title="Сообщения">
        <Tile icon="mail" color={C.orange} title="Почта" sub={unread ? `${unread} непрочитанных` : 'Всё прочитано'} badge={unread} onPress={() => G.push('inbox')} />
        <Tile icon="newspaper" color={C.blue} title="Новости" sub="Трансферы, победители, события" onPress={() => G.push('news')} />
        {club ? <Tile wide icon="pricetags" color={C.orange} title="Предложения за игроков" sub={offers ? `${offers} от других клубов — ответьте в «Трансферах»` : 'Новых предложений нет'} badge={offers} onPress={() => G.setTab('transfers')} /> : null}
      </Group>
      {club ? (
        <Group title="Клуб">
          <Tile icon="wallet" color={C.accent} title="Финансы" sub={`Баланс ${money(club.balance)}`} onPress={() => G.push('club', { tab: 'fin' })} />
          <Tile icon="business" color={C.gold} title="Стадион" sub={`${club.stadium.cap.toLocaleString('ru-RU')} мест · билеты`} onPress={() => G.push('club', { tab: 'stadium' })} />
          <Tile icon="barbell" color={C.red} title="База и персонал" sub="Тренировки, врачи, скауты" onPress={() => G.push('club', { tab: 'train' })} />
          <Tile icon="school" color={C.blue} title="Академия" sub={`${club.academy.length} воспитанников`} onPress={() => G.push('club', { tab: 'academy' })} />
        </Group>
      ) : null}
      <Group title="Карьера">
        <Tile icon="flag" color={C.blue} title="Сборная" sub={u.nation ? `${NATION_BY_CODE[u.nation].flag} ${NATION_BY_CODE[u.nation].name}` : 'Не тренируете'} onPress={() => G.push('nation')} />
        <Tile icon="person" color={C.accent} title="Карьера" sub={`Репутация ${Math.round(u.rep)} · трофеев ${u.trophies.length}`} badge={W.jobOffers.length} onPress={() => G.push('career')} />
      </Group>
      <Group title="Игра">
        <Tile icon="server" color={C.accent} title="База игроков" sub="Реальные составы, свой файл" onPress={() => G.push('database')} />
        <Tile icon="pulse" color={C.red} title="Диагностика" sub="Проверка сохранения" onPress={() => G.push('diag')} />
        <Tile icon="save" color={C.muted} title="Сохранить" sub="Сохраняется и само" onPress={async () => { await saveGame(W); G.alert('Сохранено', 'Прогресс записан.'); }} />
        <Tile icon="exit" color={C.red} title="Главное меню" sub="С сохранением" onPress={() => G.toMenu()} />
      </Group>
      <Text style={s.ver}>MANAGER SIM 2026 · ВЕРСИЯ 1.6</Text>
    </Page>
  );
}

const s = StyleSheet.create({
  group: { color: C.muted, fontFamily: F.d7, fontSize: 12, letterSpacing: 1.4, marginBottom: 8, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexBasis: '47%', flexGrow: 1, backgroundColor: C.card, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: C.line, gap: 4, minHeight: 104 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  title: { color: C.text, fontFamily: F.d7, fontSize: 17 },
  badge: { backgroundColor: C.red, borderRadius: 10, minWidth: 20, height: 20, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  badgeT: { color: '#fff', fontSize: 11, fontWeight: '800' },
  ver: { color: C.dim, fontFamily: F.d7, fontSize: 12, letterSpacing: 1.5, textAlign: 'center', marginTop: 4 },
});
