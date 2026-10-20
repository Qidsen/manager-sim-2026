// Переговоры: трансфер (с клубом), контракт (с игроком), продление, продажа.
// У каждой стороны есть скрытый минимум и запас терпения. Каждое встречное предложение
// сдвигает позицию, слишком наглое — злит. Терпение кончилось — переговоры сорваны.
import { rand, chance, randInt } from './rng';
import { playerValue, wageFor, clamp, money, roundMoney } from './util';
import { movePlayer, mail, news, canTrade } from './sim';
import { levelOfRep } from './gen';
import { NATION_BY_CODE } from '../data/nations';

export const ROLES = {
  key: { label: 'Ключевой игрок', short: 'Ключевой', mult: 1.12, apps: 0.75 },
  first: { label: 'Игрок основы', short: 'Основа', mult: 1.0, apps: 0.55 },
  rotation: { label: 'Ротация', short: 'Ротация', mult: 0.9, apps: 0.3 },
  backup: { label: 'Запасной', short: 'Запас', mult: 0.8, apps: 0.1 },
  prospect: { label: 'Перспективный', short: 'Молодой', mult: 0.85, apps: 0.15 },
};

const today = (W) => W.year * 365 + W.day;
const r100 = (v) => roundMoney(Math.max(0, v));

export function sellerName(W, p) {
  if (p.club) return W.clubs[p.club]?.name || 'клуб';
  if (p.fa) return 'свободный агент';
  return `клуб чемпионата: ${NATION_BY_CODE[p.nat]?.name || p.nat}`;
}

// Какую роль игрок получил бы в составе клуба
export function naturalRole(W, p, clubId) {
  const c = W.clubs[clubId];
  const better = c.squad.map((id) => W.players[id]).filter((x) => x && x.id !== p.id && x.pos === p.pos && x.ovr > p.ovr).length;
  const L = levelOfRep(c.rep);
  if (p.age <= 20 && p.ovr < L) return 'prospect';
  if (p.ovr >= L + 4 && better === 0) return 'key';
  if (p.ovr >= L - 2 && better <= 1) return 'first';
  if (p.ovr >= L - 7) return 'rotation';
  return 'backup';
}
const ROLE_ORDER = ['backup', 'prospect', 'rotation', 'first', 'key'];

// Интерес игрока к переходу
export function interest(W, p, clubId) {
  const my = W.clubs[clubId];
  const cur = p.club ? W.clubs[p.club] : null;
  const L = levelOfRep(my.rep);
  let v = 60;
  if (cur) v += (my.rep - cur.rep) * 2.2;
  else v += 15;
  v -= Math.max(0, p.ovr - L - 4) * 4;
  v += (W.user.rep - 60) * 0.4;
  if (p.mor < 45) v += 12;
  if (p.listed) v += 15;
  return clamp(Math.round(v), 0, 100);
}

// ---------- скрытые позиции сторон ----------
function clubMinFee(W, p) {
  const val = playerValue(p);
  if (!p.club) return p.fa ? 0 : val * (0.9 + rand() * 0.25);
  const c = W.clubs[p.club];
  const rank = c.squad.map((x) => W.players[x]).sort((a, b) => b.ovr - a.ovr).findIndex((x) => x.id === p.id);
  let m = 1.0;
  if (rank < 11) m += 0.25;
  if (rank < 3) m += 0.35;
  const yearsLeft = p.contract - W.year;
  if (yearsLeft <= 0) m -= 0.4;
  else if (yearsLeft === 1) m -= 0.15;
  else if (yearsLeft >= 4) m += 0.1;
  if (p.listed) m -= 0.25;
  if (c.balance < 0) m -= 0.15;
  if (p.age <= 22) m += 0.15;
  return val * clamp(m * (0.92 + rand() * 0.16), 0.35, 2.6);
}

function playerMinWage(W, p, clubId, role, years) {
  const c = W.clubs[clubId];
  let w = wageFor(p.ovr, p.age, c.rep);
  if (p.club && p.club !== clubId) w = Math.max(w, p.wage * 1.12); // переход — только с повышением
  if (p.club === clubId) {
    // продление: от текущей зарплаты, с учётом формы
    const avg = p.st.app ? p.st.rs / p.st.app : 6.6;
    const left = Math.max(0, p.contract - W.year);
    w = Math.max(p.wage * ((avg >= 7.1 ? 1.22 : avg >= 6.7 ? 1.12 : 1.05) - left * 0.015), w);
    if (p.mor < 45) w *= 1.15;
  }
  if (p.fa) w *= clamp(1.15 - (p.faDays || 0) / 300, 0.75, 1.15); // свободный агент со временем сговорчивее
  w *= ROLES[role]?.mult || 1;
  // молодые хотят короткий контракт, ветераны — длинный
  const want = p.age <= 23 ? 3 : p.age >= 31 ? 3 : 4;
  w *= 1 + Math.abs(years - want) * 0.03;
  return w * (0.94 + rand() * 0.12);
}

