/* 담당: UI / 유리. 페이지 단위 시각 편집기와 에셋 화면의 작은 맵.
 * 읽기: mount → refresh → drawPreview → select/drag → updateElement → StudioUI.save.
 * 저장 데이터는 pageDesign 한 필드이며 UIConfig.js/프로젝트/릴리스에 함께 포함됩니다. */
const PageDesigner = (() => {
  let host,canvas,mini,pageId='drawTitle',selectedId='',stageIndex=0,dialogueIndex=0,drag=null,rendering=false;
  const names=UIPageData.screens;
  const state={drawTitle:'title',drawSelect:'select',drawGuide:'guide',drawPlay:'play',drawFinish:'finish',drawStory:'story',drawMonologue:'monologue'};
  const labels={floor:'바닥',wall:'벽',hole:'구멍',sweeper:'왕복 장애물',crumble:'무너지는 바닥',checkpoint:'체크포인트',start:'출발',goal:'도착',asset:'장식'};
  /** 매개변수 없음. @returns {object} 변경용 깊은 설정 복사본. */
  function data(){return UIPageData.validate(StudioUI.settings.pageDesign||{});}
  /** @param d {object} 페이지 설정 전체. @param save {boolean} 파일 초안에 저장 여부. @returns {void} 검증 후 게임·미리보기 갱신. */
  function apply(d,save=true){StudioUI.apply({...StudioUI.exportData(),pageDesign:d},{refreshLegacy:false});if(save){StudioUI.save();refresh();}else drawPreview();}
  /** @param d {object} 편집 데이터. @returns {object} 선택한 페이지의 변경 가능한 설정. */
  function current(d){if(names[pageId])return d.pages[pageId]||(d.pages[pageId]={elements:{},extras:[],enabled:true});return d.extraPages.find(p=>p.id===pageId);}
  /** @param change {object} 요소 변경값. @param save {boolean} 즉시 저장 여부. @returns {void} 선택 요소 하나만 수정. */
  function updateElement(change,save=true){if(!selectedId)return;const d=data(),p=current(d);if(selectedId.startsWith('extra:')){const e=p.extras.find(e=>e.id===selectedId.slice(6));if(e)Object.assign(e,change);}else p.elements[selectedId]={...(p.elements[selectedId]||{}),...change};apply(d,save);}
  /** 매개변수 없음. @returns {void} 페이지 목록·색·요소 목록을 현재 페이지로 제한. */
  function refresh(){if(!host)return;const d=data(),picker=host.querySelector('#designer-page');picker.replaceChildren();
    for(const [id,name]of Object.entries(names)){const o=document.createElement('option');o.value=id;o.textContent=name+(d.pages[id]?.enabled===false?' (사용 안 함)':'');picker.append(o);}
    for(const p of d.extraPages){const o=document.createElement('option');o.value=p.id;o.textContent='추가 · '+(p.name||'새 페이지');picker.append(o);}
    if(!names[pageId]&&!d.extraPages.some(p=>p.id===pageId))pageId='drawTitle';picker.value=pageId;
    host.querySelector('#designer-font').value=StudioUI.settings.fontFamily;host.querySelector('#designer-font-scale').value=StudioUI.settings.fontScale;
    const p=current(d);host.querySelector('#designer-name').value=p.name||names[pageId]||'';
    for(const [key,id,fallback]of [['background','page-background','#f5efdf'],['textColor','page-text-color','#294732']]){host.querySelector('#'+id+'-enabled').checked=Boolean(p[key]);host.querySelector('#'+id).value=p[key]||fallback;}
    drawPreview();refreshDialogue();renderMini();
  }
  /** 매개변수 없음. @returns {void} 실제 drawUI 출력과 실제 요소 경계를 미리보기로 표시. 게임 상태는 finally에서 복구. */
  function drawPreview(){if(!canvas||rendering)return;rendering=true;
    const old={screen,buttons,portrait,stage,dialoguePage,dialogueTime,storyIndex},oldLength=STAGES.length;
    const oldStage=STAGES[stageIndex],oldLines=STAGE_MONOLOGUES[stageIndex];
    try {
      screen=state[pageId]||'custom-ui';portrait=false;
      if(pageId==='drawMonologue'){
        stage=stageIndex;const maps=MapEditor.listMaps();
        STAGES[stage]={...(oldStage||STAGES[0]),name:maps[stage]?.name||'맵'};
        if(!STAGE_MONOLOGUES[stage]?.length)STAGE_MONOLOGUES[stage]=[['독백을 추가하세요.']];
        dialoguePage=Math.min(dialogueIndex,STAGE_MONOLOGUES[stage].length-1);dialogueTime=10000;
      }
      PageUI.setPreview(pageId);drawUI();
      const context=canvas.getContext('2d');context.fillStyle='#e5e9df';context.fillRect(0,0,800,500);context.drawImage(ui,0,0,800,500);
      const items=PageUI.elements,picker=host.querySelector('#designer-element');picker.replaceChildren();
      if(!items.some(e=>e.id===selectedId))selectedId='';
      const empty=document.createElement('option');empty.value='';empty.textContent='미리보기에서 글자·버튼을 클릭하세요';picker.append(empty);
      for(const item of items){const o=document.createElement('option');o.value=item.id;o.textContent=(item.hidden?'숨김 · ':'')+({text:'글자',button:'버튼',shape:'배경 상자',image:'UI 이미지'}[item.type])+' · '+String(item.text||item.id).slice(0,38);picker.append(o);}picker.value=selectedId;
      const item=items.find(e=>e.id===selectedId);if(item){let x=item.x,y=item.y;if(item.type==='text'){x-=item.align==='center'?item.width/2:item.align==='right'?item.width:0;y-=(item.size||24)*.65;}context.strokeStyle='#2875ce';context.lineWidth=2;context.strokeRect(x/2-2,y/2-2,item.width/2+4,item.height/2+4);}
      refreshInspector(item);
    } finally {PageUI.setPreview('');screen=old.screen;buttons=old.buttons;portrait=old.portrait;stage=old.stage;dialoguePage=old.dialoguePage;dialogueTime=old.dialogueTime;storyIndex=old.storyIndex;if(oldStage)STAGES[stageIndex]=oldStage;else delete STAGES[stageIndex];STAGES.length=oldLength;STAGE_MONOLOGUES[stageIndex]=oldLines;dirty=true;rendering=false;}
  }
  /** @param item {object|undefined} 선택 요소. @returns {void} 해당 글자/버튼의 문구·좌표·색만 편집. */
  function refreshInspector(item){const fields=host.querySelector('#designer-inspector');fields.hidden=!item;if(!item)return;
    host.querySelector('#designer-text').value=item.text||'';host.querySelector('#designer-text-row').hidden=!['text','button'].includes(item.type);
    for(const [key,id,fallback]of [['x','element-x',0],['y','element-y',0],['size','element-size',24],['width','element-width',300],['height','element-height',70]])host.querySelector('#'+id).value=Math.round(item[key]??fallback);
    host.querySelector('#element-color').value=/^#[0-9a-f]{6}$/i.test(item.color||'')?item.color:'#294732';host.querySelector('#element-background').value=/^#[0-9a-f]{6}$/i.test(item.background||'')?item.background:'#e0e9d9';
    host.querySelector('#element-action').value=item.action||'title';host.querySelector('#element-action').disabled=item.type!=='button';host.querySelector('#element-align').value=item.align||'left';host.querySelector('#element-visible').checked=!item.hidden;
  }
  /** @param event {PointerEvent} 미리보기 포인터. @returns {{x:number,y:number}} 1600×1000 논리 좌표. */
  function point(event){const r=canvas.getBoundingClientRect();return {x:(event.clientX-r.left)/r.width*1600,y:(event.clientY-r.top)/r.height*1000};}
  /** @param op {string} add/delete/reset. @returns {void} 소개 페이지 추가/삭제 또는 기본 페이지 설정 복원. */
  function managePage(op){const d=data();if(op==='add'){const id='page-'+Date.now()+'-'+Math.random().toString(36).slice(2,6);d.extraPages.push({id,name:'새 소개 페이지',enabled:true,background:'#f5efdf',elements:{},extras:[{id:'heading',type:'text',text:'새 페이지',x:180,y:240,size:48,color:'#294732',width:900,height:90}]});pageId=id;}
    if(op==='delete'){if(['drawTitle','drawPlay','drawFinish'].includes(pageId)){notice('시작·게임·결과는 필수 화면입니다. 요소를 숨기거나 추가 페이지를 삭제하세요.');return;}if(names[pageId]){current(d).enabled=false;}else{d.extraPages=d.extraPages.filter(p=>p.id!==pageId);pageId='drawTitle';}}
    if(op==='reset'){if(names[pageId])delete d.pages[pageId];else{const p=current(d);p.elements={};p.enabled=true;}}
    selectedId='';try{apply(d);}catch(e){notice(e.message);}
  }
  /** @param type {string} text/button/shape. @returns {void} 현재 페이지에 드래그 가능한 요소 추가. */
  function addElement(type){const d=data(),p=current(d),id='item-'+Date.now()+'-'+Math.random().toString(36).slice(2,6);p.extras.push({id,type,x:180,y:400,width:320,height:75,size:30,text:type==='button'?'버튼':'새 글자',color:'#294732',background:'#dfe8d8',action:'title',align:'left'});selectedId='extra:'+id;try{apply(d);}catch(e){notice(e.message);}}
  /** 매개변수 없음. @returns {void} 선택 맵에 속한 독백 페이지와 화자·내용만 표시. */
  function refreshDialogue(){const mapSelect=host.querySelector('#dialogue-map'),maps=MapEditor.listMaps();mapSelect.replaceChildren();maps.forEach((m,i)=>{const o=document.createElement('option');o.value=i;o.textContent=(i+1)+'. '+m.name;mapSelect.append(o);});stageIndex=Math.min(stageIndex,maps.length-1);mapSelect.value=stageIndex;
    const d=data(),list=d.dialogues[stageIndex]??(STAGE_MONOLOGUES[stageIndex]||[]).map(lines=>({speaker:'',text:lines.join('\n')}));const select=host.querySelector('#dialogue-page');select.replaceChildren();
    list.forEach((p,i)=>{const o=document.createElement('option');o.value=i;o.textContent=(i+1)+'. '+(p.text.slice(0,26)||'빈 독백');select.append(o);});dialogueIndex=Math.max(0,Math.min(dialogueIndex,list.length-1));select.value=dialogueIndex;
    host.querySelector('#dialogue-speaker').value=list[dialogueIndex]?.speaker||'';host.querySelector('#dialogue-text').value=list[dialogueIndex]?.text||'';host.querySelector('#dialogue-editor').hidden=!list.length;
  }
  /** @param op {string} add/delete/edit. @returns {void} 독백 변경. 빈 목록이면 해당 맵 독백을 건너뜀. */
  function editDialogue(op){const d=data();const list=d.dialogues[stageIndex]??(STAGE_MONOLOGUES[stageIndex]||[]).map(lines=>({speaker:'',text:lines.join('\n')}));d.dialogues[stageIndex]=list;
    if(op==='add'){list.push({speaker:'',text:'새 독백을 입력하세요.'});dialogueIndex=list.length-1;}
    if(op==='delete'){list.splice(dialogueIndex,1);dialogueIndex=Math.max(0,dialogueIndex-1);}
    if(op==='edit'&&list[dialogueIndex])list[dialogueIndex]={speaker:host.querySelector('#dialogue-speaker').value,text:host.querySelector('#dialogue-text').value};
    try{apply(d);}catch(e){notice(e.message);}
  }
  /** @param message {string} 안내. @returns {void} 편집기 내 상태 표시. */
  function notice(message){host.querySelector('#designer-status').textContent=message;}
  /** 매개변수 없음. @returns {void} 에셋 화면의 격자·선택 블록·개별 외형을 동기화. */
  function renderMini(){if(!mini)return;const context=mini.getContext('2d'),map=MapEditor.getMap(),selected=MapEditor.getSelected();context.fillStyle='#e8ebdf';context.fillRect(0,0,408,288);
    for(const b of [...map.blocks].sort((a,b)=>(b.type==='floor')-(a.type==='floor'))){const x=(b.x+9-.5)*24,y=(b.z+6-.5)*24;context.fillStyle={floor:'#b69a70',wall:'#52694d',hole:'#684c3c',sweeper:'#d77b50',crumble:'#ccab73',checkpoint:'#8aa575',start:'#459caa',goal:'#d7ae4d',asset:'#8f78ab'}[b.type];context.fillRect(x+1,y+1,22,22);const image=AssetBank.image(AssetBank.skinId(b.type,b)||b.assetId);if(image&&b.type!=='hole')context.drawImage(image,x+1,y+1,22,22);if(b.id===selected?.id){context.strokeStyle='#2875ce';context.lineWidth=2;context.strokeRect(x+1,y+1,22,22);}}
    const maps=MapEditor.listMaps(),selector=document.getElementById('mini-map-choice');selector.replaceChildren();maps.forEach((m,i)=>{const o=document.createElement('option');o.value=i;o.textContent=(i+1)+'. '+m.name;selector.append(o);});selector.value=MapEditor.getActiveMap();
    const field=document.getElementById('mini-skin'),title=document.getElementById('mini-selected');field.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='종류 기본값 따르기';field.append(empty);field.disabled=!selected||selected.type==='asset';title.textContent=selected?(labels[selected.type]||selected.type)+' · X '+selected.x+' / Z '+selected.z:'격자에서 블록을 선택하세요.';
    if(selected)for(const a of AssetBank.list()){if(!(['floor','hole'].includes(selected.type)?['image']:['image','model']).includes(a.kind))continue;const o=document.createElement('option');o.value=a.id;o.textContent=a.name;field.append(o);}field.value=selected?.skinAssetId||'';
  }
  /** 매개변수 없음. @returns {void} 새 페이지 편집 UI와 작은 격자 이벤트 구성. */
  function mount(){const pane=document.getElementById('pane-ui');for(const child of Array.from(pane.children))child.hidden=true;
    host=document.createElement('section');host.id='page-designer';host.innerHTML='<div class="page-toolbar"><label>페이지 <select id="designer-page"></select></label><label>페이지 이름 <input id="designer-name" maxlength="60"></label><details><summary>페이지 관리</summary><button id="page-add">소개 페이지 추가</button><button id="page-delete">선택 페이지 삭제</button><button id="page-reset">설정 복원 / 다시 사용</button></details></div><p>현재 페이지의 글자·버튼만 표시합니다. 미리보기에서 클릭해 선택하고 드래그하세요. 추가 소개 페이지는 첫 맵 전에 순서대로 표시됩니다.</p><details><summary>공통 글꼴</summary><label>글꼴 이름<input id="designer-font"></label><label>글자 전체 배율<input id="designer-font-scale" type="number" min="0.5" max="2" step="0.1"></label><p>로컬 폰트 파일은 에셋 탭에서 추가해 게임 폰트로 적용할 수 있습니다.</p></details><div class="page-colors"><label><input id="page-background-enabled" type="checkbox">배경색 사용 <input id="page-background" type="color"></label><label><input id="page-text-color-enabled" type="checkbox">페이지 글자색 사용 <input id="page-text-color" type="color"></label></div><div class="page-designer-grid"><canvas id="page-preview" width="800" height="500"></canvas><aside><label>현재 페이지 요소 <select id="designer-element"></select></label><div id="designer-inspector" hidden><label id="designer-text-row">선택 문구<textarea id="designer-text" rows="3" maxlength="500"></textarea></label><div class="designer-numbers"><label>X<input id="element-x" type="number"></label><label>Y<input id="element-y" type="number"></label><label>글자 크기<input id="element-size" type="number" min="8" max="160"></label><label>너비<input id="element-width" type="number" min="1"></label><label>높이<input id="element-height" type="number" min="1"></label></div><label>글자색<input id="element-color" type="color"></label><label>상자·버튼색<input id="element-background" type="color"></label><label>버튼 동작<select id="element-action"><option value="title">시작 화면</option><option value="select">옹기 선택</option><option value="guide">설명 화면</option><option value="start">게임 시작</option><option value="replay">다시 시작</option><option value="page-next">다음 소개 페이지</option></select></label><label>정렬<select id="element-align"><option value="left">왼쪽</option><option value="center">가운데</option><option value="right">오른쪽</option></select></label><label><input id="element-visible" type="checkbox">표시</label><button id="element-delete">선택 요소 삭제</button></div><label>요소 추가<select id="designer-add-type"><option value="text">글자</option><option value="button">버튼</option><option value="shape">배경 상자</option></select></label><button id="element-add">추가</button></aside></div><details class="dialogue-settings"><summary>캐릭터 독백 · 맵별 페이지</summary><div class="page-toolbar"><label>맵<select id="dialogue-map"></select></label><label>독백 페이지<select id="dialogue-page"></select></label><button id="dialogue-add">독백 추가</button><button id="dialogue-delete">독백 삭제</button></div><div id="dialogue-editor"><label>화자 (비우면 선택 옹기 이름)<input id="dialogue-speaker" maxlength="60"></label><label>독백 내용<textarea id="dialogue-text" rows="4" maxlength="1000"></textarea></label></div><p>추가·수정한 독백은 해당 맵 시작에 표시됩니다. 모두 삭제하면 건너뜁니다. 독백 화면 배치는 위에서 캐릭터 독백 페이지를 선택하세요.</p></details><p id="designer-status" role="status">페이지별 변경 내용은 프로젝트와 유리 담당 UIConfig.js에 저장됩니다.</p>';pane.append(host);canvas=host.querySelector('#page-preview');canvas.tabIndex=0;
    for(const [id,key]of [['designer-font','fontFamily'],['designer-font-scale','fontScale']])host.querySelector('#'+id).onchange=e=>{try{StudioUI.apply({...StudioUI.exportData(),[key]:key==='fontScale'?Number(e.target.value):e.target.value},{refreshLegacy:false});StudioUI.save();refresh();}catch(error){notice(error.message);}};
    host.querySelector('#designer-page').onchange=e=>{pageId=e.target.value;selectedId='';refresh();};host.querySelector('#designer-name').onchange=e=>{const d=data();current(d).name=e.target.value;apply(d);};
    for(const [id,op]of [['page-add','add'],['page-delete','delete'],['page-reset','reset']])host.querySelector('#'+id).onclick=()=>managePage(op);
    for(const [key,id]of [['background','page-background'],['textColor','page-text-color']])for(const suffix of ['','-enabled'])host.querySelector('#'+id+suffix).onchange=()=>{const d=data(),p=current(d);if(host.querySelector('#'+id+'-enabled').checked)p[key]=host.querySelector('#'+id).value;else delete p[key];apply(d);};
    host.querySelector('#designer-element').onchange=e=>{selectedId=e.target.value;drawPreview();};
    host.querySelector('#designer-text').onchange=e=>updateElement({text:e.target.value});
    for(const [key,id]of [['x','element-x'],['y','element-y'],['size','element-size'],['width','element-width'],['height','element-height']])host.querySelector('#'+id).onchange=e=>{try{updateElement({[key]:Number(e.target.value)});}catch(error){notice(error.message);refresh();}};
    for(const [key,id]of [['color','element-color'],['background','element-background'],['align','element-align'],['action','element-action']])host.querySelector('#'+id).onchange=e=>updateElement({[key]:e.target.value});
    host.querySelector('#element-visible').onchange=e=>updateElement({hidden:!e.target.checked});host.querySelector('#element-delete').onclick=()=>{if(selectedId==='button:page-next'){notice('소개 페이지의 다음 버튼은 진행을 위해 유지됩니다. 위치와 색은 바꿀 수 있습니다.');return;}const d=data(),p=current(d);if(selectedId.startsWith('extra:'))p.extras=p.extras.filter(e=>e.id!==selectedId.slice(6));else p.elements[selectedId]={...(p.elements[selectedId]||{}),hidden:true};selectedId='';apply(d);};host.querySelector('#element-add').onclick=()=>addElement(host.querySelector('#designer-add-type').value||'text');
    canvas.addEventListener('pointerdown',event=>{if(event.button!==undefined&&event.button!==0)return;finishDrag();canvas.focus();const q=point(event),item=PageUI.hit(q.x,q.y);selectedId=item?.id||'';drag=item?{x:q.x,y:q.y,oldX:item.x,oldY:item.y}:null;if(drag)UIHistory.begin();canvas.setPointerCapture(event.pointerId);drawPreview();});
    canvas.addEventListener('pointermove',event=>{if(!drag)return;const q=point(event);updateElement({x:Math.round(drag.oldX+q.x-drag.x),y:Math.round(drag.oldY+q.y-drag.y)},false);});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,finishDrag);
    host.querySelector('#dialogue-map').onchange=e=>{stageIndex=Number(e.target.value);dialogueIndex=0;refresh();};host.querySelector('#dialogue-page').onchange=e=>{dialogueIndex=Number(e.target.value);refresh();};for(const [id,op]of [['dialogue-add','add'],['dialogue-delete','delete']])host.querySelector('#'+id).onclick=()=>editDialogue(op);for(const id of ['dialogue-speaker','dialogue-text'])host.querySelector('#'+id).onchange=()=>editDialogue('edit');
    const card=document.createElement('section');card.className='mini-map-card';card.innerHTML='<h3>한 블록만 외형 바꾸기</h3><label>맵<select id="mini-map-choice"></select></label><label>선택 층<select id="mini-layer"><option value="top">위쪽 블록</option><option value="floor">바닥</option></select></label><canvas id="asset-mini-map" width="408" height="288"></canvas><p id="mini-selected"></p><label>선택 블록의 개별 외형<select id="mini-skin"></select></label><p>작은 격자를 누른 뒤 외형을 선택하면 바로 적용됩니다. 맵 편집 화면의 선택과 동일하게 연결됩니다.</p>';document.getElementById('pane-assets').append(card);mini=document.getElementById('asset-mini-map');document.getElementById('mini-map-choice').onchange=e=>{MapEditor.switchMap(Number(e.target.value));renderMini();};document.getElementById('mini-skin').onchange=e=>MapEditor.setSelectedSkin(e.target.value);
    mini.addEventListener('pointerdown',event=>{const r=mini.getBoundingClientRect(),x=Math.floor((event.clientX-r.left)/r.width*17)-8.5,z=Math.floor((event.clientY-r.top)/r.height*12)-5.5;const list=MapEditor.getMap().blocks.filter(b=>b.x===x&&b.z===z);const chosen=document.getElementById('mini-layer').value==='floor'?list.find(b=>b.type==='floor'):[...list].reverse().find(b=>b.type!=='floor')||list[0];MapEditor.selectBlock(chosen?.id||'');renderMini();});
    UIHistory.mount(host);
    document.getElementById('tab-ui').addEventListener('click',refresh);
    refresh();
  }
  /** 매개변수 없음. @returns {void} 드래그를 한 개의 기록으로 확정하고 자동 저장. 포인터 취소/창 전환에도 사용. */
  function finishDrag(){if(!drag)return;drag=null;UIHistory.end();StudioUI.save();refresh();}
  mount();return {finishDrag,refresh,drawPreview,renderMini,managePage,addElement,editDialogue,updateElement,get page(){return pageId;},get selection(){return selectedId;}};
})();
