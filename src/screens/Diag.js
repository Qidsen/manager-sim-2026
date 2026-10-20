import React, { useMemo, useState } from 'react';
import { View, Text, Share } from 'react-native';
import { C, F, T, Card, Btn, Stat } from '../ui/kit';
import Page from '../ui/page';
import { useG } from '../ui/ctx';
import { buildReport, scanSave } from '../diag';
import { repairSchedule } from '../engine/sim';

export default function DiagScreen() {
  const G = useG();
  const W = G.W;
  const [n, setN] = useState(0);
  const scan = useMemo(() => scanSave(W), [n, G.tick]);
  const report = useMemo(() => buildReport(W), [n, G.tick]);

  return (
    <Page title="Диагностика" sub="Проверка сохранения" back>
      <Card title="Состояние" icon="pulse">
        <View style={{ flexDirection: 'row' }}>
          <Stat label="просроченных матчей" value={scan.overdue.length} color={scan.overdue.length ? C.red : C.accent} />
          <Stat label="зависших турниров" value={scan.stuck.length} color={scan.stuck.length ? C.red : C.accent} />
          <Stat label="ошибок" value={(W.errors || []).length} color={(W.errors || []).length ? C.orange : C.accent} />
        </View>
      </Card>
      <Btn
        title="Починить календарь"
        icon="construct"
        onPress={() => {
          const moved = repairSchedule(W);
          setN(n + 1);
          G.refresh();
          G.save(true);
          G.alert('Готово', moved ? `Перенесено или засчитано матчей: ${moved}. Нажмите «Продолжить» на главной, чтобы их доиграть.` : 'Проблем в календаре не найдено.');
        }}
        style={{ marginBottom: 10 }}
      />
      <Btn
        title="Отправить отчёт"
        icon="share-outline"
        kind="ghost"
        onPress={() => Share.share({ message: report }).catch(() => {})}
        style={{ marginBottom: 12 }}
      />
      <Card title="Отчёт" icon="document-text-outline">
        <Text selectable style={{ color: C.text, fontSize: 12.5, lineHeight: 18, fontFamily: undefined }}>{report}</Text>
      </Card>
      <T muted size={12} center>Нажмите «Отправить отчёт» → «Скопировать» и вставьте текст в чат.</T>
    </Page>
  );
}
