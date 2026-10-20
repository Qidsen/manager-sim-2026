import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ActivityIndicator, ScrollView, Platform, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ctx } from './src/ui/ctx';
import { C, Btn } from './src/ui/kit';
import { saveGame } from './src/storage';
import { seed } from './src/engine/rng';
import TitleScreen from './src/screens/Title';
import NewGameScreen from './src/screens/NewGame';
import HomeScreen from './src/screens/Home';
import SquadScreen from './src/screens/Squad';
import CompsScreen, { CompScreen } from './src/screens/Comps';
import TransfersScreen from './src/screens/Transfers';
import MoreScreen from './src/screens/More';
import PlayerScreen from './src/screens/Player';
import TeamScreen from './src/screens/Team';
import MatchScreen from './src/screens/Match';
import ClubScreen from './src/screens/Club';
import NationScreen, { CallupScreen } from './src/screens/Nation';
import InboxScreen from './src/screens/Inbox';
import CareerScreen, { NewsScreen, HistoryScreen } from './src/screens/Career';
import TacticsScreen from './src/screens/Tactics';
import DatabaseScreen from './src/screens/Database';

const TABS = [
  { key: 'home', label: 'Главная', icon: '🏠' },
  { key: 'squad', label: 'Команда', icon: '👕' },
  { key: 'comps', label: 'Турниры', icon: '🏆' },
  { key: 'transfers', label: 'Трансферы', icon: '💼' },
  { key: 'more', label: 'Ещё', icon: '☰' },
];

const STACK = {
  player: PlayerScreen,
  team: TeamScreen,
  comp: CompScreen,
  match: MatchScreen,
  club: ClubScreen,
  nation: NationScreen,
  callup: CallupScreen,
  inbox: InboxScreen,
  career: CareerScreen,
  news: NewsScreen,
  history: HistoryScreen,
  tactics: TacticsScreen,
  database: DatabaseScreen,
};

export default function App() {
  const [phase, setPhase] = useState('title');
  const [W, setW] = useState(null);
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState('home');
  const [stack, setStack] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(null);
  const saveTimer = useRef(null);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  // Сохранение: не чаще раза в несколько секунд и никогда два одновременно
  const saving = useRef(false);
  const pending = useRef(false);
  const save = useCallback(
    async (now = false) => {
      if (!W) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const run = async () => {
        if (saving.current) { pending.current = true; return; }
        saving.current = true;
        await saveGame(W);
        saving.current = false;
        if (pending.current) { pending.current = false; saveTimer.current = setTimeout(run, 3000); }
      };
      if (now) return run();
      saveTimer.current = setTimeout(run, 4000);
    },
    [W]
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st !== 'active' && W) save(true);
    });
    return () => sub.remove();
  }, [W, save]);

  const G = useMemo(
    () => ({
      W,
      tick,
      refresh,
      save,
      tab,
      setTab: (t) => {
        setStack([]);
        setTab(t);
      },
      push: (name, params = {}) => setStack((s) => [...s, { name, params, key: `${name}-${Date.now()}` }]),
      pop: () => setStack((s) => s.slice(0, -1)),
      replace: (name, params = {}) => setStack((s) => [...s.slice(0, -1), { name, params, key: `${name}-${Date.now()}` }]),
      resetStack: () => setStack([]),
      dialog: (d) => setDialog(d),
      alert: (title, text) => setDialog({ title, text }),
      // тяжёлые вычисления с индикатором
      setBusy,
      run: (label, fn) =>
        new Promise((resolve) => {
          setBusy(label || 'Минутку…');
          setTimeout(() => {
            let r;
            try {
              r = fn();
            } catch (e) {
              console.warn(e);
              setDialog({ title: 'Ошибка', text: String(e?.stack || e) });
            }
            setBusy(null);
            setTick((t) => t + 1);
            resolve(r);
          }, 50);
        }),
      startGame: (world) => {
        if (!world.v || world.v < 2) {
          if (world.user) world.user.autoSubs = true;
          world.v = 2;
        }
        seed(world.rng || 1);
        setW(world);
        setTab('home');
        setStack([]);
        setPhase('game');
        saveGame(world);
      },
      toMenu: async () => {
        if (W) await saveGame(W);
        setStack([]);
        setPhase('title');
        setW(null);
      },
      newGame: () => setPhase('new'),
    }),
    [W, tick, tab, refresh, save]
  );

  let content;
  if (phase === 'title') content = <TitleScreen />;
  else if (phase === 'new') content = <NewGameScreen onBack={() => setPhase('title')} />;
  else {
    const top = stack[stack.length - 1];
    const Screen = top ? STACK[top.name] : null;
    content = (
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          {tab === 'home' && <HomeScreen />}
          {tab === 'squad' && <SquadScreen />}
          {tab === 'comps' && <CompsScreen />}
          {tab === 'transfers' && <TransfersScreen />}
          {tab === 'more' && <MoreScreen />}
          {Screen ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg }]}>
              <Screen key={top.key} {...top.params} />
            </View>
          ) : null}
        </View>
        {!(top && top.name === 'match') && (
          <View style={s.tabbar}>
            {TABS.map((t) => (
              <Pressable key={t.key} style={s.tab} onPress={() => G.setTab(t.key)}>
                <View style={[s.tabIcon, tab === t.key && !top && { backgroundColor: C.accentDim }]}>
                  <Text style={{ fontSize: 17, opacity: tab === t.key && !top ? 1 : 0.6 }}>{t.icon}</Text>
                </View>
                <Text style={[s.tabText, tab === t.key && !top && { color: C.accent }]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Ctx.Provider value={G}>
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={Platform.OS === 'web' ? [] : ['top', 'bottom']}>
          <StatusBar style="light" />
          {content}
        </SafeAreaView>
        <Modal visible={!!dialog} transparent animationType="fade" onRequestClose={() => setDialog(null)}>
          <View style={s.modalWrap}>
            <View style={s.modal}>
              {dialog?.title ? <Text style={s.modalTitle}>{dialog.title}</Text> : null}
              <ScrollView style={{ maxHeight: 380 }}>
                {dialog?.text ? <Text style={s.modalText}>{dialog.text}</Text> : null}
                {dialog?.body || null}
              </ScrollView>
              <View style={{ gap: 8, marginTop: 14 }}>
                {(dialog?.buttons || [{ title: 'ОК' }]).map((b, i) => (
                  <Btn
                    key={i}
                    title={b.title}
                    kind={b.kind || (i === 0 ? 'primary' : 'ghost')}
                    onPress={() => {
                      setDialog(null);
                      b.onPress && b.onPress();
                    }}
                  />
                ))}
              </View>
            </View>
          </View>
        </Modal>
        <Modal visible={!!busy} transparent animationType="fade">
          <View style={s.modalWrap}>
            <View style={[s.modal, { alignItems: 'center', paddingVertical: 28 }]}>
              <ActivityIndicator color={C.accent} size="large" />
              <Text style={[s.modalText, { marginTop: 14 }]}>{busy}</Text>
            </View>
          </View>
        </Modal>
      </Ctx.Provider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  tabbar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, backgroundColor: '#0f1713', paddingTop: 6, paddingBottom: 4 },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  tabIcon: { width: 48, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tabText: { color: C.muted, fontSize: 10, fontWeight: '600' },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: C.card, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: C.line },
  modalTitle: { color: C.text, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  modalText: { color: C.text, fontSize: 15, lineHeight: 21 },
});