// ---------- старт переговоров ----------
export function startTalks(W, pid, kind = 'buy') {
  const u = W.user;
  const my = W.clubs[u.club];
  const p = W.players[pid];
  if (!p) return { error: 'Игрок не найден.' };
  W.negs ||= {};
  const old = W.negs[pid];
  if (old && old.status === 'failed' && old.cooldown > today(W)) {
    return { error: `${old.side === 'player' ? p.n : sellerName(W, p)} пока не хочет возвращаться к переговорам (ещё ${old.cooldown - today(W)} дн.).` };
  }
  if (old && old.status === 'open' && old.kind === kind) return { neg: old };

  if (kind === 'renew') {
    if (p.club !== my.id) return { error: 'Это не ваш игрок.' };
    if (p.mor < 25) return { error: `${p.n} недоволен и отказывается обсуждать новый контракт.` };
    const role = naturalRole(W, p, my.id);
    const years = p.age >= 33 ? 1 : 3;
    const min = playerMinWage(W, p, my.id, role, years);
    const neg = {
      pid, kind, status: 'open', stage: 'contract', side: 'player', role, years, bonus: 0,
      wMin: min, wAsk: r100(min * (1.12 + rand() * 0.1)), bonusAsk: r100(min * (4 + rand() * 6)), pat: randInt(3, 5), log: [], started: today(W),
    };
    neg.log.push({ who: 'them', text: `Агент ${p.n}: «Мы готовы обсуждать продление. Ориентир — ${money(neg.wAsk)} в неделю, роль: ${ROLES[role].label.toLowerCase()}».` });
    W.negs[pid] = neg;
    return { neg };
  }

  if (p.club === my.id) return { error: 'Это ваш игрок.' };
  if (p.loan) return { error: 'Игрок в аренде — до конца сезона его не продадут.' };
  if (!p.fa && !canTrade(W)) return { error: 'Трансферное окно закрыто. Со свободными агентами можно договариваться в любое время.' };
  if (my.squad.length >= 36) return { error: 'В составе уже 36 игроков — сначала кого-нибудь отпустите.' };
  const intr = interest(W, p, my.id);
  if (intr < 20) return { error: `${p.n} не заинтересован в переходе: «${my.name}» для него слишком скромный вариант.` };

  const role = naturalRole(W, p, my.id);
  const neg = { pid, kind, status: 'open', side: 'club', role, years: p.age >= 31 ? 2 : 4, bonus: 0, pat: 0, log: [], started: today(W), intr };
  if (kind === 'loan') {
    const seller = W.clubs[p.club];
    if (!seller) return { error: 'Этого игрока нельзя взять в аренду.' };
    const rank = seller.squad.map((x) => W.players[x]).sort((a, b) => b.ovr - a.ovr).findIndex((x) => x.id === p.id);
    if (rank < 13) return { error: `«${seller.name}» рассчитывает на игрока и в аренду его не отдаёт.` };
    neg.stage = 'loan';
    neg.shareMin = clamp(0.5 + (my.rep - seller.rep) / 60 + rand() * 0.2, 0.3, 1); // какую долю зарплаты должен платить арендатор
    neg.shareAsk = clamp(neg.shareMin + 0.2, 0.5, 1);
    neg.feeMin = r100(playerValue(p) * 0.04 * rand());
    neg.pat = randInt(2, 4);
    neg.log.push({ who: 'them', text: `«${seller.name}»: «Можем отпустить в аренду до конца сезона, если вы возьмёте на себя ${Math.round(neg.shareAsk * 100)}% зарплаты${neg.feeMin > 0 ? ` и заплатите ${money(r100(neg.feeMin * 1.3))} за аренду` : ''}».` });
  } else if (p.fa) {
    neg.stage = 'contract';
    neg.side = 'player';
    neg.wMin = playerMinWage(W, p, my.id, role, neg.years);
    neg.wAsk = r100(neg.wMin * (1.15 + rand() * 0.15));
    neg.bonusAsk = r100(neg.wMin * (6 + rand() * 10));
    neg.pat = randInt(3, 5);
    neg.log.push({ who: 'them', text: `Агент ${p.n}: «Мой клиент свободен. Хотим ${money(neg.wAsk)} в неделю и подъёмные ${money(neg.bonusAsk)}».` });
  } else {
    neg.stage = 'fee';
    neg.fMin = clubMinFee(W, p);
    neg.fAsk = r100(neg.fMin * (1.18 + rand() * 0.25));
    neg.pat = randInt(3, 5) + (p.listed ? 1 : 0);
    neg.log.push({ who: 'them', text: `${sellerName(W, p)[0].toUpperCase()}${sellerName(W, p).slice(1)}: «Готовы выслушать предложение. Мы оцениваем игрока в ${money(neg.fAsk)}».` });
  }
  W.negs[pid] = neg;
  return { neg };
}

