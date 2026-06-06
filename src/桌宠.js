(() => {
  'use strict';

  const SCRIPT_NAME = '桌宠悬浮窗';
  const ROOT_ID = 'tavern-pet-floating-root';
  const STYLE_ID = 'tavern-pet-floating-style';
  const AUDIO_ID = 'tavern-pet-floating-audio';
  const LS_KEY = 'tavern_pet_floating_settings';

  const DEFAULT_PET_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">
      <defs>
        <radialGradient id="bg" cx="50%" cy="40%" r="70%">
          <stop offset="0" stop-color="#ffe6f2"/>
          <stop offset="1" stop-color="#9ed7ff"/>
        </radialGradient>
        <linearGradient id="body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fff7fb"/>
          <stop offset="1" stop-color="#d6efff"/>
        </linearGradient>
      </defs>
      <circle cx="160" cy="160" r="150" fill="url(#bg)"/>
      <path d="M88 130 C92 68 132 48 160 88 C188 48 228 68 232 130 C268 150 270 224 220 256 C186 278 134 278 100 256 C50 224 52 150 88 130Z" fill="url(#body)" stroke="#4f6b8a" stroke-width="8"/>
      <circle cx="124" cy="158" r="14" fill="#2e4057"/>
      <circle cx="196" cy="158" r="14" fill="#2e4057"/>
      <path d="M132 205 C150 222 174 222 192 205" fill="none" stroke="#2e4057" stroke-width="8" stroke-linecap="round"/>
      <path d="M88 126 L54 78 L118 96Z" fill="#fff7fb" stroke="#4f6b8a" stroke-width="8" stroke-linejoin="round"/>
      <path d="M232 126 L266 78 L202 96Z" fill="#fff7fb" stroke="#4f6b8a" stroke-width="8" stroke-linejoin="round"/>
      <circle cx="98" cy="190" r="16" fill="#ffb7d4" opacity=".65"/>
      <circle cx="222" cy="190" r="16" fill="#ffb7d4" opacity=".65"/>
    </svg>`)}`;

  const DEFAULT_SETTINGS = {
    enabled: true,
    mode: 'persona',
    apiMode: 'tavern',
    customApiUrl: '',
    customApiKey: '',
    customApiModel: '',
    roleName: '桌宠',
    roleSetting: '你是一个陪伴用户跑团和聊天的小桌宠。你会用简短、灵动、有角色感的话回应当前剧情，但不会替用户或主要角色做决定。',
    normalImage: DEFAULT_PET_SVG,
    clickImage: '',
    expressions: [
      { name: '开心', url: '', keywords: '开心,高兴,笑,喜欢' },
      { name: '紧张', url: '', keywords: '紧张,危险,害怕,战斗' },
    ],
    songs: [],
    bubbleEnabled: true,
    autoComment: true,
    commentCooldown: 20,
    commentPrompt: '基于最新AI回复，给出符合桌宠人设的一句旁白式短评。可以吐槽、关心、提醒或表达情绪，但不要替用户或主要角色做决定。',
    chatPrompt: '用户正在直接和桌宠说话。请严格按照桌宠人设回应用户，可以亲近、吐槽、撒娇、安慰或简短建议，但不要变成系统助手，也不要脱离桌宠身份。',
    personaPromptTemplate: '{{role_name}}\n{{role_setting}}',
    commentPromptTemplate: '{{persona_prompt}}\n\n{{comment_prompt}}\n\n最新剧情：\n{{latest_message}}\n\n{{bubble_format_prompt}}',
    chatPromptTemplate: '{{persona_prompt}}\n\n{{chat_prompt}}\n\n用户输入：\n{{user_message}}\n\n{{bubble_format_prompt}}',
    bubbleFormatPrompt: '回复会显示在桌宠气泡中。可以输出1到3句，每句尽量简短。',
    emptyContextText: '当前没有可读取的最新剧情。',
    quickLines: ['我在这里。', '剧情好像要变有趣了。', '要不要听首歌？', '我会看着这段故事。'],
    x: 24,
    y: 220,
    size: 116,
    opacity: 0.98,
    imageShape: 'soft',
    imageFit: 'cover',
    imagePositionX: 50,
    imagePositionY: 50,
    imageScale: 1,
    outlineEnabled: true,
    outlineColor: '#ffffff',
    outlineWidth: 2,
    edgeDecorEnabled: true,
    glowEnabled: true,
    glowColor: '#f0abfc',
    cropBox: { x: 12, y: 8, w: 76, h: 84 },
    croppedImage: '',
    manualOutline: '',
    activeTab: 'role',
    panelOpen: false,
  };

  function hostWindow() {
    try {
      return window.parent && window.parent !== window ? window.parent : window;
    } catch {
      return window;
    }
  }

  function hostDocument() {
    try {
      return hostWindow().document || document;
    } catch {
      return document;
    }
  }

  function viewport() {
    const win = hostWindow();
    const doc = hostDocument();
    const visual = win.visualViewport;
    return {
      width: Math.max(320, Math.floor(visual?.width || win.innerWidth || doc.documentElement.clientWidth || 360)),
      height: Math.max(360, Math.floor(visual?.height || win.innerHeight || doc.documentElement.clientHeight || 640)),
      offsetLeft: Math.floor(visual?.offsetLeft || 0),
      offsetTop: Math.floor(visual?.offsetTop || 0),
    };
  }

  const state = {
    settings: loadSettings(),
    currentImageMode: 'normal',
    currentSongIndex: -1,
    listening: false,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    startX: 0,
    startY: 0,
    bubbleText: '',
    bubbleQueue: [],
    chatOpen: false,
    imageEditorMode: 'crop',
    cropDrag: null,
    drawState: null,
    lastCommentAt: 0,
    lastSeenMessage: '',
    disposers: [],
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function safeParse(raw, fallback) {
    try {
      if (!raw) return fallback;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function scriptVariables() {
    try {
      if (typeof getVariables === 'function' && typeof getScriptId === 'function') {
        return getVariables({ type: 'script', script_id: getScriptId() }) || {};
      }
    } catch (error) {
      console.warn(`[${SCRIPT_NAME}] 读取脚本变量失败`, error);
    }
    return safeParse(localStorage.getItem(LS_KEY), {});
  }

  function loadSettings() {
    return mergeSettings(DEFAULT_SETTINGS, scriptVariables());
  }

  function mergeSettings(base, incoming) {
    const next = clone(base);
    Object.assign(next, incoming || {});
    next.expressions = Array.isArray(incoming?.expressions) ? incoming.expressions : clone(base.expressions);
    next.songs = Array.isArray(incoming?.songs) ? incoming.songs : clone(base.songs);
    next.quickLines = Array.isArray(incoming?.quickLines) && incoming.quickLines.length ? incoming.quickLines : clone(base.quickLines);
    next.cropBox = incoming?.cropBox && typeof incoming.cropBox === 'object' ? { ...base.cropBox, ...incoming.cropBox } : clone(base.cropBox);
    next.size = clamp(Number(next.size) || base.size, 72, 220);
    next.opacity = clamp(Number(next.opacity) || base.opacity, 0.35, 1);
    next.imagePositionX = clamp(numberOr(next.imagePositionX, base.imagePositionX), 0, 100);
    next.imagePositionY = clamp(numberOr(next.imagePositionY, base.imagePositionY), 0, 100);
    next.imageScale = clamp(numberOr(next.imageScale, base.imageScale), 0.6, 2.4);
    next.outlineWidth = clamp(numberOr(next.outlineWidth, base.outlineWidth), 0, 8);
    next.cropBox.x = clamp(numberOr(next.cropBox.x, base.cropBox.x), 0, 100);
    next.cropBox.y = clamp(numberOr(next.cropBox.y, base.cropBox.y), 0, 100);
    next.cropBox.w = clamp(numberOr(next.cropBox.w, base.cropBox.w), 5, 100);
    next.cropBox.h = clamp(numberOr(next.cropBox.h, base.cropBox.h), 5, 100);
    next.commentCooldown = clamp(Number(next.commentCooldown) || base.commentCooldown, 3, 999);
    return next;
  }

  function saveSettings() {
    const data = clone(state.settings);
    try {
      if (typeof insertOrAssignVariables === 'function' && typeof getScriptId === 'function') {
        insertOrAssignVariables(data, { type: 'script', script_id: getScriptId() });
      }
    } catch (error) {
      console.warn(`[${SCRIPT_NAME}] 写入脚本变量失败`, error);
    }
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function numberOr(value, fallback) {
    const next = Number(value);
    return Number.isFinite(next) ? next : fallback;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function notify(type, message) {
    const win = hostWindow();
    const toast = win.toastr || window.toastr;
    if (toast && typeof toast[type] === 'function') toast[type](message, SCRIPT_NAME);
    else console[type === 'error' ? 'error' : 'log'](`[${SCRIPT_NAME}] ${message}`);
  }

  function injectStyle() {
    const doc = hostDocument();
    doc.getElementById(STYLE_ID)?.remove();
    const style = doc.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${ROOT_ID}{position:fixed!important;z-index:2147483647!important;left:0!important;top:0!important;width:100vw!important;height:100dvh!important;min-height:100vh!important;overflow:visible!important;font-family:"Inter","HarmonyOS Sans SC","Microsoft YaHei",system-ui,sans-serif;color:#3d2c55;pointer-events:none;contain:none!important;--tp-accent:#f0abfc;--tp-accent-2:#93c5fd;--tp-ink:#3d2c55;--tp-card:rgba(255,250,255,.88);--tp-line:rgba(255,255,255,.72);}
      #${ROOT_ID} *{box-sizing:border-box;scrollbar-width:thin;scrollbar-color:rgba(168,85,247,.36) transparent;}
      .tp-wrap{position:absolute;left:var(--tp-x);top:var(--tp-y);pointer-events:auto;user-select:none;touch-action:none;padding-top:env(safe-area-inset-top,0);padding-left:env(safe-area-inset-left,0);}
      .tp-pet{position:relative;width:var(--tp-size);height:var(--tp-size);border:0;padding:0;border-radius:var(--tp-radius);background:radial-gradient(circle at 28% 18%,rgba(255,255,255,.96),rgba(253,232,255,.58) 42%,rgba(191,219,254,.32));box-shadow:0 20px 46px rgba(109,40,217,.22),0 8px 20px rgba(15,23,42,.18),inset 0 0 0 1px rgba(255,255,255,.78);cursor:grab;opacity:var(--tp-opacity);display:grid;place-items:center;backdrop-filter:blur(14px) saturate(1.3);transition:transform .22s cubic-bezier(.2,.8,.2,1),filter .18s ease,box-shadow .18s ease;}
      .tp-pet.is-cropped{background:transparent!important;backdrop-filter:none!important;}
      .tp-pet.is-cropped.no-decor{box-shadow:none!important;}
      .tp-pet.is-cropped.no-decor::before{display:none;}
      .tp-pet::before{content:"";position:absolute;inset:-9px;border-radius:inherit;background:conic-gradient(from 180deg,transparent,var(--tp-accent),var(--tp-accent-2),transparent);filter:blur(13px);opacity:var(--tp-glow-opacity);z-index:-1;}
      .tp-pet::after{content:"";position:absolute;inset:8px;border-radius:inherit;border:1px solid rgba(255,255,255,.62);pointer-events:none;}
      .tp-pet.is-cropped.no-decor::after{display:none;}
      .tp-pet:active{cursor:grabbing;transform:scale(.975) rotate(-1deg);}
      .tp-pet:hover{filter:brightness(1.04) saturate(1.08);box-shadow:0 24px 58px rgba(109,40,217,.28),0 10px 22px rgba(15,23,42,.2),inset 0 0 0 1px rgba(255,255,255,.85);}
      .tp-pet__frame{position:absolute;inset:var(--tp-outline-inset);border-radius:inherit;overflow:hidden;background:rgba(255,255,255,.42);box-shadow:0 0 0 var(--tp-outline-width) var(--tp-outline-color),0 10px 24px rgba(79,70,229,.12);}
      .tp-pet.is-cropped .tp-pet__frame{background:transparent!important;}
      .tp-pet.is-cropped.no-decor .tp-pet__frame{inset:0;border-radius:0!important;overflow:visible!important;background:transparent!important;box-shadow:none!important;filter:drop-shadow(0 8px 16px rgba(76,29,149,.18));}
      .tp-pet__frame.is-cutout{filter:drop-shadow(0 0 var(--tp-outline-width) var(--tp-outline-color)) drop-shadow(0 10px 16px rgba(109,40,217,.18));box-shadow:none;background:transparent;}
      .tp-pet__frame.is-circle{border-radius:999px;}
      .tp-pet__frame.is-square{border-radius:18px;}
      .tp-pet__frame.is-soft{border-radius:30% 38% 34% 42%;}
      .tp-pet img{width:100%;height:100%;object-fit:var(--tp-fit);object-position:var(--tp-pos-x) var(--tp-pos-y);transform:scale(var(--tp-img-scale));display:block;pointer-events:none;filter:saturate(1.06) contrast(1.02);}
      .tp-bubble{position:absolute;left:calc(var(--tp-size) + 12px);bottom:14px;width:max-content;max-width:280px;max-height:4.8em;overflow:hidden;padding:11px 14px;border-radius:20px 20px 20px 8px;background:linear-gradient(145deg,rgba(255,255,255,.94),rgba(253,244,255,.88));box-shadow:0 18px 40px rgba(109,40,217,.18),0 6px 14px rgba(15,23,42,.12);font-size:13px;line-height:1.55;white-space:pre-wrap;border:1px solid rgba(255,255,255,.82);color:#4c1d95;backdrop-filter:blur(16px) saturate(1.25);animation:tpBubble .18s ease-out;cursor:pointer;}
      .tp-bubble:not(:empty)::after{content:"点击继续";display:block;margin-top:4px;font-size:10px;color:#a855f7;opacity:.72;}
      .tp-bubble:empty{display:none;}
      @keyframes tpBubble{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      .tp-tools{position:absolute;left:4px;top:calc(var(--tp-size) + 10px);display:flex;gap:7px;padding:5px;border-radius:999px;background:rgba(255,255,255,.54);border:1px solid rgba(255,255,255,.72);box-shadow:0 14px 28px rgba(109,40,217,.14);backdrop-filter:blur(14px);}
      .tp-tools button,.tp-btn{border:1px solid rgba(255,255,255,.78);background:linear-gradient(135deg,rgba(255,255,255,.96),rgba(245,243,255,.9));color:#5b21b6;border-radius:999px;padding:8px 12px;font-size:12px;line-height:1;cursor:pointer;box-shadow:0 8px 18px rgba(124,58,237,.12);transition:transform .15s ease,box-shadow .15s ease,background .15s ease;}
      .tp-tools button:hover,.tp-btn:hover{transform:translateY(-1px);background:linear-gradient(135deg,#fff,#fae8ff);box-shadow:0 12px 24px rgba(124,58,237,.18);}
      .tp-chat{position:absolute;left:4px;top:calc(var(--tp-size) + 54px);width:min(300px,84vw);display:grid;grid-template-columns:1fr auto;gap:7px;padding:8px;border-radius:18px;background:rgba(255,255,255,.86);border:1px solid rgba(255,255,255,.8);box-shadow:0 16px 36px rgba(109,40,217,.18);backdrop-filter:blur(16px);}
      .tp-chat input{min-width:0;border:1px solid rgba(196,181,253,.58);border-radius:999px;background:#fff!important;color:#2e1065!important;-webkit-text-fill-color:#2e1065;padding:9px 12px;font-size:13px;outline:none;}
      .tp-chat input::placeholder{color:#a78bfa!important;-webkit-text-fill-color:#a78bfa;}
      .tp-wake{position:fixed;left:max(12px,env(safe-area-inset-left,0));bottom:max(12px,env(safe-area-inset-bottom,0));pointer-events:auto;border:1px solid rgba(255,255,255,.78);border-radius:999px;background:linear-gradient(135deg,#fff,#f5d0fe);color:#6b21a8;padding:11px 16px;font-size:13px;box-shadow:0 16px 34px rgba(124,58,237,.2);}
      .tp-panel{position:absolute;left:calc(var(--tp-size) + 16px);top:0;width:min(460px,calc(100vw - var(--tp-size) - 42px));max-height:min(740px,calc(100vh - 24px));overflow:auto;padding:16px;border-radius:28px;background:linear-gradient(155deg,rgba(255,255,255,.92),rgba(253,244,255,.88) 46%,rgba(239,246,255,.9));border:1px solid rgba(255,255,255,.82);box-shadow:0 26px 70px rgba(76,29,149,.24),0 8px 22px rgba(15,23,42,.1);backdrop-filter:blur(24px) saturate(1.35);}
      .tp-panel h2{margin:0 0 12px;font-size:18px;letter-spacing:.04em;color:#581c87;text-shadow:0 1px 0 rgba(255,255,255,.8);}
      .tp-tabs{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px;padding:5px;border-radius:18px;background:rgba(255,255,255,.58);border:1px solid rgba(255,255,255,.7);}
      .tp-tab{border:0;border-radius:999px;padding:8px 11px;background:transparent;color:#7c3aed;cursor:pointer;font-size:12px;font-weight:650;}
      .tp-tab.is-active{background:linear-gradient(135deg,#f0abfc,#bfdbfe);color:#3b0764;box-shadow:0 8px 18px rgba(124,58,237,.18);}
      .tp-section{display:none;}
      .tp-section.is-active{display:block;}
      .tp-field{display:grid;gap:5px;margin:9px 0;}
      .tp-field span{font-size:12px;color:#6d28d9;font-weight:650;}
      .tp-field input,.tp-field textarea,.tp-field select{width:100%;border:1px solid rgba(196,181,253,.52);border-radius:15px;background:rgba(255,255,255,.86)!important;color:#2e1065!important;-webkit-text-fill-color:#2e1065;padding:10px 12px;font-size:13px;outline:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.75),0 8px 18px rgba(124,58,237,.06);}
      .tp-field input::placeholder,.tp-field textarea::placeholder{color:#a78bfa!important;-webkit-text-fill-color:#a78bfa;}
      .tp-field input:focus,.tp-field textarea:focus,.tp-field select:focus{border-color:#c084fc;box-shadow:0 0 0 4px rgba(216,180,254,.24),0 8px 18px rgba(124,58,237,.08);}
      .tp-field textarea{min-height:78px;resize:vertical;}
      .tp-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
      .tp-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;}
      .tp-card{padding:12px;border-radius:20px;background:rgba(255,255,255,.62);border:1px solid rgba(255,255,255,.76);margin:10px 0;box-shadow:0 10px 26px rgba(124,58,237,.08);}
      .tp-list{display:grid;gap:8px;margin-top:8px;}
      .tp-item{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:10px;border-radius:16px;background:rgba(255,255,255,.62);border:1px solid rgba(255,255,255,.7);}
      .tp-item strong{display:block;font-size:13px;}
      .tp-item small{display:block;color:#7c3aed;opacity:.72;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:240px;}
      .tp-danger{background:linear-gradient(135deg,#fff1f2,#fecdd3)!important;color:#be123c!important;}
      .tp-muted{color:#7e5aa7;font-size:12px;line-height:1.6;}
      .tp-switch{display:flex;align-items:center;gap:8px;margin:9px 0;font-size:13px;color:#5b21b6;}
      .tp-switch input{width:auto;}
      .tp-now{font-size:12px;color:#6d28d9;max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .tp-preview{display:grid;place-items:center;min-height:150px;border-radius:22px;background:linear-gradient(135deg,rgba(255,255,255,.72),rgba(239,246,255,.72));border:1px dashed rgba(168,85,247,.34);overflow:hidden;}
      .tp-preview .tp-pet{cursor:default;transform:none!important;}
      .tp-editor{position:relative;display:grid;grid-template-columns:minmax(0,1fr);gap:10px;padding:12px;border-radius:22px;background:linear-gradient(135deg,rgba(255,255,255,.74),rgba(239,246,255,.72));border:1px solid rgba(255,255,255,.78);box-shadow:0 12px 28px rgba(124,58,237,.09);}
      .tp-editor__stage{position:relative;width:100%;aspect-ratio:1/1;min-height:220px;border-radius:20px;overflow:hidden;background:linear-gradient(135deg,#fff,#eff6ff);border:1px dashed rgba(168,85,247,.42);touch-action:none;cursor:crosshair;}
      .tp-editor__stage img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;user-select:none;}
      .tp-editor__crop{position:absolute;border:2px solid #a855f7;border-radius:10px;background:rgba(216,180,254,.18);box-shadow:0 0 0 999px rgba(46,16,101,.18),0 0 0 4px rgba(255,255,255,.65) inset;pointer-events:none;}
      .tp-editor__crop::after{content:"";position:absolute;right:-7px;bottom:-7px;width:14px;height:14px;border-radius:999px;background:#fff;border:2px solid #a855f7;box-shadow:0 4px 10px rgba(124,58,237,.25);}
      .tp-editor__canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;}
      .tp-editor__hint{font-size:12px;color:#7e5aa7;line-height:1.55;}
      .tp-modebar{display:flex;gap:7px;flex-wrap:wrap;}
      .tp-modebar .is-active{background:linear-gradient(135deg,#f0abfc,#bfdbfe);color:#3b0764;}
      .tp-outline-img{position:absolute!important;inset:0;width:100%;height:100%;object-fit:var(--tp-fit)!important;object-position:var(--tp-pos-x) var(--tp-pos-y)!important;transform:scale(var(--tp-img-scale))!important;pointer-events:none;z-index:2;}
      @media (max-width:640px){.tp-bubble{left:0;bottom:calc(var(--tp-size) + 50px);max-width:min(280px,82vw)}.tp-panel{left:0;top:calc(var(--tp-size) + 54px);width:min(94vw,460px);max-height:calc(100vh - var(--tp-size) - 82px)}.tp-row{grid-template-columns:1fr}.tp-tabs{overflow:auto;flex-wrap:nowrap}.tp-tab{white-space:nowrap}}
    `;
    (doc.head || doc.documentElement).appendChild(style);
  }

  function getRoot() {
    const doc = hostDocument();
    let root = doc.getElementById(ROOT_ID);
    if (!root) {
      root = doc.createElement('div');
      root.id = ROOT_ID;
      (doc.body || doc.documentElement).appendChild(root);
    }
    return root;
  }

  function render() {
    if (!state.settings.enabled) {
      const root = getRoot();
      root.innerHTML = '<button class="tp-wake" type="button" data-action="enable-pet">显示桌宠</button>';
      bindEvents(root);
      return;
    }

    const s = state.settings;
    const image = getCurrentImage();
    const root = getRoot();
    const view = viewport();
    state.settings.x = clamp(s.x, view.offsetLeft, view.offsetLeft + view.width - 64);
    state.settings.y = clamp(s.y, view.offsetTop, view.offsetTop + view.height - 64);
    root.style.setProperty('--tp-x', `${state.settings.x}px`);
    root.style.setProperty('--tp-y', `${state.settings.y}px`);
    root.style.setProperty('--tp-size', `${s.size}px`);
    root.style.setProperty('--tp-opacity', String(s.opacity));
    applyImageVars(root, s);
    root.innerHTML = `
      <div class="tp-wrap" data-role="wrap">
        <button class="tp-pet ${s.croppedImage ? 'is-cropped' : ''} ${s.croppedImage && !s.edgeDecorEnabled ? 'no-decor' : ''}" type="button" data-action="pet-click" title="点击切换表情，拖拽移动">
          ${renderPetFrame(image, s)}
        </button>
        <div class="tp-bubble" data-role="bubble">${escapeHtml(state.bubbleText)}</div>
        <div class="tp-tools">
          <button type="button" data-action="toggle-panel">设置</button>
          <button type="button" data-action="manual-comment">评论</button>
          <button type="button" data-action="toggle-chat">聊天</button>
          <button type="button" data-action="toggle-listen">${state.listening ? '退出听歌' : '听歌'}</button>
          <button type="button" data-action="quick-line">说话</button>
        </div>
        ${state.chatOpen ? `<div class="tp-chat"><input data-role="chat-input" placeholder="和${escapeHtml(s.roleName || '桌宠')}说一句..."><button class="tp-btn" type="button" data-action="send-chat">发送</button></div>` : ''}
        ${s.panelOpen ? renderPanel() : ''}
      </div>
    `;
    bindEvents(root);
  }

  function shapeClass(settings = state.settings) {
    if (settings.imageShape === 'circle') return 'is-circle';
    if (settings.imageShape === 'square') return 'is-square';
    if (settings.imageShape === 'cutout') return 'is-cutout';
    return 'is-soft';
  }

  function shapeRadius(settings = state.settings) {
    if (settings.imageShape === 'circle') return '999px';
    if (settings.imageShape === 'square') return '22px';
    if (settings.imageShape === 'cutout') return '34% 40% 32% 44%';
    return '30% 38% 34% 42%';
  }

  function applyImageVars(target, settings = state.settings) {
    target.style.setProperty('--tp-radius', shapeRadius(settings));
    target.style.setProperty('--tp-fit', settings.imageFit || 'cover');
    target.style.setProperty('--tp-pos-x', `${clamp(numberOr(settings.imagePositionX, 50), 0, 100)}%`);
    target.style.setProperty('--tp-pos-y', `${clamp(numberOr(settings.imagePositionY, 50), 0, 100)}%`);
    target.style.setProperty('--tp-img-scale', String(clamp(numberOr(settings.imageScale, 1), 0.6, 2.4)));
    target.style.setProperty('--tp-outline-width', settings.outlineEnabled ? `${clamp(numberOr(settings.outlineWidth, 0), 0, 8)}px` : '0px');
    target.style.setProperty('--tp-outline-color', settings.outlineColor || '#ffffff');
    target.style.setProperty('--tp-outline-inset', settings.imageShape === 'cutout' ? '4px' : '8px');
    target.style.setProperty('--tp-glow-opacity', settings.glowEnabled ? '.9' : '0');
    target.style.setProperty('--tp-accent', settings.glowColor || '#f0abfc');
  }

  function renderPetFrame(image, settings = state.settings) {
    return `<span class="tp-pet__frame ${shapeClass(settings)}"><img src="${escapeHtml(image)}" alt="${escapeHtml(settings.roleName)}">${settings.manualOutline ? `<img class="tp-outline-img" src="${escapeHtml(settings.manualOutline)}" alt="手绘描边">` : ''}</span>`;
  }

  function cropStyle() {
    const box = state.settings.cropBox || DEFAULT_SETTINGS.cropBox;
    return `left:${escapeHtml(box.x)}%;top:${escapeHtml(box.y)}%;width:${escapeHtml(box.w)}%;height:${escapeHtml(box.h)}%;`;
  }

  function renderImageEditor() {
    const image = getSourceImage();
    return `
      <div class="tp-editor">
        <div class="tp-modebar">
          <button class="tp-btn ${state.imageEditorMode === 'crop' ? 'is-active' : ''}" data-action="editor-mode" data-mode="crop" type="button">框选取景</button>
          <button class="tp-btn ${state.imageEditorMode === 'draw' ? 'is-active' : ''}" data-action="editor-mode" data-mode="draw" type="button">手绘描边</button>
          <button class="tp-btn" data-action="auto-crop-edge" type="button">框选角色边缘</button>
          <button class="tp-btn" data-action="clear-crop" type="button">回到原图</button>
          <button class="tp-btn tp-danger" data-action="clear-manual-outline" type="button">清除手绘</button>
        </div>
        <div class="tp-editor__stage" data-role="image-editor-stage">
          <img src="${escapeHtml(image)}" alt="取景编辑图" crossorigin="anonymous">
          <div class="tp-editor__crop" data-role="crop-box"></div>
          <canvas class="tp-editor__canvas" data-role="outline-canvas" width="640" height="640"></canvas>
        </div>
        <div class="tp-editor__hint">框选取景：拖拽后只显示选中的部分，不额外加背景。框选角色边缘：类似 PS 魔棒/边缘抠图，按图片四角背景色和透明度把角色外区域变透明。跨域图片无法读取像素时会使用安全内缩范围。</div>
      </div>
    `;
  }

  function renderPanel() {
    const s = state.settings;
    const tab = s.activeTab || 'role';
    return `
      <div class="tp-panel" data-role="panel">
        <h2>${escapeHtml(s.roleName || '桌宠')} 设置</h2>
        <div class="tp-tabs">
          <button class="tp-tab ${tab === 'role' ? 'is-active' : ''}" data-tab="role" type="button">角色</button>
          <button class="tp-tab ${tab === 'images' ? 'is-active' : ''}" data-tab="images" type="button">图片差分</button>
          <button class="tp-tab ${tab === 'music' ? 'is-active' : ''}" data-tab="music" type="button">歌曲</button>
          <button class="tp-tab ${tab === 'api' ? 'is-active' : ''}" data-tab="api" type="button">API与模式</button>
          <button class="tp-tab ${tab === 'ui' ? 'is-active' : ''}" data-tab="ui" type="button">外观</button>
        </div>
        <div class="tp-section ${tab === 'role' ? 'is-active' : ''}" data-section="role">${renderRoleSection()}</div>
        <div class="tp-section ${tab === 'images' ? 'is-active' : ''}" data-section="images">${renderImagesSection()}</div>
        <div class="tp-section ${tab === 'music' ? 'is-active' : ''}" data-section="music">${renderMusicSection()}</div>
        <div class="tp-section ${tab === 'api' ? 'is-active' : ''}" data-section="api">${renderApiSection()}</div>
        <div class="tp-section ${tab === 'ui' ? 'is-active' : ''}" data-section="ui">${renderUiSection()}</div>
      </div>
    `;
  }

  function renderRoleSection() {
    const s = state.settings;
    return `
      <label class="tp-field"><span>角色名称</span><input data-setting="roleName" value="${escapeHtml(s.roleName)}"></label>
      <label class="tp-field"><span>角色设定，只写桌宠是谁、性格、说话习惯、边界，不写任务规则</span><textarea data-setting="roleSetting">${escapeHtml(s.roleSetting)}</textarea></label>
      <label class="tp-field"><span>评论指导，规定桌宠如何基于剧情评论</span><textarea data-setting="commentPrompt">${escapeHtml(s.commentPrompt)}</textarea></label>
      <label class="tp-field"><span>聊天指导，规定桌宠如何与用户直接对话</span><textarea data-setting="chatPrompt">${escapeHtml(s.chatPrompt)}</textarea></label>
      <label class="tp-field"><span>人设提示词模板，可用 {{role_name}}、{{role_setting}}</span><textarea data-setting="personaPromptTemplate">${escapeHtml(s.personaPromptTemplate)}</textarea></label>
      <label class="tp-field"><span>评论发送模板，可用 {{persona_prompt}}、{{comment_prompt}}、{{latest_message}}、{{bubble_format_prompt}}</span><textarea data-setting="commentPromptTemplate">${escapeHtml(s.commentPromptTemplate)}</textarea></label>
      <label class="tp-field"><span>聊天发送模板，可用 {{persona_prompt}}、{{chat_prompt}}、{{user_message}}、{{bubble_format_prompt}}</span><textarea data-setting="chatPromptTemplate">${escapeHtml(s.chatPromptTemplate)}</textarea></label>
      <label class="tp-field"><span>气泡显示提示，可自行改成更短/更长/多句规则</span><textarea data-setting="bubbleFormatPrompt">${escapeHtml(s.bubbleFormatPrompt)}</textarea></label>
      <label class="tp-field"><span>没有剧情上下文时发送给模型的占位文本</span><input data-setting="emptyContextText" value="${escapeHtml(s.emptyContextText)}"></label>
      <label class="tp-field"><span>自定义随机短句，每行一句</span><textarea data-setting="quickLinesText">${escapeHtml(s.quickLines.join('\n'))}</textarea></label>
      <div class="tp-actions"><button class="tp-btn" data-action="save-settings" type="button">保存角色</button><button class="tp-btn" data-action="test-comment" type="button">测试评论</button></div>
    `;
  }

  function renderImagesSection() {
    const s = state.settings;
    const expressions = s.expressions.map((item, index) => `
      <div class="tp-item">
        <div><strong>${escapeHtml(item.name || `差分${index + 1}`)}</strong><small>${escapeHtml(item.keywords || '无关键词')}</small></div>
        <div><button class="tp-btn" data-action="use-expression" data-index="${index}" type="button">预览</button><button class="tp-btn tp-danger" data-action="delete-expression" data-index="${index}" type="button">删</button></div>
      </div>`).join('') || '<div class="tp-muted">还没有差分图片。</div>';
    return `
      ${renderImageEditor()}
      <div class="tp-muted">下方取景、形状、描边会同时作用于默认图片、点击图片和所有差分图片。</div>
      <label class="tp-field"><span>悬浮窗默认图片链接</span><input data-setting="normalImage" value="${escapeHtml(s.normalImage)}"></label>
      <label class="tp-field"><span>点击后的图片链接</span><input data-setting="clickImage" value="${escapeHtml(s.clickImage)}"></label>
      <div class="tp-row">
        <label class="tp-field"><span>显示形状</span><select data-setting="imageShape"><option value="soft" ${s.imageShape === 'soft' ? 'selected' : ''}>柔和异形</option><option value="circle" ${s.imageShape === 'circle' ? 'selected' : ''}>圆形</option><option value="square" ${s.imageShape === 'square' ? 'selected' : ''}>正方形</option><option value="cutout" ${s.imageShape === 'cutout' ? 'selected' : ''}>描边提取</option></select></label>
        <label class="tp-field"><span>填充方式</span><select data-setting="imageFit"><option value="cover" ${s.imageFit === 'cover' ? 'selected' : ''}>填满裁切</option><option value="contain" ${s.imageFit === 'contain' ? 'selected' : ''}>完整显示</option></select></label>
      </div>
      <div class="tp-row">
        <label class="tp-field"><span>横向取景 ${escapeHtml(s.imagePositionX)}%</span><input data-setting="imagePositionX" type="range" min="0" max="100" value="${escapeHtml(s.imagePositionX)}"></label>
        <label class="tp-field"><span>纵向取景 ${escapeHtml(s.imagePositionY)}%</span><input data-setting="imagePositionY" type="range" min="0" max="100" value="${escapeHtml(s.imagePositionY)}"></label>
      </div>
      <label class="tp-field"><span>图片缩放 ${escapeHtml(s.imageScale)}</span><input data-setting="imageScale" type="range" min="0.6" max="2.4" step="0.05" value="${escapeHtml(s.imageScale)}"></label>
      <div class="tp-row">
        <label class="tp-switch"><input type="checkbox" data-setting="outlineEnabled" ${s.outlineEnabled ? 'checked' : ''}>描边</label>
        <label class="tp-field"><span>描边粗细</span><input data-setting="outlineWidth" type="range" min="0" max="8" step="1" value="${escapeHtml(s.outlineWidth)}"></label>
      </div>
      <label class="tp-switch"><input type="checkbox" data-setting="edgeDecorEnabled" ${s.edgeDecorEnabled ? 'checked' : ''}>裁切图保留边缘装饰与自选形状</label>
      <div class="tp-row">
        <label class="tp-field"><span>描边颜色</span><input data-setting="outlineColor" type="color" value="${escapeHtml(s.outlineColor)}"></label>
        <label class="tp-field"><span>光晕颜色</span><input data-setting="glowColor" type="color" value="${escapeHtml(s.glowColor)}"></label>
      </div>
      <label class="tp-switch"><input type="checkbox" data-setting="glowEnabled" ${s.glowEnabled ? 'checked' : ''}>桌宠柔光光晕</label>
      <div class="tp-card">
        <label class="tp-field"><span>差分名称</span><input data-temp="exprName" placeholder="例如：生气"></label>
        <label class="tp-field"><span>差分图片链接</span><input data-temp="exprUrl" placeholder="https://..."></label>
        <label class="tp-field"><span>触发关键词，用逗号分隔</span><input data-temp="exprKeywords" placeholder="生气,愤怒,吵架"></label>
        <button class="tp-btn" data-action="add-expression" type="button">添加差分</button>
      </div>
      <div class="tp-list">${expressions}</div>
    `;
  }

  function renderMusicSection() {
    const current = state.currentSongIndex >= 0 ? state.settings.songs[state.currentSongIndex] : null;
    const songs = state.settings.songs.map((song, index) => `
      <div class="tp-item">
        <div><strong>${escapeHtml(song.name || `歌曲${index + 1}`)}</strong><small>${escapeHtml(song.url)}</small></div>
        <div><button class="tp-btn" data-action="play-song" data-index="${index}" type="button">播放</button><button class="tp-btn tp-danger" data-action="delete-song" data-index="${index}" type="button">删</button></div>
      </div>`).join('') || '<div class="tp-muted">还没有歌曲。输入名称和直链后即可保存。</div>';
    return `
      <div class="tp-card">
        <div class="tp-now">当前：${escapeHtml(current?.name || '未播放')}</div>
        <div class="tp-actions"><button class="tp-btn" data-action="prev-song" type="button">上一首</button><button class="tp-btn" data-action="pause-song" type="button">暂停/继续</button><button class="tp-btn" data-action="next-song" type="button">下一首</button></div>
      </div>
      <div class="tp-row">
        <label class="tp-field"><span>歌曲名称</span><input data-temp="songName" placeholder="夜间主题"></label>
        <label class="tp-field"><span>歌曲链接</span><input data-temp="songUrl" placeholder="https://...mp3"></label>
      </div>
      <button class="tp-btn" data-action="add-song" type="button">保存歌曲</button>
      <div class="tp-list">${songs}</div>
    `;
  }

  function renderApiSection() {
    const s = state.settings;
    return `
      <label class="tp-field"><span>桌宠模式</span><select data-setting="mode"><option value="persona" ${s.mode === 'persona' ? 'selected' : ''}>仅人设模式</option><option value="personaContextPreset" ${s.mode === 'personaContextPreset' ? 'selected' : ''}>人设 + 上下文 + 预设模式</option></select></label>
      <label class="tp-field"><span>API来源</span><select data-setting="apiMode"><option value="tavern" ${s.apiMode === 'tavern' ? 'selected' : ''}>酒馆主API</option><option value="custom" ${s.apiMode === 'custom' ? 'selected' : ''}>自定义OpenAI兼容API</option></select></label>
      <label class="tp-field"><span>自定义API地址</span><input data-setting="customApiUrl" value="${escapeHtml(s.customApiUrl)}" placeholder="https://api.example.com/v1/chat/completions"></label>
      <label class="tp-field"><span>自定义API Key</span><input data-setting="customApiKey" value="${escapeHtml(s.customApiKey)}" placeholder="sk-..."></label>
      <label class="tp-field"><span>自定义模型</span><input data-setting="customApiModel" value="${escapeHtml(s.customApiModel)}" placeholder="gpt-4o-mini"></label>
      <label class="tp-switch"><input type="checkbox" data-setting="autoComment" ${s.autoComment ? 'checked' : ''}>AI回复后自动生成气泡评论</label>
      <label class="tp-switch"><input type="checkbox" data-setting="bubbleEnabled" ${s.bubbleEnabled ? 'checked' : ''}>显示聊天气泡</label>
      <label class="tp-field"><span>评论冷却秒数</span><input data-setting="commentCooldown" type="number" min="3" max="999" value="${escapeHtml(s.commentCooldown)}"></label>
      <div class="tp-muted">角色设定、评论指导和聊天指导在「角色」页编辑。生成时会实时读取你保存后的最新内容。</div>
      <div class="tp-actions"><button class="tp-btn" data-action="save-settings" type="button">保存API</button><button class="tp-btn" data-action="test-comment" type="button">生成测试评论</button></div>
    `;
  }

  function renderUiSection() {
    const s = state.settings;
    return `
      <label class="tp-field"><span>桌宠尺寸</span><input data-setting="size" type="range" min="72" max="220" value="${escapeHtml(s.size)}"></label>
      <label class="tp-field"><span>透明度</span><input data-setting="opacity" type="range" min="0.35" max="1" step="0.01" value="${escapeHtml(s.opacity)}"></label>
      <label class="tp-switch"><input type="checkbox" data-setting="enabled" ${s.enabled ? 'checked' : ''}>启用桌宠</label>
      <div class="tp-actions"><button class="tp-btn" data-action="save-settings" type="button">保存外观</button><button class="tp-btn" data-action="export-settings" type="button">导出配置</button><button class="tp-btn tp-danger" data-action="reset-settings" type="button">重置</button></div>
      <label class="tp-field"><span>导入配置JSON</span><textarea data-temp="importJson" placeholder="粘贴导出的JSON"></textarea></label>
      <button class="tp-btn" data-action="import-settings" type="button">导入配置</button>
    `;
  }

  function bindEvents(root) {
    root.querySelector('[data-action="pet-click"]')?.addEventListener('pointerdown', startDrag);
    root.querySelector('[data-action="pet-click"]')?.addEventListener('click', petClick);
    root.querySelectorAll('[data-action]').forEach(el => {
      if (el.dataset.action !== 'pet-click') el.addEventListener('click', handleAction);
    });
    root.querySelectorAll('[data-tab]').forEach(el => el.addEventListener('click', switchTab));
    root.querySelectorAll('[data-setting]').forEach(el => {
      el.addEventListener('change', updateSettingFromInput);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.addEventListener('input', updateSettingFromInput);
    });
    root.querySelector('[data-role="chat-input"]')?.addEventListener('keydown', event => {
      if (event.key === 'Enter') sendChatMessage();
    });
    root.querySelector('[data-role="image-editor-stage"]')?.addEventListener('pointerdown', startImageEdit);
    root.querySelector('[data-role="bubble"]')?.addEventListener('click', advanceBubble);
    const stage = root.querySelector('[data-role="image-editor-stage"]');
    updateCropBoxElement(stage);
    stage?.querySelector('img')?.addEventListener('load', () => updateCropBoxElement(stage));
    initOutlineCanvas(root);
  }

  function switchTab(event) {
    const tab = event.currentTarget.dataset.tab;
    state.settings.activeTab = tab;
    saveSettings();
    const panel = event.currentTarget.closest('[data-role="panel"]');
    panel.querySelectorAll('[data-tab]').forEach(el => el.classList.toggle('is-active', el.dataset.tab === tab));
    panel.querySelectorAll('[data-section]').forEach(el => el.classList.toggle('is-active', el.dataset.section === tab));
  }

  function updateSettingFromInput(event) {
    const el = event.currentTarget;
    const key = el.dataset.setting;
    if (!key) return;
    if (key === 'quickLinesText') state.settings.quickLines = el.value.split(/\n+/).map(v => v.trim()).filter(Boolean);
    else if (el.type === 'checkbox') state.settings[key] = el.checked;
    else if (el.type === 'number' || el.type === 'range') state.settings[key] = Number(el.value);
    else state.settings[key] = el.value;
    normalizeSettings();
    if (['normalImage', 'clickImage'].includes(key)) clearCroppedImage();
    saveSettings();
    if (key === 'size') getRoot().style.setProperty('--tp-size', `${state.settings.size}px`);
    if (key === 'opacity') getRoot().style.setProperty('--tp-opacity', String(state.settings.opacity));
    if (['imageFit', 'imagePositionX', 'imagePositionY', 'imageScale', 'outlineEnabled', 'outlineColor', 'outlineWidth', 'glowEnabled', 'glowColor'].includes(key)) applyImageVars(getRoot());
    if (['normalImage', 'clickImage', 'imageShape', 'edgeDecorEnabled'].includes(key)) render();
    if (key === 'enabled') render();
  }

  function normalizeSettings() {
    state.settings.size = clamp(Number(state.settings.size) || DEFAULT_SETTINGS.size, 72, 220);
    state.settings.opacity = clamp(Number(state.settings.opacity) || DEFAULT_SETTINGS.opacity, 0.35, 1);
    state.settings.imagePositionX = clamp(numberOr(state.settings.imagePositionX, DEFAULT_SETTINGS.imagePositionX), 0, 100);
    state.settings.imagePositionY = clamp(numberOr(state.settings.imagePositionY, DEFAULT_SETTINGS.imagePositionY), 0, 100);
    state.settings.imageScale = clamp(numberOr(state.settings.imageScale, DEFAULT_SETTINGS.imageScale), 0.6, 2.4);
    state.settings.outlineWidth = clamp(numberOr(state.settings.outlineWidth, DEFAULT_SETTINGS.outlineWidth), 0, 8);
    state.settings.cropBox = state.settings.cropBox || clone(DEFAULT_SETTINGS.cropBox);
    state.settings.cropBox.x = clamp(numberOr(state.settings.cropBox.x, DEFAULT_SETTINGS.cropBox.x), 0, 100);
    state.settings.cropBox.y = clamp(numberOr(state.settings.cropBox.y, DEFAULT_SETTINGS.cropBox.y), 0, 100);
    state.settings.cropBox.w = clamp(numberOr(state.settings.cropBox.w, DEFAULT_SETTINGS.cropBox.w), 5, 100);
    state.settings.cropBox.h = clamp(numberOr(state.settings.cropBox.h, DEFAULT_SETTINGS.cropBox.h), 5, 100);
    state.settings.commentCooldown = clamp(Number(state.settings.commentCooldown) || DEFAULT_SETTINGS.commentCooldown, 3, 999);
  }

  function setEditorMode(mode) {
    state.imageEditorMode = mode === 'draw' ? 'draw' : 'crop';
    render();
  }

  function imageDisplayRect(stage) {
    const rect = stage.getBoundingClientRect();
    const img = stage.querySelector('img');
    const naturalW = img?.naturalWidth || rect.width;
    const naturalH = img?.naturalHeight || rect.height;
    const scale = Math.min(rect.width / naturalW, rect.height / naturalH);
    const width = naturalW * scale;
    const height = naturalH * scale;
    return {
      left: (rect.width - width) / 2,
      top: (rect.height - height) / 2,
      width,
      height,
      rect,
    };
  }

  function pointInImage(event, stage) {
    const area = imageDisplayRect(stage);
    return {
      x: clamp(((event.clientX - area.rect.left - area.left) / area.width) * 100, 0, 100),
      y: clamp(((event.clientY - area.rect.top - area.top) / area.height) * 100, 0, 100),
      area,
    };
  }

  function updateCropBoxElement(stage) {
    const el = stage?.querySelector('[data-role="crop-box"]');
    if (!el) return;
    const area = imageDisplayRect(stage);
    const box = state.settings.cropBox || DEFAULT_SETTINGS.cropBox;
    el.style.left = `${area.left + area.width * box.x / 100}px`;
    el.style.top = `${area.top + area.height * box.y / 100}px`;
    el.style.width = `${area.width * box.w / 100}px`;
    el.style.height = `${area.height * box.h / 100}px`;
  }

  function startImageEdit(event) {
    const stage = event.currentTarget;
    if (state.imageEditorMode === 'draw') return startManualOutline(event, stage);
    const start = pointInImage(event, stage);
    state.cropDrag = { startX: start.x, startY: start.y, stage };
    const doc = hostDocument();
    doc.addEventListener('pointermove', moveCropBox);
    doc.addEventListener('pointerup', finishCropBox, { once: true });
    event.preventDefault();
  }

  function moveCropBox(event) {
    if (!state.cropDrag) return;
    const point = pointInImage(event, state.cropDrag.stage);
    const x = Math.min(state.cropDrag.startX, point.x);
    const y = Math.min(state.cropDrag.startY, point.y);
    const w = Math.abs(point.x - state.cropDrag.startX);
    const h = Math.abs(point.y - state.cropDrag.startY);
    const box = { x, y, w: Math.max(5, w), h: Math.max(5, h) };
    state.settings.cropBox = box;
    updateCropBoxElement(state.cropDrag.stage);
  }

  async function finishCropBox() {
    hostDocument().removeEventListener('pointermove', moveCropBox);
    state.cropDrag = null;
    applyCropBoxToView();
    await generateCroppedImage().catch(error => {
      console.warn(`[${SCRIPT_NAME}] 生成 PNG 裁切图失败，改用 SVG 裁切兜底`, error);
      generateSvgCroppedImage();
    });
    saveSettings();
    render();
  }

  function applyCropBoxToView() {
    const box = state.settings.cropBox || DEFAULT_SETTINGS.cropBox;
    state.settings.imageFit = 'cover';
    state.settings.imagePositionX = clamp(box.x + box.w / 2, 0, 100);
    state.settings.imagePositionY = clamp(box.y + box.h / 2, 0, 100);
    state.settings.imageScale = clamp(Math.max(100 / Math.max(1, box.w), 100 / Math.max(1, box.h)), 0.6, 2.4);
  }

  async function generateCroppedImage() {
    const source = getSourceImage();
    const box = state.settings.cropBox || DEFAULT_SETTINGS.cropBox;
    const img = await loadImageForCanvas(source);
    const canvas = hostDocument().createElement('canvas');
    const size = 768;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const sx = img.naturalWidth * box.x / 100;
    const sy = img.naturalHeight * box.y / 100;
    const sw = img.naturalWidth * box.w / 100;
    const sh = img.naturalHeight * box.h / 100;
    const scale = Math.min(size / sw, size / sh);
    const dw = sw * scale;
    const dh = sh * scale;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, sx, sy, sw, sh, (size - dw) / 2, (size - dh) / 2, dw, dh);
    state.settings.croppedImage = canvas.toDataURL('image/png');
    state.settings.imageFit = 'contain';
    state.settings.imagePositionX = 50;
    state.settings.imagePositionY = 50;
    state.settings.imageScale = 1;
  }

  function generateSvgCroppedImage() {
    const source = getSourceImage();
    const box = state.settings.cropBox || DEFAULT_SETTINGS.cropBox;
    const view = 768;
    const scale = Math.min(100 / Math.max(1, box.w), 100 / Math.max(1, box.h));
    const imgW = view * scale;
    const imgH = view * scale;
    const x = view / 2 - imgW * (box.x + box.w / 2) / 100;
    const y = view / 2 - imgH * (box.y + box.h / 2) / 100;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${view} ${view}" width="${view}" height="${view}"><rect width="100%" height="100%" fill="transparent"/><image href="${escapeSvg(source)}" x="${x}" y="${y}" width="${imgW}" height="${imgH}" preserveAspectRatio="none"/></svg>`;
    state.settings.croppedImage = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    state.settings.imageFit = 'contain';
    state.settings.imagePositionX = 50;
    state.settings.imagePositionY = 50;
    state.settings.imageScale = 1;
  }

  function escapeSvg(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function clearCroppedImage() {
    state.settings.croppedImage = '';
  }

  function clearCrop() {
    clearCroppedImage();
    state.settings.cropBox = clone(DEFAULT_SETTINGS.cropBox);
    state.settings.imageFit = 'cover';
    state.settings.imagePositionX = 50;
    state.settings.imagePositionY = 50;
    state.settings.imageScale = 1;
    saveSettings();
    render();
    updateBubble('已回到原图。');
  }

  function initOutlineCanvas(root) {
    const canvas = root.querySelector('[data-role="outline-canvas"]');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!state.settings.manualOutline) return;
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    img.src = state.settings.manualOutline;
  }

  function startManualOutline(event, stage) {
    const canvas = stage.querySelector('[data-role="outline-canvas"]');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const p = pointInCanvas(event, canvas);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = state.settings.outlineColor || '#ffffff';
    ctx.lineWidth = Math.max(2, numberOr(state.settings.outlineWidth, 2) * 2.2);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    state.drawState = { canvas, ctx };
    const doc = hostDocument();
    doc.addEventListener('pointermove', drawManualOutline);
    doc.addEventListener('pointerup', finishManualOutline, { once: true });
    event.preventDefault();
  }

  function pointInCanvas(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * canvas.width, 0, canvas.width),
      y: clamp(((event.clientY - rect.top) / rect.height) * canvas.height, 0, canvas.height),
    };
  }

  function drawManualOutline(event) {
    if (!state.drawState) return;
    const p = pointInCanvas(event, state.drawState.canvas);
    state.drawState.ctx.lineTo(p.x, p.y);
    state.drawState.ctx.stroke();
  }

  function finishManualOutline() {
    hostDocument().removeEventListener('pointermove', drawManualOutline);
    if (state.drawState?.canvas) {
      state.settings.manualOutline = state.drawState.canvas.toDataURL('image/png');
      state.settings.outlineEnabled = true;
      saveSettings();
      render();
    }
    state.drawState = null;
  }

  function clearManualOutline() {
    state.settings.manualOutline = '';
    saveSettings();
    render();
    updateBubble('手绘描边已清除。');
  }

  async function autoCropEdge() {
    const img = await loadImageForCanvas(getSourceImage()).catch(() => null);
    if (!img) {
      await setSafeCropBox();
      return;
    }
    try {
      const result = createEdgeCutoutImage(img);
      if (!result) return setSafeCropBox();
      state.settings.cropBox = result.cropBox;
      state.settings.croppedImage = result.dataUrl;
      state.settings.imageFit = 'contain';
      state.settings.imagePositionX = 50;
      state.settings.imagePositionY = 50;
      state.settings.imageScale = 1;
      saveSettings();
      render();
      updateBubble('已按角色边缘抠图。');
    } catch (error) {
      console.warn(`[${SCRIPT_NAME}] 一键框选边缘失败`, error);
      await setSafeCropBox();
    }
  }

  function createEdgeCutoutImage(img) {
    const doc = hostDocument();
    const size = 768;
    const canvas = doc.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    const scale = Math.min(size / img.naturalWidth, size / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = (size - dw) / 2;
    const dy = (size - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    const corners = [sampleColor(data, size, 4, 4), sampleColor(data, size, size - 5, 4), sampleColor(data, size, 4, size - 5), sampleColor(data, size, size - 5, size - 5)];
    const bg = new Uint8Array(size * size);
    const queue = [];
    const push = (x, y) => {
      if (x < 0 || y < 0 || x >= size || y >= size) return;
      const p = y * size + x;
      if (bg[p]) return;
      const i = p * 4;
      if (data[i + 3] < 30 || corners.some(c => colorDistance(data, i, c) < 46)) {
        bg[p] = 1;
        queue.push(p);
      }
    };
    for (let i = 0; i < size; i += 2) {
      push(i, 0); push(i, size - 1); push(0, i); push(size - 1, i);
    }
    for (let head = 0; head < queue.length; head++) {
      const p = queue[head];
      const x = p % size;
      const y = Math.floor(p / size);
      push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
    }
    let minX = size;
    let minY = size;
    let maxX = 0;
    let maxY = 0;
    let found = false;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const p = y * size + x;
        const i = p * 4;
        if (bg[p]) data[i + 3] = 0;
        if (data[i + 3] > 30) {
          found = true;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    if (!found) return null;
    ctx.putImageData(imageData, 0, 0);
    const pad = Math.round(size * 0.035);
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(size - 1, maxX + pad);
    maxY = Math.min(size - 1, maxY + pad);
    const sw = maxX - minX + 1;
    const sh = maxY - minY + 1;
    const out = doc.createElement('canvas');
    out.width = size;
    out.height = size;
    const outCtx = out.getContext('2d');
    const outScale = Math.min(size / sw, size / sh);
    const ow = sw * outScale;
    const oh = sh * outScale;
    outCtx.clearRect(0, 0, size, size);
    outCtx.drawImage(canvas, minX, minY, sw, sh, (size - ow) / 2, (size - oh) / 2, ow, oh);
    const cropBox = {
      x: clamp(((minX - dx) / dw) * 100, 0, 100),
      y: clamp(((minY - dy) / dh) * 100, 0, 100),
      w: clamp((sw / dw) * 100, 5, 100),
      h: clamp((sh / dh) * 100, 5, 100),
    };
    return { dataUrl: out.toDataURL('image/png'), cropBox };
  }

  function sampleColor(data, width, x, y) {
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  }

  function colorDistance(data, i, color) {
    if (data[i + 3] < 30 || color[3] < 30) return 0;
    const dr = data[i] - color[0];
    const dg = data[i + 1] - color[1];
    const db = data[i + 2] - color[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  function loadImageForCanvas(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  async function setSafeCropBox() {
    state.settings.cropBox = { x: 10, y: 8, w: 80, h: 84 };
    applyCropBoxToView();
    await generateCroppedImage().catch(() => generateSvgCroppedImage());
    saveSettings();
    render();
    updateBubble('无法读取图片像素，已使用安全框选。');
  }

  function handleAction(event) {
    const el = event.currentTarget;
    const action = el.dataset.action;
    const index = Number(el.dataset.index);
    const panel = el.closest('[data-role="panel"]');
    if (action === 'toggle-panel') togglePanel();
    if (action === 'manual-comment') manualComment();
    if (action === 'toggle-chat') toggleChat();
    if (action === 'send-chat') sendChatMessage();
    if (action === 'enable-pet') resetPosition();
    if (action === 'toggle-listen') toggleListen();
    if (action === 'quick-line') speakRandomLine();
    if (action === 'save-settings') saveAndRender();
    if (action === 'test-comment') createComment(true);
    if (action === 'add-expression') addExpression(panel);
    if (action === 'delete-expression') deleteExpression(index);
    if (action === 'use-expression') previewExpression(index);
    if (action === 'editor-mode') setEditorMode(el.dataset.mode || 'crop');
    if (action === 'auto-crop-edge') autoCropEdge();
    if (action === 'clear-crop') clearCrop();
    if (action === 'clear-manual-outline') clearManualOutline();
    if (action === 'add-song') addSong(panel);
    if (action === 'delete-song') deleteSong(index);
    if (action === 'play-song') playSong(index);
    if (action === 'pause-song') toggleSongPause();
    if (action === 'prev-song') playRelativeSong(-1);
    if (action === 'next-song') playRelativeSong(1);
    if (action === 'export-settings') exportSettings();
    if (action === 'import-settings') importSettings(panel);
    if (action === 'reset-settings') resetSettings();
  }

  function togglePanel() {
    state.settings.panelOpen = !state.settings.panelOpen;
    saveSettings();
    render();
  }

  function saveAndRender() {
    normalizeSettings();
    saveSettings();
    notify('success', '配置已保存');
    render();
  }

  function petClick(event) {
    if (state.dragging) {
      event.preventDefault();
      return;
    }
    if (state.settings.clickImage) {
      state.currentImageMode = state.currentImageMode === 'click' ? 'normal' : 'click';
      clearCroppedImage();
      render();
    }
    speakRandomLine();
  }

  function getCurrentImage() {
    if (state.settings.croppedImage) return state.settings.croppedImage;
    return getSourceImage();
  }

  function getSourceImage() {
    if (state.currentImageMode === 'click' && state.settings.clickImage) return state.settings.clickImage;
    if (state.currentImageMode.startsWith('expr:')) {
      const index = Number(state.currentImageMode.slice(5));
      const url = state.settings.expressions[index]?.url;
      if (url) return url;
    }
    return state.settings.normalImage || DEFAULT_PET_SVG;
  }

  function addExpression(panel) {
    const name = panel?.querySelector('[data-temp="exprName"]')?.value.trim();
    const url = panel?.querySelector('[data-temp="exprUrl"]')?.value.trim();
    const keywords = panel?.querySelector('[data-temp="exprKeywords"]')?.value.trim();
    if (!name || !url) return notify('warning', '请填写差分名称和图片链接');
    state.settings.expressions.push({ name, url, keywords: keywords || '' });
    saveAndRender();
  }

  function deleteExpression(index) {
    state.settings.expressions.splice(index, 1);
    state.currentImageMode = 'normal';
    saveAndRender();
  }

  function previewExpression(index) {
    state.currentImageMode = `expr:${index}`;
    clearCroppedImage();
    updateBubble(state.settings.expressions[index]?.name || '差分');
    render();
  }

  function addSong(panel) {
    const name = panel?.querySelector('[data-temp="songName"]')?.value.trim();
    const url = panel?.querySelector('[data-temp="songUrl"]')?.value.trim();
    if (!name || !url) return notify('warning', '请填写歌曲名称和链接');
    state.settings.songs.push({ name, url });
    saveAndRender();
  }

  function deleteSong(index) {
    state.settings.songs.splice(index, 1);
    if (state.currentSongIndex === index) stopAudio();
    if (state.currentSongIndex > index) state.currentSongIndex -= 1;
    saveAndRender();
  }

  function getAudio() {
    const doc = hostDocument();
    let audio = doc.getElementById(AUDIO_ID);
    if (!audio) {
      audio = doc.createElement('audio');
      audio.id = AUDIO_ID;
      audio.loop = true;
      audio.preload = 'auto';
      audio.style.display = 'none';
      (doc.body || doc.documentElement).appendChild(audio);
    }
    return audio;
  }

  function playSong(index) {
    const song = state.settings.songs[index];
    if (!song) return notify('warning', '没有可播放的歌曲');
    const audio = getAudio();
    audio.src = song.url;
    audio.volume = 0.82;
    state.currentSongIndex = index;
    state.listening = true;
    audio.play().then(() => updateBubble(`正在听：${song.name}`)).catch(() => notify('warning', '浏览器阻止了自动播放，请再点一次播放'));
    render();
  }

  function toggleSongPause() {
    const audio = getAudio();
    if (!audio.src && state.settings.songs.length) return playSong(0);
    if (audio.paused) audio.play().catch(() => notify('warning', '播放失败'));
    else audio.pause();
  }

  function playRelativeSong(step) {
    if (!state.settings.songs.length) return notify('warning', '曲库为空');
    const next = state.currentSongIndex < 0 ? 0 : (state.currentSongIndex + step + state.settings.songs.length) % state.settings.songs.length;
    playSong(next);
  }

  function stopAudio() {
    const audio = getAudio();
    audio.pause();
    audio.removeAttribute('src');
    state.currentSongIndex = -1;
  }

  function toggleListen() {
    state.listening = !state.listening;
    if (state.listening) {
      if (state.currentSongIndex < 0 && state.settings.songs.length) playSong(0);
      else updateBubble('听歌模式已开启');
    } else {
      stopAudio();
      updateBubble('听歌模式已关闭');
    }
    render();
  }

  function exportSettings() {
    navigator.clipboard?.writeText(JSON.stringify(state.settings, null, 2));
    notify('success', '配置JSON已复制到剪贴板');
  }

  function importSettings(panel) {
    const raw = panel?.querySelector('[data-temp="importJson"]')?.value.trim();
    const parsed = safeParse(raw, null);
    if (!parsed) return notify('error', '导入失败：JSON格式不正确');
    state.settings = mergeSettings(DEFAULT_SETTINGS, parsed);
    saveAndRender();
  }

  function resetSettings() {
    state.settings = clone(DEFAULT_SETTINGS);
    saveAndRender();
  }

  function startDrag(event) {
    if (event.button !== undefined && event.button !== 0) return;
    state.dragging = false;
    state.dragStartX = event.clientX;
    state.dragStartY = event.clientY;
    state.startX = state.settings.x;
    state.startY = state.settings.y;
    const move = moveDrag;
    const up = endDrag;
    const doc = hostDocument();
    doc.addEventListener('pointermove', move);
    doc.addEventListener('pointerup', up, { once: true });
    state.disposers.push(() => doc.removeEventListener('pointermove', move));
  }

  function moveDrag(event) {
    const dx = event.clientX - state.dragStartX;
    const dy = event.clientY - state.dragStartY;
    if (Math.abs(dx) + Math.abs(dy) > 5) state.dragging = true;
    const view = viewport();
    state.settings.x = clamp(state.startX + dx, view.offsetLeft, Math.max(view.offsetLeft, view.offsetLeft + view.width - state.settings.size));
    state.settings.y = clamp(state.startY + dy, view.offsetTop, Math.max(view.offsetTop, view.offsetTop + view.height - state.settings.size));
    const root = getRoot();
    root.style.setProperty('--tp-x', `${state.settings.x}px`);
    root.style.setProperty('--tp-y', `${state.settings.y}px`);
  }

  function endDrag() {
    hostDocument().removeEventListener('pointermove', moveDrag);
    saveSettings();
    setTimeout(() => { state.dragging = false; }, 0);
  }

  function updateBubble(text, keepQueue = false) {
    if (!keepQueue) state.bubbleQueue = [];
    const shown = formatBubbleText(text || '');
    state.bubbleText = shown;
    const bubble = hostDocument().querySelector(`#${ROOT_ID} [data-role="bubble"]`);
    if (!bubble || !state.settings.bubbleEnabled) return;
    bubble.textContent = state.bubbleText;
  }

  function queueBubbleText(text) {
    const parts = splitBubbleSentences(text).map(formatBubbleText).filter(Boolean);
    if (!parts.length) return updateBubble('我看见了。');
    state.bubbleQueue = parts.slice(1, 4);
    updateBubble(parts[0], true);
  }

  function advanceBubble() {
    if (!state.bubbleText) return;
    const next = state.bubbleQueue.shift();
    if (next) updateBubble(next, true);
    else updateBubble('');
  }

  function splitBubbleSentences(text) {
    const raw = String(text || '')
      .replace(/<[^>]+>/g, '')
      .replace(/["“”'`]/g, '')
      .replace(/\[[\s\S]*?\]/g, '')
      .replace(/\([\s\S]*?\)/g, '')
      .replace(/（[\s\S]*?）/g, '')
      .replace(/^[\s\S]*?(?:短评[:：]|评论[:：]|桌宠[:：]|助手[:：])/i, '')
      .replace(/\r/g, '\n')
      .trim();
    return raw
      .split(/(?<=[。！？!?])|\n+/)
      .map(v => v.replace(/^[：:，,。\s]+|[。！？!?\s]+$/g, '').trim())
      .filter(Boolean)
      .slice(0, 4);
  }

  function formatBubbleText(text) {
    const value = String(text || '').replace(/\s+/g, ' ').trim();
    if (!value) return '';
    return value.length > 34 ? `${value.slice(0, 32)}...` : value;
  }

  function speakRandomLine() {
    const lines = state.settings.quickLines.length ? state.settings.quickLines : DEFAULT_SETTINGS.quickLines;
    updateBubble(lines[Math.floor(Math.random() * lines.length)]);
  }

  function getLatestAssistantText() {
    try {
      if (typeof getChatMessages === 'function') {
        const messages = getChatMessages(-1) || [];
        if (messages[0]?.message) return stripHtml(messages[0].message);
      }
    } catch {}
    const doc = hostDocument();
    const domText = doc.querySelector('.mes:last-child .mes_text')?.textContent || doc.querySelector('.mes:last .mes_text')?.textContent || '';
    return stripHtml(domText);
  }

  function stripHtml(text) {
    const div = hostDocument().createElement('div');
    div.innerHTML = String(text || '');
    return (div.textContent || div.innerText || '').trim();
  }

  function updateExpressionByText(text) {
    const normalized = text || '';
    const index = state.settings.expressions.findIndex(item => String(item.keywords || '').split(/[,，\s]+/).filter(Boolean).some(keyword => normalized.includes(keyword)) && item.url);
    if (index >= 0) {
      state.currentImageMode = `expr:${index}`;
      clearCroppedImage();
      render();
    }
  }

  async function createComment(force = false) {
    if (!state.settings.autoComment && !force) return;
    if (state.settings.mode !== 'personaContextPreset' && !force) return;
    const now = Date.now();
    if (!force && now - state.lastCommentAt < state.settings.commentCooldown * 1000) return;
    const latest = getLatestAssistantText() || (force ? state.settings.emptyContextText : '');
    if (!latest || (!force && latest === state.lastSeenMessage)) return;
    state.lastSeenMessage = latest;
    state.lastCommentAt = now;
    updateExpressionByText(latest);

    const prompt = buildPrompt(latest);
    updateBubble('思考中...');
    try {
      const comment = state.settings.apiMode === 'custom' ? await callCustomApi(prompt) : await callTavernApi(prompt);
      queueBubbleText(cleanComment(comment));
    } catch (error) {
      console.warn(`[${SCRIPT_NAME}] 评论生成失败`, error);
      updateBubble(force ? '评论生成失败，请检查API设置。' : '');
    }
  }

  function buildPrompt(latest) {
    const s = state.settings;
    return renderTemplate(s.commentPromptTemplate, {
      role_name: s.roleName || '',
      role_setting: s.roleSetting || '',
      persona_prompt: personaBlock(),
      comment_prompt: s.commentPrompt || '',
      latest_message: latest.slice(-1200),
      bubble_format_prompt: s.bubbleFormatPrompt || '',
    });
  }

  function personaBlock() {
    const s = state.settings;
    return renderTemplate(s.personaPromptTemplate, {
      role_name: s.roleName || '',
      role_setting: s.roleSetting || '',
    });
  }

  function renderTemplate(template, values) {
    return String(template || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => values[key] ?? '');
  }

  async function manualComment() {
    await createComment(true);
  }

  function toggleChat() {
    state.chatOpen = !state.chatOpen;
    render();
  }

  async function sendChatMessage() {
    const input = hostDocument().querySelector(`#${ROOT_ID} [data-role="chat-input"]`);
    const text = input?.value?.trim();
    if (!text) return updateBubble('想和我说什么？');
    input.value = '';
    updateBubble('听到了，正在想...');
    const prompt = renderTemplate(state.settings.chatPromptTemplate, {
      role_name: state.settings.roleName || '',
      role_setting: state.settings.roleSetting || '',
      persona_prompt: personaBlock(),
      chat_prompt: state.settings.chatPrompt || '',
      user_message: text,
      bubble_format_prompt: state.settings.bubbleFormatPrompt || '',
    });
    try {
      const reply = state.settings.apiMode === 'custom' ? await callCustomApi(prompt) : await callTavernApi(prompt);
      queueBubbleText(cleanComment(reply));
    } catch (error) {
      console.warn(`[${SCRIPT_NAME}] 桌宠聊天失败`, error);
      updateBubble('我刚刚有点卡住了。');
    }
  }

  async function callTavernApi(prompt) {
    if (typeof generateRaw === 'function') return normalizeGeneratedText(await generateRaw({ user_input: prompt, should_stream: false, should_silence: true }));
    if (typeof generate === 'function') return normalizeGeneratedText(await generate({ user_input: prompt, should_stream: false, should_silence: true }));
    throw new Error('当前环境没有可用的酒馆生成接口');
  }

  function normalizeGeneratedText(result) {
    if (typeof result === 'string') return result;
    if (result && typeof result === 'object' && typeof result.content === 'string') return result.content;
    return String(result || '');
  }

  async function callCustomApi(prompt) {
    const s = state.settings;
    if (!s.customApiUrl || !s.customApiModel) throw new Error('自定义API地址或模型为空');
    const response = await fetch(s.customApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(s.customApiKey ? { Authorization: `Bearer ${s.customApiKey}` } : {}),
      },
      body: JSON.stringify({
        model: s.customApiModel,
        messages: [
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 80,
      }),
    });
    if (!response.ok) throw new Error(`API请求失败：${response.status}`);
    const data = await response.json();
    return data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || '';
  }

  function cleanComment(text) {
    const parts = splitBubbleSentences(text)
      .map(v => v.replace(/^(?:短评|评论|桌宠|助手|回复)[:：]\s*/i, '').trim())
      .filter(Boolean);
    return parts.length ? parts.join('\n') : '我看见了。';
  }

  function bindTavernEvents() {
    const handler = () => hostWindow().setTimeout(() => createComment(false), 450);
    if (typeof eventOn === 'function' && typeof tavern_events !== 'undefined') {
      [tavern_events.MESSAGE_RECEIVED, tavern_events.MESSAGE_UPDATED, tavern_events.CHARACTER_MESSAGE_RENDERED]
        .filter(Boolean)
        .forEach(eventName => {
          try {
            const disposer = eventOn(eventName, handler);
            if (typeof disposer === 'function') state.disposers.push(disposer);
          } catch {}
        });
    }
  }

  function resetPosition() {
    const view = viewport();
    state.settings.enabled = true;
    state.settings.x = view.offsetLeft + 18;
    state.settings.y = view.offsetTop + Math.max(72, Math.floor(view.height * 0.36));
    state.settings.panelOpen = false;
    saveSettings();
    render();
    updateBubble('我回来了。');
  }

  function bindScriptButtons() {
    try {
      const buttons = [{ name: '显示桌宠', visible: true }];
      if (typeof appendInexistentScriptButtons === 'function') appendInexistentScriptButtons(buttons);
      else if (typeof replaceScriptButtons === 'function') replaceScriptButtons(buttons);
      if (typeof eventOn === 'function' && typeof getButtonEvent === 'function') {
        const disposer = eventOn(getButtonEvent('显示桌宠'), resetPosition);
        if (typeof disposer === 'function') state.disposers.push(disposer);
      }
    } catch (error) {
      console.warn(`[${SCRIPT_NAME}] 注册脚本按钮失败`, error);
    }
  }

  function cleanup() {
    state.disposers.forEach(dispose => {
      try { dispose(); } catch {}
    });
    state.disposers = [];
    const doc = hostDocument();
    doc.getElementById(ROOT_ID)?.remove();
    doc.getElementById(STYLE_ID)?.remove();
    doc.getElementById(AUDIO_ID)?.remove();
  }

  function init() {
    cleanup();
    injectStyle();
    render();
    bindTavernEvents();
    bindScriptButtons();
    speakRandomLine();
    const win = hostWindow();
    win.addEventListener('resize', render);
    win.visualViewport?.addEventListener('resize', render);
    win.visualViewport?.addEventListener('scroll', render);
    state.disposers.push(() => win.removeEventListener('resize', render));
    state.disposers.push(() => win.visualViewport?.removeEventListener('resize', render));
    state.disposers.push(() => win.visualViewport?.removeEventListener('scroll', render));
    window.addEventListener('pagehide', cleanup, { once: true });
    notify('success', '桌宠已加载');
  }

  const readyDoc = hostDocument();
  if (readyDoc.readyState === 'loading') readyDoc.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
