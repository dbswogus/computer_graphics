// 담당: 전체 연결 / 재현
// 오프라인 classic script. 의존 순서는 index.html 및 README.md 참고.
// 수정 안내와 전체 읽기 순서: CUSTOMIZATION.md

/**
 * UI 배치: 화면 함수 → 그리기 종류_번호 → 좌표/크기. 값 변경 뒤 새로고침.
 * x/y는 1600×1000 논리 화면의 왼쪽/위쪽 기준, width/height는 전체 크기.
 * text는 글자의 기준점으로 text의 align에 따라 정렬. 버튼/사각형 x/y는 왼쪽 위.
 * fontSize/radius/lineWidth도 논리 픽셀. scale은 배율.
 * UI.js의 계산식/반복 배치는 그대로 남겨두고 직접 지정한 숫자만 이곳에 모았습니다.
 * 버튼은 동일한 설정으로 그리기와 클릭 판정 영역을 함께 갱신합니다.
 * 3D 초상·옹기 카드 모델 위치는 Renderer.js의 scene에서 별도로 배치합니다.
 */
const UI_LAYOUT = {
  "label" : {
    "text_01" : {
      "fontSize" : 18
    }
  }
  ,
  "btn" : {
    "fillRound_01" : {
      "radius" : 20
    }
    ,
    "round_01" : {
      "radius" : 20
    }
    ,
    "text_01" : {
      "fontSize" : 24
    }
  }
  ,
  "header" : {
    "leaf_01" : {
      "x" : 68,
      "y" : 62,
      "scale" : 0.65
    }
    ,
    "text_01" : {
      "x" : 96,
      "y" : 61,
      "fontSize" : 21
    }
    ,
    "text_02" : {
      "x" : 1530,
      "y" : 61,
      "fontSize" : 16
    }
    ,
    "line_01" : {
      "x1" : 64,
      "y1" : 99,
      "x2" : 1536,
      "y2" : 99
    }
  }
  ,
  "photoPlaceholder" : {
    "fillRound_01" : {
      "radius" : 18
    }
    ,
    "round_01" : {
      "radius" : 12
    }
    ,
    "text_01" : {
      "fontSize" : 16
    }
    ,
    "text_02" : {
      "fontSize" : 17
    }
  }
  ,
  "drawTitle" : {
    "label_01" : {
      "x" : 100,
      "y" : 188
    }
    ,
    "text_01" : {
      "x" : 96,
      "y" : 280,
      "fontSize" : 78
    }
    ,
    "text_02" : {
      "x" : 100,
      "y" : 360,
      "fontSize" : 38
    }
    ,
    "text_03" : {
      "x" : 102,
      "y" : 452,
      "fontSize" : 26
    }
    ,
    "text_04" : {
      "x" : 102,
      "y" : 496,
      "fontSize" : 26
    }
    ,
    "text_05" : {
      "x" : 102,
      "y" : 557,
      "fontSize" : 22
    }
    ,
    "btn_01" : {
      "x" : 100,
      "y" : 626,
      "width" : 338,
      "height" : 78
    }
    ,
    "fillRound_01" : {
      "x" : 860,
      "y" : 178,
      "width" : 610,
      "height" : 620,
      "radius" : 270
    }
    ,
    "text_06" : {
      "x" : 1165,
      "y" : 760,
      "fontSize" : 24
    }
    ,
    "line_01" : {
      "x1" : 100,
      "y1" : 873,
      "x2" : 1500,
      "y2" : 873
    }
    ,
    "text_07" : {
      "x" : 1500,
      "y" : 917,
      "fontSize" : 17
    }
  }
  ,
  "drawSelect" : {
    "label_01" : {
      "x" : 70,
      "y" : 155
    }
    ,
    "text_01" : {
      "x" : 70,
      "y" : 211,
      "fontSize" : 42
    }
    ,
    "text_02" : {
      "x" : 72,
      "y" : 257,
      "fontSize" : 21
    }
    ,
    "fillRound_01" : {
      "width" : 278,
      "height" : 219,
      "radius" : 23
    }
    ,
    "round_01" : {
      "width" : 278,
      "height" : 219,
      "radius" : 23
    }
    ,
    "text_03" : {
      "fontSize" : 23
    }
    ,
    "text_04" : {
      "fontSize" : 16
    }
    ,
    "fillRound_02" : {
      "width" : 60,
      "height" : 27,
      "radius" : 13
    }
    ,
    "text_05" : {
      "fontSize" : 15
    }
    ,
    "fillRound_03" : {
      "x" : 990,
      "y" : 293,
      "width" : 540,
      "height" : 460,
      "radius" : 26
    }
    ,
    "label_02" : {
      "x" : 1020,
      "y" : 327
    }
    ,
    "text_06" : {
      "x" : 1260,
      "y" : 510,
      "fontSize" : 31
    }
    ,
    "text_07" : {
      "x" : 1260,
      "y" : 552,
      "fontSize" : 20
    }
    ,
    "line_01" : {
      "x1" : 1020,
      "y1" : 583,
      "x2" : 1500,
      "y2" : 583
    }
    ,
    "text_08" : {
      "x" : 1020,
      "fontSize" : 20
    }
    ,
    "text_09" : {
      "x" : 1020,
      "y" : 704,
      "fontSize" : 17
    }
    ,
    "text_10" : {
      "x" : 1020,
      "y" : 739,
      "fontSize" : 17
    }
    ,
    "fillRound_04" : {
      "x" : 990,
      "y" : 773,
      "width" : 540,
      "height" : 48,
      "radius" : 15
    }
    ,
    "text_11" : {
      "x" : 1260,
      "y" : 797,
      "fontSize" : 17
    }
    ,
    "btn_01" : {
      "x" : 70,
      "y" : 854,
      "width" : 195,
      "height" : 70
    }
    ,
    "btn_02" : {
      "x" : 1080,
      "y" : 847,
      "width" : 450,
      "height" : 80
    }
    ,
    "text_12" : {
      "x" : 800,
      "y" : 965,
      "fontSize" : 17
    }
  }
  ,
  "drawGuide" : {
    "label_01" : {
      "x" : 100,
      "y" : 162
    }
    ,
    "text_01" : {
      "x" : 100,
      "y" : 224,
      "fontSize" : 45
    }
    ,
    "fillRound_01" : {
      "x" : 100,
      "width" : 900,
      "height" : 122,
      "radius" : 20
    }
    ,
    "text_02" : {
      "x" : 135,
      "fontSize" : 25
    }
    ,
    "text_03" : {
      "x" : 206,
      "fontSize" : 27
    }
    ,
    "text_04" : {
      "x" : 206,
      "fontSize" : 21
    }
    ,
    "fillRound_02" : {
      "x" : 1050,
      "y" : 320,
      "width" : 450,
      "height" : 414,
      "radius" : 24
    }
    ,
    "text_05" : {
      "x" : 1275,
      "y" : 389,
      "fontSize" : 29
    }
    ,
    "text_06" : {
      "x" : 1275,
      "y" : 468,
      "fontSize" : 23
    }
    ,
    "text_07" : {
      "x" : 1275,
      "y" : 511,
      "fontSize" : 23
    }
    ,
    "text_08" : {
      "x" : 1275,
      "y" : 590,
      "fontSize" : 21
    }
    ,
    "text_09" : {
      "x" : 1275,
      "y" : 664,
      "fontSize" : 21
    }
    ,
    "btn_01" : {
      "x" : 100,
      "y" : 840,
      "width" : 200,
      "height" : 80
    }
    ,
    "btn_02" : {
      "x" : 1080,
      "y" : 840,
      "width" : 420,
      "height" : 80
    }
  }
  ,
  "drawStory" : {
    "label_01" : {
      "x" : 100,
      "y" : 190
    }
    ,
    "text_01" : {
      "x" : 100,
      "y" : 285,
      "fontSize" : 51
    }
    ,
    "text_02" : {
      "x" : 102,
      "fontSize" : 25
    }
    ,
    "fillRound_01" : {
      "x" : 100,
      "y" : 548,
      "width" : 782,
      "height" : 100,
      "radius" : 22
    }
    ,
    "text_03" : {
      "x" : 491,
      "y" : 598,
      "fontSize" : 30
    }
    ,
    "fillRound_02" : {
      "x" : 1000,
      "y" : 200,
      "width" : 480,
      "height" : 520,
      "radius" : 200
    }
    ,
    "text_04" : {
      "x" : 1240,
      "y" : 751,
      "fontSize" : 21
    }
    ,
    "text_05" : {
      "x" : 100,
      "y" : 945,
      "fontSize" : 18
    }
    ,
    "btn_01" : {
      "x" : 1080,
      "y" : 840,
      "width" : 420,
      "height" : 80
    }
  }
  ,
  "drawMonologue" : {
    "fillRound_01" : {
      "x" : 72,
      "y" : 718,
      "width" : 1456,
      "height" : 230,
      "radius" : 22
    }
    ,
    "round_01" : {
      "x" : 72,
      "y" : 718,
      "width" : 1456,
      "height" : 230,
      "radius" : 22
    }
    ,
    "fillRound_02" : {
      "x" : 103,
      "y" : 677,
      "width" : 242,
      "height" : 258,
      "radius" : 22
    }
    ,
    "fillRound_03" : {
      "x" : 370,
      "y" : 678,
      "width" : 330,
      "height" : 49,
      "radius" : 13
    }
    ,
    "text_01" : {
      "x" : 535,
      "y" : 702,
      "fontSize" : 23
    }
    ,
    "text_02" : {
      "x" : 395,
      "y" : 749,
      "fontSize" : 17
    }
    ,
    "text_03" : {
      "x" : 1470,
      "y" : 749,
      "fontSize" : 17
    }
    ,
    "text_04" : {
      "x" : 395,
      "fontSize" : 25
    }
    ,
    "text_05" : {
      "x" : 395,
      "y" : 911,
      "fontSize" : 17
    }
    ,
    "btn_01" : {
      "x" : 1239,
      "y" : 865,
      "width" : 240,
      "height" : 58
    }
  }
  ,
  "drawJoystick" : {
    "line_01" : {
      "lineWidth" : 2
    }
    ,
    "line_02" : {
      "lineWidth" : 2
    }
    ,
    "text_01" : {
      "y" : 978,
      "fontSize" : 18
    }
  }
  ,
  "drawPlay" : {
    "fillRound_01" : {
      "y" : 43,
      "width" : 112,
      "height" : 46,
      "radius" : 23
    }
    ,
    "text_01" : {
      "y" : 66,
      "fontSize" : 16
    }
    ,
    "text_02" : {
      "x" : 1535,
      "y" : 132,
      "fontSize" : 19
    }
    ,
    "fillRound_02" : {
      "x" : 64,
      "y" : 42,
      "width" : 940,
      "height" : 54,
      "radius" : 27
    }
    ,
    "text_03" : {
      "x" : 534,
      "y" : 69,
      "fontSize" : 22
    }
    ,
    "line_01" : {
      "x1" : 1279,
      "y1" : 845,
      "x2" : 1401,
      "y2" : 845,
      "lineWidth" : 2
    }
    ,
    "line_02" : {
      "x1" : 1340,
      "y1" : 784,
      "x2" : 1340,
      "y2" : 906,
      "lineWidth" : 2
    }
    ,
    "text_04" : {
      "x" : 1340,
      "y" : 934,
      "fontSize" : 22
    }
    ,
    "fillRound_03" : {
      "x" : 450,
      "y" : 333,
      "width" : 700,
      "height" : 216,
      "radius" : 30
    }
    ,
    "text_05" : {
      "x" : 800,
      "y" : 403,
      "fontSize" : 48
    }
    ,
    "text_06" : {
      "x" : 800,
      "y" : 477,
      "fontSize" : 25
    }
  }
  ,
  "drawArrival" : {
    "fillRound_01" : {
      "x" : 430,
      "y" : 817,
      "width" : 740,
      "height" : 70,
      "radius" : 30
    }
    ,
    "text_01" : {
      "x" : 800,
      "y" : 852,
      "fontSize" : 28
    }
  }
  ,
  "drawFinish" : {
    "label_01" : {
      "x" : 80,
      "y" : 158
    }
    ,
    "text_01" : {
      "x" : 80,
      "y" : 220,
      "fontSize" : 49
    }
    ,
    "text_02" : {
      "x" : 82,
      "y" : 274,
      "fontSize" : 24
    }
    ,
    "fillRound_01" : {
      "x" : 80,
      "y" : 314,
      "width" : 660,
      "height" : 460,
      "radius" : 30
    }
    ,
    "fillRound_02" : {
      "x" : 141,
      "y" : 704,
      "width" : 538,
      "height" : 49,
      "radius" : 16
    }
    ,
    "text_03" : {
      "x" : 410,
      "y" : 729,
      "fontSize" : 24
    }
    ,
    "fillRound_03" : {
      "x" : 790,
      "y" : 314,
      "width" : 740,
      "height" : 460,
      "radius" : 28
    }
    ,
    "label_02" : {
      "x" : 820,
      "y" : 345
    }
    ,
    "photoPlaceholder_01" : {
      "x" : 820,
      "y" : 377,
      "width" : 245,
      "height" : 204
    }
    ,
    "text_04" : {
      "x" : 1090,
      "y" : 392,
      "fontSize" : 17
    }
    ,
    "text_05" : {
      "x" : 1090,
      "y" : 426,
      "fontSize" : 23
    }
    ,
    "text_06" : {
      "x" : 1090,
      "y" : 472,
      "fontSize" : 17
    }
    ,
    "text_07" : {
      "x" : 1090,
      "y" : 503,
      "fontSize" : 20
    }
    ,
    "text_08" : {
      "x" : 1090,
      "y" : 547,
      "fontSize" : 17
    }
    ,
    "text_09" : {
      "x" : 1090,
      "y" : 576,
      "fontSize" : 20
    }
    ,
    "line_01" : {
      "x1" : 820,
      "y1" : 603,
      "x2" : 1500,
      "y2" : 603
    }
    ,
    "text_10" : {
      "x" : 820,
      "y" : 633,
      "fontSize" : 19
    }
    ,
    "text_11" : {
      "x" : 820,
      "fontSize" : 21
    }
    ,
    "text_12" : {
      "x" : 820,
      "y" : 744,
      "fontSize" : 16
    }
    ,
    "btn_01" : {
      "x" : 80,
      "y" : 839,
      "width" : 400,
      "height" : 78
    }
    ,
    "btn_02" : {
      "x" : 510,
      "y" : 839,
      "width" : 310,
      "height" : 78
    }
    ,
    "text_13" : {
      "x" : 1500,
      "y" : 963,
      "fontSize" : 17
    }
  }
  ,
  "drawHomeLabel" : {
    "fillRound_01" : {
      "width" : 214,
      "height" : 51,
      "radius" : 17
    }
    ,
    "text_01" : {
      "fontSize" : 19
    }
    ,
    "line_01" : {
      "lineWidth" : 2
    }
  }
  ,
  "drawUI" : {
    "fillRound_01" : {
      "x" : 180,
      "y" : 276,
      "width" : 1240,
      "height" : 448,
      "radius" : 38
    }
    ,
    "text_01" : {
      "x" : 800,
      "y" : 437,
      "fontSize" : 49
    }
    ,
    "text_02" : {
      "x" : 800,
      "y" : 535,
      "fontSize" : 26
    }
  }
}
;