function fail(W, neg, p, text, days = 21) {
  neg.status = 'failed';
  neg.cooldown = today(W) + days;
  neg.log.push({ who: 'them', text, bad: true });
}

// ---------- предложение по сумме трансфера ----------
export function offerFee(W, pid, fee, installments = false) {
  const neg = W.negs?.[pid];
  const p = W.players[pid];
  const my = W.clubs[W.user.club];
  if (!neg || neg.status !== 'open' || neg.stage !== 'fee') return { error: 'Переговоры не активны.' };
  if (!canTrade(W)) return { error: 'Трансферное окно закрыто.' };
  const upfront = installments ? fee * 0.5 : fee;
  if (upfront > my.balance) return { error: `Не хватает денег: на счету ${money(my.balance)}${installments ? ' (первый платёж — половина суммы)' : ''}.` };
  // рассрочка ценится чуть меньше
  const eff = installments ? fee * 0.93 : fee;
  neg.log.push({ who: 'me', text: `Предлагаем ${money(fee)}${installments ? ' (половина сейчас, половина через год)' : ''}` });
  const who = sellerName(W, p);
  const Who = who[0].toUpperCase() + who.slice(1);
  if (eff >= neg.fMin) {
    neg.fee = fee;
    neg.inst = installments;
    neg.stage = 'contract';
    neg.side = 'player';
    neg.wMin = playerMinWage(W, p, my.id, neg.role, neg.years);
    neg.wAsk = r100(neg.wMin * (1.12 + rand() * 0.15));
    neg.bonusAsk = r100(neg.wMin * (3 + rand() * 6));
    neg.pat = randInt(3, 5);
    neg.log.push({ who: 'them', text: `${Who}: «Договорились!» Теперь — личные условия.`, good: true });
    neg.log.push({ who: 'them', text: `Агент ${p.n}: «Мой клиент хочет ${money(neg.wAsk)} в неделю и подъёмные ${money(neg.bonusAsk)}».` });
    return { ok: true, stage: 'contract' };
  }
  const ratio = eff / neg.fMin;
  neg.pat -= ratio < 0.6 ? 2 : 1;
  if (neg.pat <= 0) {
    fail(W, neg, p, `${Who}: «Мы не видим смысла продолжать. Переговоры окончены».`);
    return { failed: true };
  }
  const prevAsk = neg.fAsk;
  neg.fAsk = r100(Math.max(neg.fMin * 1.01, neg.fAsk - (neg.fAsk - eff) * (0.25 + rand() * 0.2)));
  const tone = ratio < 0.6 ? 'Это несерьёзно.' : ratio < 0.85 ? 'Далеко от наших ожиданий.' : 'Мы близки.';
  neg.log.push({ who: 'them', text: `${Who}: «${tone} ${neg.fAsk < prevAsk ? 'Готовы уступить' : 'Наша цена'} — ${money(neg.fAsk)}».` });
  return { counter: neg.fAsk };
}

