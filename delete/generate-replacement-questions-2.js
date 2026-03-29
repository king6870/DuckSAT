/**
 * Additional 13 grammar questions to complete the 51-question replacement batch
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const questions = [
  {
    moduleType: 'reading-writing',
    difficulty: 'easy',
    category: 'grammar',
    subtopic: 'subject-verb-agreement',
    question: 'Which choice completes the text so that it conforms to the conventions of Standard English?',
    passage: 'The local bakery has expanded its menu to include gluten-free options. A variety of freshly baked breads and pastries _______ available every morning before nine. Customers have praised the new selections.',
    options: JSON.stringify(["A) is","B) are","C) were","D) have been"]),
    correctAnswer: 0,
    explanation: '"A variety" is a singular subject. Though it refers to multiple items, the noun "variety" is grammatically singular and takes the singular verb "is."',
    wrongAnswerExplanations: JSON.stringify({"B":"Are is commonly used informally, but a variety takes a singular verb in standard English.","C":"Were is past tense and does not match the present-tense context.","D":"Have been is plural and does not agree with the singular subject."}),
    timeEstimate: 60,
  },
  {
    moduleType: 'reading-writing',
    difficulty: 'medium',
    category: 'grammar',
    subtopic: 'subject-verb-agreement',
    question: 'Which choice completes the text so that it conforms to the conventions of Standard English?',
    passage: 'The council debated the proposal for nearly three hours. Every one of the representatives _______ the opportunity to voice concerns before the final vote was called.',
    options: JSON.stringify(["A) was given","B) were given","C) have been given","D) are given"]),
    correctAnswer: 0,
    explanation: '"Every one" is singular and requires a singular verb. "Was given" agrees with the singular subject.',
    wrongAnswerExplanations: JSON.stringify({"B":"Were given is plural and does not agree with every one.","C":"Have been given is plural present perfect and does not agree.","D":"Are given is plural present tense and does not agree."}),
    timeEstimate: 75,
  },
  {
    moduleType: 'reading-writing',
    difficulty: 'easy',
    category: 'grammar',
    subtopic: 'pronoun-clarity',
    question: 'Which choice completes the text so that it conforms to the conventions of Standard English?',
    passage: 'The orchestra has been rehearsing for the upcoming concert series. The conductor wants _______ musicians to arrive at least one hour before each performance to warm up and review the program.',
    options: JSON.stringify(["A) the","B) its","C) their","D) her"]),
    correctAnswer: 0,
    explanation: '"The" is the most precise choice here, clearly specifying which musicians without introducing pronoun ambiguity.',
    wrongAnswerExplanations: JSON.stringify({"B":"Its would be grammatically awkward before musicians in this context.","C":"Their is plural and could create ambiguity about whose musicians.","D":"Her assumes the conductor is female, which is not established."}),
    timeEstimate: 60,
  },
  {
    moduleType: 'reading-writing',
    difficulty: 'medium',
    category: 'grammar',
    subtopic: 'pronoun-clarity',
    question: 'Which choice completes the text so that it conforms to the conventions of Standard English?',
    passage: 'The two researchers presented contrasting interpretations of the archaeological evidence. While Rivera argued that the artifacts indicated long-distance trade, _______ maintained that they were produced locally using imported raw materials.',
    options: JSON.stringify(["A) Thompson","B) she","C) the other one","D) they"]),
    correctAnswer: 0,
    explanation: 'Using the specific name "Thompson" avoids ambiguity. "She" could refer to either researcher, and "they" is unclear.',
    wrongAnswerExplanations: JSON.stringify({"B":"She is ambiguous since both researchers could be female.","C":"The other one is vague and informal for academic writing.","D":"They could refer to both researchers or to an outside group."}),
    timeEstimate: 75,
  },
  {
    moduleType: 'reading-writing',
    difficulty: 'easy',
    category: 'grammar',
    subtopic: 'punctuation',
    question: 'Which choice completes the text so that it conforms to the conventions of Standard English?',
    passage: 'The veterinarian examined the injured hawk and determined that its wing was broken. She carefully wrapped the _______ wing in a splint and placed the bird in a recovery cage.',
    options: JSON.stringify(["A) bird's","B) birds","C) birds'","D) bird"]),
    correctAnswer: 0,
    explanation: `"Bird's" is the correct singular possessive form, showing the wing belongs to the bird.`,
    wrongAnswerExplanations: JSON.stringify({"B":"Birds is a plural noun, but only one bird is discussed.","C":"Birds' is the plural possessive, but only one bird is discussed.","D":"Bird without an apostrophe does not show possession."}),
    timeEstimate: 60,
  },
  {
    moduleType: 'reading-writing',
    difficulty: 'hard',
    category: 'grammar',
    subtopic: 'punctuation',
    question: 'Which choice completes the text so that it conforms to the conventions of Standard English?',
    passage: 'The novelist drew inspiration from a wide range of sources: classical mythology, modernist poetry, and folk traditions from her native region. Her debut _______ which interweaves all three influences, was shortlisted for two major literary awards.',
    options: JSON.stringify(["A) novel,","B) novel;","C) novel","D) novel:"]),
    correctAnswer: 0,
    explanation: 'A comma before the nonrestrictive clause "which interweaves all three influences" is required. The clause provides additional, non-essential information about the novel.',
    wrongAnswerExplanations: JSON.stringify({"B":"A semicolon is used to separate independent clauses, not to introduce a relative clause.","C":"Without a comma, the sentence runs together and the relative clause is improperly attached.","D":"A colon does not introduce a relative clause."}),
    timeEstimate: 90,
  },
  {
    moduleType: 'reading-writing',
    difficulty: 'easy',
    category: 'grammar',
    subtopic: 'verb-tense',
    question: 'Which choice completes the text so that it conforms to the conventions of Standard English?',
    passage: 'The city park hosts a farmers market every Saturday from May through October. Last Saturday, a local beekeeper _______ samples of wildflower honey to visitors passing by her stand.',
    options: JSON.stringify(["A) offered","B) offers","C) had offered","D) is offering"]),
    correctAnswer: 0,
    explanation: '"Last Saturday" signals a specific completed past event. The simple past tense "offered" is the correct choice.',
    wrongAnswerExplanations: JSON.stringify({"B":"Offers is simple present and contradicts last Saturday.","C":"Had offered is past perfect and unnecessarily complex for a straightforward past event.","D":"Is offering is present progressive and contradicts the past time marker."}),
    timeEstimate: 60,
  },
  {
    moduleType: 'reading-writing',
    difficulty: 'hard',
    category: 'grammar',
    subtopic: 'verb-tense',
    question: 'Which choice completes the text so that it conforms to the conventions of Standard English?',
    passage: 'The architectural firm submitted preliminary designs in January. By the time the city council approves the final budget next month, the firm _______ the blueprints three times to accommodate changes in building codes and zoning regulations.',
    options: JSON.stringify(["A) will have revised","B) revised","C) has revised","D) revises"]),
    correctAnswer: 0,
    explanation: '"By the time...next month" indicates a future deadline. "Will have revised" (future perfect) correctly indicates an action that will be completed before a future point.',
    wrongAnswerExplanations: JSON.stringify({"B":"Revised is simple past and does not fit the future timeline.","C":"Has revised is present perfect and does not fit the future context.","D":"Revises is simple present and does not convey the anticipated completion."}),
    timeEstimate: 90,
  },
  {
    moduleType: 'reading-writing',
    difficulty: 'easy',
    category: 'grammar',
    subtopic: 'sentence-structure',
    question: 'Which choice completes the text so that it conforms to the conventions of Standard English?',
    passage: 'The summer reading program encourages children to read widely. Participants are asked to read fiction, nonfiction, and _______. Those who complete the challenge receive a certificate and a free book.',
    options: JSON.stringify(["A) poetry","B) reading poetry","C) to read poetry","D) they read poetry"]),
    correctAnswer: 0,
    explanation: 'The list uses single noun categories: "fiction" and "nonfiction." "Poetry" maintains the parallel single-noun structure.',
    wrongAnswerExplanations: JSON.stringify({"B":"Reading poetry is a gerund phrase and breaks the noun pattern.","C":"To read poetry is an infinitive phrase and breaks the parallel structure.","D":"They read poetry is a full clause and breaks the list pattern entirely."}),
    timeEstimate: 60,
  },
  {
    moduleType: 'reading-writing',
    difficulty: 'hard',
    category: 'grammar',
    subtopic: 'sentence-structure',
    question: 'Which choice completes the text so that it conforms to the conventions of Standard English?',
    passage: 'The documentary explores how rising sea levels threaten coastal communities, _______, and force governments to reconsider long-term infrastructure investments in vulnerable areas.',
    options: JSON.stringify(["A) displace wildlife populations","B) wildlife populations are displaced","C) displacing wildlife populations","D) the displacement of wildlife populations"]),
    correctAnswer: 0,
    explanation: 'The series uses present-tense verbs sharing the subject "rising sea levels": "threaten," "displace," and "force." "Displace wildlife populations" maintains the parallel verb structure.',
    wrongAnswerExplanations: JSON.stringify({"B":"A passive clause breaks the active parallel verb structure.","C":"A gerund phrase breaks the finite verb pattern established by threaten and force.","D":"A noun phrase breaks the verb pattern entirely."}),
    timeEstimate: 90,
  },
  {
    moduleType: 'reading-writing',
    difficulty: 'medium',
    category: 'grammar',
    subtopic: 'punctuation',
    question: 'Which choice completes the text so that it conforms to the conventions of Standard English?',
    passage: 'The biologist spent three weeks observing the wolf pack in Yellowstone. She noted several interesting _______ the alpha pair shared hunting duties equally, younger wolves took turns watching the pups, and the entire pack cooperated during harsh weather.',
    options: JSON.stringify(["A) behaviors:","B) behaviors,","C) behaviors;","D) behaviors."]),
    correctAnswer: 0,
    explanation: 'A colon introduces a list or explanation that follows a complete independent clause. The sentence before the colon is a complete thought, and the colon introduces the specific behaviors observed.',
    wrongAnswerExplanations: JSON.stringify({"B":"A comma is too weak to introduce a list after an independent clause.","C":"A semicolon joins two independent clauses and is not standard for introducing a list.","D":"A period would separate the behaviors from the sentence that introduces them, losing cohesion."}),
    timeEstimate: 75,
  },
  {
    moduleType: 'reading-writing',
    difficulty: 'hard',
    category: 'grammar',
    subtopic: 'pronoun-clarity',
    question: 'Which choice completes the text so that it conforms to the conventions of Standard English?',
    passage: 'The orchestra and the ballet company performed together for the first time last season. Critics noted that _______ collaboration elevated both the musical and visual dimensions of the production, creating an experience that neither group could have achieved independently.',
    options: JSON.stringify(["A) the","B) its","C) their","D) this"]),
    correctAnswer: 2,
    explanation: '"Their" correctly refers to the plural antecedent of the orchestra and the ballet company together. The collaboration belongs to both groups.',
    wrongAnswerExplanations: JSON.stringify({"A":"The is an article and does not establish a possessive connection to the two groups.","B":"Its is singular and cannot refer to two separate entities.","D":"This is a demonstrative pronoun that does not convey possession."}),
    timeEstimate: 90,
  },
  {
    moduleType: 'reading-writing',
    difficulty: 'medium',
    category: 'grammar',
    subtopic: 'verb-tense',
    question: 'Which choice completes the text so that it conforms to the conventions of Standard English?',
    passage: 'The software company released a major update last Tuesday that addressed several security vulnerabilities. Since then, the development team _______ on implementing additional features requested by enterprise clients.',
    options: JSON.stringify(["A) has been working","B) worked","C) works","D) had been working"]),
    correctAnswer: 0,
    explanation: '"Since then" signals an action that started in the past and continues to the present, requiring the present perfect progressive "has been working."',
    wrongAnswerExplanations: JSON.stringify({"B":"Worked is simple past and does not convey the ongoing nature signaled by since then.","C":"Works is simple present and does not connect to the starting point.","D":"Had been working is past perfect progressive and would require another past event as a reference."}),
    timeEstimate: 75,
  },
];

(async () => {
  console.log('Inserting ' + questions.length + ' additional grammar questions...');
  
  let inserted = 0;
  let errors = 0;

  for (const q of questions) {
    try {
      await prisma.question.create({
        data: {
          moduleType: q.moduleType,
          difficulty: q.difficulty,
          category: q.category,
          subtopic: q.subtopic,
          question: q.question,
          passage: q.passage,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          wrongAnswerExplanations: q.wrongAnswerExplanations,
          timeEstimate: q.timeEstimate,
          tags: '["grammar","SAT","conventions"]',
          source: 'Manual - bracket fix replacement batch',
          isActive: true,
          isReserved: false,
          reviewStatus: 'approved',
        },
      });
      inserted++;
    } catch (e) {
      errors++;
      console.error('Error: ' + e.message);
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log('Inserted: ' + inserted);
  console.log('Errors: ' + errors);

  const total = await prisma.question.count({
    where: { source: 'Manual - bracket fix replacement batch' },
  });
  console.log('Total replacement questions in DB: ' + total);

  await prisma.$disconnect();
})().catch(function(e) { console.error(e); process.exit(1); });
