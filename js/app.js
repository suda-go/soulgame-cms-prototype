/**
 * 后台运行时：hash 路由、左侧菜单、顶栏（全局搜用户、切换演示角色、重置数据）、点击和输入分发
 *
 * 注册页面  App.page(id, { title, render(el, arg), act: { 名称(el, e) }, input(el, e) })
 *           地址 #/id/arg，例如 #/user/u100801、#/cfg/stakes
 * 声明式    data-go="users"（跳转）  data-act="名称"（当前浮层或页面的 act）  data-close（关浮层）
 */
(() => {
  'use strict';
  const App = (window.App = {});
  const pages = {};
  let cur = { id: 'home', arg: '' };

  const MENU = [
    { id: 'home', title: '工作台', icon: 'home' },
    { group: '用户管理', icon: 'users', items: [['users', '用户查询'], ['deletions', '注销记录', 'deletions']] },
    { group: '内容安全与风控', icon: 'shield', items: [['reports', '举报处理', 'reports'], ['bio', '签名复审', 'bio'], ['words', '敏感词库'], ['penalties', '处罚记录'], ['nick-review', '昵称头像巡查', '', 'P1'], ['chat-review', '聊天巡查', '', 'P1'], ['risk', '风控告警', '', 'P1']] },
    { group: '玩法配置', icon: 'game', items: [['cfg/game', '游戏'], ['cfg/stakes', '场次'], ['cfg/match', '匹配参数'], ['cfg/bot', '机器人'], ['cfg/gameplay', '对局参数'], ['cfg/emotes', '表情和快捷语'], ['cfg/room', '好友房']] },
    { group: '福利与任务', icon: 'gift', items: [['cfg/newbie', '新手礼包'], ['cfg/offline', '离线收益'], ['cfg/double_pot', '奖池翻倍'], ['cfg/signin', '7日签到'], ['cfg/tasks', '任务'], ['cfg/mystery', '神秘任务'], ['cfg/chests', '宝箱奖池'], ['cfg/anticheat', '防刷参数'], ['economy', '数值总览', '', 'P1'], ['task-calendar', '限时任务日历', '', 'P1']] },
    { group: '商城与会员', icon: 'bag', items: [['cfg/items', '装扮'], ['cfg/packs', '充值档位'], ['cfg/vip', '会员档位与权益'], ['cfg/call', '通话计费']] },
    { group: '订单与资金', icon: 'wallet', items: [['orders', '订单和订阅'], ['refunds', '补单和退款', 'refunds'], ['ledger', '金币账本'], ['tickets', '匹配单与托管'], ['recon', '对账告警', 'recon']] },
    { group: '消息与触达', icon: 'bell', items: [['cfg/sysmsg', '系统消息模板'], ['cfg/push', '推送模板'], ['cfg/share', '分享'], ['broadcast', '系统消息群发', '', 'P1'], ['ops-push', '运营推送', '', 'P1'], ['mail', '邮件模板', '', 'P1']] },
    { group: '运营位', icon: 'layout', items: [['slots', '运营位', '', 'P1']] },
    { group: '系统配置', icon: 'settings', items: [['cfg/legal', '协议与客服'], ['cfg/defaults', '默认资料'], ['cfg/display', '展示数字'], ['cfg/limits', '资料与社交限制'], ['cfg/i18n', '多语言文案'], ['cfg/jumps', '跳转目标']] },
    { group: '数据看板', icon: 'chart', items: [['dashboard', '数据看板', '', 'P1']] },
    { group: '后台基础', icon: 'lock', items: [['approvals', '审批中心', 'approvals'], ['releases', '配置发布记录'], ['audit', '操作日志'], ['admins', '账号与角色']] },
  ];
  App.MENU = MENU;
  App.page = (id, def) => { pages[id] = def; };
  App.go = (path) => { location.hash = '#/' + path; };
  App.cur = () => cur;
  App.title = (path) => {
    for (const m of MENU) {
      if (m.id === path) return [m.title];
      const hit = (m.items || []).find(([p]) => p === path);
      if (hit) return [m.group, hit[1]];
    }
    return [];
  };

  function parse() {
    const h = location.hash.replace(/^#\/?/, '');
    const [id, ...rest] = h.split('/');
    return { id: id || 'home', arg: decodeURIComponent(rest.join('/')) };
  }
  function active(path) {
    return path === (cur.arg && cur.id === 'cfg' ? 'cfg/' + cur.arg : cur.id) || (cur.id === 'user' && path === 'users');
  }
  function renderSide() {
    const el = document.getElementById('side');
    const prev = el.querySelector('.side-nav');
    const y = prev ? prev.scrollTop : 0;
    const b = (k) => (k && Store.badge[k] ? Store.badge[k]() : 0);
    el.innerHTML = `<a class="side-logo" href="#/home"><img src="${D.IMG}brand/app-icon.png" alt=""><span><b>Soulgame CMS</b><small>运营后台 · 原型</small></span></a>
      <nav class="side-nav">${MENU.map((m) => {
        if (!m.group) return `<a class="side-it is-top ${active(m.id) ? 'is-on' : ''}" href="#/${m.id}">${UI.ic(m.icon)}<span>${m.title}</span></a>`;
        const open = m.items.some(([p]) => active(p));
        return `<div class="side-grp ${open ? 'is-open' : ''}"><div class="side-grp-hd">${UI.ic(m.icon)}<span>${m.group}</span></div>
          ${m.items.map(([p, label, badge, ph]) => { const n = b(badge); return `<a class="side-it ${active(p) ? 'is-on' : ''}" href="#/${p}"><span>${label}</span>${ph ? '<i class="side-p1">P1</i>' : ''}${n ? `<em class="side-badge">${n}</em>` : ''}</a>`; }).join('')}</div>`;
      }).join('')}</nav>
      <div class="side-ft"><a href="${D.PLAN_URL}" target="_blank" rel="noopener">${UI.ic('doc', 14)} 规划文档</a><a href="${D.APP_URL}" target="_blank" rel="noopener">${UI.ic('link', 14)} app 原型</a></div>`;
    const nav = el.querySelector('.side-nav');
    nav.scrollTop = y;
    const on = nav.querySelector('.side-it.is-on');
    if (on) { const a = on.getBoundingClientRect(); const b = nav.getBoundingClientRect(); if (a.top < b.top || a.bottom > b.bottom) on.scrollIntoView({ block: 'center' }); }
  }
  function renderTop() {
    const el = document.getElementById('top');
    const me = Store.me();
    const crumbs = cur.id === 'user' ? ['用户管理', '用户详情'] : cur.id === 'cfg' ? App.title('cfg/' + cur.arg) : App.title(cur.id);
    el.innerHTML = `<div class="crumbs">${crumbs.map((c, i) => `<span class="${i === crumbs.length - 1 ? 'is-cur' : ''}">${UI.esc(c)}</span>`).join('<i>/</i>')}</div>
      <form class="top-search" data-form="search">${UI.ic('search', 15)}<input name="q" placeholder="搜用户：展示 ID / user_id / 邮箱 / 三方 ID / 设备 ID / 昵称" autocomplete="off"></form>
      <span class="env">演示环境 · 数据只存在这台电脑的浏览器里</span>
      <label class="role">${UI.av('', 26, { name: me.person })}<span><b>${me.person}</b><small>演示角色</small></span>
        <select data-role>${Object.entries(D.ROLES).map(([k, r]) => `<option value="${k}" ${k === me.role ? 'selected' : ''}>${r.name}</option>`).join('')}</select></label>
      <button class="btn btn-sm btn-ghost" data-act="__reset" title="恢复成第一次打开时的数据">${UI.ic('refresh', 14)} 重置演示数据</button>`;
  }
  function render(keepScroll) {
    cur = parse();
    const def = pages[cur.id] || pages.placeholder;
    const content = document.getElementById('content');
    const y = keepScroll ? content.scrollTop : 0;
    renderSide();
    renderTop();
    try {
      def.render(content, cur.arg || cur.id);
    } catch (e) {
      content.innerHTML = UI.notice(`页面出错：${UI.esc(e.message)}`, 'danger');
      console.error(e);
    }
    content.scrollTop = y;
    document.title = `${(App.title(cur.id === 'cfg' ? 'cfg/' + cur.arg : cur.id).slice(-1)[0]) || '用户详情'} · Soulgame CMS`;
  }
  App.refresh = () => render(true);
  App.rerenderChrome = () => { renderSide(); renderTop(); };
  App.def = () => pages[cur.id] || pages.placeholder;

  const globalActs = {
    __reset: async () => {
      if (await UI.confirm({ title: '重置演示数据？', text: '会清掉你在这台电脑上做过的所有修改，恢复成第一次打开时的样子。', ok: '重置', danger: true })) {
        UI.closeAll(); Store.reset(); App.refresh(); UI.toast('已重置');
      }
    },
  };
  function onClick(e) {
    const close = e.target.closest('[data-close]');
    if (close) { const ov = close.closest('.ov'); const c = UI.stack.find((x) => x.el === ov); if (c) c.close(); return; }
    const a = e.target.closest('[data-act]');
    if (!a) return;
    const name = a.dataset.act;
    const ov = a.closest('.ov');
    const scope = ov ? UI.stack.find((x) => x.el === ov) : null;
    const fn = (scope && scope.act[name]) || (!ov && App.def().act && App.def().act[name]) || globalActs[name];
    if (fn) { e.preventDefault(); fn(a, e); }
  }
  function onInput(e) {
    const t = e.target;
    const toggle = t.tagName === 'SELECT' || ['checkbox', 'radio', 'file', 'date', 'color'].includes(t.type);
    if ((e.type === 'input' && toggle) || (e.type === 'change' && !toggle)) return;
    if (e.target.matches('[data-role]')) {
      Store.setRole(e.target.value);
      UI.closeAll();
      App.refresh();
      UI.toast(`已切换为 ${Store.me().person}（${Store.me().name}）`);
      return;
    }
    const ov = e.target.closest('.ov');
    if (ov) { const c = UI.stack.find((x) => x.el === ov); if (c && c.onInput) c.onInput(e.target, e); return; }
    const def = App.def();
    if (def.input && e.target.closest('#content')) def.input(e.target, e);
  }
  function onSubmit(e) {
    const f = e.target;
    if (f.dataset.form === 'search') {
      e.preventDefault();
      const q = f.q.value.trim();
      const hits = Store.findUsers(q);
      if (q && hits.length === 1) App.go('user/' + hits[0].uid);
      else App.go('users' + (q ? '/' + encodeURIComponent(q) : ''));
      return;
    }
    const def = App.def();
    if (def.submit) { e.preventDefault(); def.submit(f, e); }
  }

  App.start = () => {
    window.addEventListener('error', (e) => {
      const box = document.getElementById('err') || Object.assign(document.body.appendChild(document.createElement('div')), { id: 'err' });
      box.textContent = '脚本错误：' + (e.message || e.error);
    });
    Store.init();
    document.addEventListener('click', onClick);
    document.addEventListener('input', onInput);
    document.addEventListener('change', onInput);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && UI.stack.length) UI.stack[UI.stack.length - 1].close(); });
    window.addEventListener('hashchange', () => { UI.closeAll(); render(false); });
    render(false);
  };
})();
