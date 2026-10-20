import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, Pressable, Text } from 'react-native';
import { C, Btn, T, Card, Row, Chips, Field, H, Icon } from '../ui/kit';
import { useG } from '../ui/ctx';
import { LEAGUES } from '../data/leagues';
import { NATIONS, NATION_BY_CODE, CONF_NAMES } from '../data/nations';
import { createWorld } from '../engine/gen';
import { newGame } from '../engine/sim';
import { money } from '../engine/util';
import { Seg } from '../ui/kit';
import { REAL_SQUADS } from '../data/realSquads';
import { loadCustomSquads, importSquadsFromFile, squadsStats } from '../squadsDb';

const stars = (rep) => '★'.repeat(Math.max(1, Math.min(5, Math.round((rep - 50) / 9)))) ;

export default function NewGameScreen({ onBack }) {
  const G = useG();
  const [mode, setMode] = useState(null);
  const [league, setLeague] = useState(null);
  const [club, setClub] = useState(null); // индекс клуба
  const [conf, setConf] = useState('UEFA');
  const [nation, setNation] = useState(null);
  const [name, setName] = useState('');
  const [step, setStep] = useState(0);
  const [base, setBase] = useState('real');
  const [custom, setCustom] = useState(null);
  useEffect(() => {
    loadCustomSquads().then((c) => { if (c) { setCustom(c); setBase('custom'); } });
  }, []);

  const clubIndex = useMemo(() => {
    const out = {};
    let i = 0;
    for (const L of LEAGUES) {
      out[L.id] = i;
      i += L.clubs.length;
    }
    return out;
  }, []);

  const needClub = mode === 'club' || mode === 'both';
  const needNation = mode === 'nation' || mode === 'both';

  const start = () => {
    G.run('Создаём футбольный мир…', () => {
      const squads = base === 'custom' && custom ? { ...REAL_SQUADS, ...custom } : base === 'real' ? REAL_SQUADS : null;
      const W = createWorld(Math.floor(Math.random() * 1e9), 2026, squads);
      const clubId = needClub ? `c${clubIndex[league] + club}` : null;
      newGame(W, { club: clubId, nation: needNation ? nation : null, name: name.trim() || 'Тренер' });
      return W;
    }).then((W) => W && G.startGame(W));
  };

  const back = () => {
    if (step === 0) return onBack();
    if (step === 1 && needClub && league) return setLeague(null);
    if (step === 3) return setStep(needNation ? 2 : 1);
    if (step === 2) return setStep(needClub ? 1 : 0);
    setStep(0);
  };

  let body;
  if (step === 0) {
    body = (
      <View style={{ gap: 12 }}>
        <H>Режим карьеры</H>
        {[
          ['club', 'business', C.gold, 'Клуб', 'Состав, тактика, трансферы, финансы, стадион и академия.'],
          ['nation', 'flag', C.blue, 'Сборная', 'Вызовы, отборы, Лига наций, Евро, Кубок мира и другие турниры.'],
          ['both', 'star', C.accent, 'Клуб + сборная', 'Совмещайте обе должности, как настоящие тренеры-совместители.'],
        ].map(([k, icon, col, t, d]) => (
          <Card key={k} onPress={() => { setMode(k); setStep(1); }} style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: col + '22', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={icon} size={24} color={col} />
              </View>
              <View style={{ flex: 1 }}>
                <T display size={24}>{t}</T>
                <T muted size={13} style={{ marginTop: 2, lineHeight: 18 }}>{d}</T>
              </View>
              <Icon name="chevron-forward" size={18} color={C.dim} />
            </View>
          </Card>
        ))}
      </View>
    );
  } else if (step === 1 && needClub && !league) {
    body = (
      <View>
        <H>Выберите лигу</H>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {LEAGUES.map((L) => (
            <Pressable key={L.id} onPress={() => setLeague(L.id)} style={({ pressed }) => [{ flexBasis: '47%', flexGrow: 1, backgroundColor: C.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: C.line }, pressed && { opacity: 0.8 }]}>
              <Text style={{ fontSize: 28 }}>{NATION_BY_CODE[L.country]?.flag}</Text>
              <T display size={17} numberOfLines={1} style={{ marginTop: 6 }}>{L.name}</T>
              <T muted size={11}>{NATION_BY_CODE[L.country]?.name} · {L.clubs.length} клубов</T>
            </Pressable>
          ))}
        </View>
      </View>
    );
  } else if (step === 1 && needClub) {
    const L = LEAGUES.find((l) => l.id === league);
    const list = L.clubs.map((c, i) => ({ c, i })).sort((a, b) => b.c[2] - a.c[2]);
    body = (
      <View>
        <Pressable onPress={() => setLeague(null)}><T color={C.gold} bold style={{ marginBottom: 8 }}>‹ Другая лига</T></Pressable>
        <H>{L.name}</H>
        {list.map(({ c, i }) => (
          <Row key={i} onPress={() => { setClub(i); setStep(needNation ? 2 : 3); }} style={club === i ? { backgroundColor: C.card2 } : null}>
            <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: c[2] >= 85 ? C.gold : c[2] >= 75 ? C.accent : c[2] >= 65 ? C.blue : C.dim }} />
            <View style={{ flex: 1 }}>
              <T bold>{c[0]}</T>
              <T muted size={12}>Бюджет ~{money(Math.max(2e6, (c[2] - 45) ** 2 * 50000))} · стадион {c[3]} тыс.</T>
            </View>
            <T color={C.gold}>{stars(c[2])}</T>
          </Row>
        ))}
      </View>
    );
  } else if ((step === 1 && !needClub) || step === 2) {
    const list = NATIONS.filter((n) => n.conf === conf).sort((a, b) => b.str - a.str);
    body = (
      <View>
        <H>Выберите сборную</H>
        <Chips options={Object.keys(CONF_NAMES).map((k) => ({ value: k, label: CONF_NAMES[k] }))} value={conf} onChange={setConf} style={{ marginBottom: 10 }} />
        {list.map((n) => (
          <Row key={n.code} onPress={() => { setNation(n.code); setStep(3); }}>
            <Text style={{ fontSize: 22 }}>{n.flag}</Text>
            <View style={{ flex: 1 }}><T bold>{n.name}</T></View>
            <T color={C.gold}>{stars(n.str)}</T>
          </Row>
        ))}
      </View>
    );
  } else {
    const L = league ? LEAGUES.find((l) => l.id === league) : null;
    body = (
      <View style={{ gap: 12 }}>
        <H>Последний шаг</H>
        <T muted>Как вас зовут?</T>
        <Field value={name} onChangeText={setName} placeholder="Имя тренера" />
        <Card title="Ваша новая работа">
          {needClub ? <T bold size={17}>🏟️ {L.clubs[club][0]}</T> : null}
          {needNation ? <T bold size={17} style={{ marginTop: 6 }}>{NATION_BY_CODE[nation].flag} Сборная: {NATION_BY_CODE[nation].name}</T> : null}
          <T muted size={13} style={{ marginTop: 8 }}>Старт: 1 июля 2026, сезон 2026/27.</T>
        </Card>
        <Card title="Игроки">
          <Seg
            options={[{ value: 'real', label: 'Реальные' }, ...(custom ? [{ value: 'custom', label: 'Мой файл' }] : []), { value: 'none', label: 'Вымышленные' }]}
            value={base}
            onChange={setBase}
          />
          <T muted size={12} style={{ marginTop: 8 }}>
            {base === 'real' ? `Настоящие составы ${squadsStats(REAL_SQUADS).clubs} топ-клубов, остальные генерируются.` : base === 'custom' ? `Ваш файл: ${squadsStats(custom).clubs} клубов, ${squadsStats(custom).players} игроков (плюс встроенные).` : 'Все игроки сгенерированы.'}
          </T>
          <Btn small kind="ghost" title={custom ? 'Загрузить другой файл' : 'Загрузить свой файл'} style={{ marginTop: 10 }} onPress={async () => {
            try {
              const r = await importSquadsFromFile();
              if (r) { setCustom(r.squads); setBase('custom'); }
            } catch (e) { G.alert('Не удалось загрузить', String(e?.message || e)); }
          }} />
        </Card>
        <Btn title="НАЧАТЬ КАРЬЕРУ" icon="football" onPress={start} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
        <Pressable onPress={back} hitSlop={12} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Icon name="chevron-back" size={18} color={C.gold} /><Text style={{ color: C.gold, fontSize: 16, fontWeight: '700' }}>Назад</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">{body}</ScrollView>
    </View>
  );
}
