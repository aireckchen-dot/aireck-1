(() => {
  'use strict';

  const SCRIPT_ID = typeof getScriptId === 'function' ? getScriptId() : 'cg-helper';
  const SCOPE = { type: 'script', script_id: SCRIPT_ID };
  const ROOT_ID = `cg-helper-root-${SCRIPT_ID}`;
  const STYLE_ID = `cg-helper-style-${SCRIPT_ID}`;
  const ROOT_SELECTOR = `#${cssEscape(ROOT_ID)}`;
  const BUTTON_NAME = 'CG设置';
  const INSERT_MARK = 'cg-helper-image';
  const INSERT_WRAP_MARK = 'cg-helper-image-wrap';
  const PANEL_POS_KEY = `cg-helper-panel-pos-${SCRIPT_ID}`;

  const PALETTE = [
    ['#fff7ed', '#9a3412'],
    ['#fef3c7', '#92400e'],
    ['#ecfdf5', '#065f46'],
    ['#e0f2fe', '#075985'],
    ['#eef2ff', '#3730a3'],
    ['#fdf2f8', '#9d174d'],
    ['#f3e8ff', '#6b21a8'],
    ['#f1f5f9', '#334155'],
  ];

  const DEFAULT_TAGS = [
    { type: 'character', name: '主角' },
    { type: 'character', name: '女主' },
    { type: 'character', name: '男主' },
    { type: 'state', name: '日常' },
    { type: 'state', name: '战斗' },
    { type: 'state', name: '受伤' },
    { type: 'state', name: '睡眠' },
    { type: 'state', name: '沐浴' },
    { type: 'state', name: '约会' },
    { type: 'state', name: '开心' },
    { type: 'state', name: '悲伤' },
    { type: 'state', name: '羞涩' },
    { type: 'state', name: '愤怒' },
    { type: 'custom', name: '特写' },
  ];

  let state = loadState();
  let selectedTagIds = new Set();
  let activeClassId = state.classes[0]?.id || null;
  let activeTagEditId = null;
  let renderTimer = null;

  function parentDocument() {
    try {
      return window.parent?.document || document;
    } catch (_) {
      return document;
    }
  }

  function parentWindow() {
    try {
      return window.parent || window;
    } catch (_) {
      return window;
    }
  }

  const doc = parentDocument();
  const win = parentWindow();

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function cssEscape(value) {
    if (globalThis.CSS && typeof globalThis.CSS.escape === 'function') return globalThis.CSS.escape(String(value));
    return String(value).replace(/[^a-zA-Z0-9_-]/g, match => `\\${match.charCodeAt(0).toString(16)} `);
  }

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return null;
    }
  }

  function colorFor(index) {
    return PALETTE[index % PALETTE.length];
  }

  function defaultState() {
    return {
      enabled: true,
      autoInsert: true,
      insertMode: 'all',
      matchMode: 'strict',
      imageWidth: 560,
      tags: DEFAULT_TAGS.map((tag, index) => {
        const [bg, fg] = colorFor(index);
        return { id: uid('tag'), type: tag.type, name: tag.name, bg, fg };
      }),
      classes: [],
    };
  }

  function normalizeState(raw) {
    const base = defaultState();
    const data = raw && typeof raw === 'object' ? raw : {};
    const tags = Array.isArray(data.tags) ? data.tags : base.tags;
    const classes = Array.isArray(data.classes) ? data.classes : [];
    return {
      enabled: data.enabled !== false,
      autoInsert: data.autoInsert !== false,
      insertMode: data.insertMode === 'first' ? 'first' : 'all',
      matchMode: data.matchMode === 'fuzzy' ? 'fuzzy' : 'strict',
      imageWidth: Number.isFinite(Number(data.imageWidth)) ? Math.min(1200, Math.max(160, Number(data.imageWidth))) : 560,
      tags: tags
        .map((tag, index) => {
          const [bg, fg] = colorFor(index);
          return {
            id: String(tag.id || uid('tag')),
            type: ['character', 'state', 'custom'].includes(tag.type) ? tag.type : 'custom',
            name: String(tag.name || '').trim(),
            bg: /^#[0-9a-f]{6}$/i.test(tag.bg || '') ? tag.bg : bg,
            fg: /^#[0-9a-f]{6}$/i.test(tag.fg || '') ? tag.fg : fg,
          };
        })
        .filter(tag => tag.name),
      classes: classes
        .map(item => ({
          id: String(item.id || uid('class')),
          name: String(item.name || '未命名CG类').trim() || '未命名CG类',
          tagIds: Array.isArray(item.tagIds) ? item.tagIds.map(String) : [],
          links: Array.isArray(item.links) ? item.links.map(String).map(link => link.trim()).filter(Boolean) : [],
        }))
        .filter(item => item.tagIds.length || item.links.length),
    };
  }

  function loadState() {
    try {
      return normalizeState(typeof getVariables === 'function' ? getVariables(SCOPE) : null);
    } catch (error) {
      console.warn('[CG脚本] 读取设置失败，已使用默认设置。', error);
      return defaultState();
    }
  }

  function saveState() {
    try {
      if (typeof insertOrAssignVariables === 'function') insertOrAssignVariables(clone(state), SCOPE);
    } catch (error) {
      console.error('[CG脚本] 保存设置失败。', error);
      toast('error', 'CG脚本设置保存失败，请查看控制台。');
    }
  }

  function toast(type, message) {
    try {
      const api = win.toastr || window.toastr;
      if (api && typeof api[type] === 'function') api[type](message, 'CG脚本');
    } catch (_) {}
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replaceAll('`', '&#96;');
  }

  function tagTypeName(type) {
    return { character: '角色', state: '状态', custom: '自定义' }[type] || '自定义';
  }

  function removeOwnedElements() {
    doc.getElementById(ROOT_ID)?.remove();
    doc.getElementById(STYLE_ID)?.remove();
  }

  function readPanelPosition() {
    try {
      const raw = win.localStorage?.getItem(PANEL_POS_KEY);
      if (!raw) return null;
      const pos = JSON.parse(raw);
      if (!Number.isFinite(pos.left) || !Number.isFinite(pos.top)) return null;
      return pos;
    } catch (_) {
      return null;
    }
  }

  function savePanelPosition(left, top) {
    try {
      win.localStorage?.setItem(PANEL_POS_KEY, JSON.stringify({ left, top }));
    } catch (_) {}
  }

  function clampPanelPosition(panel, left, top) {
    const rect = panel.getBoundingClientRect();
    const maxLeft = Math.max(8, win.innerWidth - rect.width - 8);
    const maxTop = Math.max(8, win.innerHeight - rect.height - 8);
    return {
      left: Math.min(Math.max(8, left), maxLeft),
      top: Math.min(Math.max(8, top), maxTop),
    };
  }

  function applyPanelPosition(panel, left, top) {
    const pos = clampPanelPosition(panel, left, top);
    panel.style.left = `${pos.left}px`;
    panel.style.top = `${pos.top}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    return pos;
  }

  function restorePanelPosition() {
    const panel = doc.querySelector(`${ROOT_SELECTOR} .cg-panel`);
    if (!panel) return;
    const saved = readPanelPosition();
    if (saved) applyPanelPosition(panel, saved.left, saved.top);
  }

  function ensureStyle() {
    doc.getElementById(STYLE_ID)?.remove();
    const style = doc.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      ${ROOT_SELECTOR} .cg-panel{position:fixed;right:28px;bottom:88px;z-index:10050;width:min(920px,calc(100vw - 32px));max-height:min(760px,calc(100vh - 120px));display:none;overflow:hidden;border:1px solid rgba(148,163,184,.45);border-radius:22px;background:linear-gradient(145deg,#fffaf4 0%,#f8fbff 48%,#f7f0ff 100%);box-shadow:0 26px 80px rgba(15,23,42,.35);color:#1f2937;font-family:"Microsoft YaHei",Arial,sans-serif;}
      ${ROOT_SELECTOR}.cg-open .cg-panel{display:flex;flex-direction:column;}
      ${ROOT_SELECTOR} .cg-head{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(148,163,184,.35);background:rgba(255,255,255,.72);backdrop-filter:blur(10px);cursor:grab;user-select:none;touch-action:none;}
      ${ROOT_SELECTOR}.cg-dragging .cg-head{cursor:grabbing;}
      ${ROOT_SELECTOR} .cg-title{font-size:18px;font-weight:800;color:#172554;letter-spacing:.02em;}
      ${ROOT_SELECTOR} .cg-subtitle{margin-top:3px;font-size:12px;color:#64748b;}
      ${ROOT_SELECTOR} .cg-close{border:0;border-radius:999px;background:#172554;color:#fff;width:34px;height:34px;cursor:pointer;font-size:18px;line-height:34px;}
      ${ROOT_SELECTOR} .cg-body{display:grid;grid-template-columns:1fr 1.15fr;gap:14px;padding:16px;overflow:auto;}
      ${ROOT_SELECTOR} .cg-card{min-width:0;border:1px solid rgba(148,163,184,.32);border-radius:18px;background:rgba(255,255,255,.74);box-shadow:0 12px 30px rgba(15,23,42,.08);padding:14px;}
      ${ROOT_SELECTOR} .cg-card h3{margin:0 0 10px;font-size:15px;color:#0f172a;display:flex;align-items:center;justify-content:space-between;}
      ${ROOT_SELECTOR} .cg-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px;}
      ${ROOT_SELECTOR} .cg-row-nowrap{display:flex;gap:8px;align-items:center;margin-bottom:10px;}
      ${ROOT_SELECTOR} input,${ROOT_SELECTOR} select,${ROOT_SELECTOR} textarea{border:1px solid #cbd5e1;border-radius:12px;background:#fff;color:#0f172a;padding:8px 10px;font-size:13px;outline:none;min-width:0;}
      ${ROOT_SELECTOR} input:focus,${ROOT_SELECTOR} select:focus,${ROOT_SELECTOR} textarea:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.15);}
      ${ROOT_SELECTOR} textarea{width:100%;min-height:170px;resize:vertical;line-height:1.5;font-family:Consolas,"Microsoft YaHei",monospace;}
      ${ROOT_SELECTOR} .cg-input-grow{flex:1;}
      ${ROOT_SELECTOR} .cg-btn{border:0;border-radius:12px;background:#334155;color:#fff;padding:8px 12px;font-size:13px;cursor:pointer;transition:transform .12s ease,box-shadow .12s ease,background .12s ease;}
      ${ROOT_SELECTOR} .cg-btn:hover{transform:translateY(-1px);box-shadow:0 8px 18px rgba(15,23,42,.18);}
      ${ROOT_SELECTOR} .cg-btn-primary{background:linear-gradient(135deg,#4f46e5,#7c3aed);}
      ${ROOT_SELECTOR} .cg-btn-warn{background:#be123c;}
      ${ROOT_SELECTOR} .cg-btn-light{background:#e2e8f0;color:#0f172a;}
      ${ROOT_SELECTOR} .cg-switch{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:#334155;}
      ${ROOT_SELECTOR} .cg-chip-wrap{display:flex;flex-wrap:wrap;gap:8px;align-content:flex-start;max-height:230px;overflow:auto;padding:4px;}
      ${ROOT_SELECTOR} .cg-chip{border:2px solid transparent;border-radius:999px;padding:7px 11px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 5px 14px rgba(15,23,42,.08);}
      ${ROOT_SELECTOR} .cg-chip.cg-selected{border-color:#111827;box-shadow:0 0 0 3px rgba(17,24,39,.13);}
      ${ROOT_SELECTOR} .cg-chip small{opacity:.72;font-weight:600;margin-left:5px;}
      ${ROOT_SELECTOR} .cg-list{display:flex;flex-direction:column;gap:8px;max-height:280px;overflow:auto;padding-right:3px;}
      ${ROOT_SELECTOR} .cg-item{border:1px solid #e2e8f0;border-radius:14px;background:#fff;padding:10px;cursor:pointer;}
      ${ROOT_SELECTOR} .cg-item.cg-active{border-color:#6366f1;background:#eef2ff;}
      ${ROOT_SELECTOR} .cg-item-title{font-weight:800;color:#172554;margin-bottom:4px;}
      ${ROOT_SELECTOR} .cg-item-meta{font-size:12px;color:#64748b;line-height:1.45;}
      ${ROOT_SELECTOR} .cg-help{font-size:12px;color:#64748b;line-height:1.55;margin:6px 0 0;}
      ${ROOT_SELECTOR} .cg-footer{padding:12px 16px;border-top:1px solid rgba(148,163,184,.35);display:flex;justify-content:space-between;gap:10px;align-items:center;background:rgba(255,255,255,.7);}
      ${ROOT_SELECTOR} .cg-preview{margin-top:10px;padding:10px;border-radius:14px;background:#f8fafc;color:#334155;font-size:12px;line-height:1.55;}
      .${INSERT_WRAP_MARK}{display:flex!important;justify-content:center!important;align-items:center!important;width:100%!important;max-width:100%!important;margin:12px 0!important;padding:0!important;float:none!important;clear:both!important;text-align:center!important;box-sizing:border-box!important;}
      .${INSERT_MARK}{display:block!important;float:none!important;position:static!important;left:auto!important;right:auto!important;max-width:100%!important;height:auto!important;margin:0 auto!important;border-radius:14px;box-shadow:0 10px 26px rgba(15,23,42,.18);object-fit:contain!important;}
      @media (max-width:760px){${ROOT_SELECTOR} .cg-panel{right:8px;bottom:64px;width:calc(100vw - 16px);max-height:calc(100vh - 80px);border-radius:18px;}${ROOT_SELECTOR} .cg-body{grid-template-columns:1fr;padding:12px;}${ROOT_SELECTOR} .cg-head{padding:12px 14px;}${ROOT_SELECTOR} .cg-footer{flex-direction:column;align-items:stretch;}}
    `;
    doc.head.appendChild(style);
  }

  function render() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderNow, 0);
  }

  function renderNow() {
    ensureStyle();
    let root = doc.getElementById(ROOT_ID);
    if (!root) {
      root = doc.createElement('div');
      root.id = ROOT_ID;
      doc.body.appendChild(root);
    }

    const activeClass = state.classes.find(item => item.id === activeClassId) || state.classes[0] || null;
    activeClassId = activeClass?.id || null;
    const tagOptions = state.tags
      .map(tag => `<option value="${escapeHtml(tag.id)}">${escapeHtml(tag.name)}（${tagTypeName(tag.type)}）</option>`)
      .join('');
    const selectedNames = [...selectedTagIds]
      .map(id => state.tags.find(tag => tag.id === id)?.name)
      .filter(Boolean)
      .join(' + ') || '尚未选择标签';
    const activeTag = state.tags.find(tag => tag.id === activeTagEditId) || null;

    root.innerHTML = `
      <div class="cg-panel" role="dialog" aria-label="CG脚本设置">
        <div class="cg-head">
          <div>
            <div class="cg-title">CG 标签脚本</div>
            <div class="cg-subtitle">只格式化页面显示：读取正文中的 ([标签][标签])，在原位置显示随机 CG 图片。</div>
          </div>
          <button class="cg-close" data-action="close" title="关闭">×</button>
        </div>
        <div class="cg-body">
          <section class="cg-card">
            <h3>运行设置</h3>
            <div class="cg-row">
              <label class="cg-switch"><input type="checkbox" data-action="toggle-enabled" ${state.enabled ? 'checked' : ''}> 启用脚本</label>
              <label class="cg-switch"><input type="checkbox" data-action="toggle-auto" ${state.autoInsert ? 'checked' : ''}> 自动插入</label>
            </div>
            <div class="cg-row-nowrap">
              <label>插入方式</label>
              <select data-action="set-mode">
                <option value="all" ${state.insertMode === 'all' ? 'selected' : ''}>插入全部匹配CG类</option>
                <option value="first" ${state.insertMode === 'first' ? 'selected' : ''}>只插入第一个匹配CG类</option>
              </select>
              <label>匹配模式</label>
              <select data-action="set-match-mode">
                <option value="strict" ${state.matchMode === 'strict' ? 'selected' : ''}>严格：标签完全一致</option>
                <option value="fuzzy" ${state.matchMode === 'fuzzy' ? 'selected' : ''}>模糊：部分标签匹配</option>
              </select>
              <label>宽度</label>
              <input data-action="set-width" type="number" min="160" max="1200" value="${state.imageWidth}" style="width:92px">
            </div>
            <p class="cg-help">标签必须写成 <b>（[女主][战斗]）</b> 或 <b>([女主][战斗])</b>。脚本只修改页面显示，不写回聊天正文；发送给 AI 前会清理这些标签块。</p>
          </section>

          <section class="cg-card">
            <h3>新增/编辑标签</h3>
            <div class="cg-row-nowrap">
              <select data-field="tag-type" style="width:96px">
                <option value="character">角色</option>
                <option value="state">状态</option>
                <option value="custom">自定义</option>
              </select>
              <input class="cg-input-grow" data-field="tag-name" placeholder="标签名，例如：女主、战斗、雨夜">
              <input data-field="tag-bg" type="color" value="#eef2ff" title="背景色">
              <input data-field="tag-fg" type="color" value="#3730a3" title="字体色">
              <button class="cg-btn cg-btn-primary" data-action="add-tag">添加标签</button>
            </div>
            <div class="cg-chip-wrap">${renderTags()}</div>
            <p class="cg-help">点击标签可选中/取消；双击标签可编辑名称、类型和颜色。每个标签默认配色已保证可读性。</p>
          </section>

          ${renderTagEditor(activeTag)}

          <section class="cg-card">
            <h3><span>CG 类</span><button class="cg-btn cg-btn-primary" data-action="add-class">用已选标签创建</button></h3>
            <div class="cg-preview">当前选择：${escapeHtml(selectedNames)}</div>
            <div class="cg-list">${renderClasses()}</div>
          </section>

          <section class="cg-card">
            <h3>图片链接</h3>
            ${activeClass ? renderEditor(activeClass, tagOptions) : '<p class="cg-help">请先选择标签并创建一个 CG 类。</p>'}
          </section>
        </div>
        <div class="cg-footer">
          <span class="cg-help">正文标签块示例：（[角色][状态][自定义]）。图片居中显示在标签块原位置，标签本身不会显示。</span>
          <div class="cg-row" style="margin:0">
            <button class="cg-btn cg-btn-light" data-action="test-last">测试最新楼层</button>
            <button class="cg-btn cg-btn-warn" data-action="reset-default">恢复默认标签</button>
          </div>
        </div>
      </div>
    `;
    restorePanelPosition();
  }

  function renderTags() {
    if (!state.tags.length) return '<p class="cg-help">暂无标签。</p>';
    return state.tags
      .map(tag => {
        const selected = selectedTagIds.has(tag.id) ? ' cg-selected' : '';
        return `<button class="cg-chip${selected}" data-action="select-tag" data-id="${escapeHtml(tag.id)}" style="background:${tag.bg};color:${tag.fg}" title="单击选择，双击编辑">${escapeHtml(tag.name)}<small>${tagTypeName(tag.type)}</small></button>`;
      })
      .join('');
  }

  function renderClasses() {
    if (!state.classes.length) return '<p class="cg-help">暂无 CG 类。先点击上方标签，再创建 CG 类。</p>';
    return state.classes
      .map(item => {
        const tags = item.tagIds.map(id => state.tags.find(tag => tag.id === id)?.name).filter(Boolean).join(' + ') || '无标签';
        const active = item.id === activeClassId ? ' cg-active' : '';
        return `<div class="cg-item${active}" data-action="select-class" data-id="${escapeHtml(item.id)}"><div class="cg-item-title">${escapeHtml(item.name)}</div><div class="cg-item-meta">标签：${escapeHtml(tags)}<br>图片：${item.links.length} 条</div></div>`;
      })
      .join('');
  }

  function renderEditor(item, tagOptions) {
    const tags = item.tagIds.map(id => state.tags.find(tag => tag.id === id)).filter(Boolean);
    return `
      <div class="cg-row-nowrap">
        <input class="cg-input-grow" data-action="rename-class" data-id="${escapeHtml(item.id)}" value="${escapeHtml(item.name)}" placeholder="CG类名称">
        <button class="cg-btn cg-btn-warn" data-action="delete-class" data-id="${escapeHtml(item.id)}">删除类</button>
      </div>
      <div class="cg-row">
        ${tags.map(tag => `<span class="cg-chip" style="background:${tag.bg};color:${tag.fg}">${escapeHtml(tag.name)}<small>${tagTypeName(tag.type)}</small></span>`).join('')}
      </div>
      <div class="cg-row-nowrap">
        <select data-action="append-class-tag" data-id="${escapeHtml(item.id)}"><option value="">添加标签到此类</option>${tagOptions}</select>
        <button class="cg-btn cg-btn-light" data-action="replace-class-tags" data-id="${escapeHtml(item.id)}">用当前选择替换标签</button>
      </div>
      <textarea data-action="edit-links" data-id="${escapeHtml(item.id)}" placeholder="每行一个图片链接。支持 http(s)、相对路径或 data:image。">${escapeHtml(item.links.join('\n'))}</textarea>
      <p class="cg-help">当正文同时出现此类下所有标签时，将从这些链接中随机抽取一张插入。</p>
    `;
  }

  function renderTagEditor(tag) {
    if (!tag) return '';
    return `
      <div class="cg-card" data-tag-editor="${escapeHtml(tag.id)}" style="grid-column:1 / -1">
        <h3>编辑标签</h3>
        <div class="cg-row-nowrap">
          <select data-action="edit-tag-type" data-id="${escapeHtml(tag.id)}" style="width:96px">
            <option value="character" ${tag.type === 'character' ? 'selected' : ''}>角色</option>
            <option value="state" ${tag.type === 'state' ? 'selected' : ''}>状态</option>
            <option value="custom" ${tag.type === 'custom' ? 'selected' : ''}>自定义</option>
          </select>
          <input class="cg-input-grow" data-action="edit-tag-name" data-id="${escapeHtml(tag.id)}" value="${escapeHtml(tag.name)}">
          <input data-action="edit-tag-bg" data-id="${escapeHtml(tag.id)}" type="color" value="${escapeHtml(tag.bg)}" title="背景色">
          <input data-action="edit-tag-fg" data-id="${escapeHtml(tag.id)}" type="color" value="${escapeHtml(tag.fg)}" title="字体色">
          <button class="cg-btn cg-btn-warn" data-action="delete-tag" data-id="${escapeHtml(tag.id)}">删除标签</button>
        </div>
        <p class="cg-help">删除标签会同时从所有 CG 类中移除它；不会删除已填写的图片链接。</p>
      </div>
    `;
  }

  function bindUiEvents() {
    doc.addEventListener('click', async event => {
      const target = event.target.closest?.(`${ROOT_SELECTOR} [data-action]`);
      if (!target) return;
      const action = target.dataset.action;
      if (action === 'close') doc.getElementById(ROOT_ID)?.classList.remove('cg-open');
      if (action === 'select-tag') toggleTag(target.dataset.id);
      if (action === 'add-tag') addTag();
      if (action === 'add-class') addClass();
      if (action === 'select-class') {
        activeClassId = target.dataset.id;
        render();
      }
      if (action === 'delete-class') deleteClass(target.dataset.id);
      if (action === 'replace-class-tags') replaceClassTags(target.dataset.id);
      if (action === 'test-last') await processMessage(getLastIdSafe(), true);
      if (action === 'reset-default') resetDefaultTags();
      if (action === 'delete-tag') deleteTag(target.dataset.id);
    });

    doc.addEventListener('dblclick', event => {
      const target = event.target.closest?.(`${ROOT_SELECTOR} [data-action="select-tag"]`);
      if (!target) return;
      showTagEditor(target.dataset.id);
    });

    doc.addEventListener('change', event => {
      const target = event.target.closest?.(`${ROOT_SELECTOR} [data-action]`);
      if (!target) return;
      const action = target.dataset.action;
      if (action === 'toggle-enabled') state.enabled = Boolean(target.checked);
      if (action === 'toggle-auto') state.autoInsert = Boolean(target.checked);
      if (action === 'set-mode') state.insertMode = target.value === 'first' ? 'first' : 'all';
      if (action === 'set-match-mode') state.matchMode = target.value === 'fuzzy' ? 'fuzzy' : 'strict';
      if (action === 'set-width') state.imageWidth = Math.min(1200, Math.max(160, Number(target.value) || 560));
      if (action === 'append-class-tag') appendClassTag(target.dataset.id, target.value);
      if (action === 'edit-tag-type') editTag(target.dataset.id, { type: target.value }, true);
      if (action === 'edit-tag-bg') editTag(target.dataset.id, { bg: target.value }, true);
      if (action === 'edit-tag-fg') editTag(target.dataset.id, { fg: target.value }, true);
      if (['toggle-enabled', 'toggle-auto', 'set-mode', 'set-match-mode', 'set-width'].includes(action)) saveState();
    });

    doc.addEventListener('input', event => {
      const target = event.target.closest?.(`${ROOT_SELECTOR} [data-action]`);
      if (!target) return;
      if (target.dataset.action === 'rename-class') renameClass(target.dataset.id, target.value);
      if (target.dataset.action === 'edit-links') editLinks(target.dataset.id, target.value);
      if (target.dataset.action === 'edit-tag-name') editTag(target.dataset.id, { name: target.value }, false);
    });
  }

  function bindPanelDrag() {
    let dragState = null;

    doc.addEventListener('pointerdown', event => {
      const header = event.target.closest?.(`${ROOT_SELECTOR} .cg-head`);
      if (!header) return;
      if (event.target.closest?.('button,input,select,textarea')) return;
      const panel = header.closest('.cg-panel');
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      dragState = {
        panel,
        startX: event.clientX,
        startY: event.clientY,
        left: rect.left,
        top: rect.top,
      };
      doc.getElementById(ROOT_ID)?.classList.add('cg-dragging');
      try {
        header.setPointerCapture?.(event.pointerId);
      } catch (_) {}
      event.preventDefault();
    });

    doc.addEventListener('pointermove', event => {
      if (!dragState) return;
      const left = dragState.left + event.clientX - dragState.startX;
      const top = dragState.top + event.clientY - dragState.startY;
      applyPanelPosition(dragState.panel, left, top);
      event.preventDefault();
    });

    doc.addEventListener('pointerup', () => {
      if (!dragState) return;
      const rect = dragState.panel.getBoundingClientRect();
      savePanelPosition(rect.left, rect.top);
      doc.getElementById(ROOT_ID)?.classList.remove('cg-dragging');
      dragState = null;
    });

    win.addEventListener?.('resize', () => {
      const panel = doc.querySelector(`${ROOT_SELECTOR} .cg-panel`);
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      const pos = applyPanelPosition(panel, rect.left, rect.top);
      savePanelPosition(pos.left, pos.top);
    });
  }

  function toggleTag(id) {
    if (!id) return;
    if (selectedTagIds.has(id)) selectedTagIds.delete(id);
    else selectedTagIds.add(id);
    render();
  }

  function addTag() {
    const root = doc.getElementById(ROOT_ID);
    const name = root.querySelector('[data-field="tag-name"]')?.value?.trim();
    if (!name) return toast('warning', '请先输入标签名。');
    const type = root.querySelector('[data-field="tag-type"]')?.value || 'custom';
    const bg = root.querySelector('[data-field="tag-bg"]')?.value || '#eef2ff';
    const fg = root.querySelector('[data-field="tag-fg"]')?.value || '#3730a3';
    const tag = { id: uid('tag'), type, name, bg, fg };
    state.tags.push(tag);
    selectedTagIds.add(tag.id);
    saveState();
    render();
  }

  function addClass() {
    const tagIds = [...selectedTagIds].filter(id => state.tags.some(tag => tag.id === id));
    if (!tagIds.length) return toast('warning', '请先选择至少一个标签。');
    const name = tagIds.map(id => state.tags.find(tag => tag.id === id)?.name).filter(Boolean).join(' + ');
    const item = { id: uid('class'), name: name || '新CG类', tagIds, links: [] };
    state.classes.push(item);
    activeClassId = item.id;
    saveState();
    render();
  }

  function deleteClass(id) {
    state.classes = state.classes.filter(item => item.id !== id);
    if (activeClassId === id) activeClassId = state.classes[0]?.id || null;
    saveState();
    render();
  }

  function renameClass(id, name) {
    const item = state.classes.find(entry => entry.id === id);
    if (!item) return;
    item.name = name.trim() || '未命名CG类';
    saveState();
  }

  function editLinks(id, value) {
    const item = state.classes.find(entry => entry.id === id);
    if (!item) return;
    item.links = value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    saveState();
  }

  function showTagEditor(id) {
    if (!state.tags.some(tag => tag.id === id)) return;
    activeTagEditId = id;
    render();
  }

  function editTag(id, patch, shouldRender) {
    const tag = state.tags.find(entry => entry.id === id);
    if (!tag) return;
    if (Object.prototype.hasOwnProperty.call(patch, 'name')) tag.name = String(patch.name || '').trim() || tag.name;
    if (Object.prototype.hasOwnProperty.call(patch, 'type')) tag.type = ['character', 'state', 'custom'].includes(patch.type) ? patch.type : tag.type;
    if (Object.prototype.hasOwnProperty.call(patch, 'bg') && /^#[0-9a-f]{6}$/i.test(patch.bg)) tag.bg = patch.bg;
    if (Object.prototype.hasOwnProperty.call(patch, 'fg') && /^#[0-9a-f]{6}$/i.test(patch.fg)) tag.fg = patch.fg;
    saveState();
    if (shouldRender) render();
  }

  function deleteTag(id) {
    if (!id) return;
    state.tags = state.tags.filter(tag => tag.id !== id);
    state.classes.forEach(item => {
      item.tagIds = item.tagIds.filter(tagId => tagId !== id);
    });
    state.classes = state.classes.filter(item => item.tagIds.length || item.links.length);
    selectedTagIds.delete(id);
    if (activeTagEditId === id) activeTagEditId = null;
    saveState();
    render();
  }

  function appendClassTag(classId, tagId) {
    const item = state.classes.find(entry => entry.id === classId);
    if (!item || !tagId || item.tagIds.includes(tagId)) return;
    item.tagIds.push(tagId);
    saveState();
    render();
  }

  function replaceClassTags(classId) {
    const item = state.classes.find(entry => entry.id === classId);
    if (!item) return;
    const tagIds = [...selectedTagIds].filter(id => state.tags.some(tag => tag.id === id));
    if (!tagIds.length) return toast('warning', '请先选择至少一个标签。');
    item.tagIds = tagIds;
    saveState();
    render();
  }

  function resetDefaultTags() {
    const existingClasses = state.classes;
    state = { ...defaultState(), enabled: state.enabled, autoInsert: state.autoInsert, insertMode: state.insertMode, matchMode: state.matchMode, imageWidth: state.imageWidth, classes: existingClasses };
    selectedTagIds = new Set();
    saveState();
    render();
  }

  function setupButton() {
    try {
      if (typeof appendInexistentScriptButtons === 'function') appendInexistentScriptButtons([{ name: BUTTON_NAME, visible: true }]);
      else if (typeof replaceScriptButtons === 'function') replaceScriptButtons([{ name: BUTTON_NAME, visible: true }]);
      if (typeof eventOn === 'function' && typeof getButtonEvent === 'function') {
        eventOn(getButtonEvent(BUTTON_NAME), () => {
          doc.getElementById(ROOT_ID)?.classList.toggle('cg-open');
          restorePanelPosition();
        });
      }
    } catch (error) {
      console.warn('[CG脚本] 注册按钮失败。', error);
    }
  }

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, '').toLowerCase();
  }

  function uniqueValues(values) {
    const seen = new Set();
    return values.filter(value => {
      const key = normalizeText(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function classTagNames(item) {
    return item.tagIds.map(id => state.tags.find(tag => tag.id === id)?.name).filter(Boolean);
  }

  function sameTagSet(left, right) {
    const leftKeys = uniqueValues(left).map(normalizeText).sort();
    const rightKeys = uniqueValues(right).map(normalizeText).sort();
    return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index]);
  }

  function fuzzyScore(classTags, blockTags) {
    const blockKeys = uniqueValues(blockTags).map(normalizeText);
    const classKeys = uniqueValues(classTags).map(normalizeText);
    const matchedBlockIndexes = [];
    const matchedClassIndexes = [];
    blockKeys.forEach((key, blockIndex) => {
      const classIndex = classKeys.indexOf(key);
      if (classIndex !== -1) {
        matchedBlockIndexes.push(blockIndex);
        matchedClassIndexes.push(classIndex);
      }
    });
    if (!matchedBlockIndexes.length) return null;
    const firstBlockIndex = matchedBlockIndexes[0];
    const blockOrderScore = matchedBlockIndexes.reduce((sum, index) => sum + (blockKeys.length - index), 0);
    const classOrderScore = matchedClassIndexes.reduce((sum, index) => sum + (classKeys.length - index), 0);
    return {
      matchedCount: matchedBlockIndexes.length,
      firstBlockIndex,
      blockOrderScore,
      classOrderScore,
      coverage: matchedBlockIndexes.length / Math.max(1, classKeys.length),
    };
  }

  function compareFuzzyMatch(left, right) {
    if (left.score.matchedCount !== right.score.matchedCount) return right.score.matchedCount - left.score.matchedCount;
    if (left.score.firstBlockIndex !== right.score.firstBlockIndex) return left.score.firstBlockIndex - right.score.firstBlockIndex;
    if (left.score.blockOrderScore !== right.score.blockOrderScore) return right.score.blockOrderScore - left.score.blockOrderScore;
    if (left.score.classOrderScore !== right.score.classOrderScore) return right.score.classOrderScore - left.score.classOrderScore;
    if (left.score.coverage !== right.score.coverage) return right.score.coverage - left.score.coverage;
    return state.classes.indexOf(left.item) - state.classes.indexOf(right.item);
  }

  function matchedClassesForTags(blockTags) {
    if (!blockTags.length) return [];
    if (state.matchMode === 'strict') {
      return state.classes.filter(item => item.links.length && item.tagIds.length && sameTagSet(classTagNames(item), blockTags));
    }
    const scored = state.classes
      .filter(item => item.links.length && item.tagIds.length)
      .map(item => ({ item, score: fuzzyScore(classTagNames(item), blockTags) }))
      .filter(entry => entry.score)
      .sort(compareFuzzyMatch);
    return scored.map(entry => entry.item);
  }

  function parseTagBlocks(message) {
    const blocks = [];
    const pattern = /[\(（]\s*((?:\[[^\]\r\n]+\]\s*)+)[\)）]/g;
    let match;
    while ((match = pattern.exec(message))) {
      const tags = [...match[1].matchAll(/\[([^\]\r\n]+)\]/g)].map(item => item[1].trim()).filter(Boolean);
      if (tags.length) blocks.push({ start: match.index, end: match.index + match[0].length, raw: match[0], tags });
    }
    return blocks;
  }

  function stripTagBlocks(message) {
    return String(message || '')
      .replace(/[\(（]\s*((?:\[[^\]\r\n]+\]\s*)+)[\)）]/g, '')
      .replace(/\n{3,}/g, '\n\n');
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function createImageNode(item, link) {
    const wrapper = doc.createElement('span');
    wrapper.className = INSERT_WRAP_MARK;
    wrapper.dataset.cgHelper = item.id;

    const image = doc.createElement('img');
    image.className = INSERT_MARK;
    image.src = link;
    image.alt = item.name.replace(/[\[\]<>]/g, '');
    image.style.width = `${state.imageWidth}px`;
    image.style.maxWidth = '100%';
    image.style.height = 'auto';

    wrapper.appendChild(image);
    return wrapper;
  }

  function buildDisplayNodes(text) {
    const blocks = parseTagBlocks(text);
    if (!blocks.length) return { nodes: [doc.createTextNode(text)], count: 0, changed: false };
    let count = 0;
    let cursor = 0;
    const nodes = [];
    const usedClassIds = new Set();

    for (const block of blocks) {
      let matches = matchedClassesForTags(block.tags).filter(item => !usedClassIds.has(item.id));
      if (state.insertMode === 'first') matches = matches.slice(0, 1);
      const before = text.slice(cursor, block.start);
      if (before) nodes.push(doc.createTextNode(before));
      if (matches.length) {
        matches.forEach(item => {
          usedClassIds.add(item.id);
          count += 1;
          nodes.push(createImageNode(item, randomItem(item.links)));
        });
      }
      cursor = block.end;
    }

    const after = text.slice(cursor);
    if (after) nodes.push(doc.createTextNode(after));
    return { nodes, count, changed: true };
  }

  function isInsideCgNode(node) {
    return Boolean(node?.parentElement?.closest?.(`.${INSERT_WRAP_MARK}, .${INSERT_MARK}`));
  }

  function shouldSkipDisplayNode(node) {
    const element = node?.parentElement;
    if (!element) return true;
    return Boolean(
      element.closest(
        [
          'script',
          'style',
          'textarea',
          'input',
          'select',
          'button',
          'iframe',
          '[script_id]',
          '.mes_reasoning',
          '.mes_buttons',
          '.mes_edit_buttons',
          '.mes_status',
          '.status',
          '.status-bar',
          '.char_status',
          '.stscript',
          '.displayNone',
          `.${INSERT_WRAP_MARK}`,
          `.${INSERT_MARK}`,
        ].join(','),
      ),
    );
  }

  function replaceTextNodeWithCg(textNode) {
    if (!textNode?.nodeValue || isInsideCgNode(textNode) || shouldSkipDisplayNode(textNode)) return 0;
    const result = buildDisplayNodes(textNode.nodeValue);
    if (!result.changed) return 0;
    const fragment = doc.createDocumentFragment();
    result.nodes.forEach(node => fragment.appendChild(node));
    textNode.parentNode?.replaceChild(fragment, textNode);
    return result.count;
  }

  function renderCgInDisplayedMessage($message) {
    const root = $message?.[0];
    if (!root) return 0;
    const filterApi = win.NodeFilter || window.NodeFilter;
    if (!filterApi) return 0;
    const walker = doc.createTreeWalker(root, filterApi.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !/[\(（]\s*(?:\[[^\]\r\n]+\]\s*)+[\)）]/.test(node.nodeValue)) return filterApi.FILTER_REJECT;
        if (isInsideCgNode(node)) return filterApi.FILTER_REJECT;
        if (shouldSkipDisplayNode(node)) return filterApi.FILTER_REJECT;
        return filterApi.FILTER_ACCEPT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    return nodes.reduce((sum, node) => sum + replaceTextNodeWithCg(node), 0);
  }

  function getLastIdSafe() {
    try {
      return typeof getLastMessageId === 'function' ? getLastMessageId() : -1;
    } catch (_) {
      return -1;
    }
  }

  async function processMessage(messageId, manual = false) {
    if (!state.enabled) return;
    if (!manual && !state.autoInsert) return;
    if (!Number.isFinite(Number(messageId)) || Number(messageId) < 0) return;
    if (typeof getChatMessages !== 'function' || typeof retrieveDisplayedMessage !== 'function') return;

    try {
      const $message = retrieveDisplayedMessage(Number(messageId));
      if (!$message || !$message.length) return;
      const count = renderCgInDisplayedMessage($message);
      if (manual) toast('success', count ? `已显示 ${count} 张 CG。` : '最新楼层没有匹配到可显示的 CG 标签块。');
    } catch (error) {
      console.error('[CG脚本] 显示CG失败。', error);
      toast('error', '显示 CG 失败，请查看控制台。');
    }
  }

  function cleanPromptPayload(value, seen = new WeakSet()) {
    if (typeof value === 'string') return stripTagBlocks(value);
    if (!value) return value;
    if (typeof value === 'object') {
      if (seen.has(value)) return value;
      seen.add(value);
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        value[index] = cleanPromptPayload(item, seen);
      });
      return value;
    }
    if (typeof value === 'object') {
      for (const key of ['message', 'content', 'text', 'prompt']) {
        if (typeof value[key] === 'string') value[key] = stripTagBlocks(value[key]);
      }
      Object.keys(value).forEach(key => {
        value[key] = cleanPromptPayload(value[key], seen);
      });
    }
    return value;
  }

  function refreshDisplayedMessages() {
    if (typeof getLastMessageId !== 'function') return;
    const lastId = getLastMessageId();
    for (let messageId = 0; messageId <= lastId; messageId += 1) {
      setTimeout(() => processMessage(messageId), 20);
    }
  }

  function setupMessageListeners() {
    if (typeof eventOn !== 'function' || typeof tavern_events !== 'object') return;
    const delayed = messageId => setTimeout(() => processMessage(messageId), 80);
    if (tavern_events.GENERATION_ENDED) eventOn(tavern_events.GENERATION_ENDED, delayed);
    if (tavern_events.MESSAGE_RECEIVED) eventOn(tavern_events.MESSAGE_RECEIVED, messageId => delayed(messageId));
    if (tavern_events.MESSAGE_UPDATED) eventOn(tavern_events.MESSAGE_UPDATED, messageId => delayed(messageId));
    if (tavern_events.MESSAGE_SWIPED) eventOn(tavern_events.MESSAGE_SWIPED, messageId => delayed(messageId));
    if (tavern_events.CHARACTER_MESSAGE_RENDERED) eventOn(tavern_events.CHARACTER_MESSAGE_RENDERED, messageId => delayed(messageId));
    if (tavern_events.USER_MESSAGE_RENDERED) eventOn(tavern_events.USER_MESSAGE_RENDERED, messageId => delayed(messageId));
    if (tavern_events.CHAT_CHANGED) eventOn(tavern_events.CHAT_CHANGED, () => setTimeout(refreshDisplayedMessages, 120));
    if (tavern_events.GENERATE_AFTER_DATA) eventOn(tavern_events.GENERATE_AFTER_DATA, generateData => cleanPromptPayload(generateData));
    if (tavern_events.CHAT_COMPLETION_PROMPT_READY) eventOn(tavern_events.CHAT_COMPLETION_PROMPT_READY, eventData => cleanPromptPayload(eventData));
    if (tavern_events.GENERATE_AFTER_COMBINE_PROMPTS) eventOn(tavern_events.GENERATE_AFTER_COMBINE_PROMPTS, result => cleanPromptPayload(result));
  }

  function init() {
    removeOwnedElements();
    ensureStyle();
    renderNow();
    bindUiEvents();
    bindPanelDrag();
    setupButton();
    setupMessageListeners();
    win.addEventListener?.('pagehide', removeOwnedElements, { once: true });
    console.info('[CG脚本] 已加载。');
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
