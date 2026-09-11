// Chrome strings, one dictionary per locale. English is the source of truth;
// a new language is one more entry here plus a flag in base.njk — that is the
// whole contribution surface. Roadmap CONTENT pages are English-only (their
// source of truth is each repository's README), so these strings cover only
// the chrome pages: home, /roadmaps/, /projects/.
//
// Values ending in `Html` are trusted markup written in this file, not user
// input — they pass through `| safe` in the templates.

// Russian plural: 1 веха / 2 вехи / 5 вех. Works for any [one, few, many] triple.
function ruPlural(n, forms) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

export default {
  en: {
    code: 'en',
    label: 'English',
    paths: { home: '/', roadmaps: '/roadmaps/', projects: '/projects/' },
    nav: { roadmaps: 'Roadmaps', projects: 'Projects', star: 'Star on GitHub' },
    footer: {
      line1Html: 'proofstone — a community that keeps the craft · static site · no cookies, no personal data — anonymous analytics via <a href="https://umami.is" rel="noopener">Umami</a>',
      line2Html: 'content licensed per each roadmap’s repository · <a href="https://github.com/proofstone" rel="noopener">github.com/proofstone</a>',
    },
    home: {
      title: 'proofstone — a community that keeps the craft',
      description: 'AI is growing fast — and the small moments at the keyboard are disappearing. Proofstone is a community for people who don’t want to lose the craft: roadmaps, projects, and people, side by side with AI.',
      h1Html: 'We won’t say goodbye<br>to <span class="hw">"Hello World"</span>.',
      p1Html: 'AI is growing fast — and becoming a real engineer is getting harder, not easier. Code is written by hand less and less. The small moments at the keyboard are disappearing: the <b>"Aha!"</b> when you understand, the <b>"Wow, it works!"</b> when it runs. It is sad to say — soon, maybe nobody will write their own Hello World.',
      p2Html: '<b>Proofstone</b> is a community for people who don’t want to lose the craft. Roadmaps, projects, and people — so you become an engineer in this era, <b>side by side with AI</b>, not behind it.',
      cardsKicker: 'what’s inside',
      cards: {
        roadmaps: { title: 'Roadmaps', desc: 'Engineering maps where every milestone states, in advance, the artifact that closes it. No keyword lists.', tag: 'maps' },
        projects: { title: 'Projects', desc: 'Build-your-own labs: an agent, a SWIM test suite, an eval scorer validator. Written by hand, from scratch.', tag: 'labs' },
        foundations: { title: 'Foundations', desc: 'The bedrock: algorithms, networks, operating systems — the parts AI can’t feel for you.', tag: 'planned' },
        courses: { title: 'Courses', desc: 'Sequential courses with theory and checked tasks, from first principles up.', tag: 'planned' },
        challenges: { title: 'Challenges', desc: 'Break it, build it, prove it: hands-on challenges with a definite finish line.', tag: 'idea' },
        museum: { title: 'The Hello World Museum', desc: 'The first words of every language, kept alive — because someone should.', tag: 'idea' },
      },
    },
    roadmapsPage: {
      title: 'Roadmaps — proofstone',
      description: 'Five engineering maps. Every milestone states, in advance, the artifact that closes it — you are done when the artifact exists, not when the reading does.',
      crumb: 'roadmaps',
      h1: 'Roadmaps',
      intro: 'Five engineering maps. Every milestone states, in advance, the artifact that closes it — you are done when the artifact exists, not when the reading does.',
      privateNote: 'Private until published.',
      live: 'live', review: 'in review',
      milestonesWord: () => 'milestones',
      flagshipWord: () => 'flagship',
      countsHtml: (maps, milestones, live, review) =>
        `<b>${maps}</b> maps · <b>${milestones}</b> milestones · <b>${live}</b> live · <b>${review}</b> in practitioner review`,
      labWord: 'lab',
    },
    projectsPage: {
      title: 'Projects — proofstone',
      description: 'Build-your-own labs: understand it by building it from scratch, by hand. Each lab states what you build and how it is checked.',
      crumb: 'projects',
      h1: 'Projects',
      intro: 'Understand it by building it — from scratch, by hand. Each lab states what you build and how it is checked: a grading suite, a running program, a test set. No lab is finished by reading about it.',
      countsHtml: (labs) => `<b>${labs}</b> labs · <b>${labs}</b> live · checked by machines, not opinions`,
    },
  },

  ru: {
    code: 'ru',
    label: 'Русский',
    paths: { home: '/ru/', roadmaps: '/ru/roadmaps/', projects: '/ru/projects/' },
    nav: { roadmaps: 'Роадмапы', projects: 'Проекты', star: 'Звезда на GitHub' },
    footer: {
      line1Html: 'proofstone — сообщество, которое хранит ремесло · статический сайт · без cookies и персональных данных — анонимная аналитика через <a href="https://umami.is" rel="noopener">Umami</a>',
      line2Html: 'лицензия контента — в репозитории каждого роадмапа · <a href="https://github.com/proofstone" rel="noopener">github.com/proofstone</a>',
    },
    home: {
      title: 'proofstone — сообщество, которое хранит ремесло',
      description: 'ИИ развивается молниеносно — а те самые моменты за клавиатурой исчезают. Proofstone — сообщество тех, кто не хочет терять ремесло: роадмапы, проекты и люди, бок о бок с ИИ.',
      h1Html: 'Мы не попрощаемся<br>с <span class="hw">"Hello World"</span>.',
      p1Html: 'ИИ развивается молниеносно — а стать настоящим инженером всё сложнее, не проще. Код всё реже пишут руками. Исчезают те самые моменты за клавиатурой: <b>«Ага!»</b>, когда понял, и <b>«Вау, работает!»</b>, когда получилось. Грустно признать — возможно, скоро никто не напишет свой Hello World.',
      p2Html: '<b>Proofstone</b> — сообщество тех, кто не хочет терять ремесло. Роадмапы, проекты и люди — чтобы ты стал инженером в эту эпоху и шёл <b>бок о бок с ИИ</b>, а не позади него.',
      cardsKicker: 'что внутри',
      cards: {
        roadmaps: { title: 'Роадмапы', desc: 'Инженерные карты, где каждая веха заранее называет артефакт, который её закрывает. Никаких списков ключевых слов.', tag: 'карт' },
        projects: { title: 'Проекты', desc: 'Лабы build-your-own: агент, тест-суита SWIM, валидатор eval-скорера. Руками, с нуля.', tag: 'лабы' },
        foundations: { title: 'Основы', desc: 'Фундамент: алгоритмы, сети, операционные системы — то, что ИИ не почувствует за тебя.', tag: 'план' },
        courses: { title: 'Курсы', desc: 'Последовательные курсы с теорией и проверяемыми задачами — от первых принципов вверх.', tag: 'план' },
        challenges: { title: 'Челленджи', desc: 'Сломай, собери, докажи: практические испытания с чётким финишем.', tag: 'идея' },
        museum: { title: 'Музей Hello World', desc: 'Первые слова каждого языка программирования — сохраним их живыми.', tag: 'идея' },
      },
    },
    roadmapsPage: {
      title: 'Роадмапы — proofstone',
      description: 'Пять инженерных карт. Каждая веха заранее называет артефакт, который её закрывает: готово — когда артефакт существует, а не когда дочитал.',
      crumb: 'роадмапы',
      h1: 'Роадмапы',
      intro: 'Пять инженерных карт. Каждая веха заранее называет артефакт, который её закрывает: готово — когда артефакт существует, а не когда дочитал.',
      privateNote: 'Приватно до публикации.',
      live: 'live', review: 'на ревью',
      milestonesWord: (n) => ruPlural(n, ['веха', 'вехи', 'вех']),
      flagshipWord: (n) => ruPlural(n, ['флагманская', 'флагманские', 'флагманских']),
      countsHtml: (maps, milestones, live, review) =>
        `<b>${maps}</b> карт · <b>${milestones}</b> ${ruPlural(milestones, ['веха', 'вехи', 'вех'])} · <b>${live}</b> живые · <b>${review}</b> на ревью у практиков`,
      labWord: 'лаба',
      // Карточные строки роадмапов: EN живёт в roadmaps.config (источник),
      // русский — здесь, по слагу. Новый роадмап без строки здесь падает на
      // сборке /ru/ — это желаемое поведение, а не пропуск.
      cardLines: {
        'ai-safety-engineer': 'Эвалы, ред-тиминг, гардрейлы, безопасность агентов.',
        'distributed-systems-engineer': 'Консенсус, репликация, детекция отказов.',
        'applied-cryptography': 'Сломай в Cryptopals и CryptoHack, потом сделай правильно.',
        'robotics-software-engineer': 'Перенеси то, что уже умеешь; уважай то, что действительно другое.',
        'pcb-design': 'Карта для платы, а не для прошивки на ней.',
      },
      labNotes: {
        'distributed-systems-engineer': 'swim-lab — веха §4.1, ставшая исполняемой: ты реализуешь SWIM, детерминированная суита оценивает.',
      },
    },
    projectsPage: {
      title: 'Проекты — proofstone',
      description: 'Лабы build-your-own: пойми, построив с нуля, руками. Каждая лаба говорит, что ты строишь и как это проверяется.',
      crumb: 'проекты',
      h1: 'Проекты',
      intro: 'Пойми, построив — с нуля, руками. Каждая лаба говорит, что ты строишь и как это проверяется: оценивающая суита, работающая программа, набор тестов. Ни одна лаба не закрывается чтением.',
      countsHtml: (labs) => `<b>${labs}</b> лабы · <b>${labs}</b> живые · проверяют машины, а не мнения`,
    },
  },
};
