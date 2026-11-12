# 대굴옹기 게임 기획

이전 대화에서 확인 가능한 기능 설명과 역할 분담을 정리한 초기 문서입니다. 상세 규칙과 수치는 추후 작성합니다.

## 게임 구성

- 맵 기울기와 중력을 이용해 옹기를 굴리는 게임입니다.
- 속도, 마찰과 충돌을 계산하고 체크포인트 및 성공·실패를 관리합니다.
- 스테이지별 지형, 장애물, 배경, 출발·도착 위치를 구성합니다.
- 시작, 옹기 선택, 설명, 대화, 결과 화면과 조작 버튼을 제공합니다.
- 순수 WebGL과 고정 탑다운 카메라를 사용하는 구성을 기준으로 합니다.

## 역할 분담

| 담당 | 작업 | 주요 파일 |
| --- | --- | --- |
| UI (유리) | 화면, 조작 버튼, 사운드·모델 에셋 확보 또는 제작 | src/ui/UI.js |
| 게임 로직 (재현) | 상태, 입력, 물리, 충돌, 체크포인트, 성공·실패, 전체 연결 | src/main.js, src/core/Game.js, src/game/Physics.js, src/game/Input.js, src/camera/Camera.js |
| 맵·3D (다유) | 스테이지, 지형, 장애물, 배경, 옹기 모델 배치, 조명 | src/map/Map.js, src/map/StageData.js, src/models/Onggi.js |

카메라는 게임 로직 담당의 초기 배정을 기준으로 하며 변경할 수 있습니다. Renderer.js와 onggiData.js의 최종 담당은 팀에서 정합니다.

## 모듈 연결과 파일 역할

각 JavaScript 파일에서 기능을 구현하고 src/main.js에서 연결한 뒤 index.html에서 실행합니다. 함수 이름과 데이터 형식은 통합 전에 합의합니다.

- index.html: 게임 웹페이지와 캔버스
- src/main.js: 시작, 모듈 연결과 게임 루프
- src/core/Game.js: 게임 상태와 스테이지 전환, 성공·실패
- src/game/Physics.js: 기울기, 중력, 속도, 마찰, 굴러가기, 충돌
- src/game/Input.js: 키보드·터치 입력
- src/ui/UI.js: 화면과 조작 버튼
- src/map/Map.js: 맵과 장애물, 배경
- src/map/StageData.js: 스테이지별 배치 데이터
- src/models/Onggi.js: 옹기 에셋 로딩, 위치·회전
- src/camera/Camera.js: 카메라와 화면 비율
- src/render/Renderer.js: WebGL, 셰이더, 버퍼, 렌더링
- src/data/onggiData.js: 옹기 종류, 이름과 설명

assets/models, assets/images, assets/fonts에는 각각 모델, 이미지, 폰트를 저장합니다. 필요에 따라 파일을 추가하거나 합칠 수 있습니다.
