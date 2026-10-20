// Пресс-конференции, неожиданные события и соцсети (как в карьере FC 27).
import { rand, randInt, chance, pick, shuffle } from './rng';
import { clamp, money, POS_RU, playerValue } from './util';
import { teamName, teamRep, isUserTeam } from './teams';
import { levelOfRep } from './gen';
import { squadRanks } from './career';

const today = (W) => W.year * 365 + W.day;
const sur = (p) => (p ? p.n.split(' ').slice(-1)[0] : '');

// ================= соцсети и слухи =================
const FAN_HANDLES = ['@ультрас_{s}', '@{s}_фанат', '@трибуна_{s}', '@сектор12_{s}'];
const MEDIA = ['@ИнсайдерТрансферов', '@ФутболСейчас', '@ТактикаПро', '@Трансферный_рынок', '@ГлавныйСпорт'];
export function social(W, who, text, tone = 0) {
  (W.social ||= []).unshift({ y: W.year, d: W.day, who, text, tone });
  if (W.social.length > 120) W.social.length = 120;
}
function fanHandle(W) {
  const c = W.clubs[W.user.club];
  return pick(FAN_HANDLES).replace('{s}', (c?.short || 'club').toLowerCase());
}
export function rumour(W, text) {
  social(W, pick(MEDIA), text, 0);
}

// Реакция соцсетей на подписание игрока
export function onUserSigning(W, p, fee) {
  const c = W.clubs[W.user.club];
  const L = levelOfRep(c.rep);
  const diff = p.ovr - L;
  const tone = diff >= 3 ? 1 : diff <= -6 ? -1 : 0;
  const t = tone > 0 ? pick([`${sur(p)} у нас!!! Вот это трансфер 🔥`, `Руководство наконец-то сделало громкий трансфер. ${sur(p)} — топ!`, `Не верю своим глазам: ${p.n} в «${c.name}» 😍`])
    : tone < 0 ? pick([`${p.n}? Серьёзно? Нам нужны усиления, а не это…`, `Ну и кто такой ${sur(p)}? ${fee ? `Ещё и ${money(fee)} отдали 🤦` : ''}`, `Очередной «перспективный». Ждём реальных игроков.`])
    : pick([`Неплохое подписание. Посмотрим на ${sur(p)} в деле.`, `${sur(p)} закроет дыру в составе. Ок 👍`, `Добро пожаловать, ${sur(p)}!`]);
  social(W, fanHandle(W), t, tone);
  W.user.fans = clamp((W.user.fans ?? 60) + tone * 4, 0, 100);
}

// После матча — эмоции фанатов
export function onUserResult(W, my, th, opp, compName) {
  const r = my > th ? 1 : my < th ? -1 : 0;
  const u = W.user;
  u.fans = clamp((u.fans ?? 60) + r * 2 + (my - th >= 3 ? 2 : 0) - (th - my >= 3 ? 3 : 0), 0, 100);
  if (!chance(r === 0 ? 0.25 : 0.45)) return;
  const o = teamName(W, opp);
  const t = r > 0
    ? pick([`${my}:${th}! Разнесли «${o}» 💪`, `Вот это характер! Победа над «${o}»`, `Тренер — гений, так и запишите ${my - th >= 3 ? '🔥🔥🔥' : ''}`, `Три очка — и спать спокойно 😌`])
    : r < 0
      ? pick([`Позор. ${my}:${th} от «${o}»…`, `Где игра? Где тактика? ${u.fans < 35 ? 'Тренера — в отставку!' : ''}`, `Опять проиграли. Сколько можно…`, `Сегодня было стыдно смотреть.`])
      : pick([`Ничья с «${o}». Ни рыба ни мясо.`, `${my}:${th}. Могли и выиграть.`, `Очко в копилку, но игра так себе.`]);
  social(W, fanHandle(W), t, r);
  if (u.fans < 25 && chance(0.3)) social(W, pick(MEDIA), `Фанаты «${W.clubs[u.club].name}» требуют отставки тренера ${u.name}.`, -1);
}