// ---------- личные условия ----------
export function offerContract(W, pid, { wage, years, bonus = 0, role }) {
  const neg = W.negs?.[pid];
  const p = W.players[pid];
  const my = W.clubs[W.user.club];
  if (!neg || neg.status !== 'open' || neg.stage !== 'contract') return { error: 'Переговоры не активны.' };
  if (bonus + (neg.fee && !neg.inst ? neg.fee : (neg.fee || 0) / 2) > my.balance) return { error: `Не хватает денег на сделку: на счету ${money(my.balance)}.` };
  // роль: игрок не согласится быть ниже, чем заслуживает
  const nat = naturalRole(W, p, my.id);
  const roleTxt = ROLES[role].label.toLowerCase();
  neg.log.push({ who: 'me', text: `${money(wage)}/нед., ${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}, подъёмные ${money(bonus)}, роль: ${roleTxt}.` });
  if (ROLE_ORDER.indexOf(role) < ROLE_ORDER.indexOf(nat) - 1 && role !== 'prospect') {
    neg.pat -= 1;
    if (neg.pat <= 0) { fail(W, neg, p, `Агент ${p.n}: «Мой клиент не будет сидеть в запасе. Мы уходим».`, 30); return { failed: true }; }
    neg.log.push({ who: 'them', text: `Агент ${p.n}: «Роль «${roleTxt}» нас не устраивает. Мой клиент рассчитывает минимум на роль «${ROLES[nat].label.toLowerCase()}»».` });
    return { counter: true };
  }
  if (p.age >= 34 && years > 2) {
    neg.log.push({ who: 'them', text: `Агент ${p.n}: «В его возрасте клуб, честно говоря, переплачивает за такой срок — но мы не против!»` });
  }
  const need = playerMinWageFor(neg, p, role, years);
  const eff = wage + bonus / (years * 52) * 0.9;
  if (eff >= need) {
    return complete(W, neg, p, { wage, years, bonus, role });
  }
  const ratio = eff / need;
  neg.pat -= ratio < 0.7 ? 2 : 1;
  if (neg.pat <= 0) {
    fail(W, neg, p, `Агент ${p.n}: «Похоже, мы не найдём общий язык. Удачи».`);
    return { failed: true };
  }
  neg.wAsk = r100(Math.max(need * 1.01 - bonus / (years * 52) * 0.9, neg.wAsk - (neg.wAsk - wage) * (0.3 + rand() * 0.2)));
  const hint = bonus < neg.bonusAsk * 0.5 ? ` Можем уступить по зарплате, если увеличите подъёмные.` : '';
  neg.log.push({ who: 'them', text: `Агент ${p.n}: «${ratio < 0.8 ? 'Это намного меньше, чем он стоит.' : 'Почти договорились.'} Нам нужно ${money(neg.wAsk)} в неделю.${hint}»` });
  return { counter: neg.wAsk };
}

function playerMinWageFor(neg, p, role, years) {
  // пересчитываем минимум относительно роли и срока, сохранив «характер» игрока
  const base = neg.wMin / ((ROLES[neg.role]?.mult || 1) * (1 + Math.abs(neg.years - (p.age <= 23 ? 3 : p.age >= 31 ? 3 : 4)) * 0.03));
  const want = p.age <= 23 ? 3 : p.age >= 31 ? 3 : 4;
  return base * (ROLES[role]?.mult || 1) * (1 + Math.abs(years - want) * 0.03);
}

function complete(W, neg, p, { wage, years, bonus, role }) {
  const my = W.clubs[W.user.club];
  neg.status = 'done';
  if (neg.kind === 'renew') {
    p.wage = Math.round(wage);
    p.contract = W.year + clamp(years, 1, 5);
    p.role = role;
    p.mor = clamp(p.mor + 8, 0, 100);
    my.balance -= bonus;
    my.fin.wages += bonus;
    neg.log.push({ who: 'them', text: `Агент ${p.n}: «Подписываем!» Контракт до лета ${p.contract + 1}.`, good: true });
    return { done: true, msg: `${p.n} продлил контракт до лета ${p.contract + 1}. Зарплата: ${money(p.wage)}/нед.` };
  }
  const from = sellerName(W, p);
  const fee = neg.fee || 0;
  const now = neg.inst ? Math.round(fee / 2) : fee;
  p.wage = Math.round(wage);
  p.contract = W.year + clamp(years, 1, 5) - 1;
  p.role = role;
  p.faDays = 0;
  movePlayer(W, p, my.id, now);
  if (neg.inst && fee - now > 0) (W.debts ||= []).push({ club: my.id, amount: fee - now, due: today(W) + 365, to: from });
  my.balance -= bonus;
  my.fin.buys += bonus;
  neg.log.push({ who: 'them', text: `Агент ${p.n}: «Мы согласны!» ${p.n} подписывает контракт до лета ${p.contract + 1}.`, good: true });
  mail(W, `Новичок: ${p.n}`, `${p.n} подписал контракт до лета ${p.contract + 1}. Трансфер: ${fee ? money(fee) : 'бесплатно'}${neg.inst ? ' (в рассрочку)' : ''}. Зарплата: ${money(p.wage)}/нед. Подъёмные: ${money(bonus)}. Роль: ${ROLES[role].label.toLowerCase()}.`);
  news(W, `${p.n} переходит из «${from}» в «${my.name}» за ${fee ? money(fee) : 'бесплатно'}`);
  return { done: true, msg: `Сделка закрыта! ${p.n} — ваш игрок.` };
}

