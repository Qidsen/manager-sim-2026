// Позиции, схемы, расчёт рейтинга, стоимости и зарплат, форматирование.

export const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'DM', 'CM', 'AM', 'LW', 'RW', 'ST'];
export const POS_RU = {
  GK: 'ВР', CB: 'ЦЗ', LB: 'ЛЗ', RB: 'ПЗ', DM: 'ОП', CM: 'ЦП', AM: 'АП', LW: 'ЛВ', RW: 'ПВ', ST: 'НП',
};
export const POS_FULL = {
  GK: 'Вратарь', CB: 'Центральный защитник', LB: 'Левый защитник', RB: 'Правый защитник', DM: 'Опорный полузащитник',
  CM: 'Центральный полузащитник', AM: 'Атакующий полузащитник', LW: 'Левый вингер', RW: 'Правый вингер', ST: 'Нападающий',
};
export const LINE = { GK: 'G', CB: 'D', LB: 'D', RB: 'D', DM: 'M', CM: 'M', AM: 'M', LW: 'A', RW: 'A', ST: 'A' };
export const LINE_ORDER = { G: 0, D: 1, M: 2, A: 3 };

export const ATTRS = ['gk', 'def', 'pas', 'tec', 'sho', 'pac', 'phy'];
export const ATTR_RU = { gk: 'Вратарские', def: 'Отбор', pas: 'Пас', tec: 'Техника', sho: 'Удар', pac: 'Скорость', phy: 'Физика' };

const W = {
  GK: { gk: 0.9, pas: 0.05, phy: 0.05 },
  CB: { def: 0.45, phy: 0.25, pac: 0.1, pas: 0.1, tec: 0.1 },
  LB: { def: 0.35, pac: 0.25, pas: 0.15, phy: 0.1, tec: 0.15 },
  RB: { def: 0.35, pac: 0.25, pas: 0.15, phy: 0.1, tec: 0.15 },
  DM: { def: 0.32, pas: 0.3, phy: 0.2, tec: 0.18 },
  CM: { pas: 0.35, tec: 0.25, def: 0.15, phy: 0.1, sho: 0.15 },
  AM: { tec: 0.35, pas: 0.3, sho: 0.25, pac: 0.1 },
  LW: { pac: 0.3, tec: 0.3, sho: 0.25, pas: 0.15 },
  RW: { pac: 0.3, tec: 0.3, sho: 0.25, pas: 0.15 },
  ST: { sho: 0.45, tec: 0.2, pac: 0.2, phy: 0.15 },
};
export const POS_WEIGHTS = W;

export function ovrAs(p, pos) {
  const w = W[pos];
  let s = 0;
  for (const k in w) s += p.a[k] * w[k];
  return s;
}

// насколько игрок подходит на чужую позицию
export const NEAR = {
  GK: [],
  CB: ['DM', 'LB', 'RB'],
  LB: ['LW', 'CB', 'RB'],
  RB: ['RW', 'CB', 'LB'],
  DM: ['CM', 'CB'],
  CM: ['DM', 'AM'],
  AM: ['CM', 'LW', 'RW', 'ST'],
  LW: ['RW', 'AM', 'LB', 'ST'],
  RW: ['LW', 'AM', 'RB', 'ST'],
  ST: ['AM', 'LW', 'RW'],
};
export function fitFactor(natural, slot) {
  if (natural === slot) return 1;
  if (natural === 'GK' || slot === 'GK') return 0.3;
  if (NEAR[natural].includes(slot)) return 0.9;
  if (LINE[natural] === LINE[slot]) return 0.82;
  return 0.7;
}
export function slotRating(p, slot) {
  // рейтинг игрока на конкретной позиции схемы; освоенные дополнительные позиции почти без штрафа
  const f = p.alt && p.alt.includes(slot) ? 0.97 : fitFactor(p.pos, slot);
  return Math.min(Math.max(p.ovr, p.alt && p.alt.includes(slot) ? ovrAs(p, slot) : 0), ovrAs(p, slot)) * f;
}

