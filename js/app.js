let ALL_KANJI = [];
let FILTERED = [];
let RENDER_COUNT = 0;
const CHUNK = 300;
let activeFilter = "all";
let searchTerm = "";
let ALL_LESSONS = [];
let ALL_VOCAB = [];
let currentDetailOrigin = "kanji"; // "kanji" o "lessons", per sapere dove torna il bottone indietro

const homeView = document.getElementById("homeView");
const detailView = document.getElementById("detailView");
const lessonsListView = document.getElementById("lessonsListView");
const lessonDetailView = document.getElementById("lessonDetailView");
const listeningView = document.getElementById("listeningView");
const exercisesSetupView = document.getElementById("exercisesSetupView");
const exercisesQuizView = document.getElementById("exercisesQuizView");
const exercisesResultView = document.getElementById("exercisesResultView");
const diaryView = document.getElementById("diaryView");
const backBtn = document.getElementById("backBtn");
const homeTitle = document.getElementById("homeTitle");
const kanjiGrid = document.getElementById("kanjiGrid");
const loadingMsg = document.getElementById("loadingMsg");
const countInfo = document.getElementById("countInfo");
const searchInput = document.getElementById("searchInput");
const filterRow = document.getElementById("filterRow");
const bottomNav = document.querySelector(".bottom-nav");

const ALL_VIEWS = [
  homeView, detailView, lessonsListView, lessonDetailView, listeningView,
  exercisesSetupView, exercisesQuizView, exercisesResultView, diaryView,
];
const TOP_LEVEL_VIEWS = [homeView, lessonsListView, listeningView, exercisesSetupView, diaryView];

// stato diario
let DIARY_DATA = null;
let diaryLevelId = 1;
let diarySelections = {};

// stato esercizi
let quizMode = "kanji-meaning";
let quizLevelFilter = "jlpt:5";
let quizSession = []; // domande della sessione corrente
let quizIndex = 0;
let quizScore = 0;
let quizWrongItems = [];
let lastWrongSessionItems = []; // per il pulsante "rifai gli errori"

init();

async function init() {
  registerServiceWorker();
  wireFilters();
  wireSearch();
  wireStrokeControls();
  wireBottomNav();
  wireExercises();
  backBtn.addEventListener("click", () => {
    if (!exercisesQuizView.classList.contains("hidden") || !exercisesResultView.classList.contains("hidden")) {
      showView(exercisesSetupView, "Esercizi");
    } else if (currentDetailOrigin === "lessons") {
      showView(lessonsListView, "Lezioni");
    } else {
      showHome();
    }
  });

  try {
    const res = await fetch("data/kanji_data.json");
    ALL_KANJI = await res.json();
    loadingMsg.classList.add("hidden");
    applyFilters();
  } catch (e) {
    loadingMsg.textContent = "Errore nel caricamento dei dati kanji.";
    console.error(e);
  }

  setupInfiniteScroll();
  loadLessons();
  loadListening();
  loadDiary();
}

function showView(view, title) {
  ALL_VIEWS.forEach((v) => v.classList.add("hidden"));
  view.classList.remove("hidden");
  homeTitle.textContent = title;
  backBtn.classList.toggle("hidden", TOP_LEVEL_VIEWS.includes(view));
  window.scrollTo(0, 0);
  if (view !== detailView) StrokeRenderer.stopPlaying();
}

function wireBottomNav() {
  bottomNav.addEventListener("click", (e) => {
    const btn = e.target.closest(".nav-btn");
    if (!btn) return;
    bottomNav.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.tab;
    if (tab === "kanji") showHome();
    else if (tab === "lessons") showView(lessonsListView, "Lezioni");
    else if (tab === "listening") showView(listeningView, "Ascolto");
    else if (tab === "exercises") {
      updateQuizPoolInfo();
      showView(exercisesSetupView, "Esercizi");
    } else if (tab === "diary") {
      showView(diaryView, "Diario");
    }
  });
}

async function loadLessons() {
  try {
    const res = await fetch("data/lessons.json");
    const data = await res.json();
    ALL_LESSONS = data.lessons;
    ALL_VOCAB = ALL_LESSONS.flatMap((l) => l.vocab);
    renderLessonsList();
    updateQuizPoolInfo();
  } catch (e) {
    console.error(e);
  }
}

