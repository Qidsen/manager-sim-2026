// Расписание: круговые турниры, швейцарская система, сетка плей-офф и календарь сезона.
import { shuffle, rand } from './rng';

// Двухкруговой (или n-круговой) турнир методом «карусели». Возвращает массив туров: [[h,a],...]
export function roundRobin(teams, legs = 2) {
  const t = shuffle(teams);
  if (t.length % 2) t.push(null);
  const n = t.length;
  const rounds = [];
  const arr = t.slice();
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a === null || b === null) continue;
      pairs.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    arr.splice(1, 0, arr.pop());
  }
  const out = [];
  for (let l = 0; l < legs; l++) {
    for (const r of rounds) out.push(r.map(([h, a]) => (l % 2 === 0 ? [h, a] : [a, h])));
  }
  return out;
}

// Швейцарская система: каждый играет nRounds матчей с разными соперниками
export function swissPairings(teams, nRounds, countryOf) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const met = new Set();
    const home = Object.fromEntries(teams.map((t) => [t, 0]));
    const rounds = [];
    let ok = true;
    for (let r = 0; r < nRounds && ok; r++) {
      let done = false;
      for (let tries = 0; tries < 200 && !done; tries++) {
        const pool = shuffle(teams);
        const pairs = [];
        const used = new Set();
        let fail = false;
        for (const a of pool) {
          if (used.has(a)) continue;
          used.add(a);
          const strict = tries < 150;
          const b = pool.find((x) => !used.has(x) && !met.has(key(a, x)) && (!strict || countryOf(a) !== countryOf(x)));
          if (!b) { fail = true; break; }
          used.add(b);
          pairs.push(home[a] <= home[b] ? [a, b] : [b, a]);
        }
        if (fail) continue;
        for (const [h, a] of pairs) {
          met.add(key(h, a));
          home[h]++;
        }
        rounds.push(pairs);
        done = true;
      }
      if (!done) ok = false;
    }
    if (ok) return rounds;
  }
  // запасной вариант — просто случайные пары
  return Array.from({ length: nRounds }, () => {
    const p = shuffle(teams);
    const pairs = [];
    for (let i = 0; i + 1 < p.length; i += 2) pairs.push([p[i], p[i + 1]]);
    return pairs;
  });
}
const key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

// Порядок посева для сетки: 1 и 2 встречаются только в финале
export function bracketOrder(n) {
  let order = [1];
  while (order.length < n) {
    const m = order.length * 2 + 1;
    const next = [];
    for (const s of order) next.push(s, m - s);
    order = next;
  }
  return order.map((x) => x - 1);
}

// Разбивка на группы «корзинами» по силе: teams уже отсортированы по силе
export function potGroups(teams, nGroups) {
  const groups = Array.from({ length: nGroups }, () => []);
  const pots = [];
  for (let i = 0; i < teams.length; i += nGroups) pots.push(shuffle(teams.slice(i, i + nGroups)));
  for (const pot of pots) {
    const order = shuffle([...Array(nGroups).keys()]).sort((a, b) => groups[a].length - groups[b].length);
    pot.forEach((t, i) => groups[order[i]].push(t));
  }
  return groups;
}

// ---- календарь сезона (день 0 = 1 июля, среда) ----
export const SAT = 3; // day % 7 === 3 -> суббота
export const INTL_DAYS = [65, 68, 100, 103, 135, 138, 268, 271, 336, 339];
export const SUMMER_DAYS = [344, 347, 350, 353, 356, 359, 362, 364];
export const LEAGUE_START = 38; // 8 августа
export const LEAGUE_END = 326; // ~23 мая
export const WINDOWS = [[0, 62], [184, 214]]; // трансферные окна: лето и январь

export function isWindow(day) {
  return WINDOWS.some(([a, b]) => day >= a && day <= b);
}

function saturdays() {
  const out = [];
  for (let d = LEAGUE_START; d <= LEAGUE_END; d += 7) {
    if (INTL_DAYS.some((x) => Math.abs(x - d) <= 2)) continue;
    out.push(d);
  }
  return out;
}

export function leagueDates(nRounds) {
  const sats = saturdays();
  if (nRounds <= sats.length) {
    // равномерно выбираем субботы
    const out = [];
    for (let i = 0; i < nRounds; i++) out.push(sats[Math.round((i * (sats.length - 1)) / Math.max(1, nRounds - 1))]);
    return dedupe(out);
  }
  // не хватает суббот — добавляем вторники
  const tues = [];
  for (let d = LEAGUE_START + 3; d <= LEAGUE_END; d += 7) {
    if (!INTL_DAYS.some((x) => Math.abs(x - d) <= 3)) tues.push(d);
  }
  const need = nRounds - sats.length;
  const extra = [];
  for (let i = 0; i < need; i++) extra.push(tues[Math.floor(((i + 0.5) * tues.length) / need)]);
  return [...sats, ...extra].sort((a, b) => a - b).slice(0, nRounds);
}
function dedupe(arr) {
  const out = [];
  for (const d of arr) {
    let x = d;
    while (out.includes(x)) x += 7;
    out.push(x);
  }
  return out;
}

// Будни: вт = day%7==6, ср = 0, чт = 1
const tue = (d) => d - ((d - 6 + 700) % 7);
export const DATES = {
  // Лига чемпионов (вт) / Лига Европы и Лига конференций (чт)
  uclSwiss: [76, 90, 111, 125, 146, 160, 202, 209].map(tue),
  uelSwiss: [78, 92, 113, 127, 148, 162, 204, 211],
  ueclSwiss: [78, 92, 113, 127, 148, 162],
  uclKo: [[230, 237], [251, 258], [279, 286], [300, 307], [333]],
  uelKo: [[232, 239], [253, 260], [281, 288], [302, 309], [323]],
  ueclKo: [[232, 239], [253, 260], [281, 288], [302, 309], [330]],
  // Либертадорес (вт) и Азиатская ЛЧ (вт): группы и плей-офф
  libGroups: [76, 90, 111, 125, 146, 160].map(tue).map((d) => d + 7 * 0),
  libKo: [[230, 237], [251, 258], [279, 286], [300, 307], [333]],
  afcGroups: [76, 90, 111, 125, 146, 160].map(tue),
  afcKo: [[230, 237], [251], [279], [319]],
  // Кубок чемпионов КОНКАКАФ (чт)
  concKo: [[232, 239], [253, 260], [281, 288], [302, 309], [323]],
  // национальные кубки (ср)
  cup: [84, 119, 154, 196, 224, 252, 294, 322],
};

export function cupDatesFor(nRounds) {
  return DATES.cup.slice(DATES.cup.length - nRounds);
}

export function randomTieOrder(a, b) {
  return rand() < 0.5 ? [a, b] : [b, a];
}