// ---------- свои схемы ----------
export const customKey = (name) => `★ ${name}`;
export function registerCustomFormations(W) {
  for (const k of Object.keys(FORMATIONS)) if (!BASE_FORMATIONS.includes(k)) delete FORMATIONS[k];
  for (const [name, slots] of Object.entries(W.customForms || {})) FORMATIONS[customKey(name)] = slots;
  // если схема пропала (удалена) — возвращаем команду на 4-3-3
  const fix = (t) => { if (t && !FORMATIONS[t.form]) { t.form = FORMATIONS['4-3-3'] ? '4-3-3' : BASE_FORMATIONS[0]; t.xi = null; t.bench = null; t.auto = true; } };
  for (const c of Object.values(W.clubs || {})) fix(c.tactic);
  for (const n of Object.values(W.nations || {})) fix(n.tactic);
}

// Позиция по месту на поле: x — поперёк (0 — левый фланг), y — глубина (0 — свои ворота)
export function posFromSpot(x, y) {
  const wide = x < 0.24 ? 'L' : x > 0.76 ? 'R' : null;
  if (y < 0.12) return 'GK';
  if (y < 0.33) return wide === 'L' ? 'LB' : wide === 'R' ? 'RB' : 'CB';
  if (y < 0.46) return wide === 'L' ? 'LB' : wide === 'R' ? 'RB' : 'DM';
  if (y < 0.6) return wide === 'L' ? 'LW' : wide === 'R' ? 'RW' : 'CM';
  if (y < 0.74) return wide === 'L' ? 'LW' : wide === 'R' ? 'RW' : 'AM';
  return wide === 'L' ? 'LW' : wide === 'R' ? 'RW' : 'ST';
}

// ---------- роли развития (как в карьере EA FC) ----------
export const DEV_ROLES = {
  GK: [['classic', 'Классический вратарь', ['gk', 'phy']], ['sweeper', 'Вратарь-распасовщик', ['gk', 'pas']]],
  CB: [['stopper', 'Стоппер', ['def', 'phy']], ['ballplay', 'Распасовщик', ['def', 'pas']], ['quick', 'Скоростной защитник', ['def', 'pac']]],
  LB: [['defwb', 'Оборонительный крайний', ['def', 'phy']], ['attwb', 'Атакующий крайний', ['pac', 'pas']], ['inverted', 'Инвертированный крайний', ['pas', 'tec']]],
  RB: [['defwb', 'Оборонительный крайний', ['def', 'phy']], ['attwb', 'Атакующий крайний', ['pac', 'pas']], ['inverted', 'Инвертированный крайний', ['pas', 'tec']]],
  DM: [['destroyer', 'Разрушитель', ['def', 'phy']], ['deeplay', 'Опорный плеймейкер', ['pas', 'tec']]],
  CM: [['b2b', 'Box-to-box', ['phy', 'pas']], ['playmaker', 'Плеймейкер', ['pas', 'tec']], ['runner', 'Подключающийся', ['sho', 'pac']]],
  AM: [['creator', 'Креативный', ['pas', 'tec']], ['shadow', 'Теневой нападающий', ['sho', 'tec']]],
  LW: [['winger', 'Скоростной вингер', ['pac', 'tec']], ['invwing', 'Инвертированный вингер', ['sho', 'tec']], ['wideplay', 'Фланговый плеймейкер', ['pas', 'tec']]],
  RW: [['winger', 'Скоростной вингер', ['pac', 'tec']], ['invwing', 'Инвертированный вингер', ['sho', 'tec']], ['wideplay', 'Фланговый плеймейкер', ['pas', 'tec']]],
  ST: [['poacher', 'Бомбардир', ['sho', 'pac']], ['target', 'Таран', ['sho', 'phy']], ['false9', 'Ложная девятка', ['tec', 'pas']]],
};
export function devRole(p) {
  const list = DEV_ROLES[p.pos] || [];
  return list.find((r) => r[0] === p.dev?.role) || null;
}
// сколько недель переучиваться на позицию
export function retrainWeeks(from, to) {
  if (from === to) return 0;
  if (NEAR[from]?.includes(to)) return LINE[from] === LINE[to] ? 8 : 12;
  return 20;
}

