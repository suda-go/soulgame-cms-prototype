/**
 * 工作台 #/home，以及 P1 页面的占位（写清楚要做什么、为什么放 P1、依赖谁）
 */
(() => {
  'use strict';
  const esc = UI.esc;

  App.page('home', {
    render(el) {
      const me = Store.me();
      const s = Store.s;
      const drafts = Object.keys(s.cfg).filter((ns) => Store.draft(ns));
      const today = new Date().toISOString().slice(0, 10);
      const limited = Store.pub('tasks').rows.filter((t) => t.group === 'limited' && t.enabled && t.start <= today && t.end >= today);
      const bot = Store.pub('bot');
      const e = Store.econ();
      el.innerHTML = `<div class="page-hd"><div><h1>你好，${esc(me.person)}</h1><p>当前演示角色：<b>${esc(me.name)}</b>${me.note ? '（' + esc(me.note) + '）' : ''}。右上角可以切换角色，看不同的人能做什么。</p></div></div>
        <div class="stats">
          ${UI.stat('待我审批', Store.badge.approvals(), { go: 'approvals', tone: Store.badge.approvals() ? 'warn' : '' })}
          ${UI.stat('待处理举报', Store.badge.reports() + ' 人', { go: 'reports', tone: Store.badge.reports() ? 'warn' : '' })}
          ${UI.stat('待复审签名', Store.badge.bio(), { go: 'bio' })}
          ${UI.stat('对账告警', Store.badge.recon(), { go: 'recon', tone: Store.badge.recon() ? 'danger' : '' })}
          ${UI.stat('待补单 / 退款', Store.badge.refunds(), { go: 'refunds', tone: Store.badge.refunds() ? 'warn' : '' })}
          ${UI.stat('注销超过 24 小时没完成', Store.badge.deletions(), { go: 'deletions', tone: Store.badge.deletions() ? 'danger' : '' })}
          ${UI.stat('有草稿的配置', drafts.length, { go: 'releases', sub: drafts.map((n) => Schemas.def(n).title).join('、') })}
        </div>
        <div class="grid g-2-1"><div>
          ${UI.card('线上配置一览', `${UI.table([
            { title: '场次', render: (r) => `<a href="#/cfg/stakes">${esc(r.name.zh)}</a>` }, { title: '底注', align: 'r', render: (r) => UI.n(r.bet) }, { title: '奖池', align: 'r', render: (r) => UI.n(r.bet * r.pot_multiplier) }, { title: '状态', render: (r) => (r.enabled ? UI.tag('上线', 'green') : UI.tag('下线', 'gray')) },
          ], Store.pub('stakes').rows, { cls: 'tbl-mini' })}
          ${UI.kv([
            ['新手礼包', `<a href="#/cfg/newbie">${UI.n(Store.pub('newbie').coins)} 金币</a>`], ['签到第 7 天', `<a href="#/cfg/signin">${UI.n(Store.pub('signin').days[6].coins)} 金币 + ${esc(Store.itemName(Store.pub('signin').days[6].frame))}</a>`],
            ['进行中的限时任务', limited.length ? limited.map((t) => `<a href="#/cfg/tasks">${esc(t.name.zh)}</a>（到 ${t.end}）`).join('<br>') : '没有'],
            ['机器人', `<a href="#/cfg/bot">${bot.mode === 'fill' ? `补位方案 · 等 ${bot.fill[0].after_s} 秒` : '主动选择方案'}</a> ${UI.tag('方案待定 Q3', 'orange')}`],
            ['满勤每天平均免费金币', `<a href="#/economy">非会员 ${UI.n(Math.round(e[0].avg))} · 会员 ${UI.n(Math.round(e[1].avg))} · 超级会员 ${UI.n(Math.round(e[2].avg))}</a>`],
            ['协议版本', `<a href="#/cfg/legal">${esc(Store.pub('legal').version)}</a>`],
          ], { cols: 2 })}`)}
          ${UI.card('最近的后台操作', UserParts.audit(s.audit.slice(0, 8)), { extra: '<a href="#/audit" class="sm">全部</a>' })}
        </div><div>
          ${UI.card('这个原型', `<p class="sm">按《Soulgame V7 CMS 运营后台规划》做的可点击原型，覆盖规划里的 P0 和部分 P1。数据是演示数据，只存在这台电脑的浏览器里。</p>
            <ul class="plain sm"><li><a href="${D.PLAN_URL}" target="_blank" rel="noopener">规划文档（飞书）</a></li><li><a href="${D.APP_URL}" target="_blank" rel="noopener">V7 app 原型</a></li></ul>
            <h4 class="sec">可以先试</h4><ol class="plain sm steps-list">
              <li>切到<b>运营</b>，在 <a href="#/cfg/signin">7日签到</a> 把第 7 天改成 800 → 提交发布，看“每天理论上限”的变化</li>
              <li>切到<b>产品</b>，在 <a href="#/approvals">审批中心</a> 审“限时任务：分享5次”</li>
              <li>切到<b>审核</b>，处理 <a href="#/reports">举报</a>：维克多（挂机）、LoserTrash99（辱骂）</li>
              <li>切到<b>客服</b>，查用户 <a href="#/user/u100803">阿凯</a> 付了钱没到账，发起补单；再切<b>财务</b>到 <a href="#/refunds">补单和退款</a> 处理，顺便看马可的退款扣回</li>
              <li>在 <a href="#/cfg/items">装扮</a> 新建一个头像框，拖滑块看戴在头像上的效果</li>
            </ol>`)}
          ${UI.card('还要确认的问题', `<ul class="plain sm"><li><b>Q1</b> 后台和 V7 一起上线还是上线后补</li><li><b>Q2</b> 运营位：V7 客户端没有位置</li><li><b>Q3</b> 机器人补位：原型和匹配文档不一致</li><li><b>Q4</b> 充值金币包在不在 V7</li><li><b>Q5</b> 支付渠道</li><li><b>Q6</b> 禁言、冻结金币客户端怎么表现</li><li><b>Q7</b> 改金币数值谁审批</li></ul><a class="sm" href="${D.PLAN_URL}" target="_blank" rel="noopener">详见规划第一章</a>`)}
        </div></div>`;
    },
  });

  /* ================= P1 占位 ================= */
  const P1 = {
    'nick-review': ['昵称头像巡查', '内容安全与风控', '账号创建、绑定三方时，Google / Facebook 带进来的昵称和头像送机审，命中的进人工队列，处理是重置成默认。', ['机审结果队列：用户、三方昵称、三方头像、命中原因', '处理：通过 / 重置昵称 / 重置头像（来源记“后台重置”，三方登录不再覆盖）', '和举报处理共用处罚记录'], '要接内容安全服务（图片机审）'],
    'chat-review': ['聊天巡查', '内容安全与风控', '私聊、群聊、好友房聊天、群名里命中敏感词的消息进队列，只显示命中的消息和前后几条。', ['命中队列：会话类型、发送人、命中的词、前后 3 条', '处理：不处理 / 撤回消息 / 处罚发送人（禁言要客户端先支持，规划 Q6）', '按敏感词库的“送审”词触发'], '消息与社交文档还没写；聊天内容存多久要按隐私政策定'],
    risk: ['风控告警', '内容安全与风控', '风控服务命中规则的账号进人工审核（匹配 6.10、首页 6.4、签到与任务 6.7）。', ['同 IP / 同支付账户的账号之间的对局；同一对账号短时间大量对局；开局就认输或超时', '好友房里同一对账号之间的大额金币流动', '单账号一天福利金币超过理论上限（见数值总览）', '多次退款', '处理：解除标记 / 冻结金币（规划 Q6）/ 封号'], '要先有风控服务；上线后有了数据才好定阈值'],
    'task-calendar': ['限时任务日历', '福利与任务', '把限时任务按活动期画在日历上，看哪几天有几个活动、会不会叠在一起。数据就是任务配置里的限时任务。', ['月视图，每个限时任务一条横条（按用户本地日期）', '点横条打开任务编辑', '同时进行的活动太多时提示'], '任务配置已经能排期，日历只是换一种看法'],
    broadcast: ['系统消息群发', '消息与触达', '按人群给 Soulgame 官方会话发消息，用户不能回复。', ['人群：平台、语言、注册时间、会员档位、最近活跃、指定名单', '定时发送、发前预览', '要审批（运营组长）'], '模板先在“系统消息模板”里配'],
    'ops-push': ['运营推送', '消息与触达', '推广活动类的推送。', ['App Store 审核指南 4.5.4：推广类推送要先在 app 里让用户明确同意，并能在 app 里关掉', 'V7 设置里只有“游戏邀请”“好友申请”两个开关，要先加一个（例如“活动和福利提醒”）', '按用户本地时间发送、每人每天上限'], '客户端加开关并发版之后才能发'],
    mail: ['邮件模板', '消息与触达', '注册、找回密码、绑定、注销四种验证码邮件，5 种语言（账号 5.6）。', ['标题、正文、发信人', '变量：{验证码}、{有效分钟}', '发信域名的 SPF、DKIM、DMARC 由研发配'], '首发可以先由邮件服务配，后台 P1 接管'],
    slots: ['运营位', '运营位', 'V7 客户端没有运营位（首页 1.3：本期不包含 Banner、活动入口），后台做了也投不出去，所以放 P1 和客户端一起做（规划 Q2）。', ['先注册位置，再往位置里投内容。首批建议：首页“快速开始”下方 Banner、首页活动弹窗、任务中心顶部活动条、商城装扮页顶部', '首页活动弹窗排进首页弹出顺序：领奖弹窗、引导气泡之后，来电和邀请通知之前；新账号第一次进首页不出', '内容：按语言分图、标题、跳转（跳转目标或网页）', '投放条件：平台、版本、语言、新老用户、游客 / 正式、会员档位、名单；时间、优先级、频控', '曝光和点击来自客户端埋点'], 'V7 上线后能直接运营的：限时任务、装扮上下架、各项数值、欢迎消息和分享文案、在线人数'],
    dashboard: ['数据看板', '数据看板', '各文档第七章的埋点进数据平台，深入分析在那里做。后台只放日常运营和客服要看、来自服务端数据的几块。', ['用户：新增（按登录方式）、游客绑定率、日活、注销数', '对局：各场次对局数、平均匹配等待、机器人补位率、对局异常退还数', '金币：每天按类型的产出和消耗、系统账户净流出、余额分布', '付费：充值和订阅收入、首充转化、退款率', '内容安全：举报量、平均处理时长、签名驳回率'], '上线后有数据再做；金币按类型的汇总已经先放在“对账告警”里'],
  };
  function renderPh(el, id) {
    const p = P1[id];
    if (!p) { el.innerHTML = UI.notice('没有这个页面：' + esc(id), 'danger'); return; }
    el.innerHTML = `<div class="page-hd"><div><h1>${esc(p[0])} ${UI.p1()}</h1><p>${esc(p[2])}</p></div></div>
      <div class="grid g-2-1"><div>${UI.card('要做的', `<ul class="plain">${p[3].map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`)}</div>
      <div>${UI.card('为什么放 P1', `<p class="sm">${esc(p[4])}</p><p class="sm"><a href="${D.PLAN_URL}" target="_blank" rel="noopener">规划文档</a></p>`)}</div></div>
      <div class="placeholder-box">规划中 · 这一版原型没有做这个页面</div>`;
  }
  App.page('placeholder', { render: (el, id) => renderPh(el, id) });
  Object.keys(P1).forEach((id) => App.page(id, { render: (el) => renderPh(el, id) }));
})();
