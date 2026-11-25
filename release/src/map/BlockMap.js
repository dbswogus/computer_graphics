/* 읽기 1: 데이터 규격 → validate → containsFloor → compile.
 * 편집 좌표는 월드 X/Z, 길이는 월드 단위. 회전은 0/90도만 지원합니다.
 * DOM/WebGL과 무관한 순수 데이터 모듈이므로 단독 테스트할 수 있습니다. */
const BlockMap = (() => {
  const bounds = { minX: -9, maxX: 8, minZ: -6, maxZ: 6 };
  const types = ['floor', 'wall', 'hole', 'sweeper', 'crumble', 'checkpoint', 'start', 'goal', 'goalO', 'goalX', 'asset'];

  const edges = {
    north: { x: 0, z: -.375, w: 1, d: .25 },
    south: { x: 0, z: .375, w: 1, d: .25 },
    west: { x: -.375, z: 0, w: .25, d: 1 },
    east: { x: .375, z: 0, w: .25, d: 1 }
  };
  const directions = { north:'위', south:'아래', west:'왼쪽', east:'오른쪽' };
  const presets = Object.fromEntries(Object.entries(directions).map(([edge, label]) =>
    ['wall-' + edge, { label: label + ' 벽', edges: [edge] }]));
  for (const vertical of ['north', 'south']) for (const horizontal of ['west', 'east']) {
    presets['corner-' + vertical + '-' + horizontal] = {
      label: directions[vertical] + ' ' + directions[horizontal] + ' 모서리',
      edges: [vertical, horizontal]
    };
  }
  const quizGoals = ['goalO', 'goalX'];
  const uniqueTypes = ['start', 'goal', ...quizGoals];

  function roomWalls(room) {
    const angle = room.rotation * Math.PI / 180;
    const cos = Math.round(Math.cos(angle)), sin = Math.round(Math.sin(angle));
    const thickness = .24;
    return [
      [0,-1.38,3,thickness], [0,1.38,3,thickness], [1.38,0,thickness,2.52],
      [-1.38,-.98,thickness,.56], [-1.38,.98,thickness,.56]
    ].map(([x,z,w,d]) => ({
      x:room.x+x*cos-z*sin, z:room.z+x*sin+z*cos,
      w:cos ? w : d, d:cos ? d : w, roomId:room.id
    }));
  }

  function quizPlate(marker) {
    return marker.room ? { ...marker, w:1, d:1 } : marker;
  }

  function parts(block) {
    if (!block.preset) return [rectangle(block)];
    return presets[block.preset].edges.map(edge => {
      const { x, z, w, d } = edges[edge];
      const rotated = block.rotation === 90;
      return rectangle({ ...block, x: block.x + (rotated ? -z : x),
        z: block.z + (rotated ? x : z), w, d });
    });
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
      if (source.room === true && quizGoals.includes(block.type)) block.room = true;
      if (ids.has(block.id)) throw Error('블록 ID가 중복되었습니다.');
      ids.add(block.id);
      for (const [key, fallback, min, max] of [
        ['x', 0, -9, 8], ['z', 0, -6, 6], ['w', 1, 0.3, 8], ['d', 1, 0.3, 8],
        ['period', 5, 0.5, 30], ['amp', 1, 0, 4], ['rotation', 0, 0, block.room ? 270 : 90]
      ]) {
        const number = source[key] === undefined ? fallback : source[key];
        if (typeof number !== 'number' || !Number.isFinite(number) || number < min || number > max) {
          throw Error(`${i + 1}번째 블록 ${key}: ${min}~${max} 범위의 숫자가 필요합니다.`);
        }
        block[key] = number;
      }
      if (block.rotation % 90 !== 0) throw Error('회전은 90도 단위로만 가능합니다.');
      if (block.room) block.w = block.d = 3;
      block.axis = source.axis === undefined ? 'x' : source.axis;
      if (!['x', 'z'].includes(block.axis)) throw Error('왕복 축은 x 또는 z입니다.');
      if (source.preset !== undefined) {
        if (source.type !== 'wall' || !Object.hasOwn(presets, source.preset)) throw Error('벽 프리셋이 올바르지 않습니다.');
        block.preset = source.preset;
      }
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
    for (const type of uniqueTypes) {
      if (blocks.filter(block => block.type === type).length > 1) throw Error('출발점과 각 도착 지점은 하나씩만 배치하세요.');
    }
    const map = { version: 1, name: String(value.name || '내가 만든 맵').slice(0, 40), blocks };
    if (value.quiz !== undefined) {
      const quiz = value.quiz;
      if (!quiz || typeof quiz.question !== 'string' || quiz.question.length > 160 ||
          !['O', 'X'].includes(quiz.answer)) throw Error('문제는 160자 이하여야 하고 정답은 O 또는 X여야 합니다.');
      map.quiz = { question: quiz.question.trim(), answer: quiz.answer };
    }
    return map;
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
    const options = quizGoals.flatMap(find);
    const quiz = map.quiz;
    if (starts.length !== 1) throw Error('출발점을 하나 배치하세요.');
    if (quiz || options.length) {
      if (!quiz?.question || options.length !== 2 || goals.length) {
        throw Error('문제와 정답을 입력하고 O·X 도착 지점을 각각 배치하세요. 일반 목표점은 제거해 주세요.');
      }
      const [a,b] = options;
      const overlap = Math.abs(a.x-b.x) < (a.w+b.w)/2 && Math.abs(a.z-b.z) < (a.d+b.d)/2;
      if (overlap || Math.hypot(a.x-b.x,a.z-b.z) < 2 ||
          checkpoints.some(c => options.some(b => Math.hypot(c.x - b.x, c.z - b.z) < 2))) {
        throw Error('O·X 방과 세이브 지점이 겹치지 않게 배치하세요.');
      }
    } else if (goals.length !== 1) throw Error('목표점을 하나 배치하세요.');
    const start = starts[0], goal = quiz ? options.find(b => b.type === 'goal' + quiz.answer) : goals[0];
    const trap = options.find(b => b !== goal);
    if ((quiz ? options : [goal]).some(b => Math.hypot(start.x - b.x, start.z - b.z) < 2)) {
      throw Error('출발점과 도착 지점을 2칸 이상 떨어뜨려 주세요.');
    }
    const stage = {
      editorStage: true, name: map.name, sub: '직접 만든 블록 스테이지', tag: 'CUSTOM',
      mission: quiz?.question || '초록 목표 지점까지 굴러가세요', quote: '내가 만든 길을 달려 보자!',
      tip: '위쪽 편집으로 돌아가기 버튼으로 언제든 수정할 수 있어요.', color: '#c5965e', width: 0,
      startBlock: start, goalBlock: goal, checkpointBlocks: checkpoints,
      floorBlocks: [...find('floor'), ...options.filter(b=>b.room)],
      editorWalls: [...map.blocks.filter(b => b.type === 'wall').flatMap(parts),
        ...options.filter(b=>b.room).flatMap(roomWalls)], placedAssets: find('asset'),
      route: [[start.x, start.z], ...checkpoints.map(b => [b.x, b.z]), [goal.x, goal.z]],
      checks: checkpoints.map((_, i) => i + 1), rooms: [],
      holes: find('hole').map(b => ({ ...b, x: b.x, z: b.z, r: Math.min(b.w, b.d) / 2 })),
      sweepers: find('sweeper').map(b => ({ ...b, phase: 0 })), crumbles: find('crumble')
    };
    for (const room of options.filter(b=>b.room)) {
      const inside = (x,z,pad=0) => Math.abs(x-room.x)<1.5+pad && Math.abs(z-room.z)<1.5+pad;
      if ([start,...checkpoints].some(b=>inside(b.x,b.z,safeRadius)) ||
          stage.holes.some(b=>inside(b.x,b.z,b.r)) ||
          [...stage.crumbles,...stage.editorWalls.filter(w=>!w.roomId)].some(b=>
            Math.abs(b.x-room.x)<1.5+b.w/2 && Math.abs(b.z-room.z)<1.5+b.d/2)) {
        throw Error('O/X 방 안의 출발점, 세이브 지점, 벽 또는 위험 블록을 옮겨 주세요.');
      }
    }
    for (const b of [start, ...(quiz ? options : [goal]), ...checkpoints]) {
      if (!containsFloor(stage, b.x, b.z, safeRadius)) throw Error('출발·목표·체크포인트 주변에 충분한 바닥을 배치하세요.');
      const blocked = stage.editorWalls.some(w => Math.abs(b.x - w.x) < w.w / 2 + safeRadius && Math.abs(b.z - w.z) < w.d / 2 + safeRadius);
      if (blocked || stage.holes.some(h => Math.hypot(b.x - h.x, b.z - h.z) < h.r + safeRadius) ||
          stage.crumbles.some(r => Math.abs(b.x-r.x) < r.w/2+safeRadius && Math.abs(b.z-r.z) < r.d/2+safeRadius)) {
        throw Error('출발·목표·체크포인트가 벽·구멍·무너지는 바닥과 겹칩니다.');
      }
    }
    if (quiz) {
      stage.quiz = quiz;
      stage.quizGoals = options;
      stage.crumbles.push({ ...trap, quizTrap: true });
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
  function quizExample() {
    const blocks = [];
    const add = (type,x,z,extra={}) => blocks.push({id:'quiz-'+blocks.length,type,x,z,...extra});
    for (let x=-6.5;x<=2.5;x++) for (let z=-3.5;z<=3.5;z++) add('floor',x,z);
    add('start',-5.5,.5);
    add('checkpoint',-.5,.5);
    add('goalO',4.5,-2.5,{room:true});
    add('goalX',4.5,2.5,{room:true});
    return validate({version:1,name:'황토 O/X 방',blocks,
      quiz:{question:'옹기는 흙으로 만들어요.',answer:'O'}});
  }

  return { bounds, types, presets, uniqueTypes, parts, roomWalls, quizPlate, rectangle, validate, containsFloor, compile, example, quizExample };
})();
