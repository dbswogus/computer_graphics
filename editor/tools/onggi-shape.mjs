/* make-onggi-assets.mjs가 사용하는 도형·노이즈·PNG 함수. 외부 라이브러리를 쓰지 않습니다. */
import zlib from 'node:zlib';

export const SEGMENTS = 44, SIZE = 512, TAU = Math.PI * 2;
// 텍스처 세로 구간: 바깥면 0~.70, 손잡이·대롱 .715~.745, 안쪽면 .76~1.
export const OUTER = .7, PART_LOW = .715, PART_HIGH = .745, INNER = .76;

export const mix = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const add = (a, b) => a.map((n, i) => n + b[i]);
const sub = (a, b) => a.map((n, i) => n - b[i]);
const mul = (a, s) => a.map(n => n * s);
const dot = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = a => mul(a, 1 / (Math.hypot(...a) || 1));

/** @param points {number[][]} 제어점. @param steps {number} 구간당 분할 수. @returns {number[][]} 제어점을 지나는 Catmull-Rom 곡선. */
export function curve(points, steps = 4) {
  if (points.length < 3) return points;
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      out.push(p1.map((_, d) => .5 * (2 * p1[d] + (p2[d] - p0[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t * t + (3 * p1[d] - p0[d] - 3 * p2[d] + p3[d]) * t ** 3)));
    }
  }
  out.push(points.at(-1));
  return out;
}

/** 가로로 이어지는 값 노이즈. @param px {number} 가로 반복 칸 수. @returns {number} 0~1. */
export function noise(u, v, px, py, seed) {
  const x = u * px, y = v * py, x0 = Math.floor(x), y0 = Math.floor(y), fx = smooth(0, 1, x - x0), fy = smooth(0, 1, y - y0);
  const h = (i, j) => {
    let n = Math.imul((((i % px) + px) % px) * 374761393 + j * 668265263 + seed * 1274126177, 1103515245);
    n = Math.imul(n ^ n >>> 13, 1274126177);
    return ((n ^ n >>> 16) >>> 0) / 4294967295;
  };
  return mix(mix(h(x0, y0), h(x0 + 1, y0), fx), mix(h(x0, y0 + 1), h(x0 + 1, y0 + 1), fx), fy);
}
export const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export const blend = (a, b, t) => a.map((n, i) => mix(n, b[i], clamp(t)));
/** 여러 크기의 얼룩을 섞은 가마 자국. @returns {number} 대략 -1~1. */
export const mottle = (p, seed) => (noise(p.u, p.v, 5, 7, seed) - .5) * 1.1 + (noise(p.u, p.v, 13, 19, seed + 1) - .5) * .6 + (noise(p.u, p.v, 60, 80, seed + 2) - .5) * .3;
/** 물레 자국처럼 가로로 길게 이어지는 결. */
export const wheel = (p, seed) => noise(p.u, p.v, 2, 90, seed) - .5;
/** 선에서 멀어질수록 0이 되는 세기. */
export const stroke = (distance, width) => 1 - smooth(width * .55, width, Math.abs(distance));

export class Shape {
  positions = []; normals = []; uvs = []; faces = [];
  vertex(p, n, uv) { this.positions.push(p); this.normals.push(unit(n)); this.uvs.push(uv); return this.positions.length; }
  quad(a, b, c, d) { this.faces.push([a, b, c], [a, c, d]); }