export function recalcOvr(p) {
  p.ovr = Math.round(ovrAs(p, p.pos));
  return p.ovr;
}

// Схемы: [позиция, x (0 — левый фланг, 1 — правый), y (0 — свои ворота, 1 — чужие)]
export const FORMATIONS = {
  '4-4-2': [['GK', 0.5, 0.04], ['RB', 0.86, 0.24], ['CB', 0.62, 0.2], ['CB', 0.38, 0.2], ['LB', 0.14, 0.24], ['RW', 0.86, 0.55], ['CM', 0.62, 0.5], ['CM', 0.38, 0.5], ['LW', 0.14, 0.55], ['ST', 0.62, 0.82], ['ST', 0.38, 0.82]],
  '4-3-3': [['GK', 0.5, 0.04], ['RB', 0.86, 0.24], ['CB', 0.62, 0.2], ['CB', 0.38, 0.2], ['LB', 0.14, 0.24], ['CM', 0.72, 0.5], ['DM', 0.5, 0.4], ['CM', 0.28, 0.5], ['RW', 0.84, 0.78], ['ST', 0.5, 0.86], ['LW', 0.16, 0.78]],
  '4-2-3-1': [['GK', 0.5, 0.04], ['RB', 0.86, 0.24], ['CB', 0.62, 0.2], ['CB', 0.38, 0.2], ['LB', 0.14, 0.24], ['DM', 0.62, 0.42], ['DM', 0.38, 0.42], ['RW', 0.84, 0.66], ['AM', 0.5, 0.64], ['LW', 0.16, 0.66], ['ST', 0.5, 0.86]],
  '4-1-4-1': [['GK', 0.5, 0.04], ['RB', 0.86, 0.24], ['CB', 0.62, 0.2], ['CB', 0.38, 0.2], ['LB', 0.14, 0.24], ['DM', 0.5, 0.38], ['RW', 0.86, 0.6], ['CM', 0.62, 0.56], ['CM', 0.38, 0.56], ['LW', 0.14, 0.6], ['ST', 0.5, 0.86]],
  '4-4-2 ромб': [['GK', 0.5, 0.04], ['RB', 0.86, 0.24], ['CB', 0.62, 0.2], ['CB', 0.38, 0.2], ['LB', 0.14, 0.24], ['DM', 0.5, 0.38], ['CM', 0.74, 0.52], ['CM', 0.26, 0.52], ['AM', 0.5, 0.66], ['ST', 0.62, 0.86], ['ST', 0.38, 0.86]],
  '4-5-1': [['GK', 0.5, 0.04], ['RB', 0.86, 0.24], ['CB', 0.62, 0.2], ['CB', 0.38, 0.2], ['LB', 0.14, 0.24], ['RW', 0.86, 0.58], ['CM', 0.68, 0.52], ['DM', 0.5, 0.42], ['CM', 0.32, 0.52], ['LW', 0.14, 0.58], ['ST', 0.5, 0.84]],
  '3-5-2': [['GK', 0.5, 0.04], ['CB', 0.74, 0.2], ['CB', 0.5, 0.18], ['CB', 0.26, 0.2], ['RB', 0.9, 0.48], ['CM', 0.68, 0.52], ['DM', 0.5, 0.42], ['CM', 0.32, 0.52], ['LB', 0.1, 0.48], ['ST', 0.62, 0.84], ['ST', 0.38, 0.84]],
  '3-4-3': [['GK', 0.5, 0.04], ['CB', 0.74, 0.2], ['CB', 0.5, 0.18], ['CB', 0.26, 0.2], ['RB', 0.88, 0.5], ['CM', 0.62, 0.48], ['CM', 0.38, 0.48], ['LB', 0.12, 0.5], ['RW', 0.82, 0.78], ['ST', 0.5, 0.86], ['LW', 0.18, 0.78]],
  '5-3-2': [['GK', 0.5, 0.04], ['RB', 0.9, 0.3], ['CB', 0.7, 0.2], ['CB', 0.5, 0.18], ['CB', 0.3, 0.2], ['LB', 0.1, 0.3], ['CM', 0.7, 0.52], ['DM', 0.5, 0.44], ['CM', 0.3, 0.52], ['ST', 0.62, 0.84], ['ST', 0.38, 0.84]],
  '5-4-1': [['GK', 0.5, 0.04], ['RB', 0.9, 0.3], ['CB', 0.7, 0.2], ['CB', 0.5, 0.18], ['CB', 0.3, 0.2], ['LB', 0.1, 0.3], ['RW', 0.84, 0.58], ['CM', 0.6, 0.52], ['CM', 0.4, 0.52], ['LW', 0.16, 0.58], ['ST', 0.5, 0.84]],
};
export const BASE_FORMATIONS = Object.keys(FORMATIONS);