function renderLessonsList() {
  const list = document.getElementById("lessonsList");
  list.innerHTML = "";
  ALL_LESSONS.forEach((lesson) => {
    const card = document.createElement("div");
    card.className = "lesson-card";
    const title = document.createElement("div");
    title.className = "lesson-card-title";
    title.textContent = lesson.title;
    const level = document.createElement("span");
    level.className = "lesson-card-level";
    level.textContent = lesson.level;
    card.appendChild(title);
    card.appendChild(level);
    card.addEventListener("click", () => openLessonDetail(lesson));
    list.appendChild(card);
  });
}

function openLessonDetail(lesson) {
  currentDetailOrigin = "lessons";
  document.getElementById("lessonLevel").innerHTML = "";
  document.getElementById("lessonLevel").appendChild(tagEl(lesson.level));
  document.getElementById("lessonText").innerHTML = lesson.text_html;
  document.getElementById("lessonTranslation").textContent = lesson.translation_it;

  const vocabList = document.getElementById("lessonVocab");
  vocabList.innerHTML = "";
  lesson.vocab.forEach((v) => {
    const item = document.createElement("div");
    item.className = "vocab-item";
    const top = document.createElement("div");
    const word = document.createElement("span");
    word.className = "vocab-word";
    word.textContent = v.word;
    const reading = document.createElement("span");
    reading.className = "vocab-reading";
    reading.textContent = v.reading;
    top.appendChild(word);
    top.appendChild(reading);
    const meaning = document.createElement("div");
    meaning.className = "vocab-meaning";
    meaning.textContent = v.meaning_it;
    item.appendChild(top);
    item.appendChild(meaning);
    vocabList.appendChild(item);
  });

  const grammarList = document.getElementById("lessonGrammar");
  grammarList.innerHTML = "";
  lesson.grammar.forEach((g) => {
    const item = document.createElement("div");
    item.className = "grammar-item";
    const point = document.createElement("div");
    point.className = "grammar-point";
    point.textContent = g.point;
    const expl = document.createElement("div");
    expl.className = "grammar-explanation";
    expl.textContent = g.explanation_it;
    const example = document.createElement("div");
    example.className = "grammar-example";
    example.textContent = g.example_jp;
    const exampleIt = document.createElement("div");
    exampleIt.className = "grammar-example-it";
    exampleIt.textContent = g.example_it;
    item.appendChild(point);
    item.appendChild(expl);
    item.appendChild(example);
    item.appendChild(exampleIt);
    grammarList.appendChild(item);
  });

  showView(lessonDetailView, lesson.title);
}

async function loadListening() {
  try {
    const res = await fetch("data/listening.json");
    const data = await res.json();
    renderResourceList("podcastList", data.podcasts);
    renderResourceList("videoList", data.video);
  } catch (e) {
    console.error(e);
  }
}

function renderResourceList(containerId, items) {
  const list = document.getElementById(containerId);
  list.innerHTML = "";
  (items || []).forEach((r) => {
    const card = document.createElement("div");
    card.className = "resource-card";
    const title = document.createElement("div");
    title.className = "resource-card-title";
    title.textContent = r.title;
    const level = document.createElement("span");
    level.className = "resource-card-level";
    level.textContent = r.level;
    const desc = document.createElement("div");
    desc.className = "resource-card-desc";
    desc.textContent = r.description;
    const link = document.createElement("a");
    link.className = "resource-card-link";
    link.href = r.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Apri →";
    card.appendChild(title);
    card.appendChild(level);
    card.appendChild(desc);
    card.appendChild(link);
    list.appendChild(card);
  });
}

function wireFilters() {
  filterRow.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    filterRow.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    applyFilters();
  });
}

function wireSearch() {
  let timer = null;
  searchInput.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      searchTerm = searchInput.value.trim().toLowerCase();
      applyFilters();
    }, 150);
  });
}

function matchesFilter(k) {
  if (activeFilter === "all") return true;
  const [type, valueStr] = activeFilter.split(":");
  const value = Number(valueStr);
  if (type === "grade") return k.grade === value;
  if (type === "jlpt") return k.jlpt === value;
  return true;
}

function matchesSearch(k) {
  if (!searchTerm) return true;
  if (k.kanji === searchTerm) return true;
  const inReadings = [...k.on, ...k.kun].some((r) => r.toLowerCase().includes(searchTerm));
  const inMeaningsIt = k.meanings_it.some((m) => m.toLowerCase().includes(searchTerm));
  const inMeaningsEn = k.meanings_en.some((m) => m.toLowerCase().includes(searchTerm));
  return inReadings || inMeaningsIt || inMeaningsEn;
}

