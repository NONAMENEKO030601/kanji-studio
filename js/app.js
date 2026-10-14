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
  exercisesSetupView, exercisesQuizView, exercisesResultView,
];
const TOP_LEVEL_VIEWS = [homeView, lessonsListView, listeningView, exercisesSetupView];

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

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch((e) => console.error(e));
  }
}
