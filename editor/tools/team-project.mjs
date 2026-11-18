import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

/** @param base {string} editor 루트. @returns {object|null} 담당 JS의 JSON만 파싱해 조립한 프로젝트.
 * 설정 JS를 실행하지 않습니다. 세 파일이 모두 없으면 이전 content 방식으로 돌아갑니다. */
export function readTeamProject(base) {
  const names=['UIConfig.js','MapConfig.js','PhysicsConfig.js'];
  const exists=names.map(n=>fs.existsSync(path.join(base,'src/config',n)));
  if(!exists.some(Boolean))return null;
  if(!exists.every(Boolean))throw Error('UIConfig.js · MapConfig.js · PhysicsConfig.js 세 담당 파일이 모두 필요합니다.');
  const context=vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(base,'src/editor/TeamSource.js'),'utf8'),context);
  context.parts={};
  for(const [index,role] of ['ui','map','physics'].entries()) {
    context.role=role;context.text=fs.readFileSync(path.join(base,'src/config',names[index]),'utf8');
    vm.runInContext('parts[role]=TeamSource.parse(role,text)',context);
  }
  return JSON.parse(JSON.stringify(vm.runInContext('TeamSource.combine(parts)',context)));
}
