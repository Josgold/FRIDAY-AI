const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const messagesEl = document.getElementById("messages");
const sendBtn = document.getElementById("sendBtn");
const statusText = document.getElementById("statusText");
const statusEl = document.querySelector(".status");
const micBtn = document.getElementById("micBtn");
const voiceStatus = document.getElementById("voiceStatus");
const clearBtn = document.getElementById("clearBtn");
const voiceToggle = document.getElementById("voiceToggle");
let voiceEnabled = true;
const history = [];

function addMessage(role, text) {
  const row = document.createElement("div");
  row.className = "message " + role;
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "assistant" ? "F" : "Y";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  const label = document.createElement("strong");
  label.textContent = role === "assistant" ? "FRIDAY" : "YOU";
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  bubble.append(label, paragraph);
  row.append(avatar, bubble);
  messagesEl.append(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function chooseFemaleVoice() {
  if (!("speechSynthesis" in window)) return null;
  const voices = speechSynthesis.getVoices();
  const preferred = voices.find(v => /female|samantha|victoria|karen|zira|susan|aria|jenny|google uk english female/i.test(v.name));
  return preferred || voices.find(v => /^en/i.test(v.lang)) || voices[0] || null;
}

function speak(text) {
  if (!voiceEnabled) return;
  if (!("speechSynthesis" in window)) {
    voiceStatus.textContent = "Voice output unavailable";
    return;
  }
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = chooseFemaleVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = 1;
  utterance.pitch = 1.08;
  speechSynthesis.speak(utterance);
}

async function checkHealth() {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) throw new Error("offline");
    statusText.textContent = "System online";
    statusEl.classList.add("online");
  } catch {
    statusText.textContent = "Connection unavailable";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = input.value.trim();
  if (!message || sendBtn.disabled) return;
  history.push({ role: "user", content: message });
  addMessage("user", message);
  input.value = "";
  input.style.height = "auto";
  sendBtn.disabled = true;
  sendBtn.textContent = "Thinking…";
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "FRIDAY could not respond.");
    history.push({ role: "assistant", content: data.reply });
    addMessage("assistant", data.reply);
    speak(data.reply);
  } catch (error) {
    addMessage("assistant", error.message || "Connection error. Please try again.");
  } finally {
    sendBtn.disabled = false;
    sendBtn.innerHTML = 'Send <span>➤</span>';
    input.focus();
  }
});

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 120) + "px";
});
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

voiceToggle.addEventListener("click", () => {
  voiceEnabled = !voiceEnabled;
  voiceToggle.textContent = voiceEnabled ? "Voice: on" : "Voice: off";
  voiceToggle.setAttribute("aria-pressed", String(voiceEnabled));
  if (!voiceEnabled && "speechSynthesis" in window) speechSynthesis.cancel();
  voiceStatus.textContent = voiceEnabled ? "Voice output: on" : "Voice output: off";
});

clearBtn.addEventListener("click", () => {
  history.length = 0;
  messagesEl.replaceChildren();
  addMessage("assistant", "Conversation cleared. What shall we work on next?");
  if ("speechSynthesis" in window) speechSynthesis.cancel();
});

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.lang = "en-NG";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  micBtn.addEventListener("click", () => {
    try {
      recognition.start();
      micBtn.classList.add("listening");
      micBtn.textContent = "●";
      voiceStatus.textContent = "Listening…";
    } catch { voiceStatus.textContent = "Microphone is busy"; }
  });
  recognition.onresult = (event) => {
    input.value = event.results[0][0].transcript;
    input.dispatchEvent(new Event("input"));
    input.focus();
  };
  recognition.onerror = () => { voiceStatus.textContent = "Voice input unavailable"; };
  recognition.onend = () => {
    micBtn.classList.remove("listening");
    micBtn.textContent = "🎙";
    voiceStatus.textContent = "Voice output: on";
  };
} else {
  micBtn.disabled = true;
  micBtn.title = "Voice input is not supported in this browser";
  voiceStatus.textContent = "Voice input not supported here";
}

if ("speechSynthesis" in window) {
  speechSynthesis.onvoiceschanged = () => {};
} else {
  voiceStatus.textContent = "Voice output unavailable";
}
