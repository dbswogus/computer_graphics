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
  for(let j = 0; j < profile.length - 1; j ++) {
    const [r0,
    y0] = profile [j],
    [r1,
    y1] = profile [j + 1],
    len = Math.hypot(y1 - y0, r1 - r0) || 1;
    for(let i = 0; i < N; i ++) {
      const a = i * TAU / N,
      b =(i + 1) * TAU / N;
      for(const [r, y, t] of [[r0, y0, a], [r1, y1, a], [r1, y1, b], [r0, y0, a], [r1, y1, b], [r0, y0, b]]) {
        v.push(r * Math.cos(t), y, r * Math.sin(t));
        n.push((y1 - y0) * Math.cos(t) / len, -(r1 - r0) / len,(y1 - y0) * Math.sin(t) / len);
      }
    }
  }
  return mesh(v, n);
}
const cube = boxMesh();
const pots = [lathe([[0, - .62], [.36, - .62], [.48, - .46], [.62, - .12], [.61, .20], [.49, .45], [.35, .53], [.36, .62], [.27, .62], [.27, .52], [.29, .48]]),
lathe([[0, - .62], [.32, - .62], [.40, - .46], [.48, .02], [.43, .35], [.28, .51], [.28, .68], [.21, .68], [.21, .50]]),
lathe([[0, - .51], [.37, - .51], [.58, - .34], [.69, - .02], [.62, .25], [.49, .39], [.50, .49], [.39, .49], [.39, .36]]),
lathe([[0, - .62], [.42, - .62], [.54, - .49], [.60, - .25], [.58, .05], [.46, .24], [.36, .30], [.37, .44], [.28, .44], [.28, .29]]),
lathe([[0, - .62], [.33, - .62], [.48, - .43], [.59, - .12], [.55, .15], [.33, .39], [.20, .47], [.20, .86], [.15, .86], [.15, .47]]),
lathe([[0, - .62], [.46, - .62], [.53, - .48], [.55, .05], [.54, .40], [.51, .56], [.42, .56], [.42, .42]])];
const lids = lathe([[0, 0], [.37, 0], [.40, .06], [.32, .13], [.10, .17], [.08, .25], [0, .25]]);
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
  info = COLLECTION [id];
  draw(pots [id], base, potColors [id]);
  draw(lids, mul(base, mul(translate(0, info.lidY, 0), scale(info.lidSize, 1, info.lidSize))), potColors [id]);
  for(const yy of [- .25, .04]) {
    const ring = mul(base, mul(translate(0, yy, 0), scale(1.013, .032, 1.013)));
    draw(pots [id], ring, '#bd8b5c');
  }
}
