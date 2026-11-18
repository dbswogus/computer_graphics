import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Buffer} from 'node:buffer';
import {splitProject,readContentProject} from '../tools/project-files.mjs';

/** @param base {string} 소스 루트. @returns {string} Git용 분리/조립과 경로 범위 검사 결과. */
export function runProjectFileTests(base) {
  const parent=path.resolve(base,'tests'),temp=fs.mkdtempSync(path.join(parent,'.project-test-'));
  try {
    const project=JSON.parse(fs.readFileSync(path.join(base,'tests/fixtures/project.json'),'utf8'));
    const bytes=fs.readFileSync(path.join(base,'assets/models/sample-pyramid.obj'));
    project.assets=[{id:'pyramid',name:'sample-pyramid.obj',kind:'model',data:'data:text/plain;base64,'+bytes.toString('base64')}];
    const output=path.join(temp,'imported');splitProject(project,output);
    const assembled=readContentProject(output);
    assert.deepEqual(JSON.parse(JSON.stringify(assembled)),project,'map/ui/asset data preserved across split+assemble');
    assert.throws(()=>splitProject(project,output),'existing output is not overwritten');
    fs.writeFileSync(path.join(output,'content/assets/pyramid.json'),JSON.stringify({id:'pyramid',file:'content/ui.json'}));
    assert.throws(()=>readContentProject(output),'outside-assets path rejected');
    assert(bytes.equals(Buffer.from(project.assets[0].data.split(',')[1],'base64')));
    return 'PASS: split/assemble project preserves maps/UI/asset bytes; existing folder guard and asset-path scope.';
  }finally{
    const resolved=path.resolve(temp);
    if(!resolved.startsWith(parent+path.sep)||!path.basename(resolved).startsWith('.project-test-'))throw Error('임시 경로 확인 실패');
    fs.rmSync(resolved,{recursive:true,force:true});
  }
}
