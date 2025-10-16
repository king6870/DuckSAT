import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const GEOMETRY_QUESTIONS = [
  {
    moduleType: 'math' as const,
    difficulty: 'medium' as const,
    category: 'geometry',
    subtopic: 'trapezoids',
    question: 'In the isosceles trapezoid ABCD described above, AB ∥ CD with AB = 16 and CD = 10, and ∠DAB = 60°. Diagonals AC and BD are drawn. What is the length of AC?',
    options: ['10', '12', '14', '16', '18'],
    correctAnswer: 2,
    explanation: 'Because the trapezoid is isosceles and CD is centered above AB, the horizontal offset from A up to D is (AB − CD)/2 = (16 − 10)/2 = 3 units.\n\nIn triangle DAB, the angle at A is 60°, and the horizontal projection (adjacent side to ∠A) of AD onto AB is 3. Thus, AD · cos(60°) = 3 → AD · (1/2) = 3 → AD = 6.\n\nThe height of the trapezoid (the vertical distance between the bases) equals the vertical component of AD: h = AD · sin(60°) = 6 · (√3/2) = 3√3.\n\nFrom A to C horizontally: first move 3 units from A to directly below D, then 10 units across the top base from D to C, for a total of 3 + 10 = 13 units.\n\nDiagonal AC is the hypotenuse of a right triangle with horizontal leg 13 and vertical leg 3√3. By the Pythagorean theorem:\nAC² = 13² + (3√3)² = 169 + 27 = 196 → AC = √196 = 14.',
    chartData: {
      "$schema": "https://vega.github.io/schema/vega/v5.json",
      "width": 760,
      "height": 500,
      "padding": 0,
      "data": [
        {"name": "points", "values": [{"id": "A", "x": 60, "y": 420}, {"id": "B", "x": 700, "y": 420}, {"id": "C", "x": 580, "y": 212.1539030917347}, {"id": "D", "x": 180, "y": 212.1539030917347}]},
        {"name": "shape", "values": [{"path": "M60,420 L700,420 L580,212.1539030917347 L180,212.1539030917347 Z"}]},
        {"name": "diagonals", "values": [{"x": 60, "y": 420, "x2": 580, "y2": 212.1539030917347}, {"x": 700, "y": 420, "x2": 180, "y2": 212.1539030917347}]},
        {"name": "labels", "values": [{"text": "16 units", "x": 380, "y": 446, "align": "center"}, {"text": "10 units", "x": 380, "y": 194.1539030917347, "align": "center"}]},
        {"name": "pointLabels", "values": [{"text": "A", "x": 48, "y": 436}, {"text": "B", "x": 712, "y": 436}, {"text": "D", "x": 168, "y": 202.1539030917347}, {"text": "C", "x": 592, "y": 202.1539030917347}]},
        {"name": "perp", "values": [{"x": 180, "y": 212.1539030917347, "x2": 180, "y2": 420}]},
        {"name": "angleLabel", "values": [{"text": "60°", "x": 116.29165124698852, "y": 387.5}]}
      ],
      "marks": [
        {"type": "path", "from": {"data": "shape"}, "encode": {"update": {"path": {"field": "path"}, "fill": {"value": "#f5fbff"}, "stroke": {"value": "#000"}, "strokeWidth": {"value": 2}}}},
        {"type": "rule", "from": {"data": "diagonals"}, "encode": {"update": {"x": {"field": "x"}, "y": {"field": "y"}, "x2": {"field": "x2"}, "y2": {"field": "y2"}, "stroke": {"value": "#666"}, "strokeWidth": {"value": 2}}}},
        {"type": "rule", "from": {"data": "perp"}, "encode": {"update": {"x": {"field": "x"}, "y": {"field": "y"}, "x2": {"field": "x2"}, "y2": {"field": "y2"}, "stroke": {"value": "#999"}, "strokeDash": {"value": [6, 6]}, "strokeWidth": {"value": 1.5}}}},
        {"type": "arc", "encode": {"update": {"x": {"value": 60}, "y": {"value": 420}, "startAngle": {"value": 0}, "endAngle": {"value": -1.0471975511965976}, "innerRadius": {"value": 42}, "outerRadius": {"value": 48}, "fill": {"value": "#99c2ff"}, "fillOpacity": {"value": 0.6}, "stroke": {"value": "#3366ff"}, "strokeWidth": {"value": 1}}}},
        {"type": "symbol", "from": {"data": "points"}, "encode": {"update": {"x": {"field": "x"}, "y": {"field": "y"}, "size": {"value": 49}, "fill": {"value": "#000"}}}},
        {"type": "text", "from": {"data": "pointLabels"}, "encode": {"update": {"text": {"field": "text"}, "x": {"field": "x"}, "y": {"field": "y"}, "fontSize": {"value": 14}, "fontWeight": {"value": "bold"}, "fill": {"value": "#000"}}}},
        {"type": "text", "from": {"data": "labels"}, "encode": {"update": {"text": {"field": "text"}, "x": {"field": "x"}, "y": {"field": "y"}, "align": {"field": "align"}, "baseline": {"value": "middle"}, "fontSize": {"value": 14}, "fill": {"value": "#000"}}}},
        {"type": "text", "from": {"data": "angleLabel"}, "encode": {"update": {"text": {"field": "text"}, "x": {"field": "x"}, "y": {"field": "y"}, "fontSize": {"value": 14}, "fill": {"value": "#000"}}}}
      ]
    },
    timeEstimate: 120
  },
  {
    moduleType: 'math' as const,
    difficulty: 'medium' as const,
    category: 'geometry',
    subtopic: 'circles',
    question: 'In the diagram described, line PT is tangent to the circle at T, point P lies on the tangent line with PT = 12, and a secant from P intersects the circle at A and B with PB = 18 (A is closer to P than B). What is the length of chord AB?',
    options: ['6', '8', '10', '12'],
    correctAnswer: 2,
    explanation: 'By the tangent-secant theorem (power of a point), the square of the tangent segment equals the product of the external and entire secant segments: PT² = PA × PB.\n\nSubstitute the given values: 12² = PA × 18 → 144 = 18 × PA → PA = 144 ÷ 18 = 8.\n\nAlong the secant line, AB is the portion between A and B, so AB = PB − PA = 18 − 8 = 10.',
    chartData: {
      "$schema": "https://vega.github.io/schema/vega/v5.json",
      "width": 500,
      "height": 400,
      "padding": 10,
      "marks": [
        {"type": "arc", "encode": {"enter": {"x": {"value": 200}, "y": {"value": 200}, "startAngle": {"value": 0}, "endAngle": {"value": 6.283185307179586}, "innerRadius": {"value": 0}, "outerRadius": {"value": 100}, "stroke": {"value": "#333"}, "strokeWidth": {"value": 2}, "fill": {"value": null}}}},
        {"type": "line", "name": "radiusOT", "encode": {"enter": {"x": {"value": 200}, "y": {"value": 200}, "x2": {"value": 300}, "y2": {"value": 200}, "stroke": {"value": "#666"}, "strokeWidth": {"value": 2}}}},
        {"type": "line", "name": "tangent", "encode": {"enter": {"x": {"value": 80}, "y": {"value": 200}, "x2": {"value": 440}, "y2": {"value": 200}, "stroke": {"value": "#000"}, "strokeWidth": {"value": 1.5}}}},
        {"type": "line", "name": "secant", "encode": {"enter": {"x": {"value": 360}, "y": {"value": 200}, "x2": {"value": 100}, "y2": {"value": 96}, "stroke": {"value": "#000"}, "strokeWidth": {"value": 1.5}}}},
        {"type": "path", "name": "rightAngleMarker", "encode": {"enter": {"path": {"value": "M300,200 L300,190 L290,190"}, "stroke": {"value": "#000"}, "strokeWidth": {"value": 2}}}},
        {"type": "symbol", "encode": {"enter": {"x": {"value": 200}, "y": {"value": 200}, "size": {"value": 64}, "fill": {"value": "#000"}}}},
        {"type": "text", "encode": {"enter": {"x": {"value": 210}, "y": {"value": 210}, "text": {"value": "O"}, "fontSize": {"value": 14}, "align": {"value": "left"}, "baseline": {"value": "top"}}}},
        {"type": "symbol", "encode": {"enter": {"x": {"value": 300}, "y": {"value": 200}, "size": {"value": 64}, "fill": {"value": "#000"}}}},
        {"type": "text", "encode": {"enter": {"x": {"value": 310}, "y": {"value": 210}, "text": {"value": "T"}, "fontSize": {"value": 14}, "align": {"value": "left"}, "baseline": {"value": "top"}}}},
        {"type": "symbol", "encode": {"enter": {"x": {"value": 360}, "y": {"value": 200}, "size": {"value": 64}, "fill": {"value": "#000"}}}},
        {"type": "text", "encode": {"enter": {"x": {"value": 370}, "y": {"value": 210}, "text": {"value": "P"}, "fontSize": {"value": 14}, "align": {"value": "left"}, "baseline": {"value": "top"}}}},
        {"type": "symbol", "encode": {"enter": {"x": {"value": 296.75}, "y": {"value": 174.7}, "size": {"value": 64}, "fill": {"value": "#000"}}}},
        {"type": "text", "encode": {"enter": {"x": {"value": 306.75}, "y": {"value": 164.7}, "text": {"value": "A"}, "fontSize": {"value": 14}, "align": {"value": "left"}, "baseline": {"value": "bottom"}}}},
        {"type": "symbol", "encode": {"enter": {"x": {"value": 147.45}, "y": {"value": 114.98}, "size": {"value": 64}, "fill": {"value": "#000"}}}},
        {"type": "text", "encode": {"enter": {"x": {"value": 137.45}, "y": {"value": 104.98}, "text": {"value": "B"}, "fontSize": {"value": 14}, "align": {"value": "right"}, "baseline": {"value": "bottom"}}}},
        {"type": "text", "name": "labelPT", "encode": {"enter": {"x": {"value": 330}, "y": {"value": 190}, "text": {"value": "PT = 12"}, "fontSize": {"value": 14}, "align": {"value": "center"}, "baseline": {"value": "bottom"}, "fill": {"value": "#000"}}}},
        {"type": "text", "name": "labelPB", "encode": {"enter": {"x": {"value": 253.73}, "y": {"value": 157.49}, "text": {"value": "PB = 18"}, "fontSize": {"value": 14}, "align": {"value": "center"}, "baseline": {"value": "bottom"}, "fill": {"value": "#000"}}}},
        {"type": "text", "name": "labelRadius", "encode": {"enter": {"x": {"value": 250}, "y": {"value": 190}, "text": {"value": "8"}, "fontSize": {"value": 12}, "align": {"value": "center"}, "baseline": {"value": "bottom"}, "fill": {"value": "#000"}}}}
      ]
    },
    timeEstimate: 120
  },
  {
    moduleType: 'math' as const,
    difficulty: 'medium' as const,
    category: 'geometry',
    subtopic: 'similar-triangles',
    question: 'In triangle ABC, DE is drawn parallel to BC, with D on AB and E on AC. The lengths are AB = 18, AC = 12, BC = 15, and AE = 8. What is the length of DE?',
    options: ['6', '8', '10', '12'],
    correctAnswer: 2,
    explanation: 'Because DE ∥ BC, triangles ADE and ABC are similar (corresponding angles are equal: angle at A is common; angle at E equals angle at C; angle at D equals angle at B).\n\nIn similar triangles, corresponding side ratios are equal:\nAE / AC = DE / BC = AD / AB.\n\nWe are given AE = 8 and AC = 12, so AE / AC = 8 / 12 = 2/3.\n\nTherefore, DE / BC = 2/3. Substituting BC = 15:\nDE = (2/3) × 15 = 10.',
    chartData: {
      "$schema": "https://vega.github.io/schema/vega/v5.json",
      "width": 400,
      "height": 300,
      "padding": 5,
      "autosize": "none",
      "data": [
        {"name": "points", "values": [{"id": "A", "x": 50, "y": 250}, {"id": "B", "x": 350, "y": 250}, {"id": "C", "x": 250, "y": 90}, {"id": "D", "x": 170, "y": 250}, {"id": "E", "x": 130, "y": 186}]},
        {"name": "edges", "values": [{"name": "AB", "x": 50, "y": 250, "x2": 350, "y2": 250}, {"name": "AC", "x": 50, "y": 250, "x2": 250, "y2": 90}, {"name": "BC", "x": 350, "y": 250, "x2": 250, "y2": 90}, {"name": "DE", "x": 170, "y": 250, "x2": 130, "y2": 186}]},
        {"name": "labels", "values": [{"text": "18", "x": 200, "y": 240}, {"text": "12", "x": 160, "y": 160}, {"text": "15", "x": 290, "y": 160}, {"text": "8", "x": 90, "y": 208}]},
        {"name": "pointLabels", "values": [{"text": "A", "x": 50, "y": 250, "dx": -10, "dy": 10}, {"text": "B", "x": 350, "y": 250, "dx": 10, "dy": 10}, {"text": "C", "x": 250, "y": 90, "dx": 10, "dy": -10}, {"text": "D", "x": 170, "y": 250, "dx": 0, "dy": 10}, {"text": "E", "x": 130, "y": 186, "dx": -10, "dy": -10}]},
        {"name": "arrows", "values": [{"seg": "DE", "x": 156, "y": 227.6, "angle": -122}, {"seg": "DE", "x": 144, "y": 208.4, "angle": -122}, {"seg": "BC", "x": 315, "y": 194, "angle": -122}, {"seg": "BC", "x": 285, "y": 146, "angle": -122}]}
      ],
      "marks": [
        {"type": "rule", "from": {"data": "edges"}, "encode": {"enter": {"x": {"field": "x"}, "y": {"field": "y"}, "x2": {"field": "x2"}, "y2": {"field": "y2"}, "stroke": {"value": "black"}, "strokeWidth": {"value": 2}}}},
        {"type": "symbol", "from": {"data": "points"}, "encode": {"enter": {"x": {"field": "x"}, "y": {"field": "y"}, "size": {"value": 60}, "shape": {"value": "circle"}, "fill": {"value": "black"}}}},
        {"type": "text", "from": {"data": "pointLabels"}, "encode": {"enter": {"x": {"field": "x"}, "y": {"field": "y"}, "text": {"field": "text"}, "dx": {"field": "dx"}, "dy": {"field": "dy"}, "fontSize": {"value": 12}, "fill": {"value": "black"}}}},
        {"type": "text", "from": {"data": "labels"}, "encode": {"enter": {"x": {"field": "x"}, "y": {"field": "y"}, "text": {"field": "text"}, "fontSize": {"value": 12}, "fontStyle": {"value": "italic"}, "fill": {"value": "black"}}}},
        {"type": "text", "from": {"data": "arrows"}, "encode": {"enter": {"x": {"field": "x"}, "y": {"field": "y"}, "text": {"value": "∥"}, "fontSize": {"value": 10}, "angle": {"field": "angle"}, "fill": {"value": "black"}}}}
      ]
    },
    timeEstimate: 120
  },
  {
    moduleType: 'math' as const,
    difficulty: 'medium' as const,
    category: 'geometry',
    subtopic: 'right-triangles',
    question: 'In the diagram, triangle ABC is right-angled at C. The altitude from C to hypotenuse AB meets AB at D. If AC = 8 and BC = 6, what is the length of AD?',
    options: ['3.6', '4.8', '6.4', '7.2'],
    correctAnswer: 2,
    explanation: 'First find the hypotenuse AB using the Pythagorean theorem:\nAB = √(AC² + BC²) = √(8² + 6²) = √(64 + 36) = √100 = 10.\n\nIn a right triangle, the altitude from the right angle to the hypotenuse creates two smaller right triangles that are each similar to the original triangle. From this similarity, a standard result holds:\nAD = (AC²) / AB and DB = (BC²) / AB.\n\nApply the formula for AD:\nAD = (AC²) / AB = 64 / 10 = 6.4.',
    chartData: {
      "$schema": "https://vega.github.io/schema/vega/v5.json",
      "width": 400,
      "height": 360,
      "padding": 10,
      "background": "white",
      "data": [
        {"name": "segments", "values": [{"id": "AC", "x": 60, "y": 300, "x2": 300, "y2": 300}, {"id": "BC", "x": 60, "y": 300, "x2": 60, "y2": 120}, {"id": "AB", "x": 300, "y": 300, "x2": 60, "y2": 120}]},
        {"name": "altitude", "values": [{"id": "CD", "x": 60, "y": 300, "x2": 146.4, "y2": 184.8}]},
        {"name": "pointLabels", "values": [{"label": "A", "x": 300, "y": 300, "dx": 10, "dy": -8}, {"label": "B", "x": 60, "y": 120, "dx": -12, "dy": -8}, {"label": "C", "x": 60, "y": 300, "dx": -12, "dy": 12}, {"label": "D", "x": 146.4, "y": 184.8, "dx": -12, "dy": 12}]},
        {"name": "lengthLabels", "values": [{"text": "AC = 8", "x": 180, "y": 300, "dx": 0, "dy": -12}, {"text": "BC = 6", "x": 60, "y": 210, "dx": -50, "dy": 0}]},
        {"name": "cSquare", "values": [{"id": "c"}]},
        {"name": "dSquare", "values": [{"id": "d"}]}
      ],
      "marks": [
        {"type": "rule", "from": {"data": "segments"}, "encode": {"enter": {"x": {"field": "x"}, "y": {"field": "y"}, "x2": {"field": "x2"}, "y2": {"field": "y2"}, "stroke": {"value": "#000"}, "strokeWidth": {"value": 2}}}},
        {"type": "rule", "from": {"data": "altitude"}, "encode": {"enter": {"x": {"field": "x"}, "y": {"field": "y"}, "x2": {"field": "x2"}, "y2": {"field": "y2"}, "stroke": {"value": "#000"}, "strokeWidth": {"value": 1.5}}}},
        {"type": "path", "from": {"data": "cSquare"}, "encode": {"enter": {"path": {"value": "M60,300 L76,300 L76,284 L60,284 Z"}, "fill": {"value": "white"}, "stroke": {"value": "#000"}, "strokeWidth": {"value": 1.5}}}}},
        {"type": "path", "from": {"data": "dSquare"}, "encode": {"enter": {"path": {"value": "M146.4,184.8 L133.6,175.2 L124,188 L136.8,197.6 Z"}, "fill": {"value": "white"}, "stroke": {"value": "#000"}, "strokeWidth": {"value": 1.5}}}}},
        {"type": "text", "from": {"data": "pointLabels"}, "encode": {"enter": {"x": {"field": "x"}, "y": {"field": "y"}, "dx": {"field": "dx"}, "dy": {"field": "dy"}, "text": {"field": "label"}, "fontSize": {"value": 14}, "fill": {"value": "black"}}}},
        {"type": "text", "from": {"data": "lengthLabels"}, "encode": {"enter": {"x": {"field": "x"}, "y": {"field": "y"}, "dx": {"field": "dx"}, "dy": {"field": "dy"}, "text": {"field": "text"}, "fontSize": {"value": 13}, "fill": {"value": "black"}, "fontStyle": {"value": "italic"}}}}
      ]
    },
    timeEstimate: 120
  },
  {
    moduleType: 'math' as const,
    difficulty: 'medium' as const,
    category: 'geometry',
    subtopic: 'circles',
    question: 'In triangle ABC, AB = 10, AC = 10, and BC = 12. D is the midpoint of BC, and AD is perpendicular to BC. A circle centered at A with radius AD intersects AB at E and AC at F. What is the length of EF?',
    options: ['8', '9.6', '10', '12'],
    correctAnswer: 1,
    explanation: 'Because AB = AC and D is the midpoint of BC, AD is both a median and an altitude to the base in an isosceles triangle, so AD ⊥ BC.\n\nCompute AD using right triangle ABD. Since BD = 6 (half of BC), AB = 10, then:\nAD = √(AB² − BD²) = √(10² − 6²) = √(100 − 36) = √64 = 8.\n\nThe circle centered at A has radius AD = 8, so AE = AF = 8. Points E and F lie along rays AB and AC respectively, and the central angle ∠EAF equals ∠BAC.\n\nFind ∠BAC using triangle ABC via the Law of Cosines:\nBC² = AB² + AC² − 2(AB)(AC)cos(∠A)\n12² = 10² + 10² − 2(10)(10)cos(∠A)\n144 = 200 − 200cos(∠A) ⇒ cos(∠A) = 0.28.\n\nUse the chord-length formula for a circle: For a chord subtending a central angle θ, chord length = 2R sin(θ/2). Here R = 8 and θ = ∠A.\nFirst compute sin(∠A/2) using the half-angle identity:\nsin²(∠A/2) = (1 − cos(∠A))/2 = (1 − 0.28)/2 = 0.72/2 = 0.36 ⇒ sin(∠A/2) = 0.6.\nTherefore, EF = 2(8)(0.6) = 16(0.6) = 9.6.',
    chartData: {
      "$schema": "https://vega.github.io/schema/vega/v5.json",
      "width": 420,
      "height": 360,
      "padding": 10,
      "background": "white",
      "data": [
        {"name": "points", "values": [{"id": "A", "x": 180, "y": 60}, {"id": "B", "x": 0, "y": 300}, {"id": "C", "x": 360, "y": 300}, {"id": "D", "x": 180, "y": 300}, {"id": "E", "x": 36, "y": 252}, {"id": "F", "x": 324, "y": 252}]},
        {"name": "segments", "values": [{"name": "AB", "x": 180, "y": 60, "x2": 0, "y2": 300}, {"name": "AC", "x": 180, "y": 60, "x2": 360, "y2": 300}, {"name": "BC", "x": 0, "y": 300, "x2": 360, "y2": 300}, {"name": "AD", "x": 180, "y": 60, "x2": 180, "y2": 300}, {"name": "EF", "x": 36, "y": 252, "x2": 324, "y2": 252}]},
        {"name": "circle", "values": [{"cx": 180, "cy": 60, "r": 240, "path": "M -60,60 a 240,240 0 1,0 480,0 a 240,240 0 1,0 -480,0"}]},
        {"name": "lengthLabels", "values": [{"text": "10", "x": 90, "y": 180}, {"text": "10", "x": 270, "y": 180}, {"text": "12", "x": 180, "y": 315}]},
        {"name": "miscLabels", "values": [{"text": "AD ⊥ BC", "x": 200, "y": 290}, {"text": "AE = AF = AD", "x": 180, "y": 30}]}
      ],
      "marks": [
        {"type": "path", "from": {"data": "circle"}, "encode": {"enter": {"path": {"field": "path"}, "stroke": {"value": "#1f77b4"}, "strokeWidth": {"value": 1.5}, "fillOpacity": {"value": 0}}}},
        {"type": "rule", "from": {"data": "segments"}, "encode": {"enter": {"x": {"field": "x"}, "y": {"field": "y"}, "x2": {"field": "x2"}, "y2": {"field": "y2"}, "stroke": {"signal": "datum.name==='EF' ? '#d62728' : 'black'"}, "strokeWidth": {"value": 2}}}},
        {"type": "path", "encode": {"enter": {"path": {"value": "M 180,288 L 192,288 L 192,300 L 180,300 Z"}, "stroke": {"value": "black"}, "strokeWidth": {"value": 1}, "fillOpacity": {"value": 0}}}},
        {"type": "symbol", "from": {"data": "points"}, "encode": {"enter": {"x": {"field": "x"}, "y": {"field": "y"}, "size": {"value": 50}, "fill": {"value": "black"}}}},
        {"type": "text", "from": {"data": "points"}, "encode": {"enter": {"x": {"field": "x"}, "y": {"field": "y"}, "text": {"field": "id"}, "fontSize": {"value": 14}, "fontWeight": {"value": "bold"}, "dx": {"signal": "datum.id==='B' ? -10 : datum.id==='C' ? 10 : datum.id==='E' ? -8 : datum.id==='F' ? 8 : 0"}, "dy": {"signal": "datum.id==='A' ? -10 : datum.id==='D' ? -10 : datum.id==='B' ? 10 : datum.id==='C' ? 10 : -8"}, "align": {"signal": "(datum.id==='B' || datum.id==='E') ? 'right' : (datum.id==='C' || datum.id==='F') ? 'left' : 'center'"}, "baseline": {"value": "middle"}}}},
        {"type": "text", "from": {"data": "lengthLabels"}, "encode": {"enter": {"x": {"field": "x"}, "y": {"field": "y"}, "text": {"field": "text"}, "fontSize": {"value": 12}, "fill": {"value": "#333"}, "baseline": {"value": "middle"}}}},
        {"type": "text", "from": {"data": "miscLabels"}, "encode": {"enter": {"x": {"field": "x"}, "y": {"field": "y"}, "text": {"field": "text"}, "fontSize": {"value": 12}, "fill": {"value": "#333"}}}}
      ]
    },
    timeEstimate: 120
  },
  {
    moduleType: 'math' as const,
    difficulty: 'medium' as const,
    category: 'geometry',
    subtopic: 'circles',
    question: 'In the diagram described, ∠BOC = 116°. What is the value of x?',
    options: ['42', '47', '58', '64'],
    correctAnswer: 2,
    explanation: 'The angle formed by a tangent and a secant from a point outside a circle equals half the difference of the measures of the intercepted arcs. In the special case where one line is a tangent at A and the other is a secant intersecting the circle at B (near) and C (far), this simplifies to the angle at P equaling half the measure of arc BC (the arc between the two intersection points of the secant).\n\nThe central angle ∠BOC measures the same arc BC. Therefore:\nx = (measure of arc BC) / 2 = ∠BOC / 2 = 116° / 2 = 58°.',
    chartData: {
      "$schema": "https://vega.github.io/schema/vega/v5.json",
      "width": 500,
      "height": 300,
      "padding": 5,
      "background": "white",
      "data": [
        {"name": "secant", "values": [{"x": 288.468, "y": 230}, {"x": 100, "y": 82.807}]},
        {"name": "radii1", "values": [{"x": 250, "y": 140, "x2": 280.782, "y2": 224.572}]},
        {"name": "radii2", "values": [{"x": 250, "y": 140, "x2": 160.493, "y2": 130.592}]},
        {"name": "points", "values": [{"name": "O", "x": 250, "y": 140}, {"name": "A", "x": 250, "y": 230}, {"name": "P", "x": 288.468, "y": 230}, {"name": "B", "x": 280.782, "y": 224.572}, {"name": "C", "x": 160.493, "y": 130.592}]},
        {"name": "labels", "values": [{"text": "O", "x": 255, "y": 138}, {"text": "A", "x": 255, "y": 238}, {"text": "P", "x": 295, "y": 222}, {"text": "B", "x": 287, "y": 234}, {"text": "C", "x": 152, "y": 125}, {"text": "116°", "x": 221.679, "y": 176.849}, {"text": "x°", "x": 268.468, "y": 220}, {"text": "∠", "x": 470, "y": 222}]}
      ],
      "marks": [
        {"type": "path", "encode": {"update": {"path": {"value": "M 250 140 m -90 0 a 90 90 0 1 0 180 0 a 90 90 0 1 0 -180 0"}, "stroke": {"value": "black"}, "strokeWidth": {"value": 2}, "fillOpacity": {"value": 0}}}},
        {"type": "rule", "encode": {"update": {"x": {"value": 20}, "x2": {"value": 480}, "y": {"value": 230}, "y2": {"value": 230}, "stroke": {"value": "black"}, "strokeWidth": {"value": 2}}}},
        {"type": "line", "from": {"data": "secant"}, "encode": {"update": {"x": {"field": "x"}, "y": {"field": "y"}, "stroke": {"value": "black"}, "strokeWidth": {"value": 2}}}},
        {"type": "rule", "from": {"data": "radii1"}, "encode": {"update": {"x": {"field": "x"}, "y": {"field": "y"}, "x2": {"field": "x2"}, "y2": {"field": "y2"}, "stroke": {"value": "black"}, "strokeWidth": {"value": 2}}}},
        {"type": "rule", "from": {"data": "radii2"}, "encode": {"update": {"x": {"field": "x"}, "y": {"field": "y"}, "x2": {"field": "x2"}, "y2": {"field": "y2"}, "stroke": {"value": "black"}, "strokeWidth": {"value": 2}}}},
        {"type": "symbol", "from": {"data": "points"}, "encode": {"update": {"x": {"field": "x"}, "y": {"field": "y"}, "size": {"value": 50}, "fill": {"value": "black"}}}},
        {"type": "text", "from": {"data": "labels"}, "encode": {"update": {"x": {"field": "x"}, "y": {"field": "y"}, "text": {"field": "text"}, "fontSize": {"value": 12}, "fill": {"value": "black"}}}}
      ]
    },
    timeEstimate: 120
  },
  {
    moduleType: 'math' as const,
    difficulty: 'medium' as const,
    category: 'geometry',
    subtopic: 'right-triangles',
    question: 'In the diagram, triangle ABC is right-angled at A with AB = 6 and AC = 8. Segment AD is the altitude from A to hypotenuse BC. What is the length of AD?',
    options: ['3', '4', '4.8', '6'],
    correctAnswer: 2,
    explanation: 'First, compute the hypotenuse BC using the Pythagorean theorem:\nBC = √(AB² + AC²) = √(6² + 8²) = √(36 + 64) = √100 = 10.\n\nCompute the area using legs AB and AC:\nArea = (1/2) × AB × AC = (1/2) × 6 × 8 = 24.\n\nThe same area equals (1/2) × BC × AD when using the hypotenuse and its altitude:\n24 = (1/2) × 10 × AD ⇒ 24 = 5 × AD ⇒ AD = 24 / 5 = 4.8.\n\nTherefore, the length of AD is 4.8.',
    chartData: {
      "$schema": "https://vega.github.io/schema/vega/v5.json",
      "width": 420,
      "height": 420,
      "background": "white",
      "padding": 10,
      "data": [
        {"name": "points", "values": [{"name": "A", "x": 60, "y": 360}, {"name": "B", "x": 360, "y": 360}, {"name": "C", "x": 60, "y": 100}, {"name": "D", "x": 188.681, "y": 211.517}]},
        {"name": "labels", "values": [{"text": "A", "x": 50, "y": 370}, {"text": "B", "x": 370, "y": 370}, {"text": "C", "x": 50, "y": 90}, {"text": "D", "x": 196.681, "y": 203.517}]},
        {"name": "lengthLabels", "values": [{"text": "6", "x": 210, "y": 348}, {"text": "8", "x": 48, "y": 230}]}
      ],
      "marks": [
        {"type": "path", "encode": {"enter": {"stroke": {"value": "#000"}, "strokeWidth": {"value": 2}, "path": {"value": "M 60 360 L 360 360"}}}},
        {"type": "path", "encode": {"enter": {"stroke": {"value": "#000"}, "strokeWidth": {"value": 2}, "path": {"value": "M 60 360 L 60 100"}}}},
        {"type": "path", "encode": {"enter": {"stroke": {"value": "#000"}, "strokeWidth": {"value": 2}, "path": {"value": "M 360 360 L 60 100"}}}},
        {"type": "path", "encode": {"enter": {"stroke": {"value": "#1f77b4"}, "strokeWidth": {"value": 2}, "strokeDash": {"value": [6, 4]}, "path": {"value": "M 60 360 L 188.681 211.517"}}}},
        {"type": "path", "encode": {"enter": {"stroke": {"value": "#000"}, "strokeWidth": {"value": 2}, "path": {"value": "M 76 360 L 76 344 L 60 344"}}}},
        {"type": "path", "encode": {"enter": {"stroke": {"value": "#000"}, "strokeWidth": {"value": 2}, "path": {"value": "M 178.102 202.348 L 187.271 191.769 L 197.850 200.938"}}}},
        {"type": "symbol", "from": {"data": "points"}, "encode": {"enter": {"fill": {"value": "#000"}, "size": {"value": 50}}, "update": {"x": {"field": "x"}, "y": {"field": "y"}}}},
        {"type": "text", "from": {"data": "labels"}, "encode": {"enter": {"fontSize": {"value": 14}, "fontWeight": {"value": "bold"}, "fill": {"value": "#000"}}, "update": {"x": {"field": "x"}, "y": {"field": "y"}, "text": {"field": "text"}, "dx": {"value": 0}, "dy": {"value": -10}, "align": {"value": "center"}, "baseline": {"value": "bottom"}}}},
        {"type": "text", "from": {"data": "lengthLabels"}, "encode": {"enter": {"fontSize": {"value": 14}, "fill": {"value": "#000"}}, "update": {"x": {"field": "x"}, "y": {"field": "y"}, "text": {"field": "text"}, "align": {"value": "center"}}}}
      ]
    },
    timeEstimate: 120
  },
  {
    moduleType: 'math' as const,
    difficulty: 'medium' as const,
    category: 'geometry',
    subtopic: 'similar-triangles',
    question: 'In triangle ABC, the area is 108. Points D and E lie on AB and AC, respectively, and DE is parallel to BC. If AD = 8 and DB = 4, what is the area of the shaded trapezoid DECB?',
    options: ['48', '60', '72', '80'],
    correctAnswer: 1,
    explanation: 'Because DE is parallel to BC, triangles ADE and ABC are similar. The similarity ratio is determined by corresponding sides along AB:\nAD/AB = 8/(8 + 4) = 8/12 = 2/3.\n\nIn similar triangles, areas scale by the square of the linear scale factor. Therefore, the area of triangle ADE is:\nArea(ADE) = (2/3)² × Area(ABC) = (4/9) × 108 = 48.\n\nThe shaded trapezoid DECB is the part of triangle ABC below DE, so its area is:\nArea(DECB) = Area(ABC) − Area(ADE) = 108 − 48 = 60.',
    chartData: {
      "$schema": "https://vega.github.io/schema/vega/v5.json",
      "width": 500,
      "height": 350,
      "padding": 20,
      "background": "white",
      "data": [
        {"name": "vertices", "values": [{"name": "A", "x": 250, "y": 80}, {"name": "B", "x": 100, "y": 300}, {"name": "C", "x": 400, "y": 300}, {"name": "D", "x": 150, "y": 226.667}, {"name": "E", "x": 350, "y": 226.667}]},
        {"name": "edgeAB", "values": [{"x": 250, "y": 80}, {"x": 100, "y": 300}]},
        {"name": "edgeAC", "values": [{"x": 250, "y": 80}, {"x": 400, "y": 300}]},
        {"name": "edgeBC", "values": [{"x": 100, "y": 300}, {"x": 400, "y": 300}]},
        {"name": "edgeDE", "values": [{"x": 150, "y": 226.667}, {"x": 350, "y": 226.667}]},
        {"name": "ticksA", "values": [{"x": 245.038, "y": 76.617}, {"x": 254.962, "y": 83.383}]},
        {"name": "ticksD", "values": [{"x": 145.038, "y": 223.284}, {"x": 154.962, "y": 230.05}]},
        {"name": "ticksB", "values": [{"x": 95.038, "y": 296.617}, {"x": 104.962, "y": 303.383}]},
        {"name": "segLabels", "values": [{"text": "8", "x": 200, "y": 153.333}, {"text": "4", "x": 125, "y": 263.333}]}
      ],
      "marks": [
        {"type": "path", "name": "trapezoidFill", "encode": {"enter": {"fill": {"value": "#cce5ff"}, "fillOpacity": {"value": 0.35}, "stroke": {"value": null}}, "update": {"path": {"value": "M150,226.667 L350,226.667 L400,300 L100,300 Z"}}}},
        {"type": "line", "name": "edgeABLine", "from": {"data": "edgeAB"}, "encode": {"enter": {"stroke": {"value": "black"}, "strokeWidth": {"value": 2}}, "update": {"x": {"field": "x"}, "y": {"field": "y"}}}},
        {"type": "line", "name": "edgeACLine", "from": {"data": "edgeAC"}, "encode": {"enter": {"stroke": {"value": "black"}, "strokeWidth": {"value": 2}}, "update": {"x": {"field": "x"}, "y": {"field": "y"}}}},
        {"type": "line", "name": "edgeBCLine", "from": {"data": "edgeBC"}, "encode": {"enter": {"stroke": {"value": "black"}, "strokeWidth": {"value": 2}}, "update": {"x": {"field": "x"}, "y": {"field": "y"}}}},
        {"type": "line", "name": "edgeDELine", "from": {"data": "edgeDE"}, "encode": {"enter": {"stroke": {"value": "black"}, "strokeWidth": {"value": 2}}, "update": {"x": {"field": "x"}, "y": {"field": "y"}}}},
        {"type": "path", "name": "arrowDE", "encode": {"enter": {"fill": {"value": "black"}}, "update": {"path": {"value": "M260,221.667 L260,231.667 L270,226.667 Z"}}}},
        {"type": "path", "name": "arrowBC", "encode": {"enter": {"fill": {"value": "black"}}, "update": {"path": {"value": "M260,295 L260,305 L270,300 Z"}}}},
        {"type": "line", "name": "tickA", "from": {"data": "ticksA"}, "encode": {"enter": {"stroke": {"value": "black"}, "strokeWidth": {"value": 1.5}}, "update": {"x": {"field": "x"}, "y": {"field": "y"}}}},
        {"type": "line", "name": "tickD", "from": {"data": "ticksD"}, "encode": {"enter": {"stroke": {"value": "black"}, "strokeWidth": {"value": 1.5}}, "update": {"x": {"field": "x"}, "y": {"field": "y"}}}},
        {"type": "line", "name": "tickB", "from": {"data": "ticksB"}, "encode": {"enter": {"stroke": {"value": "black"}, "strokeWidth": {"value": 1.5}}, "update": {"x": {"field": "x"}, "y": {"field": "y"}}}},
        {"type": "symbol", "name": "points", "from": {"data": "vertices"}, "encode": {"enter": {"fill": {"value": "black"}, "size": {"value": 30}}, "update": {"x": {"field": "x"}, "y": {"field": "y"}}}},
        {"type": "text", "name": "vertexLabels", "from": {"data": "vertices"}, "encode": {"enter": {"fontSize": {"value": 14}, "fontWeight": {"value": "bold"}, "fill": {"value": "black"}}, "update": {"x": {"field": "x"}, "y": {"field": "y"}, "text": {"field": "name"}, "dx": {"expr": "datum.name==='B' ? -10 : datum.name==='C' ? 10 : datum.name==='D' ? -10 : datum.name==='E' ? 10 : 0"}, "dy": {"expr": "datum.name==='A' ? -10 : datum.name==='B' ? 15 : datum.name==='C' ? 15 : datum.name==='D' ? -10 : datum.name==='E' ? -10 : 0"}}}},
        {"type": "text", "name": "areaLabel", "encode": {"enter": {"fontSize": {"value": 14}, "fill": {"value": "black"}}, "update": {"x": {"value": 250}, "y": {"value": 180}, "text": {"value": "Area = 108"}}}},
        {"type": "text", "name": "notToScale", "encode": {"enter": {"fontSize": {"value": 12}, "fill": {"value": "gray"}}, "update": {"x": {"value": 250}, "y": {"value": 335}, "align": {"value": "center"}, "text": {"value": "Note: Diagram is not drawn to scale."}}}}},
        {"type": "text", "name": "segmentLabels", "from": {"data": "segLabels"}, "encode": {"enter": {"fontSize": {"value": 12}, "fill": {"value": "black"}, "align": {"value": "center"}, "baseline": {"value": "middle"}}, "update": {"x": {"field": "x"}, "y": {"field": "y"}, "text": {"field": "text"}}}}
      ]
    },
    timeEstimate: 120
  },
  {
    moduleType: 'math' as const,
    difficulty: 'medium' as const,
    category: 'geometry',
    subtopic: 'similar-triangles',
    question: 'In triangle ABC, AB = 12. Point D lies on AC such that AD:DC = 2:3. A line through D parallel to AB intersects BC at E. What is the length of DE?',
    options: ['5', '36/5', '8', '6√2'],
    correctAnswer: 1,
    explanation: 'Because DE is drawn parallel to AB, triangles CDE and CBA are similar (they share angle C, and corresponding angles at D ↔ A, and at E ↔ B due to parallel lines).\n\nIn these similar triangles, the vertex correspondence is C ↔ C, D ↔ A, and E ↔ B. Therefore, the ratio of similarity from triangle CBA to triangle CDE equals CD/CA.\n\nGiven AD:DC = 2:3, the whole AC is AD + DC = 2 + 3 = 5 parts, so CD/CA = 3/5.\n\nCorresponding sides satisfy DE/BA = CD/CA. Thus DE = BA × (CD/CA) = 12 × (3/5) = 36/5.\n\nTherefore, DE = 36/5.',
    chartData: {
      "$schema": "https://vega.github.io/schema/vega/v5.json",
      "width": 500,
      "height": 400,
      "padding": 5,
      "signals": [
        {"name": "A", "update": "data('points')[0]"},
        {"name": "B", "update": "data('points')[1]"},
        {"name": "C", "update": "data('points')[2]"},
        {"name": "dRatio", "value": 0.4},
        {"name": "Dx", "update": "A.x + dRatio*(C.x - A.x)"},
        {"name": "Dy", "update": "A.y + dRatio*(C.y - A.y)"},
        {"name": "tE", "update": "(Dy - B.y) / (C.y - B.y)"},
        {"name": "Ex", "update": "B.x + tE*(C.x - B.x)"},
        {"name": "Ey", "update": "Dy"},
        {"name": "midABx", "update": "(A.x + B.x)/2"},
        {"name": "midABy", "update": "A.y"},
        {"name": "midDEx", "update": "(Dx + Ex)/2"},
        {"name": "midDEy", "update": "Dy"}
      ],
      "data": [
        {"name": "points", "values": [{"id": "A", "x": 100, "y": 300}, {"id": "B", "x": 400, "y": 300}, {"id": "C", "x": 320, "y": 120}]}
      ],
      "marks": [
        {"type": "rule", "name": "AB", "encode": {"update": {"x": {"signal": "A.x"}, "y": {"signal": "A.y"}, "x2": {"signal": "B.x"}, "y2": {"signal": "B.y"}, "stroke": {"value": "#000"}, "strokeWidth": {"value": 2}}}},
        {"type": "rule", "name": "AC", "encode": {"update": {"x": {"signal": "A.x"}, "y": {"signal": "A.y"}, "x2": {"signal": "C.x"}, "y2": {"signal": "C.y"}, "stroke": {"value": "#000"}, "strokeWidth": {"value": 2}}}},
        {"type": "rule", "name": "BC", "encode": {"update": {"x": {"signal": "B.x"}, "y": {"signal": "B.y"}, "x2": {"signal": "C.x"}, "y2": {"signal": "C.y"}, "stroke": {"value": "#000"}, "strokeWidth": {"value": 2}}}},
        {"type": "rule", "name": "DE", "encode": {"update": {"x": {"signal": "Dx"}, "y": {"signal": "Dy"}, "x2": {"signal": "Ex"}, "y2": {"signal": "Ey"}, "stroke": {"value": "#000"}, "strokeDash": {"value": [4, 4]}, "strokeWidth": {"value": 2}}}},
        {"type": "symbol", "from": {"data": "points"}, "encode": {"update": {"x": {"field": "x"}, "y": {"field": "y"}, "size": {"value": 50}, "fill": {"value": "#000"}}}},
        {"type": "symbol", "name": "D_point", "encode": {"update": {"x": {"signal": "Dx"}, "y": {"signal": "Dy"}, "size": {"value": 50}, "fill": {"value": "#000"}}}},
        {"type": "symbol", "name": "E_point", "encode": {"update": {"x": {"signal": "Ex"}, "y": {"signal": "Ey"}, "size": {"value": 50}, "fill": {"value": "#000"}}}},
        {"type": "text", "from": {"data": "points"}, "encode": {"update": {"x": {"field": "x"}, "y": {"field": "y"}, "text": {"field": "id"}, "fontSize": {"value": 12}, "fill": {"value": "#000"}, "dx": {"signal": "datum.id==='A'?-12:datum.id==='B'?8:8"}, "dy": {"signal": "datum.id==='A'?14:datum.id==='B'?14:-8"}}}},
        {"type": "text", "name": "D_label", "encode": {"update": {"x": {"signal": "Dx"}, "y": {"signal": "Dy"}, "text": {"value": "D"}, "fontSize": {"value": 12}, "fill": {"value": "#000"}, "dx": {"value": -12}, "dy": {"value": -12}}}},
        {"type": "text", "name": "E_label", "encode": {"update": {"x": {"signal": "Ex"}, "y": {"signal": "Ey"}, "text": {"value": "E"}, "fontSize": {"value": 12}, "fill": {"value": "#000"}, "dx": {"value": 8}, "dy": {"value": -8}}}},
        {"type": "text", "name": "AB_length", "encode": {"update": {"x": {"signal": "midABx"}, "y": {"signal": "midABy"}, "text": {"value": "12"}, "fontSize": {"value": 12}, "fill": {"value": "#000"}, "dy": {"value": -8}}}},
        {"type": "text", "name": "ratio_label", "encode": {"update": {"x": {"signal": "Dx"}, "y": {"signal": "Dy"}, "text": {"value": "AD:DC = 2:3"}, "fontSize": {"value": 12}, "fill": {"value": "#000"}, "dx": {"value": 12}, "dy": {"value": -10}}}},
        {"type": "text", "name": "parallel_label", "encode": {"update": {"x": {"signal": "midDEx"}, "y": {"signal": "midDEy"}, "text": {"value": "DE ∥ AB"}, "fontSize": {"value": 12}, "fill": {"value": "#000"}, "dy": {"value": -10}}}},
        {"type": "text", "name": "not_to_scale", "encode": {"update": {"x": {"value": 20}, "y": {"value": 20}, "text": {"value": "Not to scale"}, "fontSize": {"value": 11}, "fill": {"value": "#555"}}}}
      ]
    },
    timeEstimate: 120
  },
  {
    moduleType: 'math' as const,
    difficulty: 'medium' as const,
    category: 'geometry',
    subtopic: 'right-triangles',
    question: 'In triangle ABC, AB = 20, AC = 16, and BC = 12. Point D is the midpoint of AB. The line through D parallel to AC intersects BC at E, and the line through D parallel to BC intersects AC at F. What is the area of triangle DEF?',
    options: ['12', '16', '20', '24', '32'],
    correctAnswer: 3,
    explanation: 'Because 12² + 16² = 20², triangle ABC is a right triangle with the right angle at C, so AC ⊥ BC.\n\nSince DE ∥ AC, triangles BDE and BAC are similar (corresponding angles at B, D ↔ A, and E ↔ C). The scale factor from BAC to BDE is BD/BA = 10/20 = 1/2. Therefore, DE corresponds to AC and DE = (1/2)·AC = (1/2)·16 = 8.\n\nSince DF ∥ BC, triangles ADF and ABC are similar with scale factor AD/AB = 10/20 = 1/2. Therefore, DF corresponds to BC and DF = (1/2)·BC = (1/2)·12 = 6.\n\nBecause DE ∥ AC and DF ∥ BC and AC ⊥ BC, it follows that DE ⊥ DF. Thus, triangle DEF is a right triangle with legs DE and DF.\n\nThe area of a right triangle is (1/2)·(leg 1)·(leg 2) = (1/2)·8·6 = 24.',
    chartData: {
      "$schema": "https://vega.github.io/schema/vega/v5.json",
      "width": 500,
      "height": 350,
      "padding": 5,
      "scales": [
        {"name": "x", "type": "linear", "domain": [-1, 21], "range": [0, 500]},
        {"name": "y", "type": "linear", "domain": [-1, 12], "range": [350, 0]}
      ],
      "data": [
        {"name": "points", "values": [{"id": "A", "x": 0, "y": 0}, {"id": "B", "x": 20, "y": 0}, {"id": "C", "x": 12.8, "y": 9.6}, {"id": "D", "x": 10, "y": 0}, {"id": "E", "x": 16.4, "y": 4.8}, {"id": "F", "x": 6.4, "y": 4.8}]},
        {"name": "segments", "values": [{"x": 0, "y": 0, "x2": 20, "y2": 0}, {"x": 0, "y": 0, "x2": 12.8, "y2": 9.6}, {"x": 20, "y": 0, "x2": 12.8, "y2": 9.6}]},
        {"name": "parallels", "values": [{"x": 10, "y": 0, "x2": 16.4, "y2": 4.8}, {"x": 10, "y": 0, "x2": 6.4, "y2": 4.8}]},
        {"name": "rightAngle", "values": [{"x": 11.84, "y": 8.88, "x2": 12.56, "y2": 7.92}, {"x": 12.56, "y": 7.92, "x2": 13.52, "y2": 8.64}, {"x": 11.84, "y": 8.88, "x2": 13.52, "y2": 8.64}]},
        {"name": "defPoly", "values": [{"x1": 10, "y1": 0, "x2": 6.4, "y2": 4.8, "x3": 16.4, "y3": 4.8}]},
        {"name": "lengthLabels", "values": [{"text": "AB = 20", "x": 10, "y": 0, "dx": 0, "dy": 16}, {"text": "AC = 16", "x": 6.4, "y": 4.8, "dx": 0, "dy": -12}, {"text": "BC = 12", "x": 16.4, "y": 4.8, "dx": 0, "dy": -12}, {"text": "10", "x": 5, "y": 0, "dx": 0, "dy": -12}, {"text": "10", "x": 15, "y": 0, "dx": 0, "dy": -12}]},
        {"name": "parallelLabels", "values": [{"text": "DE ∥ AC", "x": 13.2, "y": 2.4, "dx": 0, "dy": -8}, {"text": "DF ∥ BC", "x": 8.2, "y": 2.4, "dx": 0, "dy": -8}]}
      ],
      "marks": [
        {"type": "rule", "from": {"data": "segments"}, "encode": {"enter": {"x": {"scale": "x", "field": "x"}, "y": {"scale": "y", "field": "y"}, "x2": {"scale": "x", "field": "x2"}, "y2": {"scale": "y", "field": "y2"}, "stroke": {"value": "#000"}, "strokeWidth": {"value": 2}}}},
        {"type": "path", "from": {"data": "defPoly"}, "encode": {"enter": {"path": {"signal": "'M ' + scale('x', datum.x1) + ',' + scale('y', datum.y1) + ' L ' + scale('x', datum.x2) + ',' + scale('y', datum.y2) + ' L ' + scale('x', datum.x3) + ',' + scale('y', datum.y3) + ' Z'"}, "fill": {"value": "lightsteelblue"}, "opacity": {"value": 0.35}}}},
        {"type": "rule", "from": {"data": "parallels"}, "encode": {"enter": {"x": {"scale": "x", "field": "x"}, "y": {"scale": "y", "field": "y"}, "x2": {"scale": "x", "field": "x2"}, "y2": {"scale": "y", "field": "y2"}, "stroke": {"value": "#555"}, "strokeWidth": {"value": 2}, "strokeDash": {"value": [6, 4]}}}},
        {"type": "rule", "from": {"data": "rightAngle"}, "encode": {"enter": {"x": {"scale": "x", "field": "x"}, "y": {"scale": "y", "field": "y"}, "x2": {"scale": "x", "field": "x2"}, "y2": {"scale": "y", "field": "y2"}, "stroke": {"value": "#000"}, "strokeWidth": {"value": 1.5}}}},
        {"type": "symbol", "from": {"data": "points"}, "encode": {"enter": {"x": {"scale": "x", "field": "x"}, "y": {"scale": "y", "field": "y"}, "size": {"value": 80}, "fill": {"value": "white"}, "stroke": {"value": "black"}, "strokeWidth": {"value": 1.5}}}},
        {"type": "text", "from": {"data": "points"}, "encode": {"enter": {"x": {"scale": "x", "field": "x"}, "y": {"scale": "y", "field": "y"}, "text": {"field": "id"}, "dx": {"value": 0}, "dy": {"value": -10}, "fontSize": {"value": 14}, "fontWeight": {"value": "bold"}, "fill": {"value": "black"}, "align": {"value": "center"}, "baseline": {"value": "bottom"}}}},
        {"type": "text", "from": {"data": "lengthLabels"}, "encode": {"enter": {"x": {"scale": "x", "field": "x"}, "y": {"scale": "y", "field": "y"}, "text": {"field": "text"}, "dx": {"field": "dx"}, "dy": {"field": "dy"}, "fontSize": {"value": 12}, "fill": {"value": "black"}, "align": {"value": "center"}}}},
