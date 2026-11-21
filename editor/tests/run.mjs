import {runAssetLimitTests} from './asset-limits.test.mjs';
import {runTeamSourceTests} from './team-source.test.mjs';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildFolder} from '../tools/build-folder.mjs';
import {runFolderPlayerTests} from './folder-player.test.mjs';
import {runStudioTests} from './studio.test.mjs';
import {runPlayerTests} from './player.test.mjs';
import {runProjectFileTests} from './project-files.test.mjs';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const result=buildFolder(base);
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
