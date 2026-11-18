/* 읽기 2: createInterface → bindEvents → editCell/updateProperty → commit → play.
 * BlockMap은 데이터/판정, 이 파일은 편집 UI와 기존 게임 연결을 담당합니다.
 * 네트워크 요청이 없습니다. JSON 파일을 저장하면 다른 PC에서도 이어서 편집할 수 있습니다. */
const MapEditor = (() => {
  const labels = { asset:'에셋 장식', select:'선택', floor:'바닥', wall:'벽', hole:'구멍', sweeper:'왕복 장애물', crumble:'무너지는 바닥', checkpoint:'체크포인트', start:'출발점', goal:'목표점', erase:'지우개' };
  const colors = { asset:'#8f78ab', floor:'#b69a70', wall:'#52694d', hole:'#684c3c', sweeper:'#d77b50', crumble:'#ccab73', checkpoint:'#8aa575', start:'#459caa', goal:'#d7ae4d' };
  const cellSize = 48, storageKey = 'onggi-editor-project';
  let maps = [ProjectData.unitMap(BlockMap.example())], activeMap = 0, map = maps[0], tool = 'floor', selectedId = null, undoStack = [], redoStack = [];
  let testing = false, originalStages = null, dragging = false, strokeBefore = null, lastCell = '';
  let panel, board, brush, message, properties, launchButton, undoButton, redoButton;

  /** @param value {object} JSON 호환 맵. @returns {object} 참조를 공유하지 않는 복사본. */
  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  /** @param text {string} 안내/오류 문구. @param error {boolean} 오류 색상 여부. @returns {void} live status만 갱신. */
  function status(text, error = false) {
    message.textContent = text;
    message.style.color = error ? '#a73528' : '#40583c';
  }

  /** 매개변수 없음. @returns {void} 현재 문서를 자동 저장. file:// 저장소가 차단되면 JSON 저장을 안내. */
  function persist() {
    maps[activeMap]=map;
    try { localStorage.setItem(storageKey, JSON.stringify(exportProject())); }
    catch { status('자동 저장을 사용할 수 없습니다. JSON 저장 버튼으로 파일을 보관하세요.', true); }
  }

  /** @param before {object} 수정 전 맵. @returns {void} 최대 80회 실행 취소 기록, 자동 저장, 화면 갱신. */
  function commit(before) {
    if (JSON.stringify(before) === JSON.stringify(snapshot())) return;
    undoStack.push(before);
    if (undoStack.length > 80) undoStack.shift();
    redoStack = [];
    persist();
    render();
  }

  /** @param undo {boolean} true=실행 취소, false=다시 실행. @returns {void} 문서와 선택 상태를 복원. */
  function history(undo) {
    const from = undo ? undoStack : redoStack, to = undo ? redoStack : undoStack;
    if (!from.length) return;
    to.push(snapshot()); restore(from.pop()); selectedId = null;
    persist(); render(); status(undo ? '실행 취소했습니다.' : '다시 실행했습니다.');
  }

  /** @param event {PointerEvent} 편집 캔버스 이벤트. @returns {{x:number,z:number}|null} 크기/배율을 보정하고 1칸 중앙에 맞춘 좌표. */
  function position(event) {
    const rect = board.getBoundingClientRect();
    const col = Math.floor((event.clientX - rect.left) / rect.width * 17);
    const row = Math.floor((event.clientY - rect.top) / rect.height * 12);
    if (col < 0 || col >= 17 || row < 0 || row >= 12) return null;
    return { x: -9 + col + 0.5, z: -6 + row + 0.5 };
  }

  /** @param point {{x:number,z:number}} 월드 좌표. @returns {object|undefined} 바닥보다 위의 블록을 우선 선택. */
  function hitBlock(point) {
    return [...map.blocks].reverse().sort((a,b) => (a.type === 'floor') - (b.type === 'floor')).find(b => {
      const r = BlockMap.rectangle(b);
      return Math.abs(point.x-r.x) <= r.w/2 && Math.abs(point.z-r.z) <= r.d/2;
    });
  }

  /** @param point {{x:number,z:number}} 격자 좌표. @param erase {boolean} 우클릭 삭제 여부.
   * @returns {void} 선택/배치/삭제. 드래그 기록은 finishStroke에서 한 번에 저장. */
  function editCell(point, erase = false) {
    const key = `${point.x},${point.z}`;
    if (key === lastCell) return;
    lastCell = key;
    const hit = hitBlock(point);
    if (erase || tool === 'erase') {
      if (hit) map.blocks = map.blocks.filter(b => b.id !== hit.id);
      selectedId = null;
    } else if (tool === 'select') {
      selectedId = hit?.id || null;
    } else {
      if (tool === 'asset' && !AssetBank.list().some(a=>a.id===AssetBank.selected()&&['image','model'].includes(a.kind))) { status('먼저 아래에서 이미지 또는 OBJ 에셋을 선택하세요.',true); return; }
      if (map.blocks.some(b => b.type === tool && b.x === point.x && b.z === point.z)) return;
      if (map.blocks.length >= 500) { status('블록은 최대 500개까지 배치할 수 있습니다.', true); return; }
      if (tool === 'start' || tool === 'goal') map.blocks = map.blocks.filter(b => b.type !== tool);
      const block = { id: `b-${Date.now()}-${Math.random().toString(36).slice(2,9)}`, type: tool, ...point, w:1, d:1, rotation:0, period:5, amp:1, axis:'x' };
      if(tool==='asset')block.assetId=AssetBank.selected();
      map.blocks.push(block); selectedId = block.id;
    }
    render();
  }

  /** 매개변수 없음. @returns {void} 포인터 취소/해제를 포함해 드래그 한 번을 하나의 undo 작업으로 마무리. */
  function finishStroke() {
    if (!dragging) return;
    dragging = false;
    if (strokeBefore) commit(strokeBefore);
    strokeBefore = null; lastCell = '';
  }

  /** @param key {string} x/z/w/d/rotation/period/amp/axis. @param value {string} 폼 입력.
   * @returns {void} 검증에 성공할 때만 원본을 교체. 잘못된 입력은 이전 값을 유지. */
  function updateProperty(key, value) {
    const before = snapshot(), next = clone(map), block = next.blocks.find(b => b.id === selectedId);
    if (!block) return;
    if(key==='skinAssetId'){if(value)block.skinAssetId=value;else delete block.skinAssetId;}
    else block[key] = key === 'axis' ? value : Number(value);
    if ((key === 'x' || key === 'z') && !Number.isInteger(block[key]-0.5)) {status('위치는 1칸 단위(예: 0.5, 1.5)로만 이동합니다.',true);renderProperties();return;}
    try { map = BlockMap.validate(next); commit(before); status('블록 속성을 변경했습니다.'); }
    catch (error) { status(error.message, true); renderProperties(); }
  }

  /** 매개변수 없음. @returns {void} 캔버스에 격자·블록·종류 기호·선택 테두리를 그립니다. 클릭 판정과 같은 rectangle을 사용. */
  function render() {
    const ctx = board.getContext('2d');
    ctx.fillStyle = '#e8ebdf'; ctx.fillRect(0,0,board.width,board.height);
    const sorted = [...map.blocks].sort((a,b) => (b.type === 'floor') - (a.type === 'floor'));
    for (const b of sorted) {
      const r = BlockMap.rectangle(b), x = (r.x+9-r.w/2)*cellSize, y = (r.z+6-r.d/2)*cellSize;
      ctx.fillStyle = colors[b.type];
      if (b.type === 'hole') {
        ctx.beginPath();ctx.arc((b.x+9)*cellSize,(b.z+6)*cellSize,Math.min(b.w,b.d)*cellSize/2,0,Math.PI*2);ctx.fill();
      } else ctx.fillRect(x+1,y+1,r.w*cellSize-2,r.d*cellSize-2);
      const skin=AssetBank.image(AssetBank.skinId(b.type,b));
      if(skin && b.type!=='hole')ctx.drawImage(skin,x+1,y+1,r.w*cellSize-2,r.d*cellSize-2);
      if(b.type==='asset'){const image=AssetBank.image(b.assetId);if(image)ctx.drawImage(image,x+1,y+1,cellSize-2,cellSize-2);}
      ctx.fillStyle = '#fff'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font='bold 15px sans-serif';
      if (b.type !== 'floor') ctx.fillText({asset:'◆',wall:'벽',hole:'○',sweeper:'↔',crumble:'금',checkpoint:'✓',start:'S',goal:'G'}[b.type],(r.x+9)*cellSize,(r.z+6)*cellSize);
      if (b.type === 'sweeper') {
        ctx.strokeStyle='#ba5f33'; ctx.setLineDash([5,4]); ctx.beginPath();
        ctx.moveTo((b.x+9-(b.axis==='x'?b.amp:0))*cellSize,(b.z+6-(b.axis==='z'?b.amp:0))*cellSize);
        ctx.lineTo((b.x+9+(b.axis==='x'?b.amp:0))*cellSize,(b.z+6+(b.axis==='z'?b.amp:0))*cellSize); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    ctx.strokeStyle='#ffffff66';ctx.lineWidth=1;
    for (let x=0;x<=17;x++) {ctx.beginPath();ctx.moveTo(x*cellSize,0);ctx.lineTo(x*cellSize,board.height);ctx.stroke();}
    for (let y=0;y<=12;y++) {ctx.beginPath();ctx.moveTo(0,y*cellSize);ctx.lineTo(board.width,y*cellSize);ctx.stroke();}
    const selected = map.blocks.find(b=>b.id===selectedId);
    if (selected) {const r=BlockMap.rectangle(selected);ctx.strokeStyle='#214e97';ctx.lineWidth=3;ctx.strokeRect((r.x+9-r.w/2)*cellSize+2,(r.z+6-r.d/2)*cellSize+2,r.w*cellSize-4,r.d*cellSize-4);}
    if(panel.querySelector('#editor-map-select'))refreshMaps();
    undoButton.disabled=!undoStack.length;redoButton.disabled=!redoStack.length;
    const nameInput=panel.querySelector('#editor-map-name');
    if(document.activeElement!==nameInput)nameInput.value=map.name;
    renderProperties();
  }

  /** 매개변수 없음. @returns {void} 선택한 블록의 속성 폼 생성. 속성은 텍스트/DOM API로만 표시. */
  function renderProperties() {
    properties.replaceChildren();
    const block = map.blocks.find(b=>b.id===selectedId);
    if (!block) { properties.textContent='선택 도구로 블록을 누르면 위치(1칸)·회전을 수정할 수 있어요.'; return; }
    const title = document.createElement('strong');title.textContent=labels[block.type];properties.append(title);
    for (const [key,label] of [['x','X 위치'],['z','Z 위치'],...(['start','goal','checkpoint'].includes(block.type)?[]:[['rotation','회전']]),...(block.type==='sweeper'?[['period','왕복 주기(초)'],['amp','이동 반경'],['axis','왕복 축']]:[])]) {
      const row=document.createElement('label');row.textContent=label;
      let input;
      if(key==='rotation'||key==='axis') {
        input=document.createElement('select');
        for(const value of key==='rotation'?[0,90]:['x','z']){const option=document.createElement('option');option.value=value;option.textContent=String(value);input.append(option);}
      }else{input=document.createElement('input');input.type='number';input.step=key==='period'?'0.5':'1';}
      input.value=block[key] ?? ({rotation:0,period:5,amp:1,axis:'x'}[key]);
      input.addEventListener('change',()=>updateProperty(key,input.value));row.append(input);properties.append(row);
    }
    if(block.type!=='asset') {
      const row=document.createElement('label');row.textContent='개별 외형';
      const select=document.createElement('select');select.id='block-skin';
      const inherit=document.createElement('option');inherit.value='';inherit.textContent='종류 기본값 따르기';select.append(inherit);
      for(const asset of AssetBank.list()) {
        if(!(['floor','hole'].includes(block.type)?['image']:['image','model']).includes(asset.kind))continue;
        const option=document.createElement('option');option.value=asset.id;option.textContent=asset.name;select.append(option);
      }
      select.value=block.skinAssetId || '';
      select.onchange=()=>updateProperty('skinAssetId',select.value);row.append(select);properties.append(row);
      const help=document.createElement('small');help.textContent='이 블록만 변경합니다. 기본값은 아래 에셋 탭에서 지정하세요. 외형은 충돌 크기를 바꾸지 않습니다.';properties.append(help);
    }
    const remove=document.createElement('button');remove.textContent='선택 블록 삭제';
    remove.onclick=()=>{const before=snapshot();map.blocks=map.blocks.filter(b=>b.id!==selectedId);selectedId=null;commit(before);};properties.append(remove);
  }

  /** @param st {object} 해제할 스테이지. @returns {void} 기존 지형의 GPU 버퍼 해제 후 surfaces를 비웁니다. 모델 공용 메시에는 영향 없음. */
  function releaseGeometry(st) {
    for (const sf of st.surfaces || []) for (const m of [sf.floor, sf.walls, ...(sf.rims || [])]) {
      gl.deleteBuffer(m.b); gl.deleteBuffer(m.nb);
    }
    st.surfaces = [];
  }

  /** 매개변수 없음. @returns {void} GPU 버퍼를 해제한 후 현 STAGES로 바닥/벽을 재생성. 테스트 반복 시 누수 방지. */
  function rebuild() {
    for (const st of STAGES) releaseGeometry(st);
    buildStageGeometry();
    for (const st of STAGES) if (st.editorStage) for(const sf of st.surfaces) sf.wallSegments.push(...st.editorWalls);
  }

  /** 매개변수 없음. @returns {void} validate/compile 통과 시 원본 공방을 잠시 교체하고 3D 물리 플레이 시작. */
  function play() {
    AssetBank.unlockEffects();
    finishStroke();
    try {
      maps[activeMap]=map;
      const playingMaps=panel.querySelector('#editor-all-maps').checked?maps:[map];
      const custom=playingMaps.map((m,i)=>{try{return BlockMap.compile(m,OnggiPhysics.maxRadius(StudioUI.settings.onggiPhysics));}catch(e){throw Error((i+1)+'번 맵: '+e.message);}});
      const config=GAME_CONFIG.map;
      if(config.minX>BlockMap.bounds.minX || config.minZ>BlockMap.bounds.minZ ||
         config.minX+config.gridColumns*config.gridStep<BlockMap.bounds.maxX ||
         config.minZ+config.gridRows*config.gridStep<BlockMap.bounds.maxZ) {
        throw Error('GameConfig.map의 지형 생성 범위가 편집 영역보다 작습니다. 기본 범위로 되돌려 주세요.');
      }
      if (!testing) originalStages = [...STAGES];
      for(const st of STAGES)releaseGeometry(st);
      STAGES.splice(0,STAGES.length,...custom); testing=true;
      rebuild(); startStage(0); screen='play';dirty=true;
      panel.hidden=true;launchButton.textContent='편집으로 돌아가기';clearInput();canvas.focus();
    } catch(error) { status(error.message,true); }
  }

  /** 매개변수 없음. @returns {void} 편집기 표시. 테스트 중이면 원본 맵과 GPU 지형을 복원하고 입력/시간 누적을 초기화. */
  function open() {
    finishStroke();
    if(testing){for(const st of STAGES)releaseGeometry(st);STAGES.splice(0,STAGES.length,...originalStages);stage=0;testing=false;rebuild();launchButton.textContent='편집 모드';}
    clearInput(); screen='editor';acc=0;last=0;
    panel.hidden=false;render();status('도구를 고르고 클릭·드래그로 배치하세요. 우클릭은 삭제입니다.');
  }

  /** 매개변수 없음. @returns {void} 현재 문서를 검증하고 JSON 다운로드. 브라우저가 저장 위치를 결정. */
  function download() {
    AssetBank.unlockEffects();
    finishStroke();
    try {
      const valid=ProjectData.validate(exportProject()),url=URL.createObjectURL(new Blob([JSON.stringify(valid,null,2)],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download='onggi-project-v4.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      void AssetBank.playEffect('projectSave');
      status('프로젝트 JSON을 저장했습니다. 아무 폴더에 보관한 뒤 이 화면의 불러오기로 선택하세요.');
    }catch(error){status(error.message,true);}
  }

  /** @param file {File} 사용자가 고른 JSON(최대 1MB). @returns {Promise<void>} 검증 후 원자적으로 교체. 실패하면 기존 문서 유지. */
  async function load(file) {
    if(!file)return;
    panel.inert=true;
    try {
      if(file.size>45*1024*1024)throw Error('프로젝트 JSON은 45MB 이하여야 합니다.');
      const next=GameDocument.extractProject(await file.text());
      const nextUI=StudioUI.validate(next.ui);
      const prepared=await AssetBank.prepare(next.assets);
      maps=next.maps;activeMap=0;map=maps[0];selectedId=null;undoStack=[];redoStack=[];
      AssetBank.applyPrepared(prepared);StudioUI.apply(nextUI);StudioUI.refreshAssets();
      persist();render();status('프로젝트를 불러왔습니다. 맵·UI·에셋이 함께 복원되었습니다.');return true;
    }catch(error){status('불러오기 실패: '+error.message,true);return false;}finally{panel.inert=false;}
  }

  /** 매개변수 없음. @returns {void} 포인터/키 이벤트 연결. 편집기 밖의 게임 키 입력은 가로채지 않습니다. */
  function bindEvents() {
    board.addEventListener('contextmenu',e=>e.preventDefault());
    board.addEventListener('pointerdown',e=>{
      if(e.button!==0&&e.button!==2)return;
      e.preventDefault();finishStroke();dragging=true;strokeBefore=snapshot();lastCell='';board.setPointerCapture(e.pointerId);
      const point=position(e);if(point)editCell(point,e.button===2);
    });
    board.addEventListener('pointermove',e=>{if(dragging){const point=position(e);if(point)editCell(point,(e.buttons&2)!==0);}});
    for(const name of ['pointerup','pointercancel','lostpointercapture'])board.addEventListener(name,finishStroke);
    window.addEventListener('blur',finishStroke);
    window.addEventListener('keydown',e=>{
      if(panel.hidden||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();history(!e.shiftKey);}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();history(false);}
      if(e.key==='Delete'&&selectedId){const before=snapshot();map.blocks=map.blocks.filter(b=>b.id!==selectedId);selectedId=null;commit(before);}
    });
  }

  /** 매개변수 없음. @returns {void} 오프라인 DOM 편집 UI를 구성하고 저장된 초안을 검증해서 복원. */
  function createInterface() {
    const style=document.createElement('style');style.textContent=`
      #map-editor[hidden]{display:none} #editor-launch{position:fixed;left:16px;top:16px;z-index:30;padding:11px 18px;border-radius:24px;background:#405f40;color:white;border:1px solid #dce4d1;cursor:pointer;font:bold 14px sans-serif}
      #map-editor{position:fixed;inset:0;z-index:40;background:#f3f1e6;color:#2e4432;font:14px/1.5 sans-serif;overflow:auto;padding:20px;box-sizing:border-box}
      #map-editor *{box-sizing:border-box} #map-editor button,#map-editor input,#map-editor select{font:inherit;border:1px solid #bac4ae;border-radius:8px;padding:8px;background:#fffdf6;color:#2e4432}
      #map-editor button{cursor:pointer} #map-editor button:disabled{opacity:.4;cursor:default} #map-editor button.active{background:#405f40;color:white}
      #map-editor .editor-top{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px} #map-editor h1{margin:0 20px 0 0;font-size:23px}
      #map-editor .editor-grid{display:grid;grid-template-columns:190px minmax(320px,816px) 210px;gap:18px;align-items:start}
      #editor-tools{display:grid;grid-template-columns:1fr 1fr;gap:6px} #editor-board{width:100%;height:auto;object-fit:contain;touch-action:none;border:1px solid #bbc6ad;display:block;background:#e8ebdf}
      #editor-properties{display:grid;gap:8px;padding:12px;background:#e5e8da;border-radius:12px} #editor-properties label{display:grid;grid-template-columns:1fr 80px;gap:4px;align-items:center}
      #editor-properties input,#editor-properties select{min-width:0;width:100%} #editor-status{min-height:24px;font-weight:bold} .editor-help{color:#687460;font-size:13px}
      @media(max-width:900px){#map-editor .editor-grid{grid-template-columns:150px minmax(300px,1fr)}#editor-properties{grid-column:1/-1}#map-editor{padding:12px}}
      @media(max-width:550px){#map-editor .editor-grid{display:block}#editor-tools{grid-template-columns:repeat(4,1fr);margin-bottom:12px}#editor-properties{margin-top:12px}}
    `;document.head.append(style);
    launchButton=document.createElement('button');launchButton.id='editor-launch';launchButton.textContent='맵 편집';launchButton.onclick=open;document.body.append(launchButton);
    panel=document.createElement('section');panel.id='map-editor';panel.hidden=true;panel.setAttribute('aria-label','블록 맵 편집기');
    panel.innerHTML=`<div class="editor-top"><h1>데굴데굴 옹기 <small>편집 모드</small></h1><label class="workspace-picker">작업 <select id="editor-workspace"><option value="map">맵 만들기 · 다유</option><option value="design">꾸미기·물리 · 유리/재현</option><option value="team">담당별 저장 · 협업</option></select></label><div class="editor-primary"><button id="editor-play">▶ 테스트</button><details class="editor-menu"><summary>파일·배포</summary><div id="editor-file-menu"><button id="editor-save">프로젝트 백업</button><button id="editor-load">프로젝트 불러오기</button><input id="editor-file" type="file" accept=".json,.html,.htm,application/json,text/html" hidden><button id="editor-close">타이틀 미리보기</button></div></details></div></div><p id="editor-status" role="status" aria-live="polite"></p><div id="workspace-map" class="editor-grid"><aside><div id="editor-tools"></div><p class="editor-help">모든 블록 = 1×1칸 고정<br>왼쪽 위: X -9 / Z -6<br>파랑 S: 출발 · 금색 G: 목표<br><br>클릭·드래그: 배치<br>우클릭·지우개: 삭제<br>선택 → 오른쪽 속성 수정<br>Ctrl+Z: 실행 취소<br><br>출발점과 목표점 아래에 바닥이 필요합니다. 체크포인트는 배치 순서로 진행합니다.</p></aside><div><canvas id="editor-board" width="816" height="576" aria-label="17열 12행 블록 편집 격자"></canvas><p class="editor-help">회전은 0/90도. 구멍은 짧은 변을 지름으로 한 원형이며, 이동 장애물의 점선은 왕복 범위입니다. 초안은 가능한 경우 자동 저장됩니다. 공유·장기 보관은 JSON 저장을 이용하세요.</p></div><aside id="editor-properties"></aside></div>`;
    const workflow=document.createElement('p');workflow.className='editor-workflow';
    workflow.textContent='01 맵 만들기  →  02 아래에서 외형·효과음·UI 설정  →  03 바로 테스트  →  04 release ZIP 내보내기';
    panel.append(workflow);
    document.body.append(panel);
    const mapsBar=document.createElement('div');mapsBar.className='editor-mapbar';mapsBar.id='editor-mapbar';
    mapsBar.innerHTML='<label>맵 <select id="editor-map-select" aria-label="편집할 맵"></select></label><input id="editor-map-name" aria-label="맵 이름" maxlength="40"><button id="editor-undo" aria-label="실행 취소" title="Ctrl+Z">↶</button><button id="editor-redo" aria-label="다시 실행" title="Ctrl+Y">↷</button><details class="editor-menu"><summary>맵 관리</summary><div><button id="map-add">맵 추가</button><button id="map-copy">맵 복제</button><button id="map-delete">맵 삭제</button><button id="map-up">앞으로 이동</button><button id="map-down">뒤로 이동</button><button id="editor-example">예제 맵으로 교체</button><button id="editor-empty">전체 비우기</button><label><input id="editor-all-maps" type="checkbox" checked>모든 맵 연속 테스트</label></div></details>';

    panel.querySelector('.editor-top').after(mapsBar);
    board=panel.querySelector('#editor-board');brush=panel.querySelector('#editor-tools');message=panel.querySelector('#editor-status');properties=panel.querySelector('#editor-properties');undoButton=panel.querySelector('#editor-undo');redoButton=panel.querySelector('#editor-redo');
    for(const [id,label]of Object.entries(labels)){const button=document.createElement('button');button.textContent=label;button.dataset.tool=id;button.hidden=!['select','floor','erase'].includes(id);button.classList.toggle('active',tool===id);button.onclick=()=>{finishStroke();tool=id;const picker=panel.querySelector('#editor-tool-picker');if(picker)picker.value=tool;for(const b of brush.children)b.classList.toggle('active',b.dataset.tool===tool);};brush.append(button);}
    const toolPicker=document.createElement('select');toolPicker.id='editor-tool-picker';toolPicker.setAttribute('aria-label','배치할 블록');
    for(const [id,label]of Object.entries(labels)){const option=document.createElement('option');option.value=id;option.textContent=label;toolPicker.append(option);}toolPicker.value=tool;
    toolPicker.onchange=()=>{for(const button of brush.children)if(button.dataset.tool===toolPicker.value)button.click();};brush.append(toolPicker);
    let draft=null;try{draft=localStorage.getItem(storageKey)||localStorage.getItem('onggi-studio-v4');}catch{}
    if(!draft&&typeof TEAM_UI_SOURCE!=='undefined')draft=JSON.stringify(TeamSource.combine({ui:TEAM_UI_SOURCE,map:TEAM_MAP_SOURCE,physics:TEAM_PHYSICS_SOURCE}));
    if(!draft&&typeof EDITOR_INITIAL_PROJECT!=='undefined')draft=JSON.stringify(EDITOR_INITIAL_PROJECT);
    if(draft)queueMicrotask(()=>load({size:draft.length,text:async()=>draft}));
    const name=panel.querySelector('#editor-map-name');name.value=map.name;name.onchange=()=>{const before=snapshot();map.name=name.value.trim()||'내가 만든 맵';commit(before);};
    panel.querySelector('#editor-play').onclick=play;
    panel.querySelector('#editor-close').onclick=()=>{finishStroke();panel.hidden=true;screen='title';clearInput();dirty=true;canvas.focus();};
    panel.querySelector('#editor-save').onclick=download;
    const input=panel.querySelector('#editor-file');panel.querySelector('#editor-load').onclick=()=>input.click();input.onchange=()=>{load(input.files[0]);input.value='';};
    undoButton.onclick=()=>history(true);redoButton.onclick=()=>history(false);
    for(const [id,make]of [['editor-example',BlockMap.example],['editor-empty',()=>({version:1,name:'새 블록 맵',blocks:[]})]])panel.querySelector('#'+id).onclick=()=>{finishStroke();const before=snapshot();map=ProjectData.unitMap(make());selectedId=null;commit(before);name.value=map.name;status('맵을 변경했습니다. 실행 취소로 되돌릴 수 있어요.');};
    mapsBar.querySelector('#editor-map-select').onchange=e=>switchMap(Number(e.target.value));
    for(const [id,kind]of [['map-add','add'],['map-copy','copy'],['map-delete','delete'],['map-up','up'],['map-down','down']])mapsBar.querySelector('#'+id).onclick=()=>manageMap(kind);
    const hint=document.createElement('p');hint.className='editor-help';hint.textContent='JSON은 특정 폴더에 넣을 필요가 없습니다. 다운로드/문서 등 원하는 곳에 보관하고 위의 불러오기에서 선택하세요. 전체 맵·UI·에셋을 한 파일로 저장합니다.';panel.append(hint);
    const studio=document.createElement('section');studio.id='studio-design';panel.append(studio);
    StudioUI.mount(studio,()=>{persist();render();},id=>{AssetBank.select(id);tool='asset';panel.querySelector('#editor-tool-picker').value='asset';for(const b of brush.children)b.classList.toggle('active',b.dataset.tool===tool);status('이미지/모델 배치 도구가 선택되었습니다. 바닥 위의 칸을 누르세요.');});
    bindEvents();render();
  }

  /** 매개변수 없음. @returns {object} 모든 맵과 현재 편집 번호의 복사본. undo용으로 에셋 바이너리는 복사하지 않음. */
  function snapshot(){maps[activeMap]=map;return clone({maps,activeMap});}
  /** @param state {object} snapshot 결과. @returns {void} 맵 집합과 현재 선택 복원. */
  function restore(state){maps=state.maps;activeMap=state.activeMap;map=maps[activeMap];}
  /** 매개변수 없음. @returns {object} 전체 맵·UI·에셋을 담은 재사용 가능한 v4 프로젝트. */
  function exportProject(){maps[activeMap]=map;return {kind:'onggi-project',version:4,maps:clone(maps),ui:StudioUI.exportData(),assets:AssetBank.exportData()};}
  /** @param index {number} 편집할 맵의 0부터 시작하는 번호. @returns {void} 현재 맵 보존 후 전환. */
  function switchMap(index){finishStroke();if(!Number.isInteger(index)||!maps[index])return;maps[activeMap]=map;activeMap=index;map=maps[index];selectedId=null;render();persist();}
  /** 매개변수 없음. @returns {void} 맵 선택 목록과 삭제 버튼 상태를 갱신. */
  function refreshMaps(){const select=panel.querySelector('#editor-map-select');select.replaceChildren();maps[activeMap]=map;maps.forEach((m,i)=>{const option=document.createElement('option');option.value=i;option.textContent=(i+1)+'. '+m.name;select.append(option);});select.value=activeMap;panel.querySelector('#map-delete').disabled=maps.length===1;}
  /** @param kind {string} add/copy/delete/up/down. @returns {void} 맵 개수/순서를 변경하고 실행 취소 기록. */
  function manageMap(kind){finishStroke();const before=snapshot();if((kind==='add'||kind==='copy')&&maps.length>=20){status('맵은 최대 20개입니다.',true);return;}
    if(kind==='delete'){if(maps.length===1)return;maps.splice(activeMap,1);activeMap=Math.min(activeMap,maps.length-1);}
    if(kind==='add'||kind==='copy'){const next=kind==='copy'?clone(map):ProjectData.unitMap(BlockMap.example());next.name=(kind==='copy'?map.name+' 복제':'새 맵 '+(maps.length+1)).slice(0,40);maps.splice(activeMap+1,0,next);activeMap++;}
    const to=kind==='up'?activeMap-1:kind==='down'?activeMap+1:activeMap;
    if(to>=0&&to<maps.length&&to!==activeMap){[maps[activeMap],maps[to]]=[maps[to],maps[activeMap]];activeMap=to;}
    map=maps[activeMap];selectedId=null;commit(before);status('맵 목록을 변경했습니다. 실행 취소로 되돌릴 수 있습니다.');}
  /** 매개변수 없음. @returns {boolean} 연속 테스트의 다음 맵으로 이동했다면 true. 마지막이면 false. */
  function advance(){if(testing&&stage<STAGES.length-1){startStage(stage+1);screen='play';dirty=true;return true;}return false;}

  createInterface();
  /** 매개변수 없음. @returns {void} 편집기를 열어 검증 오류를 볼 수 있게 한 뒤 전체 프로젝트를 플레이. */
  function playProject(){open();panel.querySelector('#editor-all-maps').checked=true;play();}
  return { open, play, playProject, load, advance, manageMap, switchMap, exportProject, getMap: () => clone(map) };
})();
