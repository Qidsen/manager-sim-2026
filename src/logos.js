// Эмблемы клубов: встроенная таблица + эмблемы из файла-патча + автоматический поиск недостающих.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ESPN_IDS, ESPN_LEAGUES, ALIASES, espnLogo } from './data/logos';

const KEY = 'logos_v1';
const STAMP = 'logos_scan_v1';
let extra = {}; // название клуба → url (из патча или найденные автоматически)
let ver = 0;
const listeners = new Set();

export const logosVersion = () => ver;
export function onLogos(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function bump() {
  ver++;
  listeners.forEach((f) => f(ver));
}

export async function loadLogos() {
  try {
    const s = await AsyncStorage.getItem(KEY);
    extra = s ? JSON.parse(s) || {} : {};
  } catch {
    extra = {};
  }
  bump();
}
async function persist() {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(extra));
  } catch {}
}

export function clubLogo(club, size = 96) {
  if (!club) return null;
  const k2 = `${club.name}|${club.country}`;
  const url = extra[k2] || extra[club.name];
  if (url) return typeof url === 'number' ? espnLogo(url, size) : url;
  const id = ESPN_IDS[k2] ?? ESPN_IDS[club.name];
  return id ? espnLogo(id, size) : null;
}

// Эмблемы из файла-патча: { "_logos": { "Клуб": "https://...png" | idESPN } }
export async function applyPatchLogos(map) {
  if (!map || typeof map !== 'object') return 0;
  let n = 0;
  for (const [name, v] of Object.entries(map)) {
    if (typeof v === 'number' || (typeof v === 'string' && /^https?:\/\//.test(v))) {
      extra[name] = v;
      n++;
    }
  }
  await persist();
  bump();
  return n;
}
export async function resetLogos() {
  extra = {};
  await persist();
  try { await AsyncStorage.removeItem(STAMP); } catch {}
  bump();
}

const norm = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !['fc', 'cf', 'sc', 'fk', 'club', 'de', 'the', 'ac', 'cd', 'sk', 'afc', 'sfk'].includes(w))
    .join(' ');

// Ищем недостающие эмблемы в списках команд ESPN (работает на телефоне, раз в неделю)
export async function discoverLogos(W, force = false) {
  try {
    if (!force) {
      const last = Number(await AsyncStorage.getItem(STAMP)) || 0;
      if (Date.now() - last < 7 * 864e5) return 0;
    }
    const missing = Object.values(W.clubs).filter((c) => !clubLogo(c));
    if (!missing.length) return 0;
    const teams = [];
    for (const slug of ESPN_LEAGUES) {
      try {
        const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const t = setTimeout(() => ctrl?.abort(), 8000);
        const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/teams`, ctrl ? { signal: ctrl.signal } : undefined);
        clearTimeout(t);
        const j = await r.json();
        for (const x of j?.sports?.[0]?.leagues?.[0]?.teams || []) {
          const tm = x.team;
          if (tm?.id) teams.push({ id: Number(tm.id), names: [tm.displayName, tm.shortDisplayName, tm.name, tm.location].filter(Boolean).map(norm) });
        }
      } catch {}
    }
    let found = 0;
    for (const c of missing) {
      const q = norm(ALIASES[c.name] || c.name);
      if (!q) continue;
      let hit = teams.find((t) => t.names.includes(q));
      if (!hit && q.length >= 4) hit = teams.find((t) => t.names.some((n) => n.length >= 4 && (n.includes(q) || q.includes(n))));
      if (hit) {
        extra[c.name] = hit.id;
        found++;
      }
    }
    await AsyncStorage.setItem(STAMP, String(Date.now()));
    if (found) {
      await persist();
      bump();
    }
    return found;
  } catch {
    return 0;
  }
}
