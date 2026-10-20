import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView, Platform, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ctx } from './src/ui/ctx';
import { C, F, Btn, Icon, tap } from './src/ui/kit';
import { useFonts } from 'expo-font';
import { repairSchedule } from './src/engine/sim';
import { logError } from './src/diag';
import DiagScreen from './src/screens/Diag';
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
  { key: 'home', label: 'Главная', icon: 'home' },
  { key: 'squad', label: 'Команда', icon: 'shirt' },
  { key: 'comps', label: 'Турниры', icon: 'trophy' },
  { key: 'transfers', label: 'Трансферы', icon: 'swap-horizontal' },
  { key: 'more', label: 'Ещё', icon: 'grid' },
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
  diag: DiagScreen,
};

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Oswald_500Medium: require('@expo-google-fonts/oswald/500Medium/Oswald_500Medium.ttf'),
    Oswald_600SemiBold: require('@expo-google-fonts/oswald/600SemiBold/Oswald_600SemiBold.ttf'),
    Oswald_700Bold: require('@expo-google-fonts/oswald/700Bold/Oswald_700Bold.ttf'),
  });
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
        try {
          const moved = repairSchedule(world);
          if (moved) console.log('перенесено матчей', moved);
        } catch (e) {
          console.warn(e);
          logError(world, 'repair', e);
        }
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
            {TABS.map((t) => {
              const on = tab === t.key && !top;
              return (
                <Pressable key={t.key} style={s.tab} onPress={() => { tap(); G.setTab(t.key); }}>
                  <View style={[s.tabIcon, on && { backgroundColor: C.goldDim }]}>
                    <Icon name={on ? t.icon : `${t.icon}-outline`} size={21} color={on ? C.gold : C.muted} />
                  </View>
                  <Text style={[s.tabText, on && { color: C.gold }]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    );
  }

  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.gold} /></View>;
  }

  return (
    <SafeAreaProvider>
      <Ctx.Provider value={G}>
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={Platform.OS === 'web' ? [] : ['top', 'bottom']}>
          <StatusBar style="light" />
          {content}
        </SafeAreaView>
        {/* Окна поверх экрана — обычные слои, без системных Modal (на iOS два Modal подряд могут заблокировать экран) */}
        {busy ? (
          <View style={[StyleSheet.absoluteFill, s.modalWrap, { zIndex: 50 }]} pointerEvents="auto">
            <View style={[s.modal, { alignItems: 'center', paddingVertical: 28 }]}>
              <ActivityIndicator color={C.gold} size="large" />
              <Text style={[s.modalText, { marginTop: 14 }]}>{busy}</Text>
            </View>
          </View>
        ) : null}
        {dialog && !busy ? (
          <View style={[StyleSheet.absoluteFill, s.modalWrap, { zIndex: 40 }]}>
            <View style={s.modal}>
              {dialog.title ? <Text style={s.modalTitle}>{dialog.title}</Text> : null}
              <ScrollView style={{ maxHeight: 380 }}>
                {dialog.text ? <Text style={s.modalText}>{dialog.text}</Text> : null}
                {dialog.body || null}
              </ScrollView>
              <View style={{ gap: 8, marginTop: 14 }}>
                {(dialog.buttons || [{ title: 'ОК' }]).map((b, i) => (
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
        ) : null}
      </Ctx.Provider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  tabbar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, backgroundColor: '#0B1120', paddingTop: 7, paddingBottom: 3 },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  tabIcon: { width: 54, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  tabText: { color: C.muted, fontSize: 10.5, fontWeight: '700' },
  modalWrap: { flex: 1, backgroundColor: 'rgba(3,6,14,0.72)', justifyContent: 'center', padding: 22 },
  modal: { backgroundColor: C.card, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: C.line },
  modalTitle: { color: C.text, fontSize: 22, fontFamily: F.d8, marginBottom: 8, letterSpacing: 0.3 },
  modalText: { color: C.text, fontSize: 15, lineHeight: 22 },
});
