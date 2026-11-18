import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {readContentProject} from './project-files.mjs';

/** @param source {string} JS 원문. @param name {string} 함수명. @returns {string} 함수 선언을 추출. 문자열/주석의 중괄호는 무시. */
function namedFunction(source,name) {
  const start=source.indexOf('function '+name+'(');
  if(start<0)throw Error('플레이어 빌드가 참조하는 함수가 없습니다: '+name);
  let cursor=source.indexOf('(',start),parentheses=0;
  for(;cursor<source.length;cursor++){if(source[cursor]==='(')parentheses++;if(source[cursor]===')'&&--parentheses===0){cursor++;break;}}
  const begin=source.indexOf('{',cursor);
  if(begin<0)throw Error('함수 형식을 확인하세요: '+name);
  let depth=0,quote='',line=false,block=false;
  for(let i=begin;i<source.length;i++){
    const c=source[i],n=source[i+1];
    if(line){if(c==='\n')line=false;continue;}
    if(block){if(c==='*'&&n==='/'){block=false;i++;}continue;}
    if(quote){if(c==='\\'){i++;continue;}if(c===quote)quote='';continue;}
    if(c==='/'&&n==='/'){line=true;i++;continue;}if(c==='/'&&n==='*'){block=true;i++;continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='{')depth++;
    if(c==='}'){depth--;if(depth===0)return source.slice(start,i+1);}
  }
  throw Error('함수 끝을 찾지 못했습니다: '+name);
}

/** @param base {string} 소스 루트. @returns {string} 편집 DOM이 없는 UI 설정 검증/반영 모듈. */
function settingsModule(base) {
  const studio=fs.readFileSync(path.join(base,'src/editor/StudioUI.js'),'utf8');
  const defaults=studio.match(/const defaults=([^;]+);/);
  if(!defaults)throw Error('StudioUI 기본 설정을 찾을 수 없습니다.');
  return `const StudioUI=(()=>{const defaults=${defaults[1]};let settings={...defaults};const defaultLayout=JSON.parse(JSON.stringify(UI_LAYOUT));const defaultTexts={...UI_TEXT},defaultOnggiTexts=collectOnggiText();\n${namedFunction(studio,'collectOnggiText')}\n${namedFunction(studio,'applyTextSettings')}\n${namedFunction(studio,'validate')}\nfunction apply(value){const next=validate(value);settings={...next};delete settings.layout;GAME_CONFIG.ui.fontFamily=settings.fontFamily;applyTextSettings(next);OnggiPhysics.applySelected();for(const [screen,items]of Object.entries(next.layout))for(const [id,props]of Object.entries(items))Object.assign(UI_LAYOUT[screen][id],props);dirty=true;}return {validate,apply,get settings(){return settings;}};})();`;
}

/** @param base {string} 소스 루트. @returns {{prefix:string,suffix:string}} 프로젝트 JSON을 끼워 넣을 단일 HTML 템플릿. */
export function makeTemplate(base) {
  const read=file=>fs.readFileSync(path.join(base,'src',file),'utf8');
  const order=['config/UILayout.js','config/GameConfig.js','config/UIText.js','render/Renderer.js','models/Onggi.js','data/onggiData.js','STAGES','editor/BlockMap.js','editor/ProjectData.js','game/GyroInput.js','game/OnggiPhysics.js','game/Physics.js','map/Map.js','core/Game.js','ui/UI.js','camera/Camera.js','game/Input.js','editor/AssetBank.js','SETTINGS','main.js','export/PlayerBootstrap.js'];
  const scripts=order.map(file=>{
    let source=file==='STAGES'?'const STAGES=[];':file==='SETTINGS'?settingsModule(base):read(file);
    if(file==='core/Game.js'){
      source=source.replace('MapEditor.advance()','PlayerGame.advance()').replaceAll('MapEditor.playProject()','PlayerGame.start()');
      if(!source.includes("if(id==='start'||id==='replay'){PlayerGame.start();return;}"))source=source.replace('function action(id) {',"function action(id) {\n  if(id==='start'||id==='replay'){PlayerGame.start();return;}");
    }
    if(file==='main.js')source=source.replace(/\ninitializeGame\(\);\s*$/,'\n');
    return '<script>\n'+source.replace(/<\/script/gi,'<\\/script')+'\n</script>';
  }).join('\n');
  const prefix='<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>데굴데굴 옹기</title><style>*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#292f2a}canvas{display:block;width:100%;height:100%;object-fit:contain;touch-action:none;outline:none}#error{display:none;color:white;padding:24px}#player-loading{position:fixed;inset:30% 15%;padding:24px;background:#fffdf3;color:#344638;z-index:50;font:18px/1.6 sans-serif}#player-loading[hidden],.studio-dialog[hidden]{display:none}.studio-dialog{position:fixed;inset:0;z-index:100;background:#223425bb;display:flex;align-items:center;justify-content:center;padding:20px;font:16px/1.6 sans-serif}.studio-card{max-width:620px;padding:28px;background:#fffdf3;color:#30462f;border-radius:24px}.studio-card button,#control-bar button{padding:10px;border:1px solid #a4b493;border-radius:12px;background:#f6f6e9;color:#405f40;cursor:pointer}#control-bar{position:fixed;top:10px;left:10px;z-index:30;display:flex;gap:5px;flex-wrap:wrap;max-width:95%}@media(max-width:700px){#control-bar{top:auto;bottom:8px}#control-bar button{font-size:11px;padding:6px}}</style></head><body><canvas id="game" tabindex="0" aria-label="옹기 게임"></canvas><p id="error" role="alert">WebGL을 시작할 수 없습니다. WebGL을 지원하는 브라우저에서 열어 주세요.</p><p id="player-loading" role="status">게임과 에셋을 준비하고 있습니다…</p>\n<script type="application/json" id="onggi-project">';
  return {prefix,suffix:'</script>\n'+scripts+'\n</body></html>'};
}

