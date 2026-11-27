/* 읽기 2: createInterface → bindEvents → editCell/updateProperty → commit → play.
 * BlockMap은 데이터/판정, 이 파일은 편집 UI와 기존 게임 연결을 담당합니다.
 * 네트워크 요청이 없습니다. JSON 파일을 저장하면 다른 PC에서도 이어서 편집할 수 있습니다. */
const MapEditor = (() => {
  const labels = { asset:'에셋 장식', select:'선택', floor:'바닥', wall:'벽', hole:'구멍', sweeper:'왕복 장애물', crumble:'무너지는 바닥', checkpoint:'세이브 지점', start:'출발점', goal:'목표점', goalO:'O 방 (3×3)', goalX:'X 방 (3×3)', ...Object.fromEntries(Object.entries(BlockMap.presets).map(([id,preset]) => [id,preset.label])), erase:'지우개' };
  const colors = { asset:'#8f78ab', floor:'#c5965e', wall:'#a47448', hole:'#684c3c', sweeper:'#d77b50', crumble:'#ccab73', checkpoint:'#215e65', start:'#459caa', goal:'#d7ae4d', goalO:'#32665e', goalX:'#974c40' };
  const cellSize = 48, storageKey = 'onggi-editor-project';
  let maps = [ProjectData.unitMap(BlockMap.example())], activeMap = 0, map = maps[0], tool = 'floor', selectedId = null, undoStack = [], redoStack = [];
  let testing = false, originalStages = null, dragging = false, strokeBefore = null, lastCell = '';
  let panel, board, brush, message, properties, launchButton, undoButton, redoButton;
  // 편집기를 열 때 설정 파일을 읽지 못하면 예제 맵만 남습니다. 그 사실을 계속 보여 주고 내보내기 전에 한 번 더 확인합니다.
  let startupProblem = '', startupWarning = null;
  // 테스트 버튼을 누른 뒤 옹기를 고르는 중이면 {all:전체 맵 여부}. 출발하면 그 설정으로 테스트를 시작합니다.
  let choosing = null;

  /** @param value {object} JSON 호환 맵. @returns {object} 참조를 공유하지 않는 복사본. */
  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  /** @param text {string} 안내/오류 문구. @param error {boolean} 오류 색상 여부. @returns {void} live status만 갱신. */
  function status(text, error = false) {
    message.textContent = text;
    message.style.color = error ? '#a73528' : '#40583c';
  }

  /** 매개변수 없음. @returns {void} 메모리 수정 상태만 갱신. 저장은 프로젝트 백업/설정 파일 내보내기로 수행. */
  function markModified() {
    if(typeof StudioUI.invalidateAssetUndo==='function')StudioUI.invalidateAssetUndo();
    maps[activeMap]=map;SaveStatus.changed();
  }

  /** @param before {object} 수정 전 맵. @returns {void} 최대 80회 실행 취소 기록, 수정 상태 표시, 화면 갱신. */
  function commit(before) {
    if (JSON.stringify(before) === JSON.stringify(snapshot())) return;
    undoStack.push(before);
    if (undoStack.length > 80) undoStack.shift();
    redoStack = [];
    markModified();
    render();
  }

  /** @param undo {boolean} true=실행 취소, false=다시 실행. @returns {void} 문서와 선택 상태를 복원. */
  function history(undo) {
    const from = undo ? undoStack : redoStack, to = undo ? redoStack : undoStack;
    if (!from.length) return;
    to.push(snapshot()); restore(from.pop()); selectedId = null;
    markModified(); render(); status(undo ? '실행 취소했습니다.' : '다시 실행했습니다.');
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
      if (hit){map.blocks = map.blocks.filter(b => b.id !== hit.id);SaveStatus.changed();}
      selectedId = null;
    } else if (tool === 'select') {
      selectedId = hit?.id || null;
    } else {
      if (tool === 'asset' && !AssetBank.list().some(a=>a.id===AssetBank.selected()&&['image','model'].includes(a.kind))) { status('먼저 아래에서 이미지 또는 OBJ 에셋을 선택하세요.',true); return; }
      const preset = BlockMap.presets[tool] ? tool : undefined;
      const type = preset ? 'wall' : tool;
      if (map.blocks.some(b => b.type === type && b.preset === preset && b.x === point.x && b.z === point.z &&
          (!['goalO','goalX'].includes(type) || b.room))) return;
      if (map.blocks.length >= 500) { status('블록은 최대 500개까지 배치할 수 있습니다.', true); return; }
      const block = { id: `b-${Date.now()}-${Math.random().toString(36).slice(2,9)}`, type, ...point, w:1, d:1, rotation:0, period:5, amp:1, axis:'x' };
      if (['goalO','goalX'].includes(type)) {
        block.room = true;
        block.w = block.d = 3;
        if (point.x-1.5 < BlockMap.bounds.minX || point.x+1.5 > BlockMap.bounds.maxX ||
            point.z-1.5 < BlockMap.bounds.minZ || point.z+1.5 > BlockMap.bounds.maxZ) {
          status('방 중심을 가장자리에서 한 칸 안쪽에 놓으세요.', true);
          return;
        }
        if (map.blocks.some(b=>b.type!==type && ['goalO','goalX'].includes(b.type) &&
            Math.abs(b.x-block.x)<(b.w+3)/2 && Math.abs(b.z-block.z)<(b.d+3)/2)) {
          status('O 방과 X 방이 겹치지 않는 칸을 선택하세요.', true);
          return;
        }
      }
      if (BlockMap.uniqueTypes.includes(type)) map.blocks = map.blocks.filter(b => b.type !== type);
      if (preset) block.preset = preset;
      if(tool==='asset')block.assetId=AssetBank.selected();
      map.blocks.push(block); selectedId = block.id;SaveStatus.changed();
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
  function paintEarth(ctx,x,y,w,d,wall=false) {
    ctx.fillStyle=wall?colors.wall:colors.floor;
    ctx.fillRect(x,y,w,d);
    const points=Math.ceil(w*d/44);
    for (let i=0;i<points;i++) {
      const px=((i*71+Math.round(x)*13)%101)/101;
      const py=((i*37+Math.round(y)*7)%97)/97;
      ctx.fillStyle=i%3===0?'#6d4e4228':'#f5dcca30';
      ctx.fillRect(x+px*Math.max(0,w-1),y+py*Math.max(0,d-1),1,1);
    }
  }

  function render() {
    const ctx = board.getContext('2d');
    ctx.fillStyle = '#e8ebdf'; ctx.fillRect(0,0,board.width,board.height);
    const layer = b => b.type === 'floor' ? 0 : b.room ? 1 : 2;
    const sorted = [...map.blocks].sort((a,b) => layer(a)-layer(b));
    for (const b of sorted) {
      const r = BlockMap.rectangle(b), x = (r.x+9-r.w/2)*cellSize, y = (r.z+6-r.d/2)*cellSize;
      ctx.fillStyle = colors[b.type];
      const signX=(r.x+9)*cellSize, signY=(r.z+6)*cellSize;
      if (b.room) {
        paintEarth(ctx,x,y,r.w*cellSize,r.d*cellSize);
        for (const wall of BlockMap.roomWalls(b)) {
          paintEarth(ctx,(wall.x+9-wall.w/2)*cellSize,(wall.z+6-wall.d/2)*cellSize,
            wall.w*cellSize,wall.d*cellSize,true);
        }
      } else if (b.type === 'hole') {
        ctx.beginPath();ctx.arc((b.x+9)*cellSize,(b.z+6)*cellSize,Math.min(b.w,b.d)*cellSize/2,0,Math.PI*2);ctx.fill();
      } else {
        for (const part of BlockMap.parts(b)) {
          const px=(part.x+9-part.w/2)*cellSize+1, py=(part.z+6-part.d/2)*cellSize+1;
          const w=part.w*cellSize-2, d=part.d*cellSize-2;
          if (b.type==='wall') paintEarth(ctx,px,py,w,d,true);
          else if (b.type==='floor') paintEarth(ctx,px-1,py-1,w+2,d+2);
          else ctx.fillRect(px,py,w,d);
        }
      }
      const skin=AssetBank.image(AssetBank.skinId(b.type,b));
      if (b.room) {
        const half=BlockMap.quizPlate(b).w*cellSize/2;
        ctx.fillStyle='#af9f85';ctx.fillRect(signX-half,signY-half,half*2,half*2);
        ctx.fillStyle='#f1e7d4';ctx.fillRect(signX-half+2,signY-half+2,half*2-4,half*2-4);
        if (skin) ctx.drawImage(skin,signX-half+2,signY-half+2,half*2-4,half*2-4);
      } else if (skin && b.type !== 'hole') for (const part of BlockMap.parts(b)) {
        ctx.drawImage(skin,(part.x+9-part.w/2)*cellSize+1,(part.z+6-part.d/2)*cellSize+1,
          part.w*cellSize-2,part.d*cellSize-2);
      }
      if(b.type==='asset'){const image=AssetBank.image(b.assetId);if(image)ctx.drawImage(image,x+1,y+1,cellSize-2,cellSize-2);}
      ctx.fillStyle = b.room ? colors[b.type] : '#fff'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font='bold 15px sans-serif';
      if (b.type !== 'floor' && !b.preset) ctx.fillText({asset:'◆',wall:'벽',hole:'○',sweeper:'↔',crumble:'금',checkpoint:'저장',start:'S',goal:'G',goalO:'O',goalX:'X'}[b.type],signX,signY);
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
    const question = panel.querySelector('#editor-quiz-question');
    const answer = panel.querySelector('#editor-quiz-answer');
    question.value = map.quiz?.question || '';
    answer.value = map.quiz?.answer || 'O';
    renderProperties();
    if(typeof PageDesigner!=='undefined')PageDesigner.renderMini();
  }

  /** 매개변수 없음. @returns {void} 선택한 블록의 속성 폼 생성. 속성은 텍스트/DOM API로만 표시. */
  function renderProperties() {
    properties.replaceChildren();
    const block = map.blocks.find(b=>b.id===selectedId);
    if (!block) { properties.textContent='선택 도구로 블록을 누르면 위치(1칸)·회전을 수정할 수 있어요.'; return; }
    const title = document.createElement('strong');title.textContent=labels[block.preset || block.type];properties.append(title);
    for (const [key,label] of [['x','X 위치'],['z','Z 위치'],...(block.room || !['start','goal','goalO','goalX','checkpoint'].includes(block.type)?[['rotation',block.room?'입구 회전':'회전']]:[]),...(block.type==='sweeper'?[['period','왕복 주기(초)'],['amp','이동 반경'],['axis','왕복 축']]:[])]) {
      const row=document.createElement('label');row.textContent=label;
      let input;
      if(key==='rotation'||key==='axis') {
        input=document.createElement('select');
        for(const value of key==='rotation'?(block.room?[0,90,180,270]:[0,90]):['x','z']){const option=document.createElement('option');option.value=value;option.textContent=String(value);input.append(option);}
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
    for (const sf of st.surfaces || []) for (const m of [sf.floor, sf.walls, sf.pit, ...(sf.rims || []), ...(sf.pits || [])]) {
      deleteMesh(m);
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
    // 프로젝트를 읽는 동안 시작하면 이전 맵이 실행되므로 기다립니다.
    if(panel.inert){status('프로젝트를 불러오는 중입니다. 잠시 후 다시 눌러 주세요.',true);return;}
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
      rebuild(); PlayRecord.start(); startStage(0); screen='play';PageUI.enterStage(true);dirty=true;
      panel.hidden=true;launchButton.textContent='편집으로 돌아가기';clearInput();canvas.focus();
      const bgm=StudioUI.settings.bgmAssetId;
      if(bgm)AssetBank.playSound(bgm).catch(()=>notify('BGM을 재생하지 못했습니다. 미리 듣기로 오디오 파일을 확인하세요.',5));
    } catch(error) { status(error.message,true); }
  }

  /** 매개변수 없음. @returns {void} 편집기 표시. 테스트 중이면 원본 맵과 GPU 지형을 복원하고 입력/시간 누적을 초기화. */
  function open() {
    choosing=null;
    if(startupProblem){openEditor();status('설정 파일을 불러오지 못했습니다. 위의 경고를 확인하세요.',true);return;}
    openEditor();
    status('도구를 고르고 클릭·드래그로 배치하세요. 우클릭은 삭제입니다.');
  }

  /** 매개변수 없음. @returns {void} 편집 화면 표시. */
  function openEditor() {
    finishStroke();
    if(testing){AssetBank.stopSound();for(const st of STAGES)releaseGeometry(st);STAGES.splice(0,STAGES.length,...originalStages);stage=0;testing=false;rebuild();launchButton.textContent='편집 모드';}
    clearInput(); screen='editor';acc=0;last=0;
    panel.hidden=false;render();
  }

  /** 매개변수 없음. @returns {void} 현재 문서를 검증하고 JSON 다운로드. 브라우저가 저장 위치를 결정. */
  function download() {
    AssetBank.unlockEffects();
    finishStroke();if(typeof PageDesigner!=='undefined')PageDesigner.finishDrag();
    try {
      const valid=ProjectData.validate(exportProject()),url=URL.createObjectURL(new Blob([JSON.stringify(valid,null,2)],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download='onggi-project-v4.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      SaveStatus.backupRequested();
      void AssetBank.playEffect('projectSave');
      status('프로젝트 백업 다운로드를 요청했습니다. 다운로드된 파일을 확인하고 보관하세요.');
    }catch(error){SaveStatus.backupFailed(error.message);status(error.message,true);}
  }

  /** 매개변수 없음. @returns {Promise<boolean>} 사용자 요청 시에만 이전 초안을 읽음. 기존 데이터는 지우지 않음. */
  async function loadLegacyDraft(){try{const draft=localStorage.getItem(storageKey)||localStorage.getItem('onggi-studio-v4');if(!draft){status('이 브라우저에 이전 자동 저장 초안이 없습니다.');return false;}return await load({size:draft.length,text:async()=>draft});}catch(error){status('이전 초안을 읽지 못했습니다: '+error.message,true);return false;}}

  /** @param file {File} 사용자가 고른 JSON(최대 1MB). @returns {Promise<void>} 검증 후 원자적으로 교체. 실패하면 기존 문서 유지. */
  /** @param text {string} 실패 이유. 빈 문자열이면 해결됨. @returns {void} 시작 실패 경고를 표시하거나 숨김. */
  function setStartupProblem(text) {
    startupProblem = text;
    if (!startupWarning) return;
    startupWarning.hidden = !text;
    startupWarning.textContent = text ? '⚠ 설정 파일을 불러오지 못해 예제 맵으로 열렸습니다. (' + text + ') 이 상태로 설정 파일이나 release를 내보내면 팀 데이터가 예제 맵으로 덮어써집니다. 최신 편집기로 열었는지, editor/src/config의 파일이 올바른지 확인하세요.' : '';
  }

  /** @param file {File} 프로젝트 파일. @param options {object} startup:true면 편집기를 열 때 설정 파일을 읽는 경우. */
  async function load(file, { startup = false } = {}) {
    if(!file)return;
    panel.inert=true;
    try {
      if(file.size>100*1024*1024)throw Error('프로젝트 JSON은 100MB 이하여야 합니다.');
      const next=GameDocument.extractProject(await file.text());
      const nextUI=StudioUI.validate(next.ui);
      const prepared=await AssetBank.prepare(next.assets);
      AssetBank.applyPrepared(prepared);
      maps=next.maps;activeMap=0;map=maps[0];selectedId=null;undoStack=[];redoStack=[];
      StudioUI.apply(nextUI,{history:false});UIHistory.reset();StudioUI.refreshAssets();
      setStartupProblem('');markModified();SaveStatus.sourceLoaded();render();if(typeof PageDesigner!=='undefined')PageDesigner.refresh();status('프로젝트를 불러왔습니다. 맵·UI·에셋이 함께 복원되었습니다.'+(nextUI.skipped.length?' 이 편집기에 없는 설정 '+nextUI.skipped.length+'개는 건너뛰었습니다. 최신 편집기로 열면 모두 적용됩니다.':''));return true;
    }catch(error){status('불러오기 실패: '+error.message,true);if(startup)setStartupProblem(error.message);return false;}finally{panel.inert=false;}
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
    window.addEventListener('blur',()=>{finishStroke();if(typeof PageDesigner!=='undefined')PageDesigner.finishDrag();});
    window.addEventListener('keydown',e=>{
      if(panel.hidden||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;
      const workspace=typeof EditorShell!=='undefined'?EditorShell.workspace:'map';
      if(workspace!=='map'){
        if(workspace==='design'&&!document.getElementById('pane-ui').hidden){
          if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?UIHistory.redo():UIHistory.undo();}
          if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();UIHistory.redo();}
        }
        return;
      }
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
    panel.innerHTML=`<div class="editor-top"><h1>데굴데굴 옹기 <small>편집 모드</small></h1><label class="workspace-picker">작업 <select id="editor-workspace"><option value="map">맵 만들기</option><option value="design">꾸미기·물리</option><option value="team">설정 파일</option></select></label><div class="editor-primary"><button id="editor-play">▶ 테스트</button><details class="editor-menu"><summary>파일·배포</summary><div id="editor-file-menu"><button id="editor-save">프로젝트 백업</button><button id="editor-load">프로젝트 불러오기</button><input id="editor-file" type="file" accept=".json,.html,.htm,application/json,text/html" hidden><button id="editor-close">타이틀 미리보기</button><button id="editor-load-legacy">이전 자동 저장 불러오기</button></div></details></div></div><p id="editor-status" role="status" aria-live="polite"></p><div id="workspace-map" class="editor-grid"><aside><div id="editor-tools"></div><p class="editor-help">기본 블록 1×1 · O/X 방 3×3<br>왼쪽 위: X -9 / Z -6<br>파랑 S: 출발 · 금색 G: 목표<br><br>클릭·드래그: 배치<br>우클릭·지우개: 삭제<br>선택 → 오른쪽 속성 수정<br>Ctrl+Z: 실행 취소<br><br>O/X 방은 바닥과 벽이 함께 배치됩니다. 방을 선택해 입구를 돌리고, 입구까지 바닥 길을 연결하세요.</p></aside><div><canvas id="editor-board" width="816" height="576" aria-label="17열 12행 블록 편집 격자"></canvas><fieldset><legend>O/X 퀴즈</legend><label>문제 <input id="editor-quiz-question" maxlength="160"></label> <label>정답 <select id="editor-quiz-answer"><option>O</option><option>X</option></select></label></fieldset><p class="editor-help">회전은 0/90도. 구멍은 짧은 변을 지름으로 한 원형이며, 이동 장애물의 점선은 왕복 범위입니다. 자동 저장하지 않습니다. 종료·새로고침 전에 프로젝트 백업 또는 설정 파일 내보내기를 이용하세요.</p></div><aside id="editor-properties"></aside></div>`;
    const workflow=document.createElement('p');workflow.className='editor-workflow';
    workflow.textContent='01 맵 만들기  →  02 아래에서 외형·효과음·UI 설정  →  03 바로 테스트  →  04 release ZIP 내보내기';
    panel.append(workflow);
    document.body.append(panel);
    const mapsBar=document.createElement('div');mapsBar.className='editor-mapbar';mapsBar.id='editor-mapbar';
    mapsBar.innerHTML='<label>맵 <select id="editor-map-select" aria-label="편집할 맵"></select></label><input id="editor-map-name" aria-label="맵 이름" maxlength="40"><button id="editor-undo" aria-label="실행 취소" title="Ctrl+Z">↶</button><button id="editor-redo" aria-label="다시 실행" title="Ctrl+Y">↷</button><details class="editor-menu"><summary>맵 관리</summary><div><button id="map-add">맵 추가</button><button id="map-copy">맵 복제</button><button id="map-quiz">O/X 예제 추가</button><button id="map-delete">맵 삭제</button><button id="map-up">앞으로 이동</button><button id="map-down">뒤로 이동</button><button id="editor-example">예제 맵으로 교체</button><button id="editor-empty">전체 비우기</button><label><input id="editor-all-maps" type="checkbox" checked>모든 맵 연속 테스트</label></div></details>';

    panel.querySelector('.editor-top').after(mapsBar);
    startupWarning=document.createElement('p');startupWarning.id='editor-startup-warning';startupWarning.setAttribute('role','alert');startupWarning.hidden=true;
    startupWarning.style.cssText='margin:0 0 12px;padding:12px 14px;border:2px solid #a73528;border-radius:12px;background:#fbe9e4;color:#7d2418;font-weight:bold';
    panel.querySelector('.editor-top').after(startupWarning);
    board=panel.querySelector('#editor-board');brush=panel.querySelector('#editor-tools');message=panel.querySelector('#editor-status');properties=panel.querySelector('#editor-properties');undoButton=panel.querySelector('#editor-undo');redoButton=panel.querySelector('#editor-redo');
    for(const [id,label]of Object.entries(labels)){const button=document.createElement('button');button.textContent=label;button.dataset.tool=id;button.hidden=!['select','floor','erase'].includes(id);button.classList.toggle('active',tool===id);button.onclick=()=>{finishStroke();tool=id;const picker=panel.querySelector('#editor-tool-picker');if(picker)picker.value=tool;for(const b of brush.children)b.classList.toggle('active',b.dataset.tool===tool);};brush.append(button);}
    const toolPicker=document.createElement('select');toolPicker.id='editor-tool-picker';toolPicker.setAttribute('aria-label','배치할 블록');
    for(const [id,label]of Object.entries(labels)){const option=document.createElement('option');option.value=id;option.textContent=label;toolPicker.append(option);}toolPicker.value=tool;
    toolPicker.onchange=()=>{for(const button of brush.children)if(button.dataset.tool===toolPicker.value)button.click();};brush.append(toolPicker);
    let draft=null; // 브라우저 초안은 자동 복원하지 않습니다.
    // 설정 파일 형식이 틀리면 여기서도 실패하므로, 편집기 전체가 멈추지 않게 경고로 남깁니다.
    if(!draft&&typeof TEAM_UI_SOURCE!=='undefined'){try{draft=JSON.stringify(TeamSource.fromScripts());}catch(error){setStartupProblem(error.message);}}
    if(!draft&&typeof EDITOR_INITIAL_PROJECT!=='undefined')draft=JSON.stringify(EDITOR_INITIAL_PROJECT);
    if(draft)queueMicrotask(()=>load({size:draft.length,text:async()=>draft},{startup:true}));
    const name=panel.querySelector('#editor-map-name');name.value=map.name;name.onchange=()=>{const before=snapshot();map.name=name.value.trim()||'내가 만든 맵';commit(before);};
    const question = panel.querySelector('#editor-quiz-question');
    const answer = panel.querySelector('#editor-quiz-answer');
    question.onchange = answer.onchange = () => {
      const before = snapshot();
      const text = question.value.trim();
      if (text || map.blocks.some(b => ['goalO','goalX'].includes(b.type))) {
        map.quiz = { question: text, answer: answer.value };
      } else delete map.quiz;
      commit(before);
    };
    panel.querySelector('#editor-play').onclick=()=>chooseThenPlay();
    panel.querySelector('#editor-close').onclick=()=>{finishStroke();panel.hidden=true;screen='title';clearInput();dirty=true;canvas.focus();};
    panel.querySelector('#editor-save').onclick=download;
    panel.querySelector('#editor-load-legacy').onclick=loadLegacyDraft;
    const input=panel.querySelector('#editor-file');panel.querySelector('#editor-load').onclick=()=>input.click();input.onchange=()=>{load(input.files[0]);input.value='';};
    undoButton.onclick=()=>history(true);redoButton.onclick=()=>history(false);
    for(const [id,make]of [['editor-example',BlockMap.example],['editor-empty',()=>({version:1,name:'새 블록 맵',blocks:[]})]])panel.querySelector('#'+id).onclick=()=>{finishStroke();const before=snapshot();map=ProjectData.unitMap(make());selectedId=null;commit(before);name.value=map.name;status('맵을 변경했습니다. 실행 취소로 되돌릴 수 있어요.');};
    mapsBar.querySelector('#editor-map-select').onchange=e=>switchMap(Number(e.target.value));
    for(const [id,kind]of [['map-add','add'],['map-copy','copy'],['map-quiz','quiz'],['map-delete','delete'],['map-up','up'],['map-down','down']])mapsBar.querySelector('#'+id).onclick=()=>manageMap(kind);
    const hint=document.createElement('p');hint.className='editor-help';hint.textContent='JSON은 특정 폴더에 넣을 필요가 없습니다. 다운로드/문서 등 원하는 곳에 보관하고 위의 불러오기에서 선택하세요. 전체 맵·UI·에셋을 한 파일로 저장합니다.';panel.append(hint);
    const studio=document.createElement('section');studio.id='studio-design';panel.append(studio);
    StudioUI.mount(studio,()=>{markModified();render();},id=>{AssetBank.select(id);tool='asset';panel.querySelector('#editor-tool-picker').value='asset';for(const b of brush.children)b.classList.toggle('active',b.dataset.tool===tool);status('이미지/모델 배치 도구가 선택되었습니다. 바닥 위의 칸을 누르세요.');});
    SaveStatus.mount(panel);bindEvents();render();
  }

  /** 매개변수 없음. @returns {object} 모든 맵과 현재 편집 번호의 복사본. undo용으로 에셋 바이너리는 복사하지 않음. */
  function snapshot(){maps[activeMap]=map;return clone({maps,activeMap});}
  /** @param state {object} snapshot 결과. @returns {void} 맵 집합과 현재 선택 복원. */
  function restore(state){maps=state.maps;activeMap=state.activeMap;map=maps[activeMap];}
  /** 매개변수 없음. @returns {object} 전체 맵·UI·에셋을 담은 재사용 가능한 v4 프로젝트. */
  function exportProject(){maps[activeMap]=map;return {kind:'onggi-project',version:4,maps:clone(maps),ui:StudioUI.exportData(),assets:AssetBank.exportData()};}
  /** @param index {number} 편집할 맵의 0부터 시작하는 번호. @returns {void} 현재 맵 보존 후 전환. */
  function switchMap(index){finishStroke();if(!Number.isInteger(index)||!maps[index])return;maps[activeMap]=map;activeMap=index;map=maps[index];selectedId=null;render();}
  /** 매개변수 없음. @returns {void} 맵 선택 목록과 삭제 버튼 상태를 갱신. */
  function refreshMaps(){const select=panel.querySelector('#editor-map-select');select.replaceChildren();maps[activeMap]=map;maps.forEach((m,i)=>{const option=document.createElement('option');option.value=i;option.textContent=(i+1)+'. '+m.name;select.append(option);});select.value=activeMap;panel.querySelector('#map-delete').disabled=maps.length===1;}
  /** @param kind {string} add/copy/delete/up/down. @returns {void} 맵 개수/순서를 변경하고 실행 취소 기록. */
  function manageMap(kind){finishStroke();const before=snapshot();if(['add','copy','quiz'].includes(kind)&&maps.length>=20){status('맵은 최대 20개입니다.',true);return;}
    if(kind==='delete'){if(maps.length===1)return;maps.splice(activeMap,1);activeMap=Math.min(activeMap,maps.length-1);}
    if(kind==='add'||kind==='copy'){const next=kind==='copy'?clone(map):ProjectData.unitMap(BlockMap.example());next.name=(kind==='copy'?map.name+' 복제':'새 맵 '+(maps.length+1)).slice(0,40);maps.splice(activeMap+1,0,next);activeMap++;}
    if (kind==='quiz') {
      maps.splice(activeMap+1,0,BlockMap.quizExample());
      activeMap++;
      panel.querySelector('#editor-all-maps').checked=false;
    }
    const to=kind==='up'?activeMap-1:kind==='down'?activeMap+1:activeMap;
    if(to>=0&&to<maps.length&&to!==activeMap){[maps[activeMap],maps[to]]=[maps[to],maps[activeMap]];activeMap=to;}
    map=maps[activeMap];selectedId=null;commit(before);status('맵 목록을 변경했습니다. 실행 취소로 되돌릴 수 있습니다.');}
  /** 매개변수 없음. @returns {boolean} 연속 테스트의 다음 맵으로 이동했다면 true. 마지막이면 false. */
  function advance(){if(testing&&stage<STAGES.length-1){startStage(stage+1);screen='play';PageUI.enterStage(false);dirty=true;return true;}return false;}

  createInterface();
  /** 매개변수 없음. @returns {void} 편집기를 열어 검증 오류를 볼 수 있게 한 뒤 전체 프로젝트를 플레이. */
  function playProject(){
    // 테스트 버튼으로 옹기를 고르던 중이면, 고른 옹기와 처음 정한 맵 범위로 시작합니다.
    const all=choosing?choosing.all:true;
    open();panel.querySelector('#editor-all-maps').checked=all;play();
  }
  /** @param all {boolean|undefined} 전체 맵 테스트 여부. 생략하면 편집기의 "전체 맵" 체크를 따름.
   * @returns {void} 맵 오류를 먼저 검사한 뒤 옹기 선택 화면을 엽니다. 옹기를 고르고 출발하면 테스트가 시작됩니다. */
  function chooseThenPlay(all){
    AssetBank.unlockEffects();finishStroke();
    if(panel.inert){status('프로젝트를 불러오는 중입니다. 잠시 후 다시 눌러 주세요.',true);return;}
    const allMaps=all??panel.querySelector('#editor-all-maps').checked;
    maps[activeMap]=map;
    try{(allMaps?maps:[map]).forEach((m,i)=>{try{BlockMap.compile(m,OnggiPhysics.maxRadius(StudioUI.settings.onggiPhysics));}catch(e){throw Error((i+1)+'번 맵: '+e.message);}});}
    catch(error){status(error.message,true);return;}
    choosing={all:allMaps};
    panel.hidden=true;launchButton.textContent='편집으로 돌아가기';
    clearInput();screen='select';dirty=true;canvas.focus();
  }
  /** @param id {string} 블록 ID. @returns {object|null} 에셋 화면에서 선택해도 본 격자와 같은 선택/속성을 사용. */
  function selectBlock(id){finishStroke();selectedId=map.blocks.some(b=>b.id===id)?id:null;render();return getSelected();}
  /** 매개변수 없음. @returns {object|null} 선택 블록 복사본. */
  function getSelected(){const b=map.blocks.find(b=>b.id===selectedId);return b?clone(b):null;}
  /** 매개변수 없음. @returns {object[]} 맵 이름 목록. 에셋과 전체 프로젝트를 복사하지 않는 화면 갱신용 API. */
  function listMaps(){return maps.map((m,i)=>({name:i===activeMap?map.name:m.name}));}
  /** @param what {string} 내보낼 대상 이름. @returns {boolean} 내보내도 되면 true. 시작 실패 상태면 첫 번째 시도는 막고 경고합니다. */
  let exportArmed='';
  function confirmExport(what){if(!startupProblem||exportArmed===what)return true;exportArmed=what;status('지금은 설정 파일을 읽지 못해 예제 맵 상태입니다. 그래도 '+what+'을(를) 내보내려면 한 번 더 누르세요.',true);return false;}
  return {chooseThenPlay,isChoosing:()=>Boolean(choosing),confirmExport,startupProblem:()=>startupProblem,listMaps, selectBlock,getSelected,setSelectedSkin:id=>updateProperty('skinAssetId',id),getActiveMap:()=>activeMap,open, play, playProject, load, advance, manageMap, switchMap, exportProject, getMap: () => clone(map) };
})();
