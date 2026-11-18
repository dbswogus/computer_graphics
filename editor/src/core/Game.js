// 담당: 게임 로직 / 재현
// 오프라인 classic script. 의존 순서는 index.html 및 README.md 참고.
// 수정 안내와 전체 읽기 순서: CUSTOMIZATION.md

let screen = 'title',
selected = 0,
stage = 0,
angle = 0,
tiltZ = 0,
px = - 7,
pz = - 4.8,
vx = 0,
vz = 0,
roll = 0,
rollX = 0,
hold = 0,
elapsed = 0,
totalTime = 0,
toast = '',
toastTime = 0,
transition = 0,
done = false;
let last = 0,
acc = 0,
dirty = true,
contextLost = false,
portrait = false,
storyIndex = 0,
simulationTime = 0,
fallTime = 0,
falling = false,
failures = 0,
fallReason = '',
invulnerable = 0;
let dialoguePage = 0,
dialogueTime = 0;
let arrival = null;
let checkpoint = {
  x : - 7,
  z : - 4.8,
  index : - 1,
  level : 0
}
,
crumbles = [],
floorLevel = 0,
py = 0;
/**
 * [읽기 7: 상태 전환 / 함수 번호 29] dialogueLength
 * 역할: 현재 스테이지의 대사 수를 반환합니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns number: 현재 페이지 대사의 글자 수
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: 이 함수 본문으로 완료. 호출부에서 다음 처리를 진행합니다.
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function dialogueLength() {
  return STAGE_MONOLOGUES [stage] [dialoguePage].reduce((n, line) => n + Array.from(line).length, 0);
}
/**
 * [읽기 7: 상태 전환 / 함수 번호 30] advanceDialogue
 * 역할: 대사를 넘기고 마지막 대사 뒤 플레이를 시작합니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: dialogueLength → clearInput
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function advanceDialogue() {
  if(dialogueTime * GAME_CONFIG.ui.dialogueCharactersPerSecond + 1e-6 < dialogueLength()) {
    dialogueTime = dialogueLength() / GAME_CONFIG.ui.dialogueCharactersPerSecond;
    dirty = true;
    return;
  }
  if(dialoguePage < STAGE_MONOLOGUES [stage].length - 1) {
    dialoguePage ++;
    dialogueTime = 0;
  }
  else {
    screen = 'play';
    toast = '';
    toastTime = 0;
    clearInput();
  }
  dirty = true;
}
/**
 * [읽기 7: 상태 전환 / 함수 번호 31] startStage
 * 역할: 스테이지와 시작 위치·장애물·대사를 초기화합니다.
 * @param n — number: STAGES의 인덱스. 0=공방, 1=가마 앞, 2=전시실
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: clearInput
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function startStage(n) {
  OnggiPhysics.applySelected();
  arrival = null;
  stage = n;
  const p = STAGES [n].route [0];
  px = p [0];
  pz = p [1];
  vx = vz = angle = tiltZ = roll = rollX = hold = elapsed = transition = 0;
  done = falling = false;
  fallTime = 0;
  invulnerable = 0;
  floorLevel = 0;
  py = 0;
  checkpoint = {
    x : px,
    z : pz,
    index : - 1,
    level : 0
  }
  ;
  crumbles = STAGES [n].crumbles.map(() =>({
    charge : 0, down : 0
  }
  ));
  clearInput();
  screen = 'monologue';
  dialoguePage = 0;
  dialogueTime = 0;
  toast = '';
  toastTime = 0;
  dirty = true;
}
/**
 * [읽기 7: 상태 전환 / 함수 번호 32] resetCheckpoint
 * 역할: 마지막 체크포인트로 옹기를 되돌립니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: clearInput
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function resetCheckpoint() {
  px = checkpoint.x;
  pz = checkpoint.z;
  floorLevel = checkpoint.level || 0;
  py = STAGES [stage].surfaces [floorLevel].height;
  vx = vz = angle = tiltZ = hold = roll = rollX = 0;
  falling = false;
  fallTime = 0;
  crumbles = STAGES [stage].crumbles.map(() =>({
    charge : 0, down : 0
  }
  ));
  invulnerable = GAME_CONFIG.physics.respawnInvulnerability;
  toast = '';
  toastTime = 0;
  clearInput();
}
/**
 * [읽기 7: 상태 전환 / 함수 번호 33] fail
 * 역할: 실패 이유와 낙하 애니메이션 상태를 설정합니다.
 * @param reason — string: 실패 원인. fallReason에 기록
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: clearInput
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function fail(reason) {
  if(falling || done) return;
  falling = true;
  fallReason = reason;
  fallTime = 0;
  failures ++;
  void AssetBank.playEffect('fail');
  toast = '';
  toastTime = 0;
  clearInput();
}
/**
 * [읽기 7: 상태 전환 / 함수 번호 34] next
 * 역할: 다음 스테이지 또는 최종 도착 상태로 전환합니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: startStage → beginArrival
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function next() {
  void AssetBank.playEffect('arrival');
  if (STAGES[stage].editorStage) { if(!MapEditor.advance())beginArrival(); return; }
  if(stage < STAGES.length - 1) startStage(stage + 1);
  else beginArrival();
}
/**
 * [읽기 7: 상태 전환 / 함수 번호 35] beginArrival
 * 역할: 마지막 전시대 도착 연출을 시작합니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: clearInput
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function beginArrival() {
  const goal = STAGES [stage].route.at(- 1);
  arrival = {
    t : 0,
    duration : 1.6,
    x : px,
    z : pz,
    y : py,
    roll,
    rollX,
    angle,
    tiltZ,
    toX : goal [0],
    toZ : goal [1]
  }
  ;
  screen = 'arrival';
  vx = vz = 0;
  toast = '';
  toastTime = 0;
  clearInput();
  dirty = true;
}
/**
 * [읽기 7: 상태 전환 / 함수 번호 36] tickArrival
 * 역할: 도착 애니메이션을 진행하고 결과 화면으로 전환합니다.
 * @param dt — number: 한 번 갱신할 시간, 초. 보통 GAME_CONFIG.physics.fixedStep 사용
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: mix → round
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function tickArrival(dt) {
  arrival.t = Math.min(arrival.duration, arrival.t + dt);
  const q = arrival.t / arrival.duration,
  e = q * q *(3 - 2 * q);
  px = mix(arrival.x, arrival.toX, e);
  pz = mix(arrival.z, arrival.toZ, e);
  py = mix(arrival.y, .4 + (-.47 + COLLECTION [selected].bottom * .66) * (R / GAME_CONFIG.physics.playerRadius), e);
  roll = mix(arrival.roll, Math.round(arrival.roll / TAU) * TAU, e);
  rollX = mix(arrival.rollX, Math.round(arrival.rollX / TAU) * TAU, e);
  angle = arrival.angle *(1 - e);
  tiltZ = arrival.tiltZ *(1 - e);
  if(q === 1) {
    roll = rollX = angle = tiltZ = 0;
    screen = 'finish';
  }
  dirty = true;
}
/**
 * [읽기 7: 상태 전환 / 함수 번호 37] action
 * 역할: 버튼 ID에 따라 선택·화면·스테이지를 전환합니다.
 * @param id — string: 'title', 'select', 'guide', 'start', 'replay', 'story-next', 'dialogue-next', 'pot0' 등 버튼 명령
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: clearInput → startStage → advanceDialogue
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function action(id) {
  if(id==='start'||id==='replay'){MapEditor.playProject();return;}
  if(id.startsWith('pot')) {
    const index = Number(id.slice(3));
    if(Number.isInteger(index) && index >= 0 && index < COLLECTION.length) selected = index;
    OnggiPhysics.applySelected();
    dirty = true;
    return;
  }
  clearInput();
  if(id === 'title') screen = 'title';
  if(id === 'select') screen = 'select';
  if(id === 'guide') screen = 'guide';
  if(id === 'start' || id === 'replay') {
    totalTime = 0;
    failures = 0;
    storyIndex = 0;
    screen = 'story';
  }
  if(id === 'story-next') {
    if(storyIndex < 2) storyIndex ++;
    else startStage(0);
  }
  if(id === 'dialogue-next') advanceDialogue();
  dirty = true;
}
