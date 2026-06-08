// 月栖 App - standalone dist bundle
// Directly usable in Tavern Helper as dist/月栖app/index.js

(() => {
  const SCRIPT_ID = typeof getScriptId === 'function' ? getScriptId() : 'moonn-app';
  const ROOT_ID = `moonn-float-${SCRIPT_ID}`;
  const STYLE_ID = `moonn-style-${SCRIPT_ID}`;
  const POS_KEY = `moonn-pos-${SCRIPT_ID}`;

  function getParentDocument() {
    try {
      if (window.parent && window.parent.document) return window.parent.document;
    } catch (_) {}
    return document;
  }

  function getParentWindow() {
    try {
      if (window.parent) return window.parent;
    } catch (_) {}
    return window;
  }

  const parentDocument = getParentDocument();
  const parentWindow = getParentWindow();

  function removeElement(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function cleanupMoonn() {
    [document, parentDocument].forEach(doc => {
      if (!doc) return;
      removeElement(doc.getElementById(ROOT_ID));
      removeElement(doc.getElementById(STYLE_ID));
      Array.from(doc.querySelectorAll(`[script_id="${SCRIPT_ID}"], [script_id^="${SCRIPT_ID}-"]`)).forEach(removeElement);
    });
  }

  cleanupMoonn();

  function safeToast(type, message, title) {
    try {
      if (window.toastr && toastr[type]) toastr[type](message, title);
    } catch (_) {}
  }

  function safeTrigger() {
    try {
      if (typeof triggerSlash === 'function') {
        const result = triggerSlash('/trigger');
        if (result && typeof result.catch === 'function') result.catch(error => console.error('[月栖] 触发回复失败:', error));
      }
    } catch (_) {}
  }

  function sendPrompt(id, content) {
    try {
      if (typeof injectPrompts === 'function') {
        injectPrompts(
          [{ id, role: 'user', content, position: 'in_chat', depth: 0, should_scan: true }],
          { once: true },
        );
      }
      safeTrigger();
      safeToast('info', '已提交，正在等待回复...', '月栖');
      return true;
    } catch (error) {
      console.error('[月栖] 发送提示词失败:', error);
      safeToast('error', '发送失败，请查看控制台', '月栖');
      return false;
    }
  }

  function emptySocial() {
    return {
      群聊列表: {},
      好友列表: {},
      论坛帖子: {},
      商店商品: {},
    };
  }

  function asObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value ?? {}));
    } catch (_) {
      return {};
    }
  }

  function currentMessageOption() {
    const messageId = typeof getLastMessageId === 'function' ? getLastMessageId() : 'latest';
    return { type: 'message', message_id: messageId };
  }

  function nowText() {
    const date = new Date();
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  function uniqueRecordKey(prefix = '用户') {
    const date = new Date();
    return `${prefix}-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function getByPath(object, path, fallback) {
    let current = object;
    for (const key of path) {
      if (!current || typeof current !== 'object' || !(key in current)) return fallback;
      current = current[key];
    }
    return current ?? fallback;
  }

  function normalizeSocial(raw) {
    const root = asObject(raw);
    const social = asObject(root.月栖社交 || root);
    return {
      群聊列表: asObject(social.群聊列表),
      好友列表: asObject(social.好友列表),
      论坛帖子: asObject(social.论坛帖子),
      商店商品: asObject(social.商店商品),
    };
  }

  function readMvuData() {
    try {
      if (typeof Mvu !== 'undefined' && Mvu && typeof Mvu.getMvuData === 'function') {
        return clone(Mvu.getMvuData(currentMessageOption()));
      }
    } catch (error) {
      console.warn('[月栖] 读取 MVU 数据失败:', error);
    }
    return {};
  }

  function readSocialData() {
    const data = readMvuData();
    try {
      return normalizeSocial(getByPath(data, ['stat_data'], {}));
    } catch (error) {
      console.warn('[月栖] 读取月栖社交数据失败:', error);
    }
    return emptySocial();
  }

  async function replaceMvuData(data) {
    if (typeof Mvu === 'undefined' || !Mvu || typeof Mvu.replaceMvuData !== 'function') {
      return false;
    }
    await Mvu.replaceMvuData(data, currentMessageOption());
    return true;
  }

  async function updateLocalSocial(mutator) {
    const data = readMvuData();
    data.stat_data = asObject(data.stat_data);
    data.stat_data.月栖社交 = normalizeSocial(data.stat_data.月栖社交);
    mutator(data.stat_data.月栖社交);
    state.social = normalizeSocial(data.stat_data.月栖社交);
    render();
    try {
      const saved = await replaceMvuData(data);
      if (saved) {
        safeToast('success', '已写入当前对话变量', '月栖');
        return true;
      }
    } catch (error) {
      console.error('[月栖] 写入 MVU 数据失败:', error);
    }
    safeToast('warning', '界面已更新，但写入变量失败', '月栖');
    return false;
  }

  function ensureGroup(social, name) {
    social.群聊列表[name] = asObject(social.群聊列表[name]);
    social.群聊列表[name].聊天记录 = asObject(social.群聊列表[name].聊天记录);
    if (social.群聊列表[name].群成员数 === undefined) social.群聊列表[name].群成员数 = 0;
    if (social.群聊列表[name].群公告 === undefined) social.群聊列表[name].群公告 = '无';
    return social.群聊列表[name];
  }

  function ensureFriend(social, name) {
    social.好友列表[name] = asObject(social.好友列表[name]);
    social.好友列表[name].聊天记录 = asObject(social.好友列表[name].聊天记录);
    if (social.好友列表[name].状态 === undefined) social.好友列表[name].状态 = '在线';
    if (social.好友列表[name].头像 === undefined) social.好友列表[name].头像 = '👤';
    if (social.好友列表[name].未读消息数 === undefined) social.好友列表[name].未读消息数 = 0;
    return social.好友列表[name];
  }

  function addLocalGroupMessage(groupName, text) {
    return updateLocalSocial(social => {
      const group = ensureGroup(social, groupName);
      group.聊天记录[uniqueRecordKey('用户群聊')] = {
        发言人: '{{user}}',
        头像: '🌙',
        类型: 'text',
        内容: text,
        时间: nowText(),
      };
    });
  }

  function addLocalPmMessage(friendName, text) {
    return updateLocalSocial(social => {
      const friend = ensureFriend(social, friendName);
      friend.聊天记录[uniqueRecordKey('用户私聊')] = {
        发送方: 'self',
        类型: 'text',
        内容: text,
        时间: nowText(),
      };
      friend.未读消息数 = 0;
    });
  }

  function addLocalForumPost(title, type, content) {
    return updateLocalSocial(social => {
      social.论坛帖子[title] = {
        作者网名: '{{user}}',
        头像: '🌙',
        类型标签: type,
        正文: content,
        图片描述: '无',
        点赞数: 0,
        发帖时间: nowText(),
        评论列表: {},
      };
    });
  }

  function addLocalForumComment(title, text) {
    return updateLocalSocial(social => {
      const post = asObject(social.论坛帖子[title]);
      post.评论列表 = asObject(post.评论列表);
      post.评论列表[uniqueRecordKey('用户评论')] = {
        评论人: '{{user}}',
        内容: text,
        时间: nowText(),
      };
      social.论坛帖子[title] = post;
    });
  }

  function addLocalForumLike(title) {
    return updateLocalSocial(social => {
      const post = asObject(social.论坛帖子[title]);
      post.点赞数 = Number(post.点赞数 || 0) + 1;
      social.论坛帖子[title] = post;
    });
  }

  function addLocalShopPurchase(name) {
    return updateLocalSocial(social => {
      const forumTitle = '🛒 我的购物记录';
      const post = asObject(social.论坛帖子[forumTitle]);
      post.作者网名 = '月栖商店';
      post.头像 = '🛒';
      post.类型标签 = '购物记录🛒';
      post.正文 = post.正文 || '这里记录你在月栖商店中的购买行为。';
      post.图片描述 = '无';
      post.点赞数 = Number(post.点赞数 || 0);
      post.发帖时间 = post.发帖时间 || nowText();
      post.评论列表 = asObject(post.评论列表);
      post.评论列表[uniqueRecordKey('购买记录')] = {
        评论人: '{{user}}',
        内容: `购买了商品：${name}`,
        时间: nowText(),
      };
      social.论坛帖子[forumTitle] = post;
    });
  }

  const IMAGE_POOLS = {
    跳蛋: ['https://files.catbox.moe/a5sn8a.png', 'https://files.catbox.moe/bhwv5y.png', 'https://files.catbox.moe/cr6urj.png', 'https://files.catbox.moe/whrrc1.png'],
    办公室露出: ['https://files.catbox.moe/owxs0r.png', 'https://files.catbox.moe/85fw24.png', 'https://files.catbox.moe/njev13.png', 'https://files.catbox.moe/shsme9.png', 'https://files.catbox.moe/s8mva6.png'],
    捆绑: ['https://files.catbox.moe/cg7bm5.png', 'https://files.catbox.moe/fsdqe3.png'],
    口球: ['https://files.catbox.moe/cg7bm5.png', 'https://files.catbox.moe/fsdqe3.png'],
    假阳具: ['https://files.catbox.moe/jruyzd.png', 'https://files.catbox.moe/s46tww.png', 'https://files.catbox.moe/zyxzm0.png', 'https://files.catbox.moe/vwob0j.png', 'https://files.catbox.moe/3yf91i.png', 'https://files.catbox.moe/wd775z.png', 'https://files.catbox.moe/acem86.png'],
    乳交: ['https://files.catbox.moe/3pc41z.png'],
    自慰: ['https://files.catbox.moe/dar111.png', 'https://files.catbox.moe/hrz1ro.png'],
    束缚: ['https://files.catbox.moe/cg7bm5.png'],
    乳夹: ['https://files.catbox.moe/cg7bm5.png'],
  };

  const imageCache = new Map();
  function parseImageContent(text) {
    const source = String(text || '');
    if (imageCache.has(source)) return imageCache.get(source);
    const tags = [];
    const caption = source.replace(/\[([^\]]+)\]/g, (_, tag) => {
      tags.push(tag);
      return '';
    }).trim();
    const urls = tags.flatMap(tag => IMAGE_POOLS[tag] || []);
    const parsed = urls.length ? { url: urls[Math.floor(Math.random() * urls.length)], caption } : { url: null, caption: source.trim() };
    imageCache.set(source, parsed);
    return parsed;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sortedEntries(record) {
    return Object.keys(asObject(record)).sort().map(key => [key, record[key]]);
  }

  const css = `
#${ROOT_ID}{position:fixed!important;z-index:999999999!important;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}
#${ROOT_ID} *{box-sizing:border-box}
#${ROOT_ID} .moonn-ball,#${ROOT_ID} .moonn-panel{pointer-events:auto}
#${ROOT_ID} .moonn-ball{position:fixed;z-index:100000;width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#6c3ce0,#a855f7);box-shadow:0 4px 20px rgba(108,60,224,.5),0 0 0 3px rgba(168,85,247,.15);color:#fff;display:flex;align-items:center;justify-content:center;cursor:grab;user-select:none;touch-action:none;transition:transform .2s,box-shadow .2s}
#${ROOT_ID} .moonn-ball:hover{transform:scale(1.08);box-shadow:0 6px 28px rgba(108,60,224,.6),0 0 0 4px rgba(168,85,247,.2)}
#${ROOT_ID} .moonn-ball.dragging{cursor:grabbing;transform:scale(1.04)}
#${ROOT_ID} .moonn-ball svg{width:22px;height:22px;pointer-events:none}
#${ROOT_ID} .moonn-panel{position:fixed;z-index:99999;width:375px;height:680px;background:#0d0b1e;box-shadow:0 16px 60px rgba(0,0,0,.6),0 0 0 1px rgba(108,60,224,.2);border-radius:20px;display:none;overflow:hidden;color:#e2e8f0}
#${ROOT_ID} .moonn-panel.show{display:block}
#${ROOT_ID} .phone{display:flex;flex-direction:column;width:100%;height:100%;background:linear-gradient(160deg,#0d0b1e 0%,#140f28 40%,#0a1028 70%,#0d0b1e 100%);font-size:13px;color:#e2e8f0;overflow:hidden;position:relative;line-height:1.4}
#${ROOT_ID} .status-bar{display:flex;justify-content:space-between;padding:6px 16px;font-size:11px;color:#9488ad;background:rgba(0,0,0,.3);flex-shrink:0}
#${ROOT_ID} .app-header{text-align:center;padding:12px 16px 4px;flex-shrink:0}
#${ROOT_ID} .logo{font-size:1.4em;font-weight:700;color:#fff;text-shadow:0 0 14px rgba(168,85,247,.6),0 0 28px rgba(168,85,247,.3);letter-spacing:3px}
#${ROOT_ID} .slogan{font-size:.7em;color:#4a4565;font-style:italic;margin-top:1px}
#${ROOT_ID} .tab-bar{display:flex;justify-content:space-around;padding:3px 8px;background:rgba(15,12,35,.65);backdrop-filter:blur(8px);border-bottom:1px solid rgba(168,85,247,.15);flex-shrink:0}
#${ROOT_ID} .tab{display:flex;flex-direction:column;align-items:center;gap:1px;background:none;border:none;color:#4a4565;font-size:.7em;padding:6px 12px;border-radius:10px;cursor:pointer;transition:all .25s;font-family:inherit;-webkit-tap-highlight-color:transparent}
#${ROOT_ID} .tab:hover{color:#c084fc;background:rgba(168,85,247,.05)}
#${ROOT_ID} .tab.active{color:#e9d5ff;background:rgba(168,85,247,.12);text-shadow:0 0 6px rgba(168,85,247,.4)}
#${ROOT_ID} .tab-icon{font-size:1.5em}
#${ROOT_ID} .body{flex:1 1 0;min-height:0;display:flex;flex-direction:column;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
#${ROOT_ID} .body::-webkit-scrollbar,#${ROOT_ID} .list::-webkit-scrollbar,#${ROOT_ID} .msg-list::-webkit-scrollbar{width:3px}
#${ROOT_ID} .body::-webkit-scrollbar-thumb,#${ROOT_ID} .list::-webkit-scrollbar-thumb,#${ROOT_ID} .msg-list::-webkit-scrollbar-thumb{background:rgba(168,85,247,.22);border-radius:2px}
#${ROOT_ID} .panel{padding:10px 12px;display:flex;flex-direction:column;flex:1 1 0;min-height:0}
#${ROOT_ID} .empty{text-align:center;padding:40px 16px;color:#4a4565;font-size:.88em}
#${ROOT_ID} .list{flex:1 1 0;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch}
#${ROOT_ID} .list-item{display:flex;align-items:center;gap:10px;padding:10px;border-radius:10px;cursor:pointer;transition:background .2s,border-color .2s;border:1px solid transparent;-webkit-tap-highlight-color:transparent}
#${ROOT_ID} .list-item:hover{background:rgba(168,85,247,.05);border-color:rgba(168,85,247,.15)}
#${ROOT_ID} .list-item:active{transform:scale(.98)}
#${ROOT_ID} .avatar{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:.9em;flex-shrink:0;position:relative;border:none}
#${ROOT_ID} .avatar--grp{background:linear-gradient(135deg,rgba(99,102,241,.22),rgba(168,85,247,.25));border:1px solid rgba(99,102,241,.15)}
#${ROOT_ID} .avatar--pm{background:linear-gradient(135deg,rgba(236,72,153,.12),rgba(168,85,247,.18));border:1px solid rgba(236,72,153,.12)}
#${ROOT_ID} .online-dot{position:absolute;bottom:-1px;right:-1px;width:8px;height:8px;border-radius:50%;border:2px solid #0d0b1e;font-style:normal}
#${ROOT_ID} .online-dot.on{background:#22c55e;box-shadow:0 0 5px rgba(34,197,94,.5)}
#${ROOT_ID} .online-dot.busy{background:#f59e0b;box-shadow:0 0 5px rgba(245,158,11,.4)}
#${ROOT_ID} .online-dot.off{background:#4a4565}
#${ROOT_ID} .info{flex:1;min-width:0}
#${ROOT_ID} .name{font-size:.88em;font-weight:600;color:#e9d5ff}
#${ROOT_ID} .preview{font-size:.72em;color:#4a4565;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#${ROOT_ID} .meta{text-align:right;flex-shrink:0}
#${ROOT_ID} .badge-sm{font-size:.62em;color:#4a4565;background:rgba(74,69,101,.15);padding:2px 7px;border-radius:8px}
#${ROOT_ID} .unread{display:inline-block;background:#ec4899;color:#fff;font-size:.6em;font-weight:700;padding:2px 6px;border-radius:10px;min-width:16px;text-align:center;box-shadow:0 0 6px rgba(236,72,153,.4)}
#${ROOT_ID} .chat-view{display:flex;flex-direction:column;flex:1 1 0;min-height:0}
#${ROOT_ID} .chat-hdr{display:flex;align-items:center;gap:10px;padding:8px 10px;background:rgba(25,20,50,.5);border-radius:12px;margin-bottom:6px;border:1px solid rgba(168,85,247,.15);flex-shrink:0}
#${ROOT_ID} .back-btn{background:rgba(168,85,247,.12);border:1px solid rgba(168,85,247,.15);color:#c084fc;padding:5px 10px;border-radius:8px;cursor:pointer;font-size:1em;font-family:inherit;-webkit-tap-highlight-color:transparent}
#${ROOT_ID} .chat-title{font-weight:600;color:#e9d5ff;flex:1}
#${ROOT_ID} .mvu-tag{display:inline-flex;align-items:center;gap:3px;font-size:.58em;color:#06b6d4;background:rgba(6,182,212,.08);border:1px solid rgba(6,182,212,.12);padding:2px 6px;border-radius:6px}
#${ROOT_ID} .mvu-dot{width:5px;height:5px;border-radius:50%;background:#06b6d4;animation:moonnBlink 2s infinite;display:inline-block;font-style:normal}@keyframes moonnBlink{0%,100%{opacity:.5}50%{opacity:1}}
#${ROOT_ID} .chat-notice{font-size:.72em;color:#9488ad;background:rgba(25,20,50,.4);padding:6px 10px;border-radius:8px;margin-bottom:4px;white-space:pre-wrap;flex-shrink:0}
#${ROOT_ID} .msg-list{flex:1 1 0;min-height:0;display:flex;flex-direction:column;gap:4px;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:4px;margin-bottom:6px}
#${ROOT_ID} .msg-item{display:flex;gap:8px;align-items:flex-start;padding:5px 6px;border-radius:8px;transition:background .2s}
#${ROOT_ID} .msg-item:hover{background:rgba(168,85,247,.03)}
#${ROOT_ID} .msg-self{flex-direction:row-reverse}
#${ROOT_ID} .msg-self .msg-body{text-align:right;display:flex;flex-direction:column;align-items:flex-end}
#${ROOT_ID} .msg-self .msg-name{color:#06b6d4}
#${ROOT_ID} .msg-self .msg-imgreal,#${ROOT_ID} .msg-self .msg-imgtxt,#${ROOT_ID} .msg-self .msg-voice,#${ROOT_ID} .msg-self .msg-sticker{text-align:left}
#${ROOT_ID} .msg-av{width:26px;height:26px;border-radius:6px;background:rgba(168,85,247,.12);display:flex;align-items:center;justify-content:center;font-size:.85em;flex-shrink:0;border:1px solid rgba(168,85,247,.15)}
#${ROOT_ID} .msg-body{flex:1;min-width:0}
#${ROOT_ID} .msg-name{font-size:.75em;font-weight:600;color:#c084fc;margin-bottom:1px}
#${ROOT_ID} .msg-ct{font-size:.82em;color:#d1d5db;word-break:break-word;white-space:pre-wrap}
#${ROOT_ID} .msg-time{font-size:.6em;color:#4a4565;margin-top:2px}
#${ROOT_ID} .msg-voice{display:inline-flex;align-items:center;gap:5px;background:rgba(6,182,212,.08);border:1px solid rgba(6,182,212,.15);padding:4px 10px;border-radius:14px;font-size:.82em;color:#67e8f9}
#${ROOT_ID} .msg-sticker{background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.15);padding:4px 10px;border-radius:8px;font-size:.82em;color:#fcd34d}
#${ROOT_ID} .msg-imgtxt{background:rgba(236,72,153,.06);border:1px dashed rgba(236,72,153,.2);padding:8px 10px;border-radius:8px;font-size:.78em;color:#f9a8d4;font-style:italic;max-width:260px;word-break:break-word}
#${ROOT_ID} .msg-imgreal{max-width:240px;border-radius:10px;overflow:hidden;border:1px solid rgba(236,72,153,.2);cursor:pointer;background:rgba(0,0,0,.12)}
#${ROOT_ID} .msg-imgreal img{width:100%;display:block;transition:transform .2s}#${ROOT_ID} .msg-imgreal img:hover{transform:scale(1.02)}
#${ROOT_ID} .msg-imgcap{font-size:.72em;color:#f9a8d4;padding:5px 8px;background:rgba(236,72,153,.05);font-style:italic;word-break:break-word}
#${ROOT_ID} .input-bar{display:flex;gap:6px;padding:8px;background:rgba(15,12,35,.5);border-radius:12px;border:1px solid rgba(168,85,247,.08);flex-shrink:0}
#${ROOT_ID} .pending-note{margin:0 0 6px;padding:6px 9px;border-radius:9px;background:rgba(6,182,212,.08);border:1px solid rgba(6,182,212,.15);color:#67e8f9;font-size:.72em;line-height:1.4;box-shadow:0 0 12px rgba(6,182,212,.06)}
#${ROOT_ID} .pending-note::before{content:"";display:inline-block;width:6px;height:6px;margin-right:6px;border-radius:50%;background:#06b6d4;box-shadow:0 0 8px rgba(6,182,212,.75);animation:moonnBlink 1.2s infinite}
#${ROOT_ID} input,#${ROOT_ID} textarea,#${ROOT_ID} select{background:rgba(30,25,60,.7)!important;border:1px solid rgba(168,85,247,.15)!important;border-radius:8px;padding:7px 10px;color:#e2e8f0!important;font-size:13px!important;outline:none;font-family:inherit;-webkit-appearance:none;appearance:none;-webkit-text-fill-color:#e2e8f0!important;caret-color:#e2e8f0!important;opacity:1!important}
#${ROOT_ID} input::placeholder,#${ROOT_ID} textarea::placeholder{color:#4a4565!important;-webkit-text-fill-color:#4a4565!important;opacity:1!important}
#${ROOT_ID} .input-bar input{flex:1;min-width:0;height:auto!important;line-height:1.4!important}
#${ROOT_ID} .send-btn{background:linear-gradient(135deg,#7c3aed,#a855f7);border:none;color:#fff;padding:7px 14px;border-radius:8px;cursor:pointer;font-size:.82em;font-family:inherit;transition:box-shadow .3s,transform .15s;-webkit-tap-highlight-color:transparent;white-space:nowrap}
#${ROOT_ID} .send-btn:hover{box-shadow:0 0 12px rgba(168,85,247,.4)}#${ROOT_ID} .send-btn:active{transform:scale(.94)}
#${ROOT_ID} .send-btn.busy,#${ROOT_ID} .post-btn.busy,#${ROOT_ID} .comment-send.busy,#${ROOT_ID} .action-btn.busy,#${ROOT_ID} .buy-btn.busy{background:linear-gradient(135deg,#164e63,#7c3aed);cursor:wait;box-shadow:0 0 12px rgba(6,182,212,.22);color:#e0f7ff}
#${ROOT_ID} .forum-toolbar{display:flex;justify-content:flex-end;margin-bottom:8px}
#${ROOT_ID} .post-btn{background:linear-gradient(135deg,#ec4899,#a855f7);border:none;color:#fff;padding:7px 16px;border-radius:18px;cursor:pointer;font-size:.82em;font-family:inherit;transition:box-shadow .3s;-webkit-tap-highlight-color:transparent}
#${ROOT_ID} .post-form{display:flex;flex-direction:column;gap:7px;background:rgba(25,20,50,.5);padding:12px;border-radius:12px;border:1px solid rgba(236,72,153,.12);margin-bottom:10px}
#${ROOT_ID} .forum-card{background:rgba(25,20,50,.4);border-radius:12px;margin-bottom:8px;border:1px solid rgba(168,85,247,.08);overflow:hidden;transition:border-color .25s}
#${ROOT_ID} .forum-hdr{display:flex;align-items:center;gap:8px;padding:10px 12px;cursor:pointer;transition:background .2s;-webkit-tap-highlight-color:transparent}
#${ROOT_ID} .forum-hdr:hover{background:rgba(168,85,247,.03)}
#${ROOT_ID} .forum-av{width:24px;height:24px;border-radius:6px;background:rgba(168,85,247,.12);display:flex;align-items:center;justify-content:center;font-size:.85em;flex-shrink:0}
#${ROOT_ID} .forum-info{flex:1;min-width:0}#${ROOT_ID} .forum-title{font-size:.88em;font-weight:600;color:#e9d5ff;margin-bottom:2px}
#${ROOT_ID} .forum-meta{display:flex;align-items:center;gap:6px;font-size:.65em;color:#4a4565;flex-wrap:wrap}
#${ROOT_ID} .type-tag{display:inline-block;padding:1px 6px;border-radius:4px;font-size:.88em;font-weight:600;background:rgba(168,85,247,.1);color:#c4b5fd}
#${ROOT_ID} .expand-icon{color:#4a4565;font-size:.9em;transition:transform .25s}#${ROOT_ID} .expand-icon.rot{transform:rotate(180deg)}
#${ROOT_ID} .forum-body{padding:0 12px 12px}#${ROOT_ID} .forum-content{font-size:.82em;color:#b0b8c8;white-space:pre-wrap;margin-bottom:8px;line-height:1.5}
#${ROOT_ID} .forum-img{background:rgba(236,72,153,.04);border:1px dashed rgba(236,72,153,.15);padding:8px;border-radius:8px;font-size:.75em;color:#f9a8d4;font-style:italic;margin-bottom:8px;text-align:center}
#${ROOT_ID} .forum-actions{display:flex;gap:10px;margin-bottom:8px}.action-btn{display:flex;align-items:center;gap:3px;background:none;border:1px solid rgba(168,85,247,.1);color:#4a4565;padding:3px 10px;border-radius:14px;cursor:pointer;font-size:.75em;font-family:inherit;transition:all .2s;-webkit-tap-highlight-color:transparent}
#${ROOT_ID} .action-btn:hover{border-color:rgba(236,72,153,.3);color:#ec4899;background:rgba(236,72,153,.05)}
#${ROOT_ID} .forum-comments{border-top:1px solid rgba(168,85,247,.08);padding-top:8px}
#${ROOT_ID} .comment{display:flex;gap:6px;padding:3px 0;font-size:.75em}.comment-name{color:#c084fc;font-weight:600;flex-shrink:0}.comment-text{color:#9488ad;flex:1}.comment-time{color:#4a4565;font-size:.88em;flex-shrink:0}
#${ROOT_ID} .comment-input{display:flex;gap:5px;margin-top:6px}.comment-input input{flex:1;min-width:0;font-size:12px!important;padding:5px 8px}.comment-send{background:rgba(168,85,247,.15);border:1px solid rgba(168,85,247,.2);color:#c084fc;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:.75em;font-family:inherit}
#${ROOT_ID} .shop-filter{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap}.filter-btn{background:rgba(25,20,50,.5);border:1px solid rgba(168,85,247,.1);color:#4a4565;padding:5px 12px;border-radius:16px;cursor:pointer;font-size:.75em;font-family:inherit;transition:all .25s;-webkit-tap-highlight-color:transparent}.filter-btn.active{background:rgba(168,85,247,.12);color:#e9d5ff;border-color:rgba(168,85,247,.25)}
#${ROOT_ID} .shop-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.shop-card{background:rgba(25,20,50,.4);border-radius:10px;padding:10px;border:1px solid rgba(168,85,247,.08);transition:all .25s;display:flex;flex-direction:column;gap:4px}.shop-card:hover{border-color:rgba(168,85,247,.15);transform:translateY(-2px);box-shadow:0 4px 12px rgba(168,85,247,.1)}
#${ROOT_ID} .shop-img{background:rgba(100,116,139,.05);border-radius:6px;padding:12px 6px;text-align:center;font-size:.7em;color:#4a4565;font-style:italic;border:1px dashed rgba(100,116,139,.12)}.shop-cat{font-size:.62em;padding:1px 5px;border-radius:4px;align-self:flex-start;background:rgba(168,85,247,.08);color:#c4b5fd}.shop-name{font-size:.85em;font-weight:600;color:#e9d5ff}.shop-desc{font-size:.7em;color:#4a4565;line-height:1.4}.shop-bottom{display:flex;justify-content:space-between;align-items:center;margin-top:auto;gap:4px}.shop-price{font-size:.92em;font-weight:700;color:#f59e0b;text-shadow:0 0 5px rgba(245,158,11,.2)}.shop-stock{font-size:.65em;color:#4a4565}.shop-stock.out{color:#ef4444}.buy-btn{background:linear-gradient(135deg,#06b6d4,#a855f7);border:none;color:#fff;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:.72em;font-family:inherit;transition:all .2s}.buy-btn:disabled{background:#2a2545;cursor:not-allowed;box-shadow:none;color:#4a4565}
#${ROOT_ID} .buy-btn.busy:disabled{background:linear-gradient(135deg,#164e63,#7c3aed);cursor:wait;box-shadow:0 0 12px rgba(6,182,212,.22);color:#e0f7ff}
#${ROOT_ID} .home-bar{flex-shrink:0;height:4px;width:120px;margin:6px auto 8px;background:rgba(255,255,255,.15);border-radius:2px}
#${ROOT_ID} .lightbox{position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.88);z-index:99;display:flex;justify-content:center;align-items:center;cursor:pointer}.lightbox img{max-width:92%;max-height:92%;border-radius:8px;box-shadow:0 0 40px rgba(168,85,247,.3);object-fit:contain}
@media (min-width:421px) and (max-width:1024px){#${ROOT_ID} .moonn-panel{width:380px;height:640px}}
@media (max-width:420px){#${ROOT_ID} .moonn-panel{width:calc(100vw - 16px)!important;height:calc(100vh - 80px)!important;left:8px!important;top:8px!important;border-radius:16px}#${ROOT_ID} .moonn-ball{width:42px;height:42px;border-radius:12px}#${ROOT_ID} .moonn-ball svg{width:18px;height:18px}#${ROOT_ID} .shop-grid{grid-template-columns:1fr}#${ROOT_ID} .phone{font-size:12px}}
`;

  const style = parentDocument.createElement('style');
  style.id = STYLE_ID;
  style.setAttribute('script_id', `${SCRIPT_ID}-style`);
  style.textContent = css;
  parentDocument.head.appendChild(style);

  const root = parentDocument.createElement('div');
  root.id = ROOT_ID;
  root.setAttribute('script_id', SCRIPT_ID);
  root.innerHTML = `
    <div class="moonn-ball" title="月栖">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12" y2="18.01"/></svg>
    </div>
    <div class="moonn-panel"><div class="phone"></div></div>
  `;
  parentDocument.body.appendChild(root);

  const ball = root.querySelector('.moonn-ball');
  const panel = root.querySelector('.moonn-panel');
  const phone = root.querySelector('.phone');

  const state = {
    activeTab: 'group',
    social: readSocialData(),
    selectedGroup: '',
    selectedPm: '',
    groupInput: '',
    pmInput: '',
    showPostForm: false,
    postTitle: '',
    postType: '闲聊💬',
    postContent: '',
    expandedPost: '',
    comments: {},
    shopFilter: '全部',
    lightbox: '',
    panelVisible: false,
    pendingAction: '',
    pendingText: '',
    pendingUntil: 0,
    time: '',
  };

  function setPending(action, text, duration = 8000) {
    state.pendingAction = action;
    state.pendingText = text;
    state.pendingUntil = Date.now() + duration;
    render();
  }

  function clearExpiredPending() {
    if (state.pendingAction && Date.now() > state.pendingUntil) {
      state.pendingAction = '';
      state.pendingText = '';
      state.pendingUntil = 0;
      render();
    }
  }

  function pendingNote(scope) {
    if (!state.pendingAction || !state.pendingAction.startsWith(scope)) return '';
    return `<div class="pending-note">${escapeHtml(state.pendingText || '已提交，正在等待回复...')}</div>`;
  }

  function updateTime() {
    const date = new Date();
    state.time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  function refreshSocial() {
    const next = readSocialData();
    if (JSON.stringify(next) !== JSON.stringify(state.social)) {
      state.social = next;
      imageCache.clear();
      render();
    }
  }

  function lastGroupPreview(name) {
    const messages = asObject(state.social.群聊列表[name]?.聊天记录);
    const entries = sortedEntries(messages);
    if (!entries.length) return '';
    const msg = entries[entries.length - 1][1] || {};
    return `${msg.发言人 || '未知'}: ${String(msg.内容 || '').replace(/\[[^\]]+\]/g, '').slice(0, 30)}`;
  }

  function lastPmPreview(name) {
    const messages = asObject(state.social.好友列表[name]?.聊天记录);
    const entries = sortedEntries(messages);
    if (!entries.length) return '';
    const msg = entries[entries.length - 1][1] || {};
    const text = String(msg.内容 || '').replace(/\[[^\]]+\]/g, '');
    if (msg.类型 === 'image') return `[图片] ${text.slice(0, 20)}`;
    if (msg.类型 === 'voice') return `[语音] ${text.slice(0, 20)}`;
    return text.slice(0, 30);
  }

  function renderMessage(msg, isPm, name) {
    const type = msg.类型 || 'text';
    if (type === 'voice') return `<div class="msg-voice">🎤 ${escapeHtml(msg.内容)}</div>`;
    if (type === 'sticker') return `<div class="msg-sticker">${escapeHtml(msg.内容)}</div>`;
    if (type === 'image' && isPm) {
      const parsed = parseImageContent(msg.内容);
      if (parsed.url) {
        return `<div class="msg-imgreal" data-lightbox="${escapeHtml(parsed.url)}"><img src="${escapeHtml(parsed.url)}" alt="${escapeHtml(parsed.caption)}" loading="lazy" referrerpolicy="no-referrer">${parsed.caption ? `<div class="msg-imgcap">${escapeHtml(parsed.caption)}</div>` : ''}</div>`;
      }
      return `<div class="msg-imgtxt">📷 ${escapeHtml(msg.内容)}</div>`;
    }
    if (type === 'image') return `<div class="msg-imgtxt">📷 ${escapeHtml(msg.内容)}</div>`;
    return `<div class="msg-ct">${escapeHtml(msg.内容)}</div>`;
  }

  function renderGroupPanel() {
    if (state.selectedGroup) {
      const group = asObject(state.social.群聊列表[state.selectedGroup]);
      const messages = sortedEntries(asObject(group.聊天记录));
      return `<div class="panel"><div class="chat-view">
        <div class="chat-hdr"><button class="back-btn" data-action="back-group">←</button><span class="chat-title">${escapeHtml(state.selectedGroup)}</span><span class="mvu-tag"><i class="mvu-dot"></i>MVU</span></div>
        ${group.群公告 ? `<div class="chat-notice">📌 ${escapeHtml(group.群公告)}</div>` : ''}
        <div class="msg-list" data-scroll="messages">${messages.length ? messages.map(([key, msg]) => `<div class="msg-item" data-key="${escapeHtml(key)}"><div class="msg-av">${escapeHtml(msg.头像 || '👤')}</div><div class="msg-body"><div class="msg-name">${escapeHtml(msg.发言人 || '未知')}</div>${renderMessage(msg, false, state.selectedGroup)}<div class="msg-time">${escapeHtml(msg.时间 || '')}</div></div></div>`).join('') : '<div class="empty">📭 暂无消息</div>'}</div>
        ${pendingNote('group')}
        <div class="input-bar"><input data-model="groupInput" value="${escapeHtml(state.groupInput)}" placeholder="在群里说点什么…"><button class="send-btn ${state.pendingAction === 'group' ? 'busy' : ''}" data-action="send-group">${state.pendingAction === 'group' ? '发送中' : '发送'}</button></div>
      </div></div>`;
    }
    const groups = Object.keys(state.social.群聊列表);
    return `<div class="panel"><div class="list">${groups.length ? groups.map(name => `<div class="list-item" data-action="open-group" data-name="${escapeHtml(name)}"><div class="avatar avatar--grp">👥</div><div class="info"><div class="name">${escapeHtml(name)}</div><div class="preview">${escapeHtml(lastGroupPreview(name))}</div></div><div class="meta"><span class="badge-sm">${escapeHtml(state.social.群聊列表[name]?.群成员数 || 0)} 人</span></div></div>`).join('') : '<div class="empty">📭 暂无群聊</div>'}</div></div>`;
  }

  function renderPmPanel() {
    if (state.selectedPm) {
      const friend = asObject(state.social.好友列表[state.selectedPm]);
      const messages = sortedEntries(asObject(friend.聊天记录));
      return `<div class="panel"><div class="chat-view">
        <div class="chat-hdr"><button class="back-btn" data-action="back-pm">←</button><span class="chat-title">${escapeHtml(state.selectedPm)}</span><span class="mvu-tag"><i class="mvu-dot"></i>MVU</span></div>
        <div class="msg-list" data-scroll="messages">${messages.length ? messages.map(([key, msg]) => {
          const self = msg.发送方 === 'self';
          return `<div class="msg-item ${self ? 'msg-self' : ''}" data-key="${escapeHtml(key)}"><div class="msg-av">${self ? '🌙' : escapeHtml(friend.头像 || '👤')}</div><div class="msg-body">${self ? '' : `<div class="msg-name">${escapeHtml(state.selectedPm)}</div>`}${renderMessage(msg, true, state.selectedPm)}<div class="msg-time">${escapeHtml(msg.时间 || '')}</div></div></div>`;
        }).join('') : '<div class="empty">📭 暂无聊天记录</div>'}</div>
        ${pendingNote('pm')}
        <div class="input-bar"><input data-model="pmInput" value="${escapeHtml(state.pmInput)}" placeholder="说点什么…"><button class="send-btn ${state.pendingAction === 'pm' ? 'busy' : ''}" data-action="send-pm">${state.pendingAction === 'pm' ? '发送中' : '发送'}</button></div>
      </div></div>`;
    }
    const friends = Object.keys(state.social.好友列表);
    return `<div class="panel"><div class="list">${friends.length ? friends.map(name => {
      const friend = asObject(state.social.好友列表[name]);
      const statusClass = friend.状态 === '在线' ? 'on' : friend.状态 === '忙碌' ? 'busy' : 'off';
      const unread = Number(friend.未读消息数 || 0);
      return `<div class="list-item" data-action="open-pm" data-name="${escapeHtml(name)}"><div class="avatar avatar--pm">${escapeHtml(friend.头像 || '👤')}<i class="online-dot ${statusClass}"></i></div><div class="info"><div class="name">${escapeHtml(name)}</div><div class="preview">${escapeHtml(lastPmPreview(name))}</div></div><div class="meta">${unread > 0 ? `<span class="unread">${unread}</span>` : ''}</div></div>`;
    }).join('') : '<div class="empty">📭 暂无联系人</div>'}</div></div>`;
  }

  function renderForumPanel() {
    const posts = Object.keys(state.social.论坛帖子);
    return `<div class="panel">
      <div class="forum-toolbar"><button class="post-btn" data-action="toggle-post">✏️ 发帖</button></div>
      ${pendingNote('forum')}
      ${state.showPostForm ? `<div class="post-form"><input data-model="postTitle" value="${escapeHtml(state.postTitle)}" placeholder="帖子标题"><select data-model="postType"><option ${state.postType === '调教日记🔥' ? 'selected' : ''}>调教日记🔥</option><option ${state.postType === '经验分享💡' ? 'selected' : ''}>经验分享💡</option><option ${state.postType === '求助❓' ? 'selected' : ''}>求助❓</option><option ${state.postType === '闲聊💬' ? 'selected' : ''}>闲聊💬</option><option ${state.postType === '图片分享📷' ? 'selected' : ''}>图片分享📷</option></select><textarea data-model="postContent" rows="3" placeholder="写下你想分享的内容…">${escapeHtml(state.postContent)}</textarea><button class="send-btn ${state.pendingAction === 'forum-post' ? 'busy' : ''}" data-action="send-post">${state.pendingAction === 'forum-post' ? '发布中' : '发布'}</button></div>` : ''}
      ${posts.length ? posts.map(title => {
        const post = asObject(state.social.论坛帖子[title]);
        const expanded = state.expandedPost === title;
        const comments = asObject(post.评论列表);
        return `<div class="forum-card"><div class="forum-hdr" data-action="toggle-expand" data-name="${escapeHtml(title)}"><div class="forum-av">${escapeHtml(post.头像 || '👤')}</div><div class="forum-info"><div class="forum-title">${escapeHtml(title)}</div><div class="forum-meta"><span class="type-tag">${escapeHtml(post.类型标签 || '闲聊💬')}</span><span>${escapeHtml(post.作者网名 || '匿名用户')}</span><span>${escapeHtml(post.发帖时间 || '刚刚')}</span></div></div><span class="expand-icon ${expanded ? 'rot' : ''}">▼</span></div>${expanded ? `<div class="forum-body"><div class="forum-content">${escapeHtml(post.正文 || '')}</div>${post.图片描述 && post.图片描述 !== '无' ? `<div class="forum-img">📷 ${escapeHtml(post.图片描述)}</div>` : ''}<div class="forum-actions"><button class="action-btn ${state.pendingAction === 'forum-like' ? 'busy' : ''}" data-action="like-post" data-name="${escapeHtml(title)}">${state.pendingAction === 'forum-like' ? '处理中' : `❤️ ${escapeHtml(post.点赞数 || 0)}`}</button><button class="action-btn">💬 ${Object.keys(comments).length}</button></div><div class="forum-comments">${Object.keys(comments).map(key => `<div class="comment"><span class="comment-name">${escapeHtml(comments[key].评论人 || '匿名')}：</span><span class="comment-text">${escapeHtml(comments[key].内容 || '')}</span><span class="comment-time">${escapeHtml(comments[key].时间 || '刚刚')}</span></div>`).join('')}<div class="comment-input"><input data-comment="${escapeHtml(title)}" value="${escapeHtml(state.comments[title] || '')}" placeholder="写评论…"><button class="comment-send ${state.pendingAction === 'forum-comment' ? 'busy' : ''}" data-action="send-comment" data-name="${escapeHtml(title)}">${state.pendingAction === 'forum-comment' ? '回复中' : '回复'}</button></div></div></div>` : ''}</div>`;
      }).join('') : '<div class="empty">📭 暂无帖子</div>'}
    </div>`;
  }

  function renderShopPanel() {
    const filters = ['全部', '🧴 日用品', '🔞 情趣用品'];
    const category = state.shopFilter === '全部' ? '' : state.shopFilter.replace(/^[^\u4e00-\u9fff]*/, '');
    const goods = Object.keys(state.social.商店商品).filter(name => !category || state.social.商店商品[name]?.分类 === category);
    return `<div class="panel"><div class="shop-filter">${filters.map(filter => `<button class="filter-btn ${state.shopFilter === filter ? 'active' : ''}" data-action="shop-filter" data-name="${escapeHtml(filter)}">${escapeHtml(filter)}</button>`).join('')}</div>${pendingNote('shop')}<div class="shop-grid">${goods.map(name => {
      const item = asObject(state.social.商店商品[name]);
      const out = item.库存状态 === '缺货';
      const buying = state.pendingAction === `shop:${name}`;
      return `<div class="shop-card"><div class="shop-img">${escapeHtml(item.图片描述 || '暂无图片')}</div><span class="shop-cat">${escapeHtml(item.分类 || '日用品')}</span><div class="shop-name">${escapeHtml(name)}</div><div class="shop-desc">${escapeHtml(item.描述 || '')}</div><div class="shop-bottom"><span class="shop-price">${escapeHtml(item.价格 || '￥0')}</span><span class="shop-stock ${out ? 'out' : ''}">${escapeHtml(item.库存状态 || '缺货')}</span></div><button class="buy-btn ${buying ? 'busy' : ''}" data-action="buy" data-name="${escapeHtml(name)}" ${out || buying ? 'disabled' : ''}>${out ? '缺货' : buying ? '处理中' : '购买'}</button></div>`;
    }).join('')}</div>${goods.length ? '' : '<div class="empty">📭 暂无商品</div>'}</div>`;
  }

  function renderBody() {
    if (state.activeTab === 'group') return renderGroupPanel();
    if (state.activeTab === 'pm') return renderPmPanel();
    if (state.activeTab === 'forum') return renderForumPanel();
    return renderShopPanel();
  }

  function render() {
    updateTime();
    const tabs = [
      ['group', '💬', '群聊'],
      ['pm', '🔒', '私聊'],
      ['forum', '📋', '论坛'],
      ['shop', '🛒', '商店'],
    ];
    phone.innerHTML = `<div class="status-bar"><span>${escapeHtml(state.time)}</span><span>📶 🔋</span></div><header class="app-header"><div class="logo">🌙 月栖</div><div class="slogan">你的秘密花园，月光下才敢说的话</div></header><nav class="tab-bar">${tabs.map(([id, icon, label]) => `<button class="tab ${state.activeTab === id ? 'active' : ''}" data-action="tab" data-name="${id}"><span class="tab-icon">${icon}</span><span>${label}</span></button>`).join('')}</nav><div class="body">${renderBody()}</div><div class="home-bar"></div>${state.lightbox ? `<div class="lightbox" data-action="close-lightbox"><img src="${escapeHtml(state.lightbox)}" alt="preview"></div>` : ''}`;
    requestAnimationFrame(() => {
      const list = phone.querySelector('[data-scroll="messages"]');
      if (list) list.scrollTop = list.scrollHeight;
    });
  }

  function syncInput(target) {
    const model = target.getAttribute('data-model');
    if (model && model in state) state[model] = target.value;
    const commentTitle = target.getAttribute('data-comment');
    if (commentTitle) state.comments[commentTitle] = target.value;
  }

  phone.addEventListener('input', event => syncInput(event.target));
  phone.addEventListener('change', event => syncInput(event.target));
  phone.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    const target = event.target;
    if (!(target instanceof parentWindow.HTMLInputElement)) return;
    const model = target.getAttribute('data-model');
    if (model === 'groupInput') {
      event.preventDefault();
      handleAction('send-group');
    }
    if (model === 'pmInput') {
      event.preventDefault();
      handleAction('send-pm');
    }
  });

  phone.addEventListener('click', event => {
    const image = event.target.closest?.('[data-lightbox]');
    if (image) {
      state.lightbox = image.getAttribute('data-lightbox') || '';
      render();
      return;
    }
    const actionElement = event.target.closest?.('[data-action]');
    if (!actionElement) return;
    handleAction(actionElement.getAttribute('data-action'), actionElement.getAttribute('data-name'));
  });

  function handleAction(action, name) {
    if (action === 'tab') {
      state.activeTab = name;
      state.selectedGroup = '';
      state.selectedPm = '';
    } else if (action === 'open-group') {
      state.selectedGroup = name;
    } else if (action === 'back-group') {
      state.selectedGroup = '';
    } else if (action === 'send-group') {
      const text = state.groupInput.trim();
      if (text && state.selectedGroup) {
        const groupName = state.selectedGroup;
        state.groupInput = '';
        setPending('group', `已写入「${groupName}」聊天记录，可继续等待回复...`);
        addLocalGroupMessage(groupName, text);
        sendPrompt('moonn-grp-input', `[{{user}}已在月栖群聊「${groupName}」中发送消息，内容已写入变量：${text}。请根据该消息生成其他群成员的自然回复，并更新月栖社交变量。]`);
      }
    } else if (action === 'open-pm') {
      state.selectedPm = name;
    } else if (action === 'back-pm') {
      state.selectedPm = '';
    } else if (action === 'send-pm') {
      const text = state.pmInput.trim();
      if (text && state.selectedPm) {
        const friendName = state.selectedPm;
        state.pmInput = '';
        setPending('pm', `已写入与 ${friendName} 的聊天记录，可继续等待回复...`);
        addLocalPmMessage(friendName, text);
        sendPrompt('moonn-pm-input', `[{{user}}已在月栖私聊中回复给${friendName}，内容已写入变量：${text}。请生成${friendName}的自然回复，并更新月栖社交变量。]`);
      }
    } else if (action === 'toggle-post') {
      state.showPostForm = !state.showPostForm;
    } else if (action === 'send-post') {
      const title = state.postTitle.trim();
      const content = state.postContent.trim();
      if (title && content) {
        const type = state.postType;
        state.postTitle = '';
        state.postContent = '';
        state.showPostForm = false;
        state.expandedPost = title;
        setPending('forum-post', `帖子「${title}」已写入论坛，可继续等待反馈...`);
        addLocalForumPost(title, type, content);
        sendPrompt('moonn-forum-post', `[{{user}}已在月栖论坛中发布帖子「${title}」，类型：${type}，内容已写入变量：${content}。请生成论坛用户的自然反馈，并更新月栖社交变量。]`);
      }
    } else if (action === 'toggle-expand') {
      state.expandedPost = state.expandedPost === name ? '' : name;
    } else if (action === 'like-post') {
      setPending('forum-like', `已给「${name}」点赞并写入变量...`);
      addLocalForumLike(name);
      sendPrompt('moonn-forum-like', `[{{user}}已在月栖论坛中给帖子「${name}」点赞，点赞数已本地写入变量。请根据需要生成后续反馈并更新月栖社交变量。]`);
    } else if (action === 'send-comment') {
      const text = (state.comments[name] || '').trim();
      if (text) {
        state.comments[name] = '';
        setPending('forum-comment', `已回复「${name}」并写入变量，可继续等待回帖...`);
        addLocalForumComment(name, text);
        sendPrompt('moonn-forum-comment', `[{{user}}已在月栖论坛中回复帖子「${name}」，回复内容已写入变量：${text}。请生成其他论坛用户的自然回帖，并更新月栖社交变量。]`);
      }
    } else if (action === 'shop-filter') {
      state.shopFilter = name;
    } else if (action === 'buy') {
      const item = asObject(state.social.商店商品[name]);
      setPending(`shop:${name}`, `已购买「${name}」并写入购物记录，可继续等待商店回复...`);
      addLocalShopPurchase(name);
      sendPrompt('moonn-shop-buy', `[{{user}}已在月栖商店中购买商品「${name}」，购买记录已写入变量。商品分类：${item.分类 || '未知'}，价格：${item.价格 || '未知'}，库存：${item.库存状态 || '未知'}。请立即以月栖商店/系统消息形式回复购买结果，并更新相关状态。]`);
    } else if (action === 'close-lightbox') {
      state.lightbox = '';
    }
    render();
  }

  const margin = 12;
  let ballX = parentWindow.innerWidth - 68;
  let ballY = parentWindow.innerHeight - 120;
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;
  let moved = false;

  function clampPosition(x, y) {
    return {
      x: Math.max(margin, Math.min(x, parentWindow.innerWidth - 48 - margin)),
      y: Math.max(margin, Math.min(y, parentWindow.innerHeight - 48 - margin)),
    };
  }

  function loadPosition() {
    try {
      const saved = JSON.parse(parentWindow.localStorage.getItem(POS_KEY) || 'null');
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
        const next = clampPosition(saved.x, saved.y);
        ballX = next.x;
        ballY = next.y;
      }
    } catch (_) {}
  }

  function savePosition() {
    try {
      parentWindow.localStorage.setItem(POS_KEY, JSON.stringify({ x: ballX, y: ballY }));
    } catch (_) {}
  }

  function placeBall() {
    const next = clampPosition(ballX, ballY);
    ballX = next.x;
    ballY = next.y;
    ball.style.left = `${ballX}px`;
    ball.style.top = `${ballY}px`;
    placePanel();
  }

  function placePanel() {
    if (!panel.classList.contains('show')) return;
    const width = Math.min(375, parentWindow.innerWidth - 16);
    const height = Math.min(680, parentWindow.innerHeight - 40);
    let left = ballX - width - 16;
    let top = ballY - height + 48;
    if (left < margin) left = ballX + 48 + 16;
    if (left + width > parentWindow.innerWidth - margin) left = Math.max(margin, (parentWindow.innerWidth - width) / 2);
    top = Math.max(margin, Math.min(top, parentWindow.innerHeight - height - margin));
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  function getPoint(event) {
    return event.touches ? event.touches[0] : event;
  }

  function onDragStart(event) {
    event.preventDefault();
    event.stopPropagation();
    const point = getPoint(event);
    startX = point.clientX;
    startY = point.clientY;
    originX = ballX;
    originY = ballY;
    moved = false;
    ball.classList.add('dragging');
    parentDocument.addEventListener('mousemove', onDragMove);
    parentDocument.addEventListener('mouseup', onDragEnd);
    parentDocument.addEventListener('touchmove', onDragMove, { passive: false });
    parentDocument.addEventListener('touchend', onDragEnd);
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('touchend', onDragEnd);
  }

  function onDragMove(event) {
    event.preventDefault();
    const point = getPoint(event);
    const dx = point.clientX - startX;
    const dy = point.clientY - startY;
    if (!moved && Math.abs(dx) <= 3 && Math.abs(dy) <= 3) return;
    moved = true;
    const next = clampPosition(originX + dx, originY + dy);
    ballX = next.x;
    ballY = next.y;
    placeBall();
  }

  function onDragEnd() {
    ball.classList.remove('dragging');
    parentDocument.removeEventListener('mousemove', onDragMove);
    parentDocument.removeEventListener('mouseup', onDragEnd);
    parentDocument.removeEventListener('touchmove', onDragMove);
    parentDocument.removeEventListener('touchend', onDragEnd);
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    document.removeEventListener('touchmove', onDragMove);
    document.removeEventListener('touchend', onDragEnd);
    if (moved) {
      savePosition();
    } else {
      state.panelVisible = !panel.classList.contains('show');
      panel.classList.toggle('show');
      if (panel.classList.contains('show')) {
        refreshSocial();
        render();
        placePanel();
      }
    }
  }

  function onResize() {
    placeBall();
    savePosition();
  }

  ball.addEventListener('mousedown', onDragStart);
  ball.addEventListener('touchstart', onDragStart, { passive: false });
  parentWindow.addEventListener('resize', onResize);
  window.addEventListener('resize', onResize);

  loadPosition();
  placeBall();
  render();

  const refreshTimer = setInterval(() => {
    if (panel.classList.contains('show')) refreshSocial();
  }, 2000);
  const clockTimer = setInterval(() => {
    const previous = state.time;
    updateTime();
    clearExpiredPending();
    if (previous !== state.time) render();
  }, 30000);

  const pendingTimer = setInterval(clearExpiredPending, 1000);

  let currentChatId;
  try {
    currentChatId = typeof SillyTavern !== 'undefined' && SillyTavern.getCurrentChatId ? SillyTavern.getCurrentChatId() : undefined;
    if (typeof eventOn === 'function' && typeof tavern_events !== 'undefined' && tavern_events.CHAT_CHANGED) {
      eventOn(tavern_events.CHAT_CHANGED, newChatId => {
        if (currentChatId === newChatId) return;
        currentChatId = newChatId;
        cleanupMoonn();
        setTimeout(() => window.location.reload(), 100);
      });
    }
  } catch (_) {}

  function destroy() {
    clearInterval(refreshTimer);
    clearInterval(clockTimer);
    clearInterval(pendingTimer);
    ball.removeEventListener('mousedown', onDragStart);
    ball.removeEventListener('touchstart', onDragStart);
    parentWindow.removeEventListener('resize', onResize);
    window.removeEventListener('resize', onResize);
    cleanupMoonn();
  }

  try {
    if (window.$) $(window).on('pagehide', destroy);
    else window.addEventListener('pagehide', destroy, { once: true });
  } catch (_) {
    window.addEventListener('pagehide', destroy, { once: true });
  }

  safeToast('success', '月栖已加载', '月栖');
})();
