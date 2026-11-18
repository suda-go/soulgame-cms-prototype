/**
 * 后台状态：配置（版本、草稿、待审批）、用户和资金数据、审批、操作日志
 * 存在 localStorage（sg.cms.v1），右上角“重置演示数据”恢复初始值
 *
 * 配置    Store.pub(ns) 线上数据   Store.view(ns) 页面上显示的数据（待审批 > 草稿 > 线上）
 *         Store.saveDraft(ns, data)  Store.discardDraft(ns)  Store.submitConfig(ns, note)  Store.rollbackTo(ns, v)
 * 审批    Store.approve(id, ok, reason)  Store.withdraw(id)  Store.canApprove(a)
 * 用户    Store.ban / unban / kick / clearBio / resetProfile / requestCoins / requestItem / markTest / unmask
 * 资金    Store.redeliver / handleRefund / voidTicket / handleRecon
 * 数值    Store.econ(over) 按配置算满勤每天能拿的免费金币和单日理论上限
 */
(() => {
  'use strict';
  const KEY = 'sg.cms.v1';
  const H = 36e5;
  const Store = (window.Store = {});
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const now = () => Date.now();
  const subs = new Set();
  let s = null;

  function seed() {
    const t = now();
    const S = Seed.build(t);
    const C = S.configs;
    delete S.configs;
    const hist = Seed.history(C);
    const DEV_NS = ['game', 'match', 'bot', 'gameplay', 'anticheat', 'jumps'];
    const cfg = {};
    Object.keys(C).forEach((ns) => {
      const versions = hist[ns]
        ? hist[ns].map((h, i) => ({ v: i + 1, data: clone(h.data), at: t - h.ago * H, by: h.by, note: h.note, approval: h.approval || null }))
        : [{ v: 1, data: clone(C[ns]), at: t - 50 * H, by: DEV_NS.includes(ns) ? 'dev' : 'ops', note: '首发配置（按各需求文档的配置项）', approval: null }];
      cfg[ns] = { versions, draft: null, pending: null };
    });
    S.approvals.filter((a) => a.type === 'config' && a.status === 'pending').forEach((a) => { cfg[a.ns].pending = a.id; });
    return { v: 1, seededAt: t, role: 'ops', cfg, ...S };
  }
  function load() {
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (_) { s = null; }
    if (!s || s.v !== 1) { s = seed(); save(); }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { console.warn('保存失败', e); }
    subs.forEach((fn) => fn());
  }
  Store.init = load;
  Store.save = save;
  Store.on = (fn) => subs.add(fn);
  Store.reset = () => { localStorage.removeItem(KEY); load(); };
  Object.defineProperty(Store, 's', { get: () => s });

  /* ---------- 角色 ---------- */
  Store.role = () => s.role;
  Store.setRole = (r) => { s.role = r; save(); };
  Store.me = () => ({ role: s.role, ...D.ROLES[s.role] });
  Store.can = (p) => (D.PERMS[s.role] || []).includes(p);
  Store.who = (role) => (D.ROLES[role] ? `${D.ROLES[role].person}（${D.ROLES[role].name}）` : role === 'system' ? '系统' : role || '—');

  /* ---------- 操作日志 ---------- */
  Store.log = (mod, act, target, detail) => {
    s.audit.unshift({ id: 'L' + (8000 + s.audit.length + 1), who: s.role, mod, act, target, detail: detail || '', at: now(), ip: '10.12.8.' + (20 + Object.keys(D.ROLES).indexOf(s.role)) });
  };

  /* ---------- 配置 ---------- */
  const C = (ns) => s.cfg[ns];
  Store.pub = (ns) => { const v = C(ns).versions; return v[v.length - 1].data; };
  Store.pubVersion = (ns) => C(ns).versions.length;
  Store.versions = (ns) => C(ns).versions;
  Store.draft = (ns) => C(ns).draft;
  Store.pending = (ns) => (C(ns).pending ? s.approvals.find((a) => a.id === C(ns).pending) : null);
  Store.view = (ns) => { const p = Store.pending(ns); return p ? p.payload.data : C(ns).draft ? C(ns).draft.data : Store.pub(ns); };
  Store.saveDraft = (ns, data) => {
    if (C(ns).pending) return;
    if (JSON.stringify(data) === JSON.stringify(Store.pub(ns))) C(ns).draft = null;
    else C(ns).draft = { data: clone(data), by: s.role, at: now() };
    save();
  };
  Store.discardDraft = (ns) => { C(ns).draft = null; Store.log('配置', '放弃草稿', ns, Schemas.def(ns).title); save(); };
  function publish(ns, data, note, approval, by) {
    const v = C(ns).versions;
    v.push({ v: v.length + 1, data: clone(data), at: now(), by: by || s.role, note, approval: approval || null });
    C(ns).draft = null;
    C(ns).pending = null;
    s.audit.unshift({ id: 'L' + (8000 + s.audit.length + 1), who: by || s.role, mod: '配置发布', act: `发布 v${v.length}`, target: `${ns} ${Schemas.def(ns).title}`, detail: note + (approval ? `（审批 ${approval}）` : ''), at: now(), ip: '10.12.8.21' });
  }
  /** 提交发布：普通配置直接生效，动到金币的要产品审批，机器人参数要产品 + 研发负责人 */
  Store.submitConfig = (ns, note) => {
    const def = Schemas.def(ns);
    const data = Store.view(ns);
    const errors = Schemas.validate(ns, data);
    if (errors.length) return { errors };
    if (def.risk === 'normal') { publish(ns, data, note); save(); return { published: true, v: Store.pubVersion(ns) }; }
    const steps = def.risk === 'bot' ? [{ who: 'pm', done: null }, { who: 'devlead', done: null }] : [{ who: 'pm', done: null }];
    const a = { id: 'AP' + (2100 + s.approvals.length), type: 'config', ns, title: `${def.title}：${note}`, note, by: s.role, at: now(), steps, status: 'pending', payload: { data: clone(data), base: Store.pubVersion(ns) } };
    s.approvals.unshift(a);
    C(ns).pending = a.id;
    C(ns).draft = null;
    Store.log('审批', '提交审批', `${ns} ${def.title}`, `${a.id} ${note}`);
    save();
    return { approval: a.id };
  };
  Store.rollbackTo = (ns, v) => {
    const ver = C(ns).versions[v - 1];
    C(ns).draft = { data: clone(ver.data), by: s.role, at: now(), rollback: v };
    Store.log('配置', '以历史版本为草稿', `${ns} ${Schemas.def(ns).title}`, `回滚到 v${v}`);
    save();
  };

  /* ---------- 审批 ---------- */
  Store.approval = (id) => s.approvals.find((a) => a.id === id);
  Store.curStep = (a) => a.steps.find((x) => !x.done);
  Store.canApprove = (a) => {
    if (a.status !== 'pending' || a.by === s.role) return false;
    const st = Store.curStep(a);
    return !!st && D.APPROVERS[st.who].roles.includes(s.role);
  };
  Store.myApprovals = () => s.approvals.filter((a) => Store.canApprove(a));
  function exec(a) {
    const p = a.payload;
    if (a.type === 'config') publish(a.ns, p.data, a.note, a.id, a.by);
    if (a.type === 'coins') applyCoins(p.uid, p.amount, p.reason, a.note, p.notify, a.id);
    if (a.type === 'item') applyItem(p.uid, p.item, a.note, a.id);
    if (a.type === 'ban') applyBan(p.uid, p, a.id);
    if (a.type === 'redeliver') applyRedeliver(p.orderId, a.id);
  }
  Store.approve = (id, ok, reason) => {
    const a = Store.approval(id);
    if (!Store.canApprove(a)) return false;
    Store.curStep(a).done = { by: s.role, at: now(), ok, reason: reason || '' };
    if (!ok) {
      a.status = 'rejected';
      if (a.type === 'config') { C(a.ns).pending = null; C(a.ns).draft = { data: clone(a.payload.data), by: a.by, at: now(), rejected: reason }; }
      if (a.type === 'ban') a.payload.reports && a.payload.reports.forEach((rid) => { const r = s.reports.find((x) => x.id === rid); if (r) r.status = 'processing'; });
    } else if (a.steps.every((x) => x.done)) {
      a.status = 'approved';
      exec(a);
    }
    Store.log('审批', ok ? '通过' : '驳回', a.id, a.title + (reason ? `：${reason}` : ''));
    save();
    return true;
  };
  Store.withdraw = (id) => {
    const a = Store.approval(id);
    if (!a || a.by !== s.role || a.status !== 'pending') return;
    a.status = 'withdrawn';
    if (a.type === 'config') { C(a.ns).pending = null; C(a.ns).draft = { data: clone(a.payload.data), by: a.by, at: now() }; }
    Store.log('审批', '撤回', a.id, a.title);
    save();
  };
  function request(type, title, note, steps, payload) {
    const a = { id: 'AP' + (2100 + s.approvals.length), type, title, note, by: s.role, at: now(), steps: steps.map((who) => ({ who, done: null })), status: 'pending', payload };
    s.approvals.unshift(a);
    Store.log('审批', '提交审批', payload.uid || payload.orderId || '', `${a.id} ${title}`);
    save();
    return a;
  }

  /* ---------- 用户 ---------- */
  Store.user = (uid) => s.users.find((u) => u.uid === uid);
  Store.users = () => s.users;
  Store.findUsers = (q) => {
    q = String(q || '').trim().toLowerCase();
    if (!q) return s.users;
    return s.users.filter((u) => u.uid === q || u.displayId === q || u.nickname.toLowerCase().includes(q)
      || u.identities.some((i) => (i.email && i.email.toLowerCase() === q) || i.sub.toLowerCase() === q)
      || u.sessions.some((x) => x.deviceId.toLowerCase() === q));
  };
  Store.send = (uid, key, params) => { s.sent.unshift({ id: 'M' + Math.random().toString().slice(2, 8), uid, key, params: params || {}, at: now(), by: s.role }); };
  function addLedger(u, amount, type, ref, params) {
    u.coins += amount;
    s.ledger.push({ id: s.ledger.length + 100000, uid: u.uid, amount, balance: u.coins, type, ref, params: params || {}, at: now() });
  }
  function penalty(uid, kind, o) {
    const p = { id: 'P' + (301 + s.penalties.length), uid, kind, duration: o.duration || '', reason: o.reason, note: o.note || '', by: s.role, at: now(), until: o.until || null, revoked: null, ref: o.ref || '' };
    s.penalties.unshift(p);
    return p;
  }
  function applyBan(uid, o, approval) {
    const u = Store.user(uid);
    const d = D.BAN_DURATIONS.find((x) => x.id === o.duration);
    u.status = 'banned';
    u.ban = { until: d.ms ? now() + d.ms : null, reason: o.reason, by: s.role, at: now(), note: o.note || '' };
    u.sessions.forEach((x) => { if (!x.revokedAt) x.revokedAt = now(); });
    // 匹配中的单自动取消、退还底注（匹配 E21）
    s.tickets.filter((t) => t.uid === uid && t.escrow > 0 && ['queued', 'matched', 'confirming'].includes(t.status)).forEach((t) => {
      t.status = 'cancelled'; t.timeline.push({ s: 'cancelled', at: now(), note: '账号被封禁，自动取消并退还底注' });
      addLedger(u, t.escrow, 'stake_refund', t.id, { stake: t.stake }); u.escrow -= t.escrow; t.escrow = 0;
    });
    penalty(uid, 'ban', { duration: o.duration, reason: o.reason, note: o.note, until: u.ban.until, ref: o.ref || (approval ? '审批 ' + approval : '') });
    (o.reports || []).forEach((rid) => doneReport(rid, { action: 'ban', duration: o.duration, note: o.note }));
    Store.log('账号处置', `封号 ${d.name}`, uid, `${o.reason}${o.note ? '：' + o.note : ''}${approval ? '（审批 ' + approval + '）' : ''}`);
  }
  /** 封号：审核直接执行（永久要审核组长审批）；客服只能发起，审核审批 */
  Store.ban = (uid, o) => {
    const u = Store.user(uid);
    const dname = D.BAN_DURATIONS.find((x) => x.id === o.duration).name;
    if (Store.can('punish') && (o.duration !== 'forever' || s.role === 'admin')) { applyBan(uid, o); save(); return { done: true }; }
    const steps = Store.can('punish') ? ['modlead'] : ['mod'];
    (o.reports || []).forEach((rid) => { const r = s.reports.find((x) => x.id === rid); if (r) r.status = 'processing'; });
    const a = request('ban', `封号 ${dname}：${u.nickname}（${u.displayId}）`, `${o.reason}${o.note ? '：' + o.note : ''}`, steps, { uid, ...o });
    return { approval: a.id };
  };
  Store.unban = (uid, note) => {
    const u = Store.user(uid);
    u.status = 'normal'; u.ban = null;
    s.penalties.filter((p) => p.uid === uid && p.kind === 'ban' && !p.revoked).forEach((p) => { p.revoked = { by: s.role, at: now(), note: note || '' }; });
    Store.log('账号处置', '解封', uid, note || '');
    save();
  };
  Store.kick = (uid) => {
    Store.user(uid).sessions.forEach((x) => { if (!x.revokedAt) x.revokedAt = now(); });
    Store.log('账号处置', '强制下线', uid, '作废所有设备的登录态');
    save();
  };
  Store.clearBio = (uid, o = {}) => {
    const u = Store.user(uid);
    const old = u.bio;
    u.bio = '';
    Store.send(uid, 'bio_cleared');
    penalty(uid, 'clear_bio', { reason: o.reason || '不良资料（昵称、头像、签名）', note: `原签名“${old}”`, ref: o.ref });
    Store.log('内容安全', '清空签名', uid, `原签名“${old}”`);
    if (!o.noSave) save();
  };
  Store.resetProfile = (uid, o = {}) => {
    const u = Store.user(uid);
    const def = Store.pub('defaults');
    const parts = [];
    if (o.nick !== false) { u.nickPrev = u.nickname; u.nickname = def.nickname; u.nickSource = 'admin'; parts.push(`昵称“${u.nickPrev}”`); }
    if (o.avatar) { u.avatar = def.avatar; u.avatarSource = 'admin'; parts.push('头像'); }
    Store.send(uid, 'profile_reset');
    penalty(uid, 'reset_profile', { reason: o.reason || '不良资料（昵称、头像、签名）', note: '重置' + parts.join('、'), ref: o.ref });
    Store.log('内容安全', '重置' + parts.join('、'), uid, '改回默认，来源记为“后台重置”，三方登录不再覆盖');
    if (!o.noSave) save();
  };
  function applyCoins(uid, amount, reason, note, notify, approval) {
    const u = Store.user(uid);
    let real = amount;
    if (amount < 0 && u.coins + amount < 0) real = -u.coins; // 规则待定：先按“扣到 0”演示
    addLedger(u, real, 'admin_adjust', approval || 'ADJ' + now(), { reason, note, asked: amount });
    if (notify && amount > 0) Store.send(uid, 'compensation', { N: amount, 原因: reason });
    Store.log('资产调整', `金币 ${amount > 0 ? '+' : ''}${amount}`, uid, `${reason}：${note}${real !== amount ? `（余额不够，实际扣 ${-real}）` : ''}`);
  }
  /** 金币调整都要审批：不超过 N 组长审，超过 N 组长 + 财务 */
  Store.requestCoins = (uid, amount, reason, note, notify) => {
    const u = Store.user(uid);
    const steps = Math.abs(amount) > D.COIN_APPROVAL_N ? ['lead', 'fin'] : ['lead'];
    return request('coins', `金币调整：${u.nickname} ${amount > 0 ? '+' : ''}${amount.toLocaleString()}（${reason}）`, note, steps, { uid, amount, reason, notify });
  };
  function applyItem(uid, item, note, approval) {
    const u = Store.user(uid);
    if (!u.items.some((x) => x.id === item)) u.items.push({ id: item, source: 'admin', at: now(), ref: approval });
    Store.log('资产调整', '发放装扮', uid, `${Store.itemName(item)}：${note}`);
  }
  Store.requestItem = (uid, item, note) => {
    const u = Store.user(uid);
    return request('item', `发放装扮：${u.nickname} · ${Store.itemName(item)}`, note, ['lead'], { uid, item });
  };
  Store.markTest = (uid, on) => { Store.user(uid).test = on; Store.log('账号处置', on ? '标记测试账号' : '取消测试账号', uid, ''); save(); };
  Store.unmask = (uid, what) => { Store.log('用户查询', '查看完整' + what, uid, ''); save(); };

  /* ---------- 举报与复审 ---------- */
  function doneReport(id, result) {
    const r = s.reports.find((x) => x.id === id);
    if (!r) return;
    r.status = 'done';
    r.result = { ...result, by: s.role, at: now() };
  }
  Store.claimReports = (ids) => {
    let changed = false;
    ids.forEach((id) => { const r = s.reports.find((x) => x.id === id); if (r && r.status === 'pending') { r.status = 'processing'; r.claimedBy = s.role; changed = true; } });
    if (changed) save();
  };
  /** 处理同一个被举报人的全部待处理举报 */
  Store.handleReports = (ids, action, o = {}) => {
    const first = s.reports.find((x) => x.id === ids[0]);
    const uid = first.target;
    if (action === 'ban') {
      const res = Store.ban(uid, { duration: o.duration, reason: o.reason, note: o.note, reports: ids, ref: '举报 ' + ids.join('、') });
      if (res.approval) return res;
      return { done: true };
    }
    if (action === 'clear_bio') Store.clearBio(uid, { ref: '举报 ' + ids.join('、'), noSave: true });
    if (action === 'reset_profile') Store.resetProfile(uid, { nick: true, avatar: !!o.avatar, ref: '举报 ' + ids.join('、'), noSave: true });
    ids.forEach((id) => doneReport(id, { action, note: o.note }));
    Store.log('内容安全', '处理举报', typeof uid === 'string' ? uid : '', `${ids.join('、')} → ${{ none: '不处罚', clear_bio: '清空签名', reset_profile: '重置昵称头像' }[action]}${o.note ? '：' + o.note : ''}`);
    save();
    return { done: true };
  };
  Store.reviewBio = (id, pass) => {
    const b = s.bio.find((x) => x.id === id);
    b.status = pass ? 'passed' : 'rejected';
    b.by = s.role; b.doneAt = now();
    if (pass) Store.log('内容安全', '签名复审通过', b.uid, `“${b.text}”`);
    else if (Store.user(b.uid).bio === b.text) Store.clearBio(b.uid, { ref: '签名复审 ' + id, noSave: true });
    save();
  };
  Store.addWord = (w) => { s.words.unshift({ id: 'W' + (s.words.length + 100), by: s.role, at: now(), ...w }); Store.log('内容安全', '添加敏感词', w.w, `${w.lang} · ${w.cat} · ${w.act === 'block' ? '拦截' : '送审'}`); save(); };
  Store.removeWord = (id) => { const w = s.words.find((x) => x.id === id); s.words = s.words.filter((x) => x.id !== id); Store.log('内容安全', '删除敏感词', w.w, w.lang); save(); };
  Store.revokePenalty = (id, note) => {
    const p = s.penalties.find((x) => x.id === id);
    if (p.kind === 'ban') { Store.unban(p.uid, note); return; }
    p.revoked = { by: s.role, at: now(), note };
    Store.log('账号处置', '撤销处罚', p.uid, `${p.id}：${note}`);
    save();
  };

  /* ---------- 订单与资金 ---------- */
  function applyRedeliver(orderId, approval) {
    const o = s.orders.find((x) => x.id === orderId);
    if (o.status !== 'paid') return;
    const u = Store.user(o.uid);
    o.status = 'delivered'; o.deliveredAt = now(); o.redelivered = { by: s.role, at: now(), approval: approval || null };
    addLedger(u, o.coins, 'topup', o.id, { price: '$' + o.usd });
    Store.log('订单', '补单', o.id, `向商店核实已付款，补发 ${o.coins} 金币（按订单号幂等）${approval ? '（审批 ' + approval + '）' : ''}`);
  }
  Store.redeliver = (orderId) => {
    if (Store.can('order.handle')) { applyRedeliver(orderId); save(); return { done: true }; }
    const o = s.orders.find((x) => x.id === orderId);
    return { approval: request('redeliver', `补单：${o.id}（${o.coins.toLocaleString()} 金币）`, '用户反馈付款后没到账', ['fin'], { orderId, uid: o.uid }).id };
  };
  Store.handleRefund = (id, mode) => {
    const r = s.refunds.find((x) => x.id === id);
    const u = Store.user(r.uid);
    const can = Math.min(u.coins, r.coins);
    const take = mode === 'negative' ? r.coins : can;
    addLedger(u, -take, 'admin_adjust', r.orderId, { reason: '退款扣回', note: `订单 ${r.orderId} 已退款`, asked: -r.coins });
    r.status = 'done';
    r.result = { mode, taken: take, short: r.coins - take, by: s.role, at: now() };
    if (r.coins - take > 0) u.risk = { rule: `退款后金币不够扣（差 ${(r.coins - take).toLocaleString()}）`, at: now() };
    Store.log('订单', '退款扣回', r.orderId, `扣回 ${take.toLocaleString()} 金币${r.coins - take > 0 ? `，还差 ${(r.coins - take).toLocaleString()}，已标记风控` : ''}`);
    save();
  };
  Store.voidTicket = (id, note) => {
    const t = s.tickets.find((x) => x.id === id);
    const u = Store.user(t.uid);
    if (t.escrow > 0) { addLedger(u, t.escrow, 'abort_refund', t.id, { stake: t.stake }); u.escrow -= t.escrow; }
    t.timeline.push({ s: 'aborted', at: now(), note: `后台手动作废，托管原路退还：${note}` });
    t.status = 'aborted'; t.escrow = 0; t.updatedAt = now();
    Store.log('资金', '作废匹配单', t.id, note);
    save();
  };
  Store.reviewTicket = (id, note) => {
    const t = s.tickets.find((x) => x.id === id);
    t.review = 'done';
    s.recon.filter((r) => r.ticket === id).forEach((r) => { r.handled = { by: s.role, at: now(), note }; });
    Store.log('资金', '复核自动作废的匹配单', id, note);
    save();
  };
  Store.handleRecon = (id, note) => {
    const r = s.recon.find((x) => x.id === id);
    r.handled = { by: s.role, at: now(), note };
    Store.log('资金', '处理对账告警', id, note);
    save();
  };

  /* ---------- 名称与文案 ---------- */
  Store.item = (id) => Store.pub('items').rows.find((x) => x.id === id);
  Store.itemName = (id) => { const it = Store.item(id); return it ? it.name.zh : id; };
  Store.stakeName = (id) => { const st = Store.pub('stakes').rows.find((x) => x.id === id); return st ? st.name.zh : id; };
  Store.persona = (id) => Store.pub('bot').personas.find((x) => x.id === id);
  Store.text = (key, lang = 'zh') => {
    const row = Store.pub('i18n').rows.find((x) => x.key === key);
    return row ? row.text[lang] || '' : key;
  };
  /** 用户在收支明细里看到的备注（我的 6.7） */
  Store.note = (e, lang = 'zh') => {
    const def = D.LEDGER[e.type];
    if (!def) return e.type;
    const p = e.params || {};
    const task = p.task && Store.pub('tasks').rows.find((x) => x.id === p.task);
    const map = {
      场次名: p.stake ? Store.pub('stakes').rows.find((x) => x.id === p.stake).name[lang] : '', stake: p.stake ? Store.pub('stakes').rows.find((x) => x.id === p.stake).name[lang] : '',
      N: p.N, 任务名: task ? task.name[lang] : p.task, task: task ? task.name[lang] : p.task, 价格: p.price, price: p.price,
      装扮名: p.item ? (Store.item(p.item) || { name: { [lang]: p.item } }).name[lang] : '', item: p.item ? (Store.item(p.item) || { name: { [lang]: p.item } }).name[lang] : '',
      通话类型: p.call ? Store.text('misc.call_' + p.call, lang) : '', call: p.call ? Store.text('misc.call_' + p.call, lang) : '',
    };
    return Store.text(def.note, lang).replace(/\{([^}]+)\}/g, (m, k) => (map[k] != null ? map[k] : m));
  };

  /* ---------- 数值总览（签到与任务 6.8 的算法） ---------- */
  Store.econ = (over = {}) => {
    const g = (ns) => over[ns] || Store.pub(ns);
    const sign = g('signin');
    const tasks = g('tasks').rows.filter((t) => t.enabled);
    const chests = g('chests');
    const stakes = g('stakes').rows.filter((x) => x.enabled).sort((a, b) => a.bet - b.bet);
    const today = new Date().toISOString().slice(0, 10);
    const sum = (arr) => arr.reduce((a, b) => a + b, 0);
    const wsum = sum(chests.mystery.map((x) => x.weight)) || 1;
    const mysteryAvg = sum(chests.mystery.map((x) => x.coins * x.weight)) / wsum;
    const mysteryMax = Math.max(...chests.mystery.map((x) => x.coins));
    const daily = sum(tasks.filter((t) => t.group === 'daily').map((t) => t.reward.coins));
    const weekly = sum(tasks.filter((t) => t.group === 'weekly').map((t) => t.reward.coins));
    const newbieTasks = sum(tasks.filter((t) => t.group === 'newbie').map((t) => t.reward.coins));
    const limited = tasks.filter((t) => t.group === 'limited' && t.start <= today && t.end >= today);
    const limitedSum = sum(limited.map((t) => t.reward.coins));
    return g('vip').tiers.map((tier) => {
      const m = tier.sign || 1;
      const signAvg = (sum(sign.days.map((d) => d.coins)) * m) / 7;
      const signMax = Math.max(...sign.days.map((d) => (d.coins + (d.frame ? sign.dup_frame_coins : 0)) * m));
      const avg = signAvg + daily + mysteryAvg + chests.streak_coins / 7 + weekly / 7;
      const cap = signMax + daily + mysteryMax + chests.streak_coins + weekly + limitedSum + newbieTasks;
      return {
        tier: tier.id, name: tier.name.zh, signAvg, signMax, daily, mysteryAvg, mysteryMax, streakAvg: chests.streak_coins / 7, streak: chests.streak_coins,
        weeklyAvg: weekly / 7, weekly, avg, cap, limited, limitedSum, newbieTasks, newbieGift: g('newbie').coins, vipDaily: tier.daily, aid: tier.aid_times * tier.aid_coins,
        minBet: stakes[0] ? stakes[0].bet : 0, games: stakes[0] ? Math.floor((avg + tier.daily) / stakes[0].bet) : 0,
      };
    });
  };

  /* ---------- 角标 ---------- */
  Store.badge = {
    reports: () => new Set(s.reports.filter((r) => r.status !== 'done').map((r) => JSON.stringify(r.target))).size,
    bio: () => s.bio.filter((b) => b.status === 'pending').length,
    approvals: () => Store.myApprovals().length,
    recon: () => s.recon.filter((r) => r.status === 'alert' && !r.handled).length,
    refunds: () => s.refunds.filter((r) => r.status === 'pending').length + s.orders.filter((o) => o.status === 'paid').length,
    deletions: () => s.deletions.filter((d) => !d.completedAt && now() - d.requestedAt > 24 * H).length,
  };
})();
