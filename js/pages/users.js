/**
 * 用户管理：用户查询 #/users/:q、用户详情 #/user/:uid、注销记录 #/deletions（规划 4.1）
 */
(() => {
  'use strict';
  const esc = UI.esc;
  const st = { type: '', status: '', vip: '', page: 1, tab: 'info', lt: '', lp: 1, gp: 1 };
  const SRC = { default: ['默认', 'gray'], third: ['三方带入', 'blue'], custom: ['自己改的', 'green'], admin: ['后台重置', 'orange'] };
  const typeTag = (u) => (u.wasGuest ? UI.tag('游客 → ' + D.ACCOUNT_TYPES[u.type], 'blue') : UI.tag(D.ACCOUNT_TYPES[u.type], u.type === 'guest' ? 'gray' : 'blue'));
  const statusTag = (u) => UI.status(D.USER_STATUS, u.status) + (u.test ? ' ' + UI.tag('测试', 'purple') : '') + (u.risk ? ' ' + UI.tag('风控标记', 'red', { title: u.risk.rule }) : '');
  const vipTag = (u) => (u.vip ? UI.tag(u.vip.tier === 2 ? '超级会员' : '会员', 'gold') : '<span class="muted">—</span>');

  /* ================= 用户查询 ================= */
  App.page('users', {
    render(el, arg) {
      const q = arg === 'users' ? '' : arg;
      let rows = Store.findUsers(q).filter((u) => (!st.type || u.type === st.type) && (!st.status || u.status === st.status) && (!st.vip || String(u.vip ? u.vip.tier : 0) === st.vip));
      rows = rows.slice().sort((a, b) => b.lastLoginAt - a.lastLoginAt);
      el.innerHTML = `<div class="page-hd"><div><h1>用户查询</h1><p>按展示 ID、user_id、邮箱、三方账号 ID、设备 ID 精确查，按昵称模糊查。昵称不唯一，会有很多“happy”。</p></div></div>
        <div class="card"><div class="card-bd">
          <form class="toolbar" data-form="uq"><input class="inp" name="q" style="width:320px" value="${esc(q)}" placeholder="展示 ID / user_id / 邮箱 / 三方 ID / 设备 ID / 昵称"><button class="btn btn-primary btn-sm">查询</button>
            <select class="inp" data-flt="type">${UI.opts([['', '全部账号类型'], ...Object.entries(D.ACCOUNT_TYPES)], st.type)}</select>
            <select class="inp" data-flt="status">${UI.opts([['', '全部状态'], ...Object.entries(D.USER_STATUS).map(([k, v]) => [k, v.name])], st.status)}</select>
            <select class="inp" data-flt="vip">${UI.opts([['', '全部会员'], ['0', '非会员'], ['1', '会员'], ['2', '超级会员']], st.vip)}</select></form>
          ${UI.table([
            { title: '用户', render: (u) => UI.user(u.uid) },
            { title: 'user_id', render: (u) => `<code>${u.uid}</code>` },
            { title: '账号类型', render: typeTag },
            { title: '状态', render: statusTag },
            { title: '金币', align: 'r', render: (u) => UI.n(u.coins) },
            { title: '会员', render: vipTag },
            { title: '注册', render: (u) => UI.time(u.regAt) },
            { title: '最近登录', render: (u) => UI.ago(u.lastLoginAt) },
            { title: '', align: 'r', render: (u) => `<a class="btn btn-sm" href="#/user/${u.uid}">查看</a>` },
          ], UI.page(rows, st.page), { empty: q ? `没有找到“${q}”` : '没有符合条件的用户' })}
          ${UI.pager(rows.length, st.page)}
        </div></div>`;
    },
    submit(f) { st.page = 1; App.go('users' + (f.q.value.trim() ? '/' + encodeURIComponent(f.q.value.trim()) : '')); },
    input(t) { if (t.dataset.flt) { st[t.dataset.flt] = t.value; st.page = 1; App.refresh(); } },
    act: { page: (b) => { st.page = +b.dataset.p; App.refresh(); } },
  });

  /* ================= 用户详情 ================= */
  const TABS = [['info', '基本信息'], ['login', '登录方式与设备'], ['assets', '资产'], ['ledger', '金币流水'], ['orders', '订单'], ['games', '对局'], ['calls', '通话'], ['welfare', '福利与任务'], ['social', '社交'], ['settings', '设置'], ['safety', '安全'], ['consent', '协议'], ['ops', '后台操作']];
  let uid = '';
  const U = () => Store.user(uid);

  function head(u) {
    const vipT = u.vip ? Store.pub('vip').tiers[u.vip.tier] : null;
    const games = u.stats.games;
    const can = (p) => Store.can(p);
    const btns = [
      u.status === 'banned' ? (can('punish') ? '<button class="btn btn-sm" data-act="unban">解封</button>' : '') : (can('punish') || can('punish.request') ? `<button class="btn btn-sm btn-danger" data-act="ban">${can('punish') ? '封号' : '发起封号'}</button>` : ''),
      can('punish') ? '<button class="btn btn-sm" data-act="kick">强制下线</button>' : '',
      can('punish') && u.bio ? '<button class="btn btn-sm" data-act="clearbio">清空签名</button>' : '',
      can('punish') ? '<button class="btn btn-sm" data-act="reset">重置昵称头像</button>' : '',
      can('assets.request') ? '<button class="btn btn-sm" data-act="coins">金币调整</button><button class="btn btn-sm" data-act="item">发放装扮</button>' : '',
      can('cfg.dev') || can('admin.manage') ? `<button class="btn btn-sm btn-ghost" data-act="test">${u.test ? '取消测试账号' : '标记测试账号'} ${UI.p1()}</button>` : '',
    ].join('');
    return `<div class="uhead card"><div class="card-bd">
      <div class="uhead-l">${UI.av(u.avatar, 72, { frame: u.frame, name: u.nickname })}
        <div><h1>${esc(u.nickname)} ${UI.tag(SRC[u.nickSource][0], SRC[u.nickSource][1], { title: '昵称来源' })} ${u.vip ? UI.tag(vipT.name.zh, 'gold') : ''}</h1>
        <p class="uhead-id">ID <b>${esc(u.displayId)}</b> <button class="icon-btn" data-act="copy" data-v="${esc(u.displayId)}" title="复制">${UI.ic('copy', 13)}</button> · <code>${u.uid}</code> · ${typeTag(u)} · ${statusTag(u)}</p>
        <p class="muted">${u.status === 'banned' && u.ban ? `封禁到 ${u.ban.until ? UI.datetime(u.ban.until) : '永久'} · ${esc(u.ban.reason)} · ${esc(Store.who(u.ban.by))}` : `注册 ${UI.datetime(u.regAt)} · 最近登录 ${UI.ago(u.lastLoginAt)}（${esc(D.ACCOUNT_TYPES[u.lastLoginMethod])} · ${esc(u.model)}）`}</p></div></div>
      <div class="uhead-stats">${UI.stat('金币', UI.n(u.coins), { sub: u.escrow ? `托管中 ${UI.n(u.escrow)}` : '' })}${UI.stat('对局 · 胜率', `${games} · ${games ? Math.round((u.stats.wins / games) * 100) + '%' : '—'}`)}${UI.stat('好友', `${u.friends}/${Store.pub('vip').tiers[u.vip ? u.vip.tier : 0].friend_cap}`)}${UI.stat('背包', u.items.filter((x) => !Store.item(x.id) || !Store.item(x.id).is_default).length + ' 件')}</div>
      <div class="uhead-acts">${btns || '<span class="muted sm">你当前的角色只能查看</span>'}</div></div></div>`;
  }
  const unmaskBtn = (what) => (Store.can('user.unmask') ? `<button class="btn btn-xs" data-act="unmask" data-what="${what}">${UI.ic('eye', 12)} 查看完整</button>` : '<span class="muted sm">（无权限看完整）</span>');
  let shown = {};

  const TAB = {
    info: (u) => UI.card('', UI.kv([
      ['展示 ID', esc(u.displayId)], ['user_id', `<code>${u.uid}</code>`],
      ['昵称', `${esc(u.nickname)} ${UI.tag(SRC[u.nickSource][0], SRC[u.nickSource][1])}${u.nickPrev ? `<br><small class="muted">重置前：${esc(u.nickPrev)}</small>` : ''}`],
      ['头像', `${UI.av(u.avatar, 40)} ${UI.tag(SRC[u.avatarSource][0], SRC[u.avatarSource][1])}`],
      ['个性签名', u.bio ? esc(u.bio) : '<span class="muted">（空）</span>', 'kv-wide'],
      ['主页背景', `${UI.itemPreview(Store.item(u.bg), 40)} ${esc(Store.itemName(u.bg))}`], ['头像框', u.frame ? esc(Store.itemName(u.frame)) : '不戴'], ['聊天气泡', esc(Store.itemName(u.bubble))],
      ['状态', statusTag(u)], ['注册方式', u.wasGuest ? '游客，后来绑定 ' + D.ACCOUNT_TYPES[u.type] : D.ACCOUNT_TYPES[u.regMethod]], ['注册时间', UI.datetime(u.regAt)],
      ['最近登录', `${UI.datetime(u.lastLoginAt)} · ${esc(D.ACCOUNT_TYPES[u.lastLoginMethod])}`], ['平台 · 机型', `${u.platform === 'ios' ? 'iOS' : 'Android'} · ${esc(u.model)}`],
      ['语言', esc(D.LANGS.find((l) => l.id === u.lang).name)], ['时区', `${esc(u.tz)}<br><small class="muted">每日任务按这个时区的 00:00 刷新</small>`],
      ['风控', u.risk ? `${UI.tag('已标记', 'red')} ${esc(u.risk.rule)} · ${UI.ago(u.risk.at)}` : '—'],
    ], { cols: 3 })),
    login: (u) => UI.card('登录方式', UI.table([
      { title: '方式', render: (x) => UI.tag(D.ACCOUNT_TYPES[x.provider], 'blue') + (x.bound ? ' <small class="muted">已绑定为正式账号</small>' : '') },
      { title: '三方账号 ID', render: (x) => `<code>${esc(shown.sub ? x.sub : UI.mask(x.sub))}</code>` },
      { title: '邮箱', render: (x) => (x.email ? esc(shown.email ? x.email : UI.mask(x.email)) + (x.private ? ' ' + UI.tag('Apple 隐藏邮箱', 'gray') : '') : '—') },
      { title: '绑定时间', render: (x) => UI.datetime(x.at) },
    ], u.identities) + `<div class="toolbar mt">${unmaskBtn('email')} ${unmaskBtn('sub')} <span class="muted sm">查看完整会记进操作日志（规划三、7）</span></div>`
      + (u.emailLock ? UI.notice(`邮箱密码连续输错 ${u.emailLock.failed} 次，锁到 ${UI.time(u.emailLock.until)}（15 分钟后自动解锁，账号 4.7）`, 'warn', { cls: 'mt' }) : ''))
      + UI.card('设备和登录态', UI.table([
        { title: '设备', render: (x) => esc(x.device) }, { title: 'device_id', render: (x) => `<code>${esc(x.deviceId)}</code>` }, { title: '平台', render: (x) => (x.platform === 'ios' ? 'iOS' : 'Android') },
        { title: '登录时间', render: (x) => UI.datetime(x.createdAt) }, { title: '过期', render: (x) => UI.time(x.expiresAt) },
        { title: '状态', render: (x) => (x.revokedAt ? UI.tag('已作废 ' + UI.time(x.revokedAt), 'gray') : UI.tag('有效', 'green')) },
      ], u.sessions), { extra: Store.can('punish') ? '<button class="btn btn-sm" data-act="kick">强制下线</button>' : '' }),
    assets: (u) => {
      const sub = Store.s.subs.find((x) => x.uid === u.uid);
      return UI.card('金币和会员', UI.kv([
        ['金币余额', `<b class="big">${UI.n(u.coins)}</b>`], ['托管中的底注', u.escrow ? `${UI.n(u.escrow)} <a href="#/tickets/${u.uid}">看匹配单</a>` : '0'],
        ['会员', u.vip ? `${UI.tag(Store.pub('vip').tiers[u.vip.tier].name.zh, 'gold')} 到期 ${UI.datetime(u.vip.expiresAt)}` : '非会员'],
        ['自动续费', u.vip ? (u.vip.autoRenew ? UI.tag('开着', 'green') : UI.tag('已关闭', 'gray')) + (sub ? ` <a href="#/orders/sub">订阅 ${esc(sub.id)}</a>` : '') : '—'],
      ], { cols: 4 })) + UI.card(`拥有的装扮（${u.items.length}）`, `<div class="igrid sm">${u.items.map((x) => { const it = Store.item(x.id); return `<div class="icard is-static"><span class="icard-pv">${UI.itemPreview(it, 44, u.avatar)}</span><b>${esc(it ? it.name.zh : x.id)}</b><span class="icard-tags">${UI.tag({ default: '默认', shop: '商城', signin: '签到', vip: '会员', admin: '后台' }[x.source], 'gray')}${[u.frame, u.bg, u.bubble].includes(x.id) ? UI.tag('使用中', 'green') : ''}</span><small>${UI.time(x.at)}</small></div>`; }).join('')}</div>`);
    },
    ledger: (u) => {
      const all = Store.s.ledger.filter((e) => e.uid === u.uid && (!st.lt || e.type === st.lt)).sort((a, b) => b.at - a.at || b.id - a.id);
      const types = [...new Set(Store.s.ledger.filter((e) => e.uid === u.uid).map((e) => e.type))];
      return UI.card('', `<div class="toolbar"><select class="inp" data-lt>${UI.opts([['', '全部类型'], ...types.map((t) => [t, `${D.LEDGER[t].name}（${t}）`])], st.lt)}</select><span class="muted sm">后台能看全部记录；app 里只显示最近 90 天（我的 4.7）</span></div>
        ${UI.table([
          { title: '时间', render: (e) => UI.datetime(e.at) }, { title: '类型', render: (e) => `${esc(D.LEDGER[e.type].name)}<br><code class="sm">${e.type}</code>` },
          { title: '变化', align: 'r', render: (e) => UI.signed(e.amount) }, { title: '变化后余额', align: 'r', render: (e) => UI.n(e.balance) },
          { title: '关联单号', render: (e) => refLink(e) }, { title: '用户看到的备注', render: (e) => `${esc(Store.note(e))}${u.lang !== 'zh' ? `<br><small class="muted">${esc(Store.note(e, u.lang))}</small>` : ''}` },
        ], UI.page(all, st.lp))}${UI.pager(all.length, st.lp, 20, 'lpage')}`);
    },
    orders: (u) => UI.card('订单', ordersTable(Store.s.orders.filter((o) => o.uid === u.uid))) + UI.card('订阅', subsTable(Store.s.subs.filter((x) => x.uid === u.uid))),
    games: (u) => {
      const ms = Store.s.matches.filter((m) => m.uid === u.uid).sort((a, b) => b.endedAt - a.endedAt);
      return UI.card(`对局记录（${ms.length}）`, `${UI.table(gameCols(), UI.page(ms, st.gp))}${UI.pager(ms.length, st.gp, 20, 'gpage')}`);
    },
    calls: (u) => UI.card('通话记录', UI.table([
      { title: '时间', render: (x) => UI.datetime(x.at) }, { title: '对象', render: (x) => UI.user(x.with) }, { title: '类型', render: (x) => (x.kind === 'video' ? '视频' : '语音') },
      { title: '时长', render: (x) => (x.dur ? UI.dur(x.dur) : '没接通') }, { title: '扣费', align: 'r', render: (x) => UI.n(x.fee) }, { title: '退回', render: (x) => (x.refunded ? UI.tag('已退回', 'green') : '—') },
    ], Store.s.calls.filter((x) => x.uid === u.uid), { empty: '没有通话记录（会员语音免费的不扣费）' })),
    welfare: (u) => {
      const today = Store.s.matches.filter((m) => m.uid === u.uid && new Date(m.endedAt).toDateString() === new Date().toDateString());
      const prog = { games: today.length, wins: today.filter((m) => m.result === 'win').length, emotes: today.reduce((a, m) => a + m.emotes.filter((e) => e.from === 'me' && e.kind === 'emoji').length, 0), shares: 0 };
      return UI.card('', UI.kv([
        ['新手礼包', u.welfare.newbie ? UI.tag('已领', 'green') : UI.tag('待领', 'orange')], ['今天离线收益', `${u.welfare.offlineToday} / ${Store.pub('offline').daily_times} 次`],
        ['奖池翻倍', u.welfare.doublePot ? UI.tag('持有（今天有效）', 'blue') : '—'], ['签到', `第 ${Math.floor(u.welfare.signCount / 7) + 1} 轮 · 已签 ${u.welfare.signCount % 7} 天`],
        ['连续完成每日任务', `${u.welfare.streak} / 7 天`], ['引导', `快速开始 ${u.welfare.guides.play ? '已出' : '未出'} · 签到 ${u.welfare.guides.sign ? '已出' : '未出'}`],
      ], { cols: 3 })) + UI.card('今天的每日任务（按用户时区）', UI.table([
        { title: '任务', render: (t) => esc(t.name.zh) }, { title: '进度', render: (t) => { const p = Math.min(prog[t.metric] || 0, t.goal); return `${p} / ${t.goal}`; } },
        { title: '奖励', align: 'r', render: (t) => UI.n(t.reward.coins) },
        { title: '状态', render: (t) => ((prog[t.metric] || 0) >= t.goal ? (Store.s.ledger.some((e) => e.uid === u.uid && e.type === 'task_reward' && e.params.task === t.id && new Date(e.at).toDateString() === new Date().toDateString()) ? UI.tag('已领', 'gray') : UI.tag('可领取', 'green')) : UI.tag('进行中', 'blue')) },
      ], Store.pub('tasks').rows.filter((t) => t.group === 'daily' && t.enabled), { cls: 'tbl-mini' }));
    },
    social: (u) => UI.card('', UI.kv([['好友', `${u.friends} / ${Store.pub('vip').tiers[u.vip ? u.vip.tier : 0].friend_cap}`], ['待处理好友申请', u.requests], ['黑名单', `${u.blocks} / ${Store.pub('limits').block_max}`]], { cols: 3 }) + UI.notice('私聊内容不在这里展示，只在举报证据里看相关的几条（规划三、7）。', 'info', { cls: 'mt' })),
    settings: (u) => UI.card('', UI.kv([['游戏邀请通知', u.settings.notify_invite ? '开' : '关'], ['好友申请通知', u.settings.notify_friend_request ? '开' : '关'], ['语言', esc(D.LANGS.find((l) => l.id === u.lang).name)]], { cols: 3 }) + '<p class="muted sm mt">音效只存在手机上，后台看不到（我的 4.11）</p>'),
    safety: (u) => {
      const against = Store.s.reports.filter((r) => r.target === u.uid);
      const by = Store.s.reports.filter((r) => r.reporter === u.uid);
      const pen = Store.s.penalties.filter((p) => p.uid === u.uid);
      return UI.card(`被举报（${against.length}）`, reportsMini(against)) + UI.card(`举报别人（${by.length}）`, reportsMini(by, true)) + UI.card(`处罚记录（${pen.length}）`, penaltyTable(pen));
    },
    consent: (u) => UI.card('', UI.table([{ title: '协议', render: (c) => (c.doc === 'terms' ? '用户协议' : '隐私政策') }, { title: '版本', render: (c) => esc(c.version) }, { title: '同意时间', render: (c) => UI.datetime(c.at) }], u.consents) + '<p class="muted sm mt">登录即视为同意，服务端记录同意的版本和时间（账号 4.15）</p>'),
    ops: (u) => UI.card('', auditTable(Store.s.audit.filter((a) => a.target === u.uid))),
  };
  const refLink = (e) => {
    if (!e.ref) return '—';
    if (/^TK/.test(e.ref)) return `<a href="#/tickets/${e.ref}"><code>${e.ref}</code></a>`;
    if (/^SG/.test(e.ref)) return `<a href="#/orders/${e.ref}"><code>${e.ref}</code></a>`;
    if (/^G\d/.test(e.ref)) return `<a href="#" data-act="game" data-id="${e.ref}"><code>${e.ref}</code></a>`;
    return `<code>${esc(e.ref)}</code>`;
  };
  const RESULT = { win: ['赢', 'green'], lose: ['输', 'red'], draw: ['平', 'gray'] };
  const END = { normal: '正常', forfeit: '认输', timeout: '连续超时', disconnect: '掉线' };
  const gameCols = () => [
    { title: '结束时间', render: (m) => UI.datetime(m.endedAt) }, { title: '类型', render: (m) => (m.mode === 'room' ? '好友房' : Store.stakeName(m.stake)) },
    { title: '对手', render: (m) => UI.user(m.opp.bot ? m.opp : m.opp.uid, { size: 24 }) }, { title: '结果', render: (m) => UI.tag(RESULT[m.result][0], RESULT[m.result][1]) + (m.double ? ' ' + UI.tag('翻倍', 'orange') : '') },
    { title: '结束原因', render: (m) => END[m.endReason] }, { title: '金币', align: 'r', render: (m) => UI.signed(m.delta) },
    { title: '落子 · 用时', render: (m) => `${m.moves} 步 · ${UI.dur(m.dur)}` }, { title: '', align: 'r', render: (m) => `<button class="btn btn-xs" data-act="game" data-id="${m.gameId}">详情</button>` },
  ];
  window.UserParts = {};
  const ordersTable = (UserParts.orders = (rows) => UI.table([
    { title: '订单号', render: (o) => `<a href="#/orders/${o.id}"><code>${o.id}</code></a>` }, { title: '用户', render: (o) => UI.user(o.uid, { size: 22 }) },
    { title: '商品', render: (o) => (o.kind === 'vip' ? `${Store.pub('vip').tiers[+o.prodId.slice(3)].name.zh}（月）` : `金币 ${o.prodId}`) + `<br><code class="sm">${esc(o.productId)}</code>` },
    { title: '金额', align: 'r', render: (o) => UI.usd(o.usd) }, { title: '到账金币', align: 'r', render: (o) => (o.kind === 'vip' ? '—' : UI.n(o.coins) + (o.first ? ' ' + UI.tag('首充×2', 'orange') : '')) },
    { title: '渠道', render: (o) => (o.channel === 'app_store' ? 'App Store' : 'Google Play') }, { title: '状态', render: (o) => orderStatus(o) }, { title: '下单', render: (o) => UI.time(o.createdAt) },
  ], rows.slice().sort((a, b) => b.createdAt - a.createdAt), { empty: '没有订单' }));
  const orderStatus = (UserParts.orderStatus = (o) => ({ delivered: UI.tag('已发货', 'green'), paid: UI.tag('已付款 · 未发货', 'red'), refunded: UI.tag('已退款', 'gray'), failed: UI.tag('失败', 'gray'), pending: UI.tag('待支付', 'blue') }[o.status]));
  const subsTable = (UserParts.subs = (rows) => UI.table([
    { title: '订阅', render: (x) => `<code>${x.id}</code>` }, { title: '用户', render: (x) => UI.user(x.uid, { size: 22 }) }, { title: '档位', render: (x) => UI.tag(Store.pub('vip').tiers[x.tier].name.zh, 'gold') },
    { title: '状态', render: (x) => UI.tag({ active: '生效中', grace: '宽限期', expired: '已过期', canceled: '已取消', refunded: '已退款' }[x.status], x.status === 'active' ? 'green' : 'gray') },
    { title: '自动续费', render: (x) => (x.autoRenew ? '开' : UI.tag('已关闭', 'orange')) }, { title: '到期', render: (x) => UI.datetime(x.expiresAt) },
    { title: '商店通知', render: (x) => x.notices.map((n) => `<small>${UI.time(n.at)} ${esc(n.type)}</small>`).join('<br>') },
  ], rows, { empty: '没有订阅' }));
  const reportsMini = (UserParts.reports = (rows, by) => UI.table([
    { title: '举报', render: (r) => `<a href="#/reports/${r.id}"><code>${r.id}</code></a>` }, { title: by ? '被举报人' : '举报人', render: (r) => UI.user(by ? r.target : r.reporter, { size: 22 }) },
    { title: '原因', render: (r) => esc(r.reason) }, { title: '来源', render: (r) => ({ game: '对局', profile: '玩家主页', dm: '私聊' }[r.source]) },
    { title: '时间', render: (r) => UI.time(r.at) }, { title: '状态', render: (r) => UI.tag({ pending: '待处理', processing: '处理中', done: '已处理' }[r.status], r.status === 'done' ? 'gray' : 'orange') },
  ], rows, { empty: '没有' }));
  const PEN = { ban: '封号', clear_bio: '清空签名', reset_profile: '重置昵称头像' };
  const penaltyTable = (UserParts.penalties = (rows, withUser) => UI.table([
    ...(withUser ? [{ title: '用户', render: (p) => UI.user(p.uid, { size: 22 }) }] : []),
    { title: '处罚', render: (p) => `${PEN[p.kind]}${p.duration ? ' ' + D.BAN_DURATIONS.find((d) => d.id === p.duration).name : ''}` }, { title: '原因', render: (p) => `${esc(p.reason)}<br><small class="muted">${esc(p.note)}</small>` },
    { title: '来源', render: (p) => esc(p.ref || '—') }, { title: '处理人', render: (p) => esc(Store.who(p.by)) }, { title: '时间', render: (p) => UI.time(p.at) },
    { title: '状态', render: (p) => (p.revoked ? UI.tag('已撤销', 'gray', { title: p.revoked.note }) : p.kind === 'ban' && p.until && p.until < Date.now() ? UI.tag('已到期', 'gray') : UI.tag('生效', 'red')) },
    ...(withUser ? [{ title: '', align: 'r', render: (p) => (!p.revoked && Store.can('punish') && (p.kind === 'ban' ? Store.user(p.uid).status === 'banned' : true) ? `<button class="btn btn-xs" data-act="revoke" data-id="${p.id}">撤销</button>` : '') }] : []),
  ], rows, { empty: '没有处罚记录' }));
  const auditTable = (UserParts.audit = (rows) => UI.table([
    { title: '时间', cls: 'nowrap', render: (a) => UI.datetime(a.at) }, { title: '操作人', cls: 'nowrap', render: (a) => esc(Store.who(a.who)) }, { title: '模块', cls: 'nowrap', render: (a) => esc(a.mod) },
    { title: '操作', cls: 'nowrap', render: (a) => `<b>${esc(a.act)}</b>` }, { title: '对象', render: (a) => (Store.user(a.target) ? UI.user(a.target, { size: 22 }) : `<code>${esc(a.target)}</code>`) },
    { title: '说明', render: (a) => esc(a.detail) }, { title: 'IP', render: (a) => `<code class="sm">${esc(a.ip)}</code>` },
  ], rows, { empty: '没有记录' }));
  UserParts.gameModal = (gameId) => {
    const m = Store.s.matches.find((x) => x.gameId === gameId);
    if (!m) { UI.toast('这一局的记录已经不在了', 'warn'); return; }
    UI.modal({
      title: `对局 ${m.gameId}`, width: '640px',
      body: UI.kv([['玩家', UI.user(m.uid)], ['对手', UI.user(m.opp.bot ? m.opp : m.opp.uid)], ['类型', m.mode === 'room' ? '好友房' : `${Store.stakeName(m.stake)} · 底注 ${UI.n(m.bet)}`], ['结果', `${UI.tag(RESULT[m.result][0], RESULT[m.result][1])} · ${END[m.endReason]}`], ['金币变化', UI.signed(m.delta)], ['开局 · 结束', `${UI.datetime(m.startAt)} → ${UI.time(m.endedAt)}`], ['落子', m.moves + ' 步'], ['用时', UI.dur(m.dur)], ['断线次数', m.disconnects]], { cols: 3 })
        + `<h4 class="sec">表情和快捷语记录（保留 ${Store.pub('emotes').log_days} 天）</h4>${m.emotes.length ? `<div class="elog">${m.emotes.map((e) => `<div class="elog-it ${e.from === 'me' ? 'is-me' : ''}"><small>${UI.time(e.t)} · ${e.from === 'me' ? '玩家' : '对手'}</small>${UI.emote(e)}</div>`).join('')}</div>` : UI.empty('这一局没有发表情和快捷语')}
        <p class="muted sm">局内语音不录音（对局 6.7 建议），“不良语音”举报没有录音可听。</p>`,
    });
  };

  App.page('user', {
    render(el, arg) {
      if (uid !== arg) { uid = arg; st.tab = 'info'; st.lp = 1; st.gp = 1; st.lt = ''; shown = {}; }
      const u = U();
      if (!u) { el.innerHTML = UI.notice('没有这个用户：' + esc(arg), 'danger'); return; }
      if (u.status === 'deleted') {
        const d = Store.s.deletions.find((x) => x.uid === u.uid);
        el.innerHTML = `<div class="page-hd"><div><h1>已注销用户 <code>${u.uid}</code></h1><p>账号、登录方式、资料、金币、装扮、对局记录都已删除，只保留注销时间和来源（账号 4.12）。别人的对局记录和会话里显示“已注销用户”。</p></div></div>${UI.card('注销记录', d ? UI.kv([['来源', esc(d.source)], ['申请时间', UI.datetime(d.requestedAt)], ['完成时间', UI.datetime(d.completedAt)]], { cols: 3 }) : UI.empty())}`;
        return;
      }
      el.innerHTML = `${head(u)}${UI.tabs(TABS.map(([k, n]) => [k, n, k === 'safety' ? Store.s.reports.filter((r) => r.target === u.uid && r.status !== 'done').length || '' : '']), st.tab, 'utab')}<div class="utab-bd">${TAB[st.tab](u)}</div>`;
    },
    input(t) { if (t.matches('[data-lt]')) { st.lt = t.value; st.lp = 1; App.refresh(); } },
    act: {
      utab: (b) => { st.tab = b.dataset.v; App.refresh(); },
      lpage: (b) => { st.lp = +b.dataset.p; App.refresh(); },
      gpage: (b) => { st.gp = +b.dataset.p; App.refresh(); },
      copy: (b) => UI.copy(b.dataset.v),
      game: (b) => UserParts.gameModal(b.dataset.id),
      unmask: (b) => { const w = b.dataset.what; shown[w] = true; Store.unmask(uid, w === 'email' ? '邮箱' : '三方 ID'); App.refresh(); UI.toast('已显示完整信息，这次查看已记入操作日志'); },
      ban: () => banModal(U()),
      unban: async () => { const n = await UI.confirm({ title: `解封 ${esc(U().nickname)}？`, html: '<p>解封后可以马上登录。</p><textarea class="inp" rows="2" id="cf-note" placeholder="原因（选填）"></textarea>', collect: (c) => c.$('#cf-note').value.trim() || '提前解封', ok: '解封' }); if (n) { Store.unban(uid, n); App.refresh(); UI.toast('已解封'); } },
      kick: async () => { if (await UI.confirm({ title: '强制下线？', text: '作废这个账号所有设备的登录态，用户需要重新登录。', ok: '强制下线', danger: true })) { Store.kick(uid); App.refresh(); UI.toast('已强制下线'); } },
      clearbio: async () => { if (await UI.confirm({ title: '清空签名？', html: `<p>原签名：“${esc(U().bio)}”</p><p class="muted">会给用户发系统消息“你的个性签名不符合社区规范，已被清除”。</p>`, ok: '清空', danger: true })) { Store.clearBio(uid); App.refresh(); UI.toast('已清空签名'); } },
      reset: () => resetModal(U()),
      coins: () => coinsModal(U()),
      item: () => itemModal(U()),
      test: () => { Store.markTest(uid, !U().test); App.refresh(); },
    },
  });

  function banModal(u) {
    const self = Store.can('punish');
    const c = UI.modal({
      title: `${self ? '封号' : '发起封号'} · ${esc(u.nickname)}`, width: '520px',
      body: `<div class="form"><div class="f f-wide"><label class="f-l">时长</label><div class="radios">${D.BAN_DURATIONS.map((d, i) => `<label class="rd ${i === 1 ? 'is-on' : ''}"><input type="radio" name="dur" value="${d.id}" ${i === 1 ? 'checked' : ''}><span>${d.name}</span></label>`).join('')}</div></div>
        <div class="f f-wide"><label class="f-l">原因</label><select class="inp" name="reason">${UI.opts(D.BAN_REASONS)}</select></div>
        <div class="f f-wide"><label class="f-l">说明</label><textarea class="inp" rows="2" name="note" placeholder="内部备注，用户看不到"></textarea></div></div>
        ${UI.notice('<ul class="plain"><li>马上作废所有登录态，app 回到登录页提示“账号已被封禁”（错误码 1014）</li><li>匹配中的单自动取消、退还底注（匹配 E21）</li><li>到期自动解封</li></ul>', 'warn')}
        <p class="f-h" data-need></p>`,
      foot: '<button class="btn" data-close>取消</button><button class="btn btn-danger" data-act="go">确定</button>',
      onInput: (t) => { if (t.name === 'dur') { c.$$('.rd').forEach((x) => x.classList.toggle('is-on', x.contains(t))); need(); } },
      act: {
        go: () => {
          const o = { duration: c.$('[name="dur"]:checked').value, reason: c.$('[name="reason"]').value, note: c.$('[name="note"]').value.trim() };
          const res = Store.ban(u.uid, o);
          c.close(); App.refresh();
          UI.toast(res.approval ? `已提交审批 ${res.approval}` : '已封号');
        },
      },
    });
    const need = () => { const d = c.$('[name="dur"]:checked').value; c.$('[data-need]').innerHTML = !self ? '客服只能发起，<b>审核</b>审批通过后生效' : d === 'forever' && Store.role() !== 'admin' ? '永久封号要<b>审核组长</b>审批' : '提交后马上生效'; };
    need();
  }
  function resetModal(u) {
    const def = Store.pub('defaults');
    const c = UI.modal({
      title: `重置昵称头像 · ${esc(u.nickname)}`, width: '520px',
      body: `<div class="reset-pv"><div>${UI.av(u.avatar, 56)}<b>${esc(u.nickname)}</b></div><span>→</span><div>${UI.av(def.avatar, 56)}<b>${esc(def.nickname)}</b></div></div>
        <label class="chk"><input type="checkbox" name="nick" checked> 重置昵称</label> <label class="chk"><input type="checkbox" name="avatar" ${u.avatarSource === 'third' ? 'checked' : ''}> 重置头像</label>
        ${UI.notice('来源记成“后台重置”，以后用 Google、Facebook 登录不会再换回三方资料（否则按账号 4.13 会被覆盖）。会给用户发系统消息“昵称头像被重置”。', 'info', { cls: 'mt' })}`,
      foot: '<button class="btn" data-close>取消</button><button class="btn btn-danger" data-act="go">重置</button>',
      act: { go: () => { const nick = c.$('[name="nick"]').checked; const avatar = c.$('[name="avatar"]').checked; if (!nick && !avatar) { UI.toast('至少选一项', 'warn'); return; } Store.resetProfile(u.uid, { nick, avatar }); c.close(); App.refresh(); UI.toast('已重置'); } },
    });
  }
  function coinsModal(u) {
    const N = D.COIN_APPROVAL_N;
    const c = UI.modal({
      title: `金币调整 · ${esc(u.nickname)}`, width: '540px',
      body: `<div class="form"><div class="fgrid c2"><div class="f"><label class="f-l">方向</label><div class="radios"><label class="rd is-on"><input type="radio" name="dir" value="1" checked><span>加金币</span></label><label class="rd"><input type="radio" name="dir" value="-1"><span>扣金币</span></label></div></div>
        <div class="f"><label class="f-l">数量</label><span class="inp-u"><input type="number" class="inp" name="amt" min="1" value="500"><em>金币</em></span></div></div>
        <div class="f f-wide"><label class="f-l">原因</label><select class="inp" name="reason">${UI.opts(D.COIN_REASONS)}</select></div>
        <div class="f f-wide"><label class="f-l">说明<i class="req">*</i></label><textarea class="inp" rows="2" name="note" placeholder="例如：11-17 对局异常，核实账本后补偿"></textarea></div>
        <label class="chk" data-notify><input type="checkbox" name="notify" checked> 发系统消息通知用户（“{N} 金币已到账”）</label></div>
        <div class="calc-box" data-pv></div>`,
      foot: '<button class="btn" data-close>取消</button><button class="btn btn-primary" data-act="go">提交审批</button>',
      onInput: (t) => { if (t.name === 'dir') c.$$('.rd').forEach((x) => x.classList.toggle('is-on', x.contains(t))); pv(); },
      act: {
        go: () => {
          const amt = Number(c.$('[name="amt"]').value) * Number(c.$('[name="dir"]:checked').value);
          const note = c.$('[name="note"]').value.trim();
          if (!amt) { UI.toast('填一个数量', 'warn'); return; }
          if (!note) { UI.toast('写一下说明', 'warn'); return; }
          const a = Store.requestCoins(u.uid, amt, c.$('[name="reason"]').value, note, c.$('[name="notify"]').checked);
          c.close(); App.refresh(); UI.toast(`已提交审批 ${a.id}`);
        },
      },
    });
    const pv = () => {
      const amt = Number(c.$('[name="amt"]').value || 0) * Number(c.$('[name="dir"]:checked').value);
      c.$('[data-notify]').style.display = amt > 0 ? '' : 'none';
      const after = u.coins + amt;
      c.$('[data-pv]').innerHTML = `当前 <b>${UI.n(u.coins)}</b> → 调整后 <b>${UI.n(Math.max(0, after))}</b>${after < 0 ? UI.notice(`余额不够扣，差 ${UI.n(-after)}：先按“扣到 0”处理（扣成负数还是扣到 0，规则待定，规划 4.1）`, 'warn', { cls: 'mt' }) : ''}
        <p class="f-h">审批：${Math.abs(amt) > N ? `超过 ${UI.n(N)}，要<b>组长 + 财务</b>两级审批` : `不超过 ${UI.n(N)}，<b>组长</b>审批`}。用户明细里显示“系统调整”。</p>`;
    };
    pv();
  }
  function itemModal(u) {
    const list = Store.pub('items').rows.filter((x) => !x.is_default && !u.items.some((y) => y.id === x.id));
    const c = UI.modal({
      title: `发放装扮 · ${esc(u.nickname)}`, width: '520px',
      body: list.length ? `<div class="form"><div class="f f-wide"><label class="f-l">装扮</label><select class="inp" name="item">${UI.opts(list.map((x) => [x.id, `${{ frame: '头像框', bubble: '气泡', bg: '背景' }[x.kind]} · ${x.name.zh}${x.vip ? '（会员专属，会员到期后不能用）' : ''}`]))}</select></div>
        <div class="f f-wide"><label class="f-l">说明<i class="req">*</i></label><textarea class="inp" rows="2" name="note"></textarea></div></div><p class="f-h">来源记“后台”（我的 6.2 user_item.source = admin），组长审批后到账。</p>` : UI.empty('这个用户已经拥有全部装扮'),
      foot: list.length ? '<button class="btn" data-close>取消</button><button class="btn btn-primary" data-act="go">提交审批</button>' : '',
      act: { go: () => { const note = c.$('[name="note"]').value.trim(); if (!note) { UI.toast('写一下说明', 'warn'); return; } const a = Store.requestItem(u.uid, c.$('[name="item"]').value, note); c.close(); App.refresh(); UI.toast(`已提交审批 ${a.id}`); } },
    });
  }

  /* ================= 注销记录 ================= */
  App.page('deletions', {
    render(el) {
      const rows = Store.s.deletions.slice().sort((a, b) => b.requestedAt - a.requestedAt);
      const SRCN = { app: 'app 内', web: '网页（Google Play 要求的删除入口）', facebook: 'Facebook 数据删除回调', apple: 'Apple 服务端通知' };
      el.innerHTML = `<div class="page-hd"><div><h1>注销记录</h1><p>注销提交后立即生效，异步删除数据；这里只记时间和来源，不保留个人信息（账号 4.12、5.1 account_deletion）。</p></div></div>
        ${UI.card('', UI.table([
          { title: 'user_id', render: (d) => (Store.user(d.uid) ? `<a href="#/user/${d.uid}"><code>${d.uid}</code></a>` : `<code>${d.uid}</code>`) }, { title: '来源', render: (d) => esc(SRCN[d.source]) },
          { title: '申请时间', render: (d) => UI.datetime(d.requestedAt) }, { title: '完成时间', render: (d) => (d.completedAt ? UI.datetime(d.completedAt) : '—') },
          { title: '状态', render: (d) => (d.completedAt ? UI.tag('已注销', 'gray') : Date.now() - d.requestedAt > 864e5 ? UI.tag(`注销中 · 已超过 24 小时`, 'red') + '<br><small class="muted">异步删除可能失败了，转研发排查</small>' : UI.tag('注销中', 'orange')) },
        ], rows))}`;
    },
  });
})();
