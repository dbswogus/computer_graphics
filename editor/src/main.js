// 담당: 전체 연결 / 재현
// 오프라인 classic script. 의존 순서는 index.html 및 README.md 참고.
// 수정 안내와 전체 읽기 순서: CUSTOMIZATION.md

/**
 * [읽기 4: 초기화와 프레임 루프 / 함수 번호 86] frame
 * 역할: 실제 시간을 누적해 120Hz 물리 갱신과 화면 출력을 예약합니다.
 * @param ms — number: requestAnimationFrame이 전달하는 타임스탬프, 밀리초
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: tick → render
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function frame(ms) {
  if(contextLost) return;
  const dt = last ? Math.min((ms - last) / 1000, GAME_CONFIG.physics.maxFrameDelta) : 0;
  last = ms;
  // 편집 중에는 게임의 물리/3D 렌더링을 쉬어 편집 UI에 자원을 사용합니다.
  if (screen === 'editor') { acc = 0; requestAnimationFrame(frame); return; }
  // 조작 선택·설정 창이 열려 있으면 시간만 멈추고 화면은 계속 그립니다.
  if (GyroInput.isChoosing()) { acc = 0; if (!document.hidden) render(); requestAnimationFrame(frame); return; }
  if(! document.hidden) {
    acc += dt;
    while(acc >= GAME_CONFIG.physics.fixedStep) {
      tick(GAME_CONFIG.physics.fixedStep);
      acc -= GAME_CONFIG.physics.fixedStep;
    }
    render();
  }
  requestAnimationFrame(frame);
}
Object.defineProperty(window, 'onggiState', {
  get :() =>({
    screen, stage, selected, angle, tiltZ, px, pz, vx, vz, checkpoint : {
      ... checkpoint
    }
    , floorLevel, py, done, falling, failures, crumbles : crumbles.map(c =>({
      ... c
    }
    ))
  }
  )
}
);
/**
 * [읽기 4: 초기화와 프레임 루프 / 함수 번호 87] initializeGame
 * 역할: 지형을 생성하고 화면 크기를 맞춘 뒤 게임 루프를 시작합니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: buildStageGeometry → resize
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function initializeGame() {
  buildStageGeometry();
  resize();
  requestAnimationFrame(frame);
}
initializeGame();
