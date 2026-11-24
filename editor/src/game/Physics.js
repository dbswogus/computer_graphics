// 담당: 게임 로직 / 재현
// 오프라인 classic script. 의존 순서는 index.html 및 README.md 참고.
// 수정 안내와 전체 읽기 순서: CUSTOMIZATION.md

let R = GAME_CONFIG.physics.playerRadius;
/**
 * [읽기 6: 이동·충돌 판정 / 함수 번호 38] segmentDistance
 * 역할: 점과 길의 선분 사이 최단 거리를 계산합니다.
 * @param x — number: 월드 X 좌표
 * @param z — number: 월드 Z 좌표
 * @param a — [number,number]: 선분 시작 [x,z]
 * @param b — [number,number]: 선분 끝 [x,z]
 * @returns number: 점과 선분 사이 거리, 월드 단위
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: clamp
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function segmentDistance(x, z, a, b) {
  const dx = b [0] - a [0],
  dz = b [1] - a [1],
  t = clamp(((x - a [0]) * dx +(z - a [1]) * dz) /(dx * dx + dz * dz), 0, 1);
  return Math.hypot(x - a [0] - dx * t, z - a [1] - dz * t);
}
/**
 * [읽기 6: 이동·충돌 판정 / 함수 번호 39] clearance
 * 역할: 옹기의 위치에서 바닥 경계까지의 여유를 구합니다.
 * @param st — object: StageData의 스테이지 또는 surface. route/width/rooms 등 포함
 * @param x — number: 월드 X 좌표
 * @param z — number: 월드 Z 좌표
 * @returns number: 바닥 경계 여유. 양수면 내부, 음수면 외부
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: segmentDistance
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function clearance(st, x, z) {
  let best = Math.max(GAME_CONFIG.map.startRoomRadius - Math.hypot(x - st.route [0] [0], z - st.route [0] [1]), GAME_CONFIG.map.endRoomRadius - Math.hypot(x - st.route.at(- 1) [0], z - st.route.at(- 1) [1]));
  for(const room of st.rooms || []) best = Math.max(best, room.r - Math.hypot(x - room.x, z - room.z));
  for(const i of st.checks) best = Math.max(best, GAME_CONFIG.map.checkpointRoomRadius - Math.hypot(x - st.route [i] [0], z - st.route [i] [1]));
  for(let i = 1; i < st.route.length; i ++) best = Math.max(best, st.width / 2 - segmentDistance(x, z, st.route [i - 1], st.route [i]));
  return best;
}
/**
 * [읽기 6: 이동·충돌 판정 / 함수 번호 40] onCourse
 * 역할: 주어진 위치가 스테이지 바닥 안인지 판정합니다.
 * @param st — object: StageData의 스테이지 또는 surface. route/width/rooms 등 포함
 * @param x — number: 월드 X 좌표
 * @param z — number: 월드 Z 좌표
 * @param inset — number: 바닥 가장자리에서 확보할 내부 여유, 월드 단위 (생략 시 0)
 * @returns boolean: 경계 여유가 inset보다 큰 경우 true
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: clearance
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function onCourse(st, x, z, inset = 0) {
  if (st.editorStage) return BlockMap.containsFloor(st, x, z, inset);
  return clearance(st, x, z) > inset;
}
/**
 * [읽기 6: 이동·충돌 판정 / 함수 번호 41] checkpointTouched
 * 역할: 옹기가 사각 체크포인트에 닿았는지 판정합니다.
 * @param x — number: 월드 X 좌표
 * @param z — number: 월드 Z 좌표
 * @param p — [number,number]: 체크포인트 중심 [x,z]
 * @returns boolean: 체크포인트와 옹기 원이 접촉하면 true
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: 이 함수 본문으로 완료. 호출부에서 다음 처리를 진행합니다.
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function checkpointTouched(x, z, p) {
  const half = STAGES[stage].editorStage ? 0.5 : GAME_CONFIG.physics.checkpointHalfSize;
  return Math.hypot(Math.max(Math.abs(x - p [0]) - half, 0), Math.max(Math.abs(z - p [1]) - half, 0)) <= R;
}
/**
 * [읽기 6: 이동·충돌 판정 / 함수 번호 42] resolveWalls
 * 역할: 옹기와 벽의 겹침을 해소하고 속도를 반사합니다.
 * @param st — object: StageData의 스테이지 또는 surface. route/width/rooms 등 포함
 * @param oldX — number: 이동 전 X. 원본 호환 인자이며 현재 함수 본문에서는 사용하지 않음
 * @param oldZ — number: 이동 전 Z. 원본 호환 인자이며 현재 함수 본문에서는 사용하지 않음
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: clamp
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function resolveWalls(st, oldX, oldZ) {
  for(let iteration = 0; iteration < GAME_CONFIG.physics.wallCollisionPasses; iteration ++) for(const w of st.wallSegments) {
    const minX = w.x - w.w / 2,
    maxX = w.x + w.w / 2,
    minZ = w.z - w.d / 2,
    maxZ = w.z + w.d / 2;
    let dx = px - clamp(px, minX, maxX),
    dz = pz - clamp(pz, minZ, maxZ),
    dist = Math.hypot(dx, dz),
    push = R + GAME_CONFIG.physics.wallSeparation - dist;
    if(push <= 0) continue;
    if(dist < 1e-7) {
      const sides = [{
        d : px - minX,
        nx : - 1,
        nz : 0
      }
      ,
      {
        d : maxX - px,
        nx : 1,
        nz : 0
      }
      ,
      {
        d : pz - minZ,
        nx : 0,
        nz : - 1
      }
      ,
      {
        d : maxZ - pz,
        nx : 0,
        nz : 1
      }
      ].sort((a, b) => a.d - b.d);
      dx = sides [0].nx;
      dz = sides [0].nz;
      push = R + GAME_CONFIG.physics.wallSeparation + sides [0].d;
      dist = 1;
    }
    const nx = dx / dist,
    nz = dz / dist;
    px += nx * push;
    pz += nz * push;
    const outward = vx * nx + vz * nz;
    if(outward < 0) {
      vx -=(1 + OnggiPhysics.current().wallRestitution) * outward * nx;
      vz -=(1 + OnggiPhysics.current().wallRestitution) * outward * nz;
    }
  }
}
/**
 * [읽기 6: 이동·충돌 판정 / 함수 번호 43] inHole
 * 역할: 구멍 안으로 떨어지는 위치인지 판정합니다.
 * @param st — object: StageData의 스테이지 또는 surface. route/width/rooms 등 포함
 * @param x — number: 월드 X 좌표
 * @param z — number: 월드 Z 좌표
 * @returns boolean: 구멍의 낙하 영역 안이면 true
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: 이 함수 본문으로 완료. 호출부에서 다음 처리를 진행합니다.
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function inHole(st, x, z) {
  return st.holes.some(h => Math.hypot(x - h.x, z - h.z) < h.r - .04);
}
/**
 * [읽기 6: 이동·충돌 판정 / 함수 번호 44] inRect
 * 역할: 점이 사각 장애물 영역 안에 있는지 판정합니다.
 * @param x — number: 월드 X 좌표
 * @param z — number: 월드 Z 좌표
 * @param r — object: {x,z,w,d} 중심과 전체 폭을 가진 사각형
 * @param pad — number: 각 방향 판정을 늘릴 거리. 음수면 축소 (생략 시 0)
 * @returns boolean: 여유를 적용한 사각형 안이면 true
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: 이 함수 본문으로 완료. 호출부에서 다음 처리를 진행합니다.
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function inRect(x, z, r, pad = 0) {
  return Math.abs(x - r.x) < r.w / 2 + pad && Math.abs(z - r.z) < r.d / 2 + pad;
}
/**
 * [읽기 6: 이동·충돌 판정 / 함수 번호 45] sweeperAt
 * 역할: 시간에 따른 왕복 장애물 위치를 구합니다.
 * @param h — object: {x,z,axis,amp,period,phase,w,d} 왕복 장애물 데이터
 * @param time — number: 누적 시뮬레이션 시간, 초
 * @returns object: 원본을 복사해 현재 x,z만 바꾼 장애물
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: 이 함수 본문으로 완료. 호출부에서 다음 처리를 진행합니다.
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function sweeperAt(h, time) {
  const shift = Math.sin(time * TAU / h.period + h.phase) * h.amp;
  return {
    ... h,
    x : h.x +(h.axis === 'x' ? shift : 0),
    z : h.z +(h.axis === 'z' ? shift : 0)
  }
  ;
}
/**
 * [읽기 6: 이동·충돌 판정 / 함수 번호 46] tick
 * 역할: 고정 시간 간격으로 기울기·중력·마찰·충돌·체크포인트·성패를 갱신합니다.
 * @param dt — number: 한 번 갱신할 시간, 초. 보통 GAME_CONFIG.physics.fixedStep 사용
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: dialogueLength → tickArrival → next → resetCheckpoint → input → resolveWalls → activeFloor → onCourse → fail → inHole → inRect → notify → sweeperAt → checkpointTouched → clearInput
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function tick(dt) {
  if(portrait || document.hidden) return;
  if(screen === 'monologue') {
    if(dialogueTime * GAME_CONFIG.ui.dialogueCharactersPerSecond + 1e-6 < dialogueLength()) {
      dialogueTime = Math.min(dialogueTime + dt, dialogueLength() / GAME_CONFIG.ui.dialogueCharactersPerSecond);
      dirty = true;
    }
    return;
  }
  if(screen === 'arrival') {
    tickArrival(dt);
    return;
  }
  if(screen !== 'play') return;
  simulationTime += dt;
  if(toastTime > 0) toastTime -= dt;
  if(done) {
    transition += dt;
    if(transition > 2.3) next();
    dirty = true;
    return;
  }
  if(falling) {
    fallTime += dt;
    px += vx * dt * GAME_CONFIG.physics.fallingDrift;
    pz += vz * dt * GAME_CONFIG.physics.fallingDrift;
    if(fallTime > GAME_CONFIG.physics.fallDelay) resetCheckpoint();
    dirty = true;
    return;
  }
  elapsed += dt;
  totalTime += dt;
  invulnerable = Math.max(0, invulnerable - dt);
  const profile = OnggiPhysics.current();
  const st = STAGES [stage],
  turn = input();
  if(Math.hypot(turn.x, turn.z) > .001) {
    angle += turn.x * GAME_CONFIG.physics.tiltSpeedDegrees * Math.PI / 180 * dt;
    tiltZ += turn.z * GAME_CONFIG.physics.tiltSpeedDegrees * Math.PI / 180 * dt;
  }
  else {
    const returnFactor = Math.exp(- GAME_CONFIG.physics.tiltReturnRate * dt);
    angle *= returnFactor;
    tiltZ *= returnFactor;
    if(Math.hypot(angle, tiltZ) < GAME_CONFIG.physics.tiltSnapEpsilon) angle = tiltZ = 0;
  }
  const magnitude = Math.hypot(angle, tiltZ);
  if(magnitude > STICK_LIMIT) {
    angle *= STICK_LIMIT / magnitude;
    tiltZ *= STICK_LIMIT / magnitude;
  }
// Actual two-axis gravity projection into the tilted board's XZ plane.
  const ax = - GAME_CONFIG.physics.gravity * GAME_CONFIG.physics.gravityScale * profile.accelerationScale * Math.sin(angle),
  az = GAME_CONFIG.physics.gravity * GAME_CONFIG.physics.gravityScale * profile.accelerationScale * Math.cos(angle) * Math.sin(tiltZ);
  const damping = profile.damping;
  vx =(vx + ax * dt) * Math.exp(- damping * dt);
  vz =(vz + az * dt) * Math.exp(- damping * dt);
  const speed = Math.hypot(vx, vz);
  if(speed > profile.maxSpeed) {
    vx *= profile.maxSpeed / speed;
    vz *= profile.maxSpeed / speed;
  }
  const oldX = px,
  oldZ = pz;
  px += vx * dt;
  pz += vz * dt;
  roll -= vx * dt / R;
  rollX += vz * dt / R;
// Low outer walls collide with the moving circle; holes remain unguarded.
  resolveWalls(activeFloor(), oldX, oldZ);
  if(! onCourse(activeFloor(), px, pz, R * .18)) {
    fail('앗, 길 가장자리에서 떨어졌어요!');
    return;
  }
  if(inHole(st, px, pz)) {
    fail('앗, 바닥 구멍에 빠졌어요!');
    return;
  }
  for(let i = 0; i < st.crumbles.length; i ++) {
    const c = crumbles [i],
    r = st.crumbles [i];
    if (r.quizTrap) {
      if (inRect(px, pz, BlockMap.quizPlate(r))) {
        c.down = GAME_CONFIG.physics.fallDelay;
        fail('오답! 방이 무너졌어요.');
        return;
      }
      continue;
    }
    if(c.down > 0) {
      c.down = Math.max(0, c.down - dt);
      if(c.down === 0) c.charge = 0;
    }
    else if(c.charge > 0 || inRect(px, pz, r, R * .1)) {
      c.charge += dt;
      if(c.charge >= GAME_CONFIG.physics.crumblingDelay) {
        c.down = GAME_CONFIG.physics.crumblingRecovery;
        notify('금 간 바닥이 무너졌어요!', 2);
      }
    }
    if(c.down > 0 && inRect(px, pz, r, - .03)) {
      fail('앗, 금 간 바닥이 무너졌어요!');
      return;
    }
  }
  if(invulnerable <= 0) for(const h of st.sweepers) {
    const q = sweeperAt(h, simulationTime);
    if(inRect(px, pz, q, R * .8)) {
      vx +=(px - q.x >= 0 ? 1 : - 1) * GAME_CONFIG.physics.obstacleKick;
      fail('앗, 움직이는 가마 도구에 닿았어요!');
      return;
    }
  }
  for(const index of st.checks) {
    const p = st.route [index];
    if(index > checkpoint.index &&(st.checkLevels ?. [index] || 0) === floorLevel && checkpointTouched(px, pz, p)) {
      checkpoint = {
        x : p [0],
        z : p [1],
        index,
        level : floorLevel
      }
      ;
      void AssetBank.playEffect('checkpoint');
      notify('세이브 지점에 저장했어요. 여기서 다시 시작할 수 있어요.', 3);
    }
  }
  const goal = st.route.at(- 1);
  const reachedGoal = st.quiz ? inRect(px, pz, BlockMap.quizPlate(st.goalBlock)) :
    Math.hypot(Math.max(Math.abs(px - goal[0]) - (st.editorStage ? 0.5 : GAME_CONFIG.physics.goalHalfSize), 0),
      Math.max(Math.abs(pz - goal[1]) - (st.editorStage ? 0.5 : GAME_CONFIG.physics.goalHalfSize), 0)) <= R;
  if(floorLevel === st.surfaces.length - 1 && reachedGoal) {
    vx = vz = 0;
    clearInput();
    next();
    return;
  }
  dirty = true;
}
