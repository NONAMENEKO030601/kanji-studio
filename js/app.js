let ALL_KANJI = [];
let FILTERED = [];
let RENDER_COUNT = 0;
const CHUNK = 300;
let activeFilter = "all";
let searchTerm = "";

const homeView = document.getElementById("homeView");
const detailView = document.getElementById("detailView");
const backBtn = document.getElementById("backBtn");
const homeTitle = document.getElementById("homeTitle");
const kanjiGrid = document.getElementById("kanjiGrid");
const loadingMsg = document.getElementById("loadingMsg");
const countInfo = document.getElementById("countInfo");
const searchInput = document.getElementById("searchInput");
const filterRow = document.getElementById("filterRow");

init();

async function init() {
  registerServiceWorker();
  wireFilters();
  wireSearch();
  wireStrokeControls();
  backBtn.addEventListener("click", showHome);

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
    if (detailView.classList.contains("hidden")) {
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 400;
      if (nearBottom && RENDER_COUNT < FILTERED.length) {
        renderNextChunk();
      }
    }
  });
}

function showHome() {
  detailView.classList.add("hidden");
  homeView.classList.remove("hidden");
  backBtn.classList.add("hidden");
  homeTitle.textContent = "Kanji Studio";
  StrokeRenderer.stopPlaying();
}

function showDetail() {
  homeView.classList.add("hidden");
  detailView.classList.remove("hidden");
  backBtn.classList.remove("hidden");
  window.scrollTo(0, 0);
}

function openDetail(k) {
  homeTitle.textContent = k.kanji;
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

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch((e) => console.error(e));
  }
}
