/* 부천시립박물관 소장 옹기 6점의 형태를 참고한 게임용 OBJ와 텍스처를 새로 만듭니다.
 * 모양은 아래 단면 수치, 표면은 절차적 무늬입니다. 박물관 사진은 소개 화면에만 쓰고 모델에는 입히지 않습니다.
 * 실행: node tools/make-onggi-assets.mjs → assets/models/*.obj, assets/images/*.png, src/config/assetConfig.js 갱신.
 * 좌표: 세로 축이 Y이고 원점이 굴림 중심, 전체가 -0.5~0.5 정육면체 안에 들어갑니다. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { Shape, TAU, texture, curve, noise, hex, blend, mottle, wheel, stroke, smooth } from './onggi-shape.mjs';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const pots = [
  { // 높은 어깨, 좁은 바닥, 소용돌이 무늬
    file: 'onggi-sun-jar', photo: 'museum-1068', title: '태양문 항아리',
    build(s) {
      return s.lathe([[0, -.5], [.2, -.5], ...curve([[.225, -.49], [.3, -.32], [.37, -.12], [.415, .07], [.428, .2], [.405, .3], [.335, .385], [.258, .445], [.247, .462]]), [.272, .468], [.282, .482], [.272, .498], [.25, .5]],
        [...curve([[.23, .485], [.228, .45], [.36, .32], [.39, .15], [.33, -.15], [.2, -.4]], 3), [0, -.42]]);
    },
    paint(p) {
      let c = blend(hex('#83432a'), hex('#4f2a1d'), smooth(.1, -.45, p.y) * .75 + mottle(p, 11) * .55);
      c = blend(c, hex('#a4582f'), Math.max(0, mottle(p, 17)) * .55);
      if (p.zone === 'inside') return blend(c, hex('#2a1812'), .55);
      if (p.zone === 'part') return c;
      for (const y of [.315, .33, -.34]) c = blend(c, hex('#3b2017'), stroke(p.y - y, .008) * .8);
      // 손가락으로 유약을 훑어낸 듯한 소용돌이 4개와 그 사이의 잎 무늬
      const cell = p.u * 4 % 1, x = (cell - .5) / 4 * TAU * .4, y = p.y - .03, d = Math.hypot(x, y * 1.05);
      const turn = (d - .055 * (Math.atan2(y, x) / TAU + .5)) / .055;
      if (d < .16 && d > .02) c = blend(c, hex('#c98a55'), stroke((turn - Math.round(turn)) * .055, .012) * .85);
      const edge = Math.min(cell, 1 - cell) / 4 * TAU * .4;
      if (Math.abs(y) < .15) c = blend(c, hex('#b9794a'), stroke(edge - Math.abs(Math.sin(y * 26)) * .05, .011) * .7);
      return blend(c, hex('#b06a3c'), smooth(.46, .5, p.y) * .5);
    }
  },
  { // 항아리 두 개를 이은 잘록한 허리와 대롱
    file: 'onggi-soju-still', photo: 'museum-1073', title: '소줏고리',
    build(s) {
      const rows = s.lathe([[0, -.5], [.33, -.5], ...curve([[.35, -.49], [.395, -.42], [.41, -.3], [.385, -.16], [.3, -.03], [.18, .06], [.14, .1], [.16, .145], [.235, .24], [.28, .35], [.292, .44]]), [.308, .455], [.31, .485], [.295, .5], [.278, .497]],
        [...curve([[.264, .47], [.255, .37], [.21, .27], [.12, .22]], 3), [0, .21]]);
      s.tube([[-.1, .1, 0, .062], [-.22, .06, 0, .055], [-.35, -.02, 0, .046], [-.46, -.1, 0, .03]], 12);
      for (const a of [Math.PI / 2, -Math.PI / 2, .25]) s.ear(a, .375, -.15, .14, .06, .022, .025);
      return rows;
    },
    paint(p) {
      let c = blend(hex('#5c4036'), hex('#75483a'), .5 + mottle(p, 31) * .9 + wheel(p, 34) * .35);
      c = blend(c, hex('#37261f'), Math.max(0, -mottle(p, 37)) * .6);
      if (p.zone === 'inside') return blend(c, hex('#30201a'), .45);
      if (p.zone === 'part') return blend(c, hex('#6d4436'), .4);
      for (const y of [-.43, .385, .41]) c = blend(c, hex('#33221b'), stroke(p.y - y, .008) * .7);
      // 윗단지의 물결무늬
      if (p.y > .25) c = blend(c, hex('#a5674b'), stroke(p.y - .33 - Math.abs(Math.sin(p.u * TAU * 5)) * .035, .011) * .8);
      return c;
    }
  },
  { // 넓은 입구와 둘레의 귀 손잡이, 바닥의 김 구멍
    file: 'onggi-siru', photo: 'museum-1107', title: '시루',
    build(s) {
      const rows = s.lathe([[0, -.36], [.25, -.36], ...curve([[.275, -.352], [.36, -.23], [.4, -.05], [.412, .12], [.418, .24]]), [.445, .255], [.455, .3], [.445, .345], [.42, .36], [.4, .352]],
        [...curve([[.385, .3], [.38, .05], [.34, -.18], [.24, -.3]], 3), [0, -.315]]);
      for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) s.ear(a + .4, .402, -.02, .17, .062, .025, .03);
      return rows;
    },
    paint(p) {
      let c = blend(hex('#90753f'), hex('#74693f'), smooth(.15, -.35, p.y) * .7 + mottle(p, 51) * .5 + wheel(p, 54) * .7);
      c = blend(c, hex('#a5873f'), Math.max(0, mottle(p, 57)) * .5);
      const around = ((p.u * 6) % 1 - .5) / 6 * TAU * p.r;
      const steam = p.y < -.29 && (p.r < .034 || Math.hypot(around, p.r - .13) < .032);
      if (p.zone === 'part') return blend(c, hex('#8f7a3c'), .5);
      if (steam) return hex('#1d1712');
      if (p.zone === 'inside') return blend(c, hex('#a8673a'), .62 + wheel(p, 59) * .4);
      for (const y of [.215, .228]) c = blend(c, hex('#4c4527'), stroke(p.y - y, .006) * .7);
      if (Math.hypot((p.u - .25) * TAU * .38, p.y + .2) < .022) return hex('#211a12');
      return blend(c, hex('#a9744a'), smooth(.25, .3, p.y) * .85);
    }
  },
  { // 낮은 몸통에 비스듬히 솟은 손잡이
    file: 'onggi-medicine-pot', photo: 'museum-1067', title: '약탕기',
    build(s) {
      const rows = s.lathe([[0, -.36], [.27, -.36], ...curve([[.3, -.35], [.395, -.21], [.42, -.1], [.4, .0], [.315, .155], [.235, .255]]), [.25, .285], [.272, .31], [.27, .345], [.245, .36], [.228, .352]],
        [...curve([[.212, .3], [.215, .24], [.34, .05], [.36, -.1], [.24, -.27]], 3), [0, -.29]]);
      s.tube([[.34, -.06, 0, .075], [.4, .01, 0, .058], [.435, .12, 0, .045], [.45, .22, 0, .04], [.455, .3, 0, .036]], 10);
      return rows;
    },
    paint(p) {
      let c = blend(hex('#7c4632'), hex('#57392f'), .45 + mottle(p, 71) * .9);
      c = blend(c, hex('#a05a3c'), Math.max(0, noise(p.u, p.v, 4, 5, 77) - .5) * 1.1);
      if (p.zone === 'inside') return blend(c, hex('#2a1a14'), .5);
      if (p.zone === 'part') return blend(c, hex('#6a4a3a'), .45).map(n => n * (.9 + .2 * noise(p.u, p.v, 6, 60, 79)));
      // 아래쪽에 튄 잿빛 유약 점
      const speck = smooth(.72, .8, noise(p.u, p.v, 46, 60, 73)) * smooth(0, -.2, p.y) * smooth(.45, .6, noise(p.u, p.v, 4, 4, 75));
      c = blend(c, hex('#a59055'), speck * .8);
      return blend(c, hex('#b07a55'), smooth(.28, .36, p.y) * .6);
    }
  },
  { // 둥근 몸통과 아주 좁은 목
    file: 'onggi-liquor-bottle', photo: 'museum-1061', title: '주병',
    build(s) {
      return s.lathe([[0, -.5], [.24, -.5], ...curve([[.265, -.492], [.355, -.34], [.4, -.16], [.402, .0], [.355, .16], [.25, .28], [.115, .355], [.074, .385], [.068, .415]]), [.094, .43], [.098, .448], [.082, .456], [.09, .464], [.104, .48], [.1, .497], [.085, .5]],
        [[.06, .492], [.05, .45], [0, .44]]);
    },
    paint(p) {
      let c = blend(hex('#4d463d'), hex('#332f2b'), .45 + mottle(p, 91) * .8);
      c = blend(c, hex('#7b7160'), smooth(.5, .9, noise(p.u, p.v, 190, 240, 93)) * .3);
      c = blend(c, hex('#5f4a38'), Math.max(0, mottle(p, 97)) * .5);
      if (p.zone !== 'outside') return hex('#1c1815');
      c = blend(c, hex('#26221f'), stroke(p.y + .08, .007) * .75);
      return blend(c, hex('#262220'), smooth(.36, .42, p.y) * .45);
    }
  },
  { // 대나무 마디 같은 가로 홈
    file: 'onggi-bamboo-jar', photo: 'museum-1109', title: '죽절단지',
    build(s) {
      const ridges = [], count = 9, low = -.36, high = .23;
      for (let i = 0; i <= count * 6; i++) {
        const t = i / count / 6;
        ridges.push([.395 + .012 * Math.sin(t * Math.PI) + .03 * Math.abs(Math.sin(t * Math.PI * count)) ** .7, low + (high - low) * t]);
      }
      return s.lathe([[0, -.5], [.27, -.5], [.29, -.49], [.36, -.41], ...ridges, ...curve([[.395, .25], [.36, .3], [.255, .395], [.232, .415], [.228, .44]]), [.252, .455], [.262, .475], [.255, .495], [.235, .5]],
        [...curve([[.215, .485], [.21, .43], [.34, .28], [.36, 0], [.3, -.36]], 3), [0, -.42]]);
    },
    paint(p) {
      let c = blend(hex('#5b372a'), hex('#3a241c'), .4 + mottle(p, 111) * .8);
      if (p.zone !== 'outside') return blend(c, hex('#241611'), .5);
      const t = (p.y + .36) / .59;
      if (t > 0 && t < 1) {
        const ridge = Math.abs(Math.sin(t * Math.PI * 9));
        c = blend(c, hex('#8a5037'), smooth(.55, 1, ridge) * .5);
        c = blend(c, hex('#1f130e'), smooth(.45, .05, ridge) * .75);
      } else if (p.y > .23) c = blend(c, hex('#74422e'), .35 + mottle(p, 117) * .5);
      return blend(c, hex('#7d4a33'), smooth(.45, .5, p.y) * .5);
    }
  }
];

const modelDir = path.join(base, 'assets/models'), imageDir = path.join(base, 'assets/images');
const assets = [], onggiAssets = {}, modelTextures = {};
for (const [id, pot] of pots.entries()) {
  const shape = new Shape(), rows = pot.build(shape);
  const obj = Buffer.from(shape.obj(pot.title, pot.file + '.png')), image = texture(rows, pot.paint);
  fs.writeFileSync(path.join(modelDir, pot.file + '.obj'), obj);
  fs.writeFileSync(path.join(imageDir, pot.file + '.png'), image);
  const model = pot.file + '-model', skin = pot.file + '-skin', photo = fs.readFileSync(path.join(imageDir, pot.photo + '.jpg'));
  assets.push({ id: model, name: pot.file + '.obj', kind: 'model', data: 'data:text/plain;base64,' + obj.toString('base64') },
    { id: skin, name: pot.file + '.png', kind: 'image', data: 'data:image/png;base64,' + image.toString('base64') },
    { id: pot.photo, name: pot.photo + '.jpg', kind: 'image', data: 'data:image/jpeg;base64,' + photo.toString('base64') });
  onggiAssets[id] = model;
  modelTextures[model] = skin;
  console.log(pot.title, '삼각형', shape.faces.length, '| OBJ', Math.round(obj.length / 1024) + 'KB', '| PNG', Math.round(image.length / 1024) + 'KB');
}

// 기존 에셋(소리 등)은 그대로 두고, 이 도구가 만든 에셋만 교체합니다.
const file = path.join(base, 'src/config/assetConfig.js'), context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(base, 'src/editor/TeamSource.js'), 'utf8'), context);
context.text = fs.readFileSync(file, 'utf8');
const source = vm.runInContext("TeamSource.parse('asset',text)", context), own = new Set(assets.map(a => a.id));
source.assets = [...source.assets.filter(a => !own.has(a.id)), ...assets];
source.settings.onggiAssets = { ...source.settings.onggiAssets, ...onggiAssets };
source.settings.modelTextures = { ...source.settings.modelTextures, ...modelTextures };
context.value = source;
fs.writeFileSync(file, vm.runInContext("TeamSource.stringify('asset',value)", context));
console.log('assetConfig.js 갱신 완료');
