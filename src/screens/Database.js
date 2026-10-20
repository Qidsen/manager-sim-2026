import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { C, T, Card, Btn, Stat } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import { REAL_SQUADS } from '../data/realSquads';
import { resetLogos, discoverLogos } from '../logos';
import { loadCustomSquads, clearCustomSquads, importSquadsFromFile, squadsStats } from '../squadsDb';

export default function DatabaseScreen() {
  const G = useG();
  const [custom, setCustom] = useState(null);
  const builtIn = squadsStats(REAL_SQUADS);
  const cs = squadsStats(custom);

  useEffect(() => {
    loadCustomSquads().then(setCustom);
  }, []);

  const doImport = async () => {
    try {
      const r = await importSquadsFromFile();
      if (!r) return;
      if (r.squads) setCustom(r.squads);
      const st = squadsStats(r.squads);
      G.alert('Патч загружен', `${r.squads ? `Клубов: ${st.clubs}, игроков: ${st.players}.` : 'Составы в файле не найдены.'}${r.logoCount ? `\nЭмблем: ${r.logoCount} — уже работают.` : ''}${r.unknown.length ? `\n\nНе найдены в игре (пропущены): ${r.unknown.slice(0, 8).join(', ')}${r.unknown.length > 8 ? '…' : ''}` : ''}${r.bad ? `\nПропущено некорректных записей: ${r.bad}.` : ''}\n\nБаза применится в новой игре.`);
    } catch (e) {
      G.alert('Не удалось загрузить', String(e?.message || e));
    }
  };

  return (
    <Page title="База игроков" back>
      <Card title="Встроенная база" icon="server-outline">
        <T size={14} style={{ marginBottom: 10 }}>Реальные составы топ-клубов (октябрь 2026). Остальные команды генерируются.</T>
        <View style={{ flexDirection: 'row' }}>
          <Stat label="клубов" value={builtIn.clubs} />
          <Stat label="игроков" value={builtIn.players} />
        </View>
      </Card>
      <Card title="Своя база" icon="cloud-upload-outline">
        {custom ? (
          <>
            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              <Stat label="клубов" value={cs.clubs} color={C.accent} />
              <Stat label="игроков" value={cs.players} color={C.accent} />
            </View>
            <Btn title="Загрузить другой файл" kind="ghost" onPress={doImport} style={{ marginBottom: 8 }} />
            <Btn title="Удалить свою базу" kind="danger" onPress={async () => { await clearCustomSquads(); setCustom(null); }} />
          </>
        ) : (
          <>
            <T muted size={13} style={{ marginBottom: 12 }}>Загрузите JSON-файл из «Файлов». Клубы из файла заменят встроенные и сгенерированные составы, остальные останутся как есть.</T>
            <Btn title="Загрузить файл" onPress={doImport} />
          </>
        )}
      </Card>
      <Card title="Эмблемы клубов" icon="shield-outline">
        <T size={13} style={{ marginBottom: 10 }}>Настоящие эмблемы встроены в игру и подгружаются из интернета. Недостающие игра ищет сама раз в неделю. Свои эмблемы можно добавить в файл-патч в разделе "_logos".</T>
        <Btn title="Найти недостающие эмблемы сейчас" kind="ghost" icon="search" style={{ marginBottom: 8 }} onPress={async () => { G.setBusy('Ищем эмблемы…'); const n = await discoverLogos(G.W, true); G.setBusy(null); G.alert('Эмблемы', n ? `Найдено новых эмблем: ${n}.` : 'Новых эмблем не найдено (нужен интернет).'); }} />
        <Btn title="Сбросить эмблемы из патча" kind="ghost" onPress={async () => { await resetLogos(); G.alert('Готово', 'Остались только встроенные эмблемы.'); }} />
      </Card>
      <Card title="Формат файла" icon="code-slash-outline">
        <T size={13} style={{ lineHeight: 19 }}>
          {'{\n  "Arsenal": [\n    ["David Raya", "GK", 31, 87, null, "ESP"],\n    ["Bukayo Saka", "RW", 25, 90, 91, "ENG"]\n  ],\n  "_logos": {\n    "Arsenal": "https://…/arsenal.png",\n    "Шахтар": 493\n  }\n}'}
        </T>
        <T muted size={12} style={{ marginTop: 8, lineHeight: 17 }}>
          Игрок: имя, позиция (GK CB LB RB DM CM AM LW RW ST), возраст, рейтинг 1–99, потенциал (или null), код страны (ENG, UKR, BRA…). Название клуба — как в игре. В клубе нужно минимум 11 игроков. В "_logos" — ссылка на картинку PNG или номер команды в ESPN.
        </T>
      </Card>
      <T muted size={12} center>База применяется при создании новой игры.</T>
    </Page>
  );
}