// ================= пресс-конференции =================
// Не после каждого матча, а после важных: крупный счёт, топ-соперник, серии, кубки.
export function maybePress(W, S, myIdx, opp, comp) {
  const u = W.user;
  if (!u?.club || W.press) return;
  const my = S.score[myIdx];
  const th = S.score[1 - myIdx];
  const c = W.clubs[u.club];
  u.streak = my > th ? Math.max(1, (u.streak || 0) + 1) : my < th ? Math.min(-1, (u.streak || 0) - 1) : 0;
  const big = Math.abs(my - th) >= 3;
  const topOpp = teamRep(W, opp) >= c.rep - 2;
  const cupKo = comp.kind === 'cup';
  const st = Math.abs(u.streak);
  const trig = big || (topOpp && chance(0.35)) || (cupKo && chance(0.25)) || st === 3 || st === 5 || (u.conf < 35 && chance(0.3)) || chance(0.05);
  if (!trig || today(W) - (u.lastPress || -99) < 6) return;
  u.lastPress = today(W);
  const side = myIdx === 0 ? S.h : S.a;
  const played = [...side.played].map((id) => ({ p: W.players[id], r: S.rating[id] ?? 6.2 })).filter((x) => x.p);
  played.sort((a, b) => b.r - a.r);
  const star = played[0];
  const flop = played[played.length - 1];
  const qs = [];
  const res = my > th ? 'W' : my < th ? 'L' : 'D';
  const o = teamName(W, opp);
  if (res === 'W') qs.push({ q: `${my}:${th} против «${o}». ${big ? 'Разгром!' : 'Важная победа.'} Можно говорить, что команда вышла на пик?`, opts: [
    { t: 'Мы только начинаем — дальше будет лучше', fx: { team: 3, style: 'bold', fans: 3 } },
    { t: 'Это всего лишь три очка, работаем дальше', fx: { team: 1, style: 'calm', conf: 1 } },
    { t: 'Соперник сегодня сам нам помог', fx: { team: -2, style: 'calm' } },
  ] });
  if (res === 'L') qs.push({ q: `Поражение от «${o}» ${my}:${th}. Что пошло не так?`, opts: [
    { t: 'Вся ответственность на мне', fx: { team: 3, conf: -1, style: 'calm' } },
    { t: 'Игроки сегодня не выполнили установку', fx: { team: -4, conf: 1, style: 'harsh' } },
    { t: 'Судья решил исход матча', fx: { team: 2, fans: 3, style: 'bold', fine: true } },
  ] });
  if (res === 'D') qs.push({ q: `Ничья с «${o}». Довольны результатом?`, opts: [
    { t: 'Нет, мы должны были побеждать', fx: { team: -1, conf: 1, style: 'harsh' } },
    { t: 'Ничья — справедливый итог', fx: { team: 1, style: 'calm' } },
    { t: 'В следующий раз заберём своё', fx: { team: 2, fans: 1, style: 'bold' } },
  ] });
  if (star && star.r >= 7.3) qs.push({ q: `${star.p.n} провёл отличный матч (${star.r.toFixed(1)}). Как оцените его игру?`, opts: [
    { t: `${sur(star.p)} — лучший игрок команды`, fx: { pid: star.p.id, pm: 7, team: -1, style: 'bold' } },
    { t: 'Это заслуга всей команды', fx: { team: 2, pid: star.p.id, pm: -2, style: 'calm' } },
    { t: 'Он может ещё лучше', fx: { pid: star.p.id, pm: -3, frm: 0.4, style: 'harsh' } },
  ] });
  if (flop && flop.r < 5.9 && flop.p !== star?.p) qs.push({ q: `${flop.p.n} провалил матч (${flop.r.toFixed(1)}). Он сохранит место в составе?`, opts: [
    { t: 'Я в него верю — у всех бывают плохие дни', fx: { pid: flop.p.id, pm: 7, style: 'calm' } },
    { t: 'Место в основе нужно заслужить', fx: { pid: flop.p.id, pm: -8, team: 1, style: 'harsh' } },
    { t: 'Обсуждать отдельных игроков не буду', fx: {} },
  ] });
  const open = Object.values(W.negs || {}).find((n) => n.status === 'open' && n.kind === 'buy' && W.players[n.pid]);
  if (open && chance(0.7)) {
    const tp = W.players[open.pid];
    qs.push({ q: `Ходят слухи, что клуб ведёт переговоры с ${tp.n}. Это правда?`, opts: [
      { t: 'Да, это игрок нашего уровня', fx: { fans: 3, style: 'bold', neg: { pid: tp.id, d: 1.05 } } },
      { t: 'Без комментариев', fx: { style: 'calm' } },
      { t: 'Слухи есть слухи', fx: { pid: tp.id, intr: -1 } },
    ] });
  }
  if (u.conf < 40) qs.push({ q: 'Говорят, правление недовольно и вы на грани отставки. Что скажете?', opts: [
    { t: 'Я уверен в своей работе и в команде', fx: { team: 2, style: 'bold' } },
    { t: 'Решения принимает правление, я делаю свою работу', fx: { conf: 2, style: 'calm' } },
    { t: 'Мне нужны деньги на усиление', fx: { conf: -3, fans: 2, style: 'harsh' } },
  ] });
  // следующий соперник
  const nxt = nextUserOpp(W);
  if (nxt && qs.length < 3) qs.push({ q: `Дальше — «${teamName(W, nxt.opp)}». Ваш прогноз?`, opts: [
    { t: 'Мы выиграем, обещаю', fx: { team: 3, fans: 2, style: 'bold', promise: nxt } },
    { t: 'Уважаем соперника, будет сложно', fx: { team: 1, style: 'calm' } },
    { t: 'Думаем только о себе', fx: { style: 'calm' } },
  ] });
  W.press = { id: `pr${today(W)}`, at: today(W), title: `После матча с «${o}» (${my}:${th})`, qs: qs.slice(0, 3), i: 0, picks: [] };
  return true;
}

