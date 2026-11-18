/**
 * 演示场景：举报、签名复审、敏感词、处罚、匹配单、对账、注销、订阅、退款、待审批、操作日志
 * 在 seed-data.js 生成的用户和对局基础上补充，方便逐个演示后台功能
 */
(() => {
  'use strict';
  const Seed = window.Seed;
  Seed.scenarios = () => {
    const { S, C, U, uidOf, addL, order, now, H, MIN, DAY, int, pick, digits } = Seed._;
    const lastGames = (key, n, f = () => true) => S.matches.filter((m) => m.uid === uidOf[key] && m.mode === 'quick' && f(m)).sort((a, b) => b.endedAt - a.endedAt).slice(0, n);

    /* ---------- 封号中的账号 ---------- */
    const farm = U('farm1');
    farm.ban = { until: now + 27 * DAY, reason: '金币异常（刷币、转移金币）', by: 'mod', at: now - 3 * DAY, note: '风控：同一台设备一天新建 5 个账号，好友房里连续输给同一个账号' };
    farm.sessions.forEach((x) => { x.revokedAt = now - 3 * DAY; });
    farm.lastLoginAt = now - 3 * DAY - 3 * H;
    Object.assign(U('del1'), { lastLoginAt: now - 6 * DAY - H });
    Object.assign(U('del2'), { lastLoginAt: now - 30 * H - 10 * MIN });
    U('del2').sessions.forEach((x) => { x.revokedAt = now - 30 * H; });
    farm.risk = { rule: '同设备多账号 + 好友房定向输金币', at: now - 3 * DAY - 2 * H };
    U('happy3').nickPrev = 'FreeCoins_shop';
    S.penalties.push(
      { id: 'P301', uid: farm.uid, kind: 'ban', duration: '30d', reason: '金币异常（刷币、转移金币）', note: farm.ban.note, by: 'mod', at: now - 3 * DAY, until: farm.ban.until, revoked: null, ref: '风控告警' },
      { id: 'P302', uid: uidOf.aisha, kind: 'clear_bio', reason: '不良资料（昵称、头像、签名）', note: '签名“加我领免费金币 t.me/xxx”', by: 'mod', at: now - 5 * DAY, revoked: null, ref: '签名复审' },
      { id: 'P303', uid: uidOf.happy3, kind: 'reset_profile', reason: '不良资料（昵称、头像、签名）', note: '昵称“FreeCoins_shop”引流', by: 'mod', at: now - 6 * DAY, revoked: null, ref: '举报 R0990' },
    );
    S.sent.push(
      { id: 'M' + digits(6), uid: uidOf.aisha, key: 'bio_cleared', params: {}, at: now - 5 * DAY, by: 'mod' },
      { id: 'M' + digits(6), uid: uidOf.happy3, key: 'profile_reset', params: {}, at: now - 6 * DAY, by: 'mod' },
    );

    /* ---------- 举报 ---------- */
    let rid = 1000;
    const rep = (target, reporter, o) => S.reports.push({ id: 'R' + (++rid), target, reporter, source: o.source || 'game', reason: o.reason, note: o.note || '', gameId: o.gameId || '', at: o.at, status: o.status || 'pending', result: o.result || null, excerpt: o.excerpt || null });
    // 维克多：开局后很快认输 / 挂机，3 个人在 3 局里举报
    lastGames('victor', 3, (m) => m.opp.uid).forEach((m, i) => {
      Object.assign(m, { result: 'lose', endReason: i === 1 ? 'forfeit' : 'timeout', moves: int(3, 5), dur: int(40, 75) });
      rep(uidOf.victor, m.opp.uid, { reason: '作弊或挂机', note: ['开局就挂机，连续超时', '一直不落子，最后认输了', '感觉在故意送分'][i], gameId: m.gameId, at: m.endedAt + 40e3 });
    });
    // LoserTrash99：局内刷快捷语 + 昵称辱骂
    lastGames('loser', 2, (m) => m.opp.uid).forEach((m, i) => {
      m.emotes = Array.from({ length: 7 }, (_, k) => ({ t: m.startAt + (k + 1) * 9000, from: k === 3 ? 'opp' : 'me', kind: k === 3 ? 'emoji' : 'phrase', id: k === 3 ? 'angry' : (k % 2 ? 'p4' : 'p3') }));
      rep(uidOf.loser, m.opp.uid, { reason: '辱骂和骚扰', note: i ? '昵称就是骂人的' : '一直刷“快点啦”和“差一点哦”，很烦', gameId: m.gameId, at: m.endedAt + 25e3 });
    });
    rep(uidOf.loser, uidOf.sofia, { source: 'profile', reason: '辱骂和骚扰', note: '', at: now - 3 * H, excerpt: null });
    // 花花：签名引流，从玩家主页举报
    rep(uidOf.hana, uidOf.lucas, { source: 'profile', reason: '其他', note: '签名里留微信号拉人', at: now - 5 * H });
    // 普丽：私聊里卖金币
    rep(uidOf.priya, uidOf.zoe, { source: 'dm', reason: '其他', note: '私聊推销“便宜金币”', at: now - 2 * H, excerpt: [
      { from: 'target', text: 'hi! want cheap coins? 10000 coins only $2', t: now - 2 * H - 9 * MIN },
      { from: 'reporter', text: '不需要，谢谢', t: now - 2 * H - 8 * MIN },
      { from: 'target', text: 'WA me +91 98765 43210, fast delivery', t: now - 2 * H - 7 * MIN },
    ] });
    // 诺亚：不良语音，没有录音
    const ng = lastGames('noah', 1, (m) => m.opp.uid)[0];
    if (ng) rep(uidOf.noah, ng.opp.uid, { reason: '不良语音', note: '开麦一直骂人', gameId: ng.gameId, at: ng.endedAt + 30e3 });
    // 举报了补位的机器人：自动关闭
    const bg = S.matches.find((m) => m.uid === uidOf.grace && m.opp.bot) || S.matches.find((m) => m.opp.bot);
    if (bg) rep({ bot: bg.opp.bot }, bg.uid, { reason: '作弊或挂机', note: '对面下得太快了', gameId: bg.gameId, at: bg.endedAt + 20e3, status: 'done', result: { action: 'auto_close', by: 'system', at: bg.endedAt + 21e3, note: '被举报人是补位机器人，自动关闭' } });
    // 已处理过的
    const rg = lastGames('ryan', 1, (m) => m.opp.uid)[0];
    rep(uidOf.ryan, rg ? rg.opp.uid : uidOf.emma, { reason: '其他', note: '名字像官方账号', gameId: rg ? rg.gameId : '', at: now - 2 * DAY, status: 'done', result: { action: 'none', by: 'mod', at: now - 2 * DAY + 2 * H, note: '昵称“瑞安”没有冒充官方' } });
    rep(farm.uid, uidOf.george, { source: 'profile', reason: '作弊或挂机', note: '好友房里一直输给同一个人', at: now - 3 * DAY - 5 * H, status: 'done', result: { action: 'ban', duration: '30d', by: 'mod', at: now - 3 * DAY, note: '和风控告警一起处理' } });

    /* ---------- 签名复审（我的 6.4：同步检查通过后的异步复审） ---------- */
    const bio = (key, hits, o = {}) => S.bio.push({ id: 'B' + (200 + S.bio.length + 1), uid: uidOf[key], text: U(key).bio, hits, at: o.at || now - int(10, 300) * MIN, reported: !!o.reported, status: 'pending' });
    bio('hana', [{ w: 'V信', cat: '广告和联系方式' }], { reported: true, at: now - 6 * H });
    bio('priya', [{ w: '+91 98765 43210', cat: '广告和联系方式' }, { w: 'cheap coins', cat: '广告和联系方式' }], { at: now - 3 * H });
    bio('loser', [{ w: 'trash', cat: '辱骂' }], { at: now - 90 * MIN });
    bio('happy2', [{ w: 'ig @', cat: '广告和联系方式' }], { at: now - 50 * MIN });
    bio('leo', [], { at: now - 30 * MIN });
    bio('sofia', [], { at: now - 12 * MIN });

    /* ---------- 敏感词库 ---------- */
    const W = (lang, w, cat, act) => S.words.push({ id: 'W' + (S.words.length + 1), lang, w, cat, act, by: 'mod', at: now - int(2, 9) * DAY });
    [['zh', '傻逼', '辱骂', 'block'], ['zh', '菜鸡', '辱骂', 'review'], ['zh', '约炮', '色情', 'block'], ['zh', '赌博', '违法', 'block'], ['zh', '代充', '广告和联系方式', 'block'],
      ['zh', '低价金币', '广告和联系方式', 'block'], ['zh', 'V信', '广告和联系方式', 'review'], ['zh', '加微信', '广告和联系方式', 'review'], ['zh', 'QQ群', '广告和联系方式', 'review'],
      ['en', 'fuck', '辱骂', 'block'], ['en', 'trash', '辱骂', 'review'], ['en', 'loser', '辱骂', 'review'], ['en', 'nude', '色情', 'block'], ['en', 'cheap coins', '广告和联系方式', 'block'], ['en', 'whatsapp me', '广告和联系方式', 'review'],
      ['es', 'puta', '辱骂', 'block'], ['es', 'idiota', '辱骂', 'review'], ['es', 'monedas baratas', '广告和联系方式', 'block'],
      ['id', 'anjing', '辱骂', 'block'], ['id', 'goblok', '辱骂', 'review'], ['id', 'judi', '违法', 'block'], ['id', 'koin murah', '广告和联系方式', 'block'],
      ['hi', 'कुत्ता', '辱骂', 'review'], ['hi', 'सस्ते सिक्के', '广告和联系方式', 'block']].forEach((a) => W(...a));

    /* ---------- 匹配单与托管：正在进行的 + 一张卡住后被系统作废的 ---------- */
    let tk = 9100;
    const ticket = (key, stake, status, ago, o = {}) => {
      const u = U(key);
      const st = C.stakes.rows.find((s) => s.id === stake);
      const id = 'TK' + (++tk).toString(36).toUpperCase();
      const t0 = now - ago;
      addL(u, -st.bet, 'stake_bet', id, { stake }, t0);
      const tl = [{ s: 'queued', at: t0, note: '扣底注 ' + st.bet + '，进入托管' }];
      if (['matched', 'confirming', 'playing', 'settled', 'aborted'].includes(status)) tl.push({ s: 'matched', at: t0 + 3500, note: '匹配到 ' + (o.opp || '真人') }, { s: 'confirming', at: t0 + 3600, note: '推送 match.found' });
      if (['playing', 'settled', 'aborted'].includes(status)) tl.push({ s: 'playing', at: t0 + 6000, note: '双方准备好，开局' });
      if (status === 'aborted') { tl.push({ s: 'aborted', at: o.abortAt, note: '托管超过 2 小时没有变化，系统自动作废并退还底注' }); addL(u, st.bet, 'abort_refund', id, { stake }, o.abortAt); }
      if (status === 'cancelled') { tl.push({ s: 'cancelled', at: t0 + 21e3, note: '用户取消匹配，退还底注' }); addL(u, st.bet, 'stake_refund', id, { stake }, t0 + 21e3); }
      const live = ['queued', 'matched', 'confirming', 'playing'].includes(status);
      if (live) u.escrow += st.bet;
      S.tickets.push({ id, uid: u.uid, stake, bet: st.bet, status, escrow: live ? st.bet : 0, createdAt: t0, updatedAt: tl[tl.length - 1].at, gameId: o.gameId || '', timeline: tl, review: o.review || null });
    };
    ticket('ruby', 's1', 'queued', 12e3);
    ticket('zoe', 's2', 'confirming', 9e3, { opp: '诺亚' });
    ticket('leo', 's3', 'playing', 4 * MIN, { opp: '伊森', gameId: 'G' + digits(6) });
    ticket('ethan', 's3', 'playing', 4 * MIN, { opp: '小狮' });
    ticket('jade', 's1', 'aborted', 3 * H + 10 * MIN, { opp: '真人', abortAt: now - 70 * MIN, review: 'pending' });
    ticket('alex', 's1', 'cancelled', 26 * MIN);
    S.matches.filter((m) => m.endedAt > now - 2 * H && m.ticket).slice(-6).forEach((m) => {
      const st = C.stakes.rows.find((s) => s.id === m.stake);
      S.tickets.push({ id: m.ticket, uid: m.uid, stake: m.stake, bet: st.bet, status: 'settled', escrow: 0, createdAt: m.startAt - 8e3, updatedAt: m.endedAt, gameId: m.gameId, timeline: [
        { s: 'queued', at: m.startAt - 8e3, note: '扣底注 ' + st.bet + '，进入托管' }, { s: 'matched', at: m.startAt - 4e3, note: m.opp.bot ? '机器人补位' : '匹配到真人' },
        { s: 'confirming', at: m.startAt - 3.9e3, note: '推送 match.found' }, { s: 'playing', at: m.startAt, note: '开局' }, { s: 'settled', at: m.endedAt, note: { win: '赢，奖池转给赢家', lose: '输，奖池转给对手', draw: '平局，各自退还' }[m.result] },
      ] });
    });

    /* ---------- 对账（匹配 6.3）：每小时一次，5 小时前那次对不上 ---------- */
    const active = S.tickets.filter((x) => x.escrow > 0).reduce((s, x) => s + x.escrow, 0);
    for (let i = 0; i < 24; i += 1) {
      const at = now - (i * H) - 7 * MIN;
      const sum = i === 0 ? active : int(2, 40) * 100;
      const diff = i === 5 ? 200 : 0;
      S.recon.push({ id: 'RC' + (500 - i), at, escrow: sum + diff, active: sum, diff, status: diff ? 'alert' : 'ok', handled: null });
    }
    S.recon.push({ id: 'RC-STALE-1', at: now - 70 * MIN, kind: 'stale', ticket: S.tickets.find((x) => x.status === 'aborted').id, status: 'alert', handled: null });

    /* ---------- 注销记录（账号 4.12，只留时间和来源） ---------- */
    S.deletions.push(
      { uid: uidOf.del1, source: 'app', requestedAt: now - 6 * DAY, completedAt: now - 6 * DAY + 3 * MIN },
      { uid: uidOf.del2, source: 'app', requestedAt: now - 30 * H, completedAt: null },
      { uid: 'u100711', source: 'facebook', requestedAt: now - 4 * DAY, completedAt: now - 4 * DAY + 5 * MIN },
      { uid: 'u100736', source: 'apple', requestedAt: now - 2 * DAY, completedAt: now - 2 * DAY + 2 * MIN },
      { uid: 'u100752', source: 'web', requestedAt: now - 20 * H, completedAt: now - 20 * H + 4 * MIN },
    );

    /* ---------- 订阅、补单、退款 ---------- */
    S.users.filter((u) => u.vip).forEach((u) => {
      const t = C.vip.tiers[u.vip.tier];
      S.subs.push({ id: 'SUB' + digits(8), uid: u.uid, tier: u.vip.tier, status: u.vip.expiresAt > now ? 'active' : 'expired', autoRenew: u.vip.autoRenew, startAt: u.vip.since, expiresAt: u.vip.expiresAt, channel: u.platform === 'ios' ? 'app_store' : 'google_play', productId: t.product_id, notices: [
        { at: u.vip.since, type: u.platform === 'ios' ? 'SUBSCRIBED' : 'SUBSCRIPTION_PURCHASED' },
        ...(u.vip.autoRenew ? [] : [{ at: now - 2 * DAY, type: u.platform === 'ios' ? 'DID_CHANGE_RENEWAL_STATUS（关闭自动续费）' : 'SUBSCRIPTION_CANCELED（关闭自动续费）' }]),
      ] });
    });
    const kai = U('kai');
    const pack = C.packs.rows[1];
    const pend = order(kai, 'coins', pack, now - 50 * MIN, { coins: pack.coins + pack.bonus, status: 'paid' });
    pend.note = '商店已扣款，发货回调超时，金币没到账（用户找客服）';
    const marco = U('marco');
    const ro = S.orders.find((o) => o.id === marco.refundOrder);
    S.refunds.push({ id: 'RF' + digits(6), orderId: ro.id, uid: marco.uid, at: now - 6 * H, source: 'Google Play 作废购买（voided purchase）', coins: ro.coins, status: 'pending', result: null });
    delete marco.refundOrder;

    /* ---------- 风控标记（P1 风控告警的数据，先在用户详情里展示） ---------- */
    U('victor').risk = { rule: '经常开局后很快认输或超时（疑似故意输金币）', at: now - 4 * H };

    /* ---------- 待审批 ---------- */
    const tasksNew = JSON.parse(JSON.stringify(C.tasks));
    tasksNew.rows.push({ id: 'l_dec', group: 'limited', name: Seed.L('分享5次', 'Share 5 times', 'Comparte 5 veces', 'Bagikan 5 kali', '5 बार शेयर करें'), metric: 'shares', goal: 5, reward: { coins: 1500, item: '' }, jump: 'share', sort: 3, start: '2026-12-01', end: '2026-12-31', enabled: true });
    S.approvals.push(
      { id: 'AP' + 2001, type: 'config', ns: 'tasks', title: '任务：新增限时任务“分享5次”（12 月）', note: '12 月拉新活动，分享 5 次给 1,500 金币', by: 'ops', at: now - 2 * H, steps: [{ who: 'pm', done: null }], status: 'pending', payload: { data: tasksNew, base: 2 } },
      { id: 'AP' + 2002, type: 'coins', title: '金币调整：星星 +500（客服补偿）', note: '11-17 晚上对局异常，用户反馈底注没退，核实账本后补偿 500', by: 'cs', at: now - 40 * MIN, steps: [{ who: 'lead', done: null }], status: 'pending', payload: { uid: uidOf.stella, amount: 500, reason: '客服补偿', notify: true } },
      { id: 'AP' + 1990, type: 'config', ns: 'stakes', title: '场次：调整在玩人数', note: '在玩人数按最近一周峰值调整', by: 'ops', at: now - 21 * H, steps: [{ who: 'pm', done: { by: 'pm', at: now - 20 * H, ok: true } }], status: 'approved', payload: { version: 2 } },
      { id: 'AP' + 1988, type: 'config', ns: 'tasks', title: '任务：限时任务“分享3次”延长到年底', note: '限时任务“分享3次”延长到年底', by: 'ops', at: now - 27 * H, steps: [{ who: 'pm', done: { by: 'pm', at: now - 26 * H, ok: true } }], status: 'approved', payload: { version: 2 } },
      { id: 'AP' + 1985, type: 'config', ns: 'items', title: '装扮：节奏大师降价到 400', note: '节奏大师降价到 400，和星球轨道一致', by: 'ops', at: now - 31 * H, steps: [{ who: 'pm', done: { by: 'pm', at: now - 30 * H, ok: true } }], status: 'approved', payload: { version: 2 } },
    );

    /* ---------- 操作日志 ---------- */
    const A = (who, mod, act, target, detail, ago) => S.audit.push({ id: 'L' + (8000 + S.audit.length), who, mod, act, target, detail, at: now - ago, ip: '10.12.' + int(1, 30) + '.' + int(2, 250) });
    A('dev', '配置发布', '发布 v1', '全部配置', '首发配置（按各需求文档的配置项）', 50 * H);
    A('ops', '配置发布', '发布 v2', 'stakes 场次', '在玩人数按最近一周峰值调整（审批 AP1990）', 20 * H);
    A('ops', '配置发布', '发布 v2', 'items 装扮', '节奏大师降价到 400', 30 * H);
    A('ops', '配置发布', '发布 v2', 'tasks 任务', '限时任务“分享3次”延长到年底', 26 * H);
    A('mod', '账号处置', '封号 30 天', farm.uid, '金币异常（刷币、转移金币）', 3 * DAY);
    A('mod', '内容安全', '清空签名', uidOf.aisha, '签名复审不通过', 5 * DAY);
    A('mod', '内容安全', '重置昵称', uidOf.happy3, '昵称“FreeCoins_shop”引流', 6 * DAY);
    A('cs', '用户查询', '查看完整邮箱', uidOf.kai, '用户来电核实身份', 3 * H);
    A('ops', '审批', '提交审批', 'tasks 任务', 'AP2001 新增限时任务“分享5次”', 2 * H);
    A('cs', '审批', '提交审批', uidOf.stella, 'AP2002 金币调整 +500', 40 * MIN);
    S.audit.sort((a, b) => b.at - a.at);
  };
})();
