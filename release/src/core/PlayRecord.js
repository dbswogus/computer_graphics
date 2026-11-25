// 담당: 게임 로직 / 재현
// 오프라인 classic script. 의존 순서는 index.html 참고.

/* 읽기: start → finishStage → finish → load/save. 플레이 시간·실패 횟수·별점·최고 기록을 관리합니다.
 * 최고 기록은 이 브라우저의 localStorage에만 저장하며, 저장할 수 없어도 게임은 계속됩니다.
 * 옹기별로 따로 기록하며, 맵 배치나 물리값이 바뀌어도 다른 코스로 봅니다. */
const PlayRecord = (() => {
  const storageKey = 'onggi-play-records-v1', courseLimit = 20;
  let stageTimes = [], result = null, best = null, course = '';

  /** 매개변수 없음. @returns {string} 현재 맵 배치와 물리값으로 만든 코스 식별값(FNV-1a). 외형·문구는 제외. */
  function signature() {
    const shape = b => [b.x, b.z, b.w, b.d, b.r, b.axis, b.period, b.amp, b.rotation];
    const stages = STAGES.map(st => [st.route, st.checks, st.quiz?.answer,
      ...['floorBlocks', 'editorWalls', 'holes', 'sweepers', 'crumbles'].map(key => (st[key] || []).map(shape))]);
    const source = JSON.stringify([stages, GAME_CONFIG.physics, selected, OnggiPhysics.get(selected)]);
    let hash = 2166136261;
    for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
    return (hash >>> 0).toString(36) + '-' + source.length.toString(36);
  }

  /** 매개변수 없음. @returns {object} {코스:{time,failures}}. 저장소를 쓸 수 없거나 손상되면 빈 객체. */
  function load() {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey));
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch { return {}; }
  }

  /** @param id {string} 코스. @returns {object|null} 올바른 최고 기록. */
  function bestOf(id) {
    const saved = load()[id];
    return saved && Number.isFinite(saved.time) && saved.time > 0 ? saved : null;
  }

  /** @param id {string} 코스. @param record {object} {time,failures}. @returns {void} 최근 코스 20개까지만 보관. */
  function save(id, record) {
    try {
      const all = load();
      delete all[id];
      all[id] = record;
      localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(Object.entries(all).slice(-courseLimit))));
    } catch { /* 사생활 보호 모드 등에서는 이번 결과만 화면에 표시합니다. */ }
  }

  /** 매개변수 없음. @returns {void} 새 플레이 시작. STAGES와 선택한 옹기가 정해진 뒤 호출합니다. */
  function start() {
    failures = 0;
    totalTime = 0;
    stageTimes = [];
    result = null;
    course = signature();
    best = bestOf(course);
  }

  /** 매개변수 없음. @returns {void} 방금 통과한 맵의 시간을 기록. */
  function finishStage() { stageTimes.push({ name: STAGES[stage].name, time: elapsed }); }

  /** @param count {number} 실패 횟수. @returns {number} 1~3개의 별. 기준은 GameConfig.record. */
  function stars(count) {
    if (count <= GAME_CONFIG.record.threeStarFailures) return 3;
    return count <= GAME_CONFIG.record.twoStarFailures ? 2 : 1;
  }

  /** 매개변수 없음. @returns {void} 마지막 목표 도착 시 결과를 확정하고 더 빠르면 최고 기록을 갱신. */
  function finish() {
    if (result) return;
    const isNew = !best || totalTime < best.time;
    result = { time: totalTime, failures, stars: stars(failures), stageTimes: [...stageTimes], isNew, previous: best };
    if (isNew) {
      best = { time: totalTime, failures };
      if (course) save(course, best);
    }
  }

  /** @param seconds {number} 초. @returns {string} 1:02.34 형식. */
  function format(seconds) {
    const hundredths = Math.floor(seconds * 100 + 1e-6);
    const pad = n => String(n).padStart(2, '0');
    return Math.floor(hundredths / 6000) + ':' + pad(Math.floor(hundredths / 100) % 60) + '.' + pad(hundredths % 100);
  }

  return { start, finishStage, finish, stars, format, get result() { return result; }, get best() { return best; } };
})();
