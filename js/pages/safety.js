/**
 * 内容安全：举报处理 #/reports、签名复审 #/bio、敏感词库 #/words、处罚记录 #/penalties（规划 4.2）
 */
(() => {
  'use strict';
  const esc = UI.esc;
  const st = { rs: 'open', src: '', bs: 'pending', wl: '', wc: '' };
  const SRC = { game: '对局中资料卡', profile: '玩家主页', dm: '私聊' };
  const key = (t) => JSON.stringify(t);
  const ACTION = { none: '不处罚', clear_bio: '清空签名', reset_profile: '重置昵称头像', ban: '封号', auto_close: '自动关闭（机器人）' };

  /* ================= 举报处理 ================= */
  function groups() {
    const map = new Map();
    Store.s.reports.forEach((r) => {
      if (st.src && r.source !== st.src) return;
      const open = r.status !== 'done';
      if (st.rs === 'open' && !open) return;
      if (st.rs === 'done' && open) return;
      const k = key(r.target);
      if (!map.has(k)) map.set(k, { target: r.target, list: [] });
      map.get(k).list.push(r);
    });
    return [...map.values()].map((g) => ({ ...g, last: Math.max(...g.list.map((r) => r.at)), n: g.list.length, reporters: new Set(g.list.map((r) => r.reporter)).size }))
      .sort((a, b) => b.reporters - a.reporters || b.last - a.last);
  }
  App.page('reports', {
    render(el, arg) {
      const all = Store.s.reports;
      const gs = groups();
      el.innerHTML = `<div class="page-hd"><div><h1>举报处理</h1><p>同一个被举报人的多条举报合在一起，按举报人数和时间排。App Store 审核指南 1.2 要求举报后及时处理。</p></div>
        <div class="page-hd-r">${Store.can('mod.handle') ? UI.tag('你可以处理', 'green') : UI.tag('你只能查看', 'gray')}</div></div>
        <div class="card"><div class="card-bd">
          <div class="toolbar">${UI.tabs([['open', '待处理和处理中', new Set(all.filter((r) => r.status !== 'done').map((r) => key(r.target))).size], ['done', '已处理'], ['all', '全部']], st.rs, 'rs')}<span class="grow"></span>
            <select class="inp" data-src>${UI.opts([['', '全部来源'], ...Object.entries(SRC)], st.src)}</select></div>
          ${UI.table([
            { title: '被举报人', render: (g) => UI.user(g.target.bot ? g.target : g.target) },
            { title: '举报', render: (g) => `<b>${g.n}</b> 条 · ${g.reporters} 个人` },
            { title: '原因', render: (g) => [...new Set(g.list.map((r) => r.reason))].map((x) => UI.tag(x, x === '辱骂和骚扰' ? 'red' : x === '作弊或挂机' ? 'orange' : 'gray')).join(' ') },
            { title: '来源', render: (g) => [...new Set(g.list.map((r) => SRC[r.source]))].join('、') },
            { title: '最近', render: (g) => UI.ago(g.last) },
            { title: '状态', render: (g) => (g.list.some((r) => r.status === 'pending') ? UI.tag('待处理', 'red') : g.list.some((r) => r.status === 'processing') ? UI.tag('处理中 · ' + Store.who(g.list.find((r) => r.claimedBy) ? g.list.find((r) => r.claimedBy).claimedBy : ''), 'orange') : UI.tag(ACTION[g.list[0].result.action], 'gray')) },
            { title: '', align: 'r', render: (g) => `<button class="btn btn-sm ${g.list.some((r) => r.status !== 'done') ? 'btn-primary' : ''}" data-act="open" data-k="${esc(key(g.target))}">${g.list.some((r) => r.status !== 'done') && Store.can('mod.handle') ? '处理' : '查看'}</button>` },
          ], gs, { empty: '没有举报' })}
        </div></div>`;
      if (arg && arg !== 'reports') {
        const r = all.find((x) => x.id === arg);
        if (r) setTimeout(() => openGroup(key(r.target)), 0);
      }
    },
    input(t) { if (t.matches('[data-src]')) { st.src = t.value; App.refresh(); } },
    act: { rs: (b) => { st.rs = b.dataset.v; App.refresh(); }, open: (b) => openGroup(b.dataset.k) },
  });

  function openGroup(k) {
    const list = Store.s.reports.filter((r) => key(r.target) === k).sort((a, b) => b.at - a.at);
    const target = list[0].target;
    const open = list.filter((r) => r.status !== 'done');
    if (open.length && Store.can('mod.handle')) Store.claimReports(open.map((r) => r.id));
    const u = target.bot ? null : Store.user(target);
    const week = Store.s.reports.filter((r) => key(r.target) === k && r.reason === '不良语音' && Date.now() - r.at < 7 * 864e5);
    const summary = target.bot
      ? UI.notice('被举报的是补位机器人（规划 Q3 补位方案）：自动关闭，不进人工。', 'info')
      : `<div class="rp-user">${UI.user(target)}<div>${UI.kv([['签名', u.bio ? esc(u.bio) : '<span class="muted">（空）</span>'], ['昵称来源', { default: '默认', third: '三方带入', admin: '后台重置', custom: '自己改的' }[u.nickSource]], ['历史处罚', `${Store.s.penalties.filter((p) => p.uid === u.uid).length} 次`], ['风控', u.risk ? UI.tag(u.risk.rule, 'red') : '—']], { cols: 2 })}</div></div>`;
    const ev = (r) => {
      if (r.source === 'game') {
        const m = Store.s.matches.find((x) => x.gameId === r.gameId);
        if (!m) return UI.empty('对局记录已经不在了');
        const who = (from) => (from === 'me' ? '被举报人' : '举报人');
        return `<div class="ev">${UI.kv([['对局', `<a href="#" data-act="game" data-id="${m.gameId}"><code>${m.gameId}</code></a> · ${m.mode === 'room' ? '好友房' : Store.stakeName(m.stake)}`], ['结束', `${{ normal: '正常', forfeit: '认输', timeout: '连续超时', disconnect: '掉线' }[m.endReason]} · ${m.moves} 步 · ${UI.dur(m.dur)}`], ['断线', m.disconnects + ' 次']], { cols: 3 })}
          ${r.reason === '不良语音' ? UI.notice(`局内语音不录音（对局 6.7 建议），没有录音可听。只能看被举报次数：7 天内 ${new Set(week.map((x) => x.reporter)).size} 个不同的人举报过“不良语音”（规划 4.2：要么定一个次数门槛，要么录音并写进隐私政策）。`, 'warn') : ''}
          ${m.emotes.length ? `<div class="elog">${m.emotes.map((e) => `<div class="elog-it ${e.from === 'me' ? 'is-me' : ''}"><small>${UI.time(e.t)} · ${who(e.from)}</small>${UI.emote(e)}</div>`).join('')}</div>` : '<p class="muted sm">这一局没有表情和快捷语</p>'}</div>`;
      }
      if (r.excerpt) return `<div class="ev"><p class="muted sm">只显示和举报相关的几条私聊（规划三、7）</p><div class="chat">${r.excerpt.map((x) => `<div class="msg ${x.from === 'target' ? '' : 'is-me'}"><small>${x.from === 'target' ? '被举报人' : '举报人'} · ${UI.time(x.t)}</small><p>${esc(x.text)}</p></div>`).join('')}</div></div>`;
      return `<div class="ev"><p class="muted sm">从玩家主页举报：证据是被举报人当前的昵称、头像和签名（消息与社交文档还没定举报原因和证据，规划 4.2）</p></div>`;
    };
    const item = (r) => `<div class="rp-it"><div class="rp-it-hd">${UI.tag(r.reason, 'orange')} <b>${esc(SRC[r.source])}</b> · 举报人 ${UI.user(r.reporter, { size: 20 })} · ${UI.datetime(r.at)} <code>${r.id}</code>${r.status === 'done' ? ' ' + UI.tag('已处理：' + ACTION[r.result.action], 'gray') : ''}</div>
      ${r.note ? `<p class="rp-note">“${esc(r.note)}”</p>` : ''}${ev(r)}${r.result ? `<p class="muted sm">处理：${esc(ACTION[r.result.action])}${r.result.duration ? ' ' + D.BAN_DURATIONS.find((d) => d.id === r.result.duration).name : ''} · ${esc(Store.who(r.result.by))} · ${UI.time(r.result.at)}${r.result.note ? ' · ' + esc(r.result.note) : ''}</p>` : ''}</div>`;
    const canDo = open.length && Store.can('mod.handle') && !target.bot;
    const c = UI.drawer({
      title: target.bot ? '举报 · 补位机器人' : `举报 · ${esc(u.nickname)}`, sub: `${list.length} 条举报，${open.length} 条待处理`, width: '720px',
      body: `${summary}<h4 class="sec">举报和证据</h4>${list.map(item).join('')}
        ${canDo ? `<h4 class="sec">处理（对 ${open.length} 条待处理的举报一起生效）</h4><div class="form"><div class="radios">${[['none', '不处罚'], ['clear_bio', '清空签名'], ['reset_profile', '重置昵称头像'], ['ban', '封号']].map(([k, n], i) => `<label class="rd ${i ? '' : 'is-on'}"><input type="radio" name="act" value="${k}" ${i ? '' : 'checked'} ${k === 'clear_bio' && !u.bio ? 'disabled' : ''}><span>${n}</span></label>`).join('')}</div>
          <div class="fgrid c2 is-hidden" data-ban><div class="f"><label class="f-l">封号时长</label><select class="inp" name="dur">${UI.opts(D.BAN_DURATIONS.map((d) => [d.id, d.name]), '7d')}</select></div><div class="f"><label class="f-l">原因</label><select class="inp" name="reason">${UI.opts(D.BAN_REASONS)}</select></div></div>
          <div class="f f-wide"><label class="f-l">处理说明</label><textarea class="inp" rows="2" name="note" placeholder="内部备注"></textarea></div>
          <p class="f-h">禁言等以后再加（规划 Q6）；处理结果通知举报人在 P1（模板“举报处理结果”待确认）。</p></div>` : ''}`,
      foot: canDo ? '<button class="btn" data-close>关闭</button><button class="btn btn-primary" data-act="go">提交处理</button>' : '<button class="btn" data-close>关闭</button>',
      onInput: (t) => { if (t.name === 'act') { c.$$('.radios .rd').forEach((x) => x.classList.toggle('is-on', x.contains(t))); c.$('[data-ban]').classList.toggle('is-hidden', t.value !== 'ban'); } },
      act: {
        game: (b) => UserParts.gameModal(b.dataset.id),
        go: () => {
          const action = c.$('[name="act"]:checked').value;
          const res = Store.handleReports(open.map((r) => r.id), action, { duration: c.$('[name="dur"]').value, reason: c.$('[name="reason"]').value, note: c.$('[name="note"]').value.trim() });
          c.close(); App.refresh();
          UI.toast(res.approval ? `永久封号已提交审批 ${res.approval}` : '已处理');
        },
      },
      onClose: () => App.refresh(),
    });
  }

  /* ================= 签名复审 ================= */
  const hl = (text, hits) => hits.reduce((s, h) => s.split(esc(h.w)).join(`<mark>${esc(h.w)}</mark>`), esc(text));
  App.page('bio', {
    render(el) {
      const rows = Store.s.bio.filter((b) => (st.bs === 'pending' ? b.status === 'pending' : b.status !== 'pending')).sort((a, b) => Number(b.reported) - Number(a.reported) || b.at - a.at);
      el.innerHTML = `<div class="page-hd"><div><h1>签名复审</h1><p>保存签名时同步检查敏感词、联系方式和网址，通过就马上生效，同时送到这里复审（我的 6.4）。不通过：清空签名，给用户发系统消息。被举报的排在前面。</p></div></div>
        <div class="card"><div class="card-bd"><div class="toolbar">${UI.tabs([['pending', '待复审', Store.s.bio.filter((b) => b.status === 'pending').length], ['done', '已复审']], st.bs, 'bs')}</div>
        ${UI.table([
          { title: '用户', render: (b) => UI.user(b.uid) },
          { title: '签名', render: (b) => `<span class="bio">${hl(b.text, b.hits)}</span>` },
          { title: '机审', render: (b) => (b.hits.length ? b.hits.map((h) => UI.tag(h.cat, 'red', { title: h.w })).join(' ') : UI.tag('没命中', 'green')) },
          { title: '', render: (b) => (b.reported ? UI.tag('被举报', 'orange') : '') },
          { title: '提交', render: (b) => UI.ago(b.at) },
          { title: '', align: 'r', render: (b) => (b.status === 'pending' ? (Store.can('mod.handle') ? `<button class="btn btn-sm" data-act="pass" data-id="${b.id}">通过</button> <button class="btn btn-sm btn-danger" data-act="reject" data-id="${b.id}">不通过</button>` : '<span class="muted sm">审核处理</span>') : `${b.status === 'passed' ? UI.tag('通过', 'green') : UI.tag('不通过 · 已清空', 'red')} <small class="muted">${esc(Store.who(b.by))}</small>`) },
        ], rows, { empty: st.bs === 'pending' ? '都复审完了' : '还没有复审记录' })}</div></div>`;
    },
    act: {
      bs: (b) => { st.bs = b.dataset.v; App.refresh(); },
      pass: (b) => { Store.reviewBio(b.dataset.id, true); App.refresh(); UI.toast('已通过'); },
      reject: async (b) => { if (await UI.confirm({ title: '不通过？', text: '会清空这个签名，并给用户发系统消息“你的个性签名不符合社区规范，已被清除”。', ok: '不通过', danger: true })) { Store.reviewBio(b.dataset.id, false); App.refresh(); UI.toast('已清空签名'); } },
    },
  });

  /* ================= 敏感词库 ================= */
  const RULES = [['手机号', '+?\\d[\\d\\s-]{7,}'], ['网址', 'http(s)://、www.、.com、.shop 等'], ['其他社交账号', 'ig @、t.me/、line id、wechat、V信、vx 等']];
  App.page('words', {
    render(el) {
      const rows = Store.s.words.filter((w) => (!st.wl || w.lang === st.wl) && (!st.wc || w.cat === st.wc));
      const can = Store.can('mod.handle');
      el.innerHTML = `<div class="page-hd"><div><h1>敏感词库</h1><p>按语言分，用在签名、聊天、群名、三方昵称。命中“拦截”的不让保存，命中“送审”的进人工复审。改了马上生效，不走版本发布，但会记操作日志。</p></div></div>
        <div class="grid g-2-1"><div class="card"><div class="card-bd">
          <div class="toolbar">${UI.seg([['', '全部'], ...D.LANGS.map((l) => [l.id, l.short])], st.wl, 'wl')}<select class="inp" data-wc>${UI.opts([['', '全部分类'], ...D.WORD_CATS], st.wc)}</select><span class="grow"></span><span class="muted sm">${rows.length} 个</span></div>
          ${can ? `<form class="toolbar" data-form="word"><input class="inp" name="w" placeholder="新词" style="width:160px"><select class="inp" name="lang">${UI.opts(D.LANGS.map((l) => [l.id, l.name]), st.wl || 'zh')}</select><select class="inp" name="cat">${UI.opts(D.WORD_CATS)}</select><select class="inp" name="act">${UI.opts([['block', '拦截'], ['review', '送审']])}</select><button class="btn btn-primary btn-sm">添加</button></form>` : ''}
          ${UI.table([
            { title: '词', render: (w) => `<b>${esc(w.w)}</b>` }, { title: '语言', render: (w) => D.LANGS.find((l) => l.id === w.lang).name }, { title: '分类', render: (w) => esc(w.cat) },
            { title: '处理', render: (w) => (w.act === 'block' ? UI.tag('拦截', 'red') : UI.tag('送审', 'orange')) }, { title: '添加', render: (w) => `${esc(Store.who(w.by))} · ${UI.time(w.at)}` },
            { title: '', align: 'r', render: (w) => (can ? `<button class="icon-btn is-danger" data-act="rmw" data-id="${w.id}">${UI.ic('trash', 14)}</button>` : '') },
          ], rows)}</div></div>
          <div>${UI.card('检测一段文字', `<textarea class="inp" rows="3" data-test placeholder="粘贴一段签名或聊天试试，例如：加我V信领低价金币 www.xx.shop"></textarea><div data-test-r class="mt"></div>`)}
            ${UI.card('内置规则（研发维护）', UI.table([{ title: '规则', render: (r) => r[0] }, { title: '匹配', render: (r) => `<code class="sm">${esc(r[1])}</code>` }], RULES, { cls: 'tbl-mini' }))}</div></div>`;
    },
    input(t) {
      if (t.matches('[data-wc]')) { st.wc = t.value; App.refresh(); return; }
      if (t.matches('[data-test]')) {
        const v = t.value.toLowerCase();
        const hits = Store.s.words.filter((w) => v.includes(w.w.toLowerCase()));
        const rule = [/\+?\d[\d\s-]{7,}/.test(v) && '手机号', /(https?:\/\/|www\.|\.com|\.shop)/.test(v) && '网址', /(ig @|t\.me\/|line id|wechat|v信|vx)/.test(v) && '其他社交账号'].filter(Boolean);
        const block = hits.some((h) => h.act === 'block');
        document.querySelector('[data-test-r]').innerHTML = !v ? '' : hits.length || rule.length
          ? `${hits.map((h) => UI.tag(`${h.w} · ${h.act === 'block' ? '拦截' : '送审'}`, h.act === 'block' ? 'red' : 'orange')).join(' ')} ${rule.map((r) => UI.tag(r, 'red')).join(' ')}<p class="f-h">${block || rule.length ? '结果：不让保存，提示“签名包含不适合展示的内容，请修改”' : '结果：可以保存，送人工复审'}</p>`
          : UI.tag('没命中', 'green');
      }
    },
    submit(f) {
      const w = f.w.value.trim();
      if (!w) return;
      if (Store.s.words.some((x) => x.w === w && x.lang === f.lang.value)) { UI.toast('已经有了', 'warn'); return; }
      Store.addWord({ w, lang: f.lang.value, cat: f.cat.value, act: f.act.value });
      App.refresh(); UI.toast('已添加，马上生效');
    },
    act: { wl: (b) => { st.wl = b.dataset.v; App.refresh(); }, rmw: (b) => { Store.removeWord(b.dataset.id); App.refresh(); UI.toast('已删除'); } },
  });

  /* ================= 处罚记录 ================= */
  App.page('penalties', {
    render(el) {
      el.innerHTML = `<div class="page-hd"><div><h1>处罚记录</h1><p>每次处罚的对象、类型、时长、原因、来源和处理人。可以撤销（例如提前解封），撤销也留记录。清空的签名、重置的昵称撤销后不会自动恢复。</p></div></div>
        ${UI.card('', UserParts.penalties(Store.s.penalties.slice().sort((a, b) => b.at - a.at), true))}`;
    },
    act: { revoke: async (b) => { const n = await UI.confirm({ title: '撤销这次处罚？', html: '<textarea class="inp" rows="2" id="cf-note" placeholder="原因"></textarea>', collect: (c) => c.$('#cf-note').value.trim() || '撤销', ok: '撤销' }); if (n) { Store.revokePenalty(b.dataset.id, n); App.refresh(); UI.toast('已撤销'); } } },
  });
})();