function nextUserOpp(W) {
  const u = W.user;
  for (let d = W.day + 1; d < Math.min(365, W.day + 20); d++) {
    for (const e of W.sched[d] || []) {
      const st = W.comps[e.c]?.stages[e.s];
      for (const m of st?.rounds[e.r] || []) {
        if (m.h === u.club || m.a === u.club) return { opp: m.h === u.club ? m.a : m.h, day: d, y: W.year };
      }
    }
  }
  return null;
}

export function answerPress(W, optIdx) {
  const pr = W.press;
  if (!pr) return null;
  const q = pr.qs[pr.i];
  const o = q.opts[optIdx];
  pr.picks.push(optIdx);
  const fx = o.fx || {};
  const u = W.user;
  const c = W.clubs[u.club];
  const notes = [];
  if (fx.team) {
    for (const id of c.squad) { const p = W.players[id]; if (p) p.mor = clamp(p.mor + fx.team, 5, 100); }
    notes.push(`мораль команды ${fx.team > 0 ? '+' : ''}${fx.team}`);
  }
  if (fx.pid && fx.pm) {
    const p = W.players[fx.pid];
    if (p) { p.mor = clamp(p.mor + fx.pm, 5, 100); notes.push(`${sur(p)}: мораль ${fx.pm > 0 ? '+' : ''}${fx.pm}`); }
  }
  if (fx.pid && fx.frm) { const p = W.players[fx.pid]; if (p) p.frm = clamp((p.frm || 0) + fx.frm, -3, 3); }
  if (fx.conf) { u.conf = clamp(u.conf + fx.conf, 0, 100); notes.push(`правление ${fx.conf > 0 ? '+' : ''}${fx.conf}`); }
  if (fx.fans) { u.fans = clamp((u.fans ?? 60) + fx.fans, 0, 100); notes.push(`фанаты ${fx.fans > 0 ? '+' : ''}${fx.fans}`); }
  if (fx.style) { u.style ||= { calm: 0, bold: 0, harsh: 0 }; u.style[fx.style]++; }
  if (fx.fine && chance(0.5)) {
    const amt = Math.round((20000 + c.rep * 1500) / 1000) * 1000;
    c.balance -= amt;
    c.fin.staff += amt;
    notes.push(`штраф за критику судьи ${money(amt)}`);
  }
  if (fx.neg) { const n = W.negs?.[fx.neg.pid]; if (n && n.fMin) n.fMin *= fx.neg.d; notes.push('продавец поднял ожидания'); }
  if (fx.promise) u.promise = fx.promise;
  social(W, pick(MEDIA), `${u.name}: «${o.t}»`, 0);
  pr.i++;
  if (pr.i >= pr.qs.length) W.press = null;
  return notes.join(', ');
}
export function skipPress(W) {
  if (!W.press) return;
  W.user.conf = clamp(W.user.conf - 1, 0, 100);
  W.user.fans = clamp((W.user.fans ?? 60) - 2, 0, 100);
  social(W, pick(MEDIA), `${W.user.name} проигнорировал пресс-конференцию.`, -1);
  W.press = null;
}

