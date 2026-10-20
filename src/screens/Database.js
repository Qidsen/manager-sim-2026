import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { C, T, Card, Btn, Stat } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import { REAL_SQUADS } from '../data/realSquads';
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
      setCustom(r.squads);
      const st = squadsStats(r.squads);
      G.alert('База загружена', `Клубов: ${st.clubs}, игроков: ${st.players}.${r.unknown.length ? `\n\nНе найдены в игре (пропущены): ${r.unknown.slice(0, 8).join(', ')}${r.unknown.length > 8 ? '…' : ''}` : ''}${r.bad ? `\nПропущено некорректных записей: ${r.bad}.` : ''}\n\nБаза применится в новой игре.`);
    } catch (e) {
      G.alert('Не удалось загрузить', String(e?.message || e));
    }
  };

  return (
    <Page title="База игроков" back>
      <Card title="Встроенная база">
        <T size={14} style={{ marginBottom: 10 }}>Реальные составы топ-клубов (октябрь 2026). Остальные команды генерируются.</T>
        <View style={{ flexDirection: 'row' }}>
          <Stat label="клубов" value={builtIn.clubs} />
          <Stat label="игроков" value={builtIn.players} />
        </View>
      </Card>
      <Card title="Своя база">
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
      <Card title="Формат файла">
        <T size={13} style={{ lineHeight: 19 }}>
          {'{\n  "Arsenal": [\n    ["David Raya", "GK", 31, 87, null, "ESP"],\n    ["Bukayo Saka", "RW", 25, 90, 91, "ENG"]\n  ]\n}'}
        </T>
        <T muted size={12} style={{ marginTop: 8, lineHeight: 17 }}>
          Игрок: имя, позиция (GK CB LB RB DM CM AM LW RW ST), возраст, рейтинг 1–99, потенциал (или null), код страны (ENG, UKR, BRA…). Название клуба — как в игре. В клубе нужно минимум 11 игроков.
        </T>
      </Card>
      <T muted size={12} center>База применяется при создании новой игры.</T>
    </Page>
  );
}
