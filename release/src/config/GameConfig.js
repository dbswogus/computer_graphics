// 담당: 전체 연결 / 재현
// 오프라인 classic script. 의존 순서는 index.html 및 README.md 참고.
// 수정 안내와 전체 읽기 순서: CUSTOMIZATION.md

/**
 * 읽기 1: 이 파일에서 난이도·테마·조작감을 수정한 뒤 index.html을 새로고침합니다.
 * 단위: 시간=초, 거리=월드 단위, 각도=도. UI 좌표는 1600×1000 디자인 기준입니다.
 * 양수 값만 사용하세요. maxTiltDegrees는 0 초과 90 미만으로 설정하세요.
 * logicalWidth/Height 변경은 UI 전체 배치 수정이 필요하므로 기본값 유지를 권장합니다.
 */
const GAME_CONFIG = {
  physics : {
    maxTiltDegrees : 25,
// 맵의 최대 기울기. 커질수록 빠르게 가속합니다.
    tiltSpeedDegrees : 26,
// 입력을 유지할 때 초당 기울어지는 각도.
    tiltReturnRate : 3,
// 손을 놓을 때 수평으로 복귀하는 지수 감쇠율.
    tiltSnapEpsilon : 0.0003,
// 이 라디안보다 작은 기울기는 0으로 정리.
    gravity : 9.8,
// 중력 가속도.
    gravityScale : 0.667,
// 원본 구름 관성을 표현하는 가속도 배율.
    damping : 0.72,
// 속도 감쇠율. 높을수록 빨리 멈춥니다.
    maxSpeed : 12,
// 최대 이동 속도.
    playerRadius : 0.40,
// 판정용 반지름. 모델 크기와는 독립적입니다.
    wallRestitution : 0.08,
// 벽 반발 계수. 0이면 수직 속도만 제거.
    wallCollisionPasses : 3,
// 모서리에서 겹침을 반복 해소하는 횟수.
    wallSeparation : 0.005,
// 충돌 후 벽과 띄우는 간격.
    fallDelay : 1.05,
// 낙하 후 체크포인트 복귀까지 시간.
    fallingDrift : 0.25,
// 낙하 중 수평 이동 배율.
    respawnInvulnerability : 1.5,
// 복귀 후 이동 장애물에 대한 무적 시간.
    crumblingDelay : 2.2,
// 금 간 바닥을 밟은 뒤 무너지기까지 시간.
    crumblingRecovery : 2.8,
// 무너진 바닥의 복구 시간.
    obstacleKick : 1.8,
// 이동 장애물 접촉 시 X축 속도 변화량.
    checkpointHalfSize : 0.575,
// 정사각 체크포인트 판정의 절반 폭.
    goalHalfSize : 0.85,
// 정사각 목표 판정의 절반 폭.
    fixedStep : 1 / 120,
// 물리 계산 간격. 작을수록 계산량이 증가합니다.
    maxFrameDelta : 0.08// 긴 프레임이 발생해도 누적할 최대 시간.
  }
  ,
  input : {
    deadZone : 0.12,
// 조이스틱 미세 입력 무시 범위. 0 이상 1 미만.
    joystickX : 800,
// 조이스틱 중심 X, UI 논리 픽셀.
    joystickY : 850,
// 조이스틱 중심 Y, UI 논리 픽셀.
    joystickRadius : 90,
// 조이스틱 입력 반경.
    joystickHitRadius : 125// 조이스틱을 잡을 수 있는 반경.
  }
  ,
  ui : {
    logicalWidth : 1600,
    logicalHeight : 1000,
    fontFamily : 'sans-serif',
// 오프라인 시스템 글꼴. 예: Malgun Gothic, sans-serif.
    dialogueCharactersPerSecond : 42,
// 스테이지 대사가 나타나는 속도.
    joystickOuterRadius : 110,
    joystickKnobRadius : 36,
    joystickKnobTravel : 0.68,
// 반경에 대한 손잡이 이동 배율.
    theme : {
      ink : '#344638',
      muted : '#788271',
      green : '#466744',
      dark : '#2f4932',
      cream : '#f5efdf',
      line : '#d9ddca',
      orange : '#c57c4b',
      paper : '#fffcf3'
    }
  }
  ,
  camera : {
    zoom : 0.9,
// 값이 클수록 확대. 양수로 설정.
    topDownAngle : 1.18,
// 라디안. 원본 카메라의 내려다보는 각도.
    verticalOffset : 0.9,
// 월드 화면의 상하 오프셋.
    maxPixelRatio : 2// 렌더링 픽셀 밀도 상한.
  }
  ,
  map : {
    startRoomRadius : 1.55,
    endRoomRadius : 1.45,
    checkpointRoomRadius : 1.5,
    gridStep : 0.16,
// 지형 메시 격자 크기. 작을수록 생성 비용 증가.
    minX : - 10,
    minZ : - 7,
    gridColumns : 116,
    gridRows : 87// 맵 생성 범위: X=[minX, minX+gridColumns*gridStep], Z도 동일.
  // route·rooms·구멍은 이 범위 안에 놓으세요. 길 위치는 StageData.js에서 수정.
  }
}
;