// Обещание победы: проверяем после матча
export function checkPromise(W, opp, my, th) {
  const pm = W.user.promise;
  if (!pm || pm.opp !== opp) return;
  W.user.promise = null;
  const c = W.clubs[W.user.club];
  if (my > th) {
    for (const id of c.squad) { const p = W.players[id]; if (p) p.mor = clamp(p.mor + 2, 5, 100); }
    social(W, fanHandle(W), 'Тренер обещал победу — тренер сделал! 👏', 1);
  } else {
    for (const id of c.squad) { const p = W.players[id]; if (p) p.mor = clamp(p.mor - 3, 5, 100); }
    W.user.conf = clamp(W.user.conf - 2, 0, 100);
    social(W, fanHandle(W), 'Ну и где обещанная победа? Болтовня…', -1);
  }
}

export function managerStyle(u) {
  const s = u.style || {};
  const tot = (s.calm || 0) + (s.bold || 0) + (s.harsh || 0);
  if (tot < 3) return { ru: 'Образ ещё складывается', d: 'Отвечайте на вопросы журналистов — так формируется ваш образ.' };
  const top = ['calm', 'bold', 'harsh'].sort((a, b) => (s[b] || 0) - (s[a] || 0))[0];
  return {
    calm: { ru: 'Дипломат', d: 'Сдержанный и рассудительный. Игроки ценят спокойствие, правление — предсказуемость.' },
    bold: { ru: 'Харизматичный лидер', d: 'Громкие заявления и вера в команду. Фанаты обожают, но обещания нужно выполнять.' },
    harsh: { ru: 'Жёсткий наставник', d: 'Требовательный и прямой. Держит раздевалку в тонусе, но может её потерять.' },
  }[top];
}

// ================= неожиданные события =================
const EVENT_KINDS = ['conflict', 'late', 'traininj', 'fine', 'sponsor', 'contract', 'interest', 'youngtime'];

export function weeklyEvents(W) {
  const u = W.user;
  if (!u?.club) return null;
  // эскалации ранее проигнорированных событий
  const now = today(W);
  const due = (W.evQueue || []).filter((e) => e.at <= now);
  W.evQueue = (W.evQueue || []).filter((e) => e.at > now);
  for (const e of due) {
    const ev = followUp(W, e);
    if (ev) { (W.events ||= []).push(ev); return ev; }
  }
  if ((W.events || []).length >= 2 || W.day < 14 || !chance(0.14)) return null;
  for (const kind of shuffle(EVENT_KINDS.slice())) {
    const ev = makeEvent(W, kind);
    if (ev) { (W.events ||= []).push(ev); return ev; }
  }
  return null;
}

function squadPlayers(W) {
  const c = W.clubs[W.user.club];
  return c.squad.map((id) => W.players[id]).filter((p) => p && !p.loan);
}

