import {readTeamProject} from './team-project.mjs';
import fs from 'node:fs';
import {Buffer} from 'node:buffer';
import path from 'node:path';

const formats={png:['image','image/png'],jpg:['image','image/jpeg'],jpeg:['image','image/jpeg'],webp:['image','image/webp'],gif:['image','image/gif'],ttf:['font','font/ttf'],otf:['font','font/otf'],woff:['font','font/woff'],woff2:['font','font/woff2'],mp3:['audio','audio/mpeg'],wav:['audio','audio/wav'],ogg:['audio','audio/ogg'],obj:['model','text/plain']};

/** @param dir {string} 폴더. @returns {string[]} .json 파일을 파일명 순서로 반환. 프로젝트 맵 순서로 사용. */
function jsonFiles(dir) {return fs.existsSync(dir)?fs.readdirSync(dir).filter(n=>n.endsWith('.json')).sort():[];}

/** @param base {string} cg 소스 루트. @returns {object} 맵별 JSON·UI·에셋 참조 파일을 합친 프로젝트. */
export function readContentProject(base) {
  const team=readTeamProject(base);if(team)return team;
  const root=path.join(base,'content'),files=jsonFiles(path.join(root,'maps'));
  if(!files.length)throw Error('content/maps에 최소 한 개의 맵 JSON이 필요합니다.');
  const maps=files.map(file=>JSON.parse(fs.readFileSync(path.join(root,'maps',file),'utf8')));
  const ui=fs.existsSync(path.join(root,'ui.json'))?JSON.parse(fs.readFileSync(path.join(root,'ui.json'),'utf8')):{};
  const assetRoot=fs.realpathSync(path.join(base,'assets'));
  const assets=jsonFiles(path.join(root,'assets')).map(file=>{
    const record=JSON.parse(fs.readFileSync(path.join(root,'assets',file),'utf8'));
    if(typeof record.id!=='string'||!/^[\w-]{1,80}$/.test(record.id)||typeof record.file!=='string')throw Error('에셋 참조의 id/file을 확인하세요: '+file);
    const absolute=fs.realpathSync(path.resolve(base,record.file)),relative=path.relative(assetRoot,absolute);
    if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('에셋 파일은 assets 폴더 안에 있어야 합니다.');
    const spec=formats[path.extname(absolute).slice(1).toLowerCase()];if(!spec)throw Error('지원하지 않는 에셋: '+record.file);
    const bytes=fs.readFileSync(absolute);if(bytes.length>20*1024*1024)throw Error('에셋은 개별 20MB 이하여야 합니다.');
    return {id:record.id,name:record.name||path.basename(absolute),kind:spec[0],data:'data:'+spec[1]+';base64,'+bytes.toString('base64')};
  });
  return {kind:'onggi-project',version:4,maps,ui,assets};
}

/** @param project {object} 편집기에서 저장한 v4 프로젝트. @param output {string} 새 출력 폴더.
 * @returns {void} 맵/UI/실제 에셋 파일로 분리. 기존 폴더는 덮어쓰지 않음. */
export function splitProject(project,output) {
  if(project?.kind!=='onggi-project'||project.version!==4||!Array.isArray(project.maps)||!Array.isArray(project.assets))throw Error('편집기의 프로젝트 JSON을 입력하세요.');
  if(fs.existsSync(output))throw Error('출력 폴더가 이미 있습니다. 새 폴더 이름을 지정하세요.');
  // 모든 에셋을 먼저 확인해 잘못된 데이터 때문에 출력이 반쯤 만들어지는 일을 줄입니다.
  const assets=project.assets.map(record=>{
    if(!/^[\w-]{1,80}$/.test(record.id))throw Error('잘못된 에셋 ID');
    const ext=path.extname(record.name).slice(1).toLowerCase(),spec=formats[ext];
    if(!spec||record.kind!==spec[0]||!record.data.startsWith('data:'+spec[1]+';base64,'))throw Error('지원하지 않는 에셋');
    return {record,ext,bytes:Buffer.from(record.data.split(',')[1],'base64')};
  });
  const write=(file,value)=>{const target=path.join(output,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(value,null,2)+'\n');};
  project.maps.forEach((map,i)=>write('content/maps/'+String(i+1).padStart(2,'0')+'-stage.json',map));
  write('content/ui.json',project.ui||{});
  fs.mkdirSync(path.join(output,'assets/imported'),{recursive:true});fs.mkdirSync(path.join(output,'content/assets'),{recursive:true});
  for(const {record,ext,bytes}of assets){const file='assets/imported/'+record.id+'.'+ext;fs.writeFileSync(path.join(output,file),bytes);write('content/assets/'+record.id+'.json',{id:record.id,name:record.name,file});}
}
