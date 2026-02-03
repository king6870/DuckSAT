import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DUMMY_TAG = 'DUMMY_QUESTION_REMOVABLE'

// Math question templates
const mathCategories = [
  { category: 'algebra', subtopic: 'linear-equations' },
  { category: 'algebra', subtopic: 'quadratic-functions' },
  { category: 'geometry', subtopic: 'area-perimeter' },
  { category: 'geometry', subtopic: 'triangles' },
  { category: 'data-analysis', subtopic: 'statistics' },
  { category: 'data-analysis', subtopic: 'probability' },
  { category: 'advanced-math', subtopic: 'polynomials' },
  { category: 'advanced-math', subtopic: 'exponents' },
]

// Reading question templates
const readingCategories = [
  { category: 'reading-comprehension', subtopic: 'main-ideas' },
  { category: 'reading-comprehension', subtopic: 'details' },
  { category: 'vocabulary', subtopic: 'context-clues' },
  { category: 'vocabulary', subtopic: 'word-choice' },
  { category: 'rhetoric', subtopic: 'purpose' },
  { category: 'rhetoric', subtopic: 'structure' },
  { category: 'synthesis', subtopic: 'multiple-texts' },
  { category: 'command-of-evidence', subtopic: 'textual-support' },
]

const difficulties = ['easy', 'medium', 'hard']

