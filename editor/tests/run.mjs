import {runAssetLimitTests} from './asset-limits.test.mjs';
import {runTeamSourceTests} from './team-source.test.mjs';
import fs from 'node:fs';
import os from 'node:os';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildFolder} from '../tools/build-folder.mjs';
import {runFolderPlayerTests} from './folder-player.test.mjs';
import {runStudioTests} from './studio.test.mjs';
import {runPlayerTests} from './player.test.mjs';
import {runProjectFileTests} from './project-files.test.mjs';
const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// 테스트는 임시 사본에서 빌드합니다. 작업 폴더의 release와 생성 파일은 변경하지 않습니다.
const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'onggi-test-'));
process.on('exit',()=>fs.rmSync(tempRoot,{recursive:true,force:true}));
const base=path.join(tempRoot,'editor');
const generated=new Set(['node_modules','content/project.generated.json','src/data/EditorProject.js','src/export/PlayerBundle.js','src/export/FolderBundle.js'].map(p=>path.join(source,p)));
fs.cpSync(source,base,{recursive:true,filter:file=>!generated.has(file)});
const index=fs.readFileSync(path.join(base,'index.html'),'utf8');
for(const [,file] of index.matchAll(/<script defer src="([^"]+)"/g)){
  if(generated.has(path.join(source,file)))continue;
  // Windows는 대소문자를 구분하지 않으므로 실제 목록과 비교해 GitHub Pages/Linux에서도 열리는지 확인합니다.
  if(!fs.readdirSync(path.join(base,path.dirname(file))).includes(path.basename(file)))throw Error('index.html 경로의 대소문자를 확인하세요: '+file);
}
console.log('PASS: index.html script paths match exact file names.');
const result=buildFolder(base);
const readBundle=root=>fs.readFileSync(path.join(root,'src/export/FolderBundle.js'),'utf8').replace(/\r\n/g,'\n');
if(!fs.existsSync(path.join(source,'src/export/FolderBundle.js'))||readBundle(source)!==readBundle(base))throw Error('src/export/FolderBundle.js가 최신 src와 다릅니다. npm run build:editor 실행 후 함께 커밋하세요.');
console.log('PASS: committed release template is up to date.');
let exported,folderFiles;
console.log(await runStudioTests(base,{onExport:html=>{exported=html;},onFolderExport:files=>{folderFiles=files;}}));
console.log(await runPlayerTests(base,exported));
console.log(await runPlayerTests(base,result.legacyHTML));
console.log(await runFolderPlayerTests(base,folderFiles));
console.log(await runFolderPlayerTests(base,result.files));
console.log(runProjectFileTests(base));
console.log(runTeamSourceTests(base));
function syntax(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())syntax(file);else if(file.endsWith('.js'))new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});}}
syntax(path.join(base,'src'));
console.log('PASS: all source JavaScript syntax');

console.log(await runAssetLimitTests(base));
