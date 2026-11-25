// 담당: 맵·3D / 다유
// 오프라인 classic script. Map.js 다음에 읽습니다. 모양만 담당하며 충돌 판정은 Physics.js가 처리합니다.

/* 읽기: 재질 번호 → bevelBox → floorPolygon/holeMeshes → drawHole → drawWheel → drawCrumble.
 * 재질 번호는 Renderer.js의 조각 셰이더 surfaceMaterial과 같습니다. */
const MATERIAL = { plain : 0, earth : 1, pit : 2, wheel : 3, clay : 4, wood : 5, cracked : 6 };
const PIT_DEPTH = .95;
// 물레가 도는 빠르기, 초당 라디안. 튕겨 나가는 방향에도 쓰입니다.
const WHEEL_SPIN = 6.5;

const Obstacles = (() => {
  const boxes = new Map();
  let rod = null, wheelParts = null;

  /** @param w {number} @param h {number} @param d {number} 크기. @param b {number} 모서리를 깎는 폭.
   * @returns {object} 모서리를 깎은 상자 메시. 같은 크기는 다시 만들지 않습니다. */
  function bevelBox(w, h, d, b) {
    const key = [w, h, d, b].map(n => n.toFixed(3)).join();
    if(boxes.has(key)) return boxes.get(key);
    const half = [w / 2, h / 2, d / 2], v = [], n = [];
    // axis 방향 면에 놓이는 꼭짓점. 나머지 두 축은 b만큼 안쪽입니다.
    const point = (axis, s) => half.map((size, i) => s [i] * (i === axis ? size : size - b));
    const add = (points, normal) => {
      const length = Math.hypot(... normal);
      for(let i = 1; i < points.length - 1; i ++) for(const p of [points [0], points [i], points [i + 1]]) {
        v.push(... p);
        n.push(... normal.map(x => x / length));
      }
    };
    const signs = fixed => {
      const free = [0, 1, 2].filter(i => fixed [i] === 0);
      return (free.length === 2 ? [[- 1, - 1], [1, - 1], [1, 1], [- 1, 1]] : [[- 1], [1]]).map(values => {
        const s = [... fixed];
        free.forEach((axis, i) => { s [axis] = values [i]; });
        return s;
      });
    };
    for(let axis = 0; axis < 3; axis ++) for(const side of [- 1, 1]) {
      const normal = [0, 0, 0];
      normal [axis] = side;
      add(signs(normal).map(s => point(axis, s)), normal);
    }
    for(const [p, q] of [[0, 1], [0, 2], [1, 2]]) for(const sp of [- 1, 1]) for(const sq of [- 1, 1]) {
      const normal = [0, 0, 0];
      normal [p] = sp;
      normal [q] = sq;
      const [a, c] = signs(normal);
      add([point(p, a), point(p, c), point(q, c), point(q, a)], normal);
    }
    for(const x of [- 1, 1]) for(const y of [- 1, 1]) for(const z of [- 1, 1]) add([0, 1, 2].map(axis => point(axis, [x, y, z])), [x, y, z]);
    const result = mesh(v, n);
    boxes.set(key, result);
    return result;
  }

  /** 매개변수 없음. @returns {object} 반지름 1, 높이 1인 세로 원기둥. */
  function cylinder() {
    if(! rod) rod = lathe([[0, - .5], [1, - .5], [1, .5], [0, .5]]);
    return rod;
  }

  /** @returns {number} 가장 가까운 구멍 가장자리까지의 거리. 구멍 안쪽은 음수. */
  function holeDistance(x, z, holes) {
    let best = Infinity;
    for(const h of holes) best = Math.min(best, Math.hypot(x - h.x, z - h.z) - h.r);
    return best;
  }

  /** 바닥 한 칸에서 구멍 부분을 잘라냅니다(마칭 스퀘어). 격자보다 매끄러운 원이 됩니다.
   * @param corners {number[][]} 칸의 네 꼭짓점 [x,z], 순서대로. @param holes {object[]} 구멍.
   * @returns {number[][]|null} 남는 다각형. 전부 구멍이면 null. */
  function floorPolygon(corners, holes) {
    const distance = corners.map(([x, z]) => holeDistance(x, z, holes));
    if(distance.every(d => d >= 0)) return corners;
    if(distance.every(d => d < 0)) return null;
    const polygon = [];
    corners.forEach((p, i) => {
      const j = (i + 1) % 4, q = corners [j];
      if(distance [i] >= 0) polygon.push(p);
      if((distance [i] >= 0) === (distance [j] >= 0)) return;
      const t = distance [i] / (distance [i] - distance [j]);
      polygon.push([mix(p [0], q [0], t), mix(p [1], q [1], t)]);
    });
    return polygon;
  }

  /** @param h {object} 구멍. @returns {object} {rim,pit}. rim은 바닥 위 둥근 테두리, pit은 안쪽 벽과 어두운 바닥. */
  function holeMeshes(h) {
    const r = h.r;
    return {
      rim : lathe([[r + .12, - .01], [r + .115, .02], [r + .09, .048], [r + .055, .058], [r + .02, .046], [r - .012, .012], [r - .022, - .03]]),
      pit : lathe([[r - .022, - .03], [r - .03, - .2], [r - .03, - PIT_DEPTH], [0, - PIT_DEPTH]])
    };
  }

  /** @param sf {object} 바닥. @param base {Float32Array} 맵 행렬. @param i {number} 구멍 번호. @returns {void} 테두리와 깊은 안쪽. */
  function drawHole(sf, base, i) {
    const h = sf.holes [i], model = mul(base, translate(h.x, 0, h.z)), origin = [0, sf.height || 0, 0];
    draw(sf.pits [i], model, '#8a5c3c', MATERIAL.pit, undefined, { origin });
    if(! AssetBank.drawSurface(sf.rims [i], model, '#d17f56', AssetBank.skinId('hole', h))) {
      draw(sf.rims [i], model, '#b5673f', MATERIAL.earth, GAME_CONFIG.lighting.gloss.prop, { origin });
    }
  }

  /** 나무 홈통으로 물레가 오가는 범위를 표시. */
  function drawTrack(base, h, y) {
    // 바닥에 붙은 납작한 부품은 그림자 패스에서 생략합니다.
    if(Lighting.inShadowPass) return;
    const alongX = h.axis === 'x', length = h.amp * 2 + (alongX ? h.w : h.d) * .7;
    const part = (a, b, height, sa, sh, sb, color, kind) => draw(bevelBox(alongX ? sa : sb, sh, alongX ? sb : sa, .006),
      mul(base, translate(h.x + (alongX ? a : b), height, h.z + (alongX ? b : a))), color, kind, undefined, { origin : [h.x, y, h.z] });
    part(0, 0, .008, length, .014, .22, '#3b2a20', MATERIAL.plain);
    for(const side of [- 1, 1]) part(0, side * .14, .02, length + .1, .04, .07, '#7d5536', MATERIAL.wood);
    for(const end of [- 1, 1]) part(end * (length / 2 + .02), 0, .025, .08, .05, .36, '#6a452c', MATERIAL.wood);
  }

  /** 매개변수 없음. @returns {object} 물레 부품 메시. 반지름 0.5 기준. */
  function wheelMeshes() {
    if(! wheelParts) wheelParts = {
      head : lathe([[0, .19], [.42, .19], [.475, .215], [.485, .25], [.475, .285], [.455, .3], [0, .3]]),
      pot : lathe([[0, 0], [.19, 0], [.225, .04], [.262, .13], [.262, .2], [.222, .275], [.168, .325], [.172, .355], [.2, .385], [.196, .4], [.178, .396], [.15, .35], [.146, .325], [.2, .25], [.225, .15], [.15, .06], [0, .05]]),
      lump : lathe([[0, 0], [.07, 0], [.085, .025], [.065, .06], [.025, .075], [0, .077]])
    };
    return wheelParts;
  }

  /** 빙글빙글 도는 도자기 물레. 원판·흙덩이·빚는 중인 그릇이 함께 돌며, 무늬도 같은 각도로 돌립니다.
   * @param base {Float32Array} 맵 행렬. @param q {object} 현재 위치와 크기. @param time {number} 초. @param y {number} 바닥 높이. */
  function drawWheel(base, q, time, y) {
    const size = Math.min(q.w, q.d), spin = time * WHEEL_SPIN, gloss = GAME_CONFIG.lighting.gloss, parts = wheelMeshes();
    const root = mul(base, mul(translate(q.x, 0, q.z), scale(size, size, size)));
    const options = { origin : [q.x, y, q.z], spin };
    draw(cylinder(), mul(root, mul(translate(0, .1, 0), scale(.17, .2, .17))), '#5a3b27', MATERIAL.wood, undefined, options);
    const turning = mul(root, ry(spin));
    draw(parts.head, turning, '#8a6040', MATERIAL.wheel, gloss.prop, { ... options, param : size * .485 });
    // 살짝 중심이 어긋난 채 돌아 손으로 빚는 느낌을 줍니다.
    draw(parts.pot, mul(turning, translate(.014, .3, 0)), '#b58a66', MATERIAL.clay, gloss.wet, options);
    for(let i = 0; i < 3; i ++) {
      const a = i * TAU / 3 + .5;
      draw(parts.lump, mul(turning, translate(Math.cos(a) * .345, .3, Math.sin(a) * .345)), '#a87b58', MATERIAL.clay, gloss.wet, options);
    }
  }

  /** 금 간 바닥. 밟으면 균열이 번지며 흔들리고, 무너지면 조각으로 떨어진 뒤 다시 올라옵니다.
   * @param base {Float32Array} 맵 행렬. @param r {object} 배치. @param c {object} {charge,down}. @param time {number} 초. @param y {number} 바닥 높이. */
  function drawCrumble(base, r, c, time, y) {
    const physics = GAME_CONFIG.physics, height = .12, top = .02 - height / 2;
    // 칸마다 균열 무늬가 다르도록 무늬 원점을 배치 위치에 따라 옮깁니다.
    const origin = [r.x * - 2.7, y, r.z * - 4.1];
    const wear = clamp(c.charge / physics.crumblingDelay, 0, 1);
    if(c.down > 0) {
      const since = physics.crumblingRecovery - c.down;
      if(since < 1) {
        // 칸마다 조금씩 늦게 떨어지는 3×3 조각
        for(let i = 0; i < 3; i ++) for(let j = 0; j < 3; j ++) {
          const seed = Math.sin((i * 3 + j) * 12.9898 + r.x * 78.233 + r.z) * 43758.5453, random = seed - Math.floor(seed);
          const t = Math.max(0, since - random * .18), drop = t * t * 5;
          if(drop > PIT_DEPTH - .1) continue;
          const model = mul(base, mul(translate(r.x + (i - 1) * r.w / 3, top - drop, r.z + (j - 1) * r.d / 3), mul(rz((random - .5) * t * 5), rx((random * 7 % 1 - .5) * t * 5))));
          draw(bevelBox(r.w / 3 - .02, height, r.d / 3 - .02, .015), model, '#b97f4c', MATERIAL.cracked, undefined, { origin, param : 1 });
        }
      }
      if(c.down >= .5) return;
    }
    const rising = c.down > 0 ? (c.down / .5) ** 2 * (PIT_DEPTH - .2) : 0;
    const shake = c.charge > 0 && c.down <= 0 ? (.006 + .018 * wear) * Math.sin(time * 48) : 0;
    draw(bevelBox(r.w - .03, height, r.d - .03, .02), mul(base, translate(r.x + shake, top - rising + Math.abs(shake) * .6, r.z + shake * .7)),
      wear > .72 ? '#c9764f' : '#c08a56', MATERIAL.cracked, undefined, { origin, param : c.down > 0 ? 0 : wear });
  }

  return { bevelBox, floorPolygon, holeMeshes, drawHole, drawTrack, drawWheel, drawCrumble };
})();
