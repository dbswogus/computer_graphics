// 담당: 공동 기반 / 초기 구성 재현
// 오프라인 classic script. 의존 순서는 index.html 및 README.md 참고.
// 수정 안내와 전체 읽기 순서: CUSTOMIZATION.md

const canvas = document.getElementById('game');
const gl = canvas.getContext('webgl2', {
  alpha : false, antialias : true, preserveDrawingBuffer : false
}
);
if(! gl) {
  // 이후 스크립트가 실행되지 않으므로 여기서 바로 안내합니다.
  const notice = document.getElementById('error'), loading = document.getElementById('player-loading');
  canvas.style.display = 'none';
  if(loading) loading.hidden = true;
  if(notice) notice.style.display = 'block';
  throw new Error('WebGL 2를 사용할 수 없습니다.');
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
/** @param fovY {number} 세로 시야각, 라디안. @param aspect {number} 가로/세로 비율.
 * @param n {number} 근평면 거리. @param f {number} 원평면 거리. @returns {Float32Array} 열 우선 원근 투영 행렬. */
function perspective(fovY, aspect, n, f) {
  const m = new Float32Array(16), t = 1 / Math.tan(fovY / 2);
  m [0] = t / aspect;
  m [5] = t;
  m [10] = (f + n) / (n - f);
  m [11] = - 1;
  m [14] = 2 * f * n / (n - f);
  return m;
}
/** @param q {number[4]} 단위 쿼터니언 [x,y,z,w]. @returns {Float32Array} 열 우선 회전 행렬. */
function quatMatrix(q) {
  const [x, y, z, w] = q, m = identity();
  m [0] = 1 - 2 * (y * y + z * z);
  m [1] = 2 * (x * y + w * z);
  m [2] = 2 * (x * z - w * y);
  m [4] = 2 * (x * y - w * z);
  m [5] = 1 - 2 * (x * x + z * z);
  m [6] = 2 * (y * z + w * x);
  m [8] = 2 * (x * z + w * y);
  m [9] = 2 * (y * z - w * x);
  m [10] = 1 - 2 * (x * x + y * y);
  return m;
}
/** @param q {number[4]} 쿼터니언. @returns {number[4]} 길이를 1로 맞춘 쿼터니언. 누적 오차를 제거합니다. */
function quatNormalize(q) {
  const length = Math.hypot(... q) || 1;
  return q.map(n => n / length);
}
/** 미끄러지지 않고 구른 거리만큼 현재 자세 앞에 회전을 곱합니다.
 * 축은 (이동 방향 × 위쪽)이라 방향을 바꿔도 항상 진행 방향으로 구릅니다.
 * @param q {number[4]} 현재 자세. @param dx {number} 보드 X 이동량. @param dz {number} 보드 Z 이동량.
 * @param radius {number} 구르는 반지름. @returns {number[4]} 새 자세. */
function rollStep(q, dx, dz, radius) {
  const distance = Math.hypot(dx, dz);
  if(distance < 1e-9) return q;
  const half = distance / radius / 2,
  s = Math.sin(half) / distance,
  ax = dz * s,
  az = - dx * s,
  aw = Math.cos(half),
  [x, y, z, w] = q;
  return quatNormalize([aw * x + ax * w - az * y,
  aw * y + az * x - ax * z,
  aw * z + az * w + ax * y,
  aw * w - ax * x - az * z]);
}
/** @param q {number[4]} 시작 자세. @param t {number} 0~1. @returns {number[4]} 바로 선 자세까지 최단 경로 보간. */
function quatToUpright(q, t) {
  const sign = q [3] < 0 ? - 1 : 1;
  return quatNormalize([q [0] * sign * (1 - t), q [1] * sign * (1 - t), q [2] * sign * (1 - t), mix(q [3] * sign, 1, t)]);
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
// 모든 셰이더는 GLSL ES 3.00입니다. #version은 첫 줄이어야 하므로 여기서 붙입니다.
  gl.shaderSource(s, '#version 300 es\n' + src);
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
  layout(location=0) in vec3 position;
  layout(location=1) in vec3 normal;
  uniform mat4 mvp;
  uniform mat4 patternSpace;
  uniform float surfaceMaterial;
  out vec3 surfacePoint;
  out vec3 patternNormal;
` + Lighting.vertex + `
  void main() {
    lightVertex(position,normal);
    if(surfaceMaterial>.5) {
      patternNormal=mat3(patternSpace)*worldNormal;
      surfacePoint=(patternSpace*vec4(worldPosition,1.)).xyz;
    } else {
      patternNormal=worldNormal;
      surfacePoint=worldPosition;
    }
    gl_Position=mvp*vec4(position,1.);
  }
`, Lighting.precision + `
  uniform vec3 color;
  uniform float surfaceMaterial;
  uniform float surfaceParam;
  in vec3 surfacePoint;
  in vec3 patternNormal;
` + Lighting.fragment + `
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
      vec3 soil=color*(1.+.28*patches+.14*grit+.055*specks);
      int kind=int(surfaceMaterial+.5);
      if(kind==1) material=soil;
      // 구덩이: 깊을수록 어두워집니다.
      if(kind==2) material=soil*mix(.16,.95,smoothstep(-.95,.02,surfacePoint.y));
      if(kind==3) {
        // 물레 원판: 나무판을 이어 붙이고, 중심 거리와 각도(극좌표)로 테두리와 흙물 자국을 그립니다.
        float radius=length(surfacePoint.xz)/surfaceParam, turn=atan(surfacePoint.z,surfacePoint.x)/6.2831853;
        float board=surfacePoint.x/.15, seam=min(fract(board),1.-fract(board))*.15;
        material=color*(.82+.36*grain(vec2(floor(board),3.)))*(1.+.22*(soilNoise(vec2(surfacePoint.x*40.,surfacePoint.z*5.))-.5));
        material*=mix(.5,1.,smoothstep(.004,.011,seam));
        float swirl=abs(fract(radius*9.-turn)-.5)*2.;
        material=mix(material,vec3(.66,.5,.37)*(.82+.25*swirl),.75*(1.-smoothstep(.5,.66,radius)));
        vec3 stripe=fract(turn*8.)<.5?vec3(.72,.22,.14):vec3(.93,.83,.66);
        material=mix(material,stripe,smoothstep(.79,.805,radius));
        material*=mix(.45,1.,smoothstep(.012,.026,abs(radius-.78)));
      }
      if(kind==4) {
        // 젖은 흙: 돌면서 손가락이 지나간 나선 자국.
        float spiral=fract(surfacePoint.y*17.-atan(surfacePoint.z,surfacePoint.x)/6.2831853);
        material=soil*(.84+.3*smoothstep(0.,.5,abs(spiral-.5)));
      }
      if(kind==5) material=color*(1.+.34*(soilNoise(vec2(p.x*4.,p.y*38.))-.5)+.2*(soilNoise(vec2(p.x*38.,p.y*4.))-.5));
      if(kind==6) {
        // 균열: 가장 가까운 두 중심까지의 거리 차가 작은 곳이 경계선입니다(보로노이).
        vec2 cellBase=floor(p*3.4), inCell=fract(p*3.4);
        float first=9., second=9.;
        for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++) {
          vec2 o=vec2(x,y), seed=cellBase+o;
          float d=length(o+vec2(grain(seed),grain(seed+31.7))*.9-inCell);
          if(d<first) { second=first; first=d; } else second=min(second,d);
        }
        float width=.025+.11*surfaceParam;
        float crack=1.-smoothstep(width,width+.05,second-first);
        material=mix(soil,soil*.22,crack*(.75+.25*surfaceParam));
      }
    }
    fragColor=vec4(shade(material),1.);
  }
