/**
 * 演示数据：用户、账本、对局、订单、举报、审批……按固定种子生成，每次重置都一样
 * 时间都相对“第一次打开后台的时刻”（now），刷新页面后数据存在 localStorage
 */
(() => {
  'use strict';
  const IMG = D.IMG;
  const Seed = (window.Seed = window.Seed || {});
  const H = 36e5;
  const MIN = 6e4;
  const DAY = 864e5;

  /* 固定种子的随机数 */
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const r = rng(20261118);
  const int = (a, b) => a + Math.floor(r() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const chance = (p) => r() < p;
  const hex = (n) => Array.from({ length: n }, () => '0123456789abcdef'[int(0, 15)]).join('');
  const digits = (n) => Array.from({ length: n }, () => int(0, 9)).join('');

  /* 原型里的玩家（V7 原型 data.js），加上几个演示用的账号 */
  const PEOPLE = [
    ['stella', '星星', 'google', 'zh', 0, '周末固定开黑，来一局？', { frame: 'balloon', bg: 'galaxy_bg', bubble: 'ocean', act: 0.7, payer: 1, wasGuest: true }],
    ['lily', '莉莉', 'facebook', 'zh', 2, '不连成四子不罢休 ✨', { frame: 'wings', bg: 'galaxy_bg', bubble: 'gold', act: 0.9, payer: 2 }],
    ['kai', '阿凯', 'google', 'zh', 0, '回合制>实时，不服来战。', { bg: 'arena', act: 0.6, payer: 1 }],
    ['mia', '米娅', 'apple', 'zh', 0, '连珠女王 👑', { frame: 'balloon', bg: 'sunset', act: 0.6 }],
    ['alex', '阿乐', 'email', 'zh', 0, '今年冲黄金', { act: 0.5 }],
    ['daniel', '大牛', 'google', 'en', 1, '小队队长，常开麦。', { frame: 'crown', bg: 'arena', act: 0.85, payer: 1 }],
    ['lucas', '卢卡', 'facebook', 'es', 0, '慢慢下，稳稳赢 🧩', { act: 0.5 }],
    ['sofia', '索菲', 'google', 'es', 0, '你好呀 👋', { act: 0.4 }],
    ['emma', '艾玛', 'apple', 'en', 0, '休闲玩家', { act: 0.3 }],
    ['aisha', '爱莎', 'google', 'id', 0, '速攻流选手 🏁', { frame: 'saturn', act: 0.6 }],
    ['ryan', '瑞安', 'guest', 'en', 0, '新人报到', { act: 0.3 }],
    ['noah', '诺亚', 'google', 'en', 0, '友谊第一，比赛第二', { act: 0.6 }],
    ['grace', '格蕾丝', 'facebook', 'en', 0, '一起交个朋友吧！', { act: 0.4 }],
    ['victor', '维克多', 'google', 'zh', 0, '策略大师', { frame: 'rocket', act: 0.8 }],
    ['marco', '马可', 'google', 'es', 0, '哈喽！', { act: 0.25, days: 4 }],
    ['hana', '花花', 'facebook', 'zh', 0, '加我V信 hana_520 一起开黑', { act: 0.6 }],
    ['zoe', '佐伊', 'apple', 'en', 0, '夜猫子', { act: 0.6 }],
    ['olivia', '奥莉', 'google', 'en', 2, '四子棋老玩家', { frame: 'crown', act: 0.9, payer: 2 }],
    ['isabella', '贝拉', 'facebook', 'es', 0, '冲鸭！', { act: 0.5 }],
    ['ruby', '露比', 'google', 'id', 0, '幸运数字7', { act: 0.5 }],
    ['george', '老乔', 'email', 'en', 0, '姜还是老的辣', { act: 0.7, payer: 1 }],
    ['priya', '普丽', 'google', 'hi', 0, 'WA me +91 98765 43210 for cheap coins', { frame: 'dj', act: 0.6 }],
    ['ethan', '伊森', 'facebook', 'en', 0, '认真党', { act: 0.6 }],
    ['leo', '小狮', 'google', 'zh', 0, '小狮子在此，嗷呜～', { act: 0.7 }],
    ['jade', '小玉', 'apple', 'zh', 0, '三步之内必有杀招', { act: 0.6 }],
    ['chloe', '克洛伊', 'google', 'hi', 0, '嗨，你好呀', { act: 0.4 }],
    ['happy1', 'happy', 'guest', 'id', 0, '', { avatar: 'happy', act: 0.2, newbie: true }],
    ['happy2', 'happy', 'email', 'hi', 0, 'follow me ig @happy.gamer.99', { avatar: 'happy', act: 0.3 }],
    ['happy3', 'happy', 'guest', 'es', 0, '', { avatar: 'happy', act: 0.3, nickAdmin: true }],
    ['loser', 'LoserTrash99', 'facebook', 'en', 0, 'all of you are trash lol', { avatar: 'ryan', act: 0.6 }],
    ['farm1', '金币工作室01', 'guest', 'zh', 0, '', { avatar: 'happy', act: 0.4, banned: true }],
    ['del1', '已注销用户', 'google', 'zh', 0, '', { avatar: 'happy', deleted: true }],
    ['del2', '晴天', 'email', 'zh', 0, '', { avatar: 'happy', deleting: true }],
  ];
  const DEVICES = [['android', 'Xiaomi 14'], ['android', 'Redmi Note 13 Pro'], ['android', 'POCO X6'], ['android', 'Samsung Galaxy S23'], ['android', 'Xiaomi 13T'], ['ios', 'iPhone 15'], ['ios', 'iPhone 13']];
  const TZ = { zh: 'Asia/Shanghai', en: 'America/New_York', es: 'America/Mexico_City', id: 'Asia/Jakarta', hi: 'Asia/Kolkata' };

  function identity(type, slug, at) {
    if (type === 'google') return { provider: 'google', sub: '1084' + digits(17), email: `${slug}.play@gmail.com`, private: false, at };
    if (type === 'facebook') return { provider: 'facebook', sub: '10' + digits(15), email: chance(0.5) ? `${slug}.fb@outlook.com` : '', private: false, at };
    if (type === 'apple') return { provider: 'apple', sub: `00${digits(4)}.${hex(32)}.${digits(4)}`, email: `${hex(10)}@privaterelay.appleid.com`, private: true, at };
    if (type === 'email') return { provider: 'email', sub: `${slug}@example.com`, email: `${slug}@example.com`, private: false, at };
    return { provider: 'guest', sub: 'inst_' + hex(16), email: '', private: false, at };
  }

  Seed.build = (now) => {
    const C = Seed.configs();
    const items = Object.fromEntries(C.items.rows.map((x) => [x.id, x]));
    const stakes = C.stakes.rows;
    const S = {
      users: [], ledger: [], matches: [], orders: [], subs: [], refunds: [], reports: [], bio: [], words: [], penalties: [],
      tickets: [], recon: [], deletions: [], approvals: [], audit: [], sent: [], calls: [], riskFlags: [],
    };
    let lid = 1;
    let gid = 380000;
    let oid = 1000;
    const uidOf = {};

    /* ---------- 用户 ---------- */
    PEOPLE.forEach(([key, name, type, lang, vip, bio, o], i) => {
      const uid = 'u' + (100801 + i);
      uidOf[key] = uid;
      const regAt = o.newbie ? now - 2 * H : o.days ? now - o.days * DAY - 2 * H : now - int(4, 13) * DAY - int(0, 20) * H;
      const [platform, model] = type === 'apple' ? pick(DEVICES.slice(5)) : pick(DEVICES.slice(0, 5));
      const ids = [];
      if (o.wasGuest) ids.push({ ...identity('guest', key, regAt), bound: true }, identity(type, key, regAt + 2 * DAY));
      else ids.push(identity(type, key, regAt));
      const avatarKey = o.avatar || key;
      const u = {
        uid, key, displayId: key === 'stella' ? '82640317' : String(int(10000000, 99999999)),
        nickname: name, nickSource: o.nickAdmin ? 'admin' : (type === 'guest' || type === 'email' || name === 'happy') ? 'default' : 'third',
        avatar: IMG + `avatars/${avatarKey}.jpg`, avatarSource: avatarKey === 'happy' ? (o.nickAdmin ? 'admin' : 'default') : 'third',
        bio, bg: o.bg || 'aurora', frame: o.frame || '', bubble: o.bubble || 'default',
        status: o.banned ? 'banned' : o.deleted ? 'deleted' : o.deleting ? 'deleting' : 'normal', ban: null,
        type, wasGuest: !!o.wasGuest, identities: ids, regAt, regMethod: o.wasGuest ? 'guest' : type,
        lastLoginAt: now - int(1, 600) * MIN, lastLoginMethod: type, platform: type === 'apple' ? 'ios' : platform, model, lang, tz: TZ[lang],
        sessions: [{ device: model, deviceId: 'dev_' + hex(10), platform: type === 'apple' ? 'ios' : platform, createdAt: regAt, expiresAt: now + 30 * DAY, revokedAt: null }],
        emailLock: type === 'email' && key === 'george' ? { failed: 5, until: now + 9 * MIN } : null,
        coins: 0, escrow: 0,
        vip: vip ? { tier: vip, since: regAt + 10 * MIN, expiresAt: key === 'daniel' ? now + 5 * DAY : regAt + 10 * MIN + 30 * DAY, autoRenew: key !== 'daniel' } : null,
        items: [{ id: 'default', source: 'default', at: regAt }, { id: 'aurora', source: 'default', at: regAt }],
        stats: { games: 0, wins: 0, draws: 0, playSeconds: 0 },
        friends: o.newbie ? 0 : int(2, vip ? 60 : 35), requests: int(0, 3), blocks: chance(0.3) ? int(1, 3) : 0,
        settings: { notify_invite: chance(0.85), notify_friend_request: chance(0.9) },
        consents: [{ doc: 'terms', version: '1.0', at: regAt }, { doc: 'privacy', version: '1.0', at: regAt }],
        welfare: { newbie: !o.deleted, offlineToday: int(0, 3), doublePot: chance(0.2), signRound: 1, signCount: 0, streak: int(0, 6), pendingChests: 0, guides: { play: true, sign: !o.newbie } },
        test: false, risk: null, act: o.act || 0.4, payer: o.payer || 0,
      };
      if (o.deleted) Object.assign(u, { identities: [], sessions: [], bio: '', avatar: IMG + 'avatars/happy.jpg', friends: 0, requests: 0 });
      if (u.frame) u.items.push({ id: u.frame, source: u.frame === 'balloon' ? 'signin' : 'shop', at: regAt + 3 * DAY });
      if (u.bg !== 'aurora') u.items.push({ id: u.bg, source: 'shop', at: regAt + 2 * DAY });
      if (u.bubble !== 'default') u.items.push({ id: u.bubble, source: 'shop', at: regAt + 2 * DAY });
      if (vip) {
        u.items.push({ id: 'vip', source: 'vip', at: u.vip.since });
        if (vip === 2) u.items.push({ id: 'svip', source: 'vip', at: u.vip.since });
      }
      S.users.push(u);
    });
    const U = (key) => S.users.find((u) => u.key === key);

    /* ---------- 账本 + 对局：按时间往前走，金币不会变成负数 ---------- */
    const bots = C.bot.personas;
    const addL = (u, amount, type, ref, params, at) => {
      u.coins += amount;
      S.ledger.push({ id: lid++, uid: u.uid, amount, balance: u.coins, type, ref, params: params || {}, at });
    };
    const order = (u, kind, prod, at, o = {}) => {
      const id = 'SG' + new Date(at).toISOString().slice(0, 10).replace(/-/g, '') + String(++oid).padStart(6, '0');
      const channel = u.platform === 'ios' ? 'app_store' : 'google_play';
      const rec = {
        id, uid: u.uid, channel, kind, prodId: prod.id, productId: prod.product_id, usd: prod.usd,
        coins: o.coins || 0, first: !!o.first, status: o.status || 'delivered',
        storeTxn: channel === 'app_store' ? '2000000' + digits(9) : `GPA.${digits(4)}-${digits(4)}-${digits(4)}-${digits(5)}`,
        createdAt: at - 40e3, paidAt: at - 20e3, deliveredAt: (o.status || 'delivered') === 'delivered' || o.status === 'refunded' ? at : null, refundedAt: o.refundedAt || null,
      };
      S.orders.push(rec);
      return rec;
    };
    function quickGame(u, t, o = {}) {
      const can = stakes.filter((s) => s.bet <= u.coins);
      if (!can.length) return false;
      const st = o.stake ? stakes.find((s) => s.id === o.stake) : (chance(0.65) ? can[0] : pick(can));
      const ticket = 'TK' + (++gid).toString(36).toUpperCase();
      addL(u, -st.bet, 'stake_bet', ticket, { stake: st.id }, t);
      if (!o.result && chance(0.05)) { addL(u, st.bet, 'stake_refund', ticket, { stake: st.id }, t + 20e3); return true; }
      const isBot = o.opp ? false : chance(0.25);
      const opp = o.opp || (isBot ? { bot: pick(bots).id } : { uid: pick(S.users.filter((x) => x !== u && x.status === 'normal')).uid });
      const res = o.result || (r() < 0.47 ? 'win' : r() < 0.93 ? 'lose' : 'draw');
      const moves = o.moves || int(9, 40);
      const dur = o.dur || moves * int(4, 11);
      const end = t + dur * 1000;
      const gameId = 'G' + gid;
      const dbl = res === 'win' && !o.result && chance(0.06);
      let delta = -st.bet;
      if (res === 'win') { addL(u, st.bet * 2, 'pot_win', gameId, { stake: st.id }, end); delta += st.bet * 2; if (dbl) { addL(u, st.bet * 2, 'pot_bonus', gameId, { stake: st.id }, end); delta += st.bet * 2; } }
      if (res === 'draw') { addL(u, st.bet, 'draw_refund', gameId, { stake: st.id }, end); delta += st.bet; }
      const endReason = o.endReason || (res === 'draw' ? 'normal' : pick(['normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'forfeit', 'timeout', 'disconnect']));
      const emotes = o.emotes || (chance(0.35) ? Array.from({ length: int(1, 5) }, (_, k) => ({ t: t + (k + 1) * int(15, 50) * 1000, from: chance(0.5) ? 'me' : 'opp', ...(chance(0.6) ? { kind: 'emoji', id: pick(Emoji.types) } : { kind: 'phrase', id: 'p' + int(1, 8) }) })) : []);
      S.matches.push({ gameId, ticket, uid: u.uid, opp, mode: 'quick', stake: st.id, bet: st.bet, result: res, endReason, delta, double: dbl, startAt: t, endedAt: end, moves, dur, disconnects: endReason === 'disconnect' ? 2 : chance(0.08) ? 1 : 0, emotes });
      u.stats.games += 1; if (res === 'win') u.stats.wins += 1; if (res === 'draw') u.stats.draws += 1; u.stats.playSeconds += Math.min(dur, 1800);
      return true;
    }
    function roomGame(u, t) {
      const bet = pick([100, 100, 500]);
      if (u.coins < bet) return;
      const f = pick(S.users.filter((x) => x !== u && x.status === 'normal'));
      const gameId = 'G' + (++gid);
      addL(u, -bet, 'room_bet', gameId, {}, t);
      const res = r() < 0.5 ? 'win' : r() < 0.92 ? 'lose' : 'draw';
      const dur = int(90, 420);
      let delta = -bet;
      if (res === 'win') { addL(u, bet * 2, 'room_win', gameId, {}, t + dur * 1000); delta += bet * 2; }
      if (res === 'draw') { addL(u, bet, 'room_draw_refund', gameId, {}, t + dur * 1000); delta += bet; }
      S.matches.push({ gameId, uid: u.uid, opp: { uid: f.uid }, mode: 'room', stake: '', bet, result: res, endReason: 'normal', delta, double: false, startAt: t, endedAt: t + dur * 1000, moves: int(10, 36), dur, disconnects: 0, emotes: [] });
      u.stats.games += 1; if (res === 'win') u.stats.wins += 1; u.stats.playSeconds += dur;
    }
    const bought = (u, id) => u.items.some((x) => x.id === id);
    function life(u, prelude) {
      if (u.welfare.newbie) addL(u, C.newbie.coins, 'newbie_gift', 'NG' + u.uid.slice(1), {}, u.regAt + 2 * MIN);
      let t = u.regAt + 15 * MIN;
      if (u.vip) addL(u, C.vip.tiers[u.vip.tier].bonus, 'vip_open', 'VO' + u.uid.slice(1), {}, u.vip.since);
      (prelude || []).forEach((fn) => { t += 25 * MIN; fn(t); });
      let day = -1;
      let firstPay = {};
      const claimedNewbie = new Set();
      while (t < now - 8 * MIN && u.act > 0) {
        const d = Math.floor((t - u.regAt) / DAY);
        if (d !== day) {
          day = d;
          if (chance(u.act)) {
            const n = (u.welfare.signCount % 7) + 1;
            const mult = u.vip ? C.vip.tiers[u.vip.tier].sign : 1;
            const base = C.signin.days[n - 1].coins + (n === 7 && bought(u, 'balloon') ? C.signin.dup_frame_coins : 0);
            addL(u, base * mult, 'signin', `SI${u.uid.slice(1)}-${d}`, { N: n }, t);
            u.welfare.signCount += 1;
            if (n === 7 && !bought(u, 'balloon')) u.items.push({ id: 'balloon', source: 'signin', at: t });
          }
          if (u.vip && chance(0.8)) addL(u, C.vip.tiers[u.vip.tier].daily, 'vip_daily', `VD${u.uid.slice(1)}-${d}`, {}, t + 5 * MIN);
        }
        const x = r();
        if (x < 0.62) {
          if (!quickGame(u, t) && u.vip) addL(u, 500, 'vip_aid', `VA${u.uid.slice(1)}-${d}`, {}, t);
        } else if (x < 0.69) roomGame(u, t);
        else if (x < 0.8) {
          const pool = C.tasks.rows.filter((k) => (k.group === 'daily' || k.group === 'weekly') || (k.group === 'newbie' && !claimedNewbie.has(k.id)));
          const k = pick(pool);
          if (k.group === 'newbie') claimedNewbie.add(k.id);
          addL(u, k.reward.coins, 'task_reward', `${k.id}:${d}`, { task: k.id }, t);
        } else if (x < 0.85) addL(u, pick([600, 700, 800, 900]), 'mystery_chest', `MY${u.uid.slice(1)}-${d}`, {}, t);
        else if (x < 0.89) addL(u, int(1, 10) * 10, 'offline_income', 'OF' + digits(6), {}, t);
        else if (x < 0.93) {
          const it = pick(C.items.rows.filter((k) => k.price > 0 && !k.vip && !bought(u, k.id) && k.price <= u.coins));
          if (it) { addL(u, -it.price, 'item_buy', it.id, { item: it.id }, t); u.items.push({ id: it.id, source: 'shop', at: t }); }
        } else if (x < 0.96) {
          if (!u.vip && u.coins >= C.call.voice && u.friends > 0) {
            const f = pick(S.users.filter((y) => y !== u && y.status === 'normal'));
            const answered = chance(0.8);
            const cid = 'CL' + digits(7);
            addL(u, -C.call.voice, 'call_fee', cid, { call: 'voice' }, t);
            if (!answered) addL(u, C.call.voice, 'call_refund', cid, { call: 'voice' }, t + 40e3);
            S.calls.push({ id: cid, uid: u.uid, with: f.uid, kind: 'voice', dur: answered ? int(30, 900) : 0, fee: C.call.voice, refunded: !answered, at: t });
          }
        } else if (u.payer && chance(0.5)) {
          const pack = pick(C.packs.rows.slice(0, u.payer === 2 ? 4 : 2));
          const first = !firstPay[pack.id];
          firstPay[pack.id] = true;
          const coins = first ? pack.coins * 2 : pack.coins + pack.bonus;
          const ord = order(u, 'coins', pack, t, { coins, first });
          addL(u, coins, 'topup', ord.id, { price: '$' + pack.usd }, t);
        }
        t += Math.round((25 + r() * 300) * MIN / Math.max(0.25, u.act));
      }
    }

    S.users.forEach((u) => {
      if (u.status === 'deleted') return;
      const pre = [];
      if (u.key === 'marco') {
        // 先买了大额档位，随后在大师场输掉两局：之后的退款通知扣回时余额不够
        const pack = C.packs.rows[3];
        pre.push((t) => { const o = order(u, 'coins', pack, t, { coins: pack.coins * 2, first: true, status: 'refunded', refundedAt: now - 6 * H }); addL(u, o.coins, 'topup', o.id, { price: '$' + pack.usd }, t); u.refundOrder = o.id; });
        pre.push((t) => quickGame(u, t, { stake: 's4', result: 'lose', opp: { uid: uidOf.olivia }, endReason: 'normal' }));
        pre.push((t) => quickGame(u, t, { stake: 's4', result: 'lose', opp: { uid: uidOf.george }, endReason: 'normal' }));
      }
      if (u.vip) {
        const tier = C.vip.tiers[u.vip.tier];
        pre.push((t) => order(u, 'vip', { id: 'vip' + tier.id, product_id: tier.product_id, usd: tier.usd }, u.vip.since));
      }
      life(u, pre);
    });
    Seed._ = { S, C, U, uidOf, addL, quickGame, order, now, H, MIN, DAY, int, pick, chance, digits, hex, items };
    Seed.scenarios();
    // 账本按时间排一次，再按顺序重算变化后余额（演示数据里插入的事件不一定按时间）
    S.ledger.sort((a, b) => a.at - b.at || a.id - b.id);
    const bal = {};
    S.ledger.forEach((e) => { bal[e.uid] = (bal[e.uid] || 0) + e.amount; e.balance = bal[e.uid]; });
    S.users.forEach((u) => { u.coins = bal[u.uid] || 0; delete u.act; delete u.payer; });
    S.configs = C;
    return S;
  };
})();
