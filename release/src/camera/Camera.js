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
/** @param size {number} 원근: 중심까지 거리 / 직교: 화면 세로 절반 길이. @param cx {number} 바라보는 월드 X.
 * @param cz {number} 바라보는 월드 Z. @param offsetY {number} 화면 상하 이동, 월드 단위. @returns {Float32Array} 뷰·투영 행렬. */
function cameraView(size, cx, cz, offsetY = 0) {
  const camera = GAME_CONFIG.camera,
  view = mul(translate(0, offsetY, 0), mul(rx(camera.topDownAngle), translate(- cx, 0, - cz)));
  if(camera.mode !== 'perspective') return mul(ortho(- size * W / H, size * W / H, - size, size, - 55, 55), view);
  const projection = perspective(camera.fieldOfViewDegrees * Math.PI / 180, W / H, Math.max(1, size - 25), size + 45);
  return mul(projection, mul(translate(0, 0, - size), view));
}
/** @param m {Float32Array} 변환 행렬. @param x {number} @param y {number} @param z {number} 점.
 * @returns {number[2]} w로 나눈 화면 좌표(-1~1). 직교 투영은 w=1이라 결과가 같습니다. */
function projectPoint(m, x, y, z) {
  const w = m [3] * x + m [7] * y + m [11] * z + m [15];
  return [(m [0] * x + m [4] * y + m [8] * z + m [12]) / w, (m [1] * x + m [5] * y + m [9] * z + m [13]) / w];
}
/** @returns {number[2]} 월드 점의 UI 논리 좌표(1600×1000). 매개변수는 projectPoint와 같습니다. */
function projectToUI(m, x, y, z) {
  const [nx, ny] = projectPoint(m, x, y, z);
  return [nx * .5 * W + W / 2, H / 2 - ny * .5 * H];
}
/** @param view {Float32Array} 뷰·투영. @param b {object} 맵 경계. @param tiltX {number} @param tiltY {number} 맵 기울기, 라디안.
 * @returns {number[4]} 화면에서 맵이 차지하는 [왼쪽,오른쪽,아래,위]. */
function projectedExtent(view, b, tiltX = 0, tiltY = 0) {
  const m = mul(view, mul(rz(tiltX), rx(tiltY))), e = [Infinity, - Infinity, Infinity, - Infinity];
  for(const x of [b.minX, b.maxX]) for(const y of [b.minY, b.maxY]) for(const z of [b.minZ, b.maxZ]) {
    const [nx, ny] = projectPoint(m, x, y, z);
    e [0] = Math.min(e [0], nx); e [1] = Math.max(e [1], nx); e [2] = Math.min(e [2], ny); e [3] = Math.max(e [3], ny);
  }
  return e;
}
let worldEye = [0, 0, 1, 0];
/** @param size {number} @param cx {number} @param cz {number} @param offsetY {number} cameraView와 같은 값.
 * @returns {number[4]} 반사광 계산용. 원근은 [카메라 위치,1], 직교는 [보는 방향,0]. */
function cameraEye(size, cx, cz, offsetY = 0) {
  const s = Math.sin(GAME_CONFIG.camera.topDownAngle), c = Math.cos(GAME_CONFIG.camera.topDownAngle);
  if(GAME_CONFIG.camera.mode !== 'perspective') return [0, s, c, 0];
  return [cx, s * size - c * offsetY, cz + c * size + s * offsetY, 1];
}
const fittedViews = new WeakMap();
/** @param st {object} 스테이지. @returns {Float32Array} 평평할 때 safeArea에 꽉 차고, 최대로 기울여도 화면 밖으로 나가지 않는 뷰.
 * 맵과 카메라 설정이 그대로면 계산 결과를 재사용합니다. */
function fittedView(st) {
  const camera = GAME_CONFIG.camera, b = st.bounds, key = JSON.stringify(camera), cached = fittedViews.get(b);
  if(cached?.key === key) {
    worldEye = cached.eye;
    return cached.view;
  }
  const area = camera.safeArea,
  left = area.left / W * 2 - 1,
  right = 1 - area.right / W * 2,
  top = 1 - (st.quiz ? area.quizTop : area.top) / H * 2,
  bottom = area.bottom / H * 2 - 1;
  const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
  // 크기 후보에 대해 평평한 맵을 안전 영역 가운데로 옮긴 뷰와 적합 여부를 구합니다.
  const attempt = size => {
    const base = cameraView(size, cx, cz), e = projectedExtent(base, b);
    const shiftX = (left + right - e [0] - e [1]) / 2, shiftY = (top + bottom - e [2] - e [3]) / 2;
    const fits = e [1] - e [0] <= right - left && e [3] - e [2] <= top - bottom;
    const inside = fits && Array.from({ length : 32 }, (_, i) => i * TAU / 32).every(a => {
      const t = projectedExtent(base, b, Math.cos(a) * LIMIT, Math.sin(a) * LIMIT);
      return t [0] + shiftX >= - 1 && t [1] + shiftX <= 1 && t [2] + shiftY >= - 1 && t [3] + shiftY <= 1;
    });
    return { inside, view : mul(translate(shiftX, shiftY, 0), base) };
  };
  // 작은 size일수록 크게 보입니다. 들어맞는 가장 작은 값을 이분 탐색합니다.
  let low = 2, high = 120;
  for(let i = 0; i < 30; i ++) {
    const middle = (low + high) / 2;
    if(attempt(middle).inside) high = middle;
    else low = middle;
  }
  const view = attempt(high).view, eye = cameraEye(high, cx, cz);
  fittedViews.set(b, { key, view, eye });
  worldEye = eye;
  return view;
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
  const camera = GAME_CONFIG.camera;
  if(camera.autoFit && STAGES [stage]?.bounds) return fittedView(STAGES [stage]);
  if(camera.mode === 'perspective') {
    const size = 9.375 / camera.zoom / Math.tan(camera.fieldOfViewDegrees * Math.PI / 360);
    worldEye = cameraEye(size, 0, 0, camera.verticalOffset);
    return cameraView(size, 0, 0, camera.verticalOffset);
  }
  worldEye = cameraEye(0, 0, 0);
  return mul(ortho(- 15 / GAME_CONFIG.camera.zoom, 15 / GAME_CONFIG.camera.zoom, - 9.375 / GAME_CONFIG.camera.zoom, 9.375 / GAME_CONFIG.camera.zoom, - 55, 55), mul(translate(0, GAME_CONFIG.camera.verticalOffset, 0), rx(GAME_CONFIG.camera.topDownAngle)));
}