function generateMathQuestion(index: number): Record<string, unknown> {
  const categoryInfo = mathCategories[index % mathCategories.length]
  const difficulty = difficulties[index % 3]
  
  // Generate different types of math questions based on category
  let question = ''
  let options: string[] = []
  let correctAnswer = 0
  let explanation = ''
  let wrongAnswerExplanations: Record<number, string> = {}

  if (categoryInfo.category === 'algebra') {
    if (categoryInfo.subtopic === 'linear-equations') {
      const a = Math.floor(Math.random() * 10) + 2
      const b = Math.floor(Math.random() * 20) + 1
      const c = Math.floor(Math.random() * 30) + 10
      const x = (c - b) / a
      question = `Solve for x: ${a}x + ${b} = ${c}`
      options = [x.toString(), (x + 1).toString(), (x - 1).toString(), (x * 2).toString()]
      explanation = `To solve ${a}x + ${b} = ${c}, subtract ${b} from both sides: ${a}x = ${c - b}. Then divide by ${a}: x = ${x}.`
      wrongAnswerExplanations = {
        1: `Incorrect. You may have made an error in the subtraction or division step.`,
        2: `Incorrect. Check your arithmetic when isolating the variable.`,
        3: `Incorrect. Remember to divide by ${a} after subtracting ${b} from both sides.`
      }
    } else {
      const a = Math.floor(Math.random() * 5) + 1
      const b = Math.floor(Math.random() * 10) + 1
      const c = Math.floor(Math.random() * 20) - 10
      question = `What is the vertex of the parabola y = ${a}(x - ${b})² + ${c}?`
      options = [`(${b}, ${c})`, `(${-b}, ${c})`, `(${b}, ${-c})`, `(${c}, ${b})`]
      explanation = `In vertex form y = a(x - h)² + k, the vertex is at (h, k). So the vertex is (${b}, ${c}).`
      wrongAnswerExplanations = {
        1: `Incorrect. Remember that the vertex form is y = a(x - h)² + k where the vertex is (h, k).`,
        2: `Incorrect. Watch the signs in the vertex form.`,
        3: `Incorrect. The coordinates are in the wrong order. The vertex is (h, k) not (k, h).`
      }
    }
  } else if (categoryInfo.category === 'geometry') {
    if (categoryInfo.subtopic === 'area-perimeter') {
      const length = Math.floor(Math.random() * 10) + 5
      const width = Math.floor(Math.random() * 8) + 3
      const area = length * width
      question = `A rectangle has a length of ${length} units and a width of ${width} units. What is its area?`
      options = [area.toString(), (area + 10).toString(), (length + width).toString(), (area / 2).toString()]
      explanation = `Area of rectangle = length × width = ${length} × ${width} = ${area} square units.`
      wrongAnswerExplanations = {
        1: `Incorrect. Remember area = length × width, not length + width + 10.`,
        2: `Incorrect. You calculated the semi-perimeter (length + width), not the area.`,
        3: `Incorrect. This is half the area. The full area is ${area}.`
      }
    } else {
      const base = Math.floor(Math.random() * 12) + 4
      const height = Math.floor(Math.random() * 10) + 3
      const area = (base * height) / 2
      question = `A triangle has a base of ${base} cm and a height of ${height} cm. What is its area?`
      options = [area.toString(), (base * height).toString(), (area * 2).toString(), ((base + height) / 2).toString()]
      explanation = `Area of triangle = (base × height) / 2 = (${base} × ${height}) / 2 = ${area} square cm.`
      wrongAnswerExplanations = {
        1: `Incorrect. You forgot to divide by 2. Triangle area is (base × height) / 2.`,
        2: `Incorrect. This is double the correct area. Remember to divide by 2.`,
        3: `Incorrect. This formula doesn't apply to triangle area.`
      }
    }
  } else if (categoryInfo.category === 'data-analysis') {
    if (categoryInfo.subtopic === 'statistics') {
      const nums = [12, 15, 18, 22, 28]
      const mean = nums.reduce((a, b) => a + b) / nums.length
      question = `What is the mean of the following data set: ${nums.join(', ')}?`
      options = [mean.toString(), '18', '19', '20']
      explanation = `Mean = sum of all values / number of values = ${nums.reduce((a, b) => a + b)} / ${nums.length} = ${mean}.`
      wrongAnswerExplanations = {
        1: `Incorrect. This is the median, not the mean.`,
        2: `Incorrect. Check your addition or division.`,
        3: `Incorrect. Calculate: (${nums.join(' + ')}) / ${nums.length} = ${mean}.`
      }
    } else {
      const total = 20
      const favorable = 5
      const prob = favorable / total
      question = `A bag contains ${total} marbles, ${favorable} of which are red. What is the probability of randomly selecting a red marble?`
      options = [`${favorable}/${total}`, `${favorable}/${total - favorable}`, `${total}/${favorable}`, `1/${favorable}`]
      explanation = `Probability = favorable outcomes / total outcomes = ${favorable}/${total}.`
      wrongAnswerExplanations = {
        1: `Incorrect. The denominator should be the total number of marbles, not the remaining marbles.`,
        2: `Incorrect. You have the fraction inverted.`,
        3: `Incorrect. This is not the correct probability formula.`
      }
    }
  } else {
    const base = Math.floor(Math.random() * 5) + 2
    const exp = Math.floor(Math.random() * 4) + 2
    const result = Math.pow(base, exp)
    question = `Evaluate: ${base}^${exp}`
    options = [result.toString(), (result + base).toString(), (base * exp).toString(), (result / 2).toString()]
    explanation = `${base}^${exp} = ${base} multiplied by itself ${exp} times = ${result}.`
    wrongAnswerExplanations = {
      1: `Incorrect. You may have added instead of using exponents.`,
      2: `Incorrect. Remember that exponents mean repeated multiplication, not multiplication of base and exponent.`,
      3: `Incorrect. Check your exponent calculation.`
    }
  }

  return {
    moduleType: 'math',
    difficulty,
    category: categoryInfo.category,
    subtopic: categoryInfo.subtopic,
    question,
    passage: null,
    options: JSON.stringify(options),
    correctAnswer,
    explanation,
    wrongAnswerExplanations: JSON.stringify(wrongAnswerExplanations),
    imageUrl: null,
    imageData: null,
    imageMimeType: null,
    imageAlt: null,
    chartData: null,
    timeEstimate: difficulty === 'easy' ? 60 : difficulty === 'medium' ? 90 : 120,
    source: 'DuckSAT Practice Generator',
    tags: [DUMMY_TAG, 'practice', 'auto-generated'],
    isActive: true,
    reviewStatus: 'approved',
    reviewRating: 4,
    diagramAccurate: null,
    reviewComments: 'Auto-generated practice question',
    reviewedBy: 'system',
    reviewedAt: new Date(),
  }
}

