const pdfInput = document.getElementById("pdf-input");
const dropZone = document.getElementById("drop-zone");
const fileInfo = document.getElementById("file-info");
const controlsSection = document.getElementById("controls-section");
const langSelect = document.getElementById("lang-select");
const voiceSelect = document.getElementById("voice-select");
const speedRange = document.getElementById("speed-range");
const speedValue = document.getElementById("speed-value");
const readBtn = document.getElementById("read-btn");
const playbackSection = document.getElementById("playback-section");
const statusMsg = document.getElementById("status-msg");
const audioPlayer = document.getElementById("audio-player");
const downloadBtn = document.getElementById("download-btn");

let extractedText = "";
let allVoices = {};
let currentBlobUrl = null;

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
    extractedText = data.text;
    fileInfo.textContent = `${data.filename} — ${data.page_count} page(s), ${data.word_count} words`;
    controlsSection.hidden = false;
  } catch (e) {
    fileInfo.textContent = `Error: ${e.message}`;
  }
}

// ── Synthesize & play ───────────────────────────────────────

readBtn.addEventListener("click", async () => {
  if (!extractedText) return;

  readBtn.disabled = true;
  playbackSection.hidden = false;
  statusMsg.textContent = "Generating audio... this may take a moment.";
  audioPlayer.src = "";
  audioPlayer.hidden = true;
  downloadBtn.hidden = true;

  const form = new FormData();
  form.append("text", extractedText);
  form.append("voice", voiceSelect.value);
  form.append("speed", speedRange.value);

  try {
    const res = await fetch("/synthesize", { method: "POST", body: form });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Synthesis failed");
    }

    const blob = await res.blob();
    if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = URL.createObjectURL(blob);

    audioPlayer.src = currentBlobUrl;
    audioPlayer.hidden = false;
    audioPlayer.play();

    downloadBtn.hidden = false;
    statusMsg.textContent = "Playing audio";
  } catch (e) {
    statusMsg.textContent = `Error: ${e.message}`;
  } finally {
    readBtn.disabled = false;
  }
});

// ── Download ────────────────────────────────────────────────

downloadBtn.addEventListener("click", () => {
  if (!currentBlobUrl) return;
  const a = document.createElement("a");
  a.href = currentBlobUrl;
  a.download = "speech.wav";
  a.click();
});
