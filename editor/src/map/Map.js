// 담당: 맵·3D / 다유
// 오프라인 classic script. 의존 순서는 index.html 및 README.md 참고.
// 수정 안내와 전체 읽기 순서: CUSTOMIZATION.md

/**
 * [읽기 8: 맵 생성·배치 / 함수 번호 24] activeFloor
 * 역할: 현재 층의 지형 데이터를 반환합니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns object: 현재 스테이지·현재 층의 surface
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: 이 함수 본문으로 완료. 호출부에서 다음 처리를 진행합니다.
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function activeFloor() {
  return STAGES [stage].surfaces [floorLevel];
}
/**
 * [읽기 8: 맵 생성·배치 / 함수 번호 25] cornerPatches
 * 역할: 급한 모서리에 설치할 안전 벽 영역을 구합니다.
 * @param sf — object: 현재 층 surface. route/width/checks 포함
 * @returns object[]: {x,z,r} 안전 벽 설치 영역
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: 이 함수 본문으로 완료. 호출부에서 다음 처리를 진행합니다.
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function cornerPatches(sf) {
  if (sf.editorStage) return [];
  const patches = [],
  half = sf.width / 2;
  for(let i = 1; i < sf.route.length - 1; i ++) {
    const p = sf.route [i],
    a = sf.route [i - 1],
    b = sf.route [i + 1],
    la = Math.hypot(p [0] - a [0], p [1] - a [1]),
    lb = Math.hypot(b [0] - p [0], b [1] - p [1]),
    ax =(p [0] - a [0]) / la,
    az =(p [1] - a [1]) / la,
    bx =(b [0] - p [0]) / lb,
    bz =(b [1] - p [1]) / lb,
    dot = ax * bx + az * bz,
    turn = ax * bz - az * bx;
    if(Math.abs(turn) < .15) continue;
    const sign = Math.sign(turn),
    nx = - az - bz,
    nz = ax + bx,
    len = Math.hypot(nx, nz);
    patches.push({
      x : p [0] - sign * nx / len * half, z : p [1] - sign * nz / len * half, r : .64
    }
    );
    if(dot < .58) patches.push({
      x : p [0] + sign * nx * half /(1 + dot), z : p [1] + sign * nz * half /(1 + dot), r : .58
    }
    );
  }
  const end = sf.route.at(- 1);
  patches.push({
    x : end [0] - .55, z : end [1] + 1.2, r : .6
  }
  );
  return patches;
}
/** @param st {object} 스테이지. @returns {object} 카메라가 맞출 맵의 월드 경계 {minX,maxX,minZ,maxZ,minY,maxY}. */
function stageBounds(st) {
  const boxes = st.editorStage ? [... st.floorBlocks, ... st.editorWalls] : [
    ... st.surfaces.flatMap(sf => sf.route.map(([x, z]) => ({ x, z, w : Math.max(st.width, 3.2), d : Math.max(st.width, 3.2) }))),
    ... (st.rooms || []).map(r => ({ x : r.x, z : r.z, w : r.r * 2, d : r.r * 2 }))
  ];
  const heights = st.surfaces.map(sf => sf.height || 0);
  return {
    minX : Math.min(... boxes.map(b => b.x - b.w / 2)), maxX : Math.max(... boxes.map(b => b.x + b.w / 2)),
    minZ : Math.min(... boxes.map(b => b.z - b.d / 2)), maxZ : Math.max(... boxes.map(b => b.z + b.d / 2)),
    minY : Math.min(... heights) - .42, maxY : Math.max(... heights) + .9
  };
}
/**
 * [읽기 8: 맵 생성·배치 / 함수 번호 26] buildStageGeometry
 * 역할: 각 스테이지의 바닥·모서리 벽·구멍 테두리 메시와 충돌 데이터를 초기 생성합니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: onCourse → inRect → cornerPatches → face → wall → mesh → lathe
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function buildStageGeometry() {
  for(const st of STAGES) {
    st.surfaces =(st.levels || [{
      height : 0, route : st.route
    }
    ]).map((level, index) => {
      const checks = []; for(let j = 0; j < level.route.length; j ++) if(st.checks.some(i =>(st.checkLevels ?. [i] || 0) === index && Math.hypot(st.route [i] [0] - level.route [j] [0], st.route [i] [1] - level.route [j] [1]) < .01)) checks.push(j); return {
        ... st, ... level, level : index, checks
      }
      ;
    }
    );
    st.bounds = stageBounds(st);
    for(const surface of st.surfaces) {
      const cells = new Set(),
      outer = new Set(),
      sunken = new Set(),
      step = GAME_CONFIG.map.gridStep,
      minX = GAME_CONFIG.map.minX,
      minZ = GAME_CONFIG.map.minZ,
      nx = GAME_CONFIG.map.gridColumns,
      nz = GAME_CONFIG.map.gridRows;
      for(let iz = 0; iz < nz; iz ++) for(let ix = 0; ix < nx; ix ++) {
        const x = minX +(ix + .5) * step,
        z = minZ +(iz + .5) * step;
        if(! onCourse(surface, x, z)) continue;
        outer.add(ix + ',' + iz);
        if(surface.quizGoals?.some(r => r.room && inRect(x, z, r))) continue;
        // 무너지는 바닥 아래는 구덩이, 나머지는 바닥. 둥근 구멍은 면을 만들 때 잘라냅니다.
        if(surface.crumbles.some(r => ! r.quizTrap && inRect(x, z, r))) sunken.add(ix + ',' + iz);
        else cells.add(ix + ',' + iz);
      }
      const patches = cornerPatches(surface);
      surface.wallSegments = [];
      const vv = [],
      nn = [],
      pv = [],
      pn = [],
      wv = [],
      wn = [];
/**
 * [읽기 8: 맵 생성·배치 / 함수 번호 88] face
 * 역할: 사각 면을 두 삼각형으로 만들어 메시 배열에 추가합니다.
 * @param p — number[][]: 사각형의 네 정점 [x,y,z]
 * @param n — number[]: 면의 법선 [nx,ny,nz]
 * @param vs — number[]: 정점 출력 배열. 생략하면 바닥 정점 배열 (생략 시 vv)
 * @param ns — number[]: 법선 출력 배열. 생략하면 바닥 법선 배열 (생략 시 nn)
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: 이 함수 본문으로 완료. 호출부에서 다음 처리를 진행합니다.
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
      function face(p, n, vs = vv, ns = nn) {
        for(const i of [0, 1, 2, 0, 2, 3]) {
          vs.push(... p [i]);
          ns.push(... n);
        }
      }
/**
 * [읽기 8: 맵 생성·배치 / 함수 번호 89] wall
 * 역할: 모서리 안전 벽의 충돌 영역과 메시를 만듭니다.
 * @param x — number: 벽 중심 X, 월드 단위
 * @param z — number: 벽 중심 Z, 월드 단위
 * @param w — number: 벽의 X 방향 전체 폭
 * @param d — number: 벽의 Z 방향 전체 폭
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: face
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
      function wall(x, z, w, d) {
        if(! patches.some(p => Math.hypot(x - p.x, z - p.z) <= p.r)) return;
        surface.wallSegments.push({
          x, z, w, d
        }
        );
        const a = x - w / 2,
        b = x + w / 2,
        c = z - d / 2,
        e = z + d / 2,
        h = .28;
        face([[a, h, e], [b, h, e], [b, h, c], [a, h, c]], [0, 1, 0], wv, wn);
        face([[a, 0, e], [b, 0, e], [b, h, e], [a, h, e]], [0, 0, 1], wv, wn);
        face([[b, 0, c], [a, 0, c], [a, h, c], [b, h, c]], [0, 0, - 1], wv, wn);
        face([[a, 0, c], [a, 0, e], [a, h, e], [a, h, c]], [- 1, 0, 0], wv, wn);
        face([[b, 0, e], [b, 0, c], [b, h, c], [b, h, e]], [1, 0, 0], wv, wn);
      }
      // 맵 바깥에서 이어지지 않는 빈칸(벽과 바닥에 둘러싸인 틈)도 구덩이로 채웁니다.
      const blocked = (ix, iz) => {
        const key = ix + ',' + iz;
        if(outer.has(key)) return true;
        const x = minX + (ix + .5) * step, z = minZ + (iz + .5) * step;
        return (surface.editorWalls || []).some(w => Math.abs(x - w.x) < w.w / 2 && Math.abs(z - w.z) < w.d / 2);
      };
      const solid = new Set(), outside = new Set(['-1,-1']), queue = [[- 1, - 1]];
      for(let iz = 0; iz < nz; iz ++) for(let ix = 0; ix < nx; ix ++) if(blocked(ix, iz)) solid.add(ix + ',' + iz);
      while(queue.length) {
        const [ix, iz] = queue.pop();
        for(const [dx, dz] of [[1, 0], [- 1, 0], [0, 1], [0, - 1]]) {
          const jx = ix + dx, jz = iz + dz, key = jx + ',' + jz;
          if(jx < - 1 || jz < - 1 || jx > nx || jz > nz || solid.has(key) || outside.has(key)) continue;
          outside.add(key);
          queue.push([jx, jz]);
        }
      }
      for(let iz = 0; iz < nz; iz ++) for(let ix = 0; ix < nx; ix ++) {
        const key = ix + ',' + iz;
        if(! solid.has(key) && ! outside.has(key)) sunken.add(key);
      }
      for(const key of sunken) {
        const [ix, iz] = key.split(',').map(Number), x = minX + ix * step, z = minZ + iz * step, X = x + step, Z = z + step, low = - PIT_DEPTH;
        face([[x, low, Z], [X, low, Z], [X, low, z], [x, low, z]], [0, 1, 0], pv, pn);
        if(! sunken.has((ix - 1) + ',' + iz)) face([[x, low, z], [x, low, Z], [x, 0, Z], [x, 0, z]], [1, 0, 0], pv, pn);
        if(! sunken.has((ix + 1) + ',' + iz)) face([[X, low, z], [X, low, Z], [X, 0, Z], [X, 0, z]], [- 1, 0, 0], pv, pn);
        if(! sunken.has(ix + ',' + (iz - 1))) face([[x, low, z], [X, low, z], [X, 0, z], [x, 0, z]], [0, 0, 1], pv, pn);
        if(! sunken.has(ix + ',' + (iz + 1))) face([[x, low, Z], [X, low, Z], [X, 0, Z], [x, 0, Z]], [0, 0, - 1], pv, pn);
      }
      const solidFloor = key => cells.has(key) || sunken.has(key);
      for(const key of cells) {
        const [ix,
        iz] = key.split(',').map(Number),
        x = minX + ix * step,
        z = minZ + iz * step,
        X = x + step,
        Z = z + step;
        const top = Obstacles.floorPolygon([[x, Z], [X, Z], [X, z], [x, z]], surface.holes);
        for(let i = 1; top && i < top.length - 1; i ++) for(const p of [top [0], top [i], top [i + 1]]) {
          vv.push(p [0], 0, p [1]);
          nn.push(0, 1, 0);
        }
        if(! solidFloor((ix - 1) + ',' + iz)) face([[x, - .42, z], [x, - .42, Z], [x, 0, Z], [x, 0, z]], [- 1, 0, 0]);
        if(! solidFloor((ix + 1) + ',' + iz)) face([[X, - .42, Z], [X, - .42, z], [X, 0, z], [X, 0, Z]], [1, 0, 0]);
        if(! solidFloor(ix + ',' +(iz - 1))) face([[X, - .42, z], [x, - .42, z], [x, 0, z], [X, 0, z]], [0, 0, - 1]);
        if(! solidFloor(ix + ',' +(iz + 1))) face([[x, - .42, Z], [X, - .42, Z], [X, 0, Z], [x, 0, Z]], [0, 0, 1]);
      }
      for(const key of outer) {
        const [ix,
        iz] = key.split(',').map(Number),
        x = minX + ix * step,
        z = minZ + iz * step;
        if(! outer.has((ix - 1) + ',' + iz)) wall(x, z + step / 2, .16, step + .02);
        if(! outer.has((ix + 1) + ',' + iz)) wall(x + step, z + step / 2, .16, step + .02);
        if(! outer.has(ix + ',' +(iz - 1))) wall(x + step / 2, z, step + .02, .16);
        if(! outer.has(ix + ',' +(iz + 1))) wall(x + step / 2, z + step, step + .02, .16);
      }
      surface.floor = mesh(vv, nn);
      surface.walls = mesh(wv, wn);
      surface.pit = mesh(pv, pn);
      const holes = surface.holes.map(h => Obstacles.holeMeshes(h));
      surface.rims = holes.map(h => h.rim);
      surface.pits = holes.map(h => h.pit);
    }
  }
}
/**
 * [읽기 8: 맵 생성·배치 / 함수 번호 27] mapScenery
 * 역할: 스테이지별 작업대·가마·전시대와 배경을 그립니다.
 * @param root — Float32Array(16): 기울기를 적용한 월드 부모 행렬
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: block → inHole → pot → mul → translate
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function mapScenery(root) {
  if (STAGES[stage].editorStage) return;
  const st = STAGES [stage];
  if(stage === 0) {
    for(const room of st.rooms) for(let i = 0; i < 4; i ++) {
      const a = i * TAU / 4;
      block(root, room.x + Math.cos(a) * 1.5, .015, room.z + Math.sin(a) * 1.5, .12, .025, .12, '#e6c497');
    }
  }
  else if(stage === 1) {
    for(const x of [- 2.5, 2.5]) {
      block(root, x, .65, 0, 2.05, 1.3, 3.1, '#a96f4b');
      block(root, x, 1.5, 0, 1.65, .45, 2.55, '#bb8960');
      block(root, x, 2.1, 0, .8, .85, 1, '#bf9970');
      block(root, x - .01, .45, 1.59, 1.02, .88, .06, '#5b5144');
      for(let i = 0; i < 4; i ++) block(root, x - .82 + i * .55, 1.3, .02, .07, .06, 3.1, '#e0b28b');
    }
    for(const x of [- 5, 0, 5]) for(let z = - 2.8; z < 3; z += .62) {
      if(! inHole(st, x, z)) block(root, x, .021, z, 2.2, .035, .12, '#d1a574');
    }
  }
  else {
    for(const x of [- 2.7, 2.7]) {
      block(root, x, .22, - .75, 2.3, .44, 2.25, '#c5c7b4');
      block(root, x, .49, - .75, 2.08, .1, 2.03, '#e0decb');
      pot(mul(root, translate(x, .98, - .75)), x < 0 ? 1 : 2, 0, .8);
      for(const dx of [- .95, .95]) for(const dz of [- .9, .9]) block(root, x + dx, 1.15, - .75 + dz, .065, 1.22, .065, '#a3b9ae');
      block(root, x, 1.79, - .75, 2.08, .075, 2.03, '#d5dfd1');
    }
    for(const [x, z] of [[- 9, - 5.2], [8, - 5.2], [- 9, 5.2], [8, 5.2]]) {
      block(root, x, .85, z, .48, 1.7, .48, '#c1c8b5');
      block(root, x, 1.74, z, .7, .12, .7, '#d5d9c5');
    }
  }
}
/**
 * [읽기 8: 맵 생성·배치 / 함수 번호 28] worldScene
 * 역할: 맵·구멍·체크포인트·장애물·옹기를 배치합니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: getWorldViewProjection → mul → rz → rx → translate → block → draw → mix → inHole → inRect → sweeperAt → mapScenery → scale → pot
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function worldScene() {
  vp = getWorldViewProjection();
  const root = mul(rz(angle), rx(tiltZ)),
  st = STAGES [stage],
  shadowed = Lighting.beginShadow(root, st.bounds);
  if(shadowed) {
    worldObjects(root, st, true);
    Lighting.endShadow();
  }
  Lighting.useWorld(worldEye, shadowed);
  worldObjects(root, st, shadowed);
}
/** @param root {Float32Array} 기울어진 맵 행렬. @param st {object} 스테이지. @param shadowed {boolean} 섀도 맵을 쓰는 프레임인지.
 * @returns {void} 맵과 옹기를 그립니다. 그림자 패스와 화면 패스에서 같은 물체를 그리기 위해 함께 사용합니다. */