function generateReadingQuestion(index: number): Record<string, unknown> {
  const categoryInfo = readingCategories[index % readingCategories.length]
  const difficulty = difficulties[index % 3]
  
  const passages = [
    {
      text: `The development of renewable energy technologies has accelerated dramatically in recent years. Solar panels have become increasingly efficient, with modern photovoltaic cells converting sunlight to electricity at rates exceeding 20%. Wind turbines have grown in size and power output, while battery storage solutions have improved significantly. These advances suggest that renewable energy will play a crucial role in addressing climate change and reducing dependence on fossil fuels. However, challenges remain in terms of infrastructure, cost, and energy storage capacity.`,
      topic: 'renewable energy',
      mainIdea: 'explain recent advances in renewable energy technologies and their potential impact'
    },
    {
      text: `Ancient civilizations developed sophisticated mathematical systems long before modern mathematics emerged. The Babylonians used a base-60 number system that still influences how we measure time and angles today. Egyptian mathematicians calculated the volume of pyramids with remarkable accuracy. Meanwhile, ancient Chinese scholars developed early forms of algebra and geometry. These achievements demonstrate that mathematical thinking has been fundamental to human civilization across cultures and time periods.`,
      topic: 'ancient mathematics',
      mainIdea: 'highlight the mathematical achievements of ancient civilizations'
    },
    {
      text: `The concept of neural plasticity has revolutionized our understanding of brain function. Scientists now recognize that the brain can reorganize itself by forming new neural connections throughout life. This adaptability allows people to learn new skills, recover from injuries, and adapt to changing environments. Research in this field has important implications for education, rehabilitation, and our understanding of cognitive development. The discovery challenges earlier beliefs that brain structure was fixed after childhood.`,
      topic: 'neural plasticity',
      mainIdea: 'describe how the brain can reorganize itself and the implications of this ability'
    },
    {
      text: `Urban planning increasingly focuses on creating walkable, sustainable communities. Mixed-use developments combine residential, commercial, and recreational spaces within close proximity. This design philosophy aims to reduce car dependency, promote social interaction, and improve quality of life. Cities implementing these principles often see benefits such as reduced traffic congestion, lower emissions, and stronger community bonds. However, successful implementation requires careful consideration of infrastructure, zoning laws, and community needs.`,
      topic: 'urban planning',
      mainIdea: 'discuss the principles and benefits of creating walkable, sustainable communities'
    },
    {
      text: `The study of linguistics reveals fascinating patterns in how languages evolve. Words and grammatical structures change over time through processes like semantic shift and grammatical simplification. Language contact between different cultures often leads to borrowing of vocabulary and sometimes grammatical features. These changes reflect broader social, technological, and cultural transformations. Understanding linguistic evolution helps us appreciate the dynamic nature of human communication and cultural exchange.`,
      topic: 'linguistic evolution',
      mainIdea: 'explain how and why languages change over time'
    },
  ]

  const passageData = passages[index % passages.length]
  let question = ''
  let options: string[] = []
  let correctAnswer = 0
  let explanation = ''
  let wrongAnswerExplanations: Record<number, string> = {}

  if (categoryInfo.category === 'reading-comprehension') {
    if (categoryInfo.subtopic === 'main-ideas') {
      question = `What is the author's primary purpose in this passage?`
      options = [
        `To ${passageData.mainIdea}`,
        `To argue against common misconceptions about ${passageData.topic}`,
        `To provide a historical timeline of ${passageData.topic}`,
        `To criticize current approaches to ${passageData.topic}`
      ]
      explanation = `The correct answer focuses on the main purpose: to ${passageData.mainIdea}. The passage provides information and insights rather than arguing, criticizing, or focusing solely on historical timeline.`
      wrongAnswerExplanations = {
        1: `The passage presents information objectively rather than arguing against misconceptions.`,
        2: `While history may be mentioned, it's not the primary focus of the passage.`,
        3: `The passage's tone is informative and explanatory, not critical.`
      }
    } else {
      question = `According to the passage, which of the following is true about ${passageData.topic}?`
      const details = [
        `It has undergone significant developments and changes`,
        `It has remained completely unchanged throughout history`,
        `It is irrelevant to modern society`,
        `It has been completely abandoned by researchers`
      ]
      options = details
      explanation = `The passage explicitly discusses developments, changes, and ongoing relevance of ${passageData.topic}, making the first option correct.`
      wrongAnswerExplanations = {
        1: `The passage clearly indicates change and development, not stagnation.`,
        2: `The passage demonstrates the continued relevance and importance of the topic.`,
        3: `Nothing in the passage suggests abandonment; rather, it shows continued interest and development.`
      }
    }
  } else if (categoryInfo.category === 'vocabulary') {
    if (categoryInfo.subtopic === 'context-clues') {
      question = `In the context of the passage, which word could best replace "fundamental" without changing the meaning?`
      options = ['essential', 'superficial', 'optional', 'decorative']
      correctAnswer = 0
      explanation = `"Essential" is the best synonym for "fundamental" in this context, both meaning basic and necessary.`
      wrongAnswerExplanations = {
        1: `"Superficial" means shallow or surface-level, the opposite of fundamental.`,
        2: `"Optional" means not required, contradicting the meaning of fundamental.`,
        3: `"Decorative" means ornamental, which doesn't convey the importance suggested by fundamental.`
      }
    } else {
      question = `The author's choice of words in describing ${passageData.topic} primarily conveys a tone that is:`
      options = ['informative and analytical', 'dismissive and critical', 'emotional and biased', 'humorous and casual']
      explanation = `The passage uses precise, factual language to inform and analyze, maintaining an objective academic tone.`
      wrongAnswerExplanations = {
        1: `The passage lacks dismissive or critical language; it presents information objectively.`,
        2: `The writing style is formal and fact-based, not emotional or biased.`,
        3: `The tone is serious and academic, not humorous or casual.`
      }
    }
  } else if (categoryInfo.category === 'rhetoric') {
    question = `Which rhetorical strategy does the author primarily use to support the main argument?`
    options = [
      'Providing specific examples and evidence',
      'Using emotional appeals and anecdotes',
      'Relying solely on personal opinions',
      'Attacking opposing viewpoints'
    ]
    explanation = `The author supports claims with specific examples, research findings, and factual evidence, making this the primary rhetorical strategy.`
    wrongAnswerExplanations = {
      1: `The passage relies on facts and examples, not emotional appeals or personal stories.`,
      2: `The argument is evidence-based, not opinion-based.`,
      3: `The passage presents information objectively without attacking other views.`
    }
  } else if (categoryInfo.category === 'synthesis') {
    question = `How does the information about ${passageData.topic} relate to broader themes in the passage?`
    options = [
      'It illustrates a specific example of the general principle being discussed',
      'It contradicts the main argument of the passage',
      'It provides irrelevant background information',
      'It serves only to fill space without adding meaning'
    ]
    explanation = `The discussion of ${passageData.topic} serves as a concrete example that supports and illustrates the passage's broader themes.`
    wrongAnswerExplanations = {
      1: `The information supports rather than contradicts the main argument.`,
      2: `All information in the passage is relevant to the main discussion.`,
      3: `The passage is carefully constructed; each element contributes to the overall meaning.`
    }
  } else {
    question = `Which quotation from the passage best supports the claim that ${passageData.topic} is significant?`
    const sentences = passageData.text.split('. ')
    options = [
      sentences[1] || sentences[0],
      'No evidence supports this claim',
      'The passage makes no such claim',
      'This claim is contradicted by the passage'
    ]
    explanation = `This sentence provides direct evidence of significance by discussing specific developments or impacts.`
    wrongAnswerExplanations = {
      1: `The passage clearly discusses significance; this option incorrectly claims otherwise.`,
      2: `The passage explicitly addresses the topic's importance.`,
      3: `The passage supports, not contradicts, the significance of the topic.`
    }
  }

  return {
    moduleType: 'reading-writing',
    difficulty,
    category: categoryInfo.category,
    subtopic: categoryInfo.subtopic,
    question,
    passage: passageData.text,
    options: JSON.stringify(options),
    correctAnswer,
    explanation,
    wrongAnswerExplanations: JSON.stringify(wrongAnswerExplanations),
    imageUrl: null,
    imageData: null,
    imageMimeType: null,
    imageAlt: null,
    chartData: null,
    timeEstimate: difficulty === 'easy' ? 75 : difficulty === 'medium' ? 105 : 135,
    source: 'DuckSAT Practice Generator',
    tags: [DUMMY_TAG, 'practice', 'auto-generated'],
    isActive: true,
    reviewStatus: 'approved',
    reviewRating: 4,
    diagramAccurate: null,
    reviewComments: 'Auto-generated practice question',
    reviewedBy: 'system',
    reviewedAt: new Date(),
  }
}

