import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readTeamProject} from '../tools/team-project.mjs';

/** @param base {string} editor 루트. @returns {string} 담당 설정 분리·안전 파싱·소스 조립 검사. */
export function runTeamSourceTests(base) {
  const context=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(base,'src/editor/TeamSource.js'),'utf8'),context);
  const run=s=>vm.runInContext(s,context);context.project=readTeamProject(base);
  const initial=run("Object.fromEntries(['ui','map','physics'].map(r=>[r,TeamSource.stringify(r,TeamSource.part(r,project))]))");
  context.project.ui.texts.drawTitle_01='UI 수정';
  const modified=run("Object.fromEntries(['ui','map','physics'].map(r=>[r,TeamSource.stringify(r,TeamSource.part(r,project))]))");
  assert.notEqual(initial.ui,modified.ui);assert.equal(initial.map,modified.map);assert.equal(initial.physics,modified.physics);
  const parent=path.join(base,'tests'),temp=fs.mkdtempSync(path.join(parent,'.team-test-'));
  try {
    fs.mkdirSync(path.join(temp,'src/editor'),{recursive:true});fs.mkdirSync(path.join(temp,'src/config'),{recursive:true});
    fs.copyFileSync(path.join(base,'src/editor/TeamSource.js'),path.join(temp,'src/editor/TeamSource.js'));
    for(const [role,name] of [['ui','UIConfig.js'],['map','MapConfig.js'],['physics','PhysicsConfig.js']])fs.writeFileSync(path.join(temp,'src/config',name),modified[role]);
    assert.equal(readTeamProject(temp).ui.texts.drawTitle_01,'UI 수정','build reads new UI source');
    fs.appendFileSync(path.join(temp,'src/config/UIConfig.js'),'\nthrow Error("do not run")');
    assert.throws(()=>readTeamProject(temp),'source JS is parsed, never evaluated');
    fs.unlinkSync(path.join(temp,'src/config/MapConfig.js'));assert.throws(()=>readTeamProject(temp),'partial source set rejected');
    context.parts={ui:run("TeamSource.part('ui',project)"),map:run("TeamSource.part('map',project)"),physics:run("TeamSource.part('physics',project)")};
    context.parts.ui.assets=[{id:'same',name:'a.wav',kind:'audio',data:'one'}];context.parts.map.assets=[{id:'same',name:'a.wav',kind:'audio',data:'two'}];
    assert.throws(()=>run('TeamSource.combine(parts)'),'conflicting shared asset IDs rejected');
  } finally {
    const resolved=path.resolve(temp);
    if(!resolved.startsWith(path.resolve(parent)+path.sep)||!path.basename(resolved).startsWith('.team-test-'))throw Error('임시 경로 오류');
    fs.rmSync(resolved,{recursive:true,force:true});
  }
  return 'PASS: UI-only export leaves map/physics bytes unchanged; build reads owner configs; JS never evaluated; partial files and asset conflicts rejected.';
}
