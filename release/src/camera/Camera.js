// 담당: 게임 로직 / 재현
// 오프라인 classic script. 의존 순서는 index.html 및 README.md 참고.
// 수정 안내와 전체 읽기 순서: CUSTOMIZATION.md

let vp = identity();
let layout = {
  x : 0,
  y : 0,
  w : 1600,
  h : 1000,
  dpr : 1
}
;
/**
 * [읽기 9: 카메라·화면 비율 / 함수 번호 84] resize
 * 역할: 화면 비율과 픽셀 밀도를 맞추고 입력 좌표계를 갱신합니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: round → clearInput
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, GAME_CONFIG.camera.maxPixelRatio),
  vw = innerWidth,
  vh = innerHeight,
  ratio = Math.min(vw / W, vh / H);
  layout = {
    x :(vw - W * ratio) / 2,
    y :(vh - H * ratio) / 2,
    w : W * ratio,
    h : H * ratio,
    dpr
  }
  ;
  canvas.style.width = vw + 'px';
  canvas.style.height = vh + 'px';
  canvas.width = Math.round(vw * dpr);
  canvas.height = Math.round(vh * dpr);
  gl.viewport(0, 0, canvas.width, canvas.height);
  portrait = vw < vh;
  clearInput();
  dirty = true;
}
/**
 * [읽기 9: 카메라·화면 비율 / 함수 번호 85] getWorldViewProjection
 * 역할: 프로토타입의 고정 탑다운 카메라 투영·시점 행렬을 반환합니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns Float32Array(16): 카메라 투영×뷰 행렬
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: mul → ortho → translate → rx
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function getWorldViewProjection() {
  return mul(ortho(- 15 / GAME_CONFIG.camera.zoom, 15 / GAME_CONFIG.camera.zoom, - 9.375 / GAME_CONFIG.camera.zoom, 9.375 / GAME_CONFIG.camera.zoom, - 55, 55), mul(translate(0, GAME_CONFIG.camera.verticalOffset, 0), rx(GAME_CONFIG.camera.topDownAngle)));
}