function makeEvent(W, kind) {
  const c = W.clubs[W.user.club];
  const ps = squadPlayers(W);
  const ranks = squadRanks(W, c.id);
  const id = `ev${today(W)}${kind}`;
  if (kind === 'conflict') {
    const cands = shuffle(ps.filter((p) => p.inj <= 0));
    const a = cands.find((p) => ['star', 'key'].includes(ranks[p.id])) || cands[0];
    const b = cands.find((p) => p !== a);
    if (!a || !b) return null;
    return { id, kind, title: 'Конфликт в раздевалке', text: `${a.n} и ${b.n} повздорили на тренировке — дело чуть не дошло до драки. Команда ждёт вашей реакции.`, data: { a: a.id, b: b.id },
      opts: [{ t: `Встать на сторону ${sur(a)}`, k: 'a' }, { t: `Встать на сторону ${sur(b)}`, k: 'b' }, { t: 'Оштрафовать обоих', k: 'fine' }, { t: 'Не вмешиваться', k: 'ignore' }] };
  }
  if (kind === 'late') {
    const p = pick(ps);
    if (!p) return null;
    return { id, kind, title: 'Опоздание на тренировку', text: `${p.n} опоздал на тренировку на 40 минут и даже не извинился.`, data: { p: p.id },
      opts: [{ t: 'Оштрафовать на недельную зарплату', k: 'fine' }, { t: 'Простить на первый раз', k: 'forgive' }, { t: 'Отстранить от следующего матча', k: 'bench' }] };
  }
  if (kind === 'traininj') {
    const p = pick(ps.filter((x) => x.inj <= 0 && ['star', 'key', 'first'].includes(ranks[x.id])));
    if (!p) return null;
    const days = randInt(8, 24);
    p.inj = days;
    p.frag = 0;
    const cost = Math.round((60000 + c.rep * 3000) / 1000) * 1000;
    return { id, kind, title: `Травма на тренировке: ${p.n}`, text: `${p.n} неудачно приземлился в борьбе и выбыл примерно на ${Math.ceil(days / 7)} нед. Врачи предлагают варианты.`, data: { p: p.id, cost },
      opts: [{ t: 'Лечиться в клубе', k: 'club' }, { t: `Лучший специалист (${money(cost)}) — быстрее вдвое`, k: 'pro' }] };
  }
  if (kind === 'fine') {
    const amt = Math.round((80000 + c.rep * 6000) / 1000) * 1000;
    return { id, kind, title: 'Штраф лиги', text: `Дисциплинарный комитет оштрафовал клуб на ${money(amt)} за пиротехнику на трибунах.`, data: { amt },
      opts: [{ t: 'Заплатить', k: 'pay' }, { t: 'Подать апелляцию (может удвоить)', k: 'appeal' }] };
  }
  if (kind === 'sponsor') {
    const amt = Math.round((150000 + (c.rep - 40) ** 2 * 900) / 1000) * 1000;
    return { id, kind, title: 'Предложение спонсора', text: `Спонсор готов заплатить ${money(amt)} за рекламную съёмку с игроками основы. Съёмка займёт день — игроки потеряют свежесть.`, data: { amt },
      opts: [{ t: 'Согласиться', k: 'yes' }, { t: 'Отказаться — важнее подготовка', k: 'no' }] };
  }
  if (kind === 'contract') {
    const p = ps.filter((x) => ['star', 'key'].includes(ranks[x.id]) && x.contract <= W.year + 1).sort((a, b) => b.ovr - a.ovr)[0];
    if (!p) return null;
    return { id, kind, title: `${p.n} хочет новый контракт`, text: `Агент ${p.n} намекает: игрок ждёт нового предложения, иначе начнёт слушать другие клубы.`, data: { p: p.id },
      opts: [{ t: 'Начать переговоры о продлении', k: 'talk' }, { t: 'Пообещать вернуться к вопросу позже', k: 'later' }, { t: 'Отказать', k: 'no' }] };
  }
  if (kind === 'interest') {
    const p = ps.filter((x) => ['star', 'key'].includes(ranks[x.id])).sort((a, b) => b.ovr - a.ovr)[0];
    if (!p) return null;
    const buyer = Object.values(W.clubs).filter((x) => x.id !== c.id && x.rep >= c.rep + 3 && x.balance > playerValue(p)).sort((a, b) => b.rep - a.rep)[randInt(0, 2)];
    if (!buyer) return null;
    rumour(W, `«${buyer.name}» следит за ${p.n} из «${c.name}». Игрок не против перехода.`);
    return { id, kind, title: `«${buyer.name}» интересуется ${p.n}`, text: `СМИ пишут, что «${buyer.name}» хочет забрать ${p.n}. Игрок взволнован — ему нужна ваша позиция.`, data: { p: p.id, b: buyer.id },
      opts: [{ t: 'Заявить публично: не продаётся', k: 'no' }, { t: 'Готовы выслушать предложения', k: 'open' }] };
  }
  if (kind === 'youngtime') {
    const p = ps.filter((x) => x.age <= 21 && x.pot - x.ovr >= 6 && x.st.app <= 3).sort((a, b) => b.pot - a.pot)[0];
    if (!p) return null;
    return { id, kind, title: `${p.n} просит игровое время`, text: `${p.n} (${p.age} лет, ${POS_RU[p.pos]}) пришёл в кабинет: он хочет больше играть, иначе попросится в аренду.`, data: { p: p.id, apps: p.st.app },
      opts: [{ t: 'Пообещать минуты в ближайших матчах', k: 'promise' }, { t: 'Пусть ищет аренду', k: 'loan' }, { t: 'Пусть борется за место', k: 'no' }] };
  }
  return null;
}

