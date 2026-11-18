> 협업 버전 안내: 담당파일.md(상위 폴더)를 먼저 읽으세요. 설정 원본은 src/config/UIConfig.js(유리), MapConfig.js(다유), PhysicsConfig.js(재현)이며 기존 content 방식보다 우선합니다.

# 편집기

`index.html`을 열면 맵 편집 화면으로 바로 들어갑니다. 게임은 안에서 테스트하고 `release ZIP 내보내기`로 배포합니다.

- `src/`: 직접 수정하는 공통 소스
- `assets/`: 로컬 에셋 원본
- `content/`: 개발 빌드에 사용할 맵별 데이터·UI 설정·에셋 참조
- `tools/`: 같은 소스로 옆의 release 폴더 생성
- `tests/`: 편집·물리·배포 회귀 검사
- `project.onggi.json`: 기본 프로젝트의 저장 사본

`npm run build`는 `../release/`와 편집기 기본 프로젝트/내보내기 템플릿을 갱신합니다. 최신 소스를 pull한 뒤 한 번 실행하세요. ZIP으로 받은 이 패키지에는 생성물이 포함되어 있으므로 Node.js 없이도 편집기를 열 수 있습니다.

에셋과 맵 편집 내용은 브라우저 작업 데이터이므로, GitHub에 반영할 때는 프로젝트를 저장하거나 content 파일에 변경을 반영해야 합니다. 자세한 전체 흐름은 상위 README.md와 TEAM.md를 참고하세요.
