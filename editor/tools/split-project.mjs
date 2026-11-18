import fs from 'node:fs';
import path from 'node:path';
import {splitProject} from './project-files.mjs';

// 사용: node tools/split-project.mjs 저장한-프로젝트.json 새-출력폴더
if(!process.argv[2]||!process.argv[3])throw Error('입력 JSON과 새 출력 폴더를 지정하세요.');
splitProject(JSON.parse(fs.readFileSync(path.resolve(process.argv[2]),'utf8')),path.resolve(process.argv[3]));
console.log('분리 완료. 변경한 파일만 검토해서 cg/content, cg/assets에 반영하세요.');