/** @param base {string} 소스 루트. @param projectFile {string} 내장할 JSON 경로. @returns {object} 템플릿과 실제 게임 생성 결과. */
export function buildPlayer(base,projectFile) {
  const template=makeTemplate(base),context=vm.createContext({});
  for(const file of ['config/UILayout.js','config/GameConfig.js','config/UIText.js','data/onggiData.js','game/OnggiPhysics.js','editor/BlockMap.js','editor/ProjectData.js','editor/GameDocument.js'])vm.runInContext(fs.readFileSync(path.join(base,'src',file),'utf8'),context);
  vm.runInContext(settingsModule(base),context);
  const committedHTML=path.resolve(base,'..','release','index.html');
  const folderProject=path.resolve(base,'..','release','project.onggi.json');
  const mapDir=path.join(base,'content/maps');
  const hasSourceMaps=fs.existsSync(mapDir)&&fs.readdirSync(mapDir).some(name=>name.endsWith('.json'));
  const contentHTML=path.join(base,'content/game.html');
  const fallback=!hasSourceMaps?(fs.existsSync(folderProject)?folderProject:(fs.existsSync(committedHTML)&&fs.readFileSync(committedHTML,'utf8').includes('<script type="application/json" id="onggi-project">')?committedHTML:null)):null;
  const hasTeam=fs.existsSync(path.join(base,'src/config/UIConfig.js'));
  const authored=projectFile||(!hasTeam?((fs.existsSync(contentHTML)?contentHTML:null)||fallback):null);
  if(authored){context.rawDocument=fs.readFileSync(authored,'utf8');context.input=vm.runInContext('GameDocument.extractProject(rawDocument)',context);}else context.input=readContentProject(base);
  const project=vm.runInContext('var p=ProjectData.validate(input);p.ui=StudioUI.validate(p.ui);p.maps.forEach(m=>BlockMap.compile(m,OnggiPhysics.maxRadius(p.ui.onggiPhysics)));p',context);
  const json=JSON.stringify(project).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  const html=template.prefix+json+template.suffix;
  fs.mkdirSync(path.join(base,'src/export'),{recursive:true});
  fs.writeFileSync(path.join(base,'src/export/PlayerBundle.js'),'// 자동 생성 파일. 직접 수정하지 말고 npm run build로 다시 생성하세요.\nconst GAME_PLAYER_TEMPLATE='+JSON.stringify(template)+';\n');
  fs.mkdirSync(path.join(base,'content'),{recursive:true});fs.writeFileSync(path.join(base,'content/project.generated.json'),JSON.stringify(project,null,2));
  return {html,template,maps:project.maps.length};
}

if(typeof process!=='undefined'&&process.argv?.[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])) {
  const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const result=buildPlayer(base,process.argv[2]?path.resolve(process.argv[2]):undefined);
  console.log('내보내기 템플릿 생성 완료. 폴더 배포는 npm run build를 사용하세요. 맵 수:',result.maps);
}
