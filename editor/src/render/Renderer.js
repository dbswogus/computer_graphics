// 담당: 공동 기반 / 초기 구성 재현
// 오프라인 classic script. 의존 순서는 index.html 및 README.md 참고.
// 수정 안내와 전체 읽기 순서: CUSTOMIZATION.md

const canvas = document.getElementById('game');
const gl = canvas.getContext('webgl', {
  alpha : false, antialias : true, preserveDrawingBuffer : false
}
);
if(! gl) {
  throw new Error('WebGL을 사용할 수 없습니다.');
}
const W = GAME_CONFIG.ui.logicalWidth,
H = GAME_CONFIG.ui.logicalHeight,
TAU = Math.PI * 2,
LIMIT = GAME_CONFIG.physics.maxTiltDegrees * Math.PI / 180;
const C = GAME_CONFIG.ui.theme;
const ui = document.createElement('canvas');
ui.width = W;
ui.height = H;
const ctx = ui.getContext('2d');
/**
 * [읽기 9: 렌더링 기반 / 함수 번호 1] clamp
 * 역할: 값을 최솟값과 최댓값 사이로 제한합니다.
 * @param x — number: 제한할 값
 * @param a — number: 하한
 * @param b — number: 상한
 * @returns number: 제한된 값
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: 이 함수 본문으로 완료. 호출부에서 다음 처리를 진행합니다.
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}
/**
 * [읽기 9: 렌더링 기반 / 함수 번호 2] mix
 * 역할: 두 값 사이를 선형 보간합니다.
 * @param a — number: 시작값
 * @param b — number: 끝값
 * @param t — number: 보간 비율. 0=시작, 1=끝. 범위 밖은 외삽
 * @returns number: 보간 결과
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: 이 함수 본문으로 완료. 호출부에서 다음 처리를 진행합니다.
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function mix(a, b, t) {
  return a +(b - a) * t;
}
/**
 * [읽기 9: 렌더링 기반 / 함수 번호 3] rgb
 * 역할: 16진 색상을 WebGL RGB 값으로 바꿉니다.
 * @param h — string: #RRGGBB 색상
 * @returns number[3]: 각각 0~1 범위인 RGB
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: 이 함수 본문으로 완료. 호출부에서 다음 처리를 진행합니다.
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function rgb(h) {
  return [parseInt(h.slice(1, 3), 16) / 255,
  parseInt(h.slice(3, 5), 16) / 255,
  parseInt(h.slice(5, 7), 16) / 255];
}
/**
 * [읽기 9: 렌더링 기반 / 함수 번호 4] identity
 * 역할: 4×4 단위 행렬을 만듭니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns Float32Array(16): 단위 행렬
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: 이 함수 본문으로 완료. 호출부에서 다음 처리를 진행합니다.
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function identity() {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}
/**
 * [읽기 9: 렌더링 기반 / 함수 번호 5] mul
 * 역할: 두 4×4 변환 행렬을 곱합니다.
 * @param a — Float32Array(16): 왼쪽 4×4 행렬
 * @param b — Float32Array(16): 오른쪽 행렬. a×b 순서로 합성
 * @returns Float32Array(16): 합성 행렬
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: 이 함수 본문으로 완료. 호출부에서 다음 처리를 진행합니다.
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function mul(a, b) {
  const o = new Float32Array(16);
  for(let c = 0; c < 4; c ++) for(let r = 0; r < 4; r ++) for(let k = 0; k < 4; k ++) o [c * 4 + r] += a [k * 4 + r] * b [c * 4 + k];
  return o;
}
/**
 * [읽기 9: 렌더링 기반 / 함수 번호 6] translate
 * 역할: 위치 이동 행렬을 만듭니다.
 * @param x — number: 월드 X 좌표
 * @param y — number: 월드 Y 높이
 * @param z — number: 월드 Z 좌표
 * @returns Float32Array(16): 이동 행렬
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: identity
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function translate(x, y, z) {
  const m = identity();
  m [12] = x;
  m [13] = y;
  m [14] = z;
  return m;
}
/**
 * [읽기 9: 렌더링 기반 / 함수 번호 7] scale
 * 역할: 크기 변환 행렬을 만듭니다.
 * @param x — number: X축 크기 배율
 * @param y — number: Y축 크기 배율
 * @param z — number: Z축 크기 배율
 * @returns Float32Array(16): 크기 행렬
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: identity
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function scale(x, y, z) {
  const m = identity();
  m [0] = x;
  m [5] = y;
  m [10] = z;
  return m;
}
/**
 * [읽기 9: 렌더링 기반 / 함수 번호 8] rz
 * 역할: Z축 회전 행렬을 만듭니다.
 * @param a — number: Z축 회전각, 라디안
 * @returns Float32Array(16): 회전 행렬
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: identity
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function rz(a) {
  const m = identity(),
  c = Math.cos(a),
  s = Math.sin(a);
  m [0] = c;
  m [1] = s;
  m [4] = - s;
  m [5] = c;
  return m;
}
/**
 * [읽기 9: 렌더링 기반 / 함수 번호 9] rx
 * 역할: X축 회전 행렬을 만듭니다.
 * @param a — number: X축 회전각, 라디안
 * @returns Float32Array(16): 회전 행렬
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: identity
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function rx(a) {
  const m = identity(),
  c = Math.cos(a),
  s = Math.sin(a);
  m [5] = c;
  m [6] = s;
  m [9] = - s;
  m [10] = c;
  return m;
}
/**
 * [읽기 9: 렌더링 기반 / 함수 번호 10] ry
 * 역할: Y축 회전 행렬을 만듭니다.
 * @param a — number: Y축 회전각, 라디안
 * @returns Float32Array(16): 회전 행렬
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: identity
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function ry(a) {
  const m = identity(),
  c = Math.cos(a),
  s = Math.sin(a);
  m [0] = c;
  m [2] = - s;
  m [8] = s;
  m [10] = c;
  return m;
}
/**
 * [읽기 9: 렌더링 기반 / 함수 번호 11] ortho
 * 역할: 직교 투영 행렬을 만듭니다.
 * @param l — number: 왼쪽 경계
 * @param r — number: 오른쪽 경계
 * @param b — number: 아래쪽 경계
 * @param t — number: 위쪽 경계
 * @param n — number: 가까운 깊이 경계
 * @param f — number: 먼 깊이 경계
 * @returns Float32Array(16): 직교 투영 행렬
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: identity
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function ortho(l, r, b, t, n, f) {
  const m = identity();
  m [0] = 2 /(r - l);
  m [5] = 2 /(t - b);
  m [10] = - 2 /(f - n);
  m [12] = -(r + l) /(r - l);
  m [13] = -(t + b) /(t - b);
  m [14] = -(f + n) /(f - n);
  return m;
}
/**
 * [읽기 9: 렌더링 기반 / 함수 번호 12] shader
 * 역할: 셰이더를 컴파일하고 오류를 확인합니다.
 * @param type — WebGL enum: gl.VERTEX_SHADER 또는 gl.FRAGMENT_SHADER
 * @param src — string: GLSL 셰이더 원문
 * @returns WebGLShader. 컴파일 실패 시 Error를 던짐
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: 이 함수 본문으로 완료. 호출부에서 다음 처리를 진행합니다.
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function shader(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if(! gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s));
  return s;
}
/**
 * [읽기 9: 렌더링 기반 / 함수 번호 13] program
 * 역할: 셰이더 프로그램을 연결하고 오류를 확인합니다.
 * @param v — string: 정점 셰이더 GLSL
 * @param f — string: 프래그먼트 셰이더 GLSL
 * @returns WebGLProgram. 연결 실패 시 Error를 던짐
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: shader
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function program(v, f) {
  const p = gl.createProgram();
  gl.attachShader(p, shader(gl.VERTEX_SHADER, v));
  gl.attachShader(p, shader(gl.FRAGMENT_SHADER, f));
  gl.linkProgram(p);
  if(! gl.getProgramParameter(p, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(p));
  return p;
}
const p3 = program(`
  attribute vec3 position;
  attribute vec3 normal;
  uniform mat4 mvp;
  uniform mat4 model;
  uniform mat4 patternSpace;
  uniform mediump float surfaceMaterial;
  varying mediump float light;
  varying mediump vec3 surfacePoint;
  varying mediump vec3 patternNormal;
  void main() {
    vec3 worldNormal=normalize(mat3(model)*normal);
    vec4 worldPoint=model*vec4(position,1.);
    if(surfaceMaterial>.5) {
      patternNormal=mat3(patternSpace)*worldNormal;
      surfacePoint=(patternSpace*worldPoint).xyz;
    } else {
      patternNormal=worldNormal;
      surfacePoint=worldPoint.xyz;
    }
    light=.61+.39*max(dot(worldNormal,normalize(vec3(-.4,.8,1.))),0.);
    gl_Position=mvp*vec4(position,1.);
  }
`, `
#ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
#else
  precision mediump float;
#endif
  uniform vec3 color;
  uniform mediump float surfaceMaterial;
  varying mediump float light;
  varying mediump vec3 surfacePoint;
  varying mediump vec3 patternNormal;

  float grain(vec2 p) {
    vec3 q=fract(vec3(p.xyx)*.1031);
    q+=dot(q,q.yzx+19.19);
    return fract((q.x+q.y)*q.z);
  }

  float soilNoise(vec2 p) {
    vec2 cell=floor(p), f=fract(p);
    f=f*f*(3.-2.*f);
    return mix(mix(grain(cell),grain(cell+vec2(1.,0.)),f.x),
      mix(grain(cell+vec2(0.,1.)),grain(cell+vec2(1.)),f.x),f.y);
  }

  void main() {
    vec3 material=color;
    if(surfaceMaterial>.5) {
      vec3 n=abs(patternNormal);
      vec2 p=n.y>max(n.x,n.z)?surfacePoint.xz:
        (n.x>n.z?surfacePoint.zy:surfacePoint.xy);
      float patches=soilNoise(p*2.2)-.5;
      float grit=soilNoise(p*25.)-.5;
      float specks=grain(floor(p*43.))-.5;
      material=color*(1.+.28*patches+.14*grit+.055*specks);
    }
    gl_FragColor=vec4(material*light,1.);
  }
`);
const pu = program(` attribute vec2 position;varying vec2 uv;void main(){uv=vec2((position.x+1.)*.5,(1.-position.y)*.5);gl_Position=vec4(position,0.,1.);} `, ` precision mediump float;uniform sampler2D image;varying vec2 uv;void main(){gl_FragColor=texture2D(image,uv);} `);
const loc = {
  pos : gl.getAttribLocation(p3, 'position'),
  normal : gl.getAttribLocation(p3, 'normal'),
  mvp : gl.getUniformLocation(p3, 'mvp'),
  model : gl.getUniformLocation(p3, 'model'),
  color : gl.getUniformLocation(p3, 'color'),
  material : gl.getUniformLocation(p3, 'surfaceMaterial'),
  patternSpace : gl.getUniformLocation(p3, 'patternSpace')
}
;
const quad = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quad);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([- 1, - 1, 1, - 1, - 1, 1, - 1, 1, 1, - 1, 1, 1]), gl.STATIC_DRAW);
const tex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, tex);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
/**
 * [읽기 9: 렌더링 기반 / 함수 번호 14] mesh
 * 역할: 정점과 법선으로 GPU 메시 버퍼를 만듭니다.
 * @param v — number[]: 삼각형 정점 좌표를 x,y,z 순서로 나열
 * @param n — number[]: 각 정점의 법선을 x,y,z 순서로 나열. v와 같은 길이
 * @returns object: {b:정점버퍼, nb:법선버퍼, count:정점수}
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: 이 함수 본문으로 완료. 호출부에서 다음 처리를 진행합니다.
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function mesh(v, n) {
  const b = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, v instanceof Float32Array ? v : new Float32Array(v), gl.STATIC_DRAW);
  const nb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, nb);
  gl.bufferData(gl.ARRAY_BUFFER, n instanceof Float32Array ? n : new Float32Array(n), gl.STATIC_DRAW);
  return {
    b,
    nb,
    count : v.length / 3
  }
  ;
}
/**
 * [읽기 9: 렌더링 기반 / 함수 번호 15] boxMesh
 * 역할: 상자 메시를 만듭니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns object: 단위 상자의 GPU 메시
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: mesh
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function boxMesh() {
  const v = [],
  n = [];
  const faces = [[[1,
  0,
  0],
  [[1,
  - 1,
  - 1],
  [1,
  1,
  - 1],
  [1,
  1,
  1],
  [1,
  - 1,
  1]]],
  [[- 1,
  0,
  0],
  [[- 1,
  - 1,
  1],
  [- 1,
  1,
  1],
  [- 1,
  1,
  - 1],
  [- 1,
  - 1,
  - 1]]],
  [[0,
  1,
  0],
  [[- 1,
  1,
  - 1],
  [- 1,
  1,
  1],
  [1,
  1,
  1],
  [1,
  1,
  - 1]]],
  [[0,
  - 1,
  0],
  [[- 1,
  - 1,
  1],
  [- 1,
  - 1,
  - 1],
  [1,
  - 1,
  - 1],
  [1,
  - 1,
  1]]],
  [[0,
  0,
  1],
  [[- 1,
  - 1,
  1],
  [1,
  - 1,
  1],
  [1,
  1,
  1],
  [- 1,
  1,
  1]]],
  [[0,
  0,
  - 1],
  [[1,
  - 1,
  - 1],
  [- 1,
  - 1,
  - 1],
  [- 1,
  1,
  - 1],
  [1,
  1,
  - 1]]]];
  for(const [norm, pts] of faces) for(const i of [0, 1, 2, 0, 2, 3]) {
    v.push(... pts [i].map(x => x * .5));
    n.push(... norm);
  }
  return mesh(v, n);
}
/**
 * [읽기 9: 렌더링 기반 / 함수 번호 16] draw
 * 역할: 메시의 변환과 색상을 지정해 그립니다.
 * @param m — object: mesh()가 만든 {b,nb,count} GPU 메시
 * @param mat — Float32Array(16): 모델 변환 행렬
 * @param col — string: #RRGGBB 색상
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: mul → rgb
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function draw(m, mat, col, earth = false) {
  gl.useProgram(p3);
  gl.bindBuffer(gl.ARRAY_BUFFER, m.b);
  gl.enableVertexAttribArray(loc.pos);
  gl.vertexAttribPointer(loc.pos, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, m.nb);
  gl.enableVertexAttribArray(loc.normal);
  gl.vertexAttribPointer(loc.normal, 3, gl.FLOAT, false, 0, 0);
  gl.uniformMatrix4fv(loc.mvp, false, mul(vp, mat));
  gl.uniformMatrix4fv(loc.model, false, mat);
  gl.uniform3fv(loc.color, rgb(col));
  gl.uniform1f(loc.material,earth ? 1 : 0);
  if (earth) gl.uniformMatrix4fv(loc.patternSpace,false,mul(rx(-tiltZ),rz(-angle)));
  gl.drawArrays(gl.TRIANGLES, 0, m.count);
}
/**
 * [읽기 9: 렌더링 기반 / 함수 번호 17] block
 * 역할: 상자 메시를 배치하고 그립니다.
 * @param parent — Float32Array(16): 부모 변환 행렬
 * @param x — number: 월드 X 좌표
 * @param y — number: 월드 Y 높이
 * @param z — number: 월드 Z 좌표
 * @param sx — number: X축 상자 크기
 * @param sy — number: Y축 상자 크기
 * @param sz — number: Z축 상자 크기
 * @param color — string: #RRGGBB 상자 색상
 * @param ang — number: 상자의 Z축 회전각, 라디안 (생략 시 0)
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: draw → mul → translate → rz → scale
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function block(parent, x, y, z, sx, sy, sz, color, ang = 0, earth = false) {
  draw(cube, mul(parent, mul(translate(x, y, z), mul(rz(ang), scale(sx, sy, sz)))), color, earth);
}
/**
 * [읽기 9: 렌더링 기반 / 함수 번호 18] scene
 * 역할: 현재 화면에 필요한 3D 장면과 배경을 그립니다.
 * @param clear — boolean: true면 색상과 깊이를 지움. false면 기존 UI를 보존하며 깊이만 지움 (생략 시 true)
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: rgb → worldScene → ortho → pot → mul → translate → rx → ry → block → identity
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function scene(clear = true) {
  gl.disable(gl.BLEND);
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(...rgb(PageUI.worldBackground() || C.cream), 1);
  gl.clear(clear ? gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT : gl.DEPTH_BUFFER_BIT);
  if(screen === 'play' || screen === 'arrival' || screen === 'monologue') {
    worldScene();
  }
  else if(screen === 'title') {
    vp = ortho(0, 16, 0, 10, - 30, 30);
    pot(mul(translate(11.65, 4.72, 0), mul(rx(.14), ry(- .18))), 0, 0, 2.0);
  }
  else if(screen === 'select') {
    vp = ortho(0, 16, 0, 10, - 30, 30);
    for(let i = 0; i < COLLECTION.length; i ++) {
      const x =(70 +(i % 3) * 300 + 139) / 100,
      y = 293 + Math.floor(i / 3) * 241;
      pot(mul(translate(x,(H - y - 83) / 100, 0), mul(rx(.14), ry(- .2))), i, 0, .65);
    }
    pot(mul(translate(12.6, 5.7, 0), mul(rx(.14), ry(- .2))), selected, 0, .8);
  }
  else if(screen === 'finish') {
    vp = ortho(0, 16, 0, 10, - 30, 30);
    block(identity(), 4.1, 3.62, - .1, 3.2, .55, 2.0, '#b7bba3');
    block(identity(), 4.1, 3.93, - .1, 3.4, .08, 2.15, '#e1dbc2');
    pot(mul(translate(4.1, 3.97 + COLLECTION [selected].bottom * 1.55, 0), ry(- .18)), selected, 0, 1.55);
  }
  else if(screen === 'story') {
    vp = ortho(0, 16, 0, 10, - 30, 30);
    const root = translate(12.5, 4.9, 0);
    block(identity(), 12.5, 3.5, - 1, 3.6, .22, 1.4, '#b9ac86');
    pot(mul(root, mul(rx(.12), ry(- .22))), selected, storyIndex === 0 ? - .18 : 0, 1.5);
    if(screen === 'story' && storyIndex === 0) {
      for(const x of [11.4, 13.6]) pot(mul(translate(x, 3.1, - 1), rx(.15)),(selected + 1) % 3, 0, .35);
    }
    else {
      block(identity(), 13.9, 5.1, - 2, .08, 3, .08, '#9bac7e');
      block(identity(), 13.25, 6.4, - 2, 1.3, .65, .1, '#98ad77');
    }
  }
}
/**
 * [읽기 9: 렌더링 기반 / 함수 번호 19] render
 * 역할: 3D와 UI 레이어를 합성해 출력합니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: round → scene → drawUI → drawMonologuePortrait
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function render() {
  gl.viewport(Math.round(layout.x * layout.dpr), Math.round((innerHeight - layout.y - layout.h) * layout.dpr), Math.round(layout.w * layout.dpr), Math.round(layout.h * layout.dpr));
  scene();
  if(dirty) drawUI();
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(pu);
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  const p = gl.getAttribLocation(pu, 'position');
  gl.enableVertexAttribArray(p);
  gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.uniform1i(gl.getUniformLocation(pu, 'image'), 0);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  if(! portrait && ['title', 'select', 'finish', 'story'].includes(screen)) scene(false);
  if(! portrait && screen === 'monologue') drawMonologuePortrait();
}
