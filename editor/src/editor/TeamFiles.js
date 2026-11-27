/* 담당별 내보내기·가져오기 UI. 설정을 바꿔도 해당 담당 파일만 저장합니다.
 * 읽기: mount → configFolder → exportRole/exportAll/importRole → TeamSource → MapEditor.load.
 * Chrome·Edge에서는 editor/src/config 폴더를 한 번 선택해 두면 그 폴더의 파일에 정확한 이름으로 바로 덮어씁니다.
 * 다운로드 폴더의 "MapConfig (3).js" 같은 이름이나 엉뚱한 위치에 복사하는 실수를 막기 위한 것입니다.
 * 폴더 저장을 지원하지 않는 브라우저에서는 예전처럼 다운로드합니다. */
const TeamFiles = (() => {
  let host, folder = null;
  const canUseFolder = typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
  // 편집기 설정 폴더에만 있는 파일. 엉뚱한 폴더를 고르면 저장하지 않습니다.
  const folderMarkers = ['GameConfig.js', 'UILayout.js', 'UIText.js'];

  /** @param action {string} get/put. @param value {FileSystemDirectoryHandle} 저장할 폴더. @returns {Promise<any>} 다음 실행 때도 같은 폴더를 쓰도록 브라우저(IndexedDB)에 보관. */
  function remember(action, value) {
    return new Promise(resolve => {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const request = indexedDB.open('onggi-editor', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('handles');
      request.onerror = () => resolve(null);
      request.onsuccess = () => {
        // 보관에 실패해도 저장은 계속합니다. 다음 실행 때 폴더를 한 번 더 고르면 됩니다.
        try {
          const store = request.result.transaction('handles', action === 'put' ? 'readwrite' : 'readonly').objectStore('handles');
          const job = action === 'put' ? store.put(value, 'config') : store.get('config');
          job.onsuccess = () => resolve(job.result || null);
          job.onerror = () => resolve(null);
        } catch { resolve(null); }
      };
    });
  }

  /** @param dir {FileSystemDirectoryHandle} 고른 폴더. @returns {Promise<void>} editor/src/config가 아니면 Error. */
  async function verifyFolder(dir) {
    for (const name of folderMarkers) {
      try { await dir.getFileHandle(name); }
      catch { throw Error('editor/src/config 폴더를 선택하세요. 고른 폴더(' + dir.name + ')에는 ' + name + '이(가) 없습니다.'); }
    }
  }

  /** 매개변수 없음. @returns {void} 연결된 저장 폴더 안내를 갱신. */
  function showFolder() {
    const label = host.querySelector('#team-folder-label');
    label.textContent = !canUseFolder ? '이 브라우저는 폴더에 바로 저장할 수 없어 다운로드로 저장합니다. Chrome이나 Edge를 권장합니다.'
      : folder ? '저장 폴더: …/' + folder.name + ' (내보내면 이 폴더의 파일에 바로 덮어씁니다)'
      : '저장 폴더가 아직 없습니다. 처음 내보낼 때 editor/src/config 폴더를 선택하세요.';
  }

  /** @param pickNew {boolean} true면 폴더를 다시 고릅니다. @returns {Promise<FileSystemDirectoryHandle>} 쓰기 권한이 있는 설정 폴더. 취소하면 AbortError. */
  async function configFolder(pickNew = false) {
    if (!pickNew) {
      folder = folder || await remember('get');
      if (folder) {
        if (await folder.queryPermission({ mode: 'readwrite' }) === 'granted') return folder;
        if (await folder.requestPermission({ mode: 'readwrite' }) === 'granted') return folder;
      }
    }
    const picked = await window.showDirectoryPicker({ id: 'onggi-config', mode: 'readwrite' });
    await verifyFolder(picked);
    folder = picked;
    await remember('put', picked);
    showFolder();
    return folder;
  }

  /** @param dir {FileSystemDirectoryHandle} 설정 폴더. @param name {string} 파일 이름. @param text {string} 내용. @returns {Promise<void>} 파일을 통째로 덮어씀. */
  async function writeFile(dir, name, text) {
    const writable = await (await dir.getFileHandle(name, { create: true })).createWritable();
    await writable.write(text);
    await writable.close();
  }

  /** @param name {string} 파일 이름. @param source {string} 내용. @returns {void} 폴더 저장을 못 쓸 때 다운로드. */
  function download(name, source) {
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  /** @param text {string} 상태 안내. @returns {void} 편집기 담당별 저장 영역에 표시. */
  function status(text){host.querySelector('#team-status').textContent=text;}

  /** @param role {string} ui/map/physics. @returns {string} 해당 담당 설정만 든 JS 원문. 전체 프로젝트를 함께 저장하지 않음. */
  function createSource(role) {
    const project=ProjectData.validate(MapEditor.exportProject());project.ui=StudioUI.validate(project.ui);
    return TeamSource.stringify(role,TeamSource.part(role,project));
  }

  /** @param roles {string[]} 저장할 담당 종류. @param what {string} 안내용 이름. @returns {Promise<boolean>} 저장했으면 true.
   * 설정 폴더가 있으면 그 폴더에 정확한 이름으로 덮어쓰고, 없으면 다운로드합니다. */
  async function save(roles, what) {
    if (!MapEditor.confirmExport(what)) { status('예제 맵 상태입니다. 그래도 저장하려면 한 번 더 누르세요.'); return false; }
    let files;
    try { files = roles.map(role => [TeamSource.roles[role].name, createSource(role)]); }
    catch (error) { status(error.message); return false; }
    if (canUseFolder) {
      try {
        const dir = await configFolder();
        for (const [name, source] of files) await writeFile(dir, name, source);
        status(files.map(([name]) => name).join(', ') + '을(를) editor/src/config에 저장했습니다. 커밋하면 팀에 반영됩니다.');
        return true;
      } catch (error) {
        if (error.name === 'AbortError') { status('저장을 취소했습니다.'); return false; }
        status(error.message);
        return false;
      }
    }
    for (const [name, source] of files) download(name, source);
    status(files.map(([name]) => name).join(', ') + ' 다운로드를 요청했습니다. 다운로드 폴더의 가장 최근 파일을 정확히 같은 이름으로 editor/src/config에 덮어쓰세요.');
    return true;
  }

  /** @param role {string} 담당 종류. @returns {Promise<boolean>} 해당 담당 파일 하나만 저장. */
  function exportRole(role) { return save([role], TeamSource.roles[role]?.name || role); }

  /** 매개변수 없음. @returns {Promise<boolean>} 다섯 담당 파일을 한 번에 저장. 맵·외형·문구를 함께 바꿨을 때 빠뜨리지 않게 합니다. */
  function exportAll() { return save(Object.keys(TeamSource.roles), '모든 설정 파일'); }

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
    host.innerHTML='<h2>설정 파일</h2><p>프로젝트 설정을 파일별로 저장하거나 불러올 수 있습니다. 에셋을 참조하는 설정은 해당 에셋을 먼저 불러오세요.</p><div id="team-folder"><button id="team-export-all">모든 설정 파일 저장</button> <button id="team-pick-folder">저장 폴더 다시 선택</button><p id="team-folder-label"></p></div><div id="team-cards"></div><button id="team-load-sources">현재 폴더 소스로 초안 교체</button><p>이 버튼은 초안을 교체합니다. 중요한 초안은 먼저 프로젝트 JSON으로 저장하세요. 파일을 복사한 뒤에는 페이지를 새로고침해야 변경된 소스가 로드됩니다.</p><p id="team-status" role="status" aria-live="polite">불러온 설정은 현재 프로젝트에 적용됩니다.</p>';
    document.getElementById('map-editor').append(host);
    for(const [role,info]of Object.entries(TeamSource.roles)) {
      const card=document.createElement('article');card.className='team-card';
      const title=document.createElement('h3');title.textContent=info.name+' · '+info.owner;
      const description=document.createElement('p');description.textContent={ui:'문구·폰트·UI 배치',sound:'배경 음악·효과음·음량',asset:'가져온 이미지·글꼴·소리·모델과 기본 외형',map:'맵 목록·블록 배치·O/X 문제와 정답',physics:'옹기별 반지름·가속·감쇠·최대 속도·반발'}[role];
      const code=document.createElement('code');code.textContent='editor/src/config/'+info.name;
      const store=document.createElement('button');store.id='team-export-'+role;store.textContent='저장';store.onclick=()=>exportRole(role);
      const pick=document.createElement('button');pick.id='team-import-'+role;pick.textContent='불러오기';
      const input=document.createElement('input');input.type='file';input.accept='.js,text/javascript';input.hidden=true;input.id='team-file-'+role;
      pick.onclick=()=>input.click();input.onchange=()=>{importRole(role,input.files[0]);input.value='';};
      card.append(title,description,code,store,pick,input);host.querySelector('#team-cards').append(card);
    }
    host.querySelector('#team-load-sources').onclick=loadSources;
    host.querySelector('#team-export-all').onclick=exportAll;
    const pickFolder=host.querySelector('#team-pick-folder');pickFolder.hidden=!canUseFolder;
    pickFolder.onclick=async()=>{try{await configFolder(true);status('저장 폴더를 바꿨습니다.');}catch(error){status(error.name==='AbortError'?'폴더 선택을 취소했습니다.':error.message);}};
    showFolder();
    if(canUseFolder)remember('get').then(saved=>{if(saved&&!folder){folder=saved;showFolder();}});
  }
  mount();return {createSource,exportRole,exportAll,importRole,loadSources};
})();
