// 담당: 게임 로직 / 재현
// 오프라인 classic script. 의존 순서는 index.html 및 README.md 참고.
// 수정 안내와 전체 읽기 순서: CUSTOMIZATION.md

const pointers = new Map(),
keys = new Set();
const STICK_LIMIT = LIMIT,
stick = {
  id : null,
  x : 0,
  y : 0,
  cx : GAME_CONFIG.input.joystickX,
  cy : GAME_CONFIG.input.joystickY,
  r : GAME_CONFIG.input.joystickRadius
}
;
/**
 * [읽기 5: 입력 흐름 / 함수 번호 47] input
 * 역할: 조이스틱과 화살표 키를 정규화한 기울기 입력으로 변환합니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns object: {x,z}. 각 성분은 -1~1 범위의 기울기 명령
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: clamp
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function input() {
  const gyro=GyroInput.sample();
  if(gyro)return gyro;
  let x = - stick.x,
  z = stick.y;
  const length = Math.hypot(x, z);
  if(length <= GAME_CONFIG.input.deadZone) {
    x = z = 0;
  }
  else {
    const strength = clamp((length - GAME_CONFIG.input.deadZone) /(1 - GAME_CONFIG.input.deadZone), 0, 1);
    x = x / length * strength;
    z = z / length * strength;
  }
  if(keys.size) {
    x =(keys.has('ArrowLeft') ? 1 : 0) -(keys.has('ArrowRight') ? 1 : 0);
    z =(keys.has('ArrowDown') ? 1 : 0) -(keys.has('ArrowUp') ? 1 : 0);
    const n = Math.hypot(x, z);
    if(n > 1) {
      x /= n;
      z /= n;
    }
  }
  return {
    x,
    z
  }
  ;
}
/**
 * [읽기 5: 입력 흐름 / 함수 번호 48] releaseStick
 * 역할: 조이스틱을 놓고 중립 위치로 되돌립니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: 이 함수 본문으로 완료. 호출부에서 다음 처리를 진행합니다.
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function releaseStick() {
  stick.id = null;
  stick.x = stick.y = 0;
  dirty = true;
}
/**
 * [읽기 5: 입력 흐름 / 함수 번호 49] clearInput
 * 역할: 키와 포인터 입력을 모두 초기화합니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: releaseStick
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function clearInput() {
  pointers.clear();
  keys.clear();
  releaseStick();
  dirty = true;
}
/**
 * [읽기 5: 입력 흐름 / 함수 번호 50] pointerPosition
 * 역할: 화면 포인터를 1600×1000 논리 좌표로 변환합니다.
 * @param e — PointerEvent|KeyboardEvent|Event: 브라우저가 전달하는 이벤트. 직접 호출 시 필요한 좌표/키 필드를 제공
 * @returns object: {x,y}. 화면 비율과 여백을 보정한 UI 논리 좌표
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: 이 함수 본문으로 완료. 호출부에서 다음 처리를 진행합니다.
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function pointerPosition(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x :(e.clientX - r.left - layout.x) / layout.w * W,
    y :(e.clientY - r.top - layout.y) / layout.h * H
  }
  ;
}
/**
 * [읽기 5: 입력 흐름 / 함수 번호 51] updateStick
 * 역할: 포인터 위치로 조이스틱 방향과 세기를 갱신합니다.
 * @param e — PointerEvent|KeyboardEvent|Event: 브라우저가 전달하는 이벤트. 직접 호출 시 필요한 좌표/키 필드를 제공
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: pointerPosition
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function updateStick(e) {
  const p = pointerPosition(e),
  x =(p.x - stick.cx) / stick.r,
  y =(p.y - stick.cy) / stick.r,
  n = Math.max(1, Math.hypot(x, y));
  stick.x = x / n;
  stick.y = y / n;
  dirty = true;
}
/**
 * [읽기 5: 입력 흐름 / 함수 번호 52] hit
 * 역할: 포인터 아래의 버튼을 찾습니다.
 * @param e — PointerEvent|KeyboardEvent|Event: 브라우저가 전달하는 이벤트. 직접 호출 시 필요한 좌표/키 필드를 제공
 * @returns object|undefined: 버튼 {id,x,y,w,h} 또는 일치 없음
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: 이 함수 본문으로 완료. 호출부에서 다음 처리를 진행합니다.
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function hit(e) {
  const r = canvas.getBoundingClientRect(),
  x =(e.clientX - r.left - layout.x) / layout.w * W,
  y =(e.clientY - r.top - layout.y) / layout.h * H;
  return buttons.findLast(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
}
/**
 * [읽기 5: 입력 흐름 / 함수 번호 53] onPointerDown
 * 역할: 포인터를 누르면 조이스틱을 잡거나 버튼 누름을 기록합니다.
 * @param e — PointerEvent|KeyboardEvent|Event: 브라우저가 전달하는 이벤트. 직접 호출 시 필요한 좌표/키 필드를 제공
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: pointerPosition → updateStick → hit
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function onPointerDown(e) {
  e.preventDefault();
  canvas.focus({
    preventScroll : true
  }
  );
  const p = pointerPosition(e);
  if(screen === 'play' && ! falling && ! done && stick.id === null && Math.hypot(p.x - stick.cx, p.y - stick.cy) <= GAME_CONFIG.input.joystickHitRadius) {
    stick.id = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    updateStick(e);
    return;
  }
  const b = hit(e);
  if(b) {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, 'menu:' + b.id);
  }
  dirty = true;
}
canvas.addEventListener('pointerdown', onPointerDown);
/**
 * [읽기 5: 입력 흐름 / 함수 번호 54] onPointerMove
 * 역할: 잡고 있는 조이스틱의 위치를 갱신합니다.
 * @param e — PointerEvent|KeyboardEvent|Event: 브라우저가 전달하는 이벤트. 직접 호출 시 필요한 좌표/키 필드를 제공
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: updateStick
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function onPointerMove(e) {
  if(e.pointerId === stick.id) updateStick(e);
}
canvas.addEventListener('pointermove', onPointerMove);
/**
 * [읽기 5: 입력 흐름 / 함수 번호 55] onPointerUp
 * 역할: 조이스틱을 놓거나 동일한 버튼 위에서 동작을 실행합니다.
 * @param e — PointerEvent|KeyboardEvent|Event: 브라우저가 전달하는 이벤트. 직접 호출 시 필요한 좌표/키 필드를 제공
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: releaseStick → hit → action
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function onPointerUp(e) {
  if(e.pointerId === stick.id) {
    releaseStick();
    return;
  }
  const value = pointers.get(e.pointerId);
  pointers.delete(e.pointerId);
  if(value && value.startsWith('menu:')) {
    const b = hit(e);
    if(b && value === 'menu:' + b.id) action(b.id);
  }
  dirty = true;
}
canvas.addEventListener('pointerup', onPointerUp);
/**
 * [읽기 5: 입력 흐름 / 함수 번호 56] onPointerCancel
 * 역할: 취소된 터치 입력을 해제합니다.
 * @param e — PointerEvent|KeyboardEvent|Event: 브라우저가 전달하는 이벤트. 직접 호출 시 필요한 좌표/키 필드를 제공
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: releaseStick
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function onPointerCancel(e) {
  if(e.pointerId === stick.id) releaseStick();
  pointers.delete(e.pointerId);
  dirty = true;
}
canvas.addEventListener('pointercancel', onPointerCancel);
/**
 * [읽기 5: 입력 흐름 / 함수 번호 57] onLostPointerCapture
 * 역할: 포인터 캡처가 사라지면 입력을 해제합니다.
 * @param e — PointerEvent|KeyboardEvent|Event: 브라우저가 전달하는 이벤트. 직접 호출 시 필요한 좌표/키 필드를 제공
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: releaseStick
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function onLostPointerCapture(e) {
  if(e.pointerId === stick.id) releaseStick();
  pointers.delete(e.pointerId);
  dirty = true;
}
canvas.addEventListener('lostpointercapture', onLostPointerCapture);
/**
 * [읽기 5: 입력 흐름 / 함수 번호 58] onKeyDown
 * 역할: 화살표 키 입력과 대사 넘김을 처리합니다.
 * @param e — PointerEvent|KeyboardEvent|Event: 브라우저가 전달하는 이벤트. 직접 호출 시 필요한 좌표/키 필드를 제공
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: action
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function onKeyDown(e) {
  if(e.key === 'Escape') {
    if(! e.repeat) SettingsMenu.toggle();
    return;
  }
  if(SettingsMenu.isOpen()) return;
  if(screen === 'monologue' &&(e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    if(! e.repeat) action('dialogue-next');
    return;
  }
  if(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && screen === 'play') {
    e.preventDefault();
    if(! done && ! falling) keys.add(e.key);
    dirty = true;
  }
}
window.addEventListener('keydown', onKeyDown);
/**
 * [읽기 5: 입력 흐름 / 함수 번호 59] onKeyUp
 * 역할: 뗀 키를 입력 집합에서 제거합니다.
 * @param e — PointerEvent|KeyboardEvent|Event: 브라우저가 전달하는 이벤트. 직접 호출 시 필요한 좌표/키 필드를 제공
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: 이 함수 본문으로 완료. 호출부에서 다음 처리를 진행합니다.
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function onKeyUp(e) {
  keys.delete(e.key);
  dirty = true;
}
window.addEventListener('keyup', onKeyUp);
window.addEventListener('blur', clearInput);
/**
 * [읽기 5: 입력 흐름 / 함수 번호 60] onVisibilityChange
 * 역할: 탭 가시성 변경 시 입력과 누적 시간을 초기화합니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: clearInput
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function onVisibilityChange() {
  clearInput();
  last = 0;
  acc = 0;
}
document.addEventListener('visibilitychange', onVisibilityChange);
window.addEventListener('resize', resize);
/**
 * [읽기 5: 입력 흐름 / 함수 번호 61] onWebGLContextLost
 * 역할: 그래픽 컨텍스트 손실 시 루프를 중단하고 안내합니다.
 * @param e — PointerEvent|KeyboardEvent|Event: 브라우저가 전달하는 이벤트. 직접 호출 시 필요한 좌표/키 필드를 제공
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: clearInput
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function onWebGLContextLost(e) {
  e.preventDefault();
  contextLost = true;
  clearInput();
  canvas.style.display = 'none';
  document.getElementById('error').style.display = 'block';
  document.getElementById('error').textContent = '그래픽 연결이 잠시 끊겼어요. 페이지를 새로 열어 주세요.';
}
canvas.addEventListener('webglcontextlost', onWebGLContextLost);
