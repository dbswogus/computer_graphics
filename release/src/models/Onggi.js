// 담당: 맵·3D / 다유
// 오프라인 classic script. 의존 순서는 index.html 및 README.md 참고.
// 수정 안내와 전체 읽기 순서: CUSTOMIZATION.md

/**
 * [읽기 8: 옹기 모델 / 함수 번호 20] lathe
 * 역할: 단면을 회전시켜 옹기 또는 테두리 메시를 만듭니다.
 * @param profile — number[][]: [반지름,Y높이] 단면 목록. 순서대로 이어 회전시킴
 * @returns object: 회전 단면의 GPU 메시
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: mesh
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function lathe(profile) {
  const v = [],
  n = [],
  N = 48;
  // 각 마디의 법선 [반지름 방향, 높이 방향]. 완만하게 이어지는 마디끼리는 평균내어 반사광이 끊기지 않게 합니다.
  const normals = profile.slice(1).map(([r1, y1], j) => {
    const [r0, y0] = profile [j], len = Math.hypot(y1 - y0, r1 - r0) || 1;
    return [(y1 - y0) / len, - (r1 - r0) / len];
  });
  const blend = (a, b) => {
    if(! b || a [0] * b [0] + a [1] * b [1] < .64) return a;
    const x = a [0] + b [0], y = a [1] + b [1], len = Math.hypot(x, y) || 1;
    return [x / len, y / len];
  };
  for(let j = 0; j < profile.length - 1; j ++) {
    const [r0,
    y0] = profile [j],
    [r1,
    y1] = profile [j + 1],
    n0 = blend(normals [j], normals [j - 1]),
    n1 = blend(normals [j], normals [j + 1]);
    for(let i = 0; i < N; i ++) {
      const a = i * TAU / N,
      b =(i + 1) * TAU / N;
      for(const [r, y, t, m] of [[r0, y0, a, n0], [r1, y1, a, n1], [r1, y1, b, n1], [r0, y0, a, n0], [r1, y1, b, n1], [r0, y0, b, n0]]) {
        v.push(r * Math.cos(t), y, r * Math.sin(t));
        n.push(m [0] * Math.cos(t), m [1], m [0] * Math.sin(t));
      }
    }
  }
  return mesh(v, n);
}
const cube = boxMesh();
const potProfiles = [[[0, - .62], [.36, - .62], [.48, - .46], [.62, - .12], [.61, .20], [.49, .45], [.35, .53], [.36, .62], [.27, .62], [.27, .52], [.29, .48]],
[[0, - .62], [.32, - .62], [.40, - .46], [.48, .02], [.43, .35], [.28, .51], [.28, .68], [.21, .68], [.21, .50]],
[[0, - .51], [.37, - .51], [.58, - .34], [.69, - .02], [.62, .25], [.49, .39], [.50, .49], [.39, .49], [.39, .36]],
[[0, - .62], [.42, - .62], [.54, - .49], [.60, - .25], [.58, .05], [.46, .24], [.36, .30], [.37, .44], [.28, .44], [.28, .29]],
[[0, - .62], [.33, - .62], [.48, - .43], [.59, - .12], [.55, .15], [.33, .39], [.20, .47], [.20, .86], [.15, .86], [.15, .47]],
[[0, - .62], [.46, - .62], [.53, - .48], [.55, .05], [.54, .40], [.51, .56], [.42, .56], [.42, .42]]];
const pots = potProfiles.map(lathe);
/** @param profile {number[][]} 옹기 단면 [반지름,높이]. @param y {number} 높이. @returns {number} 그 높이의 바깥 반지름. */
function profileRadius(profile, y) {
  let radius = 0;
  for(let i = 1; i < profile.length; i ++) {
    const [r0, y0] = profile [i - 1], [r1, y1] = profile [i];
    if(y0 === y1 || y < Math.min(y0, y1) || y > Math.max(y0, y1)) continue;
    radius = Math.max(radius, mix(r0, r1, (y - y0) / (y1 - y0)));
  }
  return radius;
}
// 몸통 곡선을 따라 감기는 띠. 높이별로 실제 반지름에 맞춰 얇은 고리를 만듭니다.
const potBands = potProfiles.map(profile => [- .25, .04].map(y => {
  const low = profileRadius(profile, y - .018), high = profileRadius(profile, y + .018);
  return lathe([[low - .01, y - .022], [low + .014, y - .016], [high + .014, y + .016], [high - .01, y + .022]]);
}));
const lids = lathe([[0, 0], [.37, 0], [.40, .06], [.32, .13], [.10, .17], [.08, .25], [0, .25]]);
/** @param id {number} 옹기. @returns {number} 똑바로 섰을 때 중심에서 바닥까지의 거리(배율 1). */
function potBottom(id) {
  return AssetBank.onggiSupport(id, [0, 0, 0, 1]) ?? COLLECTION [id].bottom;
}
/** @param id {number} 옹기. @param q {number[4]} 구른 자세. @returns {number} 그 자세에서 바닥 위 중심 높이(배율 1).
 * OBJ는 실제 모양대로 바닥에 닿고, 기본 모델은 기존의 고정 높이를 씁니다. 충돌 판정과는 무관합니다. */
function potRest(id, q) {
  return AssetBank.onggiSupport(id, q) ?? .47 / .66;
}
const potColors = ['#915432',
'#78452e',
'#ab7046',
'#a5653d',
'#744b39',
'#956c49'];
/**
 * [읽기 8: 옹기 모델 / 함수 번호 21] pot
 * 역할: 옹기의 몸통·뚜껑·장식 띠를 회전과 크기에 맞게 그립니다.
 * @param parent — Float32Array(16): 부모 공간의 변환 행렬
 * @param id — number: COLLECTION/pots의 0부터 시작하는 인덱스 (생략 시 0)
 * @param roll — number: 굴러간 Z축 회전각, 라디안 (생략 시 0)
 * @param size — number: 모델 전체 배율. 커질수록 크게 표시 (생략 시 1)
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: mul → rz → scale → draw → translate
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function pot(parent, id = 0, roll = 0, size = 1) {
  if(AssetBank.drawOnggi(parent,id,roll,size))return;
  const base = mul(parent, mul(rz(roll), scale(size, size, size))),
  info = COLLECTION [id],
  shine = GAME_CONFIG.lighting.gloss.pot;
  draw(pots [id], base, potColors [id], false, shine);
  draw(lids, mul(base, mul(translate(0, info.lidY, 0), scale(info.lidSize, 1, info.lidSize))), potColors [id], false, shine);
  for(const band of potBands [id]) draw(band, base, '#bd8b5c', false, shine);
}
