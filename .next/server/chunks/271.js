exports.id=271,exports.ids=[271],exports.modules={2739:(a,b,c)=>{"use strict";c.d(b,{q:()=>i});let d=[{id:"reading-comprehension",name:"Reading Comprehension",moduleType:"reading-writing",description:"Understanding and analyzing written passages",subtopics:[{id:"main-ideas-central-claims",name:"Main Ideas and Central Claims",description:"Identifying the primary purpose, main idea, or central claim of a passage",targetQuestions:100,difficultyDistribution:{easy:40,medium:40,hard:20}},{id:"supporting-details-evidence",name:"Supporting Details and Evidence",description:"Identifying and analyzing supporting evidence and details",targetQuestions:100,difficultyDistribution:{easy:35,medium:45,hard:20}},{id:"inferences-implications",name:"Inferences and Implications",description:"Drawing logical conclusions from text",targetQuestions:100,difficultyDistribution:{easy:30,medium:50,hard:20}},{id:"vocabulary-in-context",name:"Vocabulary in Context",description:"Understanding word meanings based on context",targetQuestions:100,difficultyDistribution:{easy:40,medium:40,hard:20}},{id:"text-structure-organization",name:"Text Structure and Organization",description:"Understanding how texts are organized and structured",targetQuestions:100,difficultyDistribution:{easy:35,medium:45,hard:20}},{id:"author-purpose-point-of-view",name:"Author's Purpose and Point of View",description:"Analyzing author's intent, perspective, and rhetorical strategies",targetQuestions:100,difficultyDistribution:{easy:30,medium:50,hard:20}},{id:"comparing-texts",name:"Comparing Texts and Viewpoints",description:"Analyzing relationships between paired passages",targetQuestions:100,difficultyDistribution:{easy:25,medium:50,hard:25}}]},{id:"writing-language",name:"Writing and Language",moduleType:"reading-writing",description:"Grammar, usage, and rhetorical skills",subtopics:[{id:"grammar-usage",name:"Grammar and Usage",description:"Standard English conventions and grammar rules",targetQuestions:100,difficultyDistribution:{easy:40,medium:40,hard:20}},{id:"punctuation-mechanics",name:"Punctuation and Mechanics",description:"Proper use of punctuation marks and mechanical conventions",targetQuestions:100,difficultyDistribution:{easy:45,medium:35,hard:20}},{id:"sentence-structure-style",name:"Sentence Structure and Style",description:"Effective sentence construction and style",targetQuestions:100,difficultyDistribution:{easy:35,medium:45,hard:20}},{id:"rhetorical-skills",name:"Rhetorical Skills",description:"Effective communication and persuasive techniques",targetQuestions:100,difficultyDistribution:{easy:30,medium:50,hard:20}},{id:"transitions-logical-flow",name:"Transitions and Logical Flow",description:"Creating coherent connections between ideas",targetQuestions:100,difficultyDistribution:{easy:35,medium:45,hard:20}}]},{id:"algebra",name:"Algebra",moduleType:"math",description:"Linear equations, systems, and algebraic expressions",subtopics:[{id:"linear-equations-inequalities",name:"Linear Equations and Inequalities",description:"Solving and graphing linear equations and inequalities",targetQuestions:100,difficultyDistribution:{easy:40,medium:40,hard:20}},{id:"systems-of-equations",name:"Systems of Equations",description:"Solving systems of linear equations and inequalities",targetQuestions:100,difficultyDistribution:{easy:35,medium:45,hard:20}},{id:"quadratic-functions-equations",name:"Quadratic Functions and Equations",description:"Working with quadratic expressions, equations, and functions",targetQuestions:100,difficultyDistribution:{easy:35,medium:45,hard:20}},{id:"polynomial-expressions",name:"Polynomial Expressions",description:"Operations with polynomials and rational expressions",targetQuestions:100,difficultyDistribution:{easy:35,medium:45,hard:20}},{id:"exponential-logarithmic-functions",name:"Exponential and Logarithmic Functions",description:"Exponential growth/decay and logarithmic functions",targetQuestions:100,difficultyDistribution:{easy:30,medium:50,hard:20}},{id:"rational-expressions-equations",name:"Rational Expressions and Equations",description:"Working with rational expressions and solving rational equations",targetQuestions:100,difficultyDistribution:{easy:30,medium:45,hard:25}}]},{id:"advanced-math",name:"Advanced Math",moduleType:"math",description:"Complex functions, equations, and mathematical reasoning",subtopics:[{id:"functions-transformations",name:"Functions and Transformations",description:"Understanding function behavior and transformations",targetQuestions:100,difficultyDistribution:{easy:30,medium:50,hard:20}},{id:"complex-numbers",name:"Complex Numbers",description:"Operations with complex numbers and their properties",targetQuestions:100,difficultyDistribution:{easy:25,medium:50,hard:25}},{id:"sequences-series",name:"Sequences and Series",description:"Arithmetic and geometric sequences and series",targetQuestions:100,difficultyDistribution:{easy:35,medium:45,hard:20}}]},{id:"geometry-trigonometry",name:"Geometry and Trigonometry",moduleType:"math",description:"Geometric concepts, measurements, and trigonometric functions",subtopics:[{id:"coordinate-geometry",name:"Coordinate Geometry",description:"Points, lines, and shapes in the coordinate plane",targetQuestions:100,difficultyDistribution:{easy:40,medium:40,hard:20}},{id:"area-volume-surface-area",name:"Area, Volume, and Surface Area",description:"Calculating areas, volumes, and surface areas of geometric figures",targetQuestions:100,difficultyDistribution:{easy:45,medium:35,hard:20}},{id:"triangles-polygons",name:"Triangles and Polygons",description:"Properties and relationships of triangles and polygons",targetQuestions:100,difficultyDistribution:{easy:40,medium:40,hard:20}},{id:"circles",name:"Circles",description:"Circle properties, equations, and related calculations",targetQuestions:100,difficultyDistribution:{easy:35,medium:45,hard:20}},{id:"trigonometry",name:"Trigonometry",description:"Trigonometric ratios, functions, and applications",targetQuestions:100,difficultyDistribution:{easy:30,medium:50,hard:20}},{id:"geometric-reasoning-proofs",name:"Geometric Reasoning and Proofs",description:"Logical reasoning and proof techniques in geometry",targetQuestions:100,difficultyDistribution:{easy:25,medium:50,hard:25}}]},{id:"statistics-probability",name:"Statistics and Probability",moduleType:"math",description:"Data analysis, statistics, and probability concepts",subtopics:[{id:"descriptive-statistics",name:"Descriptive Statistics",description:"Measures of center, spread, and data interpretation",targetQuestions:100,difficultyDistribution:{easy:40,medium:40,hard:20}},{id:"probability-basics",name:"Probability Basics",description:"Basic probability concepts and calculations",targetQuestions:100,difficultyDistribution:{easy:40,medium:40,hard:20}},{id:"conditional-probability",name:"Conditional Probability",description:"Conditional probability and independence",targetQuestions:100,difficultyDistribution:{easy:30,medium:50,hard:20}},{id:"data-analysis-interpretation",name:"Data Analysis and Interpretation",description:"Analyzing graphs, charts, and data sets",targetQuestions:100,difficultyDistribution:{easy:40,medium:40,hard:20}},{id:"statistical-inference",name:"Statistical Inference",description:"Drawing conclusions from data and samples",targetQuestions:100,difficultyDistribution:{easy:25,medium:50,hard:25}}]}];function e(){return d.flatMap(a=>a.subtopics.map(b=>({...b,topicId:a.id,topicName:a.name,moduleType:a.moduleType})))}function f(a){return d.filter(b=>b.moduleType===a)}d.length,e().length,d.reduce((a,b)=>a+b.subtopics.reduce((a,b)=>a+b.targetQuestions,0),0),f("reading-writing").reduce((a,b)=>a+b.subtopics.length,0),f("math").reduce((a,b)=>a+b.subtopics.length,0);var g=c(31183);class h{async generateQuestions(){console.log("\uD83E\uDD16 Generating questions with GPT-5...");try{let a=await this.generateMathQuestions(),b=await this.generateReadingQuestions(),c=[...a,...b],d=await this.evaluateQuestions(c);return await this.generateImagesForQuestions(d)}catch(a){throw console.error("Failed to generate questions:",a),a}}async generateMathQuestions(){let a=e().filter(a=>"math"===a.moduleType),b=this.selectRandomSubtopics(a,5),c=this.buildMathPrompt(b),d=await this.callGPT5(c);return this.parseMathQuestions(d,b)}async generateReadingQuestions(){let a=e().filter(a=>"reading-writing"===a.moduleType),b=this.selectRandomSubtopics(a,5),c=this.buildReadingPrompt(b),d=await this.callGPT5(c);return this.parseReadingQuestions(d,b)}async evaluateQuestions(a){console.log("\uD83D\uDD0D Evaluating questions with Grok...");let b=[];for(let c of a)try{let a=await this.evaluateWithGrok(c);b.push({...c,...a})}catch(a){console.error("Failed to evaluate question:",a),b.push({...c,difficulty:"medium",qualityScore:75,isAccepted:!0,evaluationFeedback:"Fallback evaluation - evaluator unavailable"})}return b}async generateImagesForQuestions(a){let{imageGenerationService:b}=await c.e(184).then(c.bind(c,50184));return await Promise.all(a.map(async a=>{if(a.hasChart&&a.chartDescription&&"math"===a.moduleType)try{console.log(`🎨 Generating image for ${a.graphType} chart...`);let c={type:a.graphType||"coordinate-plane",description:a.chartDescription,width:600,height:400},d=await b.generateChartImage(c);if(d||(console.log("\uD83D\uDCCA DALL-E failed, generating SVG fallback..."),d=await b.generateSVGChart(c)),d)return{...a,imageUrl:d,imageAlt:a.chartDescription}}catch(a){console.error("Image generation failed for question:",a)}return a}))}async generateQuestionsWithSettings(a){console.log("\uD83E\uDD16 Generating questions with custom settings...");try{let b=await this.generateMathQuestionsWithSettings(a),c=await this.generateReadingQuestionsWithSettings(a),d=[...b,...c];if(a.includeCharts)return await this.generateImagesForQuestions(d);return d}catch(a){throw console.error("Failed to generate questions with settings:",a),a}}async generateMathQuestionsWithSettings(a){let b=e().filter(a=>"math"===a.moduleType),c=this.selectRandomSubtopics(b,a.mathCount),d=this.buildMathPromptWithSettings(c,a),f=await this.callGPT5WithSettings(d,a);return this.parseMathQuestions(f,c)}async generateReadingQuestionsWithSettings(a){let b=e().filter(a=>"reading-writing"===a.moduleType),c=this.selectRandomSubtopics(b,a.readingCount),d=this.buildReadingPromptWithSettings(c,a),f=await this.callGPT5WithSettings(d,a);return this.parseReadingQuestions(f,c)}async callGPT5WithSettings(a,b){console.log(`Calling ${b.llmModel} API with custom settings...`);try{let c=await fetch(this.GPT5_ENDPOINT,{method:"POST",headers:{Authorization:`Bearer ${this.GPT5_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({messages:[{role:"system",content:"You are an expert SAT question writer. Generate high-quality, accurate SAT questions that match official SAT standards and difficulty levels. Always return valid JSON without any markdown formatting or code blocks."},{role:"user",content:a}],temperature:b.temperature,max_tokens:b.maxTokens})});if(console.log(`${b.llmModel} Response Status:`,c.status,c.statusText),!c.ok){let a=await c.text();throw console.error(`${b.llmModel} API Error Response:`,a),Error(`${b.llmModel} API error: ${c.status} ${c.statusText} - ${a}`)}let d=await c.json();if(console.log(`${b.llmModel} Response Data:`,JSON.stringify(d,null,2)),!d.choices||!d.choices[0]||!d.choices[0].message)throw Error(`Invalid ${b.llmModel} response structure`);let e=d.choices[0].message.content;return console.log(`${b.llmModel} Content Length:`,e.length),e}catch(a){throw console.error(`${b.llmModel} API call failed:`,a),a}}buildMathPromptWithSettings(a,b){let c=b.includeCharts?"MUST include detailed visual elements: graphs, charts, tables, diagrams, or coordinate planes":"May optionally include visual elements if they enhance understanding";return`
Generate exactly ${b.mathCount} high-quality SAT Math questions, one for each of these subtopics:
${a.map((a,b)=>`${b+1}. ${a.name} (${a.topicName})`).join("\n")}

Requirements for each question:
- ${c}
- For coordinate geometry: specify exact points, lines, curves, and grid details
- For functions: include function graphs with labeled axes, intercepts, and key points
- For geometry: provide detailed diagrams with measurements, angles, and labeled vertices
- For statistics: include data tables, bar charts, histograms, or scatter plots with specific values
- For algebra: show coordinate planes, number lines, or visual representations of equations
- 4 multiple choice options (A, B, C, D)
- Clear correct answer with step-by-step explanation
- Points value (1-4 points based on complexity)
- Appropriate for SAT Math section
- Vary complexity across the questions
- Make graphs interactive when possible (e.g., "Click to identify the vertex", "Select the correct point")

VISUAL REQUIREMENTS - Every question MUST have one of these (if charts enabled):
- Coordinate plane with plotted points/lines/curves
- Data table with numerical values
- Bar chart, histogram, or pie chart
- Geometric diagram with labeled measurements
- Function graph with domain/range marked
- Number line with inequalities or intervals
- Scatter plot with trend lines
- Box plot or other statistical visualization

IMPORTANT MATH NOTATION REQUIREMENTS:
- Use proper mathematical notation in questions, options, and explanations
- For equations: Use format like "y = 2x + 3", "f(x) = x^2 - 4x + 1", "2x^2 + 3x - 5 = 0"
- For fractions: Use "1/2", "3/4", "-2/3" format
- For exponents: Use "x^2", "2^n", "(x+1)^3" format
- For square roots: Use "sqrt(x)", "sqrt(25)", "sqrt(x^2 + 1)" format
- For coordinates: Use "(2, 3)", "(-1, 4)", "(0, -2)" format
- For inequalities: Use "x > 5", "y <= 3", "2x + 1 >= 7" format
- For functions: Use "f(x) = ", "g(t) = ", "h(n) = " format
- Include mathematical expressions in both questions and answer choices
- Make explanations step-by-step with clear mathematical reasoning

IMPORTANT: For the chartDescription field, be very specific about:
- Coordinate points to plot: (x, y) coordinates with exact values
- Function equations: y = mx + b, y = ax^2 + bx + c, etc.
- Table data: specific numbers, headers, and formatting
- Chart details: axis labels, scales, data points, colors
- Geometric shapes: triangles with vertices at specific points, angles, side lengths
- Interactive elements: what the student should click, drag, or manipulate
- Axes ranges and labels with specific numerical values
- Grid settings and scale increments

EXAMPLES of good chartDescription content:
- "Data table showing x values: -2, -1, 0, 1, 2 and corresponding y values: 4, 1, 0, 1, 4 for function f(x) = x^2"
- "Coordinate plane from -10 to 10 on both axes. Plot parabola y = (x-3)^2 - 4 with vertex at (3, -4) and y-intercept at (0, 5). Grid lines every 1 unit."
- "Bar chart showing test scores: 70-79 (5 students), 80-89 (12 students), 90-99 (8 students). Y-axis shows frequency, X-axis shows score ranges."

IMPORTANT: Return ONLY a valid JSON array with no additional text, markdown, or code blocks. Use this exact format:

[
  {
    "question": "The coordinate plane shows the graph of f(x) = x^2 - 4x + 3. What are the coordinates of the vertex?",
    "options": ["A) (2, -1)", "B) (2, 1)", "C) (-2, -1)", "D) (4, 3)"],
    "correctAnswer": 0,
    "points": 3,
    "explanation": "For f(x) = x^2 - 4x + 3, vertex x-coordinate = -b/(2a) = -(-4)/(2(1)) = 2. f(2) = (2)^2 - 4(2) + 3 = 4 - 8 + 3 = -1. Vertex is (2, -1)",
    "subtopic": "${a[0]?.name||"Math"}",
    "category": "${a[0]?.topicName||"Math"}",
    "hasChart": ${b.includeCharts},
    "chartDescription": "Coordinate plane from -1 to 5 on x-axis and -3 to 7 on y-axis. Shows parabola f(x) = x^2 - 4x + 3 with vertex at (2, -1), y-intercept at (0, 3), and x-intercepts at (1, 0) and (3, 0). Grid lines every 1 unit.",
    "interactionType": "point-selection",
    "graphType": "coordinate-plane"
  }
]

Generate all ${b.mathCount} questions following this pattern. Ensure each question uses proper mathematical notation and includes step-by-step explanations with clear mathematical reasoning. Return only the JSON array.
`}buildReadingPromptWithSettings(a,b){let c=b.includePassages?"Include a reading passage (150-300 words)":"May optionally include shorter passages if they enhance understanding";return`
Generate exactly ${b.readingCount} high-quality SAT Reading questions, one for each of these subtopics:
${a.map((a,b)=>`${b+1}. ${a.name} (${a.topicName})`).join("\n")}

Requirements for each question:
- ${c}
- 4 multiple choice options (A, B, C, D)
- Clear correct answer with explanation
- Points value (1-3 points based on complexity)
- Appropriate for SAT Reading section
- Vary passage types and complexity

IMPORTANT: Return ONLY a valid JSON array with no additional text, markdown, or code blocks. Use this exact format:

[
  {
    "question": "Question text here",
    "passage": "Reading passage text here (150-300 words)...",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correctAnswer": 0,
    "points": 2,
    "explanation": "Detailed explanation of the correct answer",
    "subtopic": "${a[0]?.name||"Reading"}",
    "category": "${a[0]?.topicName||"Reading"}"
  }
]

Generate all ${b.readingCount} questions following this pattern. Return only the JSON array.
`}async callGPT5(a){console.log("Calling GPT-5 API...");try{let b=await fetch(this.GPT5_ENDPOINT,{method:"POST",headers:{Authorization:`Bearer ${this.GPT5_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({messages:[{role:"system",content:"You are an expert SAT question writer. Generate high-quality, accurate SAT questions that match official SAT standards and difficulty levels. Always return valid JSON without any markdown formatting or code blocks."},{role:"user",content:a}],temperature:.7,max_tokens:4e3})});if(console.log("GPT-5 Response Status:",b.status,b.statusText),!b.ok){let a=await b.text();throw console.error("GPT-5 API Error Response:",a),Error(`GPT-5 API error: ${b.status} ${b.statusText} - ${a}`)}let c=await b.json();if(console.log("GPT-5 Response Data:",JSON.stringify(c,null,2)),!c.choices||!c.choices[0]||!c.choices[0].message)throw Error("Invalid GPT-5 response structure");let d=c.choices[0].message.content;return console.log("GPT-5 Content Length:",d.length),d}catch(a){throw console.error("GPT-5 API call failed:",a),a}}async evaluateWithGrok(a){try{let b=this.buildEvaluationPrompt(a),c=await fetch(this.GROK_ENDPOINT,{method:"POST",headers:{Authorization:`Bearer ${this.GPT5_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({messages:[{role:"system",content:"You are an expert SAT evaluator. Return only valid JSON."},{role:"user",content:b}],temperature:.1,max_tokens:200})});if(c.ok){let a=await c.json();return this.parseGrokEvaluation(a.choices[0].message.content)}throw Error(`Grok API failed: ${c.status}`)}catch(b){return console.log("Using fallback evaluation"),this.enhancedFallbackEvaluation(a)}}buildMathPrompt(a){return`
Generate exactly 5 high-quality SAT Math questions, one for each of these subtopics:
${a.map((a,b)=>`${b+1}. ${a.name} (${a.topicName})`).join("\n")}

Requirements for each question:
- MUST include detailed visual elements: graphs, charts, tables, diagrams, or coordinate planes
- For coordinate geometry: specify exact points, lines, curves, and grid details
- For functions: include function graphs with labeled axes, intercepts, and key points
- For geometry: provide detailed diagrams with measurements, angles, and labeled vertices
- For statistics: include data tables, bar charts, histograms, or scatter plots with specific values
- For algebra: show coordinate planes, number lines, or visual representations of equations
- 4 multiple choice options (A, B, C, D)
- Clear correct answer with step-by-step explanation
- Points value (1-4 points based on complexity)
- Appropriate for SAT Math section
- Vary complexity across the 5 questions
- Make graphs interactive when possible (e.g., "Click to identify the vertex", "Select the correct point")

VISUAL REQUIREMENTS - Every question MUST have one of these:
- Coordinate plane with plotted points/lines/curves
- Data table with numerical values
- Bar chart, histogram, or pie chart
- Geometric diagram with labeled measurements
- Function graph with domain/range marked
- Number line with inequalities or intervals
- Scatter plot with trend lines
- Box plot or other statistical visualization

IMPORTANT MATH NOTATION REQUIREMENTS:
- Use proper mathematical notation in questions, options, and explanations
- For equations: Use format like "y = 2x + 3", "f(x) = x^2 - 4x + 1", "2x^2 + 3x - 5 = 0"
- For fractions: Use "1/2", "3/4", "-2/3" format
- For exponents: Use "x^2", "2^n", "(x+1)^3" format
- For square roots: Use "sqrt(x)", "sqrt(25)", "sqrt(x^2 + 1)" format
- For coordinates: Use "(2, 3)", "(-1, 4)", "(0, -2)" format
- For inequalities: Use "x > 5", "y <= 3", "2x + 1 >= 7" format
- For functions: Use "f(x) = ", "g(t) = ", "h(n) = " format
- Include mathematical expressions in both questions and answer choices
- Make explanations step-by-step with clear mathematical reasoning

IMPORTANT: For the chartDescription field, be very specific about:
- Coordinate points to plot: (x, y) coordinates with exact values
- Function equations: y = mx + b, y = ax^2 + bx + c, etc.
- Table data: specific numbers, headers, and formatting
- Chart details: axis labels, scales, data points, colors
- Geometric shapes: triangles with vertices at specific points, angles, side lengths
- Interactive elements: what the student should click, drag, or manipulate
- Axes ranges and labels with specific numerical values
- Grid settings and scale increments

EXAMPLES of good chartDescription content:
- "Data table showing x values: -2, -1, 0, 1, 2 and corresponding y values: 4, 1, 0, 1, 4 for function f(x) = x^2"
- "Coordinate plane from -10 to 10 on both axes. Plot parabola y = (x-3)^2 - 4 with vertex at (3, -4) and y-intercept at (0, 5). Grid lines every 1 unit."
- "Bar chart showing test scores: 70-79 (5 students), 80-89 (12 students), 90-99 (8 students). Y-axis shows frequency, X-axis shows score ranges."

IMPORTANT: Return ONLY a valid JSON array with no additional text, markdown, or code blocks. Use this exact format:

[
  {
    "question": "The coordinate plane shows the graph of f(x) = x^2 - 4x + 3. What are the coordinates of the vertex?",
    "options": ["A) (2, -1)", "B) (2, 1)", "C) (-2, -1)", "D) (4, 3)"],
    "correctAnswer": 0,
    "points": 3,
    "explanation": "For f(x) = x^2 - 4x + 3, vertex x-coordinate = -b/(2a) = -(-4)/(2(1)) = 2. f(2) = (2)^2 - 4(2) + 3 = 4 - 8 + 3 = -1. Vertex is (2, -1)",
    "subtopic": "${a[0]?.name||"Math"}",
    "category": "${a[0]?.topicName||"Math"}",
    "hasChart": true,
    "chartDescription": "Coordinate plane from -1 to 5 on x-axis and -3 to 7 on y-axis. Shows parabola f(x) = x^2 - 4x + 3 with vertex at (2, -1), y-intercept at (0, 3), and x-intercepts at (1, 0) and (3, 0). Grid lines every 1 unit.",
    "interactionType": "point-selection",
    "graphType": "coordinate-plane"
  },
  {
    "question": "The bar chart shows test scores for a math class. What is the median score?",
    "options": ["A) 75", "B) 80", "C) 85", "D) 90"],
    "correctAnswer": 1,
    "points": 2,
    "explanation": "From the chart: 70-79 (3 students), 80-89 (7 students), 90-99 (5 students). Total 15 students. Median is 8th value, which falls in 80-89 range, so median ≈ 80",
    "subtopic": "${a[1]?.name||"Math"}",
    "category": "${a[1]?.topicName||"Math"}",
    "hasChart": true,
    "chartDescription": "Bar chart with x-axis showing score ranges (70-79, 80-89, 90-99) and y-axis showing number of students. Bars: 70-79 (3), 80-89 (7), 90-99 (5). Blue bars with clear labels.",
    "interactionType": "data-analysis",
    "graphType": "bar-chart"
  }
]

Generate all 5 questions following this pattern. Ensure each question uses proper mathematical notation and includes step-by-step explanations with clear mathematical reasoning. Return only the JSON array.
`}buildReadingPrompt(a){return`
Generate exactly 5 high-quality SAT Reading questions, one for each of these subtopics:
${a.map((a,b)=>`${b+1}. ${a.name} (${a.topicName})`).join("\n")}

Requirements for each question:
- Include a reading passage (150-300 words)
- 4 multiple choice options (A, B, C, D)
- Clear correct answer with explanation
- Points value (1-3 points based on complexity)
- Appropriate for SAT Reading section
- Vary passage types and complexity

IMPORTANT: Return ONLY a valid JSON array with no additional text, markdown, or code blocks. Use this exact format:

[
  {
    "question": "Question text here",
    "passage": "Reading passage text here (150-300 words)...",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correctAnswer": 0,
    "points": 2,
    "explanation": "Detailed explanation of the correct answer",
    "subtopic": "${a[0]?.name||"Reading"}",
    "category": "${a[0]?.topicName||"Reading"}"
  },
  {
    "question": "Second question text here",
    "passage": "Second reading passage text here (150-300 words)...",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correctAnswer": 1,
    "points": 2,
    "explanation": "Detailed explanation of the correct answer",
    "subtopic": "${a[1]?.name||"Reading"}",
    "category": "${a[1]?.topicName||"Reading"}"
  }
]

Generate all 5 questions following this pattern. Return only the JSON array.
`}buildEvaluationPrompt(a){return`
Evaluate this SAT question for difficulty and quality:

Question: ${a.question}
${a.passage?`Passage: ${a.passage}`:""}
${a.chartDescription?`Chart: ${a.chartDescription}`:""}
Options: ${a.options.join(", ")}
Correct Answer: ${a.options[a.correctAnswer]}
Explanation: ${a.explanation}
Subtopic: ${a.subtopic}
Points: ${a.points}

Please evaluate:
1. Difficulty level (easy/medium/hard) based on SAT standards
2. Quality score (0-1) for accuracy, clarity, and appropriateness
3. Whether to accept this question (true/false) - reject if too easy or too hard for SAT
4. Brief feedback on the question

Respond in this JSON format:
{
  "difficulty": "medium",
  "qualityScore": 0.85,
  "isAccepted": true,
  "evaluationFeedback": "Well-constructed question with appropriate difficulty for SAT standards."
}
`}parseMathQuestions(a,b){try{console.log("Raw GPT-5 math response:",a.substring(0,200)+"...");let c=a.trim();return c.startsWith("```json")?c=c.replace(/^```json\s*/,"").replace(/\s*```$/,""):c.startsWith("```")&&(c=c.replace(/^```\s*/,"").replace(/\s*```$/,"")),JSON.parse(c).map((a,c)=>({...a,moduleType:"math",category:b[c]?.topicName||"Math",subtopic:b[c]?.name||"Unknown"}))}catch(b){return console.error("Failed to parse math questions:",b),console.error("Raw response:",a),[]}}parseReadingQuestions(a,b){try{console.log("Raw GPT-5 reading response:",a.substring(0,200)+"...");let c=a.trim();return c.startsWith("```json")?c=c.replace(/^```json\s*/,"").replace(/\s*```$/,""):c.startsWith("```")&&(c=c.replace(/^```\s*/,"").replace(/\s*```$/,"")),JSON.parse(c).map((a,c)=>({...a,moduleType:"reading-writing",category:b[c]?.topicName||"Reading",subtopic:b[c]?.name||"Unknown"}))}catch(b){return console.error("Failed to parse reading questions:",b),console.error("Raw response:",a),[]}}parseGrokEvaluation(a){try{let b=JSON.parse(a);return{difficulty:b.difficulty||"medium",qualityScore:b.qualityScore||.5,isAccepted:!1!==b.isAccepted,evaluationFeedback:b.evaluationFeedback||"No feedback provided"}}catch(a){return console.error("Failed to parse Grok evaluation:",a),{difficulty:"medium",qualityScore:.5,isAccepted:!0,evaluationFeedback:"Evaluation parsing failed"}}}enhancedFallbackEvaluation(a){let b="medium",c=.7,d="Evaluated using enhanced fallback logic: ";a.points<=1?(b="easy",d+="Low point value suggests easy difficulty. "):a.points>=3?(b="hard",d+="High point value suggests hard difficulty. "):(b="medium",d+="Medium point value suggests moderate difficulty. ");let e=a.explanation.length>50,f=4===a.options.length,g=a.question.length>20;return e&&f&&g?(c=.8,d+="Good structure and explanations. "):(c=.6,d+="Basic structure but could be improved. "),"math"===a.moduleType&&a.hasChart&&a.chartDescription&&(c+=.1,d+="Includes helpful chart description. "),"reading-writing"===a.moduleType&&a.passage&&a.passage.length>100&&(c+=.1,d+="Includes substantial passage. "),{difficulty:b,qualityScore:c=Math.min(c,1),isAccepted:c>=.6,evaluationFeedback:d+`Final quality score: ${(100*c).toFixed(0)}%`}}async generateAndStoreQuestions(){try{console.log("\uD83E\uDD16 Generating questions with GPT-5...");let a=await this.generateQuestions();console.log(`✅ Generated ${a.length} questions`);let b=await this.evaluateQuestions(a);console.log(`🔍 Evaluated ${b.length} questions`);let c=b.filter(a=>a.isAccepted),d=b.filter(a=>!a.isAccepted);console.log(`✅ Accepted: ${c.length}, ❌ Rejected: ${d.length}`);let e=[];for(let a of c)try{let b=await g.z.subtopic.findFirst({where:{name:{contains:a.subtopic,mode:"insensitive"}}}),c=await g.z.question.create({data:{subtopicId:b?.id||null,moduleType:a.moduleType,difficulty:a.difficulty,category:a.category,subtopic:a.subtopic,question:a.question,passage:a.passage||null,options:a.options,correctAnswer:a.correctAnswer,explanation:a.explanation,wrongAnswerExplanations:void 0,imageUrl:a.imageUrl||void 0,imageAlt:a.imageAlt||a.chartDescription||void 0,chartData:a.hasChart?{description:a.chartDescription,interactionType:a.interactionType,graphType:a.graphType,hasGeneratedImage:!!a.imageUrl}:void 0,timeEstimate:30*a.points,source:"AI Generated (GPT-5)",tags:[a.difficulty,a.category,a.subtopic],isActive:!0}});e.push(c.id),b&&await g.z.subtopic.update({where:{id:b.id},data:{currentCount:{increment:1}}})}catch(a){console.error("Failed to store question:",a)}return{generated:a.length,evaluated:b.length,accepted:c.length,rejected:d.length,stored:e.length,storedQuestionIds:e}}catch(a){throw console.error("Question generation and storage failed:",a),a}}async generateQuestionsForSubtopic(a,b){console.log(`🎯 Generating ${b} questions for: ${a.name}`);try{let c;c="math"===a.moduleType?this.buildMathPromptForSubtopic(a,b):this.buildReadingPromptForSubtopic(a,b);let d=await this.callGPT5(c),e=this.parseQuestionsForSubtopic(d,a);console.log(`✅ Generated ${e.length} questions`);let f=await this.evaluateQuestions(e),h=f.filter(a=>a.isAccepted),i=f.filter(a=>!a.isAccepted);console.log(`🔍 Accepted: ${h.length}, Rejected: ${i.length}`);let j=0;for(let a of h)try{await g.z.question.create({data:{moduleType:a.moduleType,difficulty:a.difficulty,category:a.category,subtopic:a.subtopic,question:a.question,passage:a.passage||null,options:a.options,correctAnswer:a.correctAnswer,explanation:a.explanation,chartData:a.hasChart?{description:a.chartDescription,interactionType:a.interactionType,graphType:a.graphType,type:a.graphType?.includes("coordinate")?"scatter":a.graphType?.includes("statistics")?"bar":"line"}:void 0,timeEstimate:30*a.points,source:"AI Generated (GPT-5 + Grok)",tags:[a.difficulty,a.category,a.subtopic],isActive:!0}}),j++}catch(a){console.error("Failed to store question:",a)}return{generated:e.length,accepted:h.length,rejected:i.length,stored:j}}catch(b){throw console.error(`Failed to generate questions for ${a.name}:`,b),b}}buildMathPromptForSubtopic(a,b){let c=a.difficultyDistribution,d=Math.round(b*c.easy/100),e=Math.round(b*c.medium/100);return`Generate ${b} high-quality SAT Math questions for the subtopic "${a.name}".

Description: ${a.description}

Difficulty Distribution:
- Easy: ${d} questions (${c.easy}%)
- Medium: ${e} questions (${c.medium}%)  
- Hard: ${b-d-e} questions (${c.hard}%)

Requirements:
1. All questions must be authentic SAT-style math problems
2. Include charts/graphs where appropriate for visual learning
3. Provide detailed explanations for correct answers
4. Use realistic SAT point values (1-4 points based on difficulty)
5. Follow official SAT math question formats

Return ONLY a valid JSON array with this exact format:
[
  {
    "question": "Question text here",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correctAnswer": 0,
    "points": 2,
    "explanation": "Detailed step-by-step explanation",
    "hasChart": true,
    "chartDescription": "Description of chart/graph if applicable",
    "graphType": "coordinate-plane",
    "interactionType": "point-placement"
  }
]`}buildReadingPromptForSubtopic(a,b){let c=a.difficultyDistribution,d=Math.round(b*c.easy/100),e=Math.round(b*c.medium/100);return`Generate ${b} high-quality SAT Reading & Writing questions for the subtopic "${a.name}".

Description: ${a.description}

Difficulty Distribution:
- Easy: ${d} questions (${c.easy}%)
- Medium: ${e} questions (${c.medium}%)
- Hard: ${b-d-e} questions (${c.hard}%)

Requirements:
1. All questions must be authentic SAT-style reading/writing problems
2. Include appropriate passages (150-400 words) when needed
3. Cover diverse topics: literature, science, history, social studies
4. Provide detailed explanations for correct answers
5. Use realistic SAT point values (1-3 points based on difficulty)

Return ONLY a valid JSON array with this exact format:
[
  {
    "question": "Question text here",
    "passage": "Reading passage text (if applicable)",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correctAnswer": 1,
    "points": 2,
    "explanation": "Detailed explanation of correct answer"
  }
]`}parseQuestionsForSubtopic(a,b){try{let c=a.trim();return c.startsWith("```json")?c=c.replace(/^```json\s*/,"").replace(/\s*```$/,""):c.startsWith("```")&&(c=c.replace(/^```\s*/,"").replace(/\s*```$/,"")),JSON.parse(c).map(a=>({...a,moduleType:b.moduleType,category:b.name,subtopic:b.name}))}catch(a){return console.error("Failed to parse questions for subtopic:",a),[]}}selectRandomSubtopics(a,b){return[...a].sort(()=>.5-Math.random()).slice(0,b)}async storeQuestion(a){try{await g.z.question.create({data:{moduleType:a.moduleType,difficulty:"medium",category:a.category,subtopic:a.subtopic||a.category,question:a.question,passage:a.passage||null,options:a.options,correctAnswer:a.correctAnswer,explanation:a.explanation,wrongAnswerExplanations:null,imageUrl:a.imageUrl||null,imageAlt:a.imageAlt||null,chartData:a.hasChart?{description:a.chartDescription,interactionType:a.interactionType,graphType:a.graphType,hasGeneratedImage:!!a.imageUrl}:null,timeEstimate:30*a.points,source:"ai-generated",tags:[a.category,a.subtopic],isActive:!0}})}catch(a){throw console.error("Error storing question:",a),a}}constructor(){this.GPT5_ENDPOINT="https://ai-manojwin82958ai594424696620.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2025-01-01-preview",this.GPT5_KEY=process.env.AZURE_OPENAI_API_KEY||"",this.GROK_ENDPOINT="https://ai-manojwin82958ai594424696620.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2025-01-01-preview"}}let i=new h},31183:(a,b,c)=>{"use strict";c.d(b,{z:()=>e});var d=c(96330);let e=globalThis.prisma??new d.PrismaClient},78335:()=>{},96487:()=>{}};