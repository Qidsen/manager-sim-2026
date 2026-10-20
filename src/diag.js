// Диагностика: журнал действий и поиск проблем в сохранении.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { teamName } from './engine/teams';
import { fmtDate, seasonLabel } from './engine/util';

export const APP_VERSION = '1.2';
const BC = 'diag_breadcrumb_v1';
let lastUnfinished = null;

// Отметка «начал тяжёлую операцию»: если приложение зависнет или вылетит,
// при следующем запуске мы увидим, на чём это случилось.
export async function bcStart(W, op) {
  try {
    await AsyncStorage.setItem(BC, JSON.stringify({ op, y: W?.year, d: W?.day, t: Date.now() }));
  } catch {}
}
export async function bcEnd(W, op, ms) {
  try {
    await AsyncStorage.removeItem(BC);
  } catch {}
  if (W) {
    (W.diag ||= []).push({ op, y: W.year, d: W.day, ms: Math.round(ms || 0), t: Date.now() });
    if (W.diag.length > 40) W.diag.splice(0, W.diag.length - 40);
  }
}
export async function readUnfinished() {
  try {
    const s = await AsyncStorage.getItem(BC);
    lastUnfinished = s ? JSON.parse(s) : null;
    if (s) await AsyncStorage.removeItem(BC);
  } catch {
    lastUnfinished = null;
  }
  return lastUnfinished;
}
export function logError(W, where, e) {
  if (!W) return;
  (W.errors ||= []).push({ where, msg: String(e?.message || e).slice(0, 300), stack: String(e?.stack || '').slice(0, 400), y: W.year, d: W.day, t: Date.now() });
  if (W.errors.length > 20) W.errors.splice(0, W.errors.length - 20);
}

export function scanSave(W) {
  const overdue = [];
  const stuck = [];
  for (const cid in W.comps) {
    const c = W.comps[cid];
    let pend = 0;
    let lastDay = -1;
    c.stages.forEach((st, si) => {
      st.rounds.forEach((r) => {
        for (const m of r) {
          if (m.day > lastDay) lastDay = m.day;
          if (m.hg !== null) continue;
          pend++;
          if (m.day < W.day) overdue.push({ c: c.name, st: st.name, d: m.day, h: m.h, a: m.a, si, n: c.stages.length });
        }
      });
    });
    if (!c.done && c.kind !== 'friendly' && !pend && c.stages.length) stuck.push({ c: c.name, why: 'нет матчей, турнир не закрыт', st: c.stages.map((s) => s.name).join('>') });
    if (!c.done && pend && lastDay < W.day && c.kind !== 'friendly') stuck.push({ c: c.name, why: `ждёт ${pend} матч(ей), последняя дата ${lastDay}` });
  }
  // расписание: ссылки на несуществующие стадии
  let badSched = 0;
  for (const d in W.sched) for (const e of W.sched[d]) {
    const st = W.comps[e.c]?.stages[e.s];
    if (!st || !st.rounds[e.r]) badSched++;
  }
  return { overdue, stuck, badSched };
}

export function buildReport(W) {
  const r = scanSave(W);
  const u = W.user || {};
  const lines = [];
  lines.push(`Manager Sim ${APP_VERSION} · ${Platform.OS} · ${fmtDate(W.year, W.day)} (день ${W.day}, сезон ${seasonLabel(W.year)})`);
  lines.push(`Клуб: ${u.club ? W.clubs[u.club]?.name : '—'} · Сборная: ${u.nation || '—'} · игроков в базе: ${Object.keys(W.players).length}`);
  if (lastUnfinished) lines.push(`ПРЕДЫДУЩИЙ ЗАПУСК ОБОРВАЛСЯ: «${lastUnfinished.op}» на дне ${lastUnfinished.d} (${lastUnfinished.y})`);
  lines.push(`Просроченных матчей: ${r.overdue.length}`);
  for (const o of r.overdue.slice(0, 8)) lines.push(`  · ${o.c} / ${o.st} (стадия ${o.si + 1}/${o.n}), день ${o.d}: ${teamName(W, o.h)} — ${teamName(W, o.a)}`);
  lines.push(`Зависшие турниры: ${r.stuck.length}`);
  for (const s of r.stuck.slice(0, 8)) lines.push(`  · ${s.c}: ${s.why}${s.st ? ` [${s.st}]` : ''}`);
  if (r.badSched) lines.push(`Битых записей расписания: ${r.badSched}`);
  const errs = W.errors || [];
  lines.push(`Ошибок: ${errs.length}`);
  for (const e of errs.slice(-5)) lines.push(`  · ${e.where} (день ${e.d}): ${e.msg} | ${e.stack.split('\n').slice(0, 2).join(' / ')}`);
  const slow = (W.diag || []).slice().sort((a, b) => b.ms - a.ms).slice(0, 3);
  if (slow.length) lines.push(`Самые долгие операции: ${slow.map((x) => `${x.op} ${x.ms}мс (день ${x.d})`).join('; ')}`);
  const recent = (W.diag || []).slice(-6);
  if (recent.length) lines.push(`Последние действия: ${recent.map((x) => `${x.op}@${x.d}`).join(', ')}`);
  return lines.join('\n');
}
