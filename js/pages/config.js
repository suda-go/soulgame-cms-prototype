/**
 * 配置页 #/cfg/:ns：表单（或专用编辑器）+ 底部发布栏
 * 改动自动存成草稿 → 提交发布（校验、差异、影响、每天理论上限）→ 普通配置直接生效，动到金币的进审批 → 版本记录里可以回滚
 */
(() => {
  'use strict';
  const { get } = Schemas;
  const esc = UI.esc;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  let ns = '';
  const RISK = {
    normal: ['发布后直接生效（约 1 分钟内）', 'green'],
    economy: ['动到金币 · 发布要产品（数值负责人）审批', 'orange'],
    bot: ['机器人参数 · 产品 + 研发负责人两级审批', 'red'],
  };
  const canEdit = (def) => Store.can(def.perm);
  const setPath = (o, path, v) => { const ks = path.split('.'); let x = o; ks.slice(0, -1).forEach((k) => { if (x[k] == null) x[k] = {}; x = x[k]; }); x[ks[ks.length - 1]] = v; };
  const Cfg = (window.Cfg = {});

  /** 写回草稿。full：整页重画（下拉、开关、增删行）；否则只更新高亮、计算项和发布栏，输入框不丢焦点 */
  Cfg.commit = (path, val, full) => {
    const data = clone(Store.view(ns));
    setPath(data, path, val);
    Store.saveDraft(ns, data);
    if (full) { App.refresh(); return; }
    soft(path);
  };
  Cfg.update = (fn) => { const data = clone(Store.view(ns)); fn(data); Store.saveDraft(ns, data); App.refresh(); };
  Cfg.ns = () => ns;
  function soft(path) {
    const data = Store.view(ns);
    const el = document.querySelector(`[data-path="${CSS.escape(path)}"]`);
    if (el && el.closest('.i18n-r')) el.closest('.i18n-r').classList.toggle('is-miss', !el.value.trim());
    const w = el && el.closest('[data-f]');
    if (w && w.hasAttribute('data-pub')) {
      const now = JSON.stringify(get(data, w.dataset.f) ?? null);
      w.classList.toggle('is-changed', now !== w.dataset.pub);
    }
    document.querySelectorAll('[data-calc]').forEach((c) => {
      const f = Form.calc.get(c.dataset.calc);
      if (!f) return;
      const rowPath = c.dataset.calc.split('.').slice(0, -1).join('.');
      try { c.innerHTML = f.render(data, rowPath ? get(data, rowPath) : null); } catch (_) { /* 输入到一半时可能算不出来 */ }
    });
    const bar = document.getElementById('cfg-bar');
    if (bar) bar.innerHTML = barHtml(Schemas.def(ns));
  }

  function barHtml(def) {
    const p = Store.pending(ns);
    const d = Store.draft(ns);
    const v = Store.versions(ns);
    const last = v[v.length - 1];
    const online = `<span class="bar-ver">线上 v${last.v} · ${UI.time(last.at)} ${esc(Store.who(last.by))}</span>`;
    if (p) {
      const st = Store.curStep(p);
      return `${online}<span class="bar-st">${UI.tag('待审批', 'orange')} ${esc(p.id)} · ${esc(Store.who(p.by))}提交 · 等 ${esc(D.APPROVERS[st.who].label)}</span><span class="grow"></span>
        <button class="btn btn-sm" data-act="history">${UI.ic('history', 14)} 版本记录</button>${p.by === Store.role() ? '<button class="btn btn-sm" data-act="withdraw">撤回</button>' : ''}<a class="btn btn-sm btn-primary" href="#/approvals/${p.id}">查看审批</a>`;
    }
    if (d) {
      const n = Schemas.diff(ns, Store.pub(ns), d.data).length;
      return `${online}<span class="bar-st">${UI.tag('草稿', 'blue')} ${n} 处修改 · ${esc(Store.who(d.by))} ${UI.time(d.at)} 自动保存</span><span class="grow"></span>
        <button class="btn btn-sm" data-act="history">${UI.ic('history', 14)} 版本记录</button>${canEdit(def) ? '<button class="btn btn-sm" data-act="discard">放弃草稿</button><button class="btn btn-sm btn-primary" data-act="submit">提交发布</button>' : ''}`;
    }
    return `${online}<span class="bar-st muted">${canEdit(def) ? '直接修改就会自动存成草稿' : '只读'}</span><span class="grow"></span><button class="btn btn-sm" data-act="history">${UI.ic('history', 14)} 版本记录</button>`;
  }

  function header(def) {
    const r = RISK[def.risk];
    return `<div class="page-hd"><div><h1>${esc(def.title)}</h1><p>${def.desc}</p>${def.refs ? `<div class="refs">${def.refs.map((x) => `<span>${esc(x)}</span>`).join('')}</div>` : ''}</div>
      <div class="page-hd-r">${UI.tag(r[0], r[1])}<small>改的人：${{ 'cfg.ops': '运营', 'cfg.dev': '研发', 'cfg.sys': '运营、研发' }[def.perm]}</small></div></div>`;
  }

  App.page('cfg', {
    render(el, arg) {
      ns = arg;
      const def = Schemas.def(ns);
      if (!def) { el.innerHTML = UI.notice('没有这个配置：' + esc(ns), 'danger'); return; }
      const p = Store.pending(ns);
      const d = Store.draft(ns);
      const ro = !!p || !canEdit(def);
      const ctx = { ns, def, data: Store.view(ns), pub: Store.pub(ns), ro };
      Form.calc.clear();
      const notes = [
        def.notice ? UI.notice(def.notice[0], def.notice[1]) : '',
        p ? UI.notice(`有一个待审批的发布（${esc(p.id)}，${esc(Store.who(p.by))}提交：${esc(p.note)}），审批完成前不能修改。下面显示的是提交的内容。`, 'warn') : '',
        !p && !canEdit(def) ? UI.notice(`你现在是 <b>${esc(Store.me().name)}</b>，这类配置由${{ 'cfg.ops': '运营', 'cfg.dev': '研发', 'cfg.sys': '运营或研发' }[def.perm]}修改，你只能查看。右上角可以切换演示角色。`, 'info') : '',
        d && d.rejected ? UI.notice(`上次提交被驳回：${esc(d.rejected)}。改好后可以重新提交。`, 'danger') : '',
        d && d.rollback ? UI.notice(`当前草稿是 v${d.rollback} 的内容（回滚），提交发布后生效。`, 'info') : '',
      ].join('');
      const body = def.custom ? Editors[def.custom](ctx) : `<div class="card"><div class="card-bd form">${Form.fields(def.fields, ctx)}</div></div>`;
      el.innerHTML = `${header(def)}${notes}<div class="cfg-body">${body}</div><div class="cfg-bar" id="cfg-bar">${barHtml(def)}</div>`;
    },
    input(t) {
      const path = t.dataset.path;
      if (!path) { if (Editors.input) Editors.input(t); return; }
      const def = Schemas.def(ns);
      if (!canEdit(def) || Store.pending(ns)) return;
      if (t.dataset.t === 'file') {
        const f = t.files[0];
        if (!f) return;
        if (f.size > 600 * 1024) { UI.toast('演示里图片不要超过 600KB', 'warn'); return; }
        const rd = new FileReader();
        rd.onload = () => Cfg.commit(path, rd.result, true);
        rd.readAsDataURL(f);
        return;
      }
      const tt = t.dataset.t;
      const val = tt === 'num' ? (t.value === '' ? '' : Number(t.value)) : tt === 'bool' ? t.checked : tt === 'sel' && t.hasAttribute('data-num') ? Number(t.value) : t.value;
      Cfg.commit(path, val, tt === 'bool' || tt === 'sel');
    },
    act: {
      add: (b) => {
        const def = Schemas.def(ns);
        const f = Form.findList(def.fields, b.dataset.path);
        Cfg.update((d) => { const list = get(d, b.dataset.path); list.push(f.add(d)); });
      },
      rm: async (b) => {
        const list = get(Store.view(ns), b.dataset.path);
        const row = list[+b.dataset.i];
        const f = Form.findList(Schemas.def(ns).fields, b.dataset.path);
        const online = f.key ? get(Store.pub(ns), b.dataset.path).some((x) => x[f.key] === row[f.key]) : true;
        if (online && !(await UI.confirm({ title: '删除这一行？', text: '发布后线上也会去掉这一行。只是想暂时不用的话，建议改成“下线”。', ok: '删除', danger: true }))) return;
        Cfg.update((d) => get(d, b.dataset.path).splice(+b.dataset.i, 1));
      },
      mv: (b) => Cfg.update((d) => {
        const list = get(d, b.dataset.path);
        const i = +b.dataset.i;
        const j = i + +b.dataset.d;
        if (j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
        if (list.every((x) => 'sort' in x)) list.forEach((x, k) => { x.sort = k + 1; });
      }),
      i18n: (b) => Cfg.i18nModal(b.dataset.path, b.dataset.label, b.hasAttribute('data-area')),
      discard: async () => {
        if (await UI.confirm({ title: '放弃草稿？', text: '草稿里的修改都会丢掉，恢复成线上版本。', ok: '放弃', danger: true })) { Store.discardDraft(ns); App.refresh(); UI.toast('已放弃草稿'); }
      },
      withdraw: async () => {
        const p = Store.pending(ns);
        if (await UI.confirm({ title: '撤回这次提交？', text: '撤回后内容回到草稿，可以继续改。', ok: '撤回' })) { Store.withdraw(p.id); App.refresh(); UI.toast('已撤回'); }
      },
      submit: () => publishModal(),
      history: () => historyDrawer(),
      ...(window.Editors ? Editors.acts : {}),
    },
  });

  /** 多语言编辑弹窗（列表里的多语言字段） */
  Cfg.i18nModal = (path, label, area) => {
    const def = Schemas.def(ns);
    const ro = !canEdit(def) || !!Store.pending(ns);
    const c = UI.modal({
      title: `${label || '文案'} · 5 种语言`, width: '560px',
      body: Form.i18n({ area }, get(Store.view(ns), path), path, ro) + '<p class="f-h">每种语言都要填；接收方按自己的语言显示。</p>',
      foot: '<button class="btn btn-primary" data-act="ok">完成</button>',
      act: { ok: () => c.close() },
      onInput: (t) => {
        if (ro || !t.dataset.path) return;
        Cfg.commit(t.dataset.path, t.value, false);
        t.closest('.i18n-r').classList.toggle('is-miss', !t.value.trim());
      },
      onClose: () => App.refresh(),
    });
  };

  /** 每天理论上限：改前改后（签到与任务 6.8 的算法） */
  Cfg.econTable = (a, b) => UI.table([
    { title: '档位', render: (r, i) => esc(a[i].name) },
    { title: '满勤每天平均', align: 'r', render: (r, i) => delta(a[i].avg, b[i].avg) },
    { title: '签到和任务单日理论上限（告警线）', align: 'r', render: (r, i) => delta(a[i].cap, b[i].cap) },
    { title: '每天平均够打几局最低场', align: 'r', render: (r, i) => delta(a[i].games, b[i].games) },
  ], a, { cls: 'tbl-mini' });
  const delta = (x, y) => { const d = Math.round(y) - Math.round(x); return `${UI.n(Math.round(x))}${d ? ` → <b>${UI.n(Math.round(y))}</b> <span class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${UI.n(d)}</span>` : ''}`; };

  function publishModal() {
    const def = Schemas.def(ns);
    const data = Store.view(ns);
    const pub = Store.pub(ns);
    const errors = Schemas.validate(ns, data);
    const rows = Schemas.diff(ns, pub, data);
    const effects = def.effects ? def.effects(data, pub) : [];
    const econ = def.econ ? Cfg.econTable(Store.econ(), Store.econ({ [ns]: data })) : '';
    const needs = def.risk === 'normal' ? '<b>不需要审批</b>，提交后马上发布（约 1 分钟内生效）' : `发布前要 <b>${def.risk === 'bot' ? '产品（数值负责人）→ 研发负责人' : '产品（数值负责人）'}</b> 审批`;
    const c = UI.modal({
      title: `提交发布 · ${esc(def.title)}`, width: '760px',
      body: `${errors.length ? UI.notice(`<ul class="plain">${errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>`, 'danger', { title: `有 ${errors.length} 个问题要先改好` }) : ''}
        <h4 class="sec">改了什么（${rows.length} 处）</h4>${UI.diff(rows)}
        ${effects.length ? `<h4 class="sec">发布后的影响</h4>${UI.notice(`<ul class="plain">${effects.map((x) => `<li>${x}</li>`).join('')}</ul>`, 'warn')}` : ''}
        ${econ ? `<h4 class="sec">每天能拿的免费金币（按当前配置自动算）</h4>${econ}` : ''}
        <h4 class="sec">发布说明</h4><textarea class="inp" rows="2" id="pub-note" placeholder="为什么改、改了什么（会写进版本记录和审批单）"></textarea>
        <p class="f-h">${needs}</p>`,
      foot: `<button class="btn" data-close>取消</button><button class="btn btn-primary" data-act="go" ${errors.length || !rows.length ? 'disabled' : ''}>${def.risk === 'normal' ? '发布' : '提交审批'}</button>`,
      act: {
        go: () => {
          const note = c.$('#pub-note').value.trim();
          if (!note) { UI.toast('写一句发布说明', 'warn'); c.$('#pub-note').focus(); return; }
          const res = Store.submitConfig(ns, note);
          c.close();
          App.refresh();
          if (res.published) UI.toast(`已发布 v${res.v}`);
          else if (res.approval) UI.toast(`已提交审批 ${res.approval}`);
        },
      },
    });
  }

  function historyDrawer() {
    const vs = Store.versions(ns).slice().reverse();
    const def = Schemas.def(ns);
    const open = new Set([vs[0].v]);
    const draw = () => vs.map((v) => {
      const prev = Store.versions(ns)[v.v - 2];
      const rows = prev ? Schemas.diff(ns, prev.data, v.data) : [];
      return `<div class="ver ${open.has(v.v) ? 'is-open' : ''}"><div class="ver-hd" data-act="tg" data-v="${v.v}"><b>v${v.v}</b>${v.v === vs[0].v ? UI.tag('线上', 'green') : ''}<span>${esc(v.note)}</span><small>${UI.datetime(v.at)} · ${esc(Store.who(v.by))}${v.approval ? ` · 审批 ${esc(v.approval)}` : ''}</small></div>
        ${open.has(v.v) ? `<div class="ver-bd">${prev ? UI.diff(rows, { a: `v${prev.v}`, b: `v${v.v}` }) : UI.empty('第一个版本')}${v.v !== vs[0].v && canEdit(def) && !Store.pending(ns) ? `<button class="btn btn-sm" data-act="rb" data-v="${v.v}">${UI.ic('history', 14)} 以这个版本为草稿（回滚）</button>` : ''}</div>` : ''}</div>`;
    }).join('');
    const c = UI.drawer({
      title: `版本记录 · ${esc(def.title)}`, sub: '每次发布生成一个版本；回滚 = 把历史版本放进草稿，再走一遍提交发布', body: draw(),
      act: {
        tg: (b) => { const v = +b.dataset.v; if (open.has(v)) open.delete(v); else open.add(v); c.set(draw()); },
        rb: async (b) => {
          if (Store.draft(ns) && !(await UI.confirm({ title: '覆盖当前草稿？', text: '当前草稿会被这个版本的内容替换。', ok: '覆盖', danger: true }))) return;
          Store.rollbackTo(ns, +b.dataset.v);
          c.close();
          App.refresh();
          UI.toast(`已把 v${b.dataset.v} 放进草稿，检查后提交发布`);
        },
      },
    });
  }
})();