export const FORMATION_NAMES = Object.keys(FORMATIONS);

export const MENTALITY = ['Очень оборонительно', 'Оборонительно', 'Сбалансированно', 'Атакующе', 'Очень атакующе'];
export const PRESSING = ['Низкий', 'Средний', 'Высокий'];
export const TEMPO = ['Медленный', 'Обычный', 'Быстрый'];

// Стоимость и зарплата
export function playerValue(p) {
  let v = 0.45 * Math.pow(10, (p.ovr - 60) / 13) * 1e6;
  if (p.age <= 23) v *= 1 + Math.max(0, p.pot - p.ovr) / 18;
  if (p.age >= 30) v *= Math.max(0.12, 1 - (p.age - 29) * 0.16);
  if (p.inj > 30) v *= 0.85;
  return roundMoney(Math.max(v, 25000));
}
export function wageFor(ovr, age, rep = 70) {
  // недельная зарплата, €
  let w = Math.pow(10, 4.7 + (ovr - 75) * 0.05);
  if (age >= 31) w *= 0.9;
  if (age <= 19) w *= 0.6;
  w *= 0.7 + rep / 250;
  return roundMoney(Math.max(800, w));
}
export function roundMoney(v) {
  if (v >= 1e7) return Math.round(v / 1e6) * 1e6;
  if (v >= 1e6) return Math.round(v / 1e5) * 1e5;
  if (v >= 1e5) return Math.round(v / 1e4) * 1e4;
  if (v >= 1e4) return Math.round(v / 1e3) * 1e3;
  return Math.round(v / 100) * 100;
}
export function money(v) {
  const s = v < 0 ? '−' : '';
  const a = Math.abs(v);
  if (a >= 1e9) return `${s}€${(a / 1e9).toFixed(2)} млрд`;
  if (a >= 1e6) return `${s}€${(a / 1e6).toFixed(a >= 1e8 ? 0 : 1)} млн`;
  if (a >= 1e3) return `${s}€${Math.round(a / 1e3)} тыс.`;
  return `${s}€${Math.round(a)}`;
}

