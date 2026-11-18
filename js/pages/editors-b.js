/**
 * 专用编辑器：会员档位与权益（三档并排）、多语言文案（搜索 + 缺翻译检查）
 */
(() => {
  'use strict';
  const esc = UI.esc;
  const Editors = window.Editors;
  const st = { q: '', group: '', miss: false };

  /* ================= 会员 ================= */
  const VIP_ROWS = [
    ['product_id', '商店商品 ID', 'text'], ['usd', '价格（美元/月）', 'num'], ['bonus', '开通送金币', 'num'], ['daily', '每日福利（金币）', 'num'],
    ['aid_times', '破产补助每天次数', 'num'], ['aid_coins', '破产补助每次金币', 'num'], ['sign', '签到倍数', 'num'], ['friend_cap', '好友上限', 'num'],
    ['voice_free', '语音通话免费', 'bool'], ['video_free', '视频通话免费', 'bool'], ['priority', '优先匹配', 'bool'], ['pin', '好友申请置顶（带附言）', 'bool'],
    ['frame', '专属头像框', 'item'], ['entry_fx', '对局入场特效', 'bool'], ['stickers', '专属表情和气泡（套）', 'num'],
  ];
  const FREE_EDIT = ['friend_cap'];
  Editors.vip = (ctx) => {
    const tiers = ctx.data.tiers;
    const pub = ctx.pub.tiers;
    const cell = (k, type, i) => {
      const v = tiers[i][k];
      const ro = ctx.ro || (i === 0 && !FREE_EDIT.includes(k));
      const changed = JSON.stringify(v) !== JSON.stringify(pub[i][k]);
      const f = { t: type, kind: 'frame', empty: '无', min: 0, step: k === 'usd' ? 0.01 : 1 };
      return `<td class="${changed ? 'is-changed' : ''}" data-f="tiers.${i}.${k}" data-pub="${esc(JSON.stringify(pub[i][k] ?? null))}">${i === 0 && !FREE_EDIT.includes(k) && !v ? '<span class="muted">—</span>' : Form.control(f, v, `tiers.${i}.${k}`, { ...ctx, ro }, tiers[i], true)}</td>`;
    };
    const members = (id) => Store.s.users.filter((u) => u.vip && u.vip.tier === id).length;
    const text = (t) => [
      ['对局特权', [['每日免费金币', t.daily ? `每天领${UI.n(t.daily)}` : '—'], ['破产补助', t.aid_times ? `金币不够时每天${t.aid_times}次` : '—'], ['优先匹配', t.priority ? '匹配更快' : '—']]],
      ['社交特权', [['语音通话', t.voice_free ? '免费' : `${Store.pub('call').voice}金币/次`], ['视频通话', t.video_free ? '免费' : `${Store.pub('call').video}金币/次`], ['好友上限', `${t.friend_cap}人`], ['好友申请置顶', t.pin ? '带附言、优先展示' : '—']]],
      ['身份特权', [['专属头像框', t.frame ? Store.itemName(t.frame) : '—'], ['名字颜色', t.id === 2 ? '彩色名字+超级标' : t.id === 1 ? '金色名字+会员标' : '—'], ['对局入场特效', t.entry_fx ? '匹配成功专属特效' : '—'], ['专属表情和气泡', t.stickers ? `${t.stickers}套` : '—']]],
      ['成长特权', [['开通即得金币', t.bonus ? `${UI.n(t.bonus)}金币` : '—'], ['签到奖励', t.sign > 1 ? `×${t.sign}` : '—']]],
    ];
    const cmp = text(tiers[0]).map(([g, items], gi) => `<tr class="grp"><td colspan="4">${g}</td></tr>${items.map(([title], ii) => `<tr><td>${title}</td>${tiers.map((t) => `<td>${esc(text(t)[gi][1][ii][1])}</td>`).join('')}</tr>`).join('')}`).join('');
    return `<div class="card"><div class="card-bd">
      <div class="tbl-wrap"><table class="tbl vtbl"><thead><tr><th style="width:24%">权益</th>${tiers.map((t, i) => `<th>${UI.i18n(t.name)}<br><small>${i ? `${members(t.id)} 人生效中` : '没开会员的用户'}</small> <button class="btn btn-xs" data-act="i18n" data-path="tiers.${i}.name" data-label="档位名称">${ctx.ro ? '查看' : '改名称'}</button></th>`).join('')}</tr></thead>
      <tbody>${VIP_ROWS.map(([k, label, type]) => `<tr><td>${esc(label)}</td>${tiers.map((t, i) => cell(k, type, i)).join('')}</tr>`).join('')}
      <tr><td>名字颜色</td><td><span class="muted">—</span></td><td>金色 + 会员标</td><td>彩色 + 超级标</td></tr></tbody></table></div>
      <p class="muted sm">价格在商店后台按国家定，这里的美元价格只用来展示和对账。会员到期后会员框留在背包里但不能用，正在用的自动卸下（我的 4.8）。</p>
    </div></div>
    ${UI.card('会员中心的对比表（按上面的值自动生成）', `<div class="tbl-wrap"><table class="tbl cmp"><thead><tr><th></th>${tiers.map((t) => `<th>${esc(t.name.zh)}${t.usd ? `<small>${UI.usd(t.usd)}/月</small>` : ''}</th>`).join('')}</tr></thead><tbody>${cmp}</tbody></table></div>`)}`;
  };

  /* ================= 多语言 ================= */
  function configTexts() {
    const out = [];
    const add = (where, go, label, obj) => { const m = UI.missing(obj); if (m.length) out.push({ where, go, label, miss: m }); };
    Store.view('stakes').rows.forEach((r) => add('场次', 'cfg/stakes', r.name.zh || r.id, r.name));
    Store.view('tasks').rows.forEach((r) => add('任务', 'cfg/tasks', r.name.zh || r.id, r.name));
    Store.view('mystery').rows.forEach((r) => add('神秘任务', 'cfg/mystery', r.name.zh || r.id, r.name));
    Store.view('items').rows.forEach((r) => add('装扮', 'cfg/items', r.name.zh || r.id, r.name));
    Store.view('emotes').phrases.forEach((r) => add('快捷语', 'cfg/emotes', r.text.zh || r.id, r.text));
    Store.view('vip').tiers.forEach((r) => add('会员档位', 'cfg/vip', r.name.zh, r.name));
    Store.view('game').games.forEach((r) => { add('游戏名', 'cfg/game', r.name.zh, r.name); add('开场提示', 'cfg/game', r.name.zh, r.intro); });
    const sh = Store.view('share');
    add('分享', 'cfg/share', '邀请文案', sh.text); add('分享', 'cfg/share', '结算页分享胜利', sh.result_text);
    add('展示数字', 'cfg/display', '登录页文案', Store.view('display').login_text);
    Store.view('push').rows.forEach((r) => { add('推送', 'cfg/push', r.name + ' · 标题', r.title); add('推送', 'cfg/push', r.name + ' · 内容', r.body); });
    Store.view('sysmsg').rows.forEach((r) => { if (r.status === '在用') add('系统消息', 'cfg/sysmsg', r.name, r.text); else if (UI.missing(r.text).length) out.push({ where: '系统消息', go: 'cfg/sysmsg', label: r.name + '（待确认，不影响发布）', miss: UI.missing(r.text), soft: true }); });
    return out;
  }
  function i18nTable(ctx) {
    const rows = ctx.data.rows.map((r, i) => ({ r, i })).filter(({ r }) => (!st.group || r.group === st.group) && (!st.miss || UI.missing(r.text).length)
      && (!st.q || r.key.includes(st.q) || D.LANGS.some((l) => (r.text[l.id] || '').toLowerCase().includes(st.q.toLowerCase()))));
    return UI.table([
      { title: 'key', w: '170px', render: ({ r }) => `<code>${esc(r.key)}</code><br><small class="muted">${esc(r.group)}</small>` },
      ...D.LANGS.map((l) => ({ title: l.name, render: ({ r }) => (r.text[l.id] ? esc(r.text[l.id]) : '<span class="miss">缺</span>') })),
      { title: '', w: '90px', align: 'r', render: ({ r, i }) => { const o = ctx.pub.rows.find((x) => x.key === r.key); return `${o && JSON.stringify(o) !== JSON.stringify(r) ? UI.tag('已改', 'orange') : ''}<button class="btn btn-xs" data-act="i18n" data-path="rows.${i}.text" data-label="${esc(r.key)}">${ctx.ro ? '查看' : '编辑'}</button>`; } },
    ], rows, { cls: 'tbl-i18n', empty: '没有符合条件的文案' });
  }
  Editors.i18n = (ctx) => {
    const groups = [...new Set(ctx.data.rows.map((r) => r.group))];
    const miss = configTexts();
    Editors._i18nCtx = ctx;
    return `<div class="card"><div class="card-bd">
      <div class="toolbar"><input class="inp" style="width:260px" data-i18n-q placeholder="搜 key 或任何一种语言的文案" value="${esc(st.q)}">
        <select class="inp" style="width:140px" data-i18n-g>${UI.opts([['', '全部分组'], ...groups], st.group)}</select>
        <label class="chk"><input type="checkbox" data-i18n-m ${st.miss ? 'checked' : ''}> 只看缺翻译的</label><span class="grow"></span>
        <span class="muted sm">占位符：{场次名} {N} {任务名} 等由服务端按用户语言替换</span></div>
      <div data-i18n-tbl>${i18nTable(ctx)}</div></div></div>
    ${UI.card('配置里的文案检查（场次名、任务名、装扮名……跟着各自的配置发布）', miss.length ? UI.table([
      { title: '在哪', render: (x) => `<a href="#/${x.go}">${esc(x.where)}</a>` }, { title: '哪一条', render: (x) => esc(x.label) },
      { title: '缺的语言', render: (x) => x.miss.map((m) => UI.tag(D.LANGS.find((l) => l.id === m).name, x.soft ? 'gray' : 'red')).join(' ') },
    ], miss, { cls: 'tbl-mini' }) : UI.notice('都齐了：5 种语言没有缺的。', 'ok'))}`;
  };
  Editors.input = (t) => {
    if (t.matches('[data-i18n-q]')) st.q = t.value.trim();
    else if (t.matches('[data-i18n-g]')) st.group = t.value;
    else if (t.matches('[data-i18n-m]')) st.miss = t.checked;
    else return;
    const box = document.querySelector('[data-i18n-tbl]');
    if (box && Editors._i18nCtx) box.innerHTML = i18nTable({ ...Editors._i18nCtx, data: Store.view('i18n') });
  };
})();