// ---------- аренда ----------
export function offerLoan(W, pid, share, fee = 0) {
  const neg = W.negs?.[pid];
  const p = W.players[pid];
  const my = W.clubs[W.user.club];
  if (!neg || neg.status !== 'open' || neg.stage !== 'loan') return { error: 'Переговоры не активны.' };
  if (!canTrade(W)) return { error: 'Трансферное окно закрыто.' };
  if (fee > my.balance) return { error: 'Не хватает денег.' };
  const seller = W.clubs[p.club];
  neg.log.push({ who: 'me', text: `Платим ${Math.round(share * 100)}% зарплаты${fee ? ` и ${money(fee)} за аренду` : ''}` });
  const score = share - neg.shareMin + (fee - neg.feeMin) / Math.max(1, p.wage * 40);
  if (score >= -0.001) {
    neg.status = 'done';
    movePlayer(W, p, my.id, fee, { loan: true });
    p.loan.share = share;
    neg.log.push({ who: 'them', text: `«${seller.name}»: «Договорились. Удачи ему у вас!»`, good: true });
    mail(W, `Аренда: ${p.n}`, `${p.n} перешёл в аренду из «${seller.name}» до конца сезона. Вы платите ${Math.round(share * 100)}% его зарплаты.`);
    return { done: true, msg: `${p.n} взят в аренду до конца сезона.` };
  }
  neg.pat -= 1;
  if (neg.pat <= 0) { fail(W, neg, p, `«${seller.name}»: «Мы передумали отпускать игрока».`); return { failed: true }; }
  neg.shareAsk = clamp(Math.max(neg.shareMin, neg.shareAsk - (neg.shareAsk - share) * 0.4), 0.3, 1);
  neg.log.push({ who: 'them', text: `«${seller.name}»: «Нужно, чтобы вы платили хотя бы ${Math.round(neg.shareAsk * 100)}% зарплаты».` });
  return { counter: neg.shareAsk };
}

export function cancelTalks(W, pid) {
  const neg = W.negs?.[pid];
  if (!neg || neg.status !== 'open') return;
  neg.status = 'failed';
  neg.cooldown = today(W) + 3;
  neg.log.push({ who: 'me', text: 'Мы выходим из переговоров.' });
}

// ---------- продажа: торг с покупателем ----------
export function counterOffer(W, offerId, ask) {
  const o = W.offers.find((x) => x.id === offerId);
  if (!o) return { error: 'Предложение больше не действует.' };
  const p = W.players[o.pid];
  const b = W.clubs[o.from];
  o.log ||= [{ who: 'them', text: `«${b.name}»: «Предлагаем ${money(o.fee)}».` }];
  o.log.push({ who: 'me', text: `Хотим ${money(ask)}` });
  if (o.max === undefined) o.max = o.fee * (1.08 + rand() * 0.3);
  if (o.pat === undefined) o.pat = randInt(2, 3);
  if (ask <= o.max) {
    o.fee = r100(ask);
    o.log.push({ who: 'them', text: `«${b.name}»: «Согласны на ${money(o.fee)}». Осталось подтвердить сделку.`, good: true });
    o.agreed = true;
    return { agreed: true };
  }
  o.pat -= ask > o.max * 1.4 ? 2 : 1;
  if (o.pat <= 0) {
    W.offers = W.offers.filter((x) => x.id !== offerId);
    o.log.push({ who: 'them', text: `«${b.name}»: «Слишком дорого. Мы ищем другие варианты».`, bad: true });
    mail(W, `«${b.name}» отказался от ${p.n}`, `Переговоры о продаже ${p.n} сорваны: покупатель счёл цену завышенной.`);
    return { failed: true, log: o.log };
  }
  o.fee = r100(Math.min(o.max, o.fee + (ask - o.fee) * (0.35 + rand() * 0.25)));
  o.log.push({ who: 'them', text: `«${b.name}»: «Можем поднять до ${money(o.fee)}, не больше».` });
  return { counter: o.fee };
}

// Платежи по рассрочке
export function processDebts(W) {
  if (!W.debts?.length) return;
  const t = today(W);
  W.debts = W.debts.filter((d) => {
    if (d.due > t) return true;
    const c = W.clubs[d.club];
    if (c) {
      c.balance -= d.amount;
      c.fin.buys += d.amount;
      if (W.user?.club === c.id) mail(W, 'Платёж по рассрочке', `Выплачено ${money(d.amount)} — второй платёж за трансфер (${d.to}).`);
    }
    return false;
  });
}
