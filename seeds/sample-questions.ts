export type Choice = {
  id: string;
  text: string;
};

export type Question = {
  id: string;
  type: 'reading' | 'diagram' | 'math' | string;
  title: string;
  passage?: string;        // for reading questions
  diagramSvg?: string;     // inline SVG for diagram questions
  stem: string;
  choices: Choice[];
  answerId: string;
  explanation?: string;
  tags?: string[];
  createdBy?: string;
  reviewStatus?: 'pending' | 'approved' | 'rejected';
};

// Three sample questions: reading passage, diagram (geometry), math with small diagram.
export const sampleQuestions: Question[] = [
  {
    id: 'q-sample-001',
    type: 'reading',
    title: 'Passage: The Lighthouse Keeper',
    passage:
      "Maria inherited a small lighthouse on a rocky point. During the first winter, she learned that lighthouses require more than a tall lamp: they needed steady supplies of oil, a reliable clockwork to turn the lens, and a vigilant keeper to make tiny, constant repairs. The townspeople said that the lighthouse was a beacon not only to ships but to the community — it offered a routine, a measured work that depended on attendance and patience. Maria's neighbors would bring supplies during storms, exchange stories, and remind her that the light itself only mattered because someone chose to tend it.",
    stem: 'Which of the following best captures the passage’s main idea?',
    choices: [
      { id: 'A', text: 'A lighthouse’s lamp is the most important part of its operation.' },
      { id: 'B', text: 'Keeping a lighthouse running requires regular, community-supported care.' },
      { id: 'C', text: 'Lighthouses are primarily important for their architectural design.' },
      { id: 'D', text: 'Maria refused any help and kept the lighthouse entirely on her own.' },
    ],
    answerId: 'B',
    explanation:
      'The passage emphasizes the routine maintenance, supplies, and community support required to run the lighthouse; B best summarizes that main idea.',
    tags: ['reading-comprehension', 'main-idea'],
    createdBy: 'seed',
    reviewStatus: 'pending',
  },

  {
    id: 'q-sample-002',
    type: 'diagram',
    title: 'Geometry: Labelled triangle',
    diagramSvg:
      `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="420" height="220" viewBox="0 0 420 220" aria-labelledby="title desc" role="img">\n  <title id="title">Triangle ABC</title>\n  <desc id="desc">An isosceles triangle ABC with AB = AC. Angle at A is labeled 20° and point D on BC forms a perpendicular from A.</desc>\n  <style>\n    .side { stroke: #222; stroke-width: 2; fill: none; }\n    .label { font-family: Arial, sans-serif; font-size: 14px; fill: #111; }\n    .mark { stroke: #c33; stroke-width: 2; }\n  </style>\n  <!-- Triangle -->\n  <polygon class="side" points="70,180 210,40 350,180" />\n  <!-- Labels -->\n  <text class="label" x="60" y="195">B</text>\n  <text class="label" x="200" y="30">A</text>\n  <text class="label" x="360" y="195">C</text>\n  <!-- A small angle mark at A labeled 20° -->\n  <path d="M195,52 A30,30 0 0,1 230,80" class="mark" fill="none"/>\n  <text class="label" x="215" y="75">20°</text>\n  <!-- Drop perpendicular from A to BC at D -->\n  <line x1="210" y1="40" x2="210" y2="180" stroke="#222" stroke-dasharray="4,4"/>\n  <text class="label" x="220" y="185">D</text>\n</svg>`,
    stem:
      'In the diagram above, triangle ABC is isosceles with AB = AC and angle BAC = 20°. AD is perpendicular to BC. Which value is closest to angle ADB?',
    choices: [
      { id: 'A', text: '10°' },
      { id: 'B', text: '20°' },
      { id: 'C', text: '40°' },
      { id: 'D', text: '90°' },
    ],
    answerId: 'D',
    explanation:
      'Because AD is an altitude from the apex of an isosceles triangle, AD is perpendicular to BC. Thus angle ADB, the angle between AD and DB, is 90°. ',
    tags: ['geometry', 'diagram'],
    createdBy: 'seed',
    reviewStatus: 'pending',
  },

  {
    id: 'q-sample-003',
    type: 'math',
    title: 'Algebra: Linear models (small diagram)',
    diagramSvg:
      `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="420" height="200" viewBox="0 0 420 200" role="img" aria-label="Graph of two lines">\n  <style>.axis { stroke:#444; stroke-width:1 } .lineA { stroke:#1f77b4; stroke-width:2 } .lineB { stroke:#ff7f0e; stroke-width:2 }</style>\n  <!-- axes -->\n  <line x1="30" y1="170" x2="390" y2="170" class="axis"/>\n  <line x1="30" y1="20" x2="30" y2="170" class="axis"/>\n  <!-- line y = 0.5x + 10 -->\n  <line x1="30" y1="155" x2="390" y2="205" class="lineA"/>\n  <!-- line y = -x + 120 -->\n  <line x1="30" y1="110" x2="390" y2="20" class="lineB"/>\n  <text x="40" y="30" font-family="Arial" font-size="12">y</text>\n  <text x="390" y="185" font-family="Arial" font-size="12">x</text>\n</svg>`,
    stem:
      'Two linear models are shown in the graph above: one models temperature over time (blue line) with equation y = 0.5x + 10, and the other models cooling (orange line) with equation y = -x + 120. At what x-value do the two models predict the same temperature?',
    choices: [
      { id: 'A', text: '40' },
      { id: 'B', text: '60' },
      { id: 'C', text: '220/3 (≈73.33)' },
      { id: 'D', text: '80' },
    ],
    answerId: 'C',
    explanation:
      'Solve 0.5x + 10 = -x + 120 → 1.5x = 110 → x = 110 / 1.5 = 220/3 ≈ 73.33. The exact value is 220/3.',
    tags: ['algebra', 'modeling', 'diagram'],
    createdBy: 'seed',
    reviewStatus: 'pending',
  },
];

export default sampleQuestions;
