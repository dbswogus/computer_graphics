#!/usr/bin/env python3
"""다유: 스테이지 ASCII 설계 → src/config/MapConfig.js + content/maps/*.json 생성.
범례: . 빈칸  # 바닥  W 벽  S 출발  G 목표  1-9 체크포인트(번호순)  O 구멍
      ~ 무너지는 바닥  X 왕복장애물(x축)  Z 왕복장애물(z축)  Y 넓게 왕복(x축)  y·z 짧게 왕복(x·z축)
격자 17x12 (x=-8.5..7.5, z=-5.5..5.5). 실행: python3 tools/make-stages.py"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SWEEP = {'X': ('x', 1, 4.4), 'Z': ('z', 1, 4.0), 'Y': ('x', 1, 5.0), 'z': ('z', .5, 3.2), 'y': ('x', .5, 4.0)}
STAGES = [
 ('공방', [
  'WWWWWWWWW........',
  'WS######W........',
  'W#######W........',
  'W###O###WWWWWWWW.',
  'W#######1######W.',
  'W##############W.',
  'WWWWWWWW###O###W.',
  '.......W#######W.',
  '.......W###WWWWW.',
  '.......W###W.....',
  '.......W##GW.....',
  '.......WWWWW.....']),
 ('가마 앞', [
  '.................',
  '.####WWWWWWW####.',
  '.#S##W.....W##G#.',
  '.####W.....W####.',
  '.Z###WWWWWWW##OZ.',
  '.########Y######.',
  '.##1#########2##.',
  '.###############.',
  '.#O#..WWWWW..###.',
  '.###.........###.',
  '.#####O###O#####.',
  '.................']),
 ('전시실', [
  'WWWWWWWWWWWWWWWWW',
  'WS##W.....W##G##W',
  'W###W.....W#####W',
  'W###W.....WO###OW',
  'WO##W.....W##y##W',
  'W###WWWWWWW#####W',
  'W##1~~~~~~~2####W',
  'W###~~~~~~~#####W',
  'W###WWWWWWW##O##W',
  'W#####O#########W',
  'W###############W',
  'WWWWWWWWWWWWWWWWW']),
]

def build(name, rows):
    assert len(rows) == 12 and all(len(r) == 17 for r in rows), name
    cells = [(c, -8.5 + i, -5.5 + j) for j, r in enumerate(rows) for i, c in enumerate(r)]
    blocks = []
    def add(t, x, z, **kw):
        b = {'id': f'unit-{len(blocks)}', 'type': t, 'x': x, 'z': z, 'w': 1, 'd': 1,
             'period': 5, 'amp': 1, 'rotation': 0, 'axis': 'x'}
        b.update(kw); blocks.append(b)
    for c, x, z in cells:
        if c not in '.W': add('floor', x, z)
    for c, x, z in cells:
        if c == 'W': add('wall', x, z)
        elif c == 'O': add('hole', x, z)
        elif c == '~': add('crumble', x, z)
        elif c in SWEEP:
            axis, amp, period = SWEEP[c]; add('sweeper', x, z, axis=axis, amp=amp, period=period)
    for c, x, z in cells:
        if c == 'S': add('start', x, z)
    for c, x, z in sorted((t for t in cells if t[0].isdigit()), key=lambda t: t[0]):
        add('checkpoint', x, z)
    for c, x, z in cells:
        if c == 'G': add('goal', x, z)
    return {'version': 1, 'name': name, 'blocks': blocks}

maps = [build(n, r) for n, r in STAGES]
team = {'kind': 'onggi-team-map', 'version': 1, 'maps': maps, 'blockAssets': {}, 'floorAssetId': '', 'assets': []}
js = ('// 담당: 다유 | MapConfig.js | 편집기에서 담당별 내보내기로 생성\nconst TEAM_MAP_SOURCE = '
      + json.dumps(team, ensure_ascii=False, indent=2).replace('<', '\\u003c') + ';\n')
open(os.path.join(ROOT, 'src/config/MapConfig.js'), 'w').write(js)
d = os.path.join(ROOT, 'content/maps')
for f in os.listdir(d):
    if f.endswith('-stage.json'): os.remove(os.path.join(d, f))
for i, m in enumerate(maps, 1):
    open(os.path.join(d, f'{i:02d}-stage.json'), 'w').write(json.dumps(m, ensure_ascii=False, indent=2) + '\n')
print('maps:', [(m['name'], len(m['blocks'])) for m in maps])
