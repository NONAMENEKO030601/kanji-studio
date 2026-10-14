// Genera sessioni di esercizi a scelta multipla (kanji o vocabolario) a partire
// dai dati gia' caricati nell'app. Non tiene stato di sessione: quello vive in app.js.

const Quiz = (() => {
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function sample(arr, n) {
    return shuffle(arr).slice(0, n);
  }

  function primaryMeaning(k) {
    const it = (k.meanings_it && k.meanings_it[0]) || (k.meanings_en && k.meanings_en[0]) || "";
    return it.split(",")[0].split(";")[0].trim();
  }

  function primaryReading(k) {
    const r = (k.on && k.on[0]) || (k.kun && k.kun[0]) || "";
    return r.replace(/[.-]/g, "");
  }

  function buildOptions(correctValue, pool, getValue) {
    const distractorValues = [];
    const seen = new Set([correctValue]);
    for (const item of shuffle(pool)) {
      const v = getValue(item);
      if (!v || seen.has(v)) continue;
      seen.add(v);
      distractorValues.push(v);
      if (distractorValues.length >= 3) break;
    }
    const options = shuffle([correctValue, ...distractorValues]);
    return { options, correctIndex: options.indexOf(correctValue) };
  }

  function kanjiQuestion(kanji, pool, mode) {
    if (mode === "kanji-meaning") {
      const correct = primaryMeaning(kanji);
      const { options, correctIndex } = buildOptions(correct, pool, primaryMeaning);
      return {
        type: mode,
        item: kanji,
        prompt: kanji.kanji,
        promptSub: "",
        options,
        correctIndex,
      };
    }
    const correct = primaryReading(kanji);
    const { options, correctIndex } = buildOptions(correct, pool, primaryReading);
    return {
      type: mode,
      item: kanji,
      prompt: kanji.kanji,
      promptSub: primaryMeaning(kanji),
      options,
      correctIndex,
    };
  }

  function vocabQuestion(vocabItem, pool) {
    const correct = (vocabItem.meaning_it || "").split(",")[0].trim();
    const { options, correctIndex } = buildOptions(
      correct,
      pool,
      (v) => (v.meaning_it || "").split(",")[0].trim()
    );
    return {
      type: "vocab",
      item: vocabItem,
      prompt: vocabItem.word,
      promptSub: vocabItem.reading || "",
      options,
      correctIndex,
    };
  }

  function generateSession(mode, pool, count) {
    const usable = pool.filter((item) => {
      if (mode === "kanji-meaning") return !!primaryMeaning(item);
      if (mode === "kanji-reading") return !!primaryReading(item);
      return !!(item.meaning_it && item.word);
    });
    const picked = sample(usable, Math.min(count, usable.length));
    if (mode === "vocab") return picked.map((v) => vocabQuestion(v, usable));
    return picked.map((k) => kanjiQuestion(k, usable, mode));
  }

  return { generateSession, shuffle };
})();
