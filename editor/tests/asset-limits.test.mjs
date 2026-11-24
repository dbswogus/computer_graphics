import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

/** @param base {string} editor 루트. @returns {Promise<string>} 8.11MB 허용·21MB 거부와 프로젝트 재검증. */
export async function runAssetLimitTests(base) {
  const context=vm.createContext({});
  for(const name of ['AssetBank','BlockMap','ProjectData'])vm.runInContext(fs.readFileSync(path.join(base,'src/editor/'+name+'.js'),'utf8'),context);
  context.asset={id:'size-check',name:'size.wav',kind:'audio',data:'data:audio/wav;base64,'+'A'.repeat(Math.ceil(8.11*1024*1024/3)*4)};
  await vm.runInContext('AssetBank.prepare([asset])',context);
  assert(vm.runInContext('ProjectData.validate({kind:"onggi-project",version:4,maps:[BlockMap.example()],ui:{},assets:[asset]}).assets.length===1',context));
  context.asset.data='data:audio/wav;base64,'+'A'.repeat(Math.ceil(21*1024*1024/3)*4);
  await assert.rejects(vm.runInContext('AssetBank.prepare([asset])',context));
  assert.throws(()=>vm.runInContext('ProjectData.validate({kind:"onggi-project",version:4,maps:[BlockMap.example()],ui:{},assets:[asset]})',context));
  const objVertices='v 0 0 0\nv 1 0 0\nv 0 1 0\n';
  context.largeOBJ=objVertices+'f 1 2 3\n'.repeat(121_600);
  assert.equal(vm.runInContext('AssetBank.parseOBJ(largeOBJ).vertices.length / 9',context),121_600);
  context.largeOBJ=objVertices+'f 1 2 3\n'.repeat(250_001);
  assert.throws(()=>vm.runInContext('AssetBank.parseOBJ(largeOBJ)',context),/25만/);
  context.objWithUV=objVertices+'vt 0 0\nvt 1 0\nvt 0 1\nf 1/1 2/2 3/-1\nf 1 2 3\n';
  const uv=vm.runInContext('AssetBank.parseOBJ(objWithUV).uvs',context);
  assert.deepEqual(Array.from(uv),[0,0,1,1,0,1,0,1,1,0,0,0,0,0,0,0,0,0]);
  context.project=vm.runInContext(`({
    kind:'onggi-project',version:4,maps:[BlockMap.example()],
    ui:{modelTextures:{model:'texture'}},
    assets:[{id:'model',name:'pot.obj',kind:'model',data:'a'},{id:'texture',name:'pot.png',kind:'image',data:'b'}]
  })`,context);
  assert(vm.runInContext("ProjectData.validate(project).ui.modelTextures.model==='texture'",context));
  for(const id of ['texture','model']){
    context.removeID=id;
    assert(vm.runInContext('Object.keys(ProjectData.withoutAsset(project,removeID).project.ui.modelTextures).length===0',context));
  }
  return 'PASS: file/model limits, OBJ UVs and texture binding validation/deletion.';
}
