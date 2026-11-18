/**
 * 配置的结构定义（规划 4.11：每类配置一份 schema，后台按它生成表单、校验和差异）
 *
 * 字段类型 t：num 数字 / text / area / bool 开关 / sel 下拉 / radio / range 区间 / i18n 5 种语言 / img 图片
 *            item 选装扮 / stake 选场次 / jump 选跳转 / reward 奖励（金币 + 装扮）/ date / calc 只读的计算结果
 *            list 列表（cols 是每行的字段，key 是行的唯一键）/ group 分组
 * 配置属性：perm 谁能改（cfg.ops / cfg.dev / cfg.sys）、risk 审批级别（normal 直接生效 / economy 产品审批 / bot 产品 + 研发负责人）
 *          econ 改了要算“每天理论上限”、effects(新, 线上) 发布前提示的影响、check(新) 额外校验
 */
(() => {
  'use strict';
  const S = {};
  const def = (ns, o) => { S[ns] = { ns, perm: 'cfg.ops', risk: 'normal', ...o }; };
  const get = (o, path) => String(path).split('.').reduce((x, k) => (x == null ? undefined : x[k]), o);
  const eq = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  const n = (v) => UI.n(v);
  const stakeOpts = () => Store.pub('stakes').rows.map((x) => [x.id, `${x.name.zh}（${x.id}）`]);
  const LANG_OPTS = D.LANGS.map((l) => [l.id, l.name]);

  /* ================= 玩法配置 ================= */
  def('game', {
    title: '游戏', perm: 'cfg.dev', refs: ['对局 1.1', '对局 4.1', '对局 6.2'],
    desc: 'V7 只有一款游戏。正式上线的游戏可能不是四子棋，所以回合时限、玩法说明、开场提示都按游戏配（对局 1.1、4.1）。配置都带 game_id，以后加游戏不用改结构。',
    fields: [{ k: 'games', t: 'list', label: '游戏', key: 'id', layout: 'cards', add: false, remove: false, rowLabel: (r) => r.name.zh, cols: [
      { k: 'id', t: 'text', label: 'game_id', ro: true },
      { k: 'name', t: 'i18n', label: '名称' },
      { k: 'icon', t: 'img', lib: 'icon', label: '图标' },
      { k: 'enabled', t: 'bool', label: '上线' },
      { k: 'turn_based', t: 'bool', label: '回合制' },
      { k: 'turn_seconds', t: 'num', label: '回合时限', unit: '秒', min: 5, max: 120, help: '对局 6.9 turn_seconds，按游戏配' },
      { k: 'rules_url', t: 'text', label: '玩法说明网页', wide: true, help: '游戏提供网页地址，平台在首页“玩法”和对局“?”里打开' },
      { k: 'intro', t: 'i18n', label: '开场提示', wide: true },
    ] }],
  });

  def('stakes', {
    title: '场次', risk: 'economy', econ: true, refs: ['首页 6.2', '匹配 4.1', '匹配 6.8'],
    desc: '名称、底注、奖池倍数、排序、是否上线都在这里配，客户端不写死。进入条件只看金币，V7 不按等级解锁。',
    fields: [
      { k: 'online_source', t: 'sel', label: '在玩人数来源', opts: [['fixed', '固定数字（初期）'], ['stat', '服务端统计，缓存 5 分钟']], rerender: true, help: '匹配 4.1：初期可以用后台配置的数字' },
      { k: 'rows', t: 'list', label: '场次', key: 'id', sortable: true, rowLabel: (r) => `${r.name.zh}（${r.id}）`, add: () => ({ id: 's' + (Date.now() % 1000), name: { zh: '', en: '', es: '', id: '', hi: '' }, bet: 100, pot_multiplier: 2, sort: 9, enabled: false, online: 0 }), cols: [
        { k: 'id', t: 'text', label: 'stake_id', ro: 'existing', w: '90px' },
        { k: 'name', t: 'i18n', label: '名称' },
        { k: 'bet', t: 'num', label: '底注', unit: '金币', min: 1 },
        { k: 'pot_multiplier', t: 'num', label: '奖池倍数', min: 1, step: 0.5, w: '90px' },
        { k: 'sort', t: 'num', label: '排序', min: 1, w: '70px' },
        { k: 'online', t: 'num', label: '在玩人数（固定）', min: 0, showIf: (d) => d.online_source === 'fixed' },
        { k: 'enabled', t: 'bool', label: '上线' },
      ] },
      { k: '_pot', t: 'calc', label: '奖池和输赢', render: (d) => UI.table([
        { title: '场次', render: (r) => UI.esc(r.name.zh) }, { title: '底注', align: 'r', render: (r) => n(r.bet) },
        { title: '奖池', align: 'r', render: (r) => n(r.bet * r.pot_multiplier) }, { title: '赢一局', align: 'r', render: (r) => '净赚 ' + n(r.bet * r.pot_multiplier - r.bet) },
        { title: '奖池翻倍时赢', align: 'r', render: (r) => '拿 ' + n(r.bet * r.pot_multiplier * 2) },
      ], d.rows.filter((r) => r.enabled), { cls: 'tbl-mini' }) },
    ],
    check: (d) => [
      ...(d.rows.some((r) => r.enabled) ? [] : ['至少要有一个场次是上线的']),
      ...d.rows.filter((r) => r.pot_multiplier < 1).map((r) => `${r.id} 奖池倍数不能小于 1`),
    ],
    effects: (d, p) => {
      const out = [];
      const live = (id) => Store.s.tickets.filter((t) => t.stake === id && ['queued', 'matched', 'confirming'].includes(t.status)).length;
      d.rows.forEach((r) => {
        const o = p.rows.find((x) => x.id === r.id);
        if (!o) { out.push(`新增场次 ${r.name.zh}：${r.enabled ? '发布后马上出现在选择场次弹层' : '先不上线'}`); return; }
        if (o.enabled && !r.enabled) out.push(`<b>${UI.esc(r.name.zh)} 下线</b>：当前排队中的 ${live(r.id)} 张匹配单会被取消并退还底注（取消原因“场次下线”，匹配 6.2）；用户上次场次是它时，首页按余额换一档并提示“场次有调整，请重新选择”`);
        if (o.bet !== r.bet) out.push(`${UI.esc(r.name.zh)} 底注 ${n(o.bet)} → ${n(r.bet)}：只影响新的匹配单，已经扣过底注的按原值结算`);
      });
      return out;
    },
  });

  def('match', {
    title: '匹配参数', perm: 'cfg.dev', refs: ['匹配 4.4', '匹配 6.5', '匹配 6.8'],
    desc: '研发改，运营只读。匹配规则本身（分场次、不匹配好友、同设备不互相匹配）写在服务端，这里只放可调的数字。',
    fields: [
      { t: 'group', label: '水平分匹配范围', cols: 4, fields: [
        { k: 'rr_init', t: 'num', label: '初始范围 ±', min: 0 }, { k: 'rr_step', t: 'num', label: '每次扩大', min: 0 },
        { k: 'rr_every_s', t: 'num', label: '多久扩大一次', unit: '秒', min: 1 }, { k: 'rr_unlimited_s', t: 'num', label: '多久后不限分差', unit: '秒', min: 1 },
        { k: 'init_rating', t: 'num', label: '初始水平分', min: 0 }, { k: 'new_player_games', t: 'num', label: '前几局算新玩家', unit: '局', min: 0 },
        { k: 'repeat_opponent_limit', t: 'num', label: '和同一人连续匹配上限', unit: '次', min: 1 }, { k: 'vip_wait_weight', t: 'num', label: '会员等待时间权重', step: 0.1, min: 1, help: '会员优先匹配（匹配 4.6、6.5）' },
      ] },
      { t: 'group', label: '超时与心跳', cols: 4, fields: [
        { k: 'ready_timeout_s', t: 'num', label: '准备确认超时', unit: '秒', min: 1 }, { k: 'heartbeat_interval_s', t: 'num', label: '心跳间隔', unit: '秒', min: 1 },
        { k: 'heartbeat_timeout_s', t: 'num', label: '心跳超时', unit: '秒', min: 1 }, { k: 'background_keep_s', t: 'num', label: '切到后台后继续匹配', unit: '秒', min: 0 },
        { k: 'wait_prompt_after_s', t: 'num', label: '多久弹“暂时没有匹配到对手”', unit: '秒', min: 1 }, { k: 'auto_cancel_after_prompt_s', t: 'num', label: '弹窗后多久自动取消', unit: '秒', min: 1 },
      ] },
    ],
    check: (d) => (d.heartbeat_timeout_s <= d.heartbeat_interval_s ? ['心跳超时要大于心跳间隔'] : []),
  });

  def('bot', {
    title: '机器人', perm: 'cfg.dev', risk: 'bot', refs: ['匹配 4.4', '匹配 4.5', '匹配 6.9', '规划 Q3'],
    desc: '两种方案还没定（规划 Q3），先都能配。目标胜率直接决定用户在机器人局里输赢多少金币，发布要产品和研发负责人两级审批。',
    notice: ['最新原型（11-18 提交 59e5a74）：等满 10 秒没有真人就由机器人补位，页面和真人局一样、不提示。匹配文档第 3 版：只在用户主动点“极速匹配 · 人机”时才和人机下。金币能充值又用来下底注，“不告知的机器人 + 可调胜率”建议先过法务和应用商店政策。', 'warn'],
    fields: [
      { k: 'mode', t: 'radio', label: '方案', opts: [['fill', '补位方案（最新原型）：等不到真人自动补位，不提示'], ['opt', '主动选择方案（匹配文档）：用户点“极速匹配 · 人机”']], rerender: true, wide: true },
      { k: 'fill', t: 'list', label: '按场次补位', key: 'stake', add: false, remove: false, showIf: (d) => d.mode === 'fill', rowLabel: (r) => Store.stakeName(r.stake), cols: [
        { k: 'stake', t: 'stake', label: '场次', ro: true }, { k: 'enabled', t: 'bool', label: '补位' }, { k: 'after_s', t: 'num', label: '等多久补位', unit: '秒', min: 3 },
      ] },
      { k: 'ai_button_after_s', t: 'num', label: '多久出现“极速匹配 · 人机”', unit: '秒', min: 1, showIf: (d) => d.mode === 'opt' },
      { t: 'group', label: '难度', cols: 3, fields: [
        { k: 'target_win_rate', t: 'num', label: '用户对机器人的目标胜率', unit: '%', min: 30, max: 70, help: '定期统计每档的实际胜率，向目标调整（匹配 6.9）' },
        { k: 'think_ms', t: 'range', label: '每步思考时间', unit: '毫秒', min: 0 },
      ] },
      { k: 'tiers', t: 'list', label: '难度分档（按用户水平分选）', cols: [
        { k: 'name', t: 'text', label: '档位' }, { k: 'rating_max', t: 'num', label: '水平分不高于', min: 0 }, { k: 'strength', t: 'num', label: '强度', unit: '%', min: 1, max: 100 },
      ], add: () => ({ name: '新档位', rating_max: 2000, strength: 80 }) },
      { k: 'personas', t: 'list', label: '机器人人设库（补位方案用，让机器人像真人）', key: 'id', showIf: (d) => d.mode === 'fill', rowLabel: (r) => `${r.name}（${r.id}）`, add: () => ({ id: 'b' + String(Date.now() % 100).padStart(2, '0'), name: '', avatar: '', frame: '', bio: '', games: 100, win: 50, lang: 'zh' }), cols: [
        { k: 'avatar', t: 'img', lib: 'avatar', label: '头像', w: '120px' }, { k: 'name', t: 'text', label: '昵称', req: true }, { k: 'frame', t: 'item', kind: 'frame', label: '头像框', empty: '不戴' },
        { k: 'bio', t: 'text', label: '签名' }, { k: 'games', t: 'num', label: '展示对局数', min: 0 }, { k: 'win', t: 'num', label: '展示胜率', unit: '%', min: 0, max: 100 }, { k: 'lang', t: 'sel', label: '语言', opts: LANG_OPTS },
      ] },
      { k: 'ai_names', t: 'list', label: '人机名字和头像（主动选择方案，名字后一定带“AI”）', showIf: (d) => d.mode === 'opt', cols: [
        { k: 'avatar', t: 'img', lib: 'avatar', label: '头像' }, { k: 'name', t: 'i18n', label: '名字' },
      ], add: () => ({ name: { zh: '', en: '', es: '', id: '', hi: '' }, avatar: D.IMG + 'brand/blob-face.png' }) },
      { k: '_open', t: 'calc', label: '还没定的问题', wide: true, showIf: (d) => d.mode === 'fill', render: () => '<ul class="plain"><li>机器人能不能被搜到、被加好友后怎么办（原型：一直“已申请”）</li><li>会不会出现在“可能认识的人”“最近一起玩过”里（匹配 6.9：不进最近一起玩过）</li><li>被举报时怎么处理（后台：自动关闭，不进人工）</li></ul>' },
    ],
  });

  def('gameplay', {
    title: '对局参数', perm: 'cfg.dev', refs: ['对局 6.4', '对局 6.9'],
    desc: '回合时限按游戏配，在“游戏”里。这里是平台统一的规则。先手双方各 50%，不开放配置（对局 4.3）。',
    fields: [{ t: 'group', label: '计时与判负', cols: 4, fields: [
      { k: 'timeout_forfeit_count', t: 'num', label: '连续超时几次判负', unit: '次', min: 1 }, { k: 'disconnect_forfeit_s', t: 'num', label: '掉线累计多久判负', unit: '秒', min: 10 },
      { k: 'reconnect_interval_ms', t: 'num', label: '自动重连间隔', unit: '毫秒', min: 500 }, { k: 'intro_ms', t: 'num', label: '开场提示时长', unit: '毫秒', min: 0 },
      { k: 'end_to_result_ms', t: 'num', label: '分出结果后进入结算页', unit: '毫秒', min: 0 }, { k: 'end_to_result_draw_ms', t: 'num', label: '平局进入结算页', unit: '毫秒', min: 0 },
      { k: 'rematch_wait_s', t: 'num', label: '再战邀请等待', unit: '秒', min: 3 }, { k: 'result_tasks_max', t: 'num', label: '结算页最多显示几个任务', unit: '个', min: 0, max: 5 },
    ] }],
  });

  def('emotes', {
    title: '表情和快捷语', refs: ['对局 4.5', '对局 6.6', '对局 6.9'],
    desc: '只发 ID，不发自由文字；接收方按自己的语言显示快捷语，所以每句都要 5 种语言。发送记录保留 7 天，用于举报取证。',
    fields: [
      { t: 'group', label: '限频', cols: 4, fields: [
        { k: 'interval_s', t: 'num', label: '每条间隔', unit: '秒', min: 1 }, { k: 'max_per_game', t: 'num', label: '一局最多', unit: '条', min: 1 },
        { k: 'danmaku_max', t: 'num', label: '同时显示弹幕', unit: '条', min: 1 }, { k: 'log_days', t: 'num', label: '发送记录保留', unit: '天', min: 1, ro: true, help: '按隐私政策，研发确认后改' },
      ] },
      { k: 'emojis', t: 'list', label: '表情', key: 'id', sortable: true, add: false, remove: false, rowLabel: (r) => D.EMOJI_NAMES[r.id] || r.id, cols: [
        { k: '_pv', t: 'calc', label: '图', w: '60px', render: (d, r) => UI.emoji(r.id, 30) }, { k: 'id', t: 'text', label: 'ID', ro: true },
        { k: '_n', t: 'calc', label: '名字', render: (d, r) => D.EMOJI_NAMES[r.id] || '' }, { k: 'enabled', t: 'bool', label: '上线' },
      ] },
      { k: 'phrases', t: 'list', label: '快捷语（四子棋）', key: 'id', sortable: true, rowLabel: (r) => r.id, add: () => ({ id: 'p' + (Date.now() % 1000), game: 'c4', text: { zh: '', en: '', es: '', id: '', hi: '' }, enabled: false }), cols: [
        { k: 'id', t: 'text', label: 'ID', ro: 'existing', w: '80px' }, { k: 'text', t: 'i18n', label: '文案' }, { k: 'enabled', t: 'bool', label: '上线' },
      ] },
    ],
  });

  def('room', {
    title: '好友房', risk: 'economy', refs: ['精简清单一', '功能清单 #31 #32'],
    desc: 'V7 去掉了免费档，入场金币只有 100 / 500 / 2,000 / 1万，默认 100。好友房文档还没写，其他参数等文档。',
    fields: [
      { k: 'bets', t: 'list', label: '入场金币档位', sortable: true, cols: [{ k: 'bet', t: 'num', label: '入场金币', unit: '金币', min: 1 }], add: () => ({ bet: 1000 }) },
      { k: 'default_bet', t: 'sel', label: '默认档位', num: true, opts: (d) => d.bets.map((b) => [b.bet, n(b.bet)]) },
      { k: 'countdown_s', t: 'num', label: '人齐都准备后倒计时', unit: '秒', min: 0 },
    ],
    check: (d) => (d.bets.some((b) => b.bet === Number(d.default_bet)) ? [] : ['默认档位要在档位列表里']),
  });

  /* ================= 福利与任务 ================= */
  def('newbie', {
    title: '新手礼包', risk: 'economy', econ: true, refs: ['首页 4.8', '首页 6.4'],
    desc: '新账号第一次进首页弹出，每个账号只能领一次（换手机、游客绑定后都不再发）。',
    fields: [
      { k: 'coins', t: 'num', label: '金币数', unit: '金币', min: 0 },
      { k: 'device_daily_limit', t: 'num', label: '同一台设备一天内新建超过几个账号就不发', unit: '个', min: 1, help: '防止用小号领礼包再通过好友房转给大号（首页 6.4 建议值）' },
    ],
  });

  def('offline', {
    title: '离线收益', risk: 'economy', refs: ['首页 4.9', '首页 6.4'],
    desc: '原型是距上次离开超过 2 秒就发 20 金币，反复开关 app 能一直领。正式产品按下面的规则（首页 4.9 建议值）。',
    fields: [
      { t: 'group', label: '发放规则', cols: 4, fields: [
        { k: 'min_hours', t: 'num', label: '最短离开时长', unit: '小时', min: 0 }, { k: 'coins_per_hour', t: 'num', label: '每满 1 小时', unit: '金币', min: 0 },
        { k: 'max_hours', t: 'num', label: '最多按几小时算', unit: '小时', min: 1 }, { k: 'daily_times', t: 'num', label: '每天最多', unit: '次', min: 0, help: '按服务端自然日' },
      ] },
      { k: '_sum', t: 'calc', label: '算下来', render: (d) => `一次最多 <b>${n(d.coins_per_hour * d.max_hours)}</b> 金币，一天最多 <b>${n(d.coins_per_hour * d.max_hours * d.daily_times)}</b> 金币` },
    ],
    check: (d) => (d.max_hours < d.min_hours ? ['“最多按几小时算”不能小于“最短离开时长”'] : []),
  });

  def('double_pot', {
    title: '奖池翻倍', risk: 'economy', refs: ['首页 4.10', '首页 6.6'],
    desc: '只有 Android 的退出挽留里有“再玩1局 · 奖池翻倍”。只对下一局快速开始有效，赢了系统补发一份奖池（pot_bonus），对手不多付。',
    fields: [
      { k: 'enabled', t: 'bool', label: '开启' },
      { k: 'daily_times', t: 'num', label: '每天最多获得', unit: '次', min: 0, help: '当天有效，跨过零点作废（防止反复退出打开来刷）' },
    ],
  });

  def('signin', {
    title: '7日签到', risk: 'economy', econ: true, refs: ['签到与任务 4.3', '签到与任务 4.4', '签到与任务 6.8'],
    desc: '签到领的是“下一个还没领的天”，漏签不清零、没有补签；第 7 天领完后下一个自然日开始新一轮。会员倍数配在“会员档位与权益”里，只加倍金币。',
    fields: [
      { k: 'days', t: 'list', label: '奖励表', key: 'day', add: false, remove: false, rowLabel: (r) => `第 ${r.day} 天`, cols: [
        { k: 'day', t: 'num', label: '第几天', ro: true, w: '80px' }, { k: 'coins', t: 'num', label: '金币', unit: '金币', min: 0 },
        { k: 'frame', t: 'item', kind: 'frame', label: '送头像框（永久）', empty: '不送' },
        { k: '_vip', t: 'calc', label: '会员 / 超级会员', render: (d, r) => { const t = Store.pub('vip').tiers; return `${n(r.coins * t[1].sign)} / ${n(r.coins * t[2].sign)}`; } },
      ] },
      { k: 'dup_frame_coins', t: 'num', label: '头像框已拥有时折成', unit: '金币', min: 0, help: '和当天的金币一起加倍；头像框不加倍' },
      { k: '_sum', t: 'calc', label: '一轮合计', render: (d) => { const t = Store.pub('vip').tiers; const s = d.days.reduce((a, x) => a + x.coins, 0); return `非会员 <b>${n(s)}</b> · 会员 <b>${n(s * t[1].sign)}</b> · 超级会员 <b>${n(s * t[2].sign)}</b>（另送头像框）`; } },
    ],
    check: (d) => d.days.filter((x) => x.frame && !Store.item(x.frame)).map((x) => `第 ${x.day} 天的头像框不存在`),
  });

  const TASK_COLS = [
    { k: 'id', t: 'text', label: 'task_id', ro: 'existing' },
    { k: 'group', t: 'sel', label: '分组', opts: D.TASK_GROUPS.map((g) => [g.id, g.name]) },
    { k: 'name', t: 'i18n', label: '任务名' },
    { k: 'metric', t: 'sel', label: '计数项', opts: D.METRICS.map((m) => [m.id, m.name]) },
    { k: 'goal', t: 'num', label: '目标', min: 1 },
    { k: 'reward', t: 'reward', label: '奖励' },
    { k: 'jump', t: 'jump', label: '去完成' },
    { k: 'sort', t: 'num', label: '排序', min: 1 },
    { k: 'start', t: 'date', label: '开始日' },
    { k: 'end', t: 'date', label: '结束日' },
    { k: 'enabled', t: 'bool', label: '上线' },
  ];
  def('tasks', {
    title: '任务', risk: 'economy', econ: true, custom: 'tasks', refs: ['签到与任务 4.7–4.12', '签到与任务 6.2', '签到与任务 6.8'],
    desc: '加任务、改奖励不用发版。计数项从列表里选，新的计数项要研发开发；客户端不认识的跳转一律回首页。',
    fields: [{ k: 'rows', t: 'list', label: '任务', key: 'id', rowLabel: (r) => `${r.name.zh}（${r.id}）`, rowSummary: (r) => `${r.name.zh} · 目标 ${r.goal} · ${n(r.reward.coins)} 金币`, cols: TASK_COLS }],
    check: (d) => {
      const e = [];
      d.rows.forEach((r) => {
        if (r.group === 'limited' && (!r.start || !r.end)) e.push(`${r.id} 是限时任务，要填开始日和结束日`);
        if (r.group === 'limited' && r.start && r.end && r.start > r.end) e.push(`${r.id} 结束日早于开始日`);
        if (r.reward.item && !(Store.item(r.reward.item) || {}).enabled) e.push(`${r.id} 奖励里的装扮不存在或已下架`);
      });
      return e;
    },
    effects: (d, p) => {
      const out = [];
      const cnt = (x) => x.rows.filter((r) => r.group === 'daily' && r.enabled).length;
      if (cnt(d) !== cnt(p)) out.push(`<b>每日任务从 ${cnt(p)} 个变成 ${cnt(d)} 个</b>：“连续 7 天”要求当天领完全部每日任务，难度跟着变（签到与任务 4.5）`);
      d.rows.forEach((r) => {
        const o = p.rows.find((x) => x.id === r.id);
        if (!o) { out.push(`新增 ${UI.esc(r.name.zh)}${r.group === 'limited' ? `：${r.start} 到 ${r.end}，按用户本地日期，活动开始前不显示` : ''}`); return; }
        if (o.goal !== r.goal || o.metric !== r.metric) out.push(`${UI.esc(r.name.zh)} 改了目标或计数项：建议只对下一个周期生效（规划 4.4，待定）`);
        if (o.enabled && !r.enabled) out.push(`${UI.esc(r.name.zh)} 下线：当期完成了没领的奖励作废`);
      });
      return out;
    },
  });

  def('mystery', {
    title: '神秘任务', risk: 'economy', econ: true, refs: ['签到与任务 4.6', '签到与任务 6.2 mystery_pool'],
    desc: '每天一个，翻开时先看候选里有没有今天已经完成的，有就选它（多个时按顺序取第一个）；都没完成就按权重随机抽。完成后开神秘宝箱，奖池在“宝箱奖池”。',
    fields: [{ k: 'rows', t: 'list', label: '候选', key: 'id', sortable: true, rowLabel: (r) => r.name.zh, add: () => ({ id: 'm_' + (Date.now() % 1000), name: { zh: '', en: '', es: '', id: '', hi: '' }, metric: 'games', goal: 1, jump: 'home', weight: 1 }), cols: [
      { k: 'id', t: 'text', label: 'ID', ro: 'existing', w: '90px' }, { k: 'name', t: 'i18n', label: '任务名' },
      { k: 'metric', t: 'sel', label: '计数项', opts: D.METRICS.map((m) => [m.id, m.name]) }, { k: 'goal', t: 'num', label: '目标', min: 1 },
      { k: 'jump', t: 'jump', label: '去完成' }, { k: 'weight', t: 'num', label: '权重', min: 0 },
    ] }],
  });

  def('chests', {
    title: '宝箱奖池', risk: 'economy', econ: true, refs: ['签到与任务 4.5', '签到与任务 4.6', '签到与任务 Q9'],
    desc: '神秘宝箱随机开出金币；连续 7 天领完全部每日任务开大宝箱。没打开的大宝箱一直保留。',
    fields: [
      { k: 'mystery', t: 'list', label: '神秘宝箱奖池', cols: [{ k: 'coins', t: 'num', label: '金币', unit: '金币', min: 1 }, { k: 'weight', t: 'num', label: '权重', min: 0 }, { k: '_p', t: 'calc', label: '概率', render: (d, r) => { const w = d.mystery.reduce((a, x) => a + Number(x.weight || 0), 0); return w ? Math.round((r.weight / w) * 100) + '%' : '—'; } }], add: () => ({ coins: 1000, weight: 1 }) },
      { k: 'streak_coins', t: 'num', label: '连续 7 天大宝箱', unit: '金币', min: 0 },
      { k: 'show_range', t: 'bool', label: '弹窗上写奖励范围', help: '签到与任务 Q9 建议写一行；免费获得的随机奖励应用商店不强制公示概率' },
      { k: '_txt', t: 'calc', label: '弹窗文案（自动生成）', render: (d) => (d.show_range ? `“可能开出 ${n(Math.min(...d.mystery.map((x) => x.coins)))}～${n(Math.max(...d.mystery.map((x) => x.coins)))} 金币”` : '<span class="muted">不显示</span>') },
    ],
    check: (d) => (d.mystery.some((x) => x.weight > 0) ? [] : ['至少要有一档权重大于 0']),
  });

  def('anticheat', {
    title: '防刷参数', perm: 'cfg.dev', refs: ['签到与任务 6.7', '签到与任务 Q5 Q6'],
    desc: '任务进度只认服务端事件，客户端只能上报分享。下面的门槛防止开局就认输刷“玩3局”、挂机刷时长、反复点分享。',
    fields: [
      { t: 'group', label: '门槛', cols: 3, fields: [
        { k: 'min_moves', t: 'num', label: '有效对局：双方都至少落子', unit: '次', min: 0 },
        { k: 'max_play_minutes', t: 'num', label: '游玩时长每局最多计', unit: '分钟', min: 1 },
        { k: 'share_dedupe_minutes', t: 'num', label: '同一渠道多久内只算 1 次分享', unit: '分钟', min: 0 },
      ] },
      { k: '_cap', t: 'calc', label: '单账号每天福利金币告警线', wide: true, render: () => { const e = Store.econ(); return `按当前配置自动算出的“签到和任务单日理论上限”：非会员 <b>${n(e[0].cap)}</b>、会员 <b>${n(e[1].cap)}</b>、超级会员 <b>${n(e[2].cap)}</b>。改了签到、任务、宝箱会自动跟着变，见 <a href="#/economy">数值总览</a>`; } },
    ],
  });

  /* ================= 商城与会员 ================= */
  def('items', {
    title: '装扮', risk: 'economy', custom: 'items', refs: ['我的 4.8', '我的 6.2 item_def', '我的 6.5'],
    desc: '头像框、聊天气泡、主页背景，和商城共用一份配置。下架后商城买不到，已经拥有的照样能用（我的 E32）。素材上传后在这里预览戴在头像上的效果。',
    fields: [{ k: 'rows', t: 'list', label: '装扮', key: 'id', rowLabel: (r) => `${r.name.zh}（${r.id}）`, rowSummary: (r) => `${r.name.zh} · ${r.price ? n(r.price) + ' 金币' : '免费'}`, cols: [
      { k: 'id', t: 'text', label: 'item_id', ro: 'existing' }, { k: 'kind', t: 'sel', label: '类型', opts: [['frame', '头像框'], ['bubble', '聊天气泡'], ['bg', '主页背景']] },
      { k: 'name', t: 'i18n', label: '名称' }, { k: 'price', t: 'num', label: '价格', unit: '金币', min: 0 },
      { k: 'vip', t: 'sel', label: '会员档位要求', num: true, opts: [[0, '不限'], [1, '会员'], [2, '超级会员']] }, { k: 'is_default', t: 'bool', label: '默认' },
      { k: 'sort', t: 'num', label: '排序' }, { k: 'enabled', t: 'bool', label: '上架' }, { k: 'mode', t: 'sel', label: '素材做法', opts: [['image', '图片'], ['ring', '圈色 + 装饰'], ['gradient', '渐变'], ['css', '自定义样式']] },
      { k: 'img', t: 'img', label: '图片' }, { k: 'box', t: 'text', label: '图片位置' }, { k: 'ring', t: 'sel', label: '圈色', opts: D.FRAME_RINGS }, { k: 'deco', t: 'img', label: '装饰图' },
      { k: 'pos', t: 'sel', label: '装饰位置', opts: D.FRAME_POS }, { k: 'colors', t: 'text', label: '渐变颜色' }, { k: 'css', t: 'text', label: '自定义样式' }, { k: 'text', t: 'text', label: '文字颜色' },
    ] }],
    check: (d) => d.rows.filter((r) => !(r.price >= 0)).map((r) => `${r.id} 价格要填 0 或正数`),
    effects: (d, p) => d.rows.filter((r) => { const o = p.rows.find((x) => x.id === r.id); return o && o.enabled && !r.enabled; }).map((r) => `${UI.esc(r.name.zh)} 下架：商城里买不到，已经拥有的 ${Store.s.users.filter((u) => u.items.some((x) => x.id === r.id)).length} 个用户照样能用`),
  });

  def('packs', {
    title: '充值档位', risk: 'economy', refs: ['功能清单 #47 #50', '规划 Q4 Q5'],
    desc: '走 Google Play / App Store 内购时，价格在商店后台按国家定，这里只管商品 ID 和发多少金币；美元价格只用来展示和对账。',
    notice: ['功能清单 #47 整行划掉了，但精简清单只去掉了“金币+免广告卡”，原型商城仍有这 4 档和首充双倍（规划 Q4）。支付渠道也没定，原型是“小米钱包（模拟）”（规划 Q5）。', 'warn'],
    fields: [{ k: 'rows', t: 'list', label: '档位', key: 'id', sortable: true, rowLabel: (r) => `${r.id} ${UI.usd(r.usd)}`, add: () => ({ id: 'c' + (Date.now() % 100), product_id: 'com.soulgame.coins.', usd: 1.99, coins: 1200, bonus: 0, first_double: true, sort: 9, enabled: false }), cols: [
      { k: 'id', t: 'text', label: '档位 ID', ro: 'existing', w: '80px' }, { k: 'product_id', t: 'text', label: '商店商品 ID', req: true },
      { k: 'usd', t: 'num', label: '价格（美元）', step: 0.01, min: 0.01 }, { k: 'coins', t: 'num', label: '金币', min: 1 }, { k: 'bonus', t: 'num', label: '加送', min: 0 },
      { k: 'first_double', t: 'bool', label: '首充双倍' }, { k: '_s', t: 'calc', label: '首充 / 平时到账', render: (d, r) => `${n(r.first_double ? r.coins * 2 : r.coins + r.bonus)} / ${n(r.coins + r.bonus)}` },
      { k: 'enabled', t: 'bool', label: '上架' },
    ] }],
  });

  def('vip', {
    title: '会员档位与权益', risk: 'economy', econ: true, custom: 'vip', refs: ['功能清单 #48 #49', '原型 D.vip', '我的 4.8'],
    desc: '会员模块文档还没写，按原型整理。改权益对现有会员马上生效；价格在商店后台定，这里只做商品映射和展示。',
    fields: [{ k: 'tiers', t: 'list', label: '档位', key: 'id', rowLabel: (r) => r.name.zh, cols: [
      { k: 'name', t: 'i18n', label: '名称' }, { k: 'product_id', t: 'text', label: '商店商品 ID' }, { k: 'usd', t: 'num', label: '价格（美元/月）' },
      { k: 'bonus', t: 'num', label: '开通送金币' }, { k: 'daily', t: 'num', label: '每日福利' }, { k: 'aid_times', t: 'num', label: '破产补助每天次数' }, { k: 'aid_coins', t: 'num', label: '破产补助每次金币' },
      { k: 'sign', t: 'num', label: '签到倍数' }, { k: 'friend_cap', t: 'num', label: '好友上限' }, { k: 'voice_free', t: 'bool', label: '语音通话免费' }, { k: 'video_free', t: 'bool', label: '视频通话免费' },
      { k: 'priority', t: 'bool', label: '优先匹配' }, { k: 'pin', t: 'bool', label: '好友申请置顶' }, { k: 'frame', t: 'item', kind: 'frame', label: '专属头像框' }, { k: 'entry_fx', t: 'bool', label: '对局入场特效' }, { k: 'stickers', t: 'num', label: '专属表情和气泡（套）' },
    ] }],
    effects: (d, p) => {
      const out = [];
      d.tiers.forEach((t, i) => { const o = p.tiers[i]; if (t.id && JSON.stringify(t) !== JSON.stringify(o)) out.push(`${UI.esc(t.name.zh)}的权益变了：对现有 ${Store.s.users.filter((u) => u.vip && u.vip.tier === t.id).length} 个${UI.esc(t.name.zh)}马上生效`); });
      return out;
    },
  });

  def('call', {
    title: '通话计费', risk: 'economy', refs: ['功能清单 #34', '原型 D.vip.call'],
    desc: '只能打给在线好友；会员语音免费、超级会员视频也免费（在会员档位里配），否则按次收金币，没接通退回。',
    fields: [{ t: 'group', label: '价格', cols: 3, fields: [
      { k: 'voice', t: 'num', label: '语音通话', unit: '金币/次', min: 0 }, { k: 'video', t: 'num', label: '视频通话', unit: '金币/次', min: 0 }, { k: 'max_minutes', t: 'num', label: '每次最长', unit: '分钟', min: 1 },
    ] }],
  });

  /* ================= 消息与触达 ================= */
  def('sysmsg', {
    title: '系统消息模板', refs: ['功能清单 #27', '我的 6.4', '规划 4.7'],
    desc: '发到 Soulgame 官方会话，用户不能回复。状态“在用”的模板要 5 种语言齐全才能发布；“待确认”的先不触发。',
    fields: [{ k: 'rows', t: 'list', label: '模板', key: 'key', layout: 'cards', add: false, remove: false, rowLabel: (r) => r.name, cols: [
      { k: 'key', t: 'text', label: 'key', ro: true }, { k: 'trigger', t: 'text', label: '什么时候发', ro: true, wide: true },
      { k: 'status', t: 'sel', label: '状态', opts: [['在用', '在用'], ['待确认', '待确认（不触发）']] },
      { k: 'text', t: 'i18n', label: '内容', area: true, wide: true, reqIf: (r) => r.status === '在用' },
      { k: '_pv', t: 'calc', label: '预览（中文）', wide: true, render: (d, r) => `<div class="sysmsg"><img src="${D.IMG}brand/app-icon.png" alt=""><div><b>Soulgame</b><p>${UI.esc(r.text.zh)}</p></div></div>` },
    ] }],
  });

  def('push', {
    title: '推送模板', refs: ['我的 4.9', '我的 6.8', '首页 4.11'],
    desc: '系统推送和 app 内通知共用文案。“游戏邀请”“好友申请”受设置里两个开关控制，关了就不推也不弹；Android 按通知渠道分开。',
    notice: ['运营推送（推广活动）在 P1：App Store 审核指南 4.5.4 要求推广类推送先在 app 里让用户明确同意并能关掉，V7 设置里还没有这个开关。', 'info'],
    fields: [{ k: 'rows', t: 'list', label: '模板', key: 'key', layout: 'cards', add: false, remove: false, rowLabel: (r) => r.name, cols: [
      { k: 'key', t: 'text', label: 'key', ro: true }, { k: '_sw', t: 'calc', label: '受哪个开关控制', render: (d, r) => (r.switch ? { notify_invite: '设置 → 通知 → 游戏邀请', notify_friend_request: '设置 → 通知 → 好友申请' }[r.switch] : '不受开关控制') },
      { k: 'channel', t: 'text', label: 'Android 通知渠道', ro: true }, { k: 'title', t: 'i18n', label: '标题', wide: true }, { k: 'body', t: 'i18n', label: '内容', wide: true },
    ] }],
  });

  def('share', {
    title: '分享', refs: ['签到与任务 4.12', '签到与任务 4.13', '对局 4.11'],
    desc: '所有地方的分享都算进任务（任务中心、结算页、邀请朋友）。链接带分享人的展示 ID，方便以后统计分享带来的新用户。',
    fields: [
      { k: 'text', t: 'i18n', label: '邀请文案', wide: true },
      { k: 'result_text', t: 'i18n', label: '结算页分享胜利', wide: true, help: '{game} 游戏名、{opponent} 对手名，客户端替换' },
      { k: 'landing_url', t: 'text', label: '落地页', wide: true, help: '按设备跳 Google Play 或 App Store' },
      { k: 'channels', t: 'list', label: '渠道和顺序', key: 'id', sortable: true, add: false, remove: false, rowLabel: (r) => r.id, cols: [
        { k: '_n', t: 'calc', label: '渠道', render: (d, r) => (D.SHARE_CHANNELS.find(([id]) => id === r.id) || [, r.id])[1] }, { k: 'enabled', t: 'bool', label: '显示' },
      ] },
    ],
  });

  /* ================= 系统配置 ================= */
  def('legal', {
    title: '协议与客服', perm: 'cfg.sys', refs: ['账号 4.15', '我的 4.9'],
    desc: '登录页底部和设置 → 关于里是同一份协议。服务端记录每个账号同意的版本和时间。',
    fields: [
      { k: 'terms_url', t: 'i18n', label: '用户协议地址', wide: true },
      { k: 'privacy_url', t: 'i18n', label: '隐私政策地址', wide: true },
      { k: 'version', t: 'text', label: '协议版本号', req: true },
      { k: 'reconsent', t: 'bool', label: '重大更新：下次打开 app 要求重新同意', help: 'P1（账号 4.15 建议），客户端要做弹窗' },
      { k: 'support_email', t: 'text', label: '客服邮箱', req: true, help: 'App Store 审核指南 1.2 要求公布联系方式' },
    ],
  });
  def('defaults', {
    title: '默认资料', perm: 'cfg.sys', refs: ['账号 4.13'],
    desc: '游客和邮箱注册用默认昵称和头像。后台重置昵称头像时也改回这里的值。',
    fields: [{ k: 'nickname', t: 'text', label: '默认昵称', req: true }, { k: 'avatar', t: 'img', lib: 'avatar', label: '默认头像' }],
  });
  def('display', {
    title: '展示数字', perm: 'cfg.sys', refs: ['账号 4.2', '首页 4.3', '首页 6.9'],
    desc: '初期用固定数字，量起来以后切换成服务端统计（缓存 5 分钟）。各场次的在玩人数在“场次”里。',
    fields: [
      { k: 'login_online', t: 'num', label: '登录页人数', min: 0 },
      { k: 'login_text', t: 'i18n', label: '登录页文案', wide: true, help: '{N} 替换成上面的人数' },
      { k: 'home_source', t: 'sel', label: '首页在玩人数来源', opts: [['fixed', '固定数字'], ['stat', '服务端统计']], rerender: true },
      { k: 'home_online', t: 'num', label: '首页在玩人数', min: 0, showIf: (d) => d.home_source === 'fixed' },
    ],
  });
  def('limits', {
    title: '资料与社交限制', perm: 'cfg.sys', refs: ['我的 4.5', '我的 4.10', '我的 6.4'],
    desc: '好友上限按会员档位，在“会员档位与权益”里。',
    fields: [{ t: 'group', label: '限制', cols: 3, fields: [
      { k: 'bio_max', t: 'num', label: '个性签名最多', unit: '字', min: 1 }, { k: 'bio_daily_edits', t: 'num', label: '签名每天最多改', unit: '次', min: 1 }, { k: 'block_max', t: 'num', label: '黑名单上限', unit: '人', min: 1 },
    ] }],
  });
  def('i18n', {
    title: '多语言文案', perm: 'cfg.sys', custom: 'i18n', refs: ['我的 6.7', '规划 4.9'],
    desc: '服务端返回给用户的文字都在这里维护，改了不用发版。场次名、任务名、装扮名这些跟着各自的配置走，下面会一起检查有没有缺语言。',
    fields: [{ k: 'rows', t: 'list', label: '文案', key: 'key', rowLabel: (r) => r.key, cols: [{ k: 'group', t: 'text', label: '分组', ro: true }, { k: 'text', t: 'i18n', label: '文案' }] }],
  });
  def('jumps', {
    title: '跳转目标', perm: 'cfg.dev', refs: ['签到与任务 4.13', '规划 4.9'],
    desc: '任务、运营位、系统消息、推送共用。每个目标标明从哪个 app 版本开始支持，低版本客户端回首页。新增目标要客户端开发。',
    fields: [{ k: 'rows', t: 'list', label: '目标', key: 'key', rowLabel: (r) => r.name, add: () => ({ key: 'new_target', name: '', since: '', used: '' }), cols: [
      { k: 'key', t: 'text', label: 'key', ro: 'existing' }, { k: 'name', t: 'text', label: '去哪里', req: true }, { k: 'since', t: 'text', label: '从哪个版本支持' }, { k: 'used', t: 'text', label: '谁在用' },
    ] }],
  });

  /* ================= 校验与差异 ================= */
  function walk(fields, data, cb, prefix = '', label = '', row = null) {
    fields.forEach((f) => {
      if (f.t === 'group') { walk(f.fields, data, cb, prefix, label, row); return; }
      if (f.t === 'calc') return;
      const host = row || data;
      if (f.showIf && !f.showIf(data, row)) return;
      cb(f, get(host, f.k), prefix + f.k, label + f.label, host);
    });
  }
  function validate(ns, data) {
    const d = S[ns];
    const errs = [];
    const check = (f, v, path, label, host) => {
      if (f.ro) return;
      if (f.t === 'num' && (v === '' || v == null || Number.isNaN(Number(v)))) errs.push(`${label} 要填数字`);
      else if (f.t === 'num' && f.min != null && v < f.min) errs.push(`${label} 不能小于 ${f.min}`);
      else if (f.t === 'num' && f.max != null && v > f.max) errs.push(`${label} 不能大于 ${f.max}`);
      if (f.t === 'i18n' && (!f.reqIf || f.reqIf(host))) { const miss = UI.missing(v); if (miss.length) errs.push(`${label} 缺少 ${miss.map((x) => D.LANGS.find((l) => l.id === x).name).join('、')}`); }
      if ((f.t === 'text' || f.t === 'area') && f.req && !String(v || '').trim()) errs.push(`${label} 不能为空`);
      if (f.t === 'list') {
        const seen = new Set();
        (v || []).forEach((r, i) => {
          const rl = `${label} ${f.rowLabel ? f.rowLabel(r) : i + 1} · `;
          if (f.key) { if (seen.has(r[f.key])) errs.push(`${label} 的 ${f.key} “${r[f.key]}” 重复了`); seen.add(r[f.key]); }
          walk(f.cols, data, check, `${path}.${i}.`, rl, r);
        });
      }
    };
    walk(d.fields, data, check);
    if (d.check) errs.push(...d.check(data));
    return [...new Set(errs)];
  }
  const optLabel = (f, v, data) => { const o = typeof f.opts === 'function' ? f.opts(data || {}) : f.opts; const hit = (o || []).find(([k]) => String(k) === String(v)); return hit ? hit[1] : v; };
  function show(f, v, data) {
    if (f.t === 'bool') return v ? '是' : '否';
    if (f.t === 'sel' || f.t === 'radio') return optLabel(f, v, data);
    if (f.t === 'item') return v ? Store.itemName(v) : (f.empty || '无');
    if (f.t === 'stake') return Store.stakeName(v);
    if (f.t === 'jump') { const j = Store.pub('jumps').rows.find((x) => x.key === v); return j ? j.name : v; }
    if (f.t === 'reward') return v ? `${UI.n(v.coins)} 金币${v.item ? ' + ' + Store.itemName(v.item) : ''}` : '';
    if (f.t === 'range') return (v || []).join(' – ');
    if (f.t === 'img') return v ? (v.startsWith('data:') ? '（上传的图片）' : v.split('/').pop()) : '';
    if (Array.isArray(v)) return v.join('、');
    return v;
  }
  /** 新旧两份配置的差异：列表按 key 对齐，多语言按语言拆开 */
  function diff(ns, a, b) {
    const out = [];
    function walkRow(fields, x, y, lp) {
      fields.forEach((f) => {
        if (f.t === 'group') { walkRow(f.fields, x, y, lp); return; }
        if (f.t === 'calc') return;
        const va = get(x, f.k);
        const vb = get(y, f.k);
        if (f.t === 'i18n') { D.LANGS.forEach((l) => { const p = (va || {})[l.id] || ''; const q = (vb || {})[l.id] || ''; if (p !== q) out.push({ kind: 'chg', label: `${lp}${f.label}（${l.name}）`, before: p, after: q }); }); return; }
        if (!eq(va, vb)) out.push({ kind: 'chg', label: lp + f.label, before: show(f, va, b), after: show(f, vb, b) });
      });
    }
    function cmpTop(fields, x, y) {
      fields.forEach((f) => {
        if (f.t === 'group') { cmpTop(f.fields, x, y); return; }
        if (f.t === 'calc') return;
        const va = get(x, f.k);
        const vb = get(y, f.k);
        if (f.t === 'list') {
          const keyOf = (r, i) => (f.key ? r[f.key] : i);
          const ma = new Map((va || []).map((r, i) => [keyOf(r, i), r]));
          const mb = new Map((vb || []).map((r, i) => [keyOf(r, i), r]));
          const rl = (r, k) => `${f.label} ${f.rowLabel ? f.rowLabel(r) : '第 ' + (Number(k) + 1) + ' 行'}`;
          (vb || []).forEach((r, i) => {
            const k = keyOf(r, i);
            if (!ma.has(k)) out.push({ kind: 'add', label: rl(r, k), after: f.rowSummary ? f.rowSummary(r) : (r.name && r.name.zh) || r.bet || k });
            else walkRow(f.cols, ma.get(k), r, rl(r, k) + ' · ');
          });
          (va || []).forEach((r, i) => { const k = keyOf(r, i); if (!mb.has(k)) out.push({ kind: 'del', label: rl(r, k), before: f.rowSummary ? f.rowSummary(r) : (r.name && r.name.zh) || r.bet || k }); });
          if (f.sortable && f.key) {
            const oa = (va || []).map(keyOf).filter((k) => mb.has(k)).join(' → ');
            const ob = (vb || []).map(keyOf).filter((k) => ma.has(k)).join(' → ');
            if (oa !== ob) out.push({ kind: 'chg', label: `${f.label} 的顺序`, before: oa, after: ob });
          }
          return;
        }
        if (f.t === 'i18n') { D.LANGS.forEach((l) => { const p = (va || {})[l.id] || ''; const q = (vb || {})[l.id] || ''; if (p !== q) out.push({ kind: 'chg', label: `${f.label}（${l.name}）`, before: p, after: q }); }); return; }
        if (!eq(va, vb)) out.push({ kind: 'chg', label: f.label, before: show(f, va, b), after: show(f, vb, b) });
      });
    }
    cmpTop(S[ns].fields, a, b);
    return out;
  }

  window.Schemas = { def: (ns) => S[ns], all: S, validate, diff, get, eq, show };
})();
