// Course demos (docs/DEMOS.md). The slug is a permanent address (/teaching/demos/<slug>/), printed
// in lecture slides and QR codes: never rename one without a redirect.
// Plain data only (the content validator imports this file under Node). The interactive parts are
// listed in src/demos/loaders.ts; a demo without one shows its static fallback (title, text and a
// screenshot) everywhere.
export interface DemoInfo {
  slug: string;
  title: string;
  /** label of its chip in the Teaching page's "Try it" section */
  short: string;
  /** course id in courses.yml */
  course: string;
  /** the one thing a student should discover */
  learningPoint: string;
  /** one or two sentences under the title (trusted HTML) */
  intro: string;
  /** short explanations below the demo: what it does, and how it relates to the real thing */
  notes: { title: string; html: string }[];
  /** data files in public/demos/<slug>/, fetched when the demo becomes visible */
  files: string[];
}

export const demos: DemoInfo[] = [
  {
    slug: 'next-word',
    title: 'Guess the next word',
    short: 'Guess the next word',
    course: 'traki',
    learningPoint:
      'A language model predicts the next word from counts of what followed before. More context makes it fluent, and soon it copies its training text.',
    intro:
      "This is a language model in its simplest form. It has counted which word follows which in <em>Alice's Adventures in Wonderland</em> and continues your text one word at a time.",
    notes: [
      {
        title: 'How it works.',
        html: "The model counted which word follows each word, or each pair of words, in Lewis Carroll's book (1865, public domain, about 30,000 words). It picks the next word at random in proportion to those counts. A low temperature favors the most frequent words, so the text repeats itself. A high temperature makes rare words more likely, so the text becomes more diverse but less coherent.",
      },
      {
        title: 'Large language models.',
        html: 'In a slightly simplified picture, they also do the same next token prediction. They use a learned network in place of a count table, far more text and a context of thousands of words. Switch to two words of context and watch how quickly the model starts copying the book. Memorization is an open question for large models too.',
      },
    ],
    files: ['alice-tokens.txt'],
  },
  {
    slug: 'watch-it-forget',
    title: 'Watch it forget',
    short: 'Watch it forget',
    course: 'llml',
    learningPoint:
      'Catastrophic forgetting, and the stability–plasticity trade-off of two remedies.',
    intro:
      'A small neural network first learns task A, then continues only on task B data. In both tasks it has to separate orange points from teal points. In task A, on the left, the orange points are in the upper half. In task B, on the right, they are in the lower half. Learning B the simple way destroys A. The goal is a network that still solves task A after it has learned task B.',
    notes: [
      {
        title: 'What you are observing.',
        html: "The network has two hidden layers of 16 units and trains live in your browser on 60 points per task. Training on B uses only B's points. The error on task A is no longer part of the training, so the weights that solved A are overwritten. This is called catastrophic forgetting.",
      },
      {
        title: 'Two possibilities to alleviate forgetting.',
        html: 'Replay mixes a few remembered points from A into training. Elastic weight consolidation (EWC) penalizes changes to the weights that mattered most for A. Its strength decides between remembering and learning, which is known as the stability–plasticity dilemma.',
      },
    ],
    files: [],
  },
  {
    slug: 'training-footprint',
    title: 'Training footprint',
    short: 'Training footprint',
    course: 'nai',
    learningPoint:
      'The source of the electricity and the number of runs dominate the footprint of training, and the estimate is a lower bound.',
    intro:
      'Estimate the electricity and emissions of training a model on GPUs. Then change one thing at a time and see which choices matter most.',
    notes: [
      {
        title: 'What our demo simplifies.',
        html: "Only the GPUs and the data center's overhead are counted. Processors, memory, storage and networking add more, and so does manufacturing the hardware. The result is a lower bound for comparing choices and should thus not be read as a measurement.",
      },
      {
        title: 'Sources.',
        html: 'The German mix of 2024 is 363 g CO₂/kWh, an estimate by the <a href="https://www.umweltbundesamt.de/themen/co2-emissionen-pro-kilowattstunde-strom-2024">Umweltbundesamt</a>. The EU mix of 2024 is 211 g CO₂e/kWh, from <a href="https://ourworldindata.org/grapher/carbon-intensity-electricity">Ember via Our World in Data</a>. Wind, solar, gas and coal are lifecycle medians from IPCC AR5 (2014), Annex III. The average data center overhead (PUE) of 1.56 in 2024 is from the Uptime Institute global survey. GPU power is the manufacturers\' rated board power.',
      },
    ],
    files: [],
  },
  {
    slug: 'step-through-python',
    title: 'Step through Python',
    short: 'Step through Python',
    course: 'python',
    learningPoint: 'Names refer to objects, and assignment never copies.',
    intro:
      'Four short programs that surprise most beginners. Guess what each one prints, then step through it line by line and watch which names point to which objects.',
    notes: [],
    files: [],
  },
  {
    slug: 'data-to-noise',
    title: 'From data to noise',
    short: 'From data to noise',
    course: 'dgm',
    learningPoint:
      'The forward diffusion process blends data into Gaussian noise, and a model learns the reverse.',
    intro:
      'A diffusion model gradually blends data with Gaussian noise. Drag the slider right to watch the two crescents dissolve. A trained model learns to walk this path in reverse, turning fresh noise into new samples.',
    notes: [
      {
        title: 'The process.',
        html: 'Each point follows x<sub>t</sub> = √ᾱ<sub>t</sub> · x<sub>0</sub> + √(1 − ᾱ<sub>t</sub>) · ε, with a cosine noise schedule.',
      },
    ],
    files: [],
  },
  {
    slug: 'leaderboard-depends-on-you',
    title: 'The leaderboard depends on you',
    short: 'The leaderboard depends on you',
    course: 'sem-lifelong',
    learningPoint:
      'One leaderboard number hides trade-offs. Which method comes out best depends on what you ask of it, so read the evaluation before the claim.',
    intro:
      'Research papers often rank methods on a leaderboard by a single number such as accuracy. A method can be accurate and still forget quickly or need a lot of memory. In this demo you compare four continual learning methods. Choose what matters to you and watch the ranking change. The points of view are ready-made choices, from counting accuracy only to weighing all five properties equally.',
    notes: [
      {
        title: 'What you are observing.',
        html: "The four methods and their scores are made up to show the idea. They do not measure real methods. Each method's score is the average of its five properties, weighted by how much you say each one matters.",
      },
      {
        title: 'Why it matters.',
        html: 'Papers often report a single number such as average accuracy. Continual learning trades accuracy against forgetting, memory, compute and the data it keeps. Which method is best depends on what it is for. Our <a href="/publications/#mundt2022clevacompass">CLEVA-Compass</a> (ICLR 2022) is a way to report such dimensions side by side, which makes comparisons transparent.',
      },
    ],
    files: [],
  },
  {
    slug: 'does-efficiency-save-energy',
    title: 'Does efficiency save energy?',
    short: 'Does efficiency save energy?',
    course: 'sem-sustainability',
    learningPoint:
      'An efficiency gain per query says little about the total footprint until you ask how usage responds. Savings can shrink, vanish or turn into growth.',
    intro:
      'Efficiency is often presented as the answer to AI’s energy use. A model that needs half the energy per query also makes each query cheaper, and cheaper queries tend to be used more. Guess what a twice as efficient model does to the total energy, then see when the promise of saving holds.',
    notes: [
      {
        title: 'The model.',
        html: 'Usage responds to the cost of a query with a constant strength <em>e</em>, and the cost of a query is taken to follow its energy. Total energy is then 2<sup><em>e</em> − 1</sup> times today’s. It falls below today’s level only while <em>e</em> is smaller than 1.',
      },
      {
        title: 'In reality.',
        html: 'This is a textbook simplification. How strongly the use of AI responds to cheaper queries is debated and cannot be known in advance, so it has to be measured. The effect is known as Jevons’ paradox. William Stanley Jevons first described it for coal in <em>The Coal Question</em> (1865).',
      },
    ],
    files: [],
  },
  {
    slug: 'dial-in',
    title: 'Dial in the espresso',
    short: 'Dial in the espresso',
    course: 'mocca',
    learningPoint:
      'With few, noisy measurements, a model has to balance trusting its predictions against collecting data where it is unsure.',
    intro:
      'Dialing in an espresso means finding the grind setting and the amount of coffee that give a good shot. This demo treats it as a machine learning problem. A small model learns from every shot you brew and predicts how other settings would turn out. It then suggests what to try next, either where it expects a good shot or where it is least certain.',
    notes: [
      {
        title: 'What you are observing.',
        html: 'The grinder and espresso machine are simulated. Only their directions are real. A finer grind or more coffee makes a slower shot, and no two shots are quite the same. A pull of 20 to 35 seconds with about twice the dose in the cup is a common rule of thumb.',
      },
      {
        title: 'The model.',
        html: 'A Gaussian process predicts the pull time for every setting from the shots so far and says how sure it is. Its best guess aims for the highest chance of a good shot. Exploring goes where it is least sure. After a new bean, earlier shots count only as rough hints.',
      },
      {
        title: 'In the project.',
        html: 'In the MOCCA project, students build this loop with real hardware. A camera first reads the bean package. The grinder and the espresso machine then brew a shot, which a Bluetooth scale measures. Machine learning models running on a small NVIDIA Jetson board use these measurements to suggest the settings for the next shot. We look at this through the lens of continual learning, with integrated feedback loops on taste assessments and the individualization of brewing preferences.',
      },
    ],
    files: [],
  },
];

export const demoSlugs = new Set(demos.map((d) => d.slug));
export const demoBySlug = new Map(demos.map((d) => [d.slug, d]));
