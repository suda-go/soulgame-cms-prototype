/**
 * 静态定义：语言、角色和权限、计数项、跳转目标、账本类型、各种原因选项
 * 会被运营改的数据（配置、用户、订单……）在 seed.js 生成初始值，运行中存在 store.js
 * 依据：《Soulgame V7 CMS 运营后台规划》https://mi.feishu.cn/docx/KvhcdugPro47OLxL1OQc0OTtn3d
 */
(() => {
  'use strict';
  const D = (window.D = {});
  D.IMG = 'assets/img/';
  D.PLAN_URL = 'https://mi.feishu.cn/docx/KvhcdugPro47OLxL1OQc0OTtn3d';
  D.APP_URL = 'https://suda-go.github.io/play-zone-prototype-v7/';

  /* 5 种语言（我的与设置第八章）。每种语言用它自己的文字显示 */
  D.LANGS = [
    { id: 'zh', name: '简体中文', short: '中' },
    { id: 'en', name: 'English', short: 'EN' },
    { id: 'es', name: 'Español', short: 'ES' },
    { id: 'id', name: 'Bahasa Indonesia', short: 'ID' },
    { id: 'hi', name: 'हिन्दी', short: 'HI' },
  ];

  /* 演示角色：右上角切换。规划 4.11 的角色加“产品”（审批表里的数值负责人） */
  D.ROLES = {
    ops: { name: '运营', person: '林小运', color: '#2c7bff' },
    cs: { name: '客服', person: '王小服', color: '#13b57a' },
    mod: { name: '审核', person: '赵小审', color: '#ff7a2f' },
    fin: { name: '财务', person: '钱小财', color: '#e6a100' },
    dev: { name: '研发', person: '孙小研', color: '#7b5cff' },
    pm: { name: '产品', person: '李数值', color: '#e0457b', note: '数值负责人，审批动到金币的配置' },
    admin: { name: '管理员', person: '周管理', color: '#1c2033', note: '演示里兼任各组组长、研发负责人、审核组长' },
  };

  /*
   * 权限点（规划 4.11 角色和权限表）
   * user.view 看用户  user.unmask 看完整邮箱和三方 ID  punish.request 发起处罚  punish 执行处罚
   * assets.request 发起金币调整 / 发装扮  mod.view 看举报  mod.handle 处理举报、复审、敏感词
   * cfg.ops 运营类配置  cfg.dev 匹配、对局、机器人等技术参数  cfg.sys 系统配置和多语言
   * order.view 看订单  order.request 发起补单  order.handle 补单、退款扣回  export 导出账本
   */
  const ALL = ['user.view', 'user.unmask', 'punish.request', 'punish', 'assets.request', 'mod.view', 'mod.handle',
    'cfg.ops', 'cfg.dev', 'cfg.sys', 'order.view', 'order.request', 'order.handle', 'export', 'admin.manage'];
  D.PERMS = {
    ops: ['user.view', 'assets.request', 'cfg.ops', 'cfg.sys'],
    cs: ['user.view', 'user.unmask', 'punish.request', 'assets.request', 'mod.view', 'order.view', 'order.request'],
    mod: ['user.view', 'user.unmask', 'punish', 'mod.view', 'mod.handle'],
    fin: ['user.view', 'user.unmask', 'order.view', 'order.handle', 'export'],
    dev: ['user.view', 'cfg.dev', 'cfg.sys', 'order.view'],
    pm: ['user.view', 'mod.view', 'order.view'],
    admin: ALL,
  };
  D.PERM_NAMES = {
    'user.view': '查看用户', 'user.unmask': '查看完整邮箱和三方 ID', 'punish.request': '发起封号', punish: '封号、强制下线、重置资料',
    'assets.request': '发起金币调整、发装扮', 'mod.view': '查看举报', 'mod.handle': '处理举报、复审、敏感词',
    'cfg.ops': '编辑运营配置', 'cfg.dev': '编辑技术参数', 'cfg.sys': '编辑系统配置和多语言',
    'order.view': '查看订单', 'order.request': '发起补单', 'order.handle': '补单、退款扣回', export: '导出账本', 'admin.manage': '管理后台账号',
  };

  /* 审批人（规划 4.11 审批表）。roles：哪些演示角色能审这一步 */
  D.APPROVERS = {
    lead: { label: '组长', roles: ['admin'] },
    fin: { label: '财务', roles: ['fin'] },
    pm: { label: '产品（数值负责人）', roles: ['pm'] },
    devlead: { label: '研发负责人', roles: ['admin'] },
    modlead: { label: '审核组长', roles: ['admin'] },
    mod: { label: '审核', roles: ['mod'] },
  };
  D.COIN_APPROVAL_N = 10000; // 单次超过 N 要财务再审（N = 一局大师场的底注）

  /* 任务计数项（签到与任务 6.8）。新增计数项要研发开发 */
  D.METRICS = [
    { id: 'games', name: '对局数', unit: '局' },
    { id: 'wins', name: '胜场', unit: '局' },
    { id: 'play_seconds', name: '游玩时长（按分钟展示）', unit: '分钟' },
    { id: 'friends_added', name: '新增好友', unit: '位' },
    { id: 'frame_equipped', name: '装备头像框', unit: '次' },
    { id: 'emotes', name: '对局中发表情', unit: '个' },
    { id: 'shares', name: '分享次数', unit: '次' },
    { id: 'friend_games', name: '和好友对局', unit: '局' },
    { id: 'room_invites', name: '邀请好友进房间', unit: '位' },
    { id: 'mates_added', name: '加一起对局过的人为好友', unit: '位' },
  ];
  D.TASK_GROUPS = [
    { id: 'newbie', name: '新手任务', period: '一次性' },
    { id: 'daily', name: '每日任务', period: '每天 00:00 刷新（用户时区）' },
    { id: 'weekly', name: '每周任务', period: '每周一刷新（用户时区）' },
    { id: 'limited', name: '限时任务', period: '活动期内（用户本地日期）' },
  ];

  /* 账本类型（我的与设置 6.7）。note 是用户在明细里看到的备注，对应多语言文案 note.* */
  D.LEDGER = {
    newbie_gift: { name: '新手礼包', note: 'note.newbie_gift' },
    offline_income: { name: '离线收益', note: 'note.offline_income' },
    stake_bet: { name: '快速开始底注', note: 'note.stake_bet' },
    stake_bet_rematch: { name: '再战底注', note: 'note.stake_bet_rematch' },
    stake_refund: { name: '取消匹配退还', note: 'note.stake_refund' },
    match_fail_refund: { name: '匹配失败退还', note: 'note.match_fail_refund' },
    pot_win: { name: '赢得奖池', note: 'note.pot_win' },
    pot_bonus: { name: '奖池翻倍补发', note: 'note.pot_win_double' },
    draw_refund: { name: '平局退还', note: 'note.draw_refund' },
    abort_refund: { name: '对局异常退还', note: 'note.abort_refund' },
    room_bet: { name: '好友房底注', note: 'note.room_bet' },
    room_win: { name: '好友房赢得奖池', note: 'note.room_win' },
    room_draw_refund: { name: '好友房平局退还', note: 'note.room_draw_refund' },
    signin: { name: '签到', note: 'note.signin' },
    task_reward: { name: '任务奖励', note: 'note.task_reward' },
    mystery_chest: { name: '神秘宝箱', note: 'note.mystery_chest' },
    streak_chest: { name: '连续7天宝箱', note: 'note.streak_chest' },
    vip_open: { name: '会员开通', note: 'note.vip_open' },
    vip_daily: { name: '会员每日福利', note: 'note.vip_daily' },
    vip_aid: { name: '会员破产补助', note: 'note.vip_aid' },
    topup: { name: '充值', note: 'note.topup' },
    item_buy: { name: '购买装扮', note: 'note.item_buy' },
    call_fee: { name: '通话扣费', note: 'note.call_fee' },
    call_refund: { name: '通话未接通退回', note: 'note.call_refund' },
    admin_adjust: { name: '系统调整（后台）', note: 'note.admin_adjust' },
  };

  /* 跳转目标（规划 4.9）。任务、运营位、系统消息、推送共用 */
  D.JUMP_DEFAULT = [
    { key: 'home', name: '回到首页', since: '1.0', used: '任务' },
    { key: 'add_friend', name: '添加好友页', since: '1.0', used: '任务' },
    { key: 'shop_decor', name: '商城 · 装扮页', since: '1.0', used: '任务' },
    { key: 'share', name: '分享面板', since: '1.0', used: '任务' },
    { key: 'friend_list', name: '消息 · 好友列表', since: '1.0', used: '任务' },
    { key: 'vip_center', name: '会员中心', since: '1.1（运营位上线时）', used: '运营位' },
    { key: 'shop_topup', name: '商城 · 充值页', since: '1.1（运营位上线时）', used: '运营位' },
    { key: 'task_center', name: '任务中心', since: '1.1（运营位上线时）', used: '运营位' },
  ];

  D.REPORT_REASONS = ['辱骂和骚扰', '不良语音', '作弊或挂机', '其他'];
  D.BAN_REASONS = ['辱骂骚扰', '不良资料（昵称、头像、签名）', '作弊或挂机', '金币异常（刷币、转移金币）', '其他'];
  D.BAN_DURATIONS = [
    { id: '1d', name: '1 天', ms: 864e5 },
    { id: '7d', name: '7 天', ms: 7 * 864e5 },
    { id: '30d', name: '30 天', ms: 30 * 864e5 },
    { id: 'forever', name: '永久', ms: 0 },
  ];
  D.COIN_REASONS = ['客服补偿', '退款扣回', '活动补发', '误发收回'];
  D.WORD_CATS = ['辱骂', '色情', '违法', '广告和联系方式'];
  D.ACCOUNT_TYPES = { guest: '游客', google: 'Google', facebook: 'Facebook', apple: 'Apple', email: '邮箱' };
  D.USER_STATUS = {
    normal: { name: '正常', tone: 'green' },
    banned: { name: '封禁', tone: 'red' },
    deleting: { name: '注销中', tone: 'orange' },
    deleted: { name: '已注销', tone: 'gray' },
  };
  D.SHARE_CHANNELS = [
    ['copy', '复制链接'], ['friends', '好友（app 内私聊）'], ['whatsapp', 'WhatsApp'], ['facebook', 'Facebook'],
    ['messenger', 'Messenger'], ['x', 'X'], ['telegram', 'Telegram'],
  ];
  D.EMOJI_NAMES = {
    happy: '开心', love: '喜欢', laugh: '大笑', wink: '眨眼', cool: '酷', tongue: '吐舌',
    shock: '震惊', cry: '哭', angry: '生气', sleepy: '困', dizzy: '晕', star: '星星眼',
  };
  D.FRAME_RINGS = [['gold', '金色'], ['purple', '紫色'], ['pink', '粉色'], ['blue', '蓝色'], ['vip', '会员金'], ['svip', '超级会员彩色']];
  D.FRAME_POS = [['top', '头顶'], ['br', '右下'], ['bl', '左下'], ['tr', '右上'], ['head', '戴在头上']];
  D.IMAGE_LIB = {
    frame: [['assets/img/frames/wings.png', '天使之翼.png'], ['assets/img/frames/balloon.png', '气球派对.png']],
    deco: [['assets/img/ui/crown.png', '王冠'], ['assets/img/ui/saturn.png', '星球'], ['assets/img/ui/headphones.png', '耳机'], ['assets/img/ui/rocket.png', '火箭'], ['assets/img/ui/sparkle.png', '闪光']],
    bg: [['assets/img/fx/aurora.jpg', '极光.jpg'], ['assets/img/fx/galaxy.jpg', '星河.jpg'], ['assets/img/games/clash-cover.jpg', '竞技场.jpg'], ['assets/img/games/squad-cover.jpg', '花园.jpg']],
    icon: [['assets/img/games/c4.jpg', '四子棋图标.jpg']],
    avatar: [['assets/img/avatars/happy.jpg', '默认头像（卡通宝宝）.jpg'], ['assets/img/brand/blob-face.png', '团子脸.png']],
  };
})();
