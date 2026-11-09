// The synthetic eval sketches. Each case draws itself with the Scene builders, which
// record the ground truth as they draw. `npm run eval:generate` renders them to
// eval/cases/<id>.png + <id>.json. Hand-labelled photos can sit beside them in the
// same folder; the runner treats every <id>.json there as a case.
import { Scene } from './lib/scene.mjs';

function sunWithRays(s, cx, cy, r, rays = 8, color) {
  s.circle(cx, cy, r, { label: 'sun', color });
  for (let k = 0; k < rays; k++) {
    const a = (k / rays) * Math.PI * 2 + 0.2;
    s.line([cx + (r + 14) * Math.cos(a), cy + (r + 14) * Math.sin(a)],
      [cx + (r + 42) * Math.cos(a), cy + (r + 42) * Math.sin(a)], { label: 'sun ray', color });
  }
}

function pineTree(s, cx, top, size) {
  s.triangle(cx, top, size * 0.7, size * 0.55, { label: 'tree top tier' });
  s.triangle(cx, top + size * 0.35, size, size * 0.6, { label: 'tree lower tier' });
  s.rect(cx - size * 0.08, top + size * 0.95, cx + size * 0.08, top + size * 1.2, { type: 'rectangle', label: 'tree trunk' });
}

export const CASES = [
  (s = new Scene({ id: 'flowchart', title: 'Flowchart with a decision', seed: 11, keywords: ['flow', 'process', 'decision'] })) => {
    s.ellipse(130, 320, 95, 50, { label: 'start terminator' });
    s.centredText('START', 130, 320, 24);
    s.arrow([230, 320], [322, 320]);
    s.rect(330, 270, 490, 370, { label: 'load step' });
    s.centredText('LOAD', 410, 320, 26);
    s.arrow([495, 320], [582, 320]);
    s.rhombus(680, 320, 180, 140, { label: 'decision' });
    s.centredText('OK?', 680, 320, 26);
    s.arrow([680, 395], [680, 482]);
    s.text('YES', 696, 424, 22);
    s.rect(600, 490, 760, 580, { label: 'save step' });
    s.centredText('SAVE', 680, 535, 26);
    return s;
  },
  (s = new Scene({ id: 'house', title: 'House with sun', seed: 12, keywords: ['house', 'home'] })) => {
    s.rect(300, 300, 560, 560, { label: 'house body' });
    s.triangle(430, 150, 320, 150, { label: 'roof' });
    s.rect(505, 185, 540, 245, { type: 'rectangle', label: 'chimney' });
    s.rect(400, 460, 460, 560, { label: 'door' });
    s.rect(330, 340, 380, 390, { label: 'left window' });
    s.rect(480, 340, 530, 390, { label: 'right window' });
    sunWithRays(s, 790, 140, 50);
    s.text('HOME', 370, 590, 30);
    return s;
  },
  (s = new Scene({ id: 'pine-trees-road', title: 'Pine trees beside a winding road', seed: 13, keywords: ['tree', 'road', 'path'], notes: 'The case that failed before pictogram support: every tree came back as a rectangle.' })) => {
    s.curve([[380, 635], [420, 520], [520, 430], [600, 330], [640, 240]], { label: 'road left edge' });
    s.curve([[540, 635], [550, 520], [620, 430], [680, 330], [690, 240]], { label: 'road right edge' });
    pineTree(s, 170, 120, 160);
    pineTree(s, 300, 300, 130);
    pineTree(s, 800, 150, 150);
    pineTree(s, 860, 390, 110);
    return s;
  },
  (s = new Scene({ id: 'stick-figure', title: 'Stick figure saying hi', seed: 14, keywords: ['person', 'figure', 'man', 'human'] })) => {
    s.circle(480, 150, 45, { label: 'head' });
    s.line([480, 195], [480, 380], { label: 'body' });
    s.line([480, 250], [390, 310], { label: 'left arm' });
    s.line([480, 250], [570, 300], { label: 'right arm' });
    s.line([480, 380], [410, 520], { label: 'left leg' });
    s.line([480, 380], [550, 520], { label: 'right leg' });
    s.ellipse(640, 108, 80, 45, { label: 'speech bubble' });
    s.text('HI!', 598, 90, 36);
    return s;
  },
  (s = new Scene({ id: 'architecture', title: 'Web, API, cache and database', seed: 15, keywords: ['architecture', 'system', 'api', 'database', 'service'] })) => {
    s.text('USERS', 115, 40, 24);
    s.arrow([170, 72], [170, 114]);
    s.rect(80, 120, 260, 220, { label: 'web box' });
    s.centredText('WEB', 170, 170, 28);
    s.arrow([265, 170], [385, 170]);
    s.rect(390, 120, 570, 220, { label: 'api box' });
    s.centredText('API', 480, 170, 28);
    s.arrow([575, 170], [715, 170]);
    s.rect(720, 120, 900, 220, { label: 'db box' });
    s.centredText('DB', 810, 170, 28);
    s.arrow([480, 225], [480, 395]);
    s.rect(390, 400, 570, 500, { label: 'cache box' });
    s.centredText('CACHE', 480, 450, 26);
    return s;
  },
  (s = new Scene({ id: 'primitives', title: 'Eight geometric primitives', seed: 16, keywords: ['shape', 'geometric'] })) => {
    s.circle(130, 170, 80);
    s.ellipse(350, 170, 110, 65);
    s.triangle(590, 90, 170, 160);
    s.rhombus(820, 170, 170, 170);
    s.rect(40, 400, 240, 520, { type: 'rectangle' });
    s.rect(300, 400, 420, 520, { type: 'square' });
    s.parallelogram(480, 400, 700, 520, 50);
    s.trapezoid(740, 400, 930, 520, 45);
    return s;
  },
  (s = new Scene({ id: 'weather', title: 'Rain cloud and sun', seed: 17, keywords: ['cloud', 'rain', 'sun', 'weather'] })) => {
    const cloud = [];
    for (let k = 0; k < 60; k++) {
      const a = (k / 60) * Math.PI * 2;
      const r = 1 + 0.16 * Math.abs(Math.sin(3.5 * a));
      cloud.push([430 + 170 * r * Math.cos(a), 220 + 80 * r * Math.sin(a)]);
    }
    s.polygon(cloud, { label: 'cloud' });
    sunWithRays(s, 790, 150, 55);
    for (let k = 0; k < 8; k++) {
      const x = 310 + k * 34;
      s.line([x + 12, 350 + (k % 2) * 25], [x, 405 + (k % 2) * 25], { label: 'rain drop' });
    }
    return s;
  },
  (s = new Scene({ id: 'star-arrow-hexagon', title: 'Star, block arrow and hexagon', seed: 18, keywords: ['star', 'arrow', 'hexagon'] })) => {
    const star = [];
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const r = k % 2 === 0 ? 140 : 58;
      star.push([220 + r * Math.cos(a), 330 + r * Math.sin(a)]);
    }
    s.polygon(star, { label: 'star' });
    s.polygon([[420, 270], [600, 270], [600, 210], [720, 320], [600, 430], [600, 370], [420, 370]], { label: 'block arrow' });
    const hex = [];
    for (let k = 0; k < 6; k++) hex.push([840 + 90 * Math.cos((k * Math.PI) / 3), 320 + 90 * Math.sin((k * Math.PI) / 3)]);
    s.polygon(hex, { label: 'hexagon' });
    return s;
  },
  (s = new Scene({ id: 'mind-map', title: 'Mind map with four branches', seed: 19, keywords: ['mind map', 'idea', 'concept', 'brainstorm'] })) => {
    s.ellipse(480, 320, 120, 60, { label: 'central idea' });
    s.centredText('IDEA', 480, 320, 30);
    const nodes = [[170, 140, 'PLAN'], [790, 140, 'TEAM'], [170, 500, 'COST'], [790, 500, 'TIME']];
    for (const [x, y, word] of nodes) {
      s.circle(x, y, 55, { label: `${word.toLowerCase()} node` });
      s.centredText(word, x, y, 22);
    }
    s.line([390, 285], [215, 172]);
    s.line([570, 285], [745, 172]);
    s.line([390, 355], [215, 468]);
    s.line([570, 355], [745, 468]);
    return s;
  },
  (s = new Scene({ id: 'bar-chart', title: 'Quarterly bar chart', seed: 20, keywords: ['bar', 'chart', 'graph', 'sales'] })) => {
    s.text('SALES', 400, 30, 30);
    s.arrow([100, 560], [100, 80], { label: 'y axis' });
    s.arrow([100, 560], [880, 560], { label: 'x axis' });
    const bars = [[170, 400], [330, 250], [490, 330], [650, 180]];
    bars.forEach(([x, top], i) => {
      s.rect(x, top, x + 100, 560, { type: 'rectangle', label: `bar Q${i + 1}` });
      s.centredText(`Q${i + 1}`, x + 50, 590, 24);
    });
    return s;
  },
  (s = new Scene({ id: 'state-diagram', title: 'Three-state machine', seed: 21, keywords: ['state', 'diagram', 'transition', 'machine'] })) => {
    s.circle(180, 330, 70, { label: 'state A' });
    s.centredText('A', 180, 330, 36);
    s.circle(480, 170, 70, { label: 'state B' });
    s.centredText('B', 480, 170, 36);
    s.circle(780, 330, 70, { label: 'state C' });
    s.centredText('C', 780, 330, 36);
    s.arrow([240, 293], [415, 205]);
    s.text('GO', 290, 205, 22);
    s.arrow([545, 205], [720, 293]);
    s.text('OK', 640, 205, 22);
    s.arrow([708, 345], [252, 345]);
    s.text('BACK', 435, 365, 22);
    return s;
  },
  (s = new Scene({ id: 'car', title: 'Side view of a car', seed: 22, keywords: ['car', 'vehicle', 'automobile'] })) => {
    s.polygon([[150, 420], [150, 340], [290, 330], [370, 250], [600, 250], [690, 330], [820, 345], [820, 420]], { label: 'car body' });
    s.polygonShape('trapezoid', [[385, 270], [480, 270], [480, 325], [325, 325]], { label: 'front window' });
    s.polygonShape('trapezoid', [[500, 270], [590, 270], [655, 325], [500, 325]], { label: 'rear window' });
    s.circle(280, 430, 55, { label: 'front wheel' });
    s.circle(700, 430, 55, { label: 'rear wheel' });
    return s;
  },
  (s = new Scene({ id: 'arrow-directions', title: 'Arrows in five directions', seed: 23, keywords: ['arrow'], notes: 'Scores arrow direction: the head must end up where it is drawn.' })) => {
    s.arrow([100, 120], [330, 120], { label: 'right' });
    s.arrow([850, 120], [620, 120], { label: 'left' });
    s.arrow([200, 250], [200, 520], { label: 'down' });
    s.arrow([480, 560], [480, 280], { label: 'up' });
    s.arrow([620, 560], [860, 300], { label: 'up-right' });
    return s;
  },
  (s = new Scene({ id: 'coloured-shapes', title: 'Shapes in five colours', seed: 24, pen: 4.5, keywords: ['circle', 'square', 'triangle', 'shape'], notes: 'Scores stroke colour.' })) => {
    s.circle(180, 200, 100, { color: '#d62828' });
    s.rect(400, 110, 580, 290, { type: 'square', color: '#1d4ed8' });
    s.triangle(820, 100, 210, 190, { color: '#2e7d32' });
    s.arrow([120, 480], [420, 480], { color: '#ef7d00' });
    s.ellipse(700, 480, 170, 80, { color: '#7b2cbf' });
    return s;
  },
  (s = new Scene({ id: 'mountain-river', title: 'Mountains, river and birds', seed: 25, keywords: ['mountain', 'river', 'landscape'] })) => {
    s.triangle(250, 80, 380, 220, { label: 'left mountain' });
    s.triangle(530, 130, 300, 170, { label: 'right mountain' });
    s.curve([[390, 300], [370, 400], [450, 500], [600, 560], [800, 600]], { label: 'river bank' });
    s.curve([[450, 300], [450, 390], [530, 470], [660, 515], [860, 545]], { label: 'river bank' });
    s.circle(820, 120, 50, { label: 'sun' });
    for (const [x, y] of [[640, 160], [710, 200]]) {
      s.curve([[x, y], [x + 18, y + 14], [x + 36, y]], { label: 'bird' });
    }
    return s;
  },
];

/** Builds every case's Scene. */
export function buildScenes() {
  return CASES.map((build) => build());
}
