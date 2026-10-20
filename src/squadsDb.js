// Своя база игроков: загрузка JSON-файла и хранение на телефоне
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { LEAGUES } from './data/leagues';

const KEY = 'custom_squads_v1';
const POS = new Set(['GK', 'CB', 'LB', 'RB', 'DM', 'CM', 'AM', 'LW', 'RW', 'ST']);

export async function loadCustomSquads() {
  try {
    const s = await AsyncStorage.getItem(KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}
export async function clearCustomSquads() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}

export function squadsStats(sq) {
  if (!sq) return { clubs: 0, players: 0 };
  const clubs = Object.keys(sq);
  return { clubs: clubs.length, players: clubs.reduce((s, c) => s + sq[c].length, 0) };
}

// Проверка и нормализация: { "Клуб": [[имя, поз, возраст, рейтинг, потенциал, страна], ...] }
export function validateSquads(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Файл должен содержать объект вида { "Клуб": [ игроки ] }.');
  const known = new Set(LEAGUES.flatMap((l) => l.clubs.map((c) => c[0])));
  const out = {};
  const unknown = [];
  let bad = 0;
  for (const club of Object.keys(data)) {
    if (!known.has(club)) { unknown.push(club); continue; }
    const list = [];
    for (const p of data[club] || []) {
      const arr = Array.isArray(p) ? p : [p.name, p.pos, p.age, p.ovr, p.pot, p.nat];
      const [name, pos, age, ovr, pot, nat] = arr;
      if (!name || !POS.has(pos) || !(age > 14 && age < 46) || !(ovr > 0 && ovr < 100)) { bad++; continue; }
      list.push([String(name), pos, Math.round(age), Math.round(ovr), pot ? Math.round(pot) : null, nat || null]);
    }
    if (list.length >= 11) out[club] = list;
    else bad += list.length;
  }
  if (!Object.keys(out).length) throw new Error('В файле не нашлось ни одного клуба с названием из игры и хотя бы 11 корректными игроками.');
  return { squads: out, unknown, bad };
}

async function readUri(asset) {
  if (Platform.OS === 'web') {
    if (asset.file) return await asset.file.text();
    return await (await fetch(asset.uri)).text();
  }
  const { File } = require('expo-file-system');
  return await new File(asset.uri).text();
}

export async function importSquadsFromFile() {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', 'text/javascript', '*/*'], copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.length) return null;
  let text = await readUri(res.assets[0]);
  // вырезаем JSON-объект (на случай лишнего текста вокруг)
  const i = text.indexOf('{');
  const j = text.lastIndexOf('}');
  if (i < 0 || j < 0) throw new Error('В файле нет данных в формате JSON.');
  text = text.slice(i, j + 1);
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Не удалось прочитать JSON. Проверьте кавычки и запятые в файле.');
  }
  const v = validateSquads(data);
  await AsyncStorage.setItem(KEY, JSON.stringify(v.squads));
  return v;
}
