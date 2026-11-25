import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {TextEncoder} from 'node:util';
import {Buffer} from 'node:buffer';
import {fileURLToPath} from 'node:url';
import {buildPlayer} from './build-player.mjs';

/** @param single {object} 기존 플레이어 빌드 결과. @returns {object} 코드가 개별 JS에 들어 있는 폴더 템플릿. */
function folderTemplate(single) {
  const names=['config/UILayout.js','config/GameConfig.js','config/UIText.js','render/Lighting.js','render/Renderer.js','models/Onggi.js','data/onggiData.js','map/StageData.js','map/BlockMap.js','data/ProjectData.js','game/GyroInput.js','ui/SettingsMenu.js','game/OnggiPhysics.js','game/Physics.js','map/Map.js','map/Obstacles.js','core/PlayRecord.js','core/Game.js','ui/UI.js','camera/Camera.js','game/Input.js','render/AssetBank.js','ui/UIPageData.js','ui/PageUI.js','ui/UISettings.js','main.js','core/PlayerGame.js'];
  const sources=[...single.template.suffix.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  if(sources.length!==names.length)throw Error('플레이어 script 순서가 바뀌었습니다. 폴더 빌드 목록을 함께 수정하세요.');
  const files={};
  names.forEach((name,i)=>{
    let source=sources[i];
    if(name==='core/PlayerGame.js'){
      const old="const project=ProjectData.validate(JSON.parse(document.getElementById('onggi-project').textContent));";
      if(!source.includes(old))throw Error('플레이어 프로젝트 로더가 변경되었습니다.');
      source=source.replace(old,"const embedded=window.ONGGI_PROJECT;\n      const project=ProjectData.validate({...embedded,assets:embedded.assets.map(a=>({...a,data:window.ONGGI_ASSET_DATA[a.id]}))});");
    }
    files['src/'+name]=source.trim()+'\n';
  });
  const css=single.template.prefix.match(/<style>([\s\S]*?)<\/style>/)?.[1];
  if(!css)throw Error('플레이어 스타일을 찾을 수 없습니다.');
  files['assets/styles/game.css']=css;
  files['index.html']='<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>데굴데굴 옹기</title>\n<link rel="stylesheet" href="assets/styles/game.css">\n</head>\n<body>\n<canvas id="game" tabindex="0" aria-label="옹기 게임"></canvas>\n<p id="error" role="alert">WebGL 2를 시작할 수 없습니다. 하드웨어 가속을 켜고 최신 브라우저에서 열어 주세요.</p>\n<p id="player-loading" role="status">게임과 로컬 에셋을 준비하고 있습니다… ZIP 안에서 열었다면 먼저 전체 압축을 푼 뒤 폴더의 index.html을 여세요. 준비가 계속되면 src와 assets 폴더가 있는지 확인하세요.</p>\n<script defer src="src/data/project.js"></script>\n<!--ONGGI_ASSETS-->\n'+names.map(name=>'<script defer src="src/'+name+'"></script>').join('\n')+'\n</body>\n</html>\n';
  return {files};
}

/** @param base {string} 편집 소스 루트. @param projectFile {string|undefined} 내장할 프로젝트.
 * @param options {object} release:false면 ../release를 건드리지 않고 편집기용 생성 파일만 갱신합니다.
 * @returns {object} {files,project,zip,maps}. release는 생성물 전용 폴더입니다. */
export function buildFolder(base,projectFile,options={}) {
  const single=buildPlayer(base,projectFile),project=JSON.parse(fs.readFileSync(path.join(base,'content/project.generated.json'),'utf8'));
  const template=folderTemplate(single),context=vm.createContext({TextEncoder,atob:text=>Buffer.from(text,'base64').toString('binary')});
  vm.runInContext(fs.readFileSync(path.join(base,'src/export/FolderExport.js'),'utf8'),context);
  context.template=template;context.project=project;
  const files=vm.runInContext('FolderExport.createFiles(template,project)',context),zip=vm.runInContext('FolderExport.zip(FolderExport.createFiles(template,project))',context);
  if(options.release!==false){
    const release=path.resolve(base,'..','release'),realBase=fs.realpathSync(path.resolve(base,'..'));
    if(fs.existsSync(release)){
      if(fs.lstatSync(release).isSymbolicLink()||!fs.realpathSync(release).startsWith(realBase+path.sep))throw Error('생성물 폴더 경로가 소스 범위 밖입니다.');
      fs.rmSync(release,{recursive:true,force:true});
    }
    fs.mkdirSync(release,{recursive:true});
    for(const [name,data]of Object.entries(files)){const file=path.join(release,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data);}
  }
  fs.writeFileSync(path.join(base,'src/export/FolderBundle.js'),'// 자동 생성. src를 바꾼 뒤 npm run build:editor로 갱신합니다.\nconst GAME_FOLDER_TEMPLATE='+JSON.stringify(template,null,1)+';\n');
  fs.mkdirSync(path.join(base,'src/data'),{recursive:true});
  fs.writeFileSync(path.join(base,'src/data/EditorProject.js'),'// 자동 생성: 편집기 첫 실행 기본 프로젝트.\nconst EDITOR_INITIAL_PROJECT='+JSON.stringify(project)+';\n');
  return {files,project,zip,maps:project.maps.length,legacyHTML:single.html};
}

if(typeof process!=='undefined'&&process.argv?.[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
  const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const args=process.argv.slice(2),editorOnly=args.includes('--editor-only'),projectFile=args.find(a=>!a.startsWith('--'));
  const result=buildFolder(base,projectFile?path.resolve(projectFile):undefined,{release:!editorOnly});
  console.log(editorOnly?'편집기 내보내기 템플릿 갱신 완료(release 변경 없음). 맵 수:':'../release/index.html + src/ + assets/ 생성 완료. 맵 수:',result.maps);
}