function followUp(W, e) {
  const id = `ev${today(W)}${e.kind}f`;
  if (e.kind === 'conflict2') {
    const b = W.players[e.data.b];
    if (!b || b.club !== W.user.club) return null;
    b.mor = clamp(b.mor - 12, 5, 100);
    return { id, kind: 'conflict2', title: 'Конфликт обострился', text: `Ссора ${sur(W.players[e.data.a])} и ${sur(b)} вышла в прессу. ${b.n} требует решения — иначе попросит трансфер.`, data: e.data,
      opts: [{ t: 'Собрать игроков и помирить', k: 'talk' }, { t: `Выставить ${sur(b)} на трансфер`, k: 'list' }] };
  }
  if (e.kind === 'contract2') {
    const p = W.players[e.data.p];
    if (!p || p.club !== W.user.club || p.contract > W.year + 1) return null;
    return { id, kind: 'contract2', title: `${p.n} теряет терпение`, text: `Вы обещали вернуться к контракту ${p.n}, но так и не начали переговоры. Агент говорит о трансфере.`, data: e.data,
      opts: [{ t: 'Срочно начать переговоры', k: 'talk' }, { t: 'Выставить на трансфер', k: 'list' }] };
  }
  if (e.kind === 'young2') {
    const p = W.players[e.data.p];
    if (!p || p.club !== W.user.club) return null;
    if (p.st.app >= e.data.apps + 2) { p.mor = clamp(p.mor + 6, 5, 100); return null; }
    p.mor = clamp(p.mor - 15, 5, 100);
    return { id, kind: 'young2', title: `${p.n} разочарован`, text: `Вы обещали ${p.n} игровое время, но он почти не выходил на поле. Мораль упала.`, data: e.data, opts: [{ t: 'Понятно', k: 'ok' }] };
  }
  return null;
}