// Даты: день 0 = 1 июля года начала сезона
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
export function dayToDate(year, day) {
  return new Date(Date.UTC(year, 6, 1) + day * 86400000);
}
export function fmtDate(year, day, withWd = false) {
  const d = dayToDate(year, day);
  const s = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return withWd ? `${WD[d.getUTCDay()]}, ${s}` : s;
}
export function fmtShort(year, day) {
  const d = dayToDate(year, day);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const seasonLabel = (y) => `${y}/${String((y + 1) % 100).padStart(2, '0')}`;

// ---------- динамический рейтинг (как Dynamic OVR в FC 27) ----------
// Форма (последние оценки), мораль и игровой тонус сдвигают рейтинг на -6…+4.
export function dynParts(p) {
  const form = clamp(p.frm || 0, -3, 3);
  const mor = clamp(((p.mor ?? 70) - 70) / 12, -4, 2.5) * 0.5;
  const shp = clamp(((p.shp ?? 80) - 75) / 10, -4, 2.5) * 0.6;
  return { form, mor, shp, total: clamp(form + mor + shp, -6, 4) };
}
export const dynDelta = (p) => dynParts(p).total;
export const dynOvr = (p) => Math.round(clamp(p.ovr + dynDelta(p), 1, 99));

// ---------- профили роста (Growth Profiles) ----------
// g — скорость роста по возрастам (≤20, 21–23, 24–27), peak — до какого возраста держит пик, dec — скорость спада, v — разброс
export const GROWTH = {
  early: { ru: 'Ранний расцвет', d: 'Стремительно растёт в юности, пик в 24–27, раньше начинает сдавать.', g: [1.4, 1.15, 0.6], peak: 27, dec: 1.3, v: 1 },
  std: { ru: 'Классический', d: 'Обычная кривая: рост до 25–26, пик до 29.', g: [1, 1, 1], peak: 29, dec: 1, v: 1 },
  late: { ru: 'Поздний расцвет', d: 'Медленно раскрывается, но прибавляет до 30 лет.', g: [0.65, 0.95, 1.7], peak: 30, dec: 0.9, v: 1 },
  long: { ru: 'Долгожитель', d: 'Долго держит уровень, медленно стареет.', g: [0.95, 1, 1], peak: 31, dec: 0.5, v: 0.8 },
  burst: { ru: 'Взрывной', d: 'Растёт скачками — может выстрелить, а может застрять.', g: [1.1, 1.1, 1.1], peak: 28, dec: 1.1, v: 2.4 },
  steady: { ru: 'Стабильный', d: 'Ровный предсказуемый рост без сюрпризов.', g: [0.95, 0.95, 0.95], peak: 29, dec: 0.8, v: 0.35 },
};
const GP_TABLE = ['std', 'std', 'std', 'std', 'std', 'std', 'std', 'std', 'early', 'early', 'early', 'late', 'late', 'late', 'long', 'long', 'burst', 'burst', 'steady', 'steady'];
export function growthKey(p) {
  if (!p.gp || !GROWTH[p.gp]) p.gp = GP_TABLE[Math.abs((p.id * 2654435761) | 0) % GP_TABLE.length];
  return p.gp;
}
export const growthOf = (p) => GROWTH[growthKey(p)];

// Риск травмы: недавно травмированные, без тонуса и уставшие рискуют больше
export function injuryRisk(p, fit) {
  return (p.frag > 0 ? 2.5 : 1) * ((p.shp ?? 80) < 55 ? 1.5 : 1) * ((fit ?? p.fit) < 60 ? 1.6 : 1);
}

// ---------- единое написание имён: латиница, как в EA FC ----------
const UA = { а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', "'": '', '’': '', ʼ: '' };
const UA_START = { є: 'ye', ї: 'yi', й: 'y', ю: 'yu', я: 'ya' };
const RU = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', і: 'i', ї: 'yi', є: 'ye', ґ: 'g' };
const CYR = /[А-Яа-яЁёІіЇїЄєҐґ]/;
export const hasCyrillic = (s) => CYR.test(s || '');
export function latinName(name, nat) {
  if (!hasCyrillic(name)) return name;
  const ua = nat === 'UKR' || /[ІіЇїЄєҐґ]/.test(name);
  return name
    .split(/(\s+|-)/)
    .map((w) => {
      let out = '';
      const low = w.toLowerCase();
      for (let i = 0; i < low.length; i++) {
        const ch = low[i];
        let t;
        if (ua) {
          if (ch === 'г' && low[i - 1] === 'з') t = 'gh';
          else t = i === 0 && UA_START[ch] ? UA_START[ch] : UA[ch];
        } else {
          t = RU[ch];
          if (ch === 'е' && (i === 0 || 'аеёиоуыэюяъь'.includes(low[i - 1]))) t = 'ye';
        }
        if (t === undefined) t = ch;
        if (w[i] !== low[i] && t) t = t[0].toUpperCase() + t.slice(1);
        out += t;
      }
      return out;
    })
    .join('');
}