  /** @param outer {number[][]} 바깥 단면 [반지름,높이], 아래→위. @param inner {number[][]} 입구에서 안쪽 바닥까지. @returns {object[]} 텍스처용 단면 정보. */
  lathe(outer, inner) {
    const rows = [];
    for (const [profile, low, high, inside] of [[outer, 0, OUTER, false], [[outer.at(-1), ...inner], INNER, 1, true]]) {
      const lengths = [0];
      for (let i = 1; i < profile.length; i++) lengths.push(lengths[i - 1] + Math.hypot(profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1]));
      const segment = profile.slice(1).map((p, i) => unit([p[1] - profile[i][1], -(p[0] - profile[i][0])]));
      // 완만한 마디끼리만 법선을 평균냅니다. 입구 테두리처럼 꺾인 곳은 각을 유지합니다.
      const near = (a, b) => !b || dot(a, b) < .6 ? a : unit(add(a, b));
      const at = profile.map((p, i) => ({ r: Math.max(0, p[0]), y: p[1], v: mix(low, high, lengths[i] / lengths.at(-1)), inside }));
      rows.push(...at);
      for (let i = 0; i < profile.length - 1; i++) {
        const ring = (point, n) => Array.from({ length: SEGMENTS + 1 }, (_, k) => {
          const a = k / SEGMENTS * TAU;
          return this.vertex([point.r * Math.cos(a), point.y, point.r * Math.sin(a)], [n[0] * Math.cos(a), n[1], n[0] * Math.sin(a)], [k / SEGMENTS, point.v]);
        });
        const a = ring(at[i], near(segment[i], segment[i - 1])), b = ring(at[i + 1], near(segment[i], segment[i + 1]));
        for (let k = 0; k < SEGMENTS; k++) this.quad(a[k], a[k + 1], b[k + 1], b[k]);
      }
    }
    return rows;
  }

  /** @param points {number[][]} 중심선 [x,y,z,반지름]. @param sides {number} 둘레 분할 수. @returns {void} 양 끝이 막힌 대롱/손잡이. */
  tube(points, sides = 10) {
    const line = curve(points, 4);
    let side = null;
    const rings = line.map((p, i) => {
      const t = unit(sub(line[Math.min(line.length - 1, i + 1)].slice(0, 3), line[Math.max(0, i - 1)].slice(0, 3)));
      side = unit(side ? sub(side, mul(t, dot(side, t))) : cross(t, Math.abs(t[1]) > .9 ? [1, 0, 0] : [0, 1, 0]));
      const up = cross(t, side);
      return Array.from({ length: sides + 1 }, (_, k) => {
        const a = k / sides * TAU, n = add(mul(side, Math.cos(a)), mul(up, Math.sin(a)));
        return this.vertex(add(p.slice(0, 3), mul(n, p[3])), n, [k / sides, mix(PART_LOW, PART_HIGH, i / (line.length - 1))]);
      });
    });
    for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < sides; k++) this.quad(rings[i][k], rings[i][k + 1], rings[i + 1][k + 1], rings[i + 1][k]);
    for (const [ring, p, q] of [[rings[0], line[0], line[1]], [rings.at(-1), line.at(-1), line.at(-2)]]) {
      const n = unit(sub(p.slice(0, 3), q.slice(0, 3))), center = this.vertex(p.slice(0, 3), n, [.5, PART_LOW]);
      const edge = ring.map(i => this.vertex(this.positions[i - 1], n, this.uvs[i - 1]));
      for (let k = 0; k < sides; k++) this.faces.push([center, edge[k], edge[k + 1]]);
    }
  }

  /** 몸통 옆에 붙는 귀 모양 손잡이. @param angle {number} 방향. @param r {number} 몸통 반지름. @param y {number} 높이. */
  ear(angle, r, y, width, reach, thick, rise = 0) {
    const at = (a, d, h, t) => [Math.cos(angle + a) * d, y + h, Math.sin(angle + a) * d, t];
    const half = width / r / 2;
    this.tube([at(-half, r - .03, 0, thick * 1.1), at(-half * .75, r + reach * .7, rise * .7, thick), at(0, r + reach, rise, thick), at(half * .75, r + reach * .7, rise * .7, thick), at(half, r - .03, 0, thick * 1.1)], 8);
  }

  /** @returns {string} OBJ 원문. 처음 두 점은 면에서 쓰지 않으며, 굴림 중심이 정육면체 중앙에 오도록 경계를 고정합니다. */
  obj(title, texture) {
    const limit = Math.max(...this.positions.flat().map(Math.abs));
    if (limit > .5 + 1e-9) throw Error(title + ': 정육면체를 벗어납니다 ' + limit);
    // 같은 좌표는 한 번만 기록해 파일 크기를 줄입니다.
    const pack = (type, list, digits) => {
      const seen = new Map(), index = list.map(p => {
        const line = type + ' ' + p.map(x => String(+x.toFixed(digits))).join(' ');
        if (!seen.has(line)) seen.set(line, seen.size + 1);
        return seen.get(line);
      });
      return { lines: [...seen.keys()], index };
    };
    const v = pack('v', this.positions, 4), vt = pack('vt', this.uvs, 4), vn = pack('vn', this.normals, 2);
    return ['# ' + title, '# 형태 참고: 부천시립박물관 소장품. 게임용으로 새로 제작한 모델이며 정확한 복원이 아닙니다.', '# 텍스처: ' + texture,
      'v -0.5 -0.5 -0.5', 'v 0.5 0.5 0.5',
      ...v.lines, ...vt.lines, ...vn.lines,
      ...this.faces.map(f => 'f ' + f.map(i => (v.index[i - 1] + 2) + '/' + vt.index[i - 1] + '/' + vn.index[i - 1]).join(' '))].join('\n') + '\n';
  }
}

/** @param size {number} 한 변 픽셀. @param rgb {Buffer} RGB. @returns {Buffer} PNG 파일. */
function png(size, rgb) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ n >>> 1 : n >>> 1; return n >>> 0; });
  const crc = data => { let c = 0xffffffff; for (const b of data) c = crcTable[(c ^ b) & 255] ^ c >>> 8; return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]), out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0); body.copy(out, 4); out.writeUInt32BE(crc(body), body.length + 4);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4); header.set([8, 2, 0, 0, 0], 8);
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    raw[row] = 1;
    for (let x = 0; x < size * 3; x++) raw[row + 1 + x] = rgb[y * size * 3 + x] - (x >= 3 ? rgb[y * size * 3 + x - 3] : 0) & 255;
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/** @param rows {object[]} lathe 반환값. @param paint {function} 픽셀 색 함수. @returns {Buffer} 텍스처 PNG. */
export function texture(rows, paint) {
  const rgb = Buffer.alloc(SIZE * SIZE * 3);
  const outside = rows.filter(r => !r.inside), inside = rows.filter(r => r.inside);
  const find = (list, v) => {
    const i = list.findIndex(p => p.v >= v);
    if (i < 0) return list.at(-1);
    if (i === 0) return list[0];
    const a = list[i - 1], b = list[i], t = (v - a.v) / (b.v - a.v || 1);
    return { r: mix(a.r, b.r, t), y: mix(a.y, b.y, t) };
  };
  for (let j = 0; j < SIZE; j++) {
    const v = 1 - (j + .5) / SIZE;
    const zone = v > (OUTER + PART_LOW) / 2 ? v > (PART_HIGH + INNER) / 2 ? 'inside' : 'part' : 'outside';
    const { r, y } = zone === 'part' ? { r: .3, y: 0 } : find(zone === 'inside' ? inside : outside, v);
    for (let i = 0; i < SIZE; i++) {
      const color = paint({ u: (i + .5) / SIZE, v, zone, r, y });
      for (let c = 0; c < 3; c++) rgb[(j * SIZE + i) * 3 + c] = clamp(Math.round(color[c]), 0, 255);
    }
  }
  return png(SIZE, rgb);
}
