/* 읽기: createHTML → download. 기본 배포는 index.html + src + assets 폴더 ZIP입니다. createHTML은 구버전 테스트 호환용입니다. */
const GameExport = (() => {
  /** @param value {object} 맵/UI/에셋이 들어 있는 프로젝트. @returns {string} 편집 UI가 없는 독립 실행 HTML. */
  function createHTML(value) {
    if(typeof GAME_PLAYER_TEMPLATE==='undefined')throw Error('게임 빌드가 없습니다. 개발 소스에서는 npm run build 후 페이지를 새로고침하세요.');
    const project=ProjectData.validate(value);
    project.ui=StudioUI.validate(project.ui);
    project.maps.forEach((map,i)=>{try{BlockMap.compile(map,OnggiPhysics.maxRadius(project.ui.onggiPhysics));}catch(error){throw Error((i+1)+'번 맵: '+error.message);}});
    // JSON이 script 태그를 끝내지 못하도록 HTML 문맥에서의 특수 문자를 이스케이프합니다.
    const json=JSON.stringify(project).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
    return GAME_PLAYER_TEMPLATE.prefix+json+GAME_PLAYER_TEMPLATE.suffix;
  }

  /** 매개변수 없음. @returns {Promise<void>} 현재 프로젝트의 폴더 ZIP을 다운로드. 실패 시 기존 프로젝트 유지. */
  async function download() {
    if(!MapEditor.confirmExport('release ZIP'))return;
    const notice=document.getElementById('editor-status');
    try {
      notice.textContent='폴더형 게임 ZIP을 만드는 중입니다…';
      const files=createFolderFiles(MapEditor.exportProject());
      const data=FolderExport.zip(files),url=URL.createObjectURL(new Blob([data],{type:'application/zip'}));
      const link=document.createElement('a');link.href=url;link.download='onggi-game-folder.zip';link.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
      notice.textContent='ZIP 저장 완료. 압축을 풀고 index.html을 여세요. src와 assets도 함께 전달해야 합니다.';
    }catch(error){notice.textContent='게임 내보내기 실패: '+error.message;}
  }

  /** 매개변수 없음. @returns {void} 편집기 안에 게임용 내보내기 버튼을 연결. */
  function initialize() {
    const button=document.createElement('button');button.id='export-player';button.textContent='release ZIP 내보내기';button.onclick=download;
    document.getElementById('editor-file-menu').append(button);
  }
  /** @param value {object} 현재 프로젝트. @returns {object} 파일별 바이트. 프로젝트/에셋을 HTML에 인라인하지 않습니다. */
  function createFolderFiles(value) {
    if(typeof GAME_FOLDER_TEMPLATE==='undefined')throw Error('src/export/FolderBundle.js가 없습니다. npm run build:editor 후 페이지를 새로고침하세요.');
    const project=ProjectData.validate(value);project.ui=StudioUI.validate(project.ui);
    project.maps.forEach((map,i)=>{try{BlockMap.compile(map,OnggiPhysics.maxRadius(project.ui.onggiPhysics));}catch(error){throw Error((i+1)+'번 맵: '+error.message);}});
    return FolderExport.createFiles(GAME_FOLDER_TEMPLATE,project);
  }
  return {createHTML,createFolderFiles,download,initialize};
})();
GameExport.initialize();
