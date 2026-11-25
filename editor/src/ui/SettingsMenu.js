/* 담당: UI / 유리. 오른쪽 위 설정 버튼과 설정 창. 편집기 테스트와 배포본이 함께 사용합니다.
 * 읽기: initialize → add → open/close. 열려 있는 동안 GyroInput.isChoosing()을 통해 게임이 멈춥니다. */
const SettingsMenu = (() => {
  let dialog = null, button = null;

  const css = `
    #settings-button{position:fixed;top:max(4px,.5vw);right:max(4px,.5vw);z-index:36;width:clamp(28px,3vw,44px);height:clamp(28px,3vw,44px);padding:clamp(5px,.55vw,8px);border:1px solid #a9b59b;border-radius:50%;background:#f6f6e9;color:#405f40;cursor:pointer;display:flex;align-items:center;justify-content:center}
    #settings-button:hover,#settings-button:focus-visible{background:#e5ecd9;outline:2px solid #466744;outline-offset:1px}
    #settings-button svg{width:100%;height:100%;display:block}
    #settings-dialog .studio-card{width:min(340px,92vw);max-height:92vh;overflow:auto}
    #settings-dialog h2{margin:0 0 16px;font-size:22px}
    #control-bar{display:flex;flex-direction:column;gap:10px}
    #settings-dialog button{width:100%;min-height:46px;padding:10px 14px;border:1px solid #a4b493;border-radius:12px;background:#f6f6e9;color:#405f40;font:600 16px/1.4 sans-serif;cursor:pointer}
    #settings-dialog #settings-close{margin-top:16px;background:#466744;border-color:#466744;color:#fff}
    @media(max-height:480px){#settings-button{width:38px;height:38px;padding:7px}#settings-dialog .studio-card{width:min(520px,92vw);padding:18px}#settings-dialog h2{margin-bottom:10px}#control-bar{display:grid;grid-template-columns:1fr 1fr}#settings-dialog #settings-close{margin-top:10px}}
  `;
  const icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8"/><circle cx="12" cy="12" r="6.6"/></svg>';

  /** 매개변수 없음. @returns {void} 버튼과 창을 한 번만 만듭니다. 메뉴 항목은 add로 추가합니다. */
  function initialize() {
    if (dialog) return;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.append(style);
    button = document.createElement('button');
    button.id = 'settings-button';
    button.innerHTML = icon;
    button.onclick = open;
    dialog = document.createElement('section');
    dialog.id = 'settings-dialog';
    dialog.className = 'studio-dialog';
    dialog.hidden = true;
    const card = document.createElement('div'), title = document.createElement('h2'), bar = document.createElement('div'), done = document.createElement('button');
    card.className = 'studio-card';
    title.id = 'settings-title';
    bar.id = 'control-bar';
    done.id = 'settings-close';
    done.onclick = close;
    card.append(title, bar, done);
    dialog.append(card);
    dialog.addEventListener('pointerdown', event => { if (event.target === dialog) close(); });
    document.body.append(button, dialog);
    refreshLabels();
  }

  /** @param item {HTMLButtonElement} 메뉴 버튼. @returns {HTMLButtonElement} 설정 창에 추가한 버튼. */
  function add(item) {
    document.getElementById('control-bar').append(item);
    return item;
  }

  /** 매개변수 없음. @returns {void} 입력을 비우고 창을 엽니다. */
  function open() {
    dialog.hidden = false;
    clearInput();
    document.getElementById('settings-close').focus();
  }

  /** 매개변수 없음. @returns {void} 창을 닫고 키보드 조작이 바로 되도록 캔버스로 돌아갑니다. */
  function close() {
    if (!dialog) return;
    dialog.hidden = true;
    clearInput();
    canvas.focus();
  }

  /** 매개변수 없음. @returns {void} Esc 키로 열고 닫습니다. 편집 화면과 조작 선택 중에는 동작하지 않습니다. */
  function toggle() {
    if (!dialog || screen === 'editor') return;
    if (isOpen()) close();
    else if (!GyroInput.isChoosing()) open();
  }

  /** 매개변수 없음. @returns {boolean} 열려 있으면 true. */
  function isOpen() { return Boolean(dialog && !dialog.hidden); }

  /** 매개변수 없음. @returns {void} UI 편집에서 바꾼 문구를 반영. */
  function refreshLabels() {
    if (!dialog) return;
    document.getElementById('settings-title').textContent = UI_TEXT.controls_settings;
    document.getElementById('settings-close').textContent = UI_TEXT.controls_close;
    button.setAttribute('aria-label', UI_TEXT.controls_settings);
    button.title = UI_TEXT.controls_settings;
  }

  return { initialize, add, open, close, toggle, isOpen, refreshLabels };
})();
