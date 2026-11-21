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
  return 'PASS: 8.11MB encoded asset accepted on load/save; 21MB asset rejected.';
}
