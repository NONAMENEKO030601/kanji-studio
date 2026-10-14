// Disegna e anima l'ordine dei tratti di un kanji usando i path SVG di KanjiVG
// (canvas originale 109x109, stessa unita' usata nel viewBox dell'SVG in pagina).

const StrokeRenderer = (() => {
  let currentPaths = [];
  let currentStep = 0; // quanti tratti sono "completi" (0 = nessuno)
  let svgEl = null;
  let playing = false;

  function init(svg) {
    svgEl = svg;
  }

  function load(paths) {
    currentPaths = paths || [];
    currentStep = currentPaths.length; // mostra il kanji completo di default
    playing = false;
    render();
  }

  function render() {
    if (!svgEl) return;
    svgEl.innerHTML = "";
    currentPaths.forEach((d, i) => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("stroke-width", "3");
      const done = i < currentStep;
      path.setAttribute("stroke", done ? "#2b3a5c" : "#d8dce6");
      svgEl.appendChild(path);
    });
  }

  function next() {
    stopPlaying();
    if (currentStep < currentPaths.length) {
      currentStep += 1;
      render();
    }
  }

  function prev() {
    stopPlaying();
    if (currentStep > 0) {
      currentStep -= 1;
      render();
    }
  }

  function stopPlaying() {
    playing = false;
  }

  function play() {
    stopPlaying();
    playing = true;
    currentStep = 0;
    render();
    const total = currentPaths.length;
    let i = 0;

    const drawNext = () => {
      if (!playing || i >= total) {
        playing = false;
        return;
      }
      currentStep = i + 1;
      render();
      animateLastStroke();
      i += 1;
      setTimeout(drawNext, 550);
    };
    drawNext();
  }

  function animateLastStroke() {
    const paths = svgEl.querySelectorAll("path");
    const last = paths[currentStep - 1];
    if (!last) return;
    const len = last.getTotalLength();
    last.style.transition = "none";
    last.setAttribute("stroke-dasharray", len);
    last.setAttribute("stroke-dashoffset", len);
    // forza il reflow prima di animare
    last.getBoundingClientRect();
    last.style.transition = "stroke-dashoffset 0.45s ease-out";
    last.setAttribute("stroke-dashoffset", "0");
  }

  function strokeCount() {
    return currentPaths.length;
  }

  function currentIndex() {
    return currentStep;
  }

  return { init, load, next, prev, play, stopPlaying, strokeCount, currentIndex };
})();
