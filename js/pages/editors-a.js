/**
 * 专用编辑器（规划 4.11：任务、装扮、会员结构复杂、改得多，单独做页面）
 * 本文件：任务、装扮。编辑都在抽屉里改一份临时数据，点“保存到草稿”才写回，仍然走配置页的发布和审批
 */
(() => {
  'use strict';
  const esc = UI.esc;
  const Editors = (window.Editors = window.Editors || { acts: {} });
  Editors.acts = Editors.acts || {};
  const st = { group: 'daily', kind: 'frame' };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const metric = (id) => D.METRICS.find((m) => m.id === id) || { name: id, unit: '' };
  const jumpName = (k) => (Store.pub('jumps').rows.find((x) => x.key === k) || { name: k }).name;

  /* ================= 任务 ================= */
  Editors.tasks = (ctx) => {
    const rows = ctx.data.rows;
    const pub = ctx.pub.rows;
    const tabs = D.TASK_GROUPS.map((g) => [g.id, g.name, `${rows.filter((r) => r.group === g.id && r.enabled).length}/${rows.filter((r) => r.group === g.id).length}`]);
    const list = rows.map((r, i) => ({ r, i })).filter((x) => x.r.group === st.group).sort((a, b) => a.r.sort - b.r.sort);
    const grp = D.TASK_GROUPS.find((g) => g.id === st.group);
    const today = new Date().toISOString().slice(0, 10);
    const dailyNow = rows.filter((r) => r.group === 'daily' && r.enabled).length;
    const dailyPub = pub.filter((r) => r.group === 'daily' && r.enabled).length;
    const table = UI.table([
      { title: '排序', w: '70px', render: ({ i }) => (ctx.ro ? '' : `<span class="row-acts"><button class="icon-btn" data-act="tk_mv" data-i="${i}" data-d="-1">${UI.ic('up', 14)}</button><button class="icon-btn" data-act="tk_mv" data-i="${i}" data-d="1">${UI.ic('down', 14)}</button></span>`) },
      { title: 'task_id', render: ({ r }) => `<code>${esc(r.id)}</code>` },
      { title: '任务名', render: ({ r }) => UI.i18n(r.name) },
      { title: '计数项 · 目标', render: ({ r }) => `${esc(metric(r.metric).name)} · <b>${UI.n(r.goal)}</b> ${esc(metric(r.metric).unit)}` },
      { title: '奖励', align: 'r', render: ({ r }) => `${UI.n(r.reward.coins)} 金币${r.reward.item ? '<br><small>+ ' + esc(Store.itemName(r.reward.item)) + '</small>' : ''}` },
      { title: '去完成', render: ({ r }) => esc(jumpName(r.jump)) },
      ...(st.group === 'limited' ? [{ title: '活动期（用户本地日期）', render: ({ r }) => `${esc(r.start)} – ${esc(r.end)}<br>${r.end < today ? UI.tag('已结束', 'gray') : r.start > today ? UI.tag('未开始', 'blue') : UI.tag('进行中', 'green')}` }] : []),
      { title: '上线', render: ({ r, i }) => Form.control({ t: 'bool' }, r.enabled, `rows.${i}.enabled`, ctx) },
      { title: '', align: 'r', render: ({ r }) => { const o = pub.find((x) => x.id === r.id); return `${!o ? UI.tag('新增', 'blue') : JSON.stringify(o) !== JSON.stringify(r) ? UI.tag('已改', 'orange') : ''} <button class="btn btn-sm" data-act="tk_edit" data-id="${esc(r.id)}">${ctx.ro ? '查看' : '编辑'}</button>`; } },
    ], list, { empty: '这个分组还没有任务' });
    return `<div class="card"><div class="card-bd">
      <div class="toolbar">${UI.tabs(tabs, st.group, 'tk_tab')}<span class="grow"></span>${ctx.ro ? '' : `<button class="btn btn-primary btn-sm" data-act="tk_new">${UI.ic('plus', 14)} 新建任务</button>`}</div>
      <p class="muted sm">${esc(grp.name)}：${esc(grp.period)}${st.group === 'limited' ? '。只在活动期内显示和计数，活动开始前不显示；结束时完成了没领的奖励作废（签到与任务 4.11、Q7）' : ''}${st.group === 'newbie' ? '。全部领完后隐藏新手任务分组（签到与任务 Q8）' : ''}</p>
      ${dailyNow !== dailyPub ? UI.notice(`每日任务从 ${dailyPub} 个变成 ${dailyNow} 个：“连续 7 天”要求当天领完全部每日任务，难度会跟着变。`, 'warn') : ''}
      ${table}
      ${UI.notice('改动怎么生效（建议，待定，规划 4.4）：改目标或计数项只对下一个周期生效；改奖励对还没领的马上生效；下线后当期没领的作废。', 'info', { cls: 'mt' })}
    </div></div>`;
  };
  Editors.acts.tk_tab = (b) => { st.group = b.dataset.v; App.refresh(); };
  Editors.acts.tk_mv = (b) => Cfg.update((d) => {
    const list = d.rows.filter((r) => r.group === st.group).sort((a, c) => a.sort - c.sort);
    const row = d.rows[+b.dataset.i];
    const k = list.indexOf(row);
    const j = k + +b.dataset.d;
    if (j < 0 || j >= list.length) return;
    [list[k], list[j]] = [list[j], list[k]];
    list.forEach((x, n) => { x.sort = n + 1; });
  });
  Editors.acts.tk_new = () => taskDrawer(null);
  Editors.acts.tk_edit = (b) => taskDrawer(b.dataset.id);

  function taskDrawer(id) {
    const ns = Cfg.ns();
    const ro = !Store.can(Schemas.def(ns).perm) || !!Store.pending(ns);
    const data = Store.view(ns);
    const isNew = !id;
    const t = isNew ? { id: '', group: st.group, name: { zh: '', en: '', es: '', id: '', hi: '' }, metric: 'games', goal: 1, reward: { coins: 100, item: '' }, jump: 'home', sort: data.rows.filter((r) => r.group === st.group).length + 1, start: '', end: '', enabled: true } : clone(data.rows.find((r) => r.id === id));
    const pubRow = Store.pub(ns).rows.find((r) => r.id === id);
    const dis = ro ? 'disabled' : '';
    const sel = (name, list, v) => `<select class="inp" name="${name}" ${dis}>${UI.opts(list, v)}</select>`;
    const body = () => `<div class="form">
      <div class="fgrid c2">
        <div class="f"><label class="f-l">task_id<i class="req">*</i></label><input class="inp" name="id" value="${esc(t.id)}" ${isNew ? '' : 'disabled'} placeholder="例如 l_dec_share"><p class="f-h">小写字母、数字、下划线；发布后不能改</p></div>
        <div class="f"><label class="f-l">分组</label>${sel('group', D.TASK_GROUPS.map((g) => [g.id, g.name]), t.group)}</div>
      </div>
      <div class="f f-wide"><label class="f-l">任务名（5 种语言）</label>${Form.i18n({}, t.name, 'name', ro).replace(/data-path="name\.(\w+)"/g, 'name="name.$1"')}</div>
      <div class="fgrid c3">
        <div class="f"><label class="f-l">计数项</label>${sel('metric', D.METRICS.map((m) => [m.id, m.name]), t.metric)}<p class="f-h">新的计数项要研发开发</p></div>
        <div class="f"><label class="f-l">目标</label><span class="inp-u"><input type="number" class="inp" name="goal" min="1" value="${t.goal}" ${dis}><em data-unit>${esc(metric(t.metric).unit)}</em></span></div>
        <div class="f"><label class="f-l">去完成</label>${sel('jump', Store.pub('jumps').rows.map((x) => [x.key, x.name]), t.jump)}</div>
        <div class="f"><label class="f-l">奖励金币</label><span class="inp-u"><input type="number" class="inp" name="coins" min="0" value="${t.reward.coins}" ${dis}><em>金币</em></span></div>
        <div class="f"><label class="f-l">奖励装扮</label>${sel('item', [['', '不送'], ...Store.pub('items').rows.filter((x) => !x.is_default && !x.vip && x.enabled).map((x) => [x.id, x.name.zh])], t.reward.item)}</div>
        <div class="f"><label class="f-l">上线</label><label class="sw"><input type="checkbox" name="enabled" ${t.enabled ? 'checked' : ''} ${dis}><i></i><span>${t.enabled ? '是' : '否'}</span></label></div>
      </div>
      <div class="fgrid c2 ${t.group === 'limited' ? '' : 'is-hidden'}" data-dates>
        <div class="f"><label class="f-l">开始日</label><input type="date" class="inp" name="start" value="${esc(t.start)}" ${dis}></div>
        <div class="f"><label class="f-l">结束日</label><input type="date" class="inp" name="end" value="${esc(t.end)}" ${dis}><p class="f-h">开始日 00:00 到结束日 23:59:59，按用户所在时区</p></div>
      </div>
      ${pubRow && JSON.stringify(pubRow) !== JSON.stringify(t) ? `<h4 class="sec">和线上相比</h4>${UI.diff(Schemas.diff(ns, { rows: [pubRow] }, { rows: [t] }))}` : ''}
    </div>`;
    const c = UI.drawer({
      title: isNew ? '新建任务' : `${ro ? '查看' : '编辑'}任务 · ${esc(t.name.zh)}`, sub: '保存后进草稿，还要在页面底部提交发布', body: body(),
      foot: ro ? '<button class="btn" data-close>关闭</button>' : '<button class="btn" data-close>取消</button><button class="btn btn-primary" data-act="save">保存到草稿</button>',
      onInput: (el) => {
        if (el.name === 'group') c.$('[data-dates]').classList.toggle('is-hidden', el.value !== 'limited');
        if (el.name === 'metric') c.$('[data-unit]').textContent = metric(el.value).unit;
        if (el.name === 'enabled') el.nextElementSibling.nextElementSibling.textContent = el.checked ? '是' : '否';
        if (el.closest('.i18n-r')) el.closest('.i18n-r').classList.toggle('is-miss', !el.value.trim());
      },
      act: {
        save: () => {
          const v = (n) => c.$(`[name="${n}"]`);
          const row = {
            id: isNew ? v('id').value.trim() : t.id, group: v('group').value,
            name: Object.fromEntries(D.LANGS.map((l) => [l.id, v('name.' + l.id).value.trim()])),
            metric: v('metric').value, goal: Number(v('goal').value), reward: { coins: Number(v('coins').value), item: v('item').value },
            jump: v('jump').value, sort: t.sort, start: v('group').value === 'limited' ? v('start').value : '', end: v('group').value === 'limited' ? v('end').value : '', enabled: v('enabled').checked,
          };
          const errs = [];
          if (isNew && !/^[a-z][a-z0-9_]{1,30}$/.test(row.id)) errs.push('task_id 用小写字母开头，只含小写字母、数字、下划线');
          if (isNew && data.rows.some((r) => r.id === row.id)) errs.push('task_id 已经有了');
          if (!(row.goal >= 1)) errs.push('目标至少是 1');
          if (row.group === 'limited' && (!row.start || !row.end || row.start > row.end)) errs.push('限时任务要填开始日和结束日，结束日不能早于开始日');
          if (!row.name.zh) errs.push('至少先填中文任务名（其他语言提交发布前要补齐）');
          if (errs.length) { UI.toast(errs[0], 'warn'); return; }
          if (row.group !== t.group) row.sort = data.rows.filter((r) => r.group === row.group).length + 1;
          Cfg.update((d) => { const k = d.rows.findIndex((r) => r.id === row.id); if (k >= 0) d.rows[k] = row; else d.rows.push(row); });
          st.group = row.group;
          c.close();
          App.refresh();
          UI.toast('已保存到草稿');
        },
      },
    });
  }

  /* ================= 装扮 ================= */
  const KIND = { frame: '头像框', bubble: '聊天气泡', bg: '主页背景' };
  Editors.items = (ctx) => {
    const rows = ctx.data.rows;
    const pub = ctx.pub.rows;
    const tabs = Object.entries(KIND).map(([k, n]) => [k, n, rows.filter((r) => r.kind === k).length]);
    const list = rows.filter((r) => r.kind === st.kind).sort((a, b) => a.sort - b.sort);
    const users = Store.s.users;
    return `<div class="card"><div class="card-bd">
      <div class="toolbar">${UI.tabs(tabs, st.kind, 'it_tab')}<span class="grow"></span>${ctx.ro ? '' : `<button class="btn btn-primary btn-sm" data-act="it_new">${UI.ic('plus', 14)} 新建${KIND[st.kind]}</button>`}</div>
      <div class="igrid">${list.map((r) => {
        const o = pub.find((x) => x.id === r.id);
        const owners = users.filter((u) => u.items.some((x) => x.id === r.id)).length;
        return `<button class="icard ${r.enabled ? '' : 'is-off'}" data-act="it_edit" data-id="${esc(r.id)}">
          <span class="icard-pv">${UI.itemPreview(r, 64)}</span>
          <b>${esc(r.name.zh)}</b>${UI.missing(r.name).length ? UI.tag(`缺 ${UI.missing(r.name).length} 种语言`, 'red', { cls: 'tag-xs' }) : ''}
          <span class="icard-tags">${r.is_default ? UI.tag('默认', 'gray') : r.price ? `<span class="coin">${UI.n(r.price)}</span>` : UI.tag('免费', 'green')}${r.vip ? UI.tag(r.vip === 2 ? '超级会员专属' : '会员专属', 'gold') : ''}${r.enabled ? '' : UI.tag('已下架', 'gray')}${!o ? UI.tag('新增', 'blue') : JSON.stringify(o) !== JSON.stringify(r) ? UI.tag('已改', 'orange') : ''}</span>
          <small>${esc(r.id)} · ${owners} 人拥有</small></button>`;
      }).join('')}</div>
      <p class="muted sm">下架后商城买不到，已经拥有的照样能用；会员框到期后留在背包里但不能用（我的 4.8）。V7 首发素材也可以打包进安装包，第一次显示不用等下载（我的 6.5）。</p>
    </div></div>`;
  };
  Editors.acts.it_tab = (b) => { st.kind = b.dataset.v; App.refresh(); };
  Editors.acts.it_new = () => itemDrawer(null);
  Editors.acts.it_edit = (b) => itemDrawer(b.dataset.id);

  function itemDrawer(id) {
    const ns = Cfg.ns();
    const ro = !Store.can(Schemas.def(ns).perm) || !!Store.pending(ns);
    const data = Store.view(ns);
    const isNew = !id;
    const blank = { frame: { mode: 'ring', img: '', box: [-20, -20, 140, 140], ring: 'gold', deco: D.IMG + 'ui/crown.png', pos: 'top' }, bubble: { mode: 'gradient', colors: ['#7b5cff', '#2c7bff'], text: '#ffffff', img: '', css: '' }, bg: { mode: 'gradient', colors: ['#4cb4ff', '#7b5cff'], img: '', css: '' } };
    const t = isNew ? { id: '', kind: st.kind, name: { zh: '', en: '', es: '', id: '', hi: '' }, price: 300, vip: 0, is_default: false, sort: data.rows.filter((r) => r.kind === st.kind).length + 1, enabled: false, ...clone(blank[st.kind]) } : clone(data.rows.find((r) => r.id === id));
    const dis = ro ? 'disabled' : '';
    const img = (name, lib, v) => `<div class="imgf">${v ? `<img src="${esc(v)}" alt="">` : '<span class="imgf-empty">无</span>'}<div class="imgf-c"><select class="inp" name="${name}" ${dis}>${UI.opts([['', '（不用）'], ...lib, ...(v && !lib.some(([p]) => p === v) ? [[v, '上传的图片']] : [])], v)}</select>${ro ? '' : `<label class="btn btn-xs">上传<input type="file" accept="image/*" name="${name}" data-file hidden></label>`}</div></div>`;
    const slider = (k, i, min, max) => `<label class="sl"><span>${k}</span><input type="range" name="box.${i}" min="${min}" max="${max}" step="0.1" value="${t.box[i]}" ${dis}><b>${t.box[i]}%</b></label>`;
    const preview = () => (t.kind === 'frame'
      ? `<div class="pv-frame">${[96, 64, 40].map((s) => UI.av(D.IMG + 'avatars/stella.jpg', s, { frameItem: t })).join('')}${UI.av(D.IMG + 'avatars/kai.jpg', 64, { frameItem: t })}</div>`
      : t.kind === 'bubble'
        ? `<div class="pv-chat"><div class="bub is-in">明天再战一局？</div><div class="bub is-me" style="${esc(UI.bubbleStyle(t))}">一言为定！🤝</div></div>`
        : `<div class="pv-bg" style="background:${esc(UI.bgCss(t))}">${UI.av(D.IMG + 'avatars/stella.jpg', 56)}<b>星星</b></div>`);
    const assets = () => {
      if (t.kind === 'frame') {
        return `<div class="f"><label class="f-l">素材做法</label><select class="inp" name="mode" ${dis}>${UI.opts([['image', '整张图片 + 位置'], ['ring', '圈色 + 装饰图']], t.mode)}</select></div>
          ${t.mode === 'image' ? `<div class="f f-wide"><label class="f-l">头像框图片（透明 PNG）</label>${img('img', D.IMAGE_LIB.frame, t.img)}</div><div class="f f-wide"><label class="f-l">图片相对头像的位置和大小（%）</label><div class="sls">${slider('左', 0, -60, 20)}${slider('上', 1, -60, 20)}${slider('宽', 2, 80, 220)}${slider('高', 3, 80, 220)}</div><p class="f-h">原型里由内圈拟合得出，例如天使之翼 −26.9 / −21.2 / 153.8 / 151.9</p></div>`
            : `<div class="f"><label class="f-l">圈色</label><select class="inp" name="ring" ${dis}>${UI.opts(D.FRAME_RINGS, t.ring)}</select></div><div class="f"><label class="f-l">装饰位置</label><select class="inp" name="pos" ${dis}>${UI.opts(D.FRAME_POS, t.pos)}</select></div><div class="f f-wide"><label class="f-l">装饰图</label>${img('deco', D.IMAGE_LIB.deco, t.deco)}</div>`}`;
      }
      const modes = t.kind === 'bubble' ? [['gradient', '渐变'], ['image', '图片'], ['css', '自定义样式（高级）']] : [['image', '图片'], ['gradient', '渐变'], ['css', '自定义样式（高级）']];
      return `<div class="f"><label class="f-l">素材做法</label><select class="inp" name="mode" ${dis}>${UI.opts(modes, t.mode)}</select></div>
        ${t.mode === 'gradient' ? `<div class="f"><label class="f-l">渐变颜色</label><span class="colors">${(t.colors || []).map((c, i) => `<input type="color" name="colors.${i}" value="${esc(c)}" ${dis}>`).join('')}${ro ? '' : `<button class="btn btn-xs" data-act="col_add">+</button>${t.colors.length > 2 ? '<button class="btn btn-xs" data-act="col_rm">−</button>' : ''}`}</span></div>${t.kind === 'bubble' ? `<div class="f"><label class="f-l">文字颜色</label><input type="color" name="text" value="${esc(t.text || '#ffffff')}" ${dis}></div>` : ''}` : ''}
        ${t.mode === 'image' ? `<div class="f f-wide"><label class="f-l">图片</label>${img('img', D.IMAGE_LIB.bg, t.img)}</div>` : ''}
        ${t.mode === 'css' ? `<div class="f f-wide"><label class="f-l">${t.kind === 'bubble' ? 'CSS（背景、文字颜色、阴影）' : 'CSS background'}</label><textarea class="inp mono" rows="3" name="css" ${dis}>${esc(t.css)}</textarea></div>` : ''}`;
    };
    const body = () => `<div class="pv">${preview()}</div><div class="form">
      <div class="fgrid c2">
        <div class="f"><label class="f-l">item_id<i class="req">*</i></label><input class="inp" name="id" value="${esc(t.id)}" ${isNew ? '' : 'disabled'} placeholder="例如 lantern"></div>
        <div class="f"><label class="f-l">类型</label><b>${KIND[t.kind]}</b></div>
      </div>
      <div class="f f-wide"><label class="f-l">名称（5 种语言）</label>${Form.i18n({}, t.name, 'name', ro).replace(/data-path="name\.(\w+)"/g, 'name="name.$1"')}</div>
      <div class="fgrid c2">${assets()}</div>
      <div class="fgrid c4">
        <div class="f"><label class="f-l">价格</label><span class="inp-u"><input type="number" class="inp" name="price" min="0" value="${t.price}" ${dis}><em>金币</em></span></div>
        ${t.kind === 'frame' ? `<div class="f"><label class="f-l">会员档位要求</label><select class="inp" name="vip" ${dis}>${UI.opts([[0, '不限'], [1, '会员'], [2, '超级会员']], t.vip)}</select></div>` : `<div class="f"><label class="f-l">默认装扮</label><label class="sw"><input type="checkbox" name="is_default" ${t.is_default ? 'checked' : ''} ${dis}><i></i><span>${t.is_default ? '是' : '否'}</span></label></div>`}
        <div class="f"><label class="f-l">排序</label><input type="number" class="inp" name="sort" value="${t.sort}" ${dis}></div>
        <div class="f"><label class="f-l">上架</label><label class="sw"><input type="checkbox" name="enabled" ${t.enabled ? 'checked' : ''} ${dis}><i></i><span>${t.enabled ? '是' : '否'}</span></label></div>
      </div></div>`;
    const set = (name, v) => { const ks = name.split('.'); if (ks.length === 2) { if (ks[0] === 'name') t.name[ks[1]] = v; else t[ks[0]][+ks[1]] = v; } else t[name] = v; };
    const c = UI.drawer({
      title: isNew ? `新建${KIND[t.kind]}` : `${ro ? '查看' : '编辑'}${KIND[t.kind]} · ${esc(t.name.zh)}`, sub: '右边改，上面马上预览；保存后进草稿，还要提交发布', body: body(), width: '720px',
      foot: ro ? '<button class="btn" data-close>关闭</button>' : '<button class="btn" data-close>取消</button><button class="btn btn-primary" data-act="save">保存到草稿</button>',
      onInput: (el) => {
        if (ro || !el.name) return;
        if (el.hasAttribute('data-file')) {
          const f = el.files[0];
          if (!f || f.size > 600 * 1024) { UI.toast('演示里图片不要超过 600KB', 'warn'); return; }
          const rd = new FileReader();
          rd.onload = () => { set(el.name, rd.result); c.set(body()); };
          rd.readAsDataURL(f);
          return;
        }
        const v = el.type === 'checkbox' ? el.checked : el.type === 'number' || el.type === 'range' || el.name === 'vip' ? Number(el.value) : el.value;
        set(el.name, v);
        if (['mode', 'img', 'deco'].includes(el.name) || el.type === 'checkbox') { c.set(body()); return; }
        if (el.type === 'range') el.nextElementSibling.textContent = v + '%';
        c.$('.pv').innerHTML = preview();
      },
      act: {
        col_add: () => { t.colors.push('#ffffff'); c.set(body()); },
        col_rm: () => { t.colors.pop(); c.set(body()); },
        save: () => {
          if (isNew) t.id = c.$('[name="id"]').value.trim();
          D.LANGS.forEach((l) => { t.name[l.id] = c.$(`[name="name.${l.id}"]`).value.trim(); });
          if (isNew && (!/^[a-z][a-z0-9_]{1,30}$/.test(t.id) || data.rows.some((r) => r.id === t.id))) { UI.toast('item_id 用小写字母开头，不能和已有的重复', 'warn'); return; }
          if (!t.name.zh) { UI.toast('至少先填中文名称', 'warn'); return; }
          Cfg.update((d) => { const k = d.rows.findIndex((r) => r.id === t.id); if (k >= 0) d.rows[k] = t; else d.rows.push(t); });
          c.close();
          UI.toast('已保存到草稿');
        },
      },
    });
  }
})();