export function resolveEvent(W, evId, k) {
  const ev = (W.events || []).find((e) => e.id === evId);
  if (!ev) return 'Событие уже неактуально.';
  W.events = W.events.filter((e) => e !== ev);
  const u = W.user;
  const c = W.clubs[u.club];
  const P = (id) => W.players[id];
  const teamMor = (d) => { for (const id of c.squad) { const p = W.players[id]; if (p) p.mor = clamp(p.mor + d, 5, 100); } };
  const later = (days, kind, data) => (W.evQueue ||= []).push({ at: today(W) + days, kind, data });
  switch (ev.kind) {
    case 'conflict': {
      const a = P(ev.data.a), b = P(ev.data.b);
      if (k === 'a') { a && (a.mor = clamp(a.mor + 8, 5, 100)); b && (b.mor = clamp(b.mor - 12, 5, 100)); return `${sur(a)} доволен, ${sur(b)} обижен.`; }
      if (k === 'b') { b && (b.mor = clamp(b.mor + 8, 5, 100)); a && (a.mor = clamp(a.mor - 12, 5, 100)); return `${sur(b)} доволен, ${sur(a)} обижен.`; }
      if (k === 'fine') { a && (a.mor -= 5); b && (b.mor -= 5); teamMor(2); return 'Оба оштрафованы. Команда оценила дисциплину.'; }
      if (chance(0.55)) later(7, 'conflict2', ev.data);
      return 'Вы решили не вмешиваться. Посмотрим, чем это кончится…';
    }
    case 'conflict2': {
      const b = P(ev.data.b);
      if (k === 'talk') { teamMor(1); if (b) b.mor = clamp(b.mor + 10, 5, 100); return 'Игроки пожали друг другу руки. Конфликт исчерпан.'; }
      if (b) b.listed = true;
      return `${b?.n || 'Игрок'} выставлен на трансфер.`;
    }
    case 'late': {
      const p = P(ev.data.p);
      if (!p) return 'Ок.';
      if (k === 'fine') { p.mor = clamp(p.mor - 6, 5, 100); teamMor(1); return `${sur(p)} оштрафован. Остальные стали приходить вовремя.`; }
      if (k === 'forgive') { p.mor = clamp(p.mor + 3, 5, 100); teamMor(-2); return `${sur(p)} благодарен, но кто-то в команде считает это слабостью.`; }
      p.ban = Math.max(p.ban || 0, 1);
      p.mor = clamp(p.mor - 10, 5, 100);
      teamMor(2);
      return `${sur(p)} пропустит следующий матч.`;
    }
    case 'traininj': {
      const p = P(ev.data.p);
      if (k === 'pro' && p) {
        if (c.balance < ev.data.cost) return 'Не хватает денег — игрок лечится в клубе.';
        c.balance -= ev.data.cost;
        c.fin.staff += ev.data.cost;
        p.inj = Math.ceil(p.inj / 2);
        return `${sur(p)} вернётся примерно через ${Math.ceil(p.inj / 7)} нед.`;
      }
      return 'Игрок восстанавливается в клубе.';
    }
    case 'fine': {
      const amt = ev.data.amt;
      if (k === 'pay') { c.balance -= amt; c.fin.staff += amt; return `Штраф ${money(amt)} оплачен.`; }
      if (chance(0.5)) { social(W, pick(MEDIA), `Апелляция «${c.name}» удовлетворена — штраф отменён.`, 1); return 'Апелляция удовлетворена — штраф отменён!'; }
      c.balance -= amt * 2;
      c.fin.staff += amt * 2;
      return `Апелляцию отклонили, штраф удвоен: ${money(amt * 2)}.`;
    }
    case 'sponsor': {
      if (k === 'no') return 'Спонсор разочарован, но команда сосредоточена на футболе.';
      c.balance += ev.data.amt;
      c.fin.sponsor += ev.data.amt;
      const ranks = squadRanks(W, c.id);
      for (const id of c.squad) { const p = W.players[id]; if (p && ['star', 'key', 'first'].includes(ranks[id])) p.fit = clamp(p.fit - 10, 30, 100); }
      return `+${money(ev.data.amt)}. Игроки основы немного устали.`;
    }
    case 'contract':
    case 'contract2': {
      const p = P(ev.data.p);
      if (!p) return 'Ок.';
      if (k === 'talk') { W._openRenew = p.id; return `Открываем переговоры с ${p.n}.`; }
      if (k === 'later') { p.mor = clamp(p.mor - 5, 5, 100); later(21, 'contract2', ev.data); return 'Агент ждёт. Не затягивайте.'; }
      if (k === 'list') { p.listed = true; p.mor = clamp(p.mor - 10, 5, 100); return `${sur(p)} выставлен на трансфер.`; }
      p.mor = clamp(p.mor - 15, 5, 100);
      return `${sur(p)} расстроен отказом.`;
    }
    case 'interest': {
      const p = P(ev.data.p);
      const b = W.clubs[ev.data.b];
      if (!p || !b) return 'Ок.';
      if (k === 'no') { p.mor = clamp(p.mor - 6, 5, 100); teamMor(2); rumour(W, `${u.name}: «${p.n} не продаётся».`); return `${sur(p)} огорчён, но команда видит, что вы держите лидеров.`; }
      const val = playerValue(p);
      const fee = Math.round((val * (1.1 + rand() * 0.3)) / 1e5) * 1e5;
      const oid = `o${W.year}${W.day}${p.id}ev`;
      W.offers.push({ id: oid, pid: p.id, from: b.id, fee, until: today(W) + 10, max: fee * (1.1 + rand() * 0.25), pat: randInt(2, 3) });
      p.mor = clamp(p.mor + 4, 5, 100);
      return `«${b.name}» прислал предложение: ${money(fee)}. Ответьте в «Трансферах».`;
    }
    case 'youngtime': {
      const p = P(ev.data.p);
      if (!p) return 'Ок.';
      if (k === 'promise') { p.mor = clamp(p.mor + 8, 5, 100); later(30, 'young2', { p: p.id, apps: p.st.app }); return 'Игрок воодушевлён. Не забудьте выпустить его на поле.'; }
      if (k === 'loan') { p.listed = true; return `${sur(p)} будет искать аренду — клубы смогут сделать предложение.`; }
      p.mor = clamp(p.mor - 10, 5, 100);
      return `${sur(p)} недоволен.`;
    }
    default:
      return 'Ок.';
  }
}
