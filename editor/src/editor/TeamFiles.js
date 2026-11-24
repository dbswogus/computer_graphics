/* 담당별 내보내기·가져오기 UI. 설정을 바꿔도 해당 담당 파일만 내려받습니다.
 * 읽기: mount → exportRole/importRole → TeamSource → MapEditor.load. */
const TeamFiles = (() => {
  let host;
  /** @param text {string} 상태 안내. @returns {void} 편집기 담당별 저장 영역에 표시. */
  function status(text){host.querySelector('#team-status').textContent=text;}

  /** @param role {string} ui/map/physics. @returns {string} 해당 담당 설정만 든 JS 원문. 전체 프로젝트를 함께 저장하지 않음. */
  function createSource(role) {
    const project=ProjectData.validate(MapEditor.exportProject());project.ui=StudioUI.validate(project.ui);
    return TeamSource.stringify(role,TeamSource.part(role,project));
  }

  /** @param role {string} 담당 종류. @returns {void} 정확한 소스 파일명으로 다운로드. */
  function exportRole(role) {
    try {
      const info=TeamSource.roles[role],source=createSource(role);
      const url=URL.createObjectURL(new Blob([source],{type:'text/javascript;charset=utf-8'}));
      const a=document.createElement('a');a.href=url;a.download=info.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      status(info.name+' 다운로드를 요청했습니다.');
    }catch(error){status(error.message);}
  }

  /** @param role {string} 가져올 담당 종류. @param file {File} 내보낸 JS 파일.
   * @returns {Promise<boolean>} 다른 담당 설정은 보존하고 해당 담당만 교체. 파일 코드는 실행하지 않음. */
  async function importRole(role,file) {
    if(!file)return false;
    try {
      if(file.size>100*1024*1024)throw Error('파일은 100MB 이하여야 합니다.');
      const current=MapEditor.exportProject(),parts={};
      for(const key of Object.keys(TeamSource.roles))parts[key]=TeamSource.part(key,current);
      const incoming=TeamSource.parse(role,await file.text());
      if (role === 'asset') {
        const assets = new Map(current.assets.map(asset => [asset.id,asset]));
        for (const asset of incoming.assets) assets.set(asset.id,asset);
        incoming.assets = [...assets.values()];
      }
      parts[role]=incoming;
      const project=ProjectData.validate(TeamSource.combine(parts));project.ui=StudioUI.validate(project.ui);
      const json=JSON.stringify(project),ok=await MapEditor.load({size:json.length,text:async()=>json});
      if(!ok)throw Error('담당 파일을 불러오지 못했습니다. 프로젝트 오류 안내를 확인하세요.');
      status(TeamSource.roles[role].name+' 설정을 적용했습니다.');return true;
    }catch(error){status(error.message);return false;}
  }

  /** 매개변수 없음. @returns {Promise<boolean>} 현재 폴더의 세 담당 소스로 편집 초안을 교체.
   * 브라우저 자동 저장보다 Git에서 받은 소스를 보고 싶을 때 명시적으로 사용합니다. */
  async function loadSources() {
    try {
      const project=ProjectData.validate(TeamSource.fromScripts());
      const json=JSON.stringify(project),ok=await MapEditor.load({size:json.length,text:async()=>json});
      if(!ok)throw Error('소스 설정 불러오기 실패. 프로젝트 오류 안내를 확인하세요.');
      status('현재 폴더의 담당 소스를 불러왔습니다. 저장하지 않은 초안은 교체되었습니다.');return true;
    }catch(error){status(error.message);return false;}
  }

  /** 매개변수 없음. @returns {void} 담당 이름·정확한 파일 경로·내보내기/가져오기 버튼 표시. */
  function mount() {
    host=document.createElement('section');host.id='team-files';
    host.innerHTML='<h2>설정 파일</h2><p>프로젝트 설정을 파일별로 저장하거나 불러올 수 있습니다. 에셋을 참조하는 설정은 해당 에셋을 먼저 불러오세요.</p><div id="team-cards"></div><button id="team-load-sources">현재 폴더 소스로 초안 교체</button><p>이 버튼은 초안을 교체합니다. 중요한 초안은 먼저 프로젝트 JSON으로 저장하세요. 파일을 복사한 뒤에는 페이지를 새로고침해야 변경된 소스가 로드됩니다.</p><p id="team-status" role="status" aria-live="polite">불러온 설정은 현재 프로젝트에 적용됩니다.</p>';
    document.getElementById('map-editor').append(host);
    for(const [role,info]of Object.entries(TeamSource.roles)) {
      const card=document.createElement('article');card.className='team-card';
      const title=document.createElement('h3');title.textContent=info.name+' · '+info.owner;
      const description=document.createElement('p');description.textContent={ui:'문구·폰트·UI 배치',sound:'배경 음악·효과음·음량',asset:'가져온 이미지·글꼴·소리·모델과 기본 외형',map:'맵 목록·블록 배치·O/X 문제와 정답',physics:'옹기별 반지름·가속·감쇠·최대 속도·반발'}[role];
      const code=document.createElement('code');code.textContent='editor/src/config/'+info.name;
      const save=document.createElement('button');save.id='team-export-'+role;save.textContent='내보내기';save.onclick=()=>exportRole(role);
      const pick=document.createElement('button');pick.id='team-import-'+role;pick.textContent='불러오기';
      const input=document.createElement('input');input.type='file';input.accept='.js,text/javascript';input.hidden=true;input.id='team-file-'+role;
      pick.onclick=()=>input.click();input.onchange=()=>{importRole(role,input.files[0]);input.value='';};
      card.append(title,description,code,save,pick,input);host.querySelector('#team-cards').append(card);
    }
    host.querySelector('#team-load-sources').onclick=loadSources;
  }
  mount();return {createSource,exportRole,importRole,loadSources};
})();
