const pdfInput = document.getElementById("pdf-input");
const dropZone = document.getElementById("drop-zone");
const fileInfo = document.getElementById("file-info");
const controlsSection = document.getElementById("controls-section");
const pageStart = document.getElementById("page-start");
const pageTotal = document.getElementById("page-total");
const langSelect = document.getElementById("lang-select");
const voiceSelect = document.getElementById("voice-select");
const speedRange = document.getElementById("speed-range");
const speedValue = document.getElementById("speed-value");
const readBtn = document.getElementById("read-btn");
const playbackSection = document.getElementById("playback-section");
const statusMsg = document.getElementById("status-msg");
const currentPageLabel = document.getElementById("current-page-label");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const audioPlayer = document.getElementById("audio-player");
const stopBtn = document.getElementById("stop-btn");

let pages = []; // [{page: 1, text: "..."}, ...]
let allVoices = {};
let currentBlobUrl = null;
let currentIdx = 0; // index into pages[]
let isReading = false;
let stopRequested = false;

// ── Load voices on startup ──────────────────────────────────

async function loadVoices() {
  try {
    const res = await fetch("/voices");
    allVoices = await res.json();
    populateVoices();
  } catch (e) {
    console.error("Failed to load voices", e);
  }
}

function populateVoices() {
  const lang = langSelect.value;
  const voices = allVoices[lang] || [];
  voiceSelect.innerHTML = "";
  voices.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v.id;
    opt.textContent = `${v.name} (${v.gender})`;
    voiceSelect.appendChild(opt);
  });
}

langSelect.addEventListener("change", populateVoices);
loadVoices();

// ── Speed slider ────────────────────────────────────────────

speedRange.addEventListener("input", () => {
  speedValue.textContent = parseFloat(speedRange.value).toFixed(1);
});

// ── File upload (click + drag & drop) ───────────────────────

pdfInput.addEventListener("change", () => {
  if (pdfInput.files.length) uploadFile(pdfInput.files[0]);
});

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (file && file.name.toLowerCase().endsWith(".pdf")) {
    uploadFile(file);
  }
});

async function uploadFile(file) {
  // Stop any current reading
  stopReading();

  fileInfo.textContent = `Uploading ${file.name}...`;
  fileInfo.hidden = false;
  controlsSection.hidden = true;
  playbackSection.hidden = true;

  const form = new FormData();
  form.append("file", file);

  try {
    const res = await fetch("/upload", { method: "POST", body: form });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Upload failed");
    }
    const data = await res.json();
    pages = data.pages;

    pageStart.min = 1;
    pageStart.max = data.page_count;
    pageStart.value = 1;
    pageTotal.textContent = `of ${data.page_count}`;

    fileInfo.textContent = `${data.filename} — ${data.page_count} page(s), ${data.word_count} words`;
    controlsSection.hidden = false;
  } catch (e) {
    fileInfo.textContent = `Error: ${e.message}`;
  }
}

// ── Page-by-page reading engine ─────────────────────────────

function findPageIdx(pageNum) {
  return pages.findIndex((p) => p.page >= pageNum);
}

async function synthesizePage(pageData) {
  const form = new FormData();
  form.append("text", pageData.text);
  form.append("voice", voiceSelect.value);
  form.append("speed", speedRange.value);

  const res = await fetch("/synthesize", { method: "POST", body: form });
  if (!res.ok) {
    let detail = `Server error (${res.status})`;
    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }
  return await res.blob();
}

function updatePlaybackUI() {
  if (currentIdx < 0 || currentIdx >= pages.length) return;
  const page = pages[currentIdx];
  currentPageLabel.textContent = `Page ${page.page}`;
  prevBtn.disabled = currentIdx === 0;
  nextBtn.disabled = currentIdx === pages.length - 1;
}

async function playPage(idx) {
  if (idx < 0 || idx >= pages.length) {
    statusMsg.textContent = "Finished reading.";
    isReading = false;
    stopBtn.hidden = true;
    return;
  }

  currentIdx = idx;
  updatePlaybackUI();

  const page = pages[idx];

  // Skip pages with very little text (covers, blank pages, etc.)
  if (page.text.trim().length < 10) {
    statusMsg.textContent = `Skipping page ${page.page} (no readable text)...`;
    if (isReading && !stopRequested) {
      playPage(idx + 1);
    }
    return;
  }

  statusMsg.textContent = `Generating audio for page ${page.page}...`;
  audioPlayer.src = "";

  try {
    const blob = await synthesizePage(page);

    // Check if user stopped while we were synthesizing
    if (stopRequested) return;

    if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = URL.createObjectURL(blob);

    audioPlayer.src = currentBlobUrl;
    statusMsg.textContent = `Reading page ${page.page}...`;
    await audioPlayer.play();
  } catch (e) {
    statusMsg.textContent = `Error on page ${page.page}: ${e.message}`;
    // Skip to next page on error if auto-reading
    if (isReading && !stopRequested) {
      setTimeout(() => playPage(idx + 1), 1000);
    }
  }
}

// Auto-advance when a page finishes playing
audioPlayer.addEventListener("ended", () => {
  if (isReading && !stopRequested) {
    playPage(currentIdx + 1);
  }
});

function stopReading() {
  stopRequested = true;
  isReading = false;
  audioPlayer.pause();
  audioPlayer.src = "";
  stopBtn.hidden = true;
}

// ── Button handlers ─────────────────────────────────────────

readBtn.addEventListener("click", () => {
  if (pages.length === 0) return;

  const startPage = parseInt(pageStart.value, 10) || 1;
  const idx = findPageIdx(startPage);
  if (idx === -1) {
    statusMsg.textContent = "No pages found from that number.";
    return;
  }

  isReading = true;
  stopRequested = false;
  readBtn.disabled = true;
  playbackSection.hidden = false;
  stopBtn.hidden = false;
  playPage(idx);
});

stopBtn.addEventListener("click", () => {
  stopReading();
  readBtn.disabled = false;
  statusMsg.textContent = `Stopped on page ${pages[currentIdx]?.page || "?"}. Change start page and click Read PDF to resume.`;
});

prevBtn.addEventListener("click", () => {
  if (currentIdx > 0) {
    stopRequested = false;
    playPage(currentIdx - 1);
  }
});

nextBtn.addEventListener("click", () => {
  if (currentIdx < pages.length - 1) {
    stopRequested = false;
    playPage(currentIdx + 1);
  }
});