function worldObjects(root, st, shadowed) {
// The canvas clear colour is the full-bleed backdrop; no bounded background slab.
  for(const sf of st.surfaces) {
    const base = mul(root, translate(0, sf.height, 0));
    if(st.levels) {
      for(const p of [sf.route [0], sf.route.at(- 1)]) {
        const h = sf.height + 1.8;
        block(root, p [0], sf.height - h / 2 - .3, p [1], .7, h, .7, '#a4b0ac');
      }
      block(base, sf.route [0] [0], - .23, sf.route [0] [1], 1.9, .13, 1.9, '#82979c');
    }
    if(!AssetBank.drawFloor(sf.floor,base,st.color))draw(sf.floor, base, st.color,sf.editorStage);
    AssetBank.drawFloorSkins(sf,base,st.color);
    draw(sf.pit, base, '#8a5c3c', MATERIAL.pit, undefined, { origin : [0, sf.height || 0, 0] });
    draw(sf.walls, base, sf.editorStage ? '#a47448' : '#e6d5ad', sf.editorStage);
    for (const wall of sf.editorWalls || []) {
      if (!wall.roomId && !AssetBank.drawBlock('wall',wall,base,.35,.7,'#a47448')) {
        block(base,wall.x,.35,wall.z,wall.w,.7,wall.d,'#a47448',0,true);
      }
    }
    for(let j = 1; !sf.editorStage && j < sf.route.length; j ++) {
      const a = sf.route [j - 1],
      b = sf.route [j],
      len = Math.hypot(b [0] - a [0], b [1] - a [1]);
      for(let d = .5; d < len - .4; d += .7) {
        const t = d / len,
        x = mix(a [0], b [0], t),
        z = mix(a [1], b [1], t);
        if(! inHole(sf, x, z) && ! sf.crumbles.some(r => inRect(x, z, r))) block(base, x, .014, z, .1, .025, .1, '#eee2c5');
      }
    }
    for(let i = 0; i < sf.holes.length; i ++) Obstacles.drawHole(sf, base, i);
    for(const index of st.checks) {
      if((st.checkLevels ?. [index] || 0) !== sf.level) continue;
      const p = st.route [index];
      const marker=st.checkpointBlocks?.[st.checks.indexOf(index)] || {x:p[0],z:p[1],w:1,d:1};
      if (sf.editorStage && !AssetBank.skinId('checkpoint',marker)) {
        const saved = index <= checkpoint.index;
        const color = saved ? '#22775e' : '#215e65';
        block(base,marker.x,.024,marker.z,1,.048,1,'#f5e6ce');
        block(base,marker.x,.054,marker.z,.91,.038,.91,color);
        block(base,marker.x,.078,marker.z,.53,.018,.53,'#fff8e9');
        block(base,marker.x+.027,.094,marker.z-.139,.27,.018,.14,color);
        block(base,marker.x,.094,marker.z+.116,.36,.018,.17,color);
        block(base,marker.x,.108,marker.z+.12,.26,.018,.036,'#fff8e9');
        continue;
      }
      if(!AssetBank.drawBlock('checkpoint',marker,base,.02,.04,'#a0ba85')) block(base, p [0], .02, p [1], sf.editorStage ? 1 : 1.15, .04, sf.editorStage ? 1 : 1.15, index <= checkpoint.index ? '#6b9b69' : '#a0ba85');
      block(base, p [0], .05, p [1], .6, .03, .6, '#dce7b4');
    }
    for(let i = 0; i < sf.crumbles.length; i ++) {
      const r = sf.crumbles [i],
      c = crumbles [i];
      if (r.quizTrap) continue;
      const skin = AssetBank.skinId('crumble', r);
      if(skin && c.down > 0) continue;
      const shake = c.charge > 0 ? Math.sin(simulationTime * 48) * .025 : 0;
      if(! skin || ! AssetBank.drawBlock('crumble',r,base,.015+shake,.12,c.charge>1.6?'#cf6950':'#c99c63')) Obstacles.drawCrumble(base, r, c, simulationTime, sf.height || 0);
    }
    for(const h of sf.sweepers) {
      const q = sweeperAt(h, simulationTime);
      Obstacles.drawTrack(base, h, sf.height || 0);
      if(! AssetBank.drawBlock('sweeper',{...h,...q},base,.38,.76,'#c75f44')) Obstacles.drawWheel(base, q, simulationTime, sf.height || 0);
    }
  }
  AssetBank.drawWorld(root, st);
  mapScenery(root);
  const last = st.surfaces.at(- 1),
  goalRoot = mul(root, translate(0, last.height, 0)),
  g = st.route.at(- 1);
  if(st.startBlock) AssetBank.drawBlock('start',st.startBlock,mul(root,translate(0,st.surfaces[0].height,0)),.025,.05,'#459caa');
  if (st.quiz) {
    const trapDown = st.crumbles.some((r,i) => r.quizTrap && crumbles[i].down > 0);
    for (const marker of st.quizGoals) {
      const collapsing = trapDown && marker !== st.goalBlock;
      if (collapsing && !marker.room) continue;
      const {x,z,w,d,type} = marker;
      const roomRoot = collapsing ? mul(goalRoot,translate(0,-fallTime*fallTime*12,0)) : goalRoot;
      if (marker.room) {
        const seam = GAME_CONFIG.map.gridStep;
        block(roomRoot,x,-.19,z,w+seam,.4,d+seam,st.color,0,true);
        for (const wall of st.editorWalls.filter(w=>w.roomId===marker.id)) {
          if (!AssetBank.drawBlock('wall',wall,roomRoot,.38,.76,'#a47448')) {
            block(roomRoot,wall.x,.38,wall.z,wall.w,.76,wall.d,'#a47448',0,true);
          }
        }
      }
      const isCircle = type === 'goalO';
      const ink = isCircle ? '#32665e' : '#974c40';
      const plate = BlockMap.quizPlate(marker);
      const plateY=.047, inkY=.085;
      if (!AssetBank.drawBlock(type,plate,roomRoot,plateY,.06,'#f1e7d4')) {
        block(roomRoot,x,.032,z,plate.w,.045,plate.d,'#b0a28a');
        block(roomRoot,x,.059,z,plate.w*.94,.04,plate.d*.94,'#f1e7d4');
      }
      if (isCircle) {
        for (let i = 0; i < 20; i++) {
          const a = i * Math.PI / 10;
          block(roomRoot,x+Math.cos(a)*.25,inkY,z+Math.sin(a)*.25,
            .092,.015,.092,ink);
        }
      } else {
        for (const angle of [-Math.PI/4,Math.PI/4]) {
          const arm = mul(translate(x,inkY,z),mul(ry(angle),scale(.095,.015,.64)));
          draw(cube,mul(roomRoot,arm),ink);
        }
      }
    }
  } else {
    if(!AssetBank.drawBlock('goal',st.goalBlock || {x:g[0],z:g[1],w:1,d:1},goalRoot,.04,.08,'#779d67')) block(goalRoot, g [0], .04, g [1], st.editorStage ? 1 : 1.7, .08, st.editorStage ? 1 : 1.7, '#779d67');
    block(goalRoot, g [0], .1, g [1], st.editorStage ? .7 : 1.15, .05, st.editorStage ? .7 : 1.15, '#d6dfad');
    block(goalRoot, g [0] + 1, .85, g [1] + .7, .09, 1.7, .09, '#789068');
    block(goalRoot, g [0] + .55, 1.55, g [1] + .7, .9, .42, .07, '#9ebc79');
    if(stage === STAGES.length - 1) {
      const silhouette = mul(goalRoot, mul(translate(g [0] + .55, 1.58, g [1] + .77), scale(.28, .28, .025))),
      info = COLLECTION [selected];
      if(! AssetBank.drawOnggi(silhouette, selected, 0, 1, '#466744')) {
        draw(pots [selected], silhouette, '#466744');
        draw(lids, mul(silhouette, mul(translate(0, info.lidY, 0), scale(info.lidSize, 1, info.lidSize))), '#466744');
      }
      if(screen === 'arrival') {
        const q = arrival.t / arrival.duration;
        block(goalRoot, g [0], .2 * q, g [1], 1.55, .4 * q + .01, 1.55, '#b7bba3');
      }
    }
  }
  for(let i = 0; !st.editorStage && i < 4; i ++) {
    const x = i % 2 === 0 ? - 11 : 10.4,
    z = - 4 + i * 2.8;
    block(root, x, - .5, z, 1.7, .7, 1.7, '#b6ba9f');
    if(stage === 1) {
      block(root, x, .3, z, 1.5, .9, 1.5, '#b98a64');
      block(root, x, 1.1, z, .65, .85, .65, '#c69b76');
    }
    else pot(mul(root, translate(x, .45, z)), i % 3, 0, .72);
  }
// 섀도 맵을 쓸 수 없는 기기에서는 기존의 네모 그림자를 표시합니다.
  if(! falling && ! shadowed) block(root, px, py + .025, pz, .6, .035, .55, '#7a735f');
  const sizeRatio = R / GAME_CONFIG.physics.playerRadius;
  const drop = ! falling ? 0 : flung ? - .35 * Math.sin(Math.min(1, fallTime / .45) * Math.PI) : Math.min(5, (fallTime - fallStart) ** 2 * 6);
  pot(mul(root, mul(translate(px, py + potRest(selected, rollQ) * .66 * sizeRatio - drop, pz), quatMatrix(rollQ))), selected, 0, .66 * sizeRatio);
}
