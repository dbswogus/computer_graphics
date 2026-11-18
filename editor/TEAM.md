# 세 명이 같은 원본으로 작업하기

기준 원본은 editor/src입니다. release/src는 생성물입니다.

| 담당 | 주요 범위 |
|---|---|
| 유리 | src/ui, src/config/UILayout.js·UIText.js, src/editor/StudioUI.js, 이미지·폰트·소리 |
| 재현 | src/main.js, core, game, camera, 초기 render, export, tools, 테스트 |
| 다유 | src/map, src/models, src/editor/BlockMap.js, content/maps, 모델 에셋 |

MapEditor.js·ProjectData.js·공유 함수 이름/인자·script 순서는 함께 확인합니다.

1. main 최신화
2. 기능 브랜치 생성: feature/ui-menu, feature/physics-tuning, feature/stage-03 등
3. 담당 파일 수정 → editor에서 npm test
4. PR → 다른 팀원 1명 검토 → main에 병합
5. 통합 담당이 editor에서 npm run build 후 release를 확인

같은 파일을 서로 다른 버전 폴더에서 수정해 덮어쓰는 방식은 사용하지 않습니다. 원본을 합친 뒤 배포 사본을 다시 생성합니다.

브라우저 편집 내용은 Git에 자동 저장되지 않습니다. 프로젝트를 저장한 다음 `node tools/split-project.mjs 프로젝트.json 새출력폴더`로 맵/UI/에셋 파일을 분리할 수 있습니다. 변경한 파일만 content와 assets에 반영하세요. 여러 맵은 content/maps의 파일명 순서로 합쳐집니다.

로컬 프로젝트로 직접 빌드하려면 editor 폴더에서 `npm run build -- 프로젝트경로.json`을 실행합니다. release의 project.onggi.json도 입력으로 사용할 수 있습니다.

기존 GitHub Actions 설정이 working-directory: cg라면 이 구조에서는 editor로 바꿔야 합니다. source build와 모의 테스트 후 실제 기기 플레이도 확인하세요.
