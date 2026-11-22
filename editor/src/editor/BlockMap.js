/* 읽기 1: 데이터 규격 → validate → containsFloor → compile.
 * 편집 좌표는 월드 X/Z, 길이는 월드 단위. 회전은 0/90도만 지원합니다.
 * DOM/WebGL과 무관한 순수 데이터 모듈이므로 단독 테스트할 수 있습니다. */
const BlockMap = (() => {
  const bounds = { minX: -9, maxX: 8, minZ: -6, maxZ: 6 };
  const types = ['floor', 'wall', 'hole', 'sweeper', 'crumble', 'checkpoint', 'start', 'goal', 'asset'];
  /* 맵 이름에 아래 key 단어가 들어가면 그 테마의 문구·바닥색·배경(Map.js editorScenery)을 씁니다.
   * 해당 없는 이름은 기본 문구를 쓰고, 배경은 맵 순서대로 공방→가마→전시실을 돌아가며 씁니다. */
  const themes = [
    { key: '공방', theme: 'workshop', sub: '작업대 사이 굽은 길', tag: '01 · 공방', color: '#bea176',
      mission: '공방을 빠져나가 초록 출구까지', quote: '여긴 내가 빚어진 공방이야. 천천히 기울여 보자!',
      tip: '구멍을 피해 돌아가요. 연두색 바닥을 지나면 거기서 다시 시작해요.' },
    { key: '가마', theme: 'kiln', sub: '뜨거운 가마 앞마당', tag: '02 · 가마 앞', color: '#aa815b',
      mission: '움직이는 가마 도구를 피해 건너기', quote: '가마 도구가 왔다 갔다 해! 비킬 때를 기다리자.',
      tip: '빨간 도구는 정해진 길만 오가요. 빈 줄을 골라 지나가요.' },
    { key: '전시', theme: 'gallery', sub: '금 간 다리 너머 내 전시대', tag: '03 · 전시실', color: '#91aba3',
      mission: '금 간 다리를 건너 내 전시대로', quote: '저기 내 자리가 보여! 다리가 무너지기 전에 건너자.',
      tip: '금 간 판은 밟고 2.2초 뒤 무너져요. 멈추지 말거나 아래 길로 돌아가요.' }
  ];
  /** @param name {string} 맵 이름. @returns {object|null} 이름에 key가 들어간 첫 테마. */
  function themeFor(name) {
    return themes.find(t => String(name).includes(t.key)) || null;
  }

  /** @param block {object} 편집 블록. @returns {object} 90도 회전을 폭/깊이에 적용한 복사본. */
  function rectangle(block) {
    return { ...block, w: block.rotation === 90 ? block.d : block.w, d: block.rotation === 90 ? block.w : block.d };
  }

  /** @param value {unknown} JSON/편집 데이터. @returns {object} 허용 필드만 복사한 맵. 잘못된 값은 Error. 실행/HTML 해석 없음. */
  function validate(value) {
    if (!value || value.version !== 1 || !Array.isArray(value.blocks) || value.blocks.length > 500) {
      throw Error('버전 1의 블록 맵만 지원합니다. 최대 500개까지 배치하세요.');
    }
    const ids = new Set();
    const blocks = value.blocks.map((source, i) => {
      if (!source || !types.includes(source.type)) throw Error(`${i + 1}번째 블록 종류가 올바르지 않습니다.`);
      const block = { id: String(source.id || `block-${i}`).slice(0, 80), type: source.type };
      if (ids.has(block.id)) throw Error('블록 ID가 중복되었습니다.');
      ids.add(block.id);
      for (const [key, fallback, min, max] of [
        ['x', 0, -9, 8], ['z', 0, -6, 6], ['w', 1, 0.3, 8], ['d', 1, 0.3, 8],
        ['period', 5, 0.5, 30], ['amp', 1, 0, 4], ['rotation', 0, 0, 90]
      ]) {
        const number = source[key] === undefined ? fallback : source[key];
        if (typeof number !== 'number' || !Number.isFinite(number) || number < min || number > max) {
          throw Error(`${i + 1}번째 블록 ${key}: ${min}~${max} 범위의 숫자가 필요합니다.`);
        }
        block[key] = number;
      }
      if (![0, 90].includes(block.rotation)) throw Error('회전은 0도 또는 90도만 가능합니다.');
      block.axis = source.axis === undefined ? 'x' : source.axis;
      if (!['x', 'z'].includes(block.axis)) throw Error('왕복 축은 x 또는 z입니다.');
      if (source.assetId !== undefined) {
        if (typeof source.assetId !== 'string' || !/^[\w-]{1,80}$/.test(source.assetId)) throw Error('에셋 ID가 잘못되었습니다.');
        block.assetId = source.assetId;
      }
      if (source.skinAssetId !== undefined) {
        if (typeof source.skinAssetId !== 'string' || !/^[\w-]{1,80}$/.test(source.skinAssetId)) throw Error('블록 외형 ID 오류');
        block.skinAssetId = source.skinAssetId;
      }
      if(block.type==='asset'&&!block.assetId)throw Error('에셋 장식에는 에셋 ID가 필요합니다.');
      const rect = rectangle(block);
      if (rect.x - rect.w / 2 < bounds.minX || rect.x + rect.w / 2 > bounds.maxX ||
          rect.z - rect.d / 2 < bounds.minZ || rect.z + rect.d / 2 > bounds.maxZ) {
        throw Error(`${i + 1}번째 블록이 편집 영역 밖으로 나갑니다.`);
      }
      return block;
    });
    for (const type of ['start', 'goal']) {
      if (blocks.filter(block => block.type === type).length > 1) throw Error('출발점과 목표점은 각각 하나만 배치하세요.');
    }
    return { version: 1, name: String(value.name || '내가 만든 맵').slice(0, 40), blocks };
  }

  /** @param stage {object} compile() 결과. @param x {number} 월드 X. @param z {number} 월드 Z.
   * @param inset {number} 경계 안쪽 여유. @returns {boolean} 인접 바닥의 이음새도 하나의 바닥으로 판정. */
  function containsFloor(stage, x, z, inset = 0) {
    const inside = (px, pz) => stage.floorBlocks.some(b => Math.abs(px - b.x) <= b.w / 2 + 1e-7 && Math.abs(pz - b.z) <= b.d / 2 + 1e-7);
    if (!inside(x, z)) return false;
    if (inset <= 0) return true;
    for (let i = 0; i < 16; i++) {
      const angle = i * Math.PI / 8;
      if (!inside(x + Math.cos(angle) * inset, z + Math.sin(angle) * inset)) return false;
    }
    return true;
  }

  /** @param value {object} 편집 데이터. @returns {object} 기존 맵/물리에서 사용하는 단일 층 StageData.
   * @param playerRadius {number} 판정 반지름. 기본값 0.4. 실제 게임 연결 시 R을 전달.
 * 출발/목표를 각 1개 요구하고 바닥 지지와 최초 위험 겹침을 검사합니다. 연결 경로의 완주 가능성은 직접 테스트하세요. */
  function compile(value, playerRadius = 0.4) {
    const safeRadius = Math.max(playerRadius, 0.4) + 0.05;
    const map = validate(value);
    const find = type => map.blocks.filter(b => b.type === type).map(rectangle);
    const starts = find('start'), goals = find('goal'), checkpoints = find('checkpoint');
    if (starts.length !== 1 || goals.length !== 1) throw Error('출발점과 목표점을 각각 하나씩 배치하세요.');
    const start = starts[0], goal = goals[0];
    if (Math.hypot(start.x - goal.x, start.z - goal.z) < 2) throw Error('출발점과 목표점을 2칸 이상 떨어뜨려 주세요.');
    const stage = {
      editorStage: true, name: map.name, sub: '직접 만든 블록 스테이지', tag: 'CUSTOM',
      mission: '초록 목표 지점까지 굴러가세요', quote: '내가 만든 길을 달려 보자!',
      tip: '위쪽 편집으로 돌아가기 버튼으로 언제든 수정할 수 있어요.', color: '#b69a70', width: 0,
      theme: '',
      startBlock: start, goalBlock: goal, checkpointBlocks: checkpoints,
      floorBlocks: find('floor'), editorWalls: find('wall'), placedAssets: find('asset'),
      route: [[start.x, start.z], ...checkpoints.map(b => [b.x, b.z]), [goal.x, goal.z]],
      checks: checkpoints.map((_, i) => i + 1), rooms: [],
      holes: find('hole').map(b => ({ ...b, x: b.x, z: b.z, r: Math.min(b.w, b.d) / 2 })),
      sweepers: find('sweeper').map(b => ({ ...b, phase: 0 })), crumbles: find('crumble')
    };
    const theme = themeFor(map.name);
    if (theme) Object.assign(stage, { theme: theme.theme, sub: theme.sub, tag: theme.tag, color: theme.color,
      mission: theme.mission, quote: theme.quote, tip: theme.tip });
    for (const b of [start, goal, ...checkpoints]) {
      if (!containsFloor(stage, b.x, b.z, safeRadius)) throw Error('출발·목표·체크포인트 주변에 충분한 바닥을 배치하세요.');
      const blocked = stage.editorWalls.some(w => Math.abs(b.x - w.x) < w.w / 2 + safeRadius && Math.abs(b.z - w.z) < w.d / 2 + safeRadius);
      if (blocked || stage.holes.some(h => Math.hypot(b.x - h.x, b.z - h.z) < h.r + safeRadius) ||
          stage.crumbles.some(r => Math.abs(b.x-r.x) < r.w/2+safeRadius && Math.abs(b.z-r.z) < r.d/2+safeRadius)) {
        throw Error('출발·목표·체크포인트가 벽·구멍·무너지는 바닥과 겹칩니다.');
      }
    }
    return stage;
  }

  /** 매개변수 없음. @returns {object} 바로 플레이할 수 있는 예제 맵. 호출마다 독립 복사본. */
  function example() {
    const blocks = [];
    const add = (type, x, z, w = 1, d = 1) => blocks.push({ id: `example-${blocks.length}`, type, x, z, w, d });
    add('floor', -5, -3, 6, 3); add('floor', -1, -1, 3, 7); add('floor', 2, 2, 6, 3);
    add('start', -6.5, -3); add('checkpoint', -1, -1); add('goal', 3.5, 2);
    add('hole', -4, -3.8, 0.8, 0.8); add('wall', -1.8, 0.5, 0.4, 1);
    return validate({ version: 1, name: '나의 첫 블록 맵', blocks });
  }
  return { bounds, types, themes, themeFor, rectangle, validate, containsFloor, compile, example };
})();