function applyFilters() {
  FILTERED = ALL_KANJI.filter((k) => matchesFilter(k) && matchesSearch(k));
  RENDER_COUNT = 0;
  kanjiGrid.innerHTML = "";
  countInfo.textContent = `${FILTERED.length} kanji`;
  renderNextChunk();
}

function renderNextChunk() {
  const slice = FILTERED.slice(RENDER_COUNT, RENDER_COUNT + CHUNK);
  const frag = document.createDocumentFragment();
  slice.forEach((k) => frag.appendChild(buildCard(k)));
  kanjiGrid.appendChild(frag);
  RENDER_COUNT += slice.length;
}

function buildCard(k) {
  const card = document.createElement("div");
  card.className = "kanji-card";
  const char = document.createElement("div");
  char.className = "char";
  char.textContent = k.kanji;
  const meaning = document.createElement("div");
  meaning.className = "meaning";
  meaning.textContent = (k.meanings_it[0] || k.meanings_en[0] || "").split(",")[0];
  card.appendChild(char);
  card.appendChild(meaning);
  card.addEventListener("click", () => openDetail(k));
  return card;
}

function setupInfiniteScroll() {
  window.addEventListener("scroll", () => {
    if (!homeView.classList.contains("hidden")) {
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 400;
      if (nearBottom && RENDER_COUNT < FILTERED.length) {
        renderNextChunk();
      }
    }
  });
}

function showHome() {
  showView(homeView, "Kanji Studio");
}

function showDetail() {
  currentDetailOrigin = "kanji";
  showView(detailView, document.getElementById("detailChar").textContent);
}

function openDetail(k) {
  document.getElementById("detailChar").textContent = k.kanji;
  document.getElementById("detailMeaningIt").textContent = k.meanings_it.slice(0, 3).join(", ") || "—";
  document.getElementById("detailMeaningEn").textContent = k.meanings_en.join(", ");

  const tags = document.getElementById("detailTags");
  tags.innerHTML = "";
  if (k.grade) tags.appendChild(tagEl(`Grado ${k.grade}`));
  if (k.jlpt) tags.appendChild(tagEl(`JLPT N${k.jlpt}`));
  if (k.stroke_count) tags.appendChild(tagEl(`${k.stroke_count} tratti`));

  document.getElementById("onReadings").textContent = k.on.length ? k.on.join("、") : "—";
  document.getElementById("kunReadings").textContent = k.kun.length ? k.kun.join("、") : "—";
  document.getElementById("meaningFull").textContent = k.meanings_it.join(", ") || k.meanings_en.join(", ");

  renderVocab(k.vocab);

  StrokeRenderer.load(k.strokes);
  updateStrokeCount();

  showDetail();
}

function tagEl(text) {
  const span = document.createElement("span");
  span.textContent = text;
  return span;
}

function renderVocab(vocab) {
  const list = document.getElementById("vocabList");
  list.innerHTML = "";
  if (!vocab || !vocab.length) {
    const empty = document.createElement("div");
    empty.className = "empty-msg";
    empty.textContent = "Nessuna parola di vocabolario comune trovata per questo kanji.";
    list.appendChild(empty);
    return;
  }
  vocab.forEach((v) => {
    const item = document.createElement("div");
    item.className = "vocab-item";
    const top = document.createElement("div");
    const word = document.createElement("span");
    word.className = "vocab-word";
    word.textContent = v.word;
    const reading = document.createElement("span");
    reading.className = "vocab-reading";
    reading.textContent = v.reading;
    top.appendChild(word);
    top.appendChild(reading);
    const meaning = document.createElement("div");
    meaning.className = "vocab-meaning";
    meaning.textContent = (v.meanings_it || v.meanings_en).join("; ");
    item.appendChild(top);
    item.appendChild(meaning);
    list.appendChild(item);
  });
}

