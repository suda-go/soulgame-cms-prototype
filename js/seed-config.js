/**
 * 配置的首发值（线上 v1）。数值来自各需求文档的“首发配置 / 配置项”和 V7 原型 js/data.js
 * L(中, 英, 西, 印尼, 印地) 生成 5 种语言的文案
 */
(() => {
  'use strict';
  const IMG = D.IMG;
  const L = (zh, en, es, id, hi) => ({ zh, en, es, id, hi });
  const Seed = (window.Seed = window.Seed || {});
  Seed.L = L;

  const STAKE_NAMES = {
    s1: L('新手场', 'Beginner', 'Principiante', 'Pemula', 'शुरुआती'),
    s2: L('进阶场', 'Advanced', 'Avanzado', 'Mahir', 'एडवांस्ड'),
    s3: L('高手场', 'Expert', 'Experto', 'Ahli', 'एक्सपर्ट'),
    s4: L('大师场', 'Master', 'Maestro', 'Master', 'मास्टर'),
  };
  const T = (id, group, name, metric, goal, coins, jump, sort, o = {}) => ({
    id, group, name, metric, goal, reward: { coins, item: o.item || '' }, jump, sort,
    start: o.start || '', end: o.end || '', enabled: o.enabled !== false,
  });
  const TASKS = [
    T('n_first', 'newbie', L('完成第一局对战', 'Finish your first match', 'Termina tu primera partida', 'Selesaikan pertandingan pertamamu', 'अपना पहला मैच पूरा करें'), 'games', 1, 50, 'home', 1),
    T('n_time', 'newbie', L('游玩3分钟', 'Play for 3 minutes', 'Juega 3 minutos', 'Main selama 3 menit', '3 मिनट खेलें'), 'play_seconds', 3, 50, 'home', 2),
    T('n_friend', 'newbie', L('添加1位好友', 'Add 1 friend', 'Agrega 1 amigo', 'Tambahkan 1 teman', '1 दोस्त जोड़ें'), 'friends_added', 1, 300, 'add_friend', 3),
    T('n_frame', 'newbie', L('装备一个头像框', 'Equip an avatar frame', 'Equipa un marco de avatar', 'Pakai satu bingkai avatar', 'एक अवतार फ़्रेम लगाएँ'), 'frame_equipped', 1, 100, 'shop_decor', 4),
    T('d_play', 'daily', L('玩3局', 'Play 3 matches', 'Juega 3 partidas', 'Main 3 pertandingan', '3 मैच खेलें'), 'games', 3, 200, 'home', 1),
    T('d_win', 'daily', L('赢1局', 'Win 1 match', 'Gana 1 partida', 'Menangkan 1 pertandingan', '1 मैच जीतें'), 'wins', 1, 300, 'home', 2),
    T('d_emoji', 'daily', L('对局中发3个表情', 'Send 3 emojis in matches', 'Envía 3 emojis en partidas', 'Kirim 3 emoji saat bermain', 'मैच में 3 इमोजी भेजें'), 'emotes', 3, 50, 'home', 3),
    T('d_share', 'daily', L('分享1次', 'Share once', 'Comparte 1 vez', 'Bagikan 1 kali', '1 बार शेयर करें'), 'shares', 1, 100, 'share', 4),
    T('w_friend', 'weekly', L('和好友玩3局', 'Play 3 matches with friends', 'Juega 3 partidas con amigos', 'Main 3 pertandingan dengan teman', 'दोस्तों के साथ 3 मैच खेलें'), 'friend_games', 3, 1000, 'friend_list', 1),
    T('w_invite', 'weekly', L('邀请1位好友进房间', 'Invite 1 friend to a room', 'Invita a 1 amigo a una sala', 'Undang 1 teman ke room', '1 दोस्त को रूम में बुलाएँ'), 'room_invites', 1, 800, 'friend_list', 2),
    T('w_win', 'weekly', L('赢10局', 'Win 10 matches', 'Gana 10 partidas', 'Menangkan 10 pertandingan', '10 मैच जीतें'), 'wins', 10, 200, 'home', 3),
    T('l_mate', 'limited', L('加1位一起对局过的玩家为好友', "Add 1 player you've played with as a friend", 'Agrega como amigo a 1 jugador con quien jugaste', 'Jadikan 1 lawan mainmu sebagai teman', 'जिसके साथ खेले हों, ऐसे 1 खिलाड़ी को दोस्त बनाएँ'), 'mates_added', 1, 1000, 'add_friend', 1, { start: '2026-11-01', end: '2026-11-30' }),
    T('l_share', 'limited', L('分享3次', 'Share 3 times', 'Comparte 3 veces', 'Bagikan 3 kali', '3 बार शेयर करें'), 'shares', 3, 1000, 'share', 2, { start: '2026-11-01', end: '2026-12-31' }),
  ];

  /* 装扮（我的 6.2 item_def）。头像框两种做法：图片 + box，或圈色 + 装饰图 */
  const F = (id, name, price, o) => ({ id, kind: 'frame', name, price, vip: o.vip || 0, is_default: false, sort: o.sort, enabled: true, mode: o.img ? 'image' : 'ring', img: o.img || '', box: o.box || [-20, -20, 140, 140], ring: o.ring || 'gold', deco: o.deco || '', pos: o.pos || 'top' });
  const B = (id, name, price, sort, mode, v, o = {}) => ({ id, kind: 'bubble', name, price, vip: 0, is_default: !!o.def, sort, enabled: true, mode, colors: mode === 'gradient' ? v : ['#4cb4ff', '#2a5cff'], img: mode === 'image' ? v : '', css: mode === 'css' ? v : '', text: o.text || '#ffffff' });
  const G = (id, name, price, sort, mode, v, o = {}) => ({ id, kind: 'bg', name, price, vip: 0, is_default: !!o.def, sort, enabled: true, mode, colors: mode === 'gradient' ? v : ['#ffb36b', '#8a5cff'], img: mode === 'image' ? v : '', css: mode === 'css' ? v : '' });
  const ITEMS = [
    F('wings', L('天使之翼', 'Angel Wings', 'Alas de Ángel', 'Sayap Malaikat', 'एंजेल विंग्स'), 300, { sort: 1, img: IMG + 'frames/wings.png', box: [-26.9, -21.2, 153.8, 151.9] }),
    F('balloon', L('气球派对', 'Balloon Party', 'Fiesta de Globos', 'Pesta Balon', 'बैलून पार्टी'), 300, { sort: 2, img: IMG + 'frames/balloon.png', box: [-21.3, -20.4, 139.1, 139.1] }),
    F('crown', L('皇家王冠', 'Royal Crown', 'Corona Real', 'Mahkota Kerajaan', 'शाही ताज'), 500, { sort: 3, ring: 'gold', deco: IMG + 'ui/crown.png', pos: 'top' }),
    F('saturn', L('星球轨道', 'Planet Orbit', 'Órbita Planetaria', 'Orbit Planet', 'ग्रह कक्षा'), 400, { sort: 4, ring: 'purple', deco: IMG + 'ui/saturn.png', pos: 'br' }),
    F('dj', L('节奏大师', 'Rhythm Master', 'Maestro del Ritmo', 'Master Irama', 'रिदम मास्टर'), 400, { sort: 5, ring: 'pink', deco: IMG + 'ui/headphones.png', pos: 'head' }),
    F('rocket', L('火箭冲刺', 'Rocket Dash', 'Carrera Cohete', 'Roket Melesat', 'रॉकेट डैश'), 350, { sort: 6, ring: 'blue', deco: IMG + 'ui/rocket.png', pos: 'bl' }),
    F('vip', L('会员金框', 'VIP Gold Frame', 'Marco Dorado VIP', 'Bingkai Emas VIP', 'VIP गोल्ड फ़्रेम'), 0, { sort: 7, vip: 1, ring: 'vip', deco: IMG + 'ui/sparkle.png', pos: 'tr' }),
    F('svip', L('超级会员框', 'Super VIP Frame', 'Marco Súper VIP', 'Bingkai Super VIP', 'सुपर VIP फ़्रेम'), 0, { sort: 8, vip: 2, ring: 'svip', deco: IMG + 'ui/crown.png', pos: 'top' }),
    B('default', L('经典', 'Classic', 'Clásico', 'Klasik', 'क्लासिक'), 0, 1, 'gradient', ['#4cb4ff', '#2a5cff'], { def: true }),
    B('ocean', L('海洋', 'Ocean', 'Océano', 'Samudra', 'महासागर'), 150, 2, 'gradient', ['#2fe0d5', '#1a8cff']),
    B('candy', L('糖果', 'Candy', 'Caramelo', 'Permen', 'कैंडी'), 150, 3, 'gradient', ['#ffb3d1', '#ff6fa8']),
    B('neon', L('霓虹', 'Neon', 'Neón', 'Neon', 'नियॉन'), 200, 4, 'css', 'background:#14112b;color:#b9f6ff;box-shadow:inset 0 0 0 1.5px #3ef2ff,0 0 12px rgba(62,242,255,.45)'),
    B('galaxy', L('星河', 'Galaxy', 'Galaxia', 'Galaksi', 'आकाशगंगा'), 250, 5, 'image', IMG + 'fx/galaxy.jpg'),
    B('gold', L('鎏金', 'Gilded', 'Dorado', 'Emas', 'सुनहरा'), 300, 6, 'gradient', ['#fff1a8', '#f59e0b'], { text: '#5a3100' }),
    G('aurora', L('极光', 'Aurora', 'Aurora', 'Aurora', 'ऑरोरा'), 0, 1, 'image', IMG + 'fx/aurora.jpg', { def: true }),
    G('sunset', L('日落', 'Sunset', 'Atardecer', 'Senja', 'सूर्यास्त'), 200, 2, 'gradient', ['#ffb36b', '#ff6f91', '#8a5cff']),
    G('galaxy_bg', L('星河', 'Galaxy', 'Galaxia', 'Galaksi', 'आकाशगंगा'), 300, 3, 'image', IMG + 'fx/galaxy.jpg'),
    G('pop', L('波普艺术', 'Pop Art', 'Arte Pop', 'Seni Pop', 'पॉप आर्ट'), 200, 4, 'css', `url(${IMG}fx/halftone.png) right -40px top -60px/220px no-repeat, linear-gradient(135deg, #ff7eb3, #ffcf5c)`),
    G('arena', L('竞技场', 'Arena', 'Arena', 'Arena', 'अखाड़ा'), 400, 5, 'image', IMG + 'games/clash-cover.jpg'),
    G('garden', L('花园', 'Garden', 'Jardín', 'Taman', 'बगीचा'), 250, 6, 'image', IMG + 'games/squad-cover.jpg'),
  ];

  const PHRASES = [
    L('你好！👋', 'Hi! 👋', '¡Hola! 👋', 'Halo! 👋', 'नमस्ते! 👋'),
    L('好棋！', 'Nice move!', '¡Buena jugada!', 'Langkah bagus!', 'बढ़िया चाल!'),
    L('快点啦！⏰', 'Hurry up! ⏰', '¡Rápido! ⏰', 'Ayo cepat! ⏰', 'जल्दी करो! ⏰'),
    L('差一点哦 😏', 'So close 😏', 'Casi 😏', 'Hampir 😏', 'बस थोड़ा सा 😏'),
    L('哎呀！', 'Oops!', '¡Ups!', 'Aduh!', 'उफ़!'),
    L('你真厉害！', "You're good!", '¡Eres bueno!', 'Kamu hebat!', 'तुम कमाल हो!'),
    L('看我的！', 'Watch this!', '¡Mira esto!', 'Lihat ini!', 'ये देखो!'),
    L('打得好 🤝', 'Well played 🤝', 'Bien jugado 🤝', 'Main bagus 🤝', 'अच्छा खेले 🤝'),
  ];

  const NOTES = {
    newbie_gift: L('新手礼包', 'Welcome gift', 'Regalo de bienvenida', 'Hadiah pemula', 'वेलकम गिफ़्ट'),
    offline_income: L('离线收益', 'Offline earnings', 'Ganancias sin conexión', 'Penghasilan offline', 'ऑफ़लाइन कमाई'),
    stake_bet: L('{场次名} · 底注', '{stake} · Entry', '{stake} · Entrada', '{stake} · Taruhan', '{stake} · एंट्री'),
    stake_bet_rematch: L('{场次名} · 底注（再战）', '{stake} · Entry (rematch)', '{stake} · Entrada (revancha)', '{stake} · Taruhan (tanding ulang)', '{stake} · एंट्री (रीमैच)'),
    stake_refund: L('取消匹配 · 退还底注', 'Matchmaking canceled · Entry refunded', 'Búsqueda cancelada · Entrada devuelta', 'Pencarian dibatalkan · Taruhan dikembalikan', 'मैचमेकिंग रद्द · एंट्री वापस'),
    match_fail_refund: L('匹配失败 · 退还底注', 'Matchmaking failed · Entry refunded', 'Búsqueda fallida · Entrada devuelta', 'Pencarian gagal · Taruhan dikembalikan', 'मैचमेकिंग विफल · एंट्री वापस'),
    pot_win: L('{场次名} · 赢得奖池', '{stake} · Pot won', '{stake} · Bote ganado', '{stake} · Menang pot', '{stake} · पॉट जीता'),
    pot_win_double: L('{场次名} · 赢得奖池（翻倍）', '{stake} · Pot won (doubled)', '{stake} · Bote ganado (doble)', '{stake} · Menang pot (ganda)', '{stake} · पॉट जीता (दोगुना)'),
    draw_refund: L('{场次名} · 平局退还底注', '{stake} · Draw, entry refunded', '{stake} · Empate, entrada devuelta', '{stake} · Seri, taruhan dikembalikan', '{stake} · ड्रॉ, एंट्री वापस'),
    abort_refund: L('对局异常 · 退还底注', 'Match error · Entry refunded', 'Error de partida · Entrada devuelta', 'Pertandingan bermasalah · Taruhan dikembalikan', 'मैच में गड़बड़ी · एंट्री वापस'),
    room_bet: L('好友房 · 底注', 'Friend room · Entry', 'Sala de amigos · Entrada', 'Room teman · Taruhan', 'फ्रेंड रूम · एंट्री'),
    room_win: L('好友房 · 赢得奖池', 'Friend room · Pot won', 'Sala de amigos · Bote ganado', 'Room teman · Menang pot', 'फ्रेंड रूम · पॉट जीता'),
    room_draw_refund: L('好友房 · 平局退还底注', 'Friend room · Draw, entry refunded', 'Sala de amigos · Empate, entrada devuelta', 'Room teman · Seri, taruhan dikembalikan', 'फ्रेंड रूम · ड्रॉ, एंट्री वापस'),
    signin: L('签到第{N}天', 'Check-in day {N}', 'Registro día {N}', 'Check-in hari ke-{N}', 'चेक-इन दिन {N}'),
    task_reward: L('{任务名}', '{task}', '{task}', '{task}', '{task}'),
    mystery_chest: L('神秘宝箱', 'Mystery chest', 'Cofre misterioso', 'Peti misteri', 'मिस्ट्री चेस्ट'),
    streak_chest: L('连续7天宝箱', '7-day streak chest', 'Cofre de racha de 7 días', 'Peti 7 hari beruntun', '7-दिन स्ट्रीक चेस्ट'),
    vip_open: L('会员开通', 'VIP activated', 'VIP activado', 'VIP diaktifkan', 'VIP चालू'),
    vip_daily: L('会员每日福利', 'VIP daily bonus', 'Bono diario VIP', 'Bonus harian VIP', 'VIP डेली बोनस'),
    vip_aid: L('会员破产补助', 'VIP top-up aid', 'Ayuda VIP', 'Bantuan VIP', 'VIP सहायता'),
    topup: L('充值{价格}', 'Top-up {price}', 'Recarga {price}', 'Isi ulang {price}', 'टॉप-अप {price}'),
    item_buy: L('购买{装扮名}', 'Bought {item}', 'Compraste {item}', 'Beli {item}', '{item} खरीदा'),
    call_fee: L('{通话类型}', '{call}', '{call}', '{call}', '{call}'),
    call_refund: L('{通话类型}未接通退回', '{call} not answered, refunded', '{call} sin respuesta, reembolsada', '{call} tidak dijawab, dikembalikan', '{call} नहीं उठी, वापस'),
    admin_adjust: L('系统调整', 'System adjustment', 'Ajuste del sistema', 'Penyesuaian sistem', 'सिस्टम एडजस्टमेंट'),
  };

  Seed.configs = () => ({
    game: { games: [{
      id: 'c4', name: L('四子棋', 'Connect 4', 'Conecta 4', 'Connect 4', 'कनेक्ट 4'), icon: IMG + 'games/c4.jpg',
      turn_based: true, turn_seconds: 15, rules_url: 'https://games.soulgame.example/c4/how-to-play',
      intro: L('横、竖、斜连成 4 颗同色棋子就赢了', 'Line up 4 of your color in a row to win', 'Alinea 4 fichas de tu color para ganar', 'Susun 4 bidak warnamu dalam satu garis untuk menang', 'जीतने के लिए अपने रंग की 4 गोटियाँ एक लाइन में लगाएँ'),
      enabled: true,
    }] },
    stakes: { online_source: 'fixed', rows: [
      { id: 's1', name: STAKE_NAMES.s1, bet: 100, pot_multiplier: 2, sort: 1, enabled: true, online: 18600 },
      { id: 's2', name: STAKE_NAMES.s2, bet: 500, pot_multiplier: 2, sort: 2, enabled: true, online: 21400 },
      { id: 's3', name: STAKE_NAMES.s3, bet: 2000, pot_multiplier: 2, sort: 3, enabled: true, online: 9300 },
      { id: 's4', name: STAKE_NAMES.s4, bet: 10000, pot_multiplier: 2, sort: 4, enabled: true, online: 3000 },
    ] },
    match: {
      rr_init: 100, rr_step: 50, rr_every_s: 3, rr_unlimited_s: 15, init_rating: 1500, new_player_games: 5,
      repeat_opponent_limit: 2, vip_wait_weight: 1.5, ready_timeout_s: 10, heartbeat_interval_s: 10, heartbeat_timeout_s: 30,
      background_keep_s: 30, wait_prompt_after_s: 60, auto_cancel_after_prompt_s: 60,
    },
    bot: {
      mode: 'fill',
      fill: [{ stake: 's1', enabled: true, after_s: 10 }, { stake: 's2', enabled: true, after_s: 10 }, { stake: 's3', enabled: true, after_s: 10 }, { stake: 's4', enabled: true, after_s: 10 }],
      ai_button_after_s: 5, target_win_rate: 50, think_ms: [800, 2100],
      tiers: [{ name: '入门', rating_max: 1350, strength: 60 }, { name: '普通', rating_max: 1650, strength: 75 }, { name: '困难', rating_max: 99999, strength: 85 }],
      personas: [
        { id: 'b01', name: '小鹿', avatar: '', frame: '', bio: '慢慢下，稳稳赢', games: 126, win: 51, lang: 'zh' },
        { id: 'b02', name: 'Kiki', avatar: '', frame: 'balloon', bio: 'just for fun ✌️', games: 88, win: 49, lang: 'en' },
        { id: 'b03', name: 'Mateo', avatar: '', frame: '', bio: '¡A jugar!', games: 152, win: 53, lang: 'es' },
        { id: 'b04', name: 'Putri', avatar: '', frame: 'rocket', bio: 'santai aja', games: 64, win: 47, lang: 'id' },
        { id: 'b05', name: 'Aarav', avatar: '', frame: '', bio: 'चलो खेलते हैं', games: 97, win: 50, lang: 'hi' },
        { id: 'b06', name: '阿杰', avatar: '', frame: '', bio: '下班来一局', games: 201, win: 52, lang: 'zh' },
      ],
      ai_names: [{ name: L('诺娃', 'Nova', 'Nova', 'Nova', 'नोवा'), avatar: IMG + 'brand/blob-face.png' }],
    },
    gameplay: { timeout_forfeit_count: 2, disconnect_forfeit_s: 60, reconnect_interval_ms: 2000, intro_ms: 1500, end_to_result_ms: 2000, end_to_result_draw_ms: 1200, rematch_wait_s: 10, result_tasks_max: 3 },
    emotes: {
      interval_s: 3, max_per_game: 30, danmaku_max: 3, log_days: 7,
      emojis: Emoji.types.map((id, i) => ({ id, enabled: true, sort: i + 1 })),
      phrases: PHRASES.map((text, i) => ({ id: 'p' + (i + 1), game: 'c4', text, enabled: true })),
    },
    room: { bets: [{ bet: 100 }, { bet: 500 }, { bet: 2000 }, { bet: 10000 }], default_bet: 100, countdown_s: 3 },
    newbie: { coins: 1500, device_daily_limit: 3 },
    offline: { min_hours: 1, coins_per_hour: 10, max_hours: 10, daily_times: 3 },
    double_pot: { enabled: true, daily_times: 1 },
    signin: {
      days: [100, 150, 200, 250, 300, 400, 1000].map((coins, i) => ({ day: i + 1, coins, frame: i === 6 ? 'balloon' : '' })),
      dup_frame_coins: 300,
    },
    tasks: { rows: TASKS },
    mystery: { rows: [
      { id: 'm_win', name: TASKS[5].name, metric: 'wins', goal: 1, jump: 'home', weight: 1 },
      { id: 'm_emoji', name: TASKS[6].name, metric: 'emotes', goal: 3, jump: 'home', weight: 1 },
      { id: 'm_play', name: L('玩2局', 'Play 2 matches', 'Juega 2 partidas', 'Main 2 pertandingan', '2 मैच खेलें'), metric: 'games', goal: 2, jump: 'home', weight: 1 },
    ] },
    chests: { mystery: [600, 700, 800, 900].map((coins) => ({ coins, weight: 1 })), streak_coins: 4000, show_range: true },
    anticheat: { min_moves: 3, max_play_minutes: 30, share_dedupe_minutes: 1 },
    items: { rows: ITEMS },
    packs: { rows: [
      { id: 'c1', product_id: 'com.soulgame.coins.600', usd: 0.99, coins: 600, bonus: 0, first_double: true, sort: 1, enabled: true },
      { id: 'c2', product_id: 'com.soulgame.coins.3000', usd: 4.99, coins: 3000, bonus: 300, first_double: true, sort: 2, enabled: true },
      { id: 'c3', product_id: 'com.soulgame.coins.6800', usd: 9.99, coins: 6800, bonus: 1000, first_double: true, sort: 3, enabled: true },
      { id: 'c4', product_id: 'com.soulgame.coins.12800', usd: 19.99, coins: 12800, bonus: 2400, first_double: true, sort: 4, enabled: true },
    ] },
    vip: { tiers: [
      { id: 0, name: L('普通用户', 'Regular', 'Normal', 'Biasa', 'सामान्य'), product_id: '', usd: 0, bonus: 0, daily: 0, aid_times: 0, aid_coins: 500, sign: 1, friend_cap: 100, voice_free: false, video_free: false, priority: false, pin: false, frame: '', entry_fx: false, stickers: 0 },
      { id: 1, name: L('会员', 'VIP', 'VIP', 'VIP', 'VIP'), product_id: 'com.soulgame.vip.monthly', usd: 4.99, bonus: 3000, daily: 1000, aid_times: 1, aid_coins: 500, sign: 2, friend_cap: 200, voice_free: true, video_free: false, priority: true, pin: true, frame: 'vip', entry_fx: false, stickers: 1 },
      { id: 2, name: L('超级会员', 'Super VIP', 'Súper VIP', 'Super VIP', 'सुपर VIP'), product_id: 'com.soulgame.svip.monthly', usd: 14.99, bonus: 12000, daily: 3000, aid_times: 2, aid_coins: 500, sign: 3, friend_cap: 500, voice_free: true, video_free: true, priority: true, pin: true, frame: 'svip', entry_fx: true, stickers: 3 },
    ] },
    call: { voice: 200, video: 500, max_minutes: 30 },
    share: {
      text: L('快来 Soulgame 和我一起玩四子棋！', 'Come play Connect 4 with me on Soulgame!', '¡Ven a jugar Conecta 4 conmigo en Soulgame!', 'Ayo main Connect 4 bareng aku di Soulgame!', 'Soulgame पर मेरे साथ कनेक्ट 4 खेलो!'),
      result_text: L('我刚在{game}里赢了{opponent}！🏆', 'I just beat {opponent} in {game}! 🏆', '¡Acabo de ganarle a {opponent} en {game}! 🏆', 'Aku baru saja mengalahkan {opponent} di {game}! 🏆', 'मैंने अभी {game} में {opponent} को हराया! 🏆'),
      landing_url: 'https://soulgame.example/s/{展示ID}',
      channels: D.SHARE_CHANNELS.map(([id]) => ({ id, enabled: true })),
    },
    legal: {
      terms_url: L(...D.LANGS.map((l) => `https://soulgame.example/legal/terms?lang=${l.id}`)),
      privacy_url: L(...D.LANGS.map((l) => `https://soulgame.example/legal/privacy?lang=${l.id}`)),
      version: '1.0', reconsent: false, support_email: 'support@soulgame.example',
    },
    defaults: { nickname: 'happy', avatar: IMG + 'avatars/happy.jpg' },
    display: {
      login_online: 1000,
      login_text: L('超过{N}人正在一起玩游戏', '{N}+ people are playing together', 'Más de {N} personas están jugando juntas', 'Lebih dari {N} orang sedang bermain bersama', '{N} से ज़्यादा लोग साथ में खेल रहे हैं'),
      home_source: 'fixed', home_online: 52300,
    },
    limits: { bio_max: 60, bio_daily_edits: 20, block_max: 500 },
    jumps: { rows: D.JUMP_DEFAULT.map((j) => ({ ...j })) },
    sysmsg: { rows: [
      { key: 'welcome', name: '欢迎消息', trigger: '新账号第一次进入（功能清单 #27）', status: '在用', text: L('欢迎来到 Soulgame！快速开始找人下一局，或者约好友一起玩，赢家拿走奖池。', 'Welcome to Soulgame! Hit Quick Start to find a match, or invite friends to play. The winner takes the pot.', '¡Bienvenido a Soulgame! Usa Inicio rápido para encontrar partida o invita a tus amigos. El ganador se lleva el bote.', 'Selamat datang di Soulgame! Tekan Mulai Cepat untuk cari lawan, atau ajak teman main. Pemenang ambil semua pot.', 'Soulgame में आपका स्वागत है! मैच ढूँढने के लिए क्विक स्टार्ट दबाएँ या दोस्तों को बुलाएँ। जीतने वाला पूरा पॉट ले जाता है।') },
      { key: 'bio_cleared', name: '签名被清除', trigger: '签名复审不通过、举报处理清空签名（我的 6.4）', status: '在用', text: L('你的个性签名不符合社区规范，已被清除', "Your bio didn't meet our community guidelines and has been removed.", 'Tu biografía no cumplía las normas de la comunidad y se ha eliminado.', 'Bio kamu tidak sesuai pedoman komunitas dan telah dihapus.', 'आपका बायो कम्युनिटी नियमों के अनुरूप नहीं था, इसलिए हटा दिया गया है।') },
      { key: 'profile_reset', name: '昵称头像被重置', trigger: '后台重置昵称或头像（规划 4.1，建议新增）', status: '在用', text: L('你的昵称或头像不符合社区规范，已恢复为默认', "Your nickname or avatar didn't meet our community guidelines and has been reset.", 'Tu apodo o avatar no cumplía las normas de la comunidad y se ha restablecido.', 'Nama atau avatar kamu tidak sesuai pedoman komunitas dan telah dikembalikan ke default.', 'आपका निकनेम या अवतार कम्युनिटी नियमों के अनुरूप नहीं था, इसलिए रीसेट कर दिया गया है।') },
      { key: 'compensation', name: '补偿到账', trigger: '后台加金币时勾选“通知用户”（建议新增）', status: '在用', text: L('{N} 金币已到账，备注：{原因}', '{N} coins have been added to your account. Note: {reason}', 'Se han añadido {N} monedas a tu cuenta. Nota: {reason}', '{N} koin telah masuk ke akunmu. Catatan: {reason}', 'आपके खाते में {N} सिक्के जोड़ दिए गए हैं। नोट: {reason}') },
      { key: 'penalty', name: '处罚通知', trigger: '封号前发给用户（待账号与登录模块确认，见规划第七章）', status: '待确认', text: L('你的账号因违反社区规范被限制使用，到期时间：{到期时间}', 'Your account has been restricted for violating our community guidelines until {until}.', 'Tu cuenta ha sido restringida por infringir las normas de la comunidad hasta el {until}.', '', '') },
      { key: 'report_result', name: '举报处理结果', trigger: '举报处理完通知举报人（P1）', status: '待确认', text: L('你举报的用户已被处理，感谢你帮助维护社区环境', "Thanks for your report. We've taken action on this user.", 'Gracias por tu reporte. Hemos tomado medidas con este usuario.', '', '') },
    ] },
    push: { rows: [
      { key: 'invite', name: '游戏邀请', switch: 'notify_invite', channel: 'game_invite', title: L('{好友名}邀请你一起玩', '{friend} invited you to play', '{friend} te invitó a jugar', '{friend} mengajakmu main', '{friend} ने आपको खेलने बुलाया'), body: L('游戏 · {好友名}的房间 {人数}/{上限}', "Game · {friend}'s room {n}/{max}", 'Juego · Sala de {friend} {n}/{max}', 'Game · Room {friend} {n}/{max}', 'गेम · {friend} का रूम {n}/{max}') },
      { key: 'friend_request', name: '好友申请', switch: 'notify_friend_request', channel: 'friend_request', title: L('{昵称}想加你为好友', '{name} wants to be your friend', '{name} quiere ser tu amigo', '{name} ingin berteman denganmu', '{name} आपका दोस्त बनना चाहते हैं'), body: L('点击查看好友申请', 'Tap to view the request', 'Toca para ver la solicitud', 'Ketuk untuk melihat permintaan', 'रिक्वेस्ट देखने के लिए टैप करें') },
      { key: 'friend_accepted', name: '对方通过了好友申请', switch: '', channel: 'friend_request', title: L('{对手名}通过了你的好友申请', '{name} accepted your friend request', '{name} aceptó tu solicitud de amistad', '{name} menerima permintaan pertemananmu', '{name} ने आपकी फ्रेंड रिक्वेस्ट स्वीकार की'), body: L('你们已经是好友了，打个招呼吧！', "You're friends now. Say hi!", 'Ya son amigos. ¡Salúdalo!', 'Kalian sudah berteman. Sapa yuk!', 'अब आप दोस्त हैं। हाय बोलिए!') },
      { key: 'room_joined', name: '有人进了你的房间', switch: '', channel: 'game_invite', title: L('{昵称}进入了你的房间', '{name} joined your room', '{name} entró a tu sala', '{name} masuk ke room-mu', '{name} आपके रूम में आए'), body: L('快回去开局吧', 'Head back and start the match', 'Vuelve y empieza la partida', 'Kembali dan mulai pertandingan', 'वापस जाकर मैच शुरू करें') },
    ] },
    i18n: { rows: [
      ...Object.entries(NOTES).map(([k, text]) => ({ key: 'note.' + k, group: '明细备注', text })),
      { key: 'misc.deleted_user', group: '通用', text: L('已注销用户', 'Deleted user', 'Usuario eliminado', 'Pengguna dihapus', 'हटाया गया उपयोगकर्ता') },
      { key: 'misc.banned', group: '通用', text: L('账号已被封禁', 'This account has been banned', 'Esta cuenta ha sido suspendida', 'Akun ini telah diblokir', 'यह अकाउंट बैन कर दिया गया है') },
      { key: 'misc.stake_changed', group: '通用', text: L('场次有调整，请重新选择', 'Rooms have changed. Please choose again.', 'Las salas cambiaron. Elige de nuevo.', 'Arena berubah. Silakan pilih lagi.', 'रूम बदल गए हैं। कृपया फिर से चुनें।') },
      { key: 'misc.call_voice', group: '通用', text: L('语音通话', 'Voice call', 'Llamada de voz', 'Panggilan suara', 'वॉइस कॉल') },
      { key: 'misc.call_video', group: '通用', text: L('视频通话', 'Video call', 'Videollamada', 'Panggilan video', 'वीडियो कॉल') },
    ] },
  });

  /* 线上版本历史：除了 v1，部分配置还有改过的版本，用来演示差异和回滚 */
  Seed.history = (c) => {
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const stakesV1 = clone(c.stakes);
    [15000, 18000, 8000, 2000].forEach((n, i) => { stakesV1.rows[i].online = n; });
    const itemsV1 = clone(c.items);
    itemsV1.rows.find((r) => r.id === 'dj').price = 450;
    const tasksV1 = clone(c.tasks);
    tasksV1.rows.find((r) => r.id === 'l_share').end = '2026-11-30';
    return {
      stakes: [{ data: stakesV1, note: '首发配置（首页 6.2、匹配 4.1）', by: 'dev', ago: 50 }, { data: c.stakes, note: '在玩人数按最近一周峰值调整', by: 'ops', ago: 20, approval: 'AP1990' }],
      items: [{ data: itemsV1, note: '首发配置（原型 data.js）', by: 'ops', ago: 50 }, { data: c.items, note: '节奏大师降价到 400，和星球轨道一致', by: 'ops', ago: 30, approval: 'AP1985' }],
      tasks: [{ data: tasksV1, note: '首发配置（签到与任务 6.8）', by: 'ops', ago: 50 }, { data: c.tasks, note: '限时任务“分享3次”延长到年底', by: 'ops', ago: 26, approval: 'AP1988' }],
    };
  };
})();
