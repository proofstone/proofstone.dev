// Professions on /become/ that have no map yet. Each one is a card without a
// page (honest navigation) and an OPEN SHELF: the owner or a contributor brings
// the map, and the card becomes a link the day it is live (owner's rule,
// 2026-10-24 — "I will not be the only one adding; contributors will too").
// The live professions are the roadmaps — they come from roadmaps.config.mjs,
// not from here. Every entry names its shelf (`area`, `direction`, declared in
// src/_data/areas.js); a card without a shelf fails the build.
//
// Fields: `path` — the courses the map is assembled from, in order (becomes
// links as courses go live); `stack` — the technologies named instead, while
// no course path exists; `requires` — the entry condition stated before the
// first step (null = from zero).
export default [
  // ── Web ───────────────────────────────────────────────────────────────────
  {
    slug: 'frontend-developer',
    title: 'Frontend developer',
    desc: 'The part of the web people see and touch: pages, layouts, interfaces.',
    // Phase 2 of the plan (proofstone/proofstone.dev#1): the pilot map.
    path: ['HTML & CSS', 'JavaScript', 'TypeScript', 'React'],
    requires: null,
    status: 'planned',
    area: 'software-engineering',
    direction: 'web'
  },
  {
    slug: 'backend-developer',
    title: 'Backend developer',
    desc: 'Servers, data and APIs: everything that runs behind the page.',
    stack: ['Python', 'Node.js', 'Java', 'Go'],
    requires: null,
    status: 'planned',
    area: 'software-engineering',
    direction: 'web'
  },
  {
    slug: 'full-stack-developer',
    title: 'Full-stack developer',
    desc: 'Both sides of a web app, on one stack.',
    stack: ['MERN', 'Django + React'],
    requires: null,
    status: 'planned',
    area: 'software-engineering',
    direction: 'web'
  },
  {
    slug: 'web-tooling-engineer',
    title: 'Web tooling engineer',
    desc: 'The tools web developers build with: bundlers, compilers, linters, frameworks.',
    stack: ['TypeScript', 'Rust', 'Go'],
    requires: 'you already write TypeScript and have shipped a web app',
    status: 'planned',
    area: 'software-engineering',
    direction: 'web'
  },
  {
    slug: 'web-performance-engineer',
    title: 'Web performance engineer',
    desc: 'Speed: Core Web Vitals, loading, rendering — measured, then fixed.',
    stack: ['JavaScript', 'browser APIs', 'profilers'],
    requires: 'you already build web pages',
    status: 'planned',
    area: 'software-engineering',
    direction: 'web'
  },
  {
    slug: 'accessibility-engineer',
    title: 'Accessibility engineer',
    desc: 'The web for everyone: WCAG, screen readers, the keyboard.',
    stack: ['HTML', 'ARIA', 'assistive-technology testing'],
    requires: 'you already write HTML and CSS',
    status: 'planned',
    area: 'software-engineering',
    direction: 'web'
  },
  {
    slug: 'design-systems-engineer',
    title: 'Design systems engineer',
    desc: 'The component library and the tokens a whole product is built from.',
    stack: ['TypeScript', 'React / Vue', 'Storybook'],
    requires: 'you already build interfaces in a component framework',
    status: 'planned',
    area: 'software-engineering',
    direction: 'web'
  },
  {
    slug: 'creative-webgl-developer',
    title: 'Creative / WebGL developer',
    desc: '3D, graphics and interaction in the browser.',
    stack: ['WebGL', 'Three.js', 'shaders'],
    requires: 'you already write JavaScript; the math comes along the way',
    status: 'planned',
    area: 'software-engineering',
    direction: 'web'
  },
  {
    slug: 'qa-automation-engineer',
    title: 'QA automation engineer',
    desc: 'Tests that run themselves, for web applications.',
    stack: ['Playwright', 'Cypress', 'TypeScript'],
    requires: null,
    status: 'planned',
    area: 'software-engineering',
    direction: 'web'
  },
  {
    slug: 'technical-seo-engineer',
    title: 'Technical SEO engineer',
    desc: 'Indexing, structured data, rendering for crawlers.',
    stack: ['HTML', 'server-side rendering', 'structured data'],
    requires: 'you already build web pages',
    status: 'planned',
    area: 'software-engineering',
    direction: 'web'
  },
  // ── Mobile (filled out 2026-11-02, owner's pick: all six) ─────────────────
  {
    slug: 'ios-developer',
    title: 'iOS developer',
    desc: 'Apps for the iPhone and iPad — and on to the watch and the headset.',
    stack: ['Swift', 'SwiftUI', 'UIKit'],
    requires: null,
    status: 'planned',
    area: 'software-engineering',
    direction: 'mobile'
  },
  {
    slug: 'android-developer',
    title: 'Android developer',
    desc: 'Apps for Android phones, tablets and watches.',
    stack: ['Kotlin', 'Jetpack Compose'],
    requires: null,
    status: 'planned',
    area: 'software-engineering',
    direction: 'mobile'
  },
  {
    slug: 'cross-platform-developer',
    title: 'Cross-platform developer',
    desc: 'One codebase, both platforms.',
    stack: ['Flutter', 'React Native', 'Kotlin Multiplatform'],
    requires: null,
    status: 'planned',
    area: 'software-engineering',
    direction: 'mobile'
  },
  {
    slug: 'mobile-qa-automation-engineer',
    title: 'Mobile QA automation engineer',
    desc: 'Tests that run themselves, on emulators and on real phones.',
    stack: ['Maestro', 'Detox', 'Appium'],
    requires: 'you already write code',
    status: 'planned',
    area: 'software-engineering',
    direction: 'mobile'
  },
  {
    slug: 'mobile-release-engineer',
    title: 'Mobile release engineer',
    desc: 'Builds, signing, the stores, and the pipeline that ships every version.',
    stack: ['Fastlane', 'Xcode Cloud', 'GitHub Actions', 'Play Console'],
    requires: 'you already ship an app',
    status: 'planned',
    area: 'software-engineering',
    direction: 'mobile'
  },
  {
    slug: 'mobile-ar-developer',
    title: 'Mobile AR developer',
    desc: 'Augmented reality on the phone in your hand.',
    stack: ['ARKit', 'ARCore', 'Unity'],
    requires: 'you already build mobile apps',
    status: 'planned',
    area: 'software-engineering',
    direction: 'mobile'
  },
  // ── Games (filled out 2026-11-02, owner's pick: all eight) ────────────────
  {
    slug: 'gameplay-programmer',
    title: 'Gameplay programmer',
    desc: 'Mechanics, controls, the part of the game the player feels in their hands.',
    stack: ['C++ · Unreal', 'C# · Unity'],
    requires: null,
    status: 'planned',
    area: 'software-engineering',
    direction: 'games'
  },
  {
    slug: 'game-engine-programmer',
    title: 'Game engine programmer',
    desc: 'The engine itself: rendering, physics, memory, the tools on top.',
    stack: ['C++', 'graphics APIs', 'math'],
    requires: 'you already write C++',
    status: 'planned',
    area: 'software-engineering',
    direction: 'games'
  },
  {
    slug: 'graphics-programmer',
    title: 'Graphics programmer',
    desc: 'Rendering: shaders, lighting, the pipeline behind every frame.',
    stack: ['C++', 'HLSL / GLSL', 'Vulkan / DirectX'],
    requires: 'you already write C++; the math is required',
    status: 'planned',
    area: 'software-engineering',
    direction: 'games'
  },
  {
    slug: 'game-tools-programmer',
    title: 'Game tools programmer',
    desc: 'Editors and pipelines for the team: levels, assets, builds.',
    stack: ['C++ / C#', 'Python', 'the engine’s UI'],
    requires: 'you already write code',
    status: 'planned',
    area: 'software-engineering',
    direction: 'games'
  },
  {
    slug: 'game-network-programmer',
    title: 'Game network programmer',
    desc: 'Multiplayer: synchronisation, prediction, the servers that run a match.',
    stack: ['C++', 'UDP', 'server logic'],
    requires: 'you already write C++ and understand networks',
    status: 'planned',
    area: 'software-engineering',
    direction: 'games'
  },
  {
    slug: 'technical-artist',
    title: 'Technical artist',
    desc: 'The bridge between art and code: shaders, rigs, assets that run fast.',
    stack: ['an engine', 'shaders', 'DCC tools'],
    requires: 'you already work in an engine or a 3D tool',
    status: 'planned',
    area: 'software-engineering',
    direction: 'games'
  },
  {
    slug: 'game-audio-programmer',
    title: 'Game audio programmer',
    desc: 'Sound in the game: audio engines, spatial sound, the integration.',
    stack: ['C++', 'Wwise / FMOD'],
    requires: 'you already write C++',
    status: 'planned',
    area: 'software-engineering',
    direction: 'games'
  },
  {
    slug: 'game-ai-programmer',
    title: 'Game AI programmer',
    desc: 'How enemies and NPCs behave: behaviour trees, navigation, decisions.',
    stack: ['C++', 'behaviour trees', 'navmesh'],
    requires: 'you already write C++',
    status: 'planned',
    area: 'software-engineering',
    direction: 'games'
  },
  // ── Systems & desktop ─────────────────────────────────────────────────────
  {
    slug: 'browser-engine-engineer',
    title: 'Browser engine engineer',
    desc: 'The browser itself — Chromium, WebKit, Gecko — not the sites inside it.',
    stack: ['C++', 'Rust'],
    requires: 'you already write C++ or Rust',
    status: 'planned',
    area: 'software-engineering',
    direction: 'systems-desktop'
  },
  // Systems & desktop, filled out 2026-11-02 (owner's pick: all eight).
  {
    slug: 'systems-programmer',
    title: 'Systems programmer',
    desc: 'Low-level code: services, daemons, memory, performance.',
    stack: ['C', 'C++', 'Rust', 'Linux'],
    requires: 'you already write code',
    status: 'planned',
    area: 'software-engineering',
    direction: 'systems-desktop'
  },
  {
    slug: 'desktop-application-developer',
    title: 'Desktop application developer',
    desc: 'Applications for Windows, macOS and Linux.',
    stack: ['C# · .NET', 'Qt', 'Swift', 'Electron / Tauri'],
    requires: null,
    status: 'planned',
    area: 'software-engineering',
    direction: 'systems-desktop'
  },
  {
    slug: 'operating-systems-engineer',
    title: 'Operating systems engineer',
    desc: 'The kernel and what surrounds it: the scheduler, memory, drivers.',
    stack: ['C', 'Rust', 'Linux kernel'],
    requires: 'you already write C',
    status: 'planned',
    area: 'software-engineering',
    direction: 'systems-desktop'
  },
  {
    slug: 'compiler-engineer',
    title: 'Compiler engineer',
    desc: 'Languages and their compilers: parsers, optimisations, code generation.',
    stack: ['C++', 'Rust', 'LLVM'],
    requires: 'you already write C++ or Rust',
    status: 'planned',
    area: 'software-engineering',
    direction: 'systems-desktop'
  },
  {
    slug: 'database-internals-engineer',
    title: 'Database internals engineer',
    desc: 'The database engine: storage, indexes, query execution, transactions.',
    stack: ['C++', 'Rust', 'algorithms and data structures'],
    requires: 'you already write C++ or Rust',
    status: 'planned',
    area: 'software-engineering',
    direction: 'systems-desktop'
  },
  {
    slug: 'performance-engineer',
    title: 'Performance engineer',
    desc: 'Profiling and speeding up: caches, SIMD, allocations, measurements.',
    stack: ['C++', 'perf', 'flamegraphs', 'benchmarks'],
    requires: 'you already write C++ or Rust',
    status: 'planned',
    area: 'software-engineering',
    direction: 'systems-desktop'
  },
  {
    slug: 'runtime-vm-engineer',
    title: 'Runtime / VM engineer',
    desc: 'Virtual machines and garbage collectors: the JVM, V8, WebAssembly.',
    stack: ['C++', 'JIT', 'GC'],
    requires: 'you already write C++',
    status: 'planned',
    area: 'software-engineering',
    direction: 'systems-desktop'
  },
  {
    slug: 'driver-developer',
    title: 'Driver developer',
    desc: 'Device drivers for the operating system.',
    stack: ['C', 'Windows WDK / Linux kernel'],
    requires: 'you already write C',
    status: 'planned',
    area: 'software-engineering',
    direction: 'systems-desktop'
  },
  // Embedded, filled out 2026-11-02 (owner's pick: all seven; the FPGA engineer
  // went to Hardware & electronics by the "what you build" rule).
  {
    slug: 'embedded-software-engineer',
    title: 'Embedded software engineer',
    desc: 'Firmware for microcontrollers: peripherals, interrupts, power.',
    stack: ['C', 'C++', 'ARM Cortex-M', 'RTOS'],
    requires: 'you already write C',
    status: 'planned',
    area: 'software-engineering',
    direction: 'embedded'
  },
  {
    slug: 'firmware-engineer',
    title: 'Firmware engineer',
    desc: 'The bottom of the device stack: bootloaders, updates, memory and buses.',
    stack: ['C', 'bootloaders', 'flash', 'I²C / SPI / UART'],
    requires: 'you already write C and read a datasheet',
    status: 'planned',
    area: 'software-engineering',
    direction: 'embedded'
  },
  {
    slug: 'embedded-linux-engineer',
    title: 'Embedded Linux engineer',
    desc: 'Linux on the device: Yocto, the kernel for the board, drivers, the image.',
    stack: ['C', 'Yocto', 'Buildroot', 'device tree'],
    requires: 'you already run Linux and write C',
    status: 'planned',
    area: 'software-engineering',
    direction: 'embedded'
  },
  {
    slug: 'iot-engineer',
    title: 'IoT engineer',
    desc: 'The device, its link and its cloud: protocols, security, updates over the air.',
    stack: ['C / MicroPython', 'MQTT', 'BLE', 'LoRa'],
    requires: 'you already write code',
    status: 'planned',
    area: 'software-engineering',
    direction: 'embedded'
  },
  {
    slug: 'automotive-software-engineer',
    title: 'Automotive software engineer',
    desc: 'Software in the car: AUTOSAR, functional safety, the CAN bus.',
    stack: ['C', 'AUTOSAR', 'CAN', 'ISO 26262'],
    requires: 'you already write embedded C',
    status: 'planned',
    area: 'software-engineering',
    direction: 'embedded'
  },
  {
    slug: 'robotics-perception-engineer',
    title: 'Robotics perception engineer',
    desc: 'The machine sees: cameras, lidar, SLAM, sensor fusion.',
    stack: ['C++', 'ROS 2', 'OpenCV', 'PCL'],
    requires: 'you already write C++',
    status: 'planned',
    area: 'software-engineering',
    direction: 'embedded'
  },
  {
    slug: 'control-systems-engineer',
    title: 'Control systems engineer',
    desc: 'The machine moves: controllers, kinematics, motion planning.',
    stack: ['C++', 'Python', 'ROS 2', 'control theory'],
    requires: 'you already write code; the math is required',
    status: 'planned',
    area: 'software-engineering',
    direction: 'embedded'
  },
  // ── Hardware & electronics (second card 2026-11-02; no directions named yet) ─
  {
    slug: 'fpga-digital-design-engineer',
    title: 'FPGA / digital design engineer',
    desc: 'Logic on the chip: Verilog, VHDL, timing.',
    stack: ['Verilog / VHDL', 'Vivado / Quartus'],
    requires: 'you already understand digital logic',
    status: 'planned',
    area: 'hardware-electronics'
  },
  // ── Cybersecurity (an area of its own since 2026-11-02; filled out the same
  //    day: eight planned, four directions named with them) ─────────────────
  {
    slug: 'application-security-engineer',
    title: 'Application security engineer',
    desc: 'XSS, CSP, auth, audits: the application attacked, then fixed.',
    stack: ['web', 'one backend language', 'security tooling'],
    requires: 'you already ship web applications',
    status: 'planned',
    area: 'cybersecurity',
    direction: 'application'
  },
  {
    slug: 'devsecops-engineer',
    title: 'DevSecOps engineer',
    desc: 'Security inside the pipeline: SAST and DAST, secrets, the supply chain.',
    stack: ['CI', 'SAST / DAST', 'SBOM', 'signing'],
    requires: 'you already run CI pipelines',
    status: 'planned',
    area: 'cybersecurity',
    direction: 'application'
  },
  {
    slug: 'penetration-tester',
    title: 'Penetration tester',
    desc: 'Breaking in on request — web, networks, infrastructure — and writing it up.',
    stack: ['Kali', 'Burp Suite', 'nmap', 'Metasploit'],
    requires: 'you already understand networks and one scripting language',
    status: 'planned',
    area: 'cybersecurity',
    direction: 'offensive'
  },
  {
    slug: 'vulnerability-researcher',
    title: 'Vulnerability researcher',
    desc: 'New holes nobody has found yet: fuzzing, exploits, CVEs.',
    stack: ['C', 'fuzzers', 'debuggers'],
    requires: 'you already read and write C',
    status: 'planned',
    area: 'cybersecurity',
    direction: 'offensive'
  },
  {
    slug: 'security-engineer',
    title: 'Security engineer',
    desc: 'The infrastructure defended: hardening, the network, identity, the SIEM.',
    stack: ['Linux', 'networking', 'IAM', 'SIEM'],
    requires: 'you already run services in production',
    status: 'planned',
    area: 'cybersecurity',
    direction: 'defensive'
  },
  {
    slug: 'cloud-security-engineer',
    title: 'Cloud security engineer',
    desc: 'The same defence for the cloud: identity, policies, configuration, posture.',
    stack: ['AWS / GCP / Azure', 'IAM', 'policy as code'],
    requires: 'you already run workloads in the cloud',
    status: 'planned',
    area: 'cybersecurity',
    direction: 'defensive'
  },
  {
    slug: 'soc-analyst',
    title: 'SOC analyst',
    desc: 'Watching and responding: logs, alerts, the first investigation.',
    stack: ['SIEM', 'EDR', 'logs'],
    requires: null,
    status: 'planned',
    area: 'cybersecurity',
    direction: 'defensive'
  },
  {
    slug: 'dfir-investigator',
    title: 'DFIR investigator',
    desc: 'After the incident: disks, memory, the chain of evidence, the root cause.',
    stack: ['Autopsy', 'Volatility', 'OS internals'],
    requires: 'you already know how an operating system works inside',
    status: 'planned',
    area: 'cybersecurity',
    direction: 'defensive'
  },
  {
    slug: 'malware-analyst',
    title: 'Malware analyst',
    desc: 'Taking malware apart: how it works, how to detect it.',
    stack: ['Ghidra', 'IDA', 'x86', 'C'],
    requires: 'you already write C and read assembly',
    status: 'planned',
    area: 'cybersecurity',
    direction: 'defensive'
  },
  // ── Infrastructure ────────────────────────────────────────────────────────
  {
    slug: 'web-infrastructure-engineer',
    title: 'Web infrastructure engineer',
    desc: 'CDNs, edge, caching, the network between the server and the reader.',
    stack: ['Linux', 'networking', 'Go / Rust'],
    requires: 'you already run services in production',
    status: 'planned',
    area: 'software-engineering',
    direction: 'infrastructure'
  },
  // Infrastructure, filled out 2026-11-02 (owner's pick: all eight).
  {
    slug: 'devops-engineer',
    title: 'DevOps engineer',
    desc: 'The road from code to production: CI/CD, containers, environments.',
    stack: ['Linux', 'Docker', 'CI/CD', 'a cloud'],
    requires: null,
    status: 'planned',
    area: 'software-engineering',
    direction: 'infrastructure'
  },
  {
    slug: 'site-reliability-engineer',
    title: 'Site reliability engineer',
    desc: 'Keeping it up at night: SLOs, incidents, automation, load.',
    stack: ['Linux', 'Kubernetes', 'observability', 'one language'],
    requires: 'you already run services in production',
    status: 'planned',
    area: 'software-engineering',
    direction: 'infrastructure'
  },
  {
    slug: 'cloud-engineer',
    title: 'Cloud engineer',
    desc: 'Infrastructure in the cloud, as code: networks, compute, storage, and the bill.',
    stack: ['AWS / GCP / Azure', 'Terraform'],
    requires: 'you already run Linux and understand networks',
    status: 'planned',
    area: 'software-engineering',
    direction: 'infrastructure'
  },
  {
    slug: 'platform-engineer',
    title: 'Platform engineer',
    desc: 'The internal platform other teams build on: templates, portals, golden paths.',
    stack: ['Kubernetes', 'Terraform', 'Backstage', 'Go'],
    requires: 'you already run Kubernetes in production',
    status: 'planned',
    area: 'software-engineering',
    direction: 'infrastructure'
  },
  {
    slug: 'systems-administrator',
    title: 'Systems administrator',
    desc: 'Servers and the fleet of machines: installs, updates, access, backups.',
    stack: ['Linux / Windows Server', 'Active Directory', 'shell'],
    requires: null,
    status: 'planned',
    area: 'software-engineering',
    direction: 'infrastructure'
  },
  {
    slug: 'network-engineer',
    title: 'Network engineer',
    desc: 'The network: routing, switching, VPNs, DNS, load balancing.',
    stack: ['TCP/IP', 'BGP', 'Cisco / Juniper', 'Linux networking'],
    requires: null,
    status: 'planned',
    area: 'software-engineering',
    direction: 'infrastructure'
  },
  {
    slug: 'observability-engineer',
    title: 'Observability engineer',
    desc: 'Seeing the system: metrics, logs, traces, alerts, and what storing them costs.',
    stack: ['Prometheus', 'Grafana', 'OpenTelemetry', 'logs'],
    requires: 'you already run services in production',
    status: 'planned',
    area: 'software-engineering',
    direction: 'infrastructure'
  },
  {
    slug: 'kubernetes-engineer',
    title: 'Kubernetes engineer',
    desc: 'Clusters as a product: operators, cluster networking, upgrades.',
    stack: ['Kubernetes', 'Go', 'Helm', 'CNI'],
    requires: 'you already run containers in production',
    status: 'planned',
    area: 'software-engineering',
    direction: 'infrastructure'
  },
  // ── Data science & big data (filled out 2026-11-02, owner's pick: all eight,
  //    three directions named with them) ──────────────────────────────────────
  {
    slug: 'data-analyst',
    title: 'Data analyst',
    desc: 'The business asks, the data answers: queries, reports, dashboards.',
    stack: ['SQL', 'Python', 'Excel', 'a BI tool'],
    requires: null,
    status: 'planned',
    area: 'data-science',
    direction: 'analytics'
  },
  {
    slug: 'bi-developer',
    title: 'BI developer',
    desc: 'Dashboards and data marts as a product people open every morning.',
    stack: ['Power BI', 'Tableau', 'Looker', 'SQL'],
    requires: null,
    status: 'planned',
    area: 'data-science',
    direction: 'analytics'
  },
  {
    slug: 'analytics-engineer',
    title: 'Analytics engineer',
    desc: 'The layer between the engineer and the analyst: data models in the warehouse, with tests on the data.',
    stack: ['SQL', 'dbt', 'a warehouse'],
    requires: 'you already write SQL',
    status: 'planned',
    area: 'data-science',
    direction: 'analytics'
  },
  {
    slug: 'data-engineer',
    title: 'Data engineer',
    desc: 'The pipes data flows through: collection, cleaning, storage, orchestration.',
    stack: ['SQL', 'Python', 'Airflow', 'dbt', 'Spark'],
    requires: 'you already write code',
    status: 'planned',
    area: 'data-science',
    direction: 'engineering'
  },
  {
    slug: 'big-data-engineer',
    title: 'Big data engineer',
    desc: 'The same pipes at cluster scale: distributed compute and storage.',
    stack: ['Spark', 'Kafka', 'Hadoop', 'Flink'],
    requires: 'you already build data pipelines',
    status: 'planned',
    area: 'data-science',
    direction: 'engineering'
  },
  {
    slug: 'database-engineer',
    title: 'Database engineer',
    desc: 'The databases themselves: schemas, performance, backups, replication.',
    stack: ['PostgreSQL', 'MySQL', 'indexes', 'replication'],
    requires: 'you already write SQL',
    status: 'planned',
    area: 'data-science',
    direction: 'engineering'
  },
  {
    slug: 'data-architect',
    title: 'Data architect',
    desc: 'The whole data platform on one drawing: models, flows, storage, who may read what.',
    stack: ['warehouses', 'data modelling', 'governance'],
    requires: 'you already run data pipelines in production',
    status: 'planned',
    area: 'data-science',
    direction: 'engineering'
  },
  {
    slug: 'data-scientist',
    title: 'Data scientist',
    desc: 'Experiments and models on data: statistics, forecasts, A/B tests.',
    stack: ['Python', 'pandas', 'scikit-learn', 'statistics'],
    requires: 'you already write code; the math comes along the way',
    status: 'planned',
    area: 'data-science',
    direction: 'science'
  },
  // ── Artificial intelligence & machine learning (filled out 2026-11-02:
  //    seven planned, three directions named with them; AI Safety is live) ──
  {
    slug: 'machine-learning-engineer',
    title: 'Machine learning engineer',
    desc: 'Models in production: trained, deployed, monitored.',
    stack: ['Python', 'PyTorch', 'scikit-learn'],
    requires: 'you already write code',
    status: 'planned',
    area: 'ai',
    direction: 'applied'
  },
  {
    slug: 'ai-engineer',
    title: 'AI engineer',
    desc: 'Products built on models that already exist: RAG, agents, prompts, evals.',
    stack: ['Python / TypeScript', 'LLM APIs', 'vector databases'],
    requires: 'you already write code',
    status: 'planned',
    area: 'ai',
    direction: 'applied'
  },
  {
    slug: 'mlops-engineer',
    title: 'MLOps engineer',
    desc: 'Training and release pipelines, feature stores, model monitoring.',
    stack: ['Python', 'MLflow', 'Kubernetes', 'Airflow'],
    requires: 'you already ship ML models or run services',
    status: 'planned',
    area: 'ai',
    direction: 'applied'
  },
  {
    slug: 'computer-vision-engineer',
    title: 'Computer vision engineer',
    desc: 'Machines that see: detection, segmentation, video.',
    stack: ['PyTorch', 'OpenCV'],
    requires: 'you already write Python',
    status: 'planned',
    area: 'ai',
    direction: 'applied'
  },
  {
    slug: 'nlp-engineer',
    title: 'NLP engineer',
    desc: 'Text and speech: classification, extraction, translation, recognition.',
    stack: ['PyTorch', 'transformers'],
    requires: 'you already write Python',
    status: 'planned',
    area: 'ai',
    direction: 'applied'
  },
  {
    slug: 'deep-learning-researcher',
    title: 'Deep learning researcher',
    desc: 'New models and architectures: experiments, papers, the math behind them.',
    stack: ['PyTorch', 'JAX', 'math'],
    requires: 'you already train models; the math is required',
    status: 'planned',
    area: 'ai',
    direction: 'research'
  },
  {
    slug: 'reinforcement-learning-engineer',
    title: 'Reinforcement learning engineer',
    desc: 'Agents in environments: games, robots, optimisation.',
    stack: ['Gym', 'PyTorch'],
    requires: 'you already train models',
    status: 'planned',
    area: 'ai',
    direction: 'research'
  }
];
