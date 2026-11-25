// 담당: 공동 기반 / 초기 구성 재현
// 오프라인 classic script. Renderer.js보다 먼저 읽습니다. gl 등은 함수가 실행될 때 참조합니다.

/* 읽기: GLSL 조각 → useStudio/useWorld → apply → beginShadow → drawDepth → endShadow.
 * 조명: 픽셀마다 계산하는 Blinn-Phong = 주변광 + 확산광 × 그림자 + 반사광 × 그림자.
 * 그림자: 섀도 매핑. 빛의 위치에서 본 깊이를 텍스처에 저장하고, 화면을 그릴 때 그 깊이보다 멀면 그림자로 봅니다.
 * WebGL 2의 깊이 텍스처와 sampler2DShadow를 사용합니다. 깊이 비교와 보간을 GPU가 처리합니다. */
const Lighting = (() => {
  /* 조각 셰이더 공통 머리말. #version 300 es는 Renderer.shader()가 붙입니다. */
  const precision = `
  precision highp float;
  precision highp sampler2DShadow;
  out vec4 fragColor;
`;
  /* 정점 셰이더 조각. main에서 lightVertex(position, normal)을 호출합니다. */
  const vertex = `
  uniform mat4 model;
  uniform mat3 normalMatrix;
  uniform mat4 shadowMatrix;
  out vec3 worldPosition;
  out vec3 worldNormal;
  out vec3 shadowPoint;
  void lightVertex(vec3 p, vec3 n) {
    worldPosition=(model*vec4(p,1.)).xyz;
    worldNormal=normalize(normalMatrix*n);
    // 표면에서 법선 방향으로 살짝 띄워, 자기 자신에게 생기는 얼룩 그림자를 줄입니다.
    shadowPoint=(shadowMatrix*vec4(worldPosition+worldNormal*.03,1.)).xyz*.5+.5;
  }
`;
  /* 조각 셰이더 조각. shade(재질색)이 조명과 그림자를 적용한 색을 반환합니다. */
  const fragment = `
  uniform vec3 lightDirection;
  uniform vec2 lightPower;
  uniform vec2 gloss;
  uniform vec4 eye;
  uniform sampler2DShadow shadowMap;
  uniform vec3 shadowSetting;
  in vec3 worldPosition;
  in vec3 worldNormal;
  in vec3 shadowPoint;
  // 주변 9곳을 비교해 평균냅니다(PCF). 한 번의 비교도 GPU가 이웃 4칸을 보간하므로 경계가 부드럽습니다.
  float litAmount() {
    if(shadowSetting.x<=0.) return 1.;
    if(shadowPoint.x<=0.||shadowPoint.x>=1.||shadowPoint.y<=0.||shadowPoint.y>=1.||shadowPoint.z>=1.) return 1.;
    float lit=0.;
    for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++) {
      lit+=texture(shadowMap,vec3(shadowPoint.xy+vec2(x,y)*shadowSetting.y,shadowPoint.z-shadowSetting.z));
    }
    return mix(1.,lit/9.,shadowSetting.x);
  }
  vec3 shade(vec3 base) {
    vec3 n=normalize(worldNormal);
    vec3 view=normalize(eye.w>.5?eye.xyz-worldPosition:eye.xyz);
    float facing=max(dot(n,lightDirection),0.);
    float lit=facing>0.?litAmount():1.;
    float ambient=lightPower.x*(.85+.15*n.y);
    float specular=facing>0.?pow(max(dot(n,normalize(lightDirection+view)),0.),gloss.y)*gloss.x:0.;
    return base*(ambient+lightPower.y*facing*lit)+vec3(1.,.94,.84)*specular*lit;
  }
`;
  const studioLight = [-.4, .8, 1];
  let state = null, version = 0, shadow, depthProgram = null, depthLocation = null, blank = null;
  let shadowPass = false, lightMatrix = null;
  const programs = new Map();

  /** @param v {number[]} 벡터. @returns {number[]} 단위 벡터. */
  function unit(v) { const length = Math.hypot(...v) || 1; return v.map(n => n / length); }
  /** @returns {number[]} 외적 a×b. */
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }

  /** @param m {Float32Array} 모델 행렬. @returns {Float32Array} 3×3 법선 행렬.
   * 역전치 행렬의 배수인 여인수 행렬입니다. 한 축만 늘린 물체도 법선이 면과 수직을 유지합니다. */
  function normalMatrix(m) {
    const x = [m[0], m[1], m[2]], y = [m[4], m[5], m[6]], z = [m[8], m[9], m[10]];
    return new Float32Array([...cross(y, z), ...cross(z, x), ...cross(x, y)]);
  }

  /** @param size {number} 한 변의 픽셀 수. @returns {WebGLTexture} 깊이 비교가 켜진 깊이 텍스처. */
  function depthTexture(size) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, size, size);
    for (const [key, value] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR],
      [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
      [gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE], [gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL]]) gl.texParameteri(gl.TEXTURE_2D, key, value);
    return texture;
  }

  /** 매개변수 없음. @returns {WebGLTexture} 그림자를 쓰지 않을 때 묶어 둘 1×1 깊이 텍스처. 셰이더는 값을 읽지 않습니다. */
  function blankTexture() {
    if (!blank) blank = depthTexture(1);
    return blank;
  }

  /** @param next {object} 조명 상태. @returns {void} 다음 apply부터 각 셰이더에 한 번씩 전달됩니다. */
  function setState(next) {
    state = next;
    version++;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, next.shadow && shadow ? shadow.texture : blankTexture());
    gl.activeTexture(gl.TEXTURE0);
  }

  /** 매개변수 없음. @returns {void} 타이틀·선택·결과처럼 앞에서 보는 화면의 조명. 그림자 없음. */
  function useStudio() {
    setState({ power: GAME_CONFIG.lighting.studio, direction: unit(studioLight), eye: [0, 0, 1, 0], shadow: false, matrix: identity() });
  }

  /** @param eye {number[4]} w=1이면 카메라 위치, 0이면 보는 방향. @param hasShadow {boolean} 이번 프레임의 섀도 맵 사용 여부.
   * @returns {void} 게임 월드 조명. 빛은 고정이라 맵을 기울이면 밝기와 그림자가 함께 변합니다. */
  function useWorld(eye, hasShadow) {
    setState({ power: [GAME_CONFIG.lighting.ambient, GAME_CONFIG.lighting.diffuse], direction: unit(GAME_CONFIG.lighting.direction), eye, shadow: hasShadow, matrix: hasShadow ? lightMatrix : identity() });
  }

  /** @param shaderProgram {WebGLProgram} 조명 조각을 포함하며 사용 중인 프로그램. @param model {Float32Array} 월드 변환.
   * @param shine {number[2]} [반사 세기, 선명도]. @returns {void} 조명 유니폼 전달. */
  function apply(shaderProgram, model, shine = GAME_CONFIG.lighting.gloss.block) {
    if (!state) useStudio();
    let entry = programs.get(shaderProgram);
    if (!entry) {
      const names = ['model', 'normalMatrix', 'shadowMatrix', 'lightDirection', 'lightPower', 'gloss', 'eye', 'shadowMap', 'shadowSetting'];
      entry = { version: -1, at: Object.fromEntries(names.map(name => [name, gl.getUniformLocation(shaderProgram, name)])) };
      programs.set(shaderProgram, entry);
    }
    const at = entry.at;
    if (entry.version !== version) {
      const light = GAME_CONFIG.lighting;
      entry.version = version;
      gl.uniformMatrix4fv(at.shadowMatrix, false, state.matrix);
      gl.uniform3fv(at.lightDirection, state.direction);
      gl.uniform2f(at.lightPower, state.power[0], state.power[1]);
      gl.uniform4fv(at.eye, state.eye);
      gl.uniform1i(at.shadowMap, 1);
      gl.uniform3f(at.shadowSetting, state.shadow ? light.shadow.strength : 0, state.shadow ? light.shadow.softness / shadow.size : 0, light.shadow.bias);
    }
    gl.uniformMatrix4fv(at.model, false, model);
    gl.uniformMatrix3fv(at.normalMatrix, false, normalMatrix(model));
    gl.uniform2f(at.gloss, shine[0], shine[1]);
  }

  /** 매개변수 없음. @returns {object|null} {texture,buffer,size}. 기기가 지원하지 않으면 null이며 이후 다시 시도하지 않음. */
  function shadowTarget() {
    if (shadow !== undefined) return shadow;
    shadow = null;
    const size = Math.min(GAME_CONFIG.lighting.shadow.size, gl.getParameter(gl.MAX_TEXTURE_SIZE));
    const texture = depthTexture(size), buffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, texture, 0);
    // 깊이만 기록하므로 색 출력은 없습니다.
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!complete) {
      gl.deleteFramebuffer(buffer);
      gl.deleteTexture(texture);
      return null;
    }
    depthProgram = program('layout(location=0) in vec3 position;uniform mat4 mvp;void main(){gl_Position=mvp*vec4(position,1.);}',
      'precision mediump float;void main(){}');
    depthLocation = gl.getUniformLocation(depthProgram, 'mvp');
    shadow = { texture, buffer, size };
    return shadow;
  }

  /** @param root {Float32Array} 기울어진 맵 행렬. @param bounds {object} 맵 경계. @returns {Float32Array} 맵 전체를 담는 빛 시점의 직교 투영. */
  function lightView(root, bounds) {
    const c = [(bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2, (bounds.minZ + bounds.maxZ) / 2];
    const center = [0, 1, 2].map(i => root[i] * c[0] + root[4 + i] * c[1] + root[8 + i] * c[2] + root[12 + i]);
    const radius = Math.hypot(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, bounds.maxZ - bounds.minZ) / 2 + 1;
    const z = unit(GAME_CONFIG.lighting.direction);
    const x = unit(cross(Math.abs(z[2]) > .99 ? [0, 1, 0] : [0, 0, -1], z)), y = cross(z, x);
    const dot = a => a[0] * center[0] + a[1] * center[1] + a[2] * center[2];
    const view = new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x), -dot(y), -dot(z), 1]);
    return mul(ortho(-radius, radius, -radius, radius, -radius - 6, radius + 6), view);
  }

  /** @param root {Float32Array} 기울어진 맵 행렬. @param bounds {object} 맵 경계.
   * @returns {boolean} 그림자 패스를 시작했으면 true. 이때부터 draw 계열은 깊이만 기록합니다. */
  function beginShadow(root, bounds) {
    if (!GAME_CONFIG.lighting.shadow.enabled || !bounds || !shadowTarget()) return false;
    lightMatrix = lightView(root, bounds);
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadow.buffer);
    gl.viewport(0, 0, shadow.size, shadow.size);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    shadowPass = true;
    return true;
  }

  /** 매개변수 없음. @returns {void} 화면 그리기로 복귀. */
  function endShadow() {
    shadowPass = false;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    applyViewport();
  }

  /** @param geometry {object} 메시. @param model {Float32Array} 월드 변환. @returns {boolean} 그림자 패스라서 깊이만 그렸으면 true. */
  function drawDepth(geometry, model) {
    if (!shadowPass) return false;
    gl.useProgram(depthProgram);
    gl.uniformMatrix4fv(depthLocation, false, mul(lightMatrix, model));
    drawMesh(geometry);
    return true;
  }

  return { precision, vertex, fragment, normalMatrix, useStudio, useWorld, apply, beginShadow, endShadow, drawDepth,
    get inShadowPass() { return shadowPass; } };
})();
