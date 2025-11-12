export type Choice = {
  id: string;
  text: string;
};

export type Question = {
  id: string;
  type: 'reading' | 'diagram' | 'math' | string;
  title: string;
  passage?: string;
  diagramSvg?: string;     // optional inline SVG (kept for compatibility)
  imageUrl?: string;       // path to public asset (recommended)
  imageAlt?: string;
  stem: string;
  choices: Choice[];
  answerId: string;
  explanation?: string;
  tags?: string[];
  createdBy?: string;
  reviewStatus?: 'pending' | 'approved' | 'rejected';
};

// NOTE: imageUrl paths assume you place the SVGs in public/assets/diagrams/
// e.g., public/assets/diagrams/sample_triangle.svg -> '/assets/diagrams/sample_triangle.svg'

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
    // keep inline SVG for compatibility but also provide imageUrl served from public
    diagramSvg: `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="420" height="220" viewBox="0 0 420 220" role="img" aria-labelledby="title desc">\n  <title id="title">Triangle ABC</title>\n  <desc id="desc">Isosceles triangle ABC (AB = AC). Angle at A = 20°. D is foot of altitude from A to BC.</desc>\n  <style>\n    .side { stroke: #222; stroke-width: 2; fill: none; }\n    .label { font-family: Arial, sans-serif; font-size: 14px; fill: #111; }\n    .mark { stroke: #c33; stroke-width: 2; fill: none; }\n    .dash { stroke: #222; stroke-dasharray: 4 4; }\n  </style>\n  <polygon class=\"side\" points=\"70,180 210,40 350,180\" />\n  <text class=\"label\" x=\"60\" y=\"195\">B</text>\n  <text class=\"label\" x=\"200\" y=\"30\">A</text>\n  <text class=\"label\" x=\"360\" y=\"195\">C</text>\n  <path d=\"M195,52 A30,30 0 0,1 230,80\" class=\"mark\"/>\n  <text class=\"label\" x=\"215\" y=\"75\">20°</text>\n  <line x1=\"210\" y1=\"40\" x2=\"210\" y2=\"180\" class=\"dash\"/>\n  <text class=\"label\" x=\"220\" y=\"185\">D</text>\n</svg>`,
    imageUrl: '/assets/diagrams/sample_triangle.svg',
    imageAlt: 'Isosceles triangle ABC with altitude AD to BC',
    stem:
      'In isosceles triangle ABC with AB = AC and base BC = 16, the altitude from A to BC is 12. What is the length of AB?',
    choices: [
      { id: 'A', text: '12' },
      { id: 'B', text: '14' },
      { id: 'C', text: '4√13' },
      { id: 'D', text: '20' },
    ],
    answerId: 'C',
    explanation:
      'Half the base is 8. Use Pythagorean theorem: AB = sqrt(8^2 + 12^2) = sqrt(64 + 144) = sqrt(208) = 4√13.',
    tags: ['geometry', 'triangles'],
    createdBy: 'seed',
    reviewStatus: 'pending',
  },

  {
    id: 'q-sample-003',
    type: 'math',
    title: 'Algebra: Linear models (graph)',
    diagramSvg: `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="420" height="200" viewBox="0 0 420 200" role="img" aria-labelledby="title2 desc2">\n  <title id=\"title2\">Two linear models</title>\n  <desc id=\"desc2\">Blue line y = 0.5x + 10 and orange line y = -x + 120</desc>\n  <style>.axis{stroke:#444;stroke-width:1}.blue{stroke:#1f77b4;stroke-width:2}.orange{stroke:#ff7f0e;stroke-width:2}</style>\n  <line x1=\"30\" y1=\"170\" x2=\"390\" y2=\"170\" class=\"axis\"/>\n  <line x1=\"30\" y1=\"20\" x2=\"30\" y2=\"170\" class=\"axis\"/>\n  <!-- approximate plotting lines for illustration -->\n  <line x1=\"30\" y1=\"155\" x2=\"390\" y2=\"205\" class=\"blue\"/>\n  <line x1=\"30\" y1=\"110\" x2=\"390\" y2=\"20\" class=\"orange\"/>\n  <text x=\"40\" y=\"30\" font-family=\"Arial\" font-size=\"12\">y</text>\n  <text x=\"390\" y=\"185\" font-family=\"Arial\" font-size=\"12\">x</text>\n</svg>`,
    imageUrl: '/assets/diagrams/sample_lines.svg',
    imageAlt: 'Graph showing two linear models (y=0.5x+10 and y=-x+120)',
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
      'Solve 0.5x + 10 = -x + 120 → 1.5x = 110 → x = 110 / 1.5 = 220/3 ≈ 73.33.',
    tags: ['algebra', 'modeling'],
    createdBy: 'seed',
    reviewStatus: 'pending',
  },
];

export default sampleQuestions;