async function main() {
  console.log('🚀 Starting dummy question seeding...')
  console.log(`📌 Tag for removal: ${DUMMY_TAG}`)

  const questions = []

  // Generate 250 math questions
  console.log('📊 Generating 250 math questions...')
  for (let i = 0; i < 250; i++) {
    questions.push(generateMathQuestion(i))
  }

  // Generate 250 reading questions
  console.log('📖 Generating 250 reading questions...')
  for (let i = 0; i < 250; i++) {
    questions.push(generateReadingQuestion(i))
  }

  // Insert questions in batches to avoid overwhelming the database
  console.log('💾 Inserting questions into database...')
  const batchSize = 50
  let inserted = 0

  for (let i = 0; i < questions.length; i += batchSize) {
    const batch = questions.slice(i, i + batchSize)
    await prisma.question.createMany({
      data: batch,
      skipDuplicates: true,
    })
    inserted += batch.length
    console.log(`   ✓ Inserted ${inserted}/${questions.length} questions`)
  }

  console.log(`\n✅ Successfully seeded ${questions.length} dummy questions!`)
  console.log(`📝 To remove these questions later, run:`)
  console.log(`   npx tsx scripts/remove-dummy-questions.ts`)
  console.log(`\n📊 Distribution:`)
  console.log(`   - Math questions: 250`)
  console.log(`   - Reading questions: 250`)
  console.log(`   - Tag: ${DUMMY_TAG}`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding dummy questions:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
