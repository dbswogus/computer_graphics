/* 읽기: validate → apply → mount → preview. UI_LAYOUT를 직접 수정하므로 실제 버튼 판정도 같이 바뀝니다. */
const StudioUI = (() => {
  const defaults={fontFamily:'sans-serif',fontScale:1,imageAssetId:'',imageX:1100,imageY:300,imageW:200,imageH:200,bgmAssetId:'',floorAssetId:'',onggiAssets:{},onggiPhysics:{},pageDesign:{},texts:{},onggiTexts:{}};
  let settings={...defaults}, host, scene='drawTitle', element='',textKey=Object.keys(UI_TEXT)[0],physicsId='0', previewCanvas, propertyBox, saved=()=>{}, chooseAsset=()=>{};
  const screens={drawTitle:'시작',drawSelect:'옹기 선택',drawGuide:'설명',drawPlay:'게임 중',drawFinish:'결과',drawStory:'도입 이야기',drawMonologue:'스테이지 대사'};
  let deletedProject=null;
  const defaultLayout=JSON.parse(JSON.stringify(UI_LAYOUT));
  const defaultTexts={...UI_TEXT},defaultOnggiTexts=collectOnggiText();

  /** 매개변수 없음. @returns {object} 옹기 이름/형태/질문/설명 편집 키와 기본 문구. 소장품 검증 정보는 변경하지 않음. */
  function collectOnggiText(){const result={};COLLECTION.forEach((item,i)=>{for(const field of ['name','shape','question'])result[i+'.'+field]=item[field];item.lines.forEach((line,j)=>{result[i+'.lines.'+j]=line;});});return result;}

  /** @param next {object} 검증된 텍스트 설정. @returns {void} 게임 문구/옹기 설명/이야기 배열을 갱신. HTML로 해석하지 않음. */
  function applyTextSettings(next){Object.assign(UI_TEXT,next.texts);for(const [key,value]of Object.entries(next.onggiTexts)){const [id,field,index]=key.split('.');if(field==='lines')COLLECTION[id].lines[Number(index)]=value;else COLLECTION[id][field]=value;}refreshNarrativeText();PageUI.syncNarrative(next.pageDesign);if(typeof GyroInput!=='undefined')GyroInput.refreshLabels();}

  /** @param value {object} 프로젝트 UI. @returns {object} 안전한 설정 복사본. 키/숫자/크기/배율 검사. */
  function validate(value={}) {
    const next={...defaults,layout:JSON.parse(JSON.stringify(defaultLayout)),texts:{...defaultTexts},onggiTexts:{...defaultOnggiTexts},onggiAssets:{}};
    if(value.fontFamily!==undefined){if(typeof value.fontFamily!=='string'||value.fontFamily.length>150)throw Error('폰트 이름이 올바르지 않습니다.');next.fontFamily=value.fontFamily;}
    for(const [key,min,max]of [['fontScale',.5,2],['imageX',-1600,3200],['imageY',-1000,2000],['imageW',1,1600],['imageH',1,1000]]){
      if(value[key]!==undefined){if(typeof value[key]!=='number'||!Number.isFinite(value[key])||value[key]<min||value[key]>max)throw Error('UI 설정 범위 오류: '+key);next[key]=value[key];}
    }
    if(value.imageAssetId!==undefined){if(typeof value.imageAssetId!=='string')throw Error('이미지 ID가 잘못되었습니다.');next.imageAssetId=value.imageAssetId.slice(0,80);}
    if(value.bgmAssetId!==undefined){if(typeof value.bgmAssetId!=='string')throw Error('BGM ID가 잘못되었습니다.');next.bgmAssetId=value.bgmAssetId.slice(0,80);}
    for(const key of ['floorAssetId']){if(value[key]!==undefined){if(typeof value[key]!=='string')throw Error('바닥 에셋 ID 오류');next[key]=value[key].slice(0,80);}}
    for(const [field,allowed]of [['texts',defaultTexts],['onggiTexts',defaultOnggiTexts]]){
      if(value[field]!==undefined){if(!value[field]||typeof value[field]!=='object'||Array.isArray(value[field]))throw Error('텍스트 설정은 객체여야 합니다.');for(const [key,text]of Object.entries(value[field])){if(!Object.hasOwn(allowed,key)||typeof text!=='string'||text.length>500)throw Error('허용된 문구 키와 500자 이하 텍스트가 필요합니다.');next[field][key]=text;}}
    }
    if(value.onggiAssets!==undefined){if(!value.onggiAssets||typeof value.onggiAssets!=='object'||Array.isArray(value.onggiAssets))throw Error('옹기 에셋 설정 오류');for(const [id,asset]of Object.entries(value.onggiAssets)){if(!/^[0-5]$/.test(id)||typeof asset!=='string'||!/^[\w-]{1,80}$/.test(asset))throw Error('옹기 번호/모델 ID 오류');next.onggiAssets[id]=asset;}}
    // 읽기: 종류별 외형 → 효과음 → 물리값. 모두 ID만 저장하며 외부 URL을 받지 않습니다.
    for (const [field, keys] of [
      ['blockAssets', ['floor','wall','hole','sweeper','crumble','checkpoint','start','goal']],
      ['sfx', ['checkpoint','arrival','projectSave','fail']]
    ]) {
      next[field] = {};
      if (value[field] !== undefined) {
        if (!value[field] || typeof value[field] !== 'object' || Array.isArray(value[field])) throw Error('에셋 설정은 객체여야 합니다.');
        for (const [key, id] of Object.entries(value[field])) {
          if (!keys.includes(key) || typeof id !== 'string' || !/^[\w-]{1,80}$/.test(id)) throw Error('에셋 종류 또는 ID가 올바르지 않습니다.');
          next[field][key] = id;
        }
      }
    }
    if (value.sfxVolume !== undefined) {
      if (typeof value.sfxVolume !== 'number' || !Number.isFinite(value.sfxVolume) || value.sfxVolume < 0 || value.sfxVolume > 1) throw Error('효과음 음량은 0~1입니다.');
      next.sfxVolume = value.sfxVolume;
    }
    next.pageDesign=UIPageData.validate(value.pageDesign||{});
    next.onggiPhysics=OnggiPhysics.validate(value.onggiPhysics||{});
    if(value.layout){for(const [screen,items]of Object.entries(value.layout)){
      if(!Object.hasOwn(defaultLayout,screen)||!items||typeof items!=='object')throw Error('알 수 없는 UI 화면입니다.');
      for(const [id,props]of Object.entries(items)){
        if(!Object.hasOwn(defaultLayout[screen],id)||!props||typeof props!=='object')throw Error('알 수 없는 UI 요소입니다.');
        for(const [key,number]of Object.entries(props)){
          if(!Object.hasOwn(defaultLayout[screen][id],key)||typeof number!=='number'||!Number.isFinite(number)||Math.abs(number)>4000)throw Error('UI 위치/크기 값이 잘못되었습니다.');
          if(['width','height','fontSize','radius','lineWidth','scale'].includes(key)&&number<=0)throw Error('UI 크기는 0보다 커야 합니다.');
          next.layout[screen][id][key]=number;
        }
      }
    }}
    return next;
  }

  /** @param value {object} validate할 UI 설정. @returns {void} 실제 폰트/배치와 편집 화면 반영. */
  function apply(value,options={}) {
    const next=validate(value),before=options.history!==false?exportData():null;settings={...next};delete settings.layout;
    GAME_CONFIG.ui.fontFamily=settings.fontFamily;applyTextSettings(next);OnggiPhysics.applySelected();
    for(const [screen,items]of Object.entries(next.layout))for(const [id,props]of Object.entries(items))Object.assign(UI_LAYOUT[screen][id],props);
    if(before&&typeof UIHistory!=='undefined')UIHistory.record(before,exportData());
    dirty=true;if(host&&options.refreshLegacy!==false){refreshControls();preview();}
  }

  /** 매개변수 없음. @returns {object} JSON에 저장할 폰트/배치/이미지 설정. */
  function exportData(){return JSON.parse(JSON.stringify({...settings,layout:UI_LAYOUT}));}

  /** 매개변수 없음. @returns {void} 실제 drawUI로 2D 미리보기. 본 게임의 screen/buttons를 즉시 복원. 3D 옹기는 이 미리보기에 포함하지 않음. */
  function preview() {
    if(!previewCanvas)return;
    const oldScreen=screen,oldButtons=buttons,oldPortrait=portrait;
    try{
      screen={drawTitle:'title',drawSelect:'select',drawGuide:'guide',drawPlay:'play',drawFinish:'finish',drawStory:'story',drawMonologue:'monologue'}[scene];portrait=false;
      drawUI();const context=previewCanvas.getContext('2d');context.fillStyle='#f5efdf';context.fillRect(0,0,800,500);context.drawImage(ui,0,0,800,500);
      const p=UI_LAYOUT[scene]?.[element];
      if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y)){context.strokeStyle='#2875ce';context.lineWidth=2;context.strokeRect(p.x/2-2,p.y/2-2,(p.width||110)/2,(p.height||p.fontSize||30)/2);}
    }finally{screen=oldScreen;buttons=oldButtons;portrait=oldPortrait;dirty=true;}
  }

  /** 매개변수 없음. @returns {void} 선택 화면의 요소 목록 및 숫자 속성 입력 갱신. */
  function refreshControls() {
    if(!host)return;
    refreshPhysics();
    refreshMediaControls();
    const select=host.querySelector('#ui-element');select.replaceChildren();
    for(const id of Object.keys(UI_LAYOUT[scene]||{})){const option=document.createElement('option');option.value=id;option.textContent=id;select.append(option);}
    if(!UI_LAYOUT[scene]?.[element])element=Object.keys(UI_LAYOUT[scene]||{})[0]||'';select.value=element;
    host.querySelector('#ui-family').value=settings.fontFamily;host.querySelector('#ui-scale').value=settings.fontScale;
    const target=host.querySelector('#onggi-target');if(target)Array.from(target.children).forEach((option,i)=>{option.textContent=(i+1)+'. '+COLLECTION[i].name;});
    const words=host.querySelector('#ui-text-key');words.replaceChildren();
    for(const [key,value]of [...Object.entries(UI_TEXT),...Object.entries(collectOnggiText()).map(([k,v])=>['onggi:'+k,v])]){const option=document.createElement('option');option.value=key;option.textContent=key+' — '+value.slice(0,30);words.append(option);}
    words.value=textKey;host.querySelector('#ui-text-value').value=textKey.startsWith('onggi:')?collectOnggiText()[textKey.slice(6)]:UI_TEXT[textKey];
    propertyBox.replaceChildren();
    for(const [key,number]of Object.entries(UI_LAYOUT[scene]?.[element]||{})) {
      const label=document.createElement('label');label.textContent=({x:'가로 위치 X',y:'세로 위치 Y',x1:'시작 X',y1:'시작 Y',x2:'끝 X',y2:'끝 Y',width:'너비',height:'높이',fontSize:'글자 크기',radius:'모서리',lineWidth:'선 두께',scale:'배율'})[key]||key;
      const input=document.createElement('input');input.type='number';input.step='1';input.value=number;
      input.onchange=()=>{try{const next=exportData();next.layout[scene][element][key]=Number(input.value);apply(next);saved();}catch(error){host.querySelector('#studio-notice').textContent=error.message;refreshControls();}};
      label.append(input);propertyBox.append(label);
    }
    for(const [key,title]of [['imageX','이미지 X'],['imageY','이미지 Y'],['imageW','이미지 너비'],['imageH','이미지 높이']]){
      const label=document.createElement('label');label.textContent=title;const input=document.createElement('input');input.type='number';input.value=settings[key];input.onchange=()=>{try{apply({...exportData(),[key]:Number(input.value)});saved();}catch(e){host.querySelector('#studio-notice').textContent=e.message;}};label.append(input);propertyBox.append(label);
    }
  }

  /** 매개변수 없음. @returns {void} 이미지 썸네일/선택 목록 갱신. 파일명은 HTML로 해석하지 않음. */
  function refreshAssets() {
    if(!host)return;const list=host.querySelector('#asset-list');list.replaceChildren();
    const remove=host.querySelector('#asset-delete');if(remove)remove.disabled=!AssetBank.list().some(a=>a.id===AssetBank.selected());
    refreshMediaControls();
    for(const asset of AssetBank.list()){
      const button=document.createElement('button');button.textContent=`${asset.kind} · ${asset.name}`;button.classList.toggle('active',AssetBank.selected()===asset.id);
      button.onclick=()=>{AssetBank.select(asset.id);refreshAssets();if(typeof EditorShell!=='undefined')EditorShell.refreshAssetActions();};list.append(button);
    }
  }

  /** @param files {FileList|File[]} 로컬 파일. @returns {Promise<void>} 드롭/선택 파일을 로드하고 종류별 활용 버튼 제공. */
  async function importAssets(files) {
    const notice=host.querySelector('#studio-notice');notice.textContent='에셋을 불러오는 중입니다…';
    try{await AssetBank.addFiles(files);refreshAssets();if(typeof EditorShell!=='undefined')EditorShell.refreshAssetActions();saved();notice.textContent='에셋 추가 완료. 아래에서 맵 배치·UI 이미지·폰트·소리를 선택하세요.';}
    catch(error){notice.textContent=error.message;}
  }

  /** @param container {HTMLElement} 편집기 하단 영역. @param onSave {function} 설정 변경 저장 콜백.
   * @param onPlace {function(string):void} 에셋 ID를 배치 도구로 지정. @returns {void} UI 편집·파일 드롭 이벤트 연결. */
  function mount(container,onSave,onPlace) {
    host=container;saved=onSave;chooseAsset=onPlace;
    host.innerHTML="<div class=\"studio-heading\"><h2>게임 꾸미기</h2><p>① 파일 넣기 → ② 종류별 외형·효과음 지정 → ③ 바로 테스트 → ④ release ZIP 내보내기</p></div><nav class=\"studio-tabs\" aria-label=\"게임 설정\"><button id=\"tab-assets\" aria-controls=\"pane-assets\">에셋·블록 외형</button><button id=\"tab-sound\" aria-controls=\"pane-sound\">효과음·BGM</button><button id=\"tab-physics\" aria-controls=\"pane-physics\">옹기 물리</button><button id=\"tab-ui\" aria-controls=\"pane-ui\">UI 문구·배치</button></nav><p id=\"studio-notice\" role=\"status\" aria-live=\"polite\"></p><section id=\"pane-assets\"><details open><summary><strong>에셋 넣기</strong></summary><div id=\"asset-drop\" tabindex=\"0\">여기에 에셋 파일을 드래그 앤 드롭하세요. 또는 <button id=\"asset-pick\">에셋 추가</button><input id=\"asset-file\" type=\"file\" multiple hidden accept=\".png,.jpg,.jpeg,.webp,.gif,.ttf,.otf,.woff,.woff2,.mp3,.wav,.ogg,.obj\"></div><p>먼저 파일을 넣고 목록에서 선택하세요. 이미지·OBJ는 아래에서 종류별 외형으로 지정할 수 있습니다. 모든 파일은 프로젝트에 포함되어 오프라인으로 실행됩니다.</p><div id=\"asset-list\"></div><div class=\"asset-manage-row\"><button id=\"asset-delete\">선택 에셋 삭제</button><button id=\"asset-delete-undo\" hidden>방금 삭제 되돌리기</button></div><p>삭제하면 사용 중인 외형·소리 연결이 해제되고 해당 에셋 장식만 제거됩니다. 컴퓨터의 원본 파일은 삭제하지 않습니다.</p><label>옹기 모델 대상 <select id=\"onggi-target\"></select></label> <button id=\"asset-onggi\">옹기 모델로 사용</button> <button id=\"asset-onggi-reset\">옹기 기본 모델</button> <button id=\"asset-floor\">바닥 이미지로 사용</button> <button id=\"asset-floor-reset\">기본 바닥</button> <button id=\"asset-place\">선택 에셋을 맵에 배치</button> <button id=\"asset-image\">UI 이미지로 사용</button> <button id=\"asset-font\">게임 폰트로 사용</button>     <button id=\"asset-hide-image\">UI 이미지 숨기기</button><div class=\"studio-card-group\"><h3>블록 종류별 외형</h3><p>이 종류의 모든 블록에 적용됩니다. 한 블록만 바꾸려면 아래 작은 격자에서 선택하고 개별 외형을 고르세요.</p><label>대상 종류 <select id=\"skin-type\"><option value=\"floor\">바닥</option><option value=\"wall\">벽</option><option value=\"hole\">구멍 테두리</option><option value=\"sweeper\">왕복 장애물</option><option value=\"crumble\">무너지는 바닥</option><option value=\"checkpoint\">체크포인트</option><option value=\"start\">출발점</option><option value=\"goal\">도착점</option></select></label><label>외형 에셋 <select id=\"skin-asset\"></select></label><button id=\"skin-apply\">종류 전체에 적용</button><button id=\"skin-reset\">이 종류 기본 외형</button><p id=\"skin-current\"></p><p>바닥·구멍: 이미지 전용. 벽·장애물·표식: 이미지 또는 OBJ. 외형만 변경되며 충돌은 1칸 블록 기준입니다. 구멍 이미지도 테두리에만 적용됩니다.</p></div></details></section><section id=\"pane-sound\" hidden><details open><summary><strong>효과음과 배경음</strong></summary><p>에셋 탭에서 WAV·MP3·OGG 파일을 넣은 뒤 상황별 소리를 선택하세요. 효과음은 한 번, BGM은 반복 재생됩니다.</p><div id=\"sfx-fields\"></div><label>효과음 음량 <input id=\"sfx-volume\" type=\"range\" min=\"0\" max=\"1\" step=\"0.05\"></label><span id=\"sfx-volume-label\"></span><p>체크포인트 저장과 프로젝트 파일 저장은 별개입니다. 자동 저장에는 소리가 나지 않습니다.</p><h3>BGM</h3><p>에셋 목록에서 오디오를 선택한 뒤 지정하세요.</p><button id=\"asset-sound\">선택 오디오 반복 미리 듣기</button><button id=\"asset-stop\">모든 소리 중지</button><button id=\"asset-bgm\">선택 오디오를 BGM 지정</button><button id=\"asset-unset-bgm\">BGM 해제</button><p id=\"bgm-current\"></p></details></section><section id=\"pane-physics\" hidden><details open><summary><strong>옹기별 물리값</strong></summary><p>옹기를 골라 조작감을 바꾸세요. 값은 저장과 배포에 함께 포함됩니다. 큰 반지름은 더 넓은 바닥이 필요합니다.</p><label>대상 옹기 <select id=\"physics-target\"></select></label><div id=\"physics-properties\"></div><button id=\"physics-play\">이 옹기로 테스트</button><button id=\"physics-reset\">선택 옹기 기본값</button><p id=\"physics-status\" role=\"status\"></p></details></section><section id=\"pane-ui\" hidden><details open><summary><strong>게임 UI 폰트·배치 편집</strong></summary><p>좌표는 1600×1000 화면 기준입니다. 화면/요소를 고르고 숫자를 수정하거나 미리보기에서 선택 요소를 드래그하세요. 파란 테두리는 선택 요소입니다. 3D 옹기는 미리보기에 표시하지 않습니다.</p><label>수정할 문구 <select id=\"ui-text-key\"></select></label><textarea id=\"ui-text-value\" maxlength=\"500\" rows=\"3\" aria-label=\"게임 문구\"></textarea> <button id=\"ui-text-apply\">문구 적용</button><p>원하는 문구를 고르고 적용하세요. 옹기 이름/설명도 바꿀 수 있습니다. 긴 문구는 글자 크기와 위치도 조절하세요.</p><label>폰트 이름 <input id=\"ui-family\" placeholder=\"sans-serif\"></label> <label>글자 전체 배율 <input id=\"ui-scale\" type=\"number\" min=\"0.5\" max=\"2\" step=\"0.1\"></label><label>화면 <select id=\"ui-scene\"></select></label><label>요소 <select id=\"ui-element\"></select></label><div class=\"studio-ui-grid\"><canvas id=\"ui-preview\" width=\"800\" height=\"500\"></canvas><div id=\"ui-properties\"></div></div></details></section>";
    host.querySelector('#asset-delete').onclick=deleteSelectedAsset;
    host.querySelector('#asset-delete-undo').onclick=async()=>{
      if(!deletedProject)return;const snapshot=deletedProject,json=JSON.stringify(snapshot);
      if(await MapEditor.load({size:json.length,text:async()=>json})){deletedProject=null;host.querySelector('#asset-delete-undo').hidden=true;host.querySelector('#studio-notice').textContent='삭제한 에셋과 설정을 복원했습니다.';}
    };
    for (const name of ['assets','sound','physics','ui']) {
      host.querySelector('#tab-'+name).onclick=()=>{
        for (const key of ['assets','sound','physics','ui']) {
          host.querySelector('#pane-'+key).hidden=key!==name;
          host.querySelector('#tab-'+key).classList.toggle('active',key===name);
          host.querySelector('#tab-'+key).setAttribute('aria-pressed',String(key===name));
        }
        if(name==='ui') preview();
      };
    }
    host.querySelector('#tab-assets').click();
    host.querySelector('#skin-type').value='floor';
    host.querySelector('#skin-type').onchange=refreshMediaControls;
    host.querySelector('#skin-apply').onclick=()=>{
      const type=host.querySelector('#skin-type').value,id=host.querySelector('#skin-asset').value;
      const next=exportData();next.blockAssets={...next.blockAssets};
      if(id) next.blockAssets[type]=id;else delete next.blockAssets[type];
      if(type==='floor')next.floorAssetId='';
      apply(next);saved();host.querySelector('#studio-notice').textContent='종류별 외형을 적용했습니다. 바로 테스트로 확인하세요.';
    };
    host.querySelector('#skin-reset').onclick=()=>{
      const next=exportData(),type=host.querySelector('#skin-type').value;
      delete next.blockAssets[type];if(type==='floor')next.floorAssetId='';apply(next);saved();
    };
    host.querySelector('#sfx-volume').onchange=e=>{apply({...exportData(),sfxVolume:Number(e.target.value)});saved();};
    host.querySelector('#physics-target').onchange=e=>{physicsId=e.target.value;refreshPhysics();};
    host.querySelector('#physics-play').onclick=()=>{selected=Number(physicsId);OnggiPhysics.applySelected();MapEditor.play();};
    host.querySelector('#physics-reset').onclick=()=>{const next=exportData();delete next.onggiPhysics[physicsId];apply(next);saved();host.querySelector('#physics-status').textContent='선택한 옹기를 기본값으로 되돌렸습니다.';};
    const target=host.querySelector('#onggi-target');COLLECTION.forEach((item,i)=>{const option=document.createElement('option');option.value=i;option.textContent=(i+1)+'. '+item.name;target.append(option);});target.value=selected;
    host.querySelector('#ui-text-key').onchange=e=>{textKey=e.target.value;refreshControls();};
    host.querySelector('#ui-text-apply').onclick=()=>{try{const next=exportData(),value=host.querySelector('#ui-text-value').value;if(textKey.startsWith('onggi:'))next.onggiTexts[textKey.slice(6)]=value;else next.texts[textKey]=value;apply(next);saved();host.querySelector('#studio-notice').textContent='문구를 적용했습니다.';}catch(error){host.querySelector('#studio-notice').textContent=error.message;}};
    previewCanvas=host.querySelector('#ui-preview');propertyBox=host.querySelector('#ui-properties');
    const selector=host.querySelector('#ui-scene');for(const [id,title]of Object.entries(screens)){const option=document.createElement('option');option.value=id;option.textContent=title;selector.append(option);}selector.onchange=()=>{scene=selector.value;element='';refreshControls();preview();};
    host.querySelector('#ui-element').onchange=event=>{element=event.target.value;refreshControls();preview();};
    for(const [id,key]of [['ui-family','fontFamily'],['ui-scale','fontScale']])host.querySelector('#'+id).onchange=event=>{try{apply({...exportData(),[key]:key==='fontScale'?Number(event.target.value):event.target.value});saved();}catch(error){host.querySelector('#studio-notice').textContent=error.message;refreshControls();}};
    let drag=null;
    previewCanvas.addEventListener('pointerdown',event=>{const r=previewCanvas.getBoundingClientRect(),x=(event.clientX-r.left)/r.width*1600,y=(event.clientY-r.top)/r.height*1000;
      const choices=Object.entries(UI_LAYOUT[scene]||{}).filter(([,p])=>Number.isFinite(p.x)&&Number.isFinite(p.y)).sort((a,b)=>Math.hypot(a[1].x-x,a[1].y-y)-Math.hypot(b[1].x-x,b[1].y-y));
      if(choices.length){element=choices[0][0];const p=choices[0][1];drag={x,y,oldX:p.x,oldY:p.y};previewCanvas.setPointerCapture(event.pointerId);refreshControls();preview();}});
    previewCanvas.addEventListener('pointermove',event=>{if(!drag)return;const r=previewCanvas.getBoundingClientRect(),p=UI_LAYOUT[scene][element];p.x=Math.max(-1600,Math.min(3200,Math.round(drag.oldX+(event.clientX-r.left)/r.width*1600-drag.x)));p.y=Math.max(-1000,Math.min(2000,Math.round(drag.oldY+(event.clientY-r.top)/r.height*1000-drag.y)));preview();});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])previewCanvas.addEventListener(event,()=>{if(drag){drag=null;refreshControls();saved();}});
    const file=host.querySelector('#asset-file');host.querySelector('#asset-pick').onclick=()=>file.click();file.onchange=()=>{importAssets(file.files);file.value='';};
    const drop=host.querySelector('#asset-drop');drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('dropping');});drop.addEventListener('dragleave',()=>drop.classList.remove('dropping'));drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('dropping');importAssets(e.dataTransfer.files);});
    for(const [id,action]of [['asset-floor',()=>{const id=AssetBank.selected();if(!AssetBank.image(id))throw Error('바닥에 사용할 이미지를 선택하세요.');apply({...exportData(),floorAssetId:id,blockAssets:{...settings.blockAssets,floor:id}});saved();}],['asset-floor-reset',()=>{const next=exportData();next.floorAssetId='';delete next.blockAssets.floor;apply(next);saved();}],['asset-onggi',()=>{const id=AssetBank.selected();if(!AssetBank.list().some(a=>a.id===id&&a.kind==='model'))throw Error('옹기로 사용할 OBJ 모델을 선택하세요.');apply({...exportData(),onggiAssets:{...settings.onggiAssets,[target.value]:id}});saved();}],['asset-onggi-reset',()=>{const next=exportData();delete next.onggiAssets[target.value];apply(next);saved();}],['asset-place',()=>{const selected=AssetBank.list().find(a=>a.id===AssetBank.selected());if(!selected||!['image','model'].includes(selected.kind))throw Error('배치할 이미지 또는 OBJ를 선택하세요.');chooseAsset(selected.id);}],['asset-image',()=>{const id=AssetBank.selected();if(!AssetBank.image(id))throw Error('이미지를 선택하세요.');apply({...exportData(),imageAssetId:id});saved();}],['asset-font',()=>{const family=AssetBank.fontFamily(AssetBank.selected());if(!family)throw Error('폰트를 선택하세요.');apply({...exportData(),fontFamily:family});saved();}],['asset-sound',()=>AssetBank.playSound(AssetBank.selected())],['asset-stop',()=>AssetBank.stopSound()],['asset-bgm',()=>{const id=AssetBank.selected();if(!AssetBank.list().some(a=>a.id===id&&a.kind==='audio'))throw Error('사운드를 선택하세요.');apply({...exportData(),bgmAssetId:id});saved();}],['asset-unset-bgm',()=>{apply({...exportData(),bgmAssetId:''});saved();}],['asset-hide-image',()=>{apply({...exportData(),imageAssetId:''});saved();}]])host.querySelector('#'+id).onclick=async()=>{try{await action();host.querySelector('#studio-notice').textContent='적용했습니다.';}catch(e){host.querySelector('#studio-notice').textContent=e.message;}};
    refreshControls();refreshAssets();preview();
  }

  /** 매개변수 없음. @returns {void} 옹기별 계산값을 편집하는 폼을 갱신. 숫자 검증에 실패하면 이전 설정 유지. */
  function refreshPhysics() {
    const target=host.querySelector('#physics-target'),fields=host.querySelector('#physics-properties');
    if(!target||!fields)return;
    target.replaceChildren();
    COLLECTION.forEach((item,id)=>{const option=document.createElement('option');option.value=id;option.textContent=(id+1)+'. '+item.name;target.append(option);});
    target.value=physicsId;fields.replaceChildren();
    const profile=OnggiPhysics.get(physicsId,settings.onggiPhysics);
    const labels={radius:'충돌 반지름',accelerationScale:'가속 배율',damping:'속도 감쇠 / 마찰',maxSpeed:'최대 속도',wallRestitution:'벽 반발 계수'};
    for(const [key,number]of Object.entries(profile)){
      const label=document.createElement('label');label.textContent=labels[key];
      const input=document.createElement('input');input.type='number';input.min=OnggiPhysics.limits[key][0];input.max=OnggiPhysics.limits[key][1];input.step=key==='radius'||key==='wallRestitution'?'0.01':'0.1';input.value=number;
      input.onchange=()=>{try{const next=exportData();next.onggiPhysics={...next.onggiPhysics,[physicsId]:{...(next.onggiPhysics[physicsId]||{}),[key]:Number(input.value)}};apply(next);saved();host.querySelector('#physics-status').textContent='적용했습니다. 플레이로 확인하세요.';}catch(error){host.querySelector('#physics-status').textContent=error.message;refreshPhysics();}};
      label.append(input);fields.append(label);
    }
  }


  /** 읽기: mount → refreshMediaControls → 선택 이벤트 → apply → 저장 콜백.
   * 매개변수 없음. @returns {void} 로컬 에셋에서 사용 가능한 외형/효과음 목록을 구성.
   * 파일명은 textContent로 표시하고 종류에 맞지 않는 에셋은 선택지에서 제외합니다. */
  function refreshMediaControls() {
    if(!host || !host.querySelector('#skin-type')) return;
    const type=host.querySelector('#skin-type').value || 'floor';
    const selector=host.querySelector('#skin-asset');selector.replaceChildren();
    const empty=document.createElement('option');empty.value='';empty.textContent='기본 외형';selector.append(empty);
    for(const a of AssetBank.list()) {
      if(!(['floor','hole'].includes(type)?['image']:['image','model']).includes(a.kind))continue;
      const option=document.createElement('option');option.value=a.id;option.textContent=a.name;selector.append(option);
    }
    selector.value=settings.blockAssets?.[type] || (type==='floor'?settings.floorAssetId:'') || '';
    host.querySelector('#skin-current').textContent='현재: '+(AssetBank.list().find(a=>a.id===selector.value)?.name || '기본 외형');
    const fields=host.querySelector('#sfx-fields');fields.replaceChildren();
    for(const [event,title,hint] of [
      ['checkpoint','체크포인트 저장','새 체크포인트에 도착할 때 한 번 재생'],
      ['arrival','도착','각 맵 목표에 도착할 때 한 번 재생'],
      ['projectSave','프로젝트 파일 저장','JSON 저장 버튼을 눌렀을 때 재생'],
      ['fail','실패','구멍·낙하·장애물 충돌 때 재생 (선택)']
    ]) {
      const row=document.createElement('div');row.className='sfx-row';
      const label=document.createElement('label');label.textContent=title;
      const select=document.createElement('select');select.id='sfx-'+event;
      const off=document.createElement('option');off.value='';off.textContent='사용 안 함';select.append(off);
      for(const a of AssetBank.list().filter(a=>a.kind==='audio')){const o=document.createElement('option');o.value=a.id;o.textContent=a.name;select.append(o);}
      select.value=settings.sfx?.[event] || '';
      select.onchange=()=>{const next=exportData();next.sfx={...next.sfx};if(select.value)next.sfx[event]=select.value;else delete next.sfx[event];apply(next);saved();};
      const button=document.createElement('button');button.textContent='미리 듣기';button.disabled=!select.value;
      button.onclick=async()=>{AssetBank.unlockEffects();const ok=await AssetBank.playEffect(event);if(!ok)host.querySelector('#studio-notice').textContent='소리를 재생하지 못했습니다. 오디오 파일을 확인하세요.';};
      const help=document.createElement('small');help.textContent=hint;
      label.append(select);row.append(label,button,help);fields.append(row);
    }
    host.querySelector('#sfx-volume').value=settings.sfxVolume ?? .7;
    host.querySelector('#sfx-volume-label').textContent=Math.round((settings.sfxVolume ?? .7)*100)+'%';
    host.querySelector('#bgm-current').textContent='현재 BGM: '+(AssetBank.list().find(a=>a.id===settings.bgmAssetId)?.name || '없음');
  }


  /** 매개변수 없음. @returns {Promise<void>} 선택 에셋과 모든 참조를 안전하게 해제 후 저장.
   * 재로딩 실패 시 기존 프로젝트 유지. 한 번의 삭제는 버튼으로 되돌릴 수 있습니다. */
  async function deleteSelectedAsset() {
    const button=host.querySelector('#asset-delete');if(button.disabled)return;
    button.disabled=true;
    try {
      const before=MapEditor.exportProject(),result=ProjectData.withoutAsset(before,AssetBank.selected()),json=JSON.stringify(result.project);
      if(!await MapEditor.load({size:json.length,text:async()=>json}))throw Error('에셋 삭제를 적용하지 못했습니다. 기존 프로젝트를 유지합니다.');
      deletedProject=before;host.querySelector('#asset-delete-undo').hidden=false;
      host.querySelector('#studio-notice').textContent='에셋 삭제 완료 · 연결 '+result.clearedBindings+'개 해제 · 장식 '+result.removedBlocks+'개 제거. 원본 파일은 유지됩니다. 다른 수정 전까지 되돌릴 수 있습니다.';
    }catch(error){host.querySelector('#studio-notice').textContent=error.message;}
    finally{refreshAssets();}
  }

  /** 매개변수 없음. @returns {void} 삭제 후 다른 변경이 저장되면 이전 전체 초안으로 되돌리기를 비활성화. */
  function invalidateAssetUndo(){deletedProject=null;if(host?.querySelector('#asset-delete-undo'))host.querySelector('#asset-delete-undo').hidden=true;}
  return {invalidateAssetUndo,deleteSelectedAsset,validate,apply,exportData,mount,refreshAssets,preview,save:()=>saved(),get settings(){return settings;}};
})();
