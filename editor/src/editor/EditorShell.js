/* 화면 정리 전용. 게임/저장 규격은 변경하지 않음.
 * 읽기: mount → switchWorkspace → refreshAssetActions. */
const EditorShell = (() => {
  let workspace='map',actionSelect,actionButton;
  const hiddenActions=['asset-onggi','asset-onggi-reset','asset-floor','asset-floor-reset','asset-place','asset-image','asset-font','asset-hide-image'];
  /** @param value {string} map/design/team. @returns {void} 현재 작업 공간만 표시.
   * 맵·설정·협업 데이터와 선택 상태는 유지합니다. */
  function switchWorkspace(value) {
    if(!['map','design','team'].includes(value))return;
    workspace=value;
    for(const [id,active]of [['workspace-map','map'],['editor-mapbar','map'],['studio-design','design'],['team-files','team']])document.getElementById(id).hidden=value!==active;
    document.getElementById('editor-workspace').value=value;
    document.getElementById('editor-view-hint').textContent={map:'블록을 고르고 격자에 그리세요. 맵 추가·삭제는 맵 관리에 있습니다.',design:'에셋 관리·블록 외형·효과음·물리·UI 중 필요한 탭만 선택하세요. 사진과 글꼴은 UI 탭에서 넣습니다.',team:'설정 파일을 선택해 저장하거나 불러오세요.'}[value];
    if(value==='design'){StudioUI.preview();if(typeof PageDesigner!=='undefined')PageDesigner.refresh();}
  }

  /** 매개변수 없음. @returns {void} 선택 에셋 종류에 맞는 활용 메뉴만 표시.
   * 기존 버튼의 이벤트를 재사용하여 저장/검증 로직을 중복하지 않습니다. */
  function refreshAssetActions() {
    if(!actionSelect)return;
    const asset=AssetBank.list().find(a=>a.id===AssetBank.selected());
    const choices={image:[['asset-place','맵 장식으로 배치']],model:[['asset-place','맵 장식으로 배치'],['asset-onggi','선택 옹기 모델로 사용'],['asset-onggi-reset','선택 옹기 기본 모델']],font:[],audio:[['asset-sound','반복 미리 듣기'],['asset-bgm','BGM으로 지정']]}[asset?.kind] || [];
    const previous=actionSelect.value;actionSelect.replaceChildren();
    for(const [id,title]of choices){const option=document.createElement('option');option.value=id;option.textContent=title;actionSelect.append(option);}
    // 사진과 글꼴은 UI 문구·배치 탭에서 고르고 배치합니다.
    if(asset&&!choices.length&&asset.kind==='font'){const option=document.createElement('option');option.value='';option.textContent='글꼴은 UI 문구·배치 탭에서 사용합니다';actionSelect.append(option);}
    actionSelect.value=choices.some(([id])=>id===previous)?previous:(choices[0]?.[0]||'');actionButton.disabled=!choices.length;
    updateTarget();
  }

  /** 매개변수 없음. @returns {void} 옹기 모델 작업을 선택한 경우에만 대상 옹기 입력 표시. */
  function updateTarget() {
    const target=document.getElementById('onggi-target'),show=['asset-onggi','asset-onggi-reset'].includes(actionSelect.value);
    target.hidden=!show;if(target.parentElement)target.parentElement.hidden=!show;
  }

  /** 매개변수 없음. @returns {void} 작업 선택·간단한 에셋 활용 메뉴·접힌 도움말 구성. */
  function mount() {
    const editor=document.getElementById('map-editor');
    const hint=document.createElement('p');hint.id='editor-view-hint';hint.className='editor-view-hint';document.getElementById('editor-status').after(hint);
    document.getElementById('editor-workspace').onchange=e=>switchWorkspace(e.target.value);
    const workflow=editor.querySelector('.editor-workflow');if(workflow)workflow.hidden=true;
    // 긴 설명은 한 번 열어 읽고 접을 수 있는 도움말로 이동.
    for(const element of Array.from(editor.querySelectorAll?.('.editor-help') || [])) {
      const details=document.createElement('details');details.className='editor-help-drawer';
      const summary=document.createElement('summary');summary.textContent='사용 방법';details.append(summary);element.after(details);details.append(element);
    }
    for(const id of hiddenActions)document.getElementById(id).hidden=true;
    const controls=document.createElement('div');controls.className='asset-quick-actions';
    const label=document.createElement('label');label.textContent='선택 에셋 활용';actionSelect=document.createElement('select');actionSelect.id='asset-action-choice';label.append(actionSelect);
    actionButton=document.createElement('button');actionButton.id='asset-action-apply';actionButton.textContent='적용';
    actionSelect.onchange=updateTarget;
    actionButton.onclick=async()=>{const button=document.getElementById(actionSelect.value);if(button?.onclick)await button.onclick();refreshAssetActions();};
    controls.append(label,actionButton);document.getElementById('asset-list').after(controls);
    // 목록 갱신마다 메뉴를 함께 갱신. 에셋 종류가 달라지면 이전 작업 선택을 초기화.
    const refresh=StudioUI.refreshAssets;StudioUI.refreshAssets=()=>{refresh();refreshAssetActions();};
    document.getElementById('asset-list').addEventListener('click',refreshAssetActions);
    document.getElementById('asset-file').addEventListener('change',()=>setTimeout(refreshAssetActions,0));
    document.getElementById('asset-drop').addEventListener('drop',()=>setTimeout(refreshAssetActions,0));
    for(const id of ['editor-play','editor-save','editor-load','editor-close','export-player','map-add','map-copy','map-delete','map-up','map-down','editor-example','editor-empty'])document.getElementById(id).addEventListener('click',()=>{for(const menu of Array.from(editor.querySelectorAll?.('.editor-menu') || []))menu.open=false;});
    refreshAssetActions();switchWorkspace('map');
  }
  mount();return {switchWorkspace,refreshAssetActions,get workspace(){return workspace;}};
})();
