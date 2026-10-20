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
const NEAR = {
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
  // рейтинг игрока на конкретной позиции схемы
  return Math.min(p.ovr, ovrAs(p, slot)) * fitFactor(p.pos, slot);
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
