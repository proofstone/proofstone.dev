// The labs of /projects/. Editorial facts (test counts, component counts) are
// stated here the way cardLines are stated in roadmaps.config: copy, owned by
// this file, reviewed when a lab changes. The list's LENGTH is the number every
// template computes from — nothing hardcodes "3".
// All three URLs verified live 2026-09-11.
export default [
  {
    slug: 'build-your-own-agent',
    kind: 'index',
    url: 'https://github.com/TheSeydiCharyyev/build-your-own-agent',
    repoPath: 'TheSeydiCharyyev/build-your-own-agent',
    i18n: {
      en: {
        title: 'Build your own agent',
        desc: 'An index, not a map: for each of the ten components of the agent stack it points at the best from-scratch tutorials that exist — and ships a runnable reference of its own for the three where none did: MCP server and client, coding agent, token accounting.',
        metaHtml: '<span class="n">10</span> components · <span class="n">3</span> reference builds · zero dependencies, no API key',
      },
      ru: {
        title: 'Собери своего агента',
        desc: 'Индекс, а не карта: для каждого из десяти компонентов агентного стека он указывает лучшие туториалы «с нуля» — а для трёх, где их не было, несёт собственную работающую реализацию: MCP-сервер и клиент, кодинг-агент, учёт токенов.',
        metaHtml: '<span class="n">10</span> компонентов · <span class="n">3</span> референс-реализации · ноль зависимостей, без API-ключа',
      },
    },
  },
  {
    slug: 'swim-lab',
    kind: 'lab',
    url: 'https://github.com/proofstone/swim-lab',
    repoPath: 'proofstone/swim-lab',
    i18n: {
      en: {
        title: 'SWIM lab',
        desc: 'The §4.1 milestone of the Distributed Systems map, made executable: you implement the SWIM membership protocol; a deterministic suite grades your implementation. Green means done.',
        metaHtml: 'SWIM protocol · deterministic grading suite',
      },
      ru: {
        title: 'Лаба SWIM',
        desc: 'Веха §4.1 карты Distributed Systems, ставшая исполняемой: ты реализуешь протокол членства SWIM, детерминированная суита оценивает твою реализацию. Зелёное — значит готово.',
        metaHtml: 'протокол SWIM · детерминированная оценивающая суита',
      },
    },
  },
  {
    slug: 'scorer-validation',
    kind: 'tool',
    url: 'https://github.com/proofstone/ai-safety-engineer-roadmap/tree/main/reference/scorer-validation',
    repoPath: 'ai-safety-engineer-roadmap/reference/scorer-validation',
    i18n: {
      en: {
        title: 'Scorer validation',
        desc: 'A validator for your Inspect scorer, from the AI Safety map: run it against your scorer and see exactly which cases it misjudges — before your eval does.',
        metaHtml: '<span class="n">23</span> tests · stdlib-only',
      },
      ru: {
        title: 'Валидация скорера',
        desc: 'Валидатор твоего Inspect-скорера из карты AI Safety: прогони его против своего скорера и увидь, какие случаи он судит неверно — раньше, чем это увидит твой eval.',
        metaHtml: '<span class="n">23</span> теста · только stdlib',
      },
    },
  },
];
