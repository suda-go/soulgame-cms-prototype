/**
 * 订单与资金：订单和订阅 #/orders、补单和退款 #/refunds、金币账本 #/ledger、匹配单与托管 #/tickets、对账告警 #/recon（规划 4.6）
 */
(() => {
  'use strict';
  const esc = UI.esc;
  const st = { ot: 'orders', os: '', lq: '', lt: '', lp: 1, tq: '' };
  const Q5 = UI.notice('支付渠道还没定（规划 Q5）：原型是“小米钱包（模拟）”。下面按 Google Play / App Store 内购演示，价格在商店后台定，退款和续费靠商店的服务端通知。', 'info');

  /* ================= 订单和订阅 ================= */
  App.page('orders', {
    render(el, arg) {
      if (arg === 'sub') st.ot = 'subs';
      const rows = Store.s.orders.filter((o) => !st.os || o.status === st.os);
      el.innerHTML = `<div class="page-hd"><div><h1>订单和订阅</h1><p>充值金币和会员订阅的订单。注销前会检查自动续费（账号 4.12），客服在这里能看到。</p></div></div>${Q5}
        <div class="card"><div class="card-bd"><div class="toolbar">${UI.tabs([['orders', '订单', Store.s.orders.length], ['subs', '订阅', Store.s.subs.length]], st.ot, 'ot')}<span class="grow"></span>
          ${st.ot === 'orders' ? `<select class="inp" data-os>${UI.opts([['', '全部状态'], ['delivered', '已发货'], ['paid', '已付款 · 未发货'], ['refunded', '已退款']], st.os)}</select>` : ''}</div>
          ${st.ot === 'orders' ? UserParts.orders(rows) : UserParts.subs(Store.s.subs)}</div></div>`;
      if (arg && /^SG/.test(arg)) setTimeout(() => orderDrawer(arg), 0);
    },
    input(t) { if (t.matches('[data-os]')) { st.os = t.value; App.refresh(); } },
    act: { ot: (b) => { st.ot = b.dataset.v; App.refresh(); } },
  });
  function orderDrawer(id) {
    const o = Store.s.orders.find((x) => x.id === id);
    if (!o) return;
    const led = Store.s.ledger.filter((e) => e.ref === o.id);
    UI.drawer({
      title: `订单 ${o.id}`, sub: UserParts.orderStatus(o),
      body: UI.kv([['用户', UI.user(o.uid)], ['商品', o.kind === 'vip' ? '会员订阅' : `金币档位 ${o.prodId}`], ['商店商品 ID', `<code>${esc(o.productId)}</code>`], ['金额', UI.usd(o.usd)], ['到账金币', o.kind === 'vip' ? '—' : UI.n(o.coins) + (o.first ? ' （首充双倍）' : '')], ['渠道', o.channel === 'app_store' ? 'App Store' : 'Google Play'], ['商店交易号', `<code>${esc(o.storeTxn)}</code>`], ['下单', UI.datetime(o.createdAt)], ['付款', UI.datetime(o.paidAt)], ['发货', UI.datetime(o.deliveredAt)], ['退款', UI.datetime(o.refundedAt)]], { cols: 2 })
        + (o.note ? UI.notice(esc(o.note), 'warn', { cls: 'mt' }) : '') + `<h4 class="sec">账本里的记录</h4>${UI.table([{ title: '时间', render: (e) => UI.datetime(e.at) }, { title: '类型', render: (e) => esc(D.LEDGER[e.type].name) }, { title: '变化', align: 'r', render: (e) => UI.signed(e.amount) }, { title: '备注', render: (e) => esc(Store.note(e)) }], led, { empty: '账本里没有这笔订单的金币变化' })}`
        + (o.status === 'paid' ? `<p class="mt"><a class="btn btn-primary btn-sm" href="#/refunds">去补单</a></p>` : ''),
    });
  }

  /* ================= 补单和退款 ================= */
  App.page('refunds', {
    render(el) {
      const paid = Store.s.orders.filter((o) => o.status === 'paid');
      el.innerHTML = `<div class="page-hd"><div><h1>补单和退款</h1><p>补单：用户付了钱没到账，向商店核实后按订单号补发，幂等，不会发两次。退款：收到商店的退款通知后扣回金币或取消会员，用户明细显示“系统调整”（我的 4.7）。</p></div></div>
        ${UI.card(`待补单（${paid.length}）`, UI.table([
          { title: '订单号', render: (o) => `<a href="#/orders/${o.id}"><code>${o.id}</code></a>` }, { title: '用户', render: (o) => UI.user(o.uid) }, { title: '金额', align: 'r', render: (o) => UI.usd(o.usd) },
          { title: '应到账', align: 'r', render: (o) => UI.n(o.coins) }, { title: '付款时间', render: (o) => `${UI.time(o.paidAt)}<br><small class="muted">${UI.ago(o.paidAt)}</small>` }, { title: '说明', render: (o) => esc(o.note || '') },
          { title: '', align: 'r', render: (o) => (Store.can('order.handle') ? `<button class="btn btn-sm btn-primary" data-act="redo" data-id="${o.id}">核实并补发</button>` : Store.can('order.request') ? `<button class="btn btn-sm" data-act="redo" data-id="${o.id}">发起补单</button>` : '') },
        ], paid, { empty: '没有待补单' }))}
        ${UI.card('退款通知', UI.table([
          { title: '通知', render: (r) => `<code>${r.id}</code><br><small class="muted">${esc(r.source)}</small>` }, { title: '订单', render: (r) => `<a href="#/orders/${r.orderId}"><code>${r.orderId}</code></a>` },
          { title: '用户', render: (r) => UI.user(r.uid) }, { title: '要扣回', align: 'r', render: (r) => UI.n(r.coins) }, { title: '用户现在的金币', align: 'r', render: (r) => UI.n(Store.user(r.uid).coins) },
          { title: '收到', render: (r) => UI.time(r.at) },
          { title: '状态', render: (r) => (r.status === 'pending' ? UI.tag('待扣回', 'red') : `${UI.tag('已扣回 ' + UI.n(r.result.taken), 'gray')}${r.result.short ? `<br><small class="down">还差 ${UI.n(r.result.short)}，已标记风控</small>` : ''}`) },
          { title: '', align: 'r', render: (r) => (r.status === 'pending' && Store.can('order.handle') ? `<button class="btn btn-sm btn-primary" data-act="claw" data-id="${r.id}">处理</button>` : '') },
        ], Store.s.refunds, { empty: '没有退款通知' }))}`;
    },
    act: {
      redo: async (b) => {
        const o = Store.s.orders.find((x) => x.id === b.dataset.id);
        const self = Store.can('order.handle');
        if (!(await UI.confirm({ title: self ? '核实并补发？' : '发起补单？', html: `<p>订单 <code>${o.id}</code>，${UI.usd(o.usd)}，应到账 <b>${UI.n(o.coins)}</b> 金币。</p><p class="muted">${self ? '演示：向商店查询这笔交易已付款，然后按订单号补发（重复点不会多发）。' : '客服发起，财务核实后补发。'}</p>`, ok: self ? '补发' : '提交' }))) return;
        const r = Store.redeliver(o.id);
        App.refresh(); UI.toast(r.approval ? `已提交 ${r.approval}，等财务处理` : '已补发');
      },
      claw: (b) => {
        const r = Store.s.refunds.find((x) => x.id === b.dataset.id);
        const u = Store.user(r.uid);
        const short = r.coins - u.coins;
        const c = UI.modal({
          title: '处理退款', width: '520px',
          body: `${UI.kv([['用户', UI.user(u.uid)], ['订单', `<code>${r.orderId}</code>`], ['要扣回', UI.n(r.coins)], ['现在的金币', UI.n(u.coins)]], { cols: 2 })}
            ${short > 0 ? UI.notice(`金币已经花掉一部分，不够扣，差 ${UI.n(short)}。怎么处理还没定（规划 4.6）：`, 'warn', { cls: 'mt' }) : ''}
            <div class="radios mt"><label class="rd is-on"><input type="radio" name="m" value="zero" checked><span>${short > 0 ? '扣到 0，差额标记风控' : `扣回 ${UI.n(r.coins)}`}</span></label>${short > 0 ? '<label class="rd"><input type="radio" name="m" value="negative"><span>扣成负数（规则待定）</span></label>' : ''}</div>`,
          foot: '<button class="btn" data-close>取消</button><button class="btn btn-danger" data-act="go">扣回</button>',
          onInput: (t) => c.$$('.rd').forEach((x) => x.classList.toggle('is-on', x.contains(t))),
          act: { go: () => { Store.handleRefund(r.id, c.$('[name="m"]:checked').value); c.close(); App.refresh(); UI.toast('已扣回'); } },
        });
      },
    },
  });

  /* ================= 金币账本 ================= */
  App.page('ledger', {
    render(el) {
      const q = st.lq.toLowerCase();
      const users = q ? Store.findUsers(q).map((u) => u.uid) : null;
      const rows = Store.s.ledger.filter((e) => (!st.lt || e.type === st.lt) && (!q || users.includes(e.uid) || String(e.ref).toLowerCase() === q)).sort((a, b) => b.at - a.at || b.id - a.id);
      const day = Date.now() - 864e5;
      const last = Store.s.ledger.filter((e) => e.at > day);
      el.innerHTML = `<div class="page-hd"><div><h1>金币账本</h1><p>每一笔金币变化一行，带变化后的余额；(类型, 关联单号) 唯一，同一笔不会记两次。后台查全量，app 只显示最近 90 天。</p></div>
        <div class="page-hd-r">${Store.can('export') ? '<button class="btn btn-sm" data-act="export">导出 CSV</button>' : '<span class="muted sm">导出要财务权限</span>'}</div></div>
        <div class="stats">${UI.stat('最近 24 小时产出', UI.n(last.filter((e) => e.amount > 0).reduce((a, e) => a + e.amount, 0)), { sub: '所有加金币的记录' })}${UI.stat('最近 24 小时消耗', UI.n(-last.filter((e) => e.amount < 0).reduce((a, e) => a + e.amount, 0)), { sub: '底注、买装扮、通话' })}${UI.stat('后台调整', UI.n(Store.s.ledger.filter((e) => e.type === 'admin_adjust').reduce((a, e) => a + e.amount, 0)), { sub: 'admin_adjust 合计' })}${UI.stat('记录数', UI.n(Store.s.ledger.length))}</div>
        <div class="card"><div class="card-bd"><form class="toolbar" data-form="lq"><input class="inp" name="q" style="width:300px" value="${esc(st.lq)}" placeholder="用户（展示 ID、昵称……）或关联单号"><button class="btn btn-sm btn-primary">查询</button>
          <select class="inp" data-lt>${UI.opts([['', '全部类型'], ...Object.entries(D.LEDGER).map(([k, v]) => [k, `${v.name}（${k}）`])], st.lt)}</select></form>
          ${UI.table([
            { title: '时间', render: (e) => UI.datetime(e.at) }, { title: '用户', render: (e) => UI.user(e.uid, { size: 22 }) }, { title: '类型', render: (e) => `${esc(D.LEDGER[e.type].name)}<br><code class="sm">${e.type}</code>` },
            { title: '变化', align: 'r', render: (e) => UI.signed(e.amount) }, { title: '变化后余额', align: 'r', render: (e) => UI.n(e.balance) }, { title: '关联单号', render: (e) => `<code class="sm">${esc(e.ref || '—')}</code>` },
            { title: '用户看到的备注', render: (e) => esc(Store.note(e)) + (e.type === 'admin_adjust' && e.params.reason ? `<br><small class="muted">内部原因：${esc(e.params.reason)}</small>` : '') },
          ], UI.page(rows, st.lp))}${UI.pager(rows.length, st.lp)}</div></div>`;
    },
    submit(f) { st.lq = f.q.value.trim(); st.lp = 1; App.refresh(); },
    input(t) { if (t.matches('[data-lt]')) { st.lt = t.value; st.lp = 1; App.refresh(); } },
    act: {
      page: (b) => { st.lp = +b.dataset.p; App.refresh(); },
      export: () => {
        const rows = Store.s.ledger.slice(-500).map((e) => [UI.datetime(e.at), e.uid, e.type, e.amount, e.balance, e.ref, Store.note(e)]);
        UI.download('金币账本.csv', [['时间', 'user_id', '类型', '变化', '变化后余额', '关联单号', '备注'], ...rows]);
        Store.log('资金', '导出账本', '金币账本', `${rows.length} 条`); Store.save(); UI.toast('已导出最近 500 条，导出已记入操作日志');
      },
    },
  });

  /* ================= 匹配单与托管 ================= */
  const TS = { queued: ['匹配中', 'blue'], matched: ['已匹配', 'blue'], confirming: ['准备确认中', 'blue'], playing: ['对局中', 'purple'], settled: ['已结算', 'gray'], cancelled: ['已取消', 'gray'], aborted: ['已作废', 'orange'] };
  App.page('tickets', {
    render(el, arg) {
      if (arg && arg !== 'tickets') st.tq = arg;
      const q = st.tq.toLowerCase();
      const rows = Store.s.tickets.filter((t) => !q || t.id.toLowerCase() === q || t.gameId.toLowerCase() === q || t.uid === q || (Store.user(t.uid) || {}).displayId === q || (Store.user(t.uid) || {}).nickname.toLowerCase().includes(q)).sort((a, b) => b.updatedAt - a.updatedAt);
      const live = Store.s.tickets.filter((t) => t.escrow > 0);
      el.innerHTML = `<div class="page-hd"><div><h1>匹配单与托管</h1><p>开始匹配时扣底注放进托管，结算、取消、作废时从托管转出（匹配 6.3）。客服最常遇到的“扣了底注没退”在这里查。</p></div></div>
        <div class="stats">${UI.stat('托管中的单', live.length)}${UI.stat('托管中的金币', UI.n(live.reduce((a, t) => a + t.escrow, 0)))}${UI.stat('系统自动作废、待复核', Store.s.tickets.filter((t) => t.review === 'pending').length, { tone: 'warn' })}</div>
        <div class="card"><div class="card-bd"><form class="toolbar" data-form="tq"><input class="inp" name="q" style="width:300px" value="${esc(st.tq)}" placeholder="ticket_id / game_id / 用户"><button class="btn btn-sm btn-primary">查询</button>${st.tq ? '<button type="button" class="btn btn-sm" data-act="clr">清除</button>' : ''}</form>
          ${UI.table([
            { title: 'ticket_id', render: (t) => `<code>${t.id}</code>${t.gameId ? `<br><small class="muted">${t.gameId}</small>` : ''}` }, { title: '用户', render: (t) => UI.user(t.uid, { size: 22 }) },
            { title: '场次 · 底注', render: (t) => `${esc(Store.stakeName(t.stake))} · ${UI.n(t.bet)}` }, { title: '状态', render: (t) => UI.tag(TS[t.status][0], TS[t.status][1]) + (t.review === 'pending' ? ' ' + UI.tag('待复核', 'red') : '') },
            { title: '托管', align: 'r', render: (t) => UI.n(t.escrow) }, { title: '最后变化', render: (t) => `${UI.time(t.updatedAt)}<br><small class="muted">${UI.ago(t.updatedAt)}</small>` },
            { title: '', align: 'r', render: (t) => `<button class="btn btn-sm" data-act="tk" data-id="${t.id}">详情</button>` },
          ], rows)}</div></div>`;
    },
    submit(f) { st.tq = f.q.value.trim(); App.refresh(); },
    act: {
      clr: () => { st.tq = ''; App.go('tickets'); },
      tk: (b) => {
        const t = Store.s.tickets.find((x) => x.id === b.dataset.id);
        const live = t.escrow > 0;
        const c = UI.drawer({
          title: `匹配单 ${t.id}`, sub: UI.tag(TS[t.status][0], TS[t.status][1]),
          body: `${UI.kv([['用户', UI.user(t.uid)], ['场次', Store.stakeName(t.stake)], ['底注', UI.n(t.bet)], ['托管中', UI.n(t.escrow)], ['game_id', t.gameId || '—']], { cols: 2 })}
            <h4 class="sec">状态变化</h4><div class="tl">${t.timeline.map((x) => `<div class="tl-it"><b>${TS[x.s][0]}</b><small>${UI.datetime(x.at)}</small><p>${esc(x.note)}</p></div>`).join('')}</div>
            ${live ? UI.notice('还在托管中。卡住时可以手动作废，托管原路退还（匹配 6.3 的人工兜底）。', 'info') : ''}${t.review === 'pending' ? UI.notice('托管超过 2 小时没变化，系统已自动作废并退还底注。请确认用户确实收到了退还。', 'warn') : ''}`,
          foot: `<button class="btn" data-close>关闭</button>${live && Store.can('order.handle') ? '<button class="btn btn-danger" data-act="void">作废并退还</button>' : ''}${t.review === 'pending' && Store.can('order.handle') ? '<button class="btn btn-primary" data-act="rev">已复核</button>' : ''}`,
          act: {
            void: async () => { const n = await UI.confirm({ title: '作废这张匹配单？', html: `<p>托管中的 ${UI.n(t.escrow)} 金币原路退还给用户（明细“对局异常 · 退还底注”）。</p><textarea class="inp" rows="2" id="cf-note" placeholder="原因"></textarea>`, collect: (x) => x.$('#cf-note').value.trim() || '后台手动作废', ok: '作废', danger: true }); if (n) { Store.voidTicket(t.id, n); c.close(); App.refresh(); UI.toast('已作废并退还'); } },
            rev: () => { Store.reviewTicket(t.id, '已核对账本，退还到账'); c.close(); App.refresh(); UI.toast('已复核'); },
          },
        });
      },
    },
  });

  /* ================= 对账告警 ================= */
  App.page('recon', {
    render(el) {
      const hourly = Store.s.recon.filter((r) => !r.kind).sort((a, b) => b.at - a.at);
      const stale = Store.s.recon.filter((r) => r.kind === 'stale');
      const day = Date.now() - 864e5;
      const by = {};
      Store.s.ledger.filter((e) => e.at > day).forEach((e) => { by[e.type] = (by[e.type] || 0) + e.amount; });
      const sys = (by.pot_bonus || 0);
      el.innerHTML = `<div class="page-hd"><div><h1>对账告警</h1><p>每小时检查：托管账户余额应该等于所有匹配中、准备确认中、对局中的底注之和，对不上就告警，人工处理（匹配 6.3）。</p></div></div>
        <div class="grid g-2-1"><div>${UI.card('每小时对账', UI.table([
          { title: '时间', render: (r) => UI.datetime(r.at) }, { title: '托管账户余额', align: 'r', render: (r) => UI.n(r.escrow) }, { title: '进行中的底注之和', align: 'r', render: (r) => UI.n(r.active) },
          { title: '差额', align: 'r', render: (r) => (r.diff ? `<b class="down">${UI.n(r.diff)}</b>` : '0') },
          { title: '结果', render: (r) => (r.status === 'ok' ? UI.tag('对上了', 'green') : r.handled ? UI.tag('已处理', 'gray', { title: r.handled.note }) : UI.tag('告警', 'red')) },
          { title: '', align: 'r', render: (r) => (r.status === 'alert' && !r.handled && Store.can('order.handle') ? `<button class="btn btn-sm" data-act="handle" data-id="${r.id}">处理</button>` : '') },
        ], hourly.slice(0, 12), { cls: 'tbl-mini' }))}</div>
        <div>${UI.card('托管超过 2 小时没变化', UI.table([{ title: '匹配单', render: (r) => `<a href="#/tickets/${r.ticket}"><code>${r.ticket}</code></a>` }, { title: '时间', render: (r) => UI.time(r.at) }, { title: '', render: (r) => (r.handled ? UI.tag('已复核', 'gray') : UI.tag('系统已作废 · 待复核', 'orange')) }], stale, { cls: 'tbl-mini' }))}
          ${UI.card('最近 24 小时金币按类型', UI.table([{ title: '类型', render: ([k]) => `${esc(D.LEDGER[k].name)} <code class="sm">${k}</code>` }, { title: '合计', align: 'r', render: ([, v]) => UI.signed(v) }], Object.entries(by).sort((a, b) => b[1] - a[1]), { cls: 'tbl-mini' }) + `<p class="muted sm mt">系统账户净流出：奖池翻倍补发 ${UI.n(sys)}；机器人局的系统输赢（ai_stake / ai_pot）在系统账户里，不进用户账本。</p>`)}</div></div>`;
    },
    act: { handle: async (b) => { const n = await UI.confirm({ title: '处理对账告警', html: '<textarea class="inp" rows="3" id="cf-note" placeholder="查到的原因和处理，例如：结算重试时托管多记了一笔，已人工冲正"></textarea>', collect: (c) => c.$('#cf-note').value.trim() || '已处理', ok: '标记已处理' }); if (n) { Store.handleRecon(b.dataset.id, n); App.refresh(); UI.toast('已处理'); } } },
  });
})();
