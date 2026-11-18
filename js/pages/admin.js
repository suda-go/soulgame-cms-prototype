/**
 * 后台基础：审批中心 #/approvals/:id、配置发布记录 #/releases、操作日志 #/audit、账号与角色 #/admins
 * 以及数值总览 #/economy（P1，按配置自动算，审批页也用它）
 */
(() => {
  'use strict';
  const esc = UI.esc;
  const st = { at: 'mine', au: '', am: '' };
  const TYPE = { config: '配置发布', coins: '金币调整', item: '发放装扮', ban: '封号', redeliver: '补单' };
  const AS = { pending: ['审批中', 'orange'], approved: ['已通过', 'green'], rejected: ['已驳回', 'red'], withdrawn: ['已撤回', 'gray'] };
  const steps = (a) => a.steps.map((s) => `<span class="step ${s.done ? (s.done.ok ? 'is-ok' : 'is-no') : a.status === 'pending' && Store.curStep(a) === s ? 'is-cur' : ''}">${esc(D.APPROVERS[s.who].label)}${s.done ? ` · ${esc(D.ROLES[s.done.by].person)}` : ''}</span>`).join('<i>→</i>');

  /* ================= 审批中心 ================= */
  App.page('approvals', {
    render(el, arg) {
      const all = Store.s.approvals.slice().sort((a, b) => b.at - a.at);
      const mine = Store.myApprovals();
      const sent = all.filter((a) => a.by === Store.role());
      const rows = st.at === 'mine' ? mine : st.at === 'sent' ? sent : all;
      el.innerHTML = `<div class="page-hd"><div><h1>审批中心</h1><p>动到金币的配置、金币调整、发装扮、永久封号、客服发起的封号和补单都在这里审。自己提交的不能自己审。</p></div>
        <div class="page-hd-r"><small>你现在是 ${esc(Store.me().person)}（${esc(Store.me().name)}）</small></div></div>
        <div class="card"><div class="card-bd"><div class="toolbar">${UI.tabs([['mine', '待我审批', mine.length], ['sent', '我提交的', sent.length], ['all', '全部', all.length]], st.at, 'at')}</div>
        ${UI.table([
          { title: '单号', render: (a) => `<code>${a.id}</code>` }, { title: '类型', render: (a) => UI.tag(TYPE[a.type], 'blue') }, { title: '内容', render: (a) => `<b>${esc(a.title)}</b><br><small class="muted">${esc(a.note)}</small>` },
          { title: '提交', render: (a) => `${esc(Store.who(a.by))}<br><small class="muted">${UI.ago(a.at)}</small>` }, { title: '审批流程', render: (a) => `<span class="steps">${steps(a)}</span>` },
          { title: '状态', render: (a) => UI.tag(AS[a.status][0], AS[a.status][1]) }, { title: '', align: 'r', render: (a) => `<button class="btn btn-sm ${Store.canApprove(a) ? 'btn-primary' : ''}" data-act="open" data-id="${a.id}">${Store.canApprove(a) ? '审批' : '查看'}</button>` },
        ], rows, { empty: st.at === 'mine' ? '没有等你审批的。右上角切到“产品”“管理员”“财务”“审核”看看' : '没有' })}</div></div>`;
      if (arg && arg !== 'approvals') setTimeout(() => open(arg), 0);
    },
    act: { at: (b) => { st.at = b.dataset.v; App.refresh(); }, open: (b) => open(b.dataset.id) },
  });

  function detail(a) {
    const p = a.payload;
    if (a.type === 'config') {
      const def = Schemas.def(a.ns);
      const base = Store.versions(a.ns)[(p.base || 1) - 1];
      const stale = a.status === 'pending' && p.base && p.base !== Store.pubVersion(a.ns);
      const data = p.data || (Store.versions(a.ns).find((v) => v.approval === a.id) || {}).data;
      if (!data) return UI.notice(`已发布为 v${p.version}，到 <a href="#/cfg/${a.ns}">配置页</a> 的版本记录看差异`, 'info');
      const rows = Schemas.diff(a.ns, base.data, data);
      const effects = def.effects ? def.effects(data, base.data) : [];
      return `${UI.kv([['配置', `<a href="#/cfg/${a.ns}">${esc(def.title)}</a>`], ['基于', `线上 v${p.base}`]], { cols: 2 })}
        ${stale ? UI.notice(`提交后线上已经更新到 v${Store.pubVersion(a.ns)}，通过后会覆盖那次发布的修改，建议驳回让提交人重新提交。`, 'danger') : ''}
        <h4 class="sec">改了什么（${rows.length} 处）</h4>${UI.diff(rows, { a: `v${p.base}`, b: '提交的' })}
        ${effects.length ? `<h4 class="sec">发布后的影响</h4>${UI.notice(`<ul class="plain">${effects.map((x) => `<li>${x}</li>`).join('')}</ul>`, 'warn')}` : ''}
        ${def.econ ? `<h4 class="sec">每天能拿的免费金币</h4>${Cfg.econTable(Store.econ({ [a.ns]: base.data }), Store.econ({ [a.ns]: data }))}` : ''}`;
    }
    if (a.type === 'coins') {
      const u = Store.user(p.uid);
      return UI.kv([['用户', UI.user(p.uid)], ['调整', UI.signed(p.amount)], ['原因', esc(p.reason)], ['现在的金币', UI.n(u.coins)], ['调整后', UI.n(Math.max(0, u.coins + p.amount))], ['通知用户', p.notify && p.amount > 0 ? '发系统消息' : '不发']], { cols: 3 })
        + (u.coins + p.amount < 0 ? UI.notice('余额不够扣，通过后按“扣到 0”处理（规则待定）', 'warn') : '') + `<p class="muted sm">用户明细里显示“系统调整”，账本类型 admin_adjust，关联单号就是审批单号，重复执行不会多发。</p>`;
    }
    if (a.type === 'item') return UI.kv([['用户', UI.user(p.uid)], ['装扮', `${UI.itemPreview(Store.item(p.item), 40)} ${esc(Store.itemName(p.item))}`]], { cols: 2 });
    if (a.type === 'ban') return UI.kv([['用户', UI.user(p.uid)], ['时长', D.BAN_DURATIONS.find((d) => d.id === p.duration).name], ['原因', esc(p.reason)], ['说明', esc(p.note || '—')], ['关联举报', esc((p.reports || []).join('、') || '—')]], { cols: 2 });
    if (a.type === 'redeliver') { const o = Store.s.orders.find((x) => x.id === p.orderId); return UI.kv([['订单', `<a href="#/orders/${o.id}"><code>${o.id}</code></a>`], ['用户', UI.user(o.uid)], ['金额', UI.usd(o.usd)], ['应到账', UI.n(o.coins)], ['状态', UserParts.orderStatus(o)]], { cols: 2 }); }
    return '';
  }
  function open(id) {
    const a = Store.approval(id);
    if (!a) return;
    const can = Store.canApprove(a);
    const why = a.status !== 'pending' ? '' : a.by === Store.role() ? '这是你提交的，不能自己审。' : !can ? `这一步要 ${D.APPROVERS[Store.curStep(a).who].label}审批（演示里是“${D.APPROVERS[Store.curStep(a).who].roles.map((r) => D.ROLES[r].name).join('、')}”角色），右上角切换后再来。` : '';
    const c = UI.drawer({
      title: `${TYPE[a.type]} · ${esc(a.id)}`, sub: `${UI.tag(AS[a.status][0], AS[a.status][1])} ${esc(Store.who(a.by))} ${UI.datetime(a.at)} 提交`, width: '760px',
      body: `<h3 class="ap-title">${esc(a.title)}</h3><p class="ap-note">“${esc(a.note)}”</p><div class="steps mb">${steps(a)}</div>${a.steps.filter((s) => s.done && s.done.reason).map((s) => UI.notice(`${esc(D.ROLES[s.done.by].person)}：${esc(s.done.reason)}`, s.done.ok ? 'ok' : 'danger')).join('')}
        ${detail(a)}${why ? UI.notice(why, 'info', { cls: 'mt' }) : ''}
        ${can ? '<h4 class="sec">审批意见</h4><textarea class="inp" rows="2" id="ap-reason" placeholder="通过可以不写；驳回要写原因"></textarea>' : ''}`,
      foot: can ? '<button class="btn" data-close>关闭</button><button class="btn btn-danger" data-act="no">驳回</button><button class="btn btn-primary" data-act="ok">通过</button>' : `<button class="btn" data-close>关闭</button>${a.status === 'pending' && a.by === Store.role() ? '<button class="btn" data-act="wd">撤回</button>' : ''}`,
      act: {
        ok: () => { const last = a.steps.filter((s) => !s.done).length === 1; Store.approve(a.id, true, c.$('#ap-reason').value.trim()); c.close(); App.refresh(); UI.toast(last ? '已通过，已执行' : '已通过，等下一级审批'); },
        no: () => { const r = c.$('#ap-reason').value.trim(); if (!r) { UI.toast('驳回要写原因', 'warn'); c.$('#ap-reason').focus(); return; } Store.approve(a.id, false, r); c.close(); App.refresh(); UI.toast('已驳回'); },
        wd: () => { Store.withdraw(a.id); c.close(); App.refresh(); UI.toast('已撤回'); },
      },
    });
  }

  /* ================= 配置发布记录 ================= */
  App.page('releases', {
    render(el) {
      const rows = [];
      Object.keys(Store.s.cfg).forEach((ns) => Store.versions(ns).forEach((v) => rows.push({ ns, ...v })));
      rows.sort((a, b) => b.at - a.at);
      const drafts = Object.keys(Store.s.cfg).filter((ns) => Store.draft(ns));
      const pend = Object.keys(Store.s.cfg).filter((ns) => Store.pending(ns));
      el.innerHTML = `<div class="page-hd"><div><h1>配置发布记录</h1><p>所有配置的每一次发布。点进配置页的“版本记录”可以看差异和回滚。</p></div></div>
        <div class="stats">${UI.stat('配置', Object.keys(Store.s.cfg).length + ' 类')}${UI.stat('有草稿', drafts.length, { sub: drafts.map((n) => Schemas.def(n).title).join('、') || '—' })}${UI.stat('待审批', pend.length, { sub: pend.map((n) => Schemas.def(n).title).join('、') || '—', tone: pend.length ? 'warn' : '' })}</div>
        ${UI.card('', UI.table([
          { title: '时间', render: (r) => UI.datetime(r.at) }, { title: '配置', render: (r) => `<a href="#/cfg/${r.ns}">${esc(Schemas.def(r.ns).title)}</a> <code class="sm">${r.ns}</code>` },
          { title: '版本', render: (r) => `v${r.v}${r.v === Store.pubVersion(r.ns) ? ' ' + UI.tag('线上', 'green') : ''}` }, { title: '说明', render: (r) => esc(r.note) },
          { title: '发布人', render: (r) => esc(Store.who(r.by)) }, { title: '审批', render: (r) => (r.approval ? `<a href="#/approvals/${r.approval}"><code>${r.approval}</code></a>` : '<span class="muted">不需要</span>') },
        ], rows))}`;
    },
  });

  /* ================= 操作日志 ================= */
  App.page('audit', {
    render(el) {
      const mods = [...new Set(Store.s.audit.map((a) => a.mod))];
      const rows = Store.s.audit.filter((a) => (!st.au || a.who === st.au) && (!st.am || a.mod === st.am));
      el.innerHTML = `<div class="page-hd"><div><h1>操作日志</h1><p>后台的每一次写操作和敏感查看：谁、什么时候、从哪个 IP、改了什么、原因、审批单。不能删改。</p></div></div>
        <div class="card"><div class="card-bd"><div class="toolbar"><select class="inp" data-au>${UI.opts([['', '全部操作人'], ...Object.entries(D.ROLES).map(([k, r]) => [k, `${r.person}（${r.name}）`]), ['system', '系统']], st.au)}</select>
          <select class="inp" data-am>${UI.opts([['', '全部模块'], ...mods], st.am)}</select><span class="grow"></span><span class="muted sm">${rows.length} 条</span></div>
          ${UserParts.audit(rows.slice(0, 200))}</div></div>`;
    },
    input(t) { if (t.matches('[data-au]')) st.au = t.value; else if (t.matches('[data-am]')) st.am = t.value; else return; App.refresh(); },
  });

  /* ================= 账号与角色 ================= */
  App.page('admins', {
    render(el) {
      const perms = Object.keys(D.PERM_NAMES);
      el.innerHTML = `<div class="page-hd"><div><h1>账号与角色</h1><p>正式后台接公司统一登录（例如飞书）并开二次验证，只能在内网或 VPN 打开（规划 4.11）。原型里用右上角的“演示角色”切换身份。</p></div></div>
        ${UI.card('后台账号（演示）', UI.table([
          { title: '账号', render: ([k, r]) => `${UI.av('', 26, { name: r.person })} <b>${esc(r.person)}</b>` }, { title: '角色', render: ([, r]) => UI.tag(r.name, 'blue') }, { title: '说明', render: ([, r]) => esc(r.note || '') },
          { title: '', align: 'r', render: ([k]) => (k === Store.role() ? UI.tag('当前', 'green') : `<button class="btn btn-sm" data-act="as" data-r="${k}">切换成 TA</button>`) },
        ], Object.entries(D.ROLES)))}
        ${UI.card('权限表', `<div class="tbl-wrap"><table class="tbl perm"><thead><tr><th>权限</th>${Object.values(D.ROLES).map((r) => `<th>${esc(r.name)}</th>`).join('')}</tr></thead><tbody>${perms.map((p) => `<tr><td>${esc(D.PERM_NAMES[p])}</td>${Object.keys(D.ROLES).map((k) => `<td class="a-c">${D.PERMS[k].includes(p) ? '<b class="up">✓</b>' : '<span class="muted">—</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`)}
        ${UI.card('审批', UI.table([{ title: '操作', render: (r) => r[0] }, { title: '审批人', render: (r) => r[1] }], [
          [`金币调整，单次不超过 ${UI.n(D.COIN_APPROVAL_N)}（一局大师场的底注）`, '组长（演示：管理员）'], [`金币调整超过 ${UI.n(D.COIN_APPROVAL_N)}`, '组长 → 财务'], ['发放装扮', '组长'],
          ['动到金币产出和消耗的配置：场次、福利和任务奖励、宝箱、装扮价格、充值档位、会员权益、通话价格', '产品（数值负责人）'], ['机器人参数', '产品 → 研发负责人（演示：管理员）'],
          ['永久封号', '审核组长（演示：管理员）'], ['客服发起的封号', '审核'], ['客服发起的补单', '财务'],
        ], { cls: 'tbl-mini' }))}`;
    },
    act: { as: (b) => { Store.setRole(b.dataset.r); App.refresh(); UI.toast(`已切换为 ${Store.me().person}（${Store.me().name}）`); } },
  });

  /* ================= 数值总览（P1） ================= */
  App.page('economy', {
    render(el) {
      const e = Store.econ();
      const stakes = Store.pub('stakes').rows.filter((x) => x.enabled);
      const row = (label, fn, o = {}) => `<tr class="${o.cls || ''}"><td>${label}</td>${e.map((x) => `<td class="a-r">${fn(x)}</td>`).join('')}</tr>`;
      const r0 = (v) => UI.n(Math.round(v));
      el.innerHTML = `<div class="page-hd"><div><h1>数值总览 ${UI.p1()}</h1><p>按当前线上配置自动算满勤用户每天能拿多少免费金币（签到与任务 6.8 的算法），和场次底注放在一起看。改签到、任务、宝箱、会员时，审批页也显示改前改后。</p></div></div>
        ${UI.notice('金币数值还没重新平衡（精简清单第八节、签到与任务 Q11）：钻石按 1:10 直接折成了金币，例如签到第 7 天 1,000 金币比新手场底注 100 大很多。', 'warn')}
        <div class="grid g-2-1"><div>${UI.card('满勤每天能拿的免费金币', `<div class="tbl-wrap"><table class="tbl econ"><thead><tr><th>来源</th>${e.map((x) => `<th class="a-r">${esc(x.name)}</th>`).join('')}</tr></thead><tbody>
          ${row('签到（一轮 7 天平均）', (x) => r0(x.signAvg))}${row('每日任务', (x) => r0(x.daily))}${row('神秘宝箱（平均 / 最多）', (x) => `${r0(x.mysteryAvg)} / ${r0(x.mysteryMax)}`)}
          ${row('连续 7 天大宝箱（平均）', (x) => r0(x.streakAvg))}${row('每周任务（平均）', (x) => r0(x.weeklyAvg))}${row('<b>合计（每天平均）</b>', (x) => `<b>${r0(x.avg)}</b>`, { cls: 'sum' })}
          ${row('会员每日福利', (x) => r0(x.vipDaily))}${row('破产补助（每天最多）', (x) => r0(x.aid))}
          ${row('<b>签到和任务单日理论上限</b><br><small class="muted">风控告警线（签到与任务 6.7）</small>', (x) => `<b>${r0(x.cap)}</b>`, { cls: 'sum' })}
          ${row(`每天平均（含会员福利）够打几局${esc(stakes[0] ? stakes[0].name.zh : '')}`, (x) => `${x.games} 局`)}
        </tbody></table></div><p class="muted sm">一次性：新手礼包 ${UI.n(e[0].newbieGift)}、新手任务 ${UI.n(e[0].newbieTasks)}；今天进行中的限时任务 ${e[0].limited.length} 个，共 ${UI.n(e[0].limitedSum)}（算进理论上限）。</p>`)}</div>
        <div>${UI.card('场次', UI.table([{ title: '场次', render: (s) => esc(s.name.zh) }, { title: '底注', align: 'r', render: (s) => UI.n(s.bet) }, { title: '非会员每天平均能打', align: 'r', render: (s) => `${Math.floor(e[0].avg / s.bet)} 局` }], stakes, { cls: 'tbl-mini' }))}
          ${UI.card('来源', '<ul class="plain sm"><li>签到：<a href="#/cfg/signin">7日签到</a>，会员倍数在 <a href="#/cfg/vip">会员档位</a></li><li>任务：<a href="#/cfg/tasks">任务</a></li><li>宝箱：<a href="#/cfg/chests">宝箱奖池</a></li><li>告警线用在 <a href="#/cfg/anticheat">防刷参数</a></li></ul>')}</div></div>`;
    },
  });
})();