`);
const pu = program(`
  layout(location=0) in vec2 position;
  out vec2 uv;
  void main() {
    uv=vec2((position.x+1.)*.5,(1.-position.y)*.5);
    gl_Position=vec4(position,0.,1.);
  }
`, Lighting.precision + `
  uniform sampler2D image;
  in vec2 uv;
  void main() { fragColor=texture(image,uv); }
`);
const uiImage = gl.getUniformLocation(pu, 'image');
const loc = {
  mvp : gl.getUniformLocation(p3, 'mvp'),
  color : gl.getUniformLocation(p3, 'color'),
  material : gl.getUniformLocation(p3, 'surfaceMaterial'),
  param : gl.getUniformLocation(p3, 'surfaceParam'),
  patternSpace : gl.getUniformLocation(p3, 'patternSpace')
}
;
const quad = gl.createVertexArray();
gl.bindVertexArray(quad);
vertexBuffer(0, [- 1, - 1, 1, - 1, - 1, 1, - 1, 1, 1, - 1, 1, 1], 2);
gl.bindVertexArray(null);
const tex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, tex);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
/** @param index {number} 셰이더의 layout(location). 0=position, 1=normal, 2=texcoord.
 * @param data {number[]|Float32Array} 정점 데이터. @param size {number} 정점 하나의 성분 수.
 * @returns {WebGLBuffer} 현재 묶인 VAO에 연결한 버퍼. */
function vertexBuffer(index, data, size) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data instanceof Float32Array ? data : new Float32Array(data), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(index);
  gl.vertexAttribPointer(index, size, gl.FLOAT, false, 0, 0);
  return buffer;
}
/** @param m {object} mesh 반환값. @returns {void} VAO와 정점 버퍼를 GPU에서 해제. */
function deleteMesh(m) {
  gl.deleteVertexArray(m.vao);
  for(const buffer of [m.b, m.nb, m.uv]) if(buffer) gl.deleteBuffer(buffer);
}
/** @param m {object} mesh 반환값. @param uvs {Float32Array} 정점마다 [u,v,텍스처 사용]. @returns {void} 텍스처 좌표를 메시에 추가. */
function addTexcoords(m, uvs) {
  gl.bindVertexArray(m.vao);
  m.uv = vertexBuffer(2, uvs, 3);
  gl.bindVertexArray(null);
}
/** @param m {object} mesh 반환값. @returns {void} 현재 셰이더로 메시를 그립니다. 정점 설정은 VAO에 저장되어 있습니다. */
function drawMesh(m) {
  gl.bindVertexArray(m.vao);
  gl.drawArrays(gl.TRIANGLES, 0, m.count);
}
/**
 * [읽기 9: 렌더링 기반 / 함수 번호 14] mesh
 * 역할: 정점과 법선으로 GPU 메시 버퍼를 만듭니다.
 * @param v — number[]: 삼각형 정점 좌표를 x,y,z 순서로 나열
 * @param n — number[]: 각 정점의 법선을 x,y,z 순서로 나열. v와 같은 길이
 * @returns object: {vao:정점배열객체, b:정점버퍼, nb:법선버퍼, count:정점수}
 * 사용: 반환값을 호출부의 계산·판정·그리기에 전달합니다.
 * 다음에 읽을 함수: 이 함수 본문으로 완료. 호출부에서 다음 처리를 진행합니다.
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function mesh(v, n) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const b = vertexBuffer(0, v, 3),
  nb = vertexBuffer(1, n, 3);
  gl.bindVertexArray(null);
  return {
    vao,
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
// kind: MATERIAL 번호(true는 흙). origin: 무늬가 따라다닐 보드 좌표. spin: 무늬가 함께 도는 각도. param: 균열 진행이나 물레 반지름.
function draw(m, mat, col, kind = 0, shine = kind ? GAME_CONFIG.lighting.gloss.earth : GAME_CONFIG.lighting.gloss.block, { origin, param = 0, spin = 0 } = {}) {
  if(Lighting.drawDepth(m, mat)) return;
  gl.useProgram(p3);
  gl.uniformMatrix4fv(loc.mvp, false, mul(vp, mat));
  Lighting.apply(p3, mat, shine);
  gl.uniform3fv(loc.color, rgb(col));
  gl.uniform1f(loc.material, Number(kind));
  gl.uniform1f(loc.param, param);
  if(kind) {
    const board = mul(rx(- tiltZ), rz(- angle));
    const local = origin ? mul(translate(- origin [0], - origin [1], - origin [2]), board) : board;
    gl.uniformMatrix4fv(loc.patternSpace, false, spin ? mul(ry(- spin), local) : local);
  }
  drawMesh(m);
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
/** 매개변수 없음. @returns {void} 16:10 게임 화면이 놓이는 캔버스 영역으로 뷰포트를 맞춥니다. */
function applyViewport() {
  gl.viewport(Math.round(layout.x * layout.dpr), Math.round((innerHeight - layout.y - layout.h) * layout.dpr), Math.round(layout.w * layout.dpr), Math.round(layout.h * layout.dpr));
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
  Lighting.useStudio();
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
    pot(mul(translate(11.3, 5.7, 0), mul(rx(.14), ry(- .2))), selected, 0, .8);
  }
  else if(screen === 'finish') {
    vp = ortho(0, 16, 0, 10, - 30, 30);
    block(identity(), 4.1, 3.62, - .1, 3.2, .55, 2.0, '#b7bba3');
    block(identity(), 4.1, 3.93, - .1, 3.4, .08, 2.15, '#e1dbc2');
    pot(mul(translate(4.1, 3.97 + potBottom(selected) * 1.55, 0), ry(- .18)), selected, 0, 1.55);
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
  applyViewport();
  scene();
  if(dirty) drawUI();
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(pu);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.uniform1i(uiImage, 0);
  gl.bindVertexArray(quad);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  if(! portrait && ['title', 'select', 'finish', 'story'].includes(screen)) scene(false);
  if(! portrait && screen === 'monologue') drawMonologuePortrait();
}