function wireStrokeControls() {
  const svg = document.getElementById("strokeSvg");
  StrokeRenderer.init(svg);
  document.getElementById("strokePrev").addEventListener("click", () => {
    StrokeRenderer.prev();
    updateStrokeCount();
  });
  document.getElementById("strokeNext").addEventListener("click", () => {
    StrokeRenderer.next();
    updateStrokeCount();
  });
  document.getElementById("strokePlay").addEventListener("click", () => {
    StrokeRenderer.play();
    const interval = setInterval(() => {
      updateStrokeCount();
      if (StrokeRenderer.currentIndex() >= StrokeRenderer.strokeCount()) {
        clearInterval(interval);
      }
    }, 100);
  });
}

function updateStrokeCount() {
  document.getElementById("strokeCount").textContent =
    `${StrokeRenderer.currentIndex()}/${StrokeRenderer.strokeCount()}`;
}

function wireExercises() {
  document.getElementById("quizModeRow").addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    document.querySelectorAll("#quizModeRow .chip").forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    quizMode = btn.dataset.mode;
    document.getElementById("quizLevelSection").classList.toggle("hidden", quizMode === "vocab");
    updateQuizPoolInfo();
  });

  document.getElementById("quizLevelRow").addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    document.querySelectorAll("#quizLevelRow .chip").forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    quizLevelFilter = btn.dataset.filter;
    updateQuizPoolInfo();
  });

  document.getElementById("startQuizBtn").addEventListener("click", () => {
    const pool = getQuizPool();
    quizSession = Quiz.generateSession(quizMode, pool, 10);
    runQuizSession();
  });

  document.getElementById("redoWrongBtn").addEventListener("click", () => {
    quizSession = Quiz.generateSession(quizMode, lastWrongSessionItems, lastWrongSessionItems.length);
    runQuizSession();
  });

  document.getElementById("retrySameBtn").addEventListener("click", () => {
    runQuizSession();
  });

  document.getElementById("backToSetupBtn").addEventListener("click", () => {
    showView(exercisesSetupView, "Esercizi");
  });
}

function getQuizPool() {
  if (quizMode === "vocab") return ALL_VOCAB;
  if (quizLevelFilter === "all") return ALL_KANJI;
  const [type, valueStr] = quizLevelFilter.split(":");
  const value = Number(valueStr);
  return ALL_KANJI.filter((k) => (type === "jlpt" ? k.jlpt === value : k.grade === value));
}

function updateQuizPoolInfo() {
  const info = document.getElementById("quizPoolInfo");
  const startBtn = document.getElementById("startQuizBtn");
  if (!info || !startBtn) return;
  const pool = getQuizPool();
  const unit = quizMode === "vocab" ? "parole" : "kanji";
  info.textContent = `${pool.length} ${unit} disponibili in questo set`;
  startBtn.disabled = pool.length < 4;
}

function runQuizSession() {
  quizIndex = 0;
  quizScore = 0;
  quizWrongItems = [];
  showView(exercisesQuizView, "Esercizi");
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const q = quizSession[quizIndex];
  document.getElementById("quizProgress").textContent = `Domanda ${quizIndex + 1}/${quizSession.length} — punteggio: ${quizScore}`;
  document.getElementById("quizPrompt").textContent = q.prompt;
  document.getElementById("quizPromptSub").textContent = q.promptSub || "";

  const optionsEl = document.getElementById("quizOptions");
  optionsEl.innerHTML = "";
  q.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "quiz-option";
    btn.textContent = opt;
    btn.addEventListener("click", () => selectQuizAnswer(i));
    optionsEl.appendChild(btn);
  });
}

function selectQuizAnswer(choiceIndex) {
  const q = quizSession[quizIndex];
  const buttons = document.querySelectorAll("#quizOptions .quiz-option");
  buttons.forEach((b) => (b.disabled = true));
  buttons[q.correctIndex].classList.add("correct");

  if (choiceIndex === q.correctIndex) {
    quizScore += 1;
  } else {
    buttons[choiceIndex].classList.add("wrong");
    quizWrongItems.push(q.item);
  }

  setTimeout(() => {
    quizIndex += 1;
    if (quizIndex < quizSession.length) {
      renderQuizQuestion();
    } else {
      showQuizResults();
    }
  }, 900);
}

