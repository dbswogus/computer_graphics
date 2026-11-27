/* 읽기 마지막: 모든 모듈이 준비된 뒤 시작 선택 화면과 편집기 스타일을 추가합니다. */
(() => {
  const style=document.createElement('style');
  style.textContent=`
    .studio-dialog[hidden]{display:none}.studio-dialog{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:#223425bb;font:16px/1.6 sans-serif;padding:20px}
    .studio-card{max-width:620px;padding:28px;background:#fffdf3;border-radius:24px;color:#30462f}.studio-card button{padding:12px;border:1px solid #9ba98a;border-radius:12px;background:#e5ecd9;cursor:pointer}
    #studio-design{padding:18px;background:#e3e8d9;border-radius:16px;margin-top:14px}#studio-design details{margin:10px 0}#studio-design summary{cursor:pointer}#studio-design label{display:inline-flex;gap:6px;margin:5px;align-items:center}
    #asset-drop{padding:22px;border:2px dashed #879c74;border-radius:16px}#asset-drop.dropping{background:#d1dfbf}#asset-list{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0;max-height:180px;overflow:auto}
    .studio-ui-grid{display:grid;grid-template-columns:minmax(300px,800px) minmax(180px,260px);gap:14px}#ui-preview{width:100%;height:auto;touch-action:none;border:1px solid #9baa8b}#ui-properties{display:grid;gap:6px;align-content:start}#ui-properties label{display:grid;grid-template-columns:1fr 90px}#ui-properties input{width:90px}
    @media(max-width:850px){.studio-ui-grid{grid-template-columns:1fr}}
  `;
  document.head.append(style);
  const theme=document.createElement('link');theme.rel='stylesheet';theme.href='assets/styles/editor.css';document.head.append(theme);
  GyroInput.initialize();
  const play=document.createElement('button');play.textContent='프로젝트 테스트';play.onclick=()=>{SettingsMenu.close();MapEditor.chooseThenPlay(true);};SettingsMenu.add(play);
  // 편집기 진입점은 편집 화면으로 바로 시작. 조작 선택은 필요할 때 설정 창에서 열 수 있습니다.
  document.getElementById('control-dialog').hidden=true;
  MapEditor.open();
})();
