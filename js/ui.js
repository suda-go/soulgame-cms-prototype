/**
 * 通用组件：格式化、标签、头像和装扮、表格、分页、页签、弹窗、抽屉、确认框、轻提示、差异表
 * 都返回 HTML 字符串；弹窗和抽屉里的 data-act 由各自传入的 act 处理（见 app.js 的点击分发）
 */
(() => {
  'use strict';
  const UI = (window.UI = {});
  const esc = (UI.esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));

  /* ---------- 格式化 ---------- */
  UI.n = (v) => (v == null || v === '' ? '—' : Number(v).toLocaleString('zh-CN', { maximumFractionDigits: 2 }));
  UI.signed = (v) => `<b class="num ${v > 0 ? 'up' : v < 0 ? 'down' : ''}">${v > 0 ? '+' : ''}${UI.n(v)}</b>`;
  UI.usd = (v) => '$' + Number(v).toFixed(2);
  const pad = (x) => String(x).padStart(2, '0');
  UI.time = (t) => { if (!t) return '—'; const d = new Date(t); return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  UI.datetime = (t) => { if (!t) return '—'; const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
  UI.date = (t) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  UI.ago = (t) => {
    if (!t) return '—';
    const s = (Date.now() - t) / 1000;
    if (s < 0) { const f = -s; return f < 3600 ? `${Math.ceil(f / 60)} 分钟后` : f < 86400 ? `${Math.round(f / 3600)} 小时后` : `${Math.round(f / 86400)} 天后`; }
    if (s < 60) return '刚刚';
    if (s < 3600) return `${Math.floor(s / 60)} 分钟前`;
    if (s < 86400) return `${Math.floor(s / 3600)} 小时前`;
    return `${Math.floor(s / 86400)} 天前`;
  };
  UI.dur = (sec) => { sec = Math.round(sec); return sec < 60 ? `${sec} 秒` : sec < 3600 ? `${Math.floor(sec / 60)} 分 ${sec % 60} 秒` : `${(sec / 3600).toFixed(1)} 小时`; };
  UI.mask = (v) => {
    if (!v) return '—';
    if (v.includes('@')) { const [a, b] = v.split('@'); return `${a.slice(0, 2)}***@${b}`; }
    return v.length > 8 ? `${v.slice(0, 4)}****${v.slice(-4)}` : v.slice(0, 2) + '****';
  };

  /* ---------- 标签、提示、空状态 ---------- */
  UI.tag = (text, tone = 'gray', o = {}) => `<span class="tag t-${tone} ${o.cls || ''}" ${o.title ? `title="${esc(o.title)}"` : ''}>${o.raw ? text : esc(text)}</span>`;
  UI.p1 = () => '<span class="tag t-purple tag-xs">P1</span>';
  UI.status = (map, key) => { const x = map[key] || { name: key, tone: 'gray' }; return UI.tag(x.name, x.tone); };
  UI.notice = (html, tone = 'info', o = {}) => `<div class="notice n-${tone} ${o.cls || ''}">${o.title ? `<b>${esc(o.title)}</b>` : ''}<div>${html}</div></div>`;
  UI.empty = (text = '暂无数据') => `<div class="empty">${esc(text)}</div>`;
  UI.kv = (rows, o = {}) => `<dl class="kv ${o.cols ? 'kv-' + o.cols : ''}">${rows.filter(Boolean).map(([k, v, cls]) => `<div class="kv-it ${cls || ''}"><dt>${esc(k)}</dt><dd>${v == null || v === '' ? '—' : v}</dd></div>`).join('')}</dl>`;
  UI.card = (title, body, o = {}) => `<section class="card ${o.cls || ''}">${title ? `<header class="card-hd"><h3>${title}</h3>${o.extra || ''}</header>` : ''}<div class="card-bd ${o.flush ? 'is-flush' : ''}">${body}</div></section>`;
  UI.stat = (label, value, o = {}) => `<${o.go ? 'a href="#/' + o.go + '"' : 'div'} class="stat ${o.tone ? 's-' + o.tone : ''}"><small>${esc(label)}</small><b>${value}</b>${o.sub ? `<em>${o.sub}</em>` : ''}</${o.go ? 'a' : 'div'}>`;

  /* ---------- 头像与装扮（和 app 原型同一套画法） ---------- */
  UI.frame = (it) => {
    if (!it || it.kind !== 'frame') return '';
    if (it.mode === 'image') {
      const [l, t, w, h] = it.box;
      return `<img class="av-frame" src="${esc(it.img)}" style="left:${l}%;top:${t}%;width:${w}%;height:${h}%" alt="">`;
    }
    return `<i class="av-ring ring-${esc(it.ring)}"></i>${it.deco ? `<img class="av-deco deco-${esc(it.pos)}" src="${esc(it.deco)}" alt="">` : ''}`;
  };
  UI.av = (src, size = 32, o = {}) => {
    const fr = o.frameItem || (o.frame ? Store.item(o.frame) : null);
    const img = src ? `<img class="av-img" src="${esc(src)}" alt="">` : `<span class="av-img av-letter" style="background:${UI.color(o.name || '?')}">${esc((o.name || '?').slice(0, 1).toUpperCase())}</span>`;
    return `<span class="av ${fr ? 'has-frame' : ''} ${o.cls || ''}" style="--s:${size}px">${img}${fr ? UI.frame(fr) : ''}${o.bot ? '<i class="av-bot">机器人</i>' : ''}</span>`;
  };
  UI.color = (name) => { let h = 0; for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h} 62% 58%)`; };
  UI.bubbleStyle = (it) => {
    if (!it) return '';
    if (it.mode === 'image') return `background:url(${it.img}) center/cover;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.5)`;
    if (it.mode === 'css') return it.css;
    return `background:linear-gradient(135deg,${(it.colors || []).join(',')});color:${it.text || '#fff'}`;
  };
  UI.bgCss = (it) => {
    if (!it) return '#dde3ee';
    if (it.mode === 'image') return `url(${it.img}) center/cover`;
    if (it.mode === 'css') return it.css;
    return `linear-gradient(160deg,${(it.colors || []).join(',')})`;
  };
  UI.itemPreview = (it, size = 56, avatar = D.IMG + 'avatars/stella.jpg') => {
    if (!it) return '';
    if (it.kind === 'frame') return `<span class="ip ip-frame">${UI.av(avatar, size, { frameItem: it })}</span>`;
    if (it.kind === 'bubble') return `<span class="ip ip-bubble"><span class="bub" style="${esc(UI.bubbleStyle(it))}">好棋！</span></span>`;
    return `<span class="ip ip-bg" style="background:${esc(UI.bgCss(it))}"></span>`;
  };
  /** 用户小卡片：头像 + 昵称 + 展示 ID，点了进用户详情 */
  UI.user = (uid, o = {}) => {
    if (uid && typeof uid === 'object' && uid.bot) {
      const p = Store.persona(uid.bot);
      return `<span class="uchip">${UI.av(p && p.avatar, o.size || 28, { name: p ? p.name : '?', bot: true })}<span class="uchip-m"><b>${esc(p ? p.name : uid.bot)}</b><small>补位机器人 · ${esc(uid.bot)}</small></span></span>`;
    }
    const u = Store.user(uid);
    if (!u) return `<span class="uchip"><span class="uchip-m"><b>${esc(uid)}</b><small>已删除</small></span></span>`;
    const name = u.status === 'deleted' ? '已注销用户' : u.nickname;
    return `<a class="uchip" href="#/user/${u.uid}">${UI.av(u.status === 'deleted' ? '' : u.avatar, o.size || 28, { frame: o.noFrame ? '' : u.frame, name })}<span class="uchip-m"><b>${esc(name)}</b>${o.noId ? '' : `<small>${esc(u.displayId)}</small>`}</span></a>`;
  };
  UI.emoji = (id, size = 28) => Emoji.blob(id, size);
  UI.emote = (e) => (e.kind === 'emoji' ? `${UI.emoji(e.id, 22)}<small>${esc(D.EMOJI_NAMES[e.id] || e.id)}</small>` : `<span class="phrase">${esc((Store.pub('emotes').phrases.find((p) => p.id === e.id) || { text: { zh: e.id } }).text.zh)}</span>`);

  /* ---------- 多语言 ---------- */
  UI.missing = (obj) => D.LANGS.filter((l) => !String((obj || {})[l.id] || '').trim()).map((l) => l.id);
  UI.i18n = (obj, o = {}) => {
    const miss = UI.missing(obj);
    return `${esc((obj || {}).zh || '')}${miss.length ? ` <span class="tag t-red tag-xs" title="缺少：${miss.join('、')}">缺 ${miss.length} 种语言</span>` : o.ok ? ' <span class="tag t-green tag-xs">5 种语言</span>' : ''}`;
  };

  /* ---------- 表格与分页 ---------- */
  UI.table = (cols, rows, o = {}) => {
    if (!rows.length) return UI.empty(o.empty || '没有符合条件的记录');
    const th = cols.map((c) => `<th style="${c.w ? `width:${c.w}` : ''}" class="${c.align ? 'a-' + c.align : ''}">${c.title}</th>`).join('');
    const tr = rows.map((r, i) => `<tr ${o.rowAttr ? o.rowAttr(r, i) : ''}>${cols.map((c) => `<td class="${c.align ? 'a-' + c.align : ''} ${c.cls || ''}">${c.render ? c.render(r, i) : esc(r[c.key])}</td>`).join('')}</tr>`).join('');
    return `<div class="tbl-wrap"><table class="tbl ${o.cls || ''}"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`;
  };
  UI.page = (rows, page, size = 20) => rows.slice((page - 1) * size, page * size);
  UI.pager = (total, page, size = 20, act = 'page') => {
    const pages = Math.max(1, Math.ceil(total / size));
    if (pages <= 1) return `<div class="pager"><span>共 ${total} 条</span></div>`;
    const btn = (p, label, dis) => `<button class="btn btn-sm ${p === page ? 'is-on' : ''}" ${dis ? 'disabled' : ''} data-act="${act}" data-p="${p}">${label}</button>`;
    const list = [];
    for (let p = 1; p <= pages; p += 1) if (p === 1 || p === pages || Math.abs(p - page) <= 2) list.push(p); else if (list[list.length - 1] !== '…') list.push('…');
    return `<div class="pager"><span>共 ${total} 条</span>${btn(page - 1, '上一页', page === 1)}${list.map((p) => (p === '…' ? '<i>…</i>' : btn(p, p))).join('')}${btn(page + 1, '下一页', page === pages)}</div>`;
  };
  UI.tabs = (list, active, act = 'tab') => `<div class="tabs">${list.map(([id, label, n]) => `<button class="tab ${id === active ? 'is-on' : ''}" data-act="${act}" data-v="${esc(id)}">${esc(label)}${n != null && n !== '' ? `<em>${n}</em>` : ''}</button>`).join('')}</div>`;
  UI.seg = (list, active, act) => `<div class="seg">${list.map(([id, label]) => `<button class="seg-it ${id === active ? 'is-on' : ''}" data-act="${act}" data-v="${esc(id)}">${esc(label)}</button>`).join('')}</div>`;
  UI.opts = (list, val) => list.map((x) => { const [v, l] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`; }).join('');

  /* ---------- 浮层：弹窗、抽屉、确认、轻提示 ---------- */
  const layer = () => document.getElementById('layer');
  const stack = (UI.stack = []);
  function overlay(kind, o) {
    const el = document.createElement('div');
    el.className = `ov ov-${kind}`;
    el.innerHTML = `<div class="ov-mask" data-close></div><div class="ov-box" style="${o.width ? `--w:${o.width}` : ''}">
      <header class="ov-hd"><h3>${o.title || ''}</h3>${o.sub ? `<small>${o.sub}</small>` : ''}<button class="icon-btn ov-x" data-close aria-label="关闭">×</button></header>
      <div class="ov-bd"></div>${o.foot ? `<footer class="ov-ft">${o.foot}</footer>` : ''}</div>`;
    layer().appendChild(el);
    const c = { el, act: o.act || {}, onInput: o.onInput, close: () => { el.remove(); const i = stack.indexOf(c); if (i >= 0) stack.splice(i, 1); if (o.onClose) o.onClose(); }, $: (q) => el.querySelector(q), $$: (q) => [...el.querySelectorAll(q)] };
    c.set = (html) => { el.querySelector('.ov-bd').innerHTML = html; };
    c.foot = (html) => { const f = el.querySelector('.ov-ft'); if (f) f.innerHTML = html; };
    c.set(o.body || '');
    stack.push(c);
    requestAnimationFrame(() => el.classList.add('is-in'));
    return c;
  }
  UI.modal = (o) => overlay('modal', o);
  UI.drawer = (o) => overlay('drawer', { width: '640px', ...o });
  UI.closeAll = () => [...stack].forEach((c) => c.close());
  UI.confirm = (o) => new Promise((resolve) => {
    let done = false;
    const c = UI.modal({
      title: o.title, width: o.width || '440px', body: `<div class="confirm-bd">${o.html || `<p>${esc(o.text || '')}</p>`}</div>`,
      foot: `<button class="btn" data-act="no">取消</button><button class="btn ${o.danger ? 'btn-danger' : 'btn-primary'}" data-act="yes">${esc(o.ok || '确定')}</button>`,
      act: { yes: () => { done = true; const v = o.collect ? o.collect(c) : true; if (v === false) { done = false; return; } c.close(); resolve(v); }, no: () => c.close() },
      onClose: () => { if (!done) resolve(false); },
    });
  });
  UI.toast = (msg, tone = 'ok') => {
    const el = document.createElement('div');
    el.className = `toast to-${tone}`;
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-in'));
    setTimeout(() => { el.classList.remove('is-in'); setTimeout(() => el.remove(), 300); }, 2600);
  };
  UI.copy = (text) => { (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => UI.toast('已复制')).catch(() => UI.toast('复制失败，请手动选择', 'warn')); };
  UI.download = (name, rows) => {
    const csv = rows.map((r) => r.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' }));
    a.download = name;
    a.click();
  };

  /* ---------- 差异表 ---------- */
  UI.val = (v) => {
    if (v === true) return '是';
    if (v === false) return '否';
    if (v == null || v === '') return '<span class="muted">（空）</span>';
    if (Array.isArray(v)) return esc(v.join(' – '));
    if (typeof v === 'object') return esc(JSON.stringify(v));
    return esc(typeof v === 'number' ? UI.n(v) : v);
  };
  UI.diff = (rows, o = {}) => {
    if (!rows.length) return UI.empty(o.empty || '和线上版本没有差别');
    return `<div class="tbl-wrap"><table class="tbl diff"><thead><tr><th style="width:42%">改了什么</th><th>${o.a || '线上'}</th><th>${o.b || '新'}</th></tr></thead><tbody>${rows.map((d) => `<tr class="d-${d.kind}"><td>${esc(d.label)}</td><td class="d-old">${d.kind === 'add' ? '<span class="muted">（新增）</span>' : UI.val(d.before)}</td><td class="d-new">${d.kind === 'del' ? '<span class="muted">（删除）</span>' : UI.val(d.after)}</td></tr>`).join('')}</tbody></table></div>`;
  };

  /* ---------- 小图标（线条，24 栅格） ---------- */
  const P = {
    home: 'M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    users: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M22 19v-1a4 4 0 0 0-3-3.87M16 3.13a3.5 3.5 0 0 1 0 6.75',
    shield: 'M12 3 4 6v6c0 4.5 3.4 8.4 8 9 4.6-.6 8-4.5 8-9V6z M9 12l2 2 4-4',
    game: 'M6 12h4M8 10v4M15 11h.01M18 13h.01M7 6h10a5 5 0 0 1 5 5v2a4 4 0 0 1-7 2.6l-.5-.6h-5l-.5.6A4 4 0 0 1 2 13v-2a5 5 0 0 1 5-5z',
    gift: 'M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H8a2.5 2.5 0 1 1 0-5c3 0 4 5 4 5zm0 0h4a2.5 2.5 0 1 0 0-5c-3 0-4 5-4 5z',
    bag: 'M6 7h12l1 14H5zM9 7a3 3 0 0 1 6 0',
    wallet: 'M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2zM16 14h.01',
    bell: 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0',
    layout: 'M3 3h18v18H3zM3 9h18M9 21V9',
    settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    chart: 'M3 3v18h18M7 15l4-4 3 3 5-6',
    lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
    search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3',
    doc: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M9 13h6M9 17h6',
    refresh: 'M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5',
    up: 'M12 19V5M5 12l7-7 7 7',
    down: 'M12 5v14M19 12l-7 7-7-7',
    trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14',
    plus: 'M12 5v14M5 12h14',
    copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
    eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    history: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2',
    link: 'M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
  };
  UI.ic = (name, size = 16) => `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[name] || ''}"/></svg>`;
})();