function showQuizResults() {
  lastWrongSessionItems = quizWrongItems;
  document.getElementById("resultScore").textContent = `${quizScore}/${quizSession.length}`;
  const ratio = quizScore / quizSession.length;
  let label = "Continua così!";
  if (ratio === 1) label = "Perfetto! Tutte corrette.";
  else if (ratio >= 0.8) label = "Ottimo lavoro!";
  else if (ratio < 0.5) label = "Ripassa ancora un po'.";
  document.getElementById("resultLabel").textContent = label;
  showView(exercisesResultView, "Esercizi");

  const wrongSection = document.getElementById("quizWrongSection");
  const redoBtn = document.getElementById("redoWrongBtn");
  if (lastWrongSessionItems.length > 0) {
    wrongSection.classList.remove("hidden");
    redoBtn.textContent = `Rifai gli errori (${lastWrongSessionItems.length})`;
  } else {
    wrongSection.classList.add("hidden");
  }
}

const DIARY_FIELD_LABELS = {
  meteo: "Che tempo faceva",
  attivita: "Cosa hai fatto",
  attivita1: "Prima cosa che hai fatto",
  attivita2: "Dopo, cosa hai fatto",
  sentimento: "Come ti sei sentito/a",
};
const DIARY_FIELD_CATEGORY = {
  meteo: "meteo",
  attivita: "attivita",
  attivita1: "attivita",
  attivita2: "attivita",
  sentimento: "sentimento",
};

async function loadDiary() {
  try {
    const res = await fetch("data/diary.json");
    DIARY_DATA = await res.json();
    document.getElementById("diaryIntro").textContent = DIARY_DATA.intro;
    document.getElementById("diaryNote").textContent = DIARY_DATA.note;
    wireDiaryLevels();
    renderDiaryLevel(1);
  } catch (e) {
    console.error(e);
  }
}

function wireDiaryLevels() {
  document.getElementById("diaryLevelRow").addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    document.querySelectorAll("#diaryLevelRow .chip").forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    renderDiaryLevel(Number(btn.dataset.level));
  });
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function renderDiaryLevel(levelId) {
  diaryLevelId = levelId;
  const level = DIARY_DATA.levels.find((l) => l.id === levelId);
  document.getElementById("diaryGuidance").textContent = level.guidance_it;

  diarySelections = {};
  level.fields.forEach((field, i) => {
    const category = DIARY_FIELD_CATEGORY[field];
    const options = DIARY_DATA.phrases[category];
    // per i due campi "attivita" di livello 3 parti da frasi diverse di default
    const defaultIndex = field === "attivita2" ? 1 : 0;
    diarySelections[field] = options[defaultIndex];
  });

  const container = document.getElementById("diaryFields");
  container.innerHTML = "";
  level.fields.forEach((field) => {
    const category = DIARY_FIELD_CATEGORY[field];
    const options = DIARY_DATA.phrases[category];

    const group = document.createElement("div");
    group.className = "diary-field-group";
    const label = document.createElement("div");
    label.className = "diary-field-label";
    label.textContent = DIARY_FIELD_LABELS[field];
    group.appendChild(label);

    const optionsEl = document.createElement("div");
    optionsEl.className = "diary-field-options";
    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "diary-option";
      if (opt === diarySelections[field]) btn.classList.add("active");
      btn.textContent = capitalize(opt.it);
      btn.addEventListener("click", () => {
        diarySelections[field] = opt;
        optionsEl.querySelectorAll(".diary-option").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        renderDiaryPreview();
      });
      optionsEl.appendChild(btn);
    });
    group.appendChild(optionsEl);
    container.appendChild(group);
  });

  renderDiaryPreview();
}

function renderDiaryPreview() {
  const s = diarySelections;
  let jp = "";
  let it = "";

  if (diaryLevelId === 1) {
    jp = `今日は${s.attivita.jp}。`;
    it = `Oggi, ${s.attivita.it}.`;
  } else if (diaryLevelId === 2) {
    jp = `今日の天気は${s.meteo.jp}。今日は${s.attivita.jp}。そして、${s.sentimento.jp}。`;
    it = `Il tempo oggi: ${s.meteo.it}. Oggi, ${s.attivita.it}. ${capitalize(s.sentimento.it)}.`;
  } else {
    jp = `今日は${s.attivita1.jp}。それから、${s.attivita2.jp}。${s.sentimento.jp}。`;
    it = `Oggi, ${s.attivita1.it}. Poi, ${s.attivita2.it}. ${capitalize(s.sentimento.it)}.`;
  }

  document.getElementById("diaryPreviewJp").innerHTML = jp;
  document.getElementById("diaryPreviewIt").textContent = it;
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch((e) => console.error(e));
  }
}
