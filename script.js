
/// scripts.js — shared by all 3 pages
// Uses ES6+ features, async/await, localStorage, DOM, events, callbacks, array methods

// ---------- Sample song database (objects & arrays) ----------
const SONGS = [
  { id: 1, title: "Calm Breeze", artist: "Ocean Studio", mood: "chill",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", length: 320 },
  { id: 2, title: "Power Run", artist: "Gym Beats", mood: "workout",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", length: 240 },
  { id: 3, title: "Neon Party", artist: "Clubline", mood: "party",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", length: 300 },
  { id: 4, title: "Focus Flow", artist: "StudyWave", mood: "focus",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", length: 420 },
  { id: 5, title: "Mellow Night", artist: "Midnight", mood: "chill",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", length: 360 }
];

// ---------- Utility: localStorage helpers ----------
const STORAGE_KEYS = {
  USER: "mp_user",
  SAVED: "mp_saved_songs"
};
const saveToStorage = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const loadFromStorage = (key, fallback=null) => {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
};

// ---------- Validation (form) ----------
function validateForm(name, email, mood){
  // use basic checks and return {ok: boolean, message}
  if(!name || name.trim().length < 2) return { ok: false, message: "Name must be at least 2 characters." };
  if(!email || !/^\S+@\S+\.\S+$/.test(email)) return { ok: false, message: "Please enter a valid email." };
  if(!mood) return { ok: false, message: "Please pick a mood/type." };
  return { ok: true };
}

// ---------- Index page logic ----------
document.addEventListener("DOMContentLoaded", () => {
  // If we're on index.html — wire up the form
  const prefForm = document.getElementById("prefForm");
  if(prefForm){
    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const moodSelect = document.getElementById("mood");
    const notice = document.getElementById("notice");

    // Pre-fill if user exists
    const stored = loadFromStorage(STORAGE_KEYS.USER);
    if(stored){
      nameInput.value = stored.name || "";
      emailInput.value = stored.email || "";
      moodSelect.value = stored.mood || "";
      notice.classList.remove("hidden");
      notice.innerText = `Welcome back, ${stored.name}. Your mood is saved as "${stored.mood}". Go to Suggestions.`;
    }

    // Event handling: form submit (1 of required event listeners)
    prefForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const mood = moodSelect.value;

      const check = validateForm(name, email, mood);
      if(!check.ok){
        alert(check.message);
        return;
      }

      // Save to localStorage
      const user = { name, email, mood, savedAt: new Date().toISOString() };
      saveToStorage(STORAGE_KEYS.USER, user);

      // show quick notice and redirect to suggestions
      notice.classList.remove("hidden");
      notice.innerText = `Saved. Redirecting to suggestions...`;
      // short UX: redirect
      window.location.href = "suggestions.html";
    });
  }

  // If we're on suggestions page
  const songsUl = document.getElementById("songs");
  if(songsUl){
    initSuggestionsPage();
  }

  // If we're on profile page
  const savedList = document.getElementById("savedList");
  if(savedList){
    renderSavedSongs();
    document.getElementById("clearSaved").addEventListener("click", () => {
      localStorage.removeItem(STORAGE_KEYS.SAVED);
      renderSavedSongs();
    });
  }
});

// ---------- Suggestions Page Implementation ----------
async function initSuggestionsPage(){
  const audio = document.getElementById("audio");
  const now = document.getElementById("now");
  const volume = document.getElementById("volume");
  const playPause = document.getElementById("playPause");
  const prevBtn = document.getElementById("prev");
  const nextBtn = document.getElementById("next");

  let currentIndex = -1;
  audio.volume = parseFloat(volume.value);

  // Event handling: volume change (input change = 2nd event)
  volume.addEventListener("input", (e) => audio.volume = parseFloat(e.target.value));

  // Event handling: play/pause button (3rd event)
  playPause.addEventListener("click", () => {
    if(audio.src && !audio.paused) audio.pause();
    else audio.play();
  });

  // Prev/Next
  prevBtn.addEventListener("click", ()=> changeTrack(-1));
  nextBtn.addEventListener("click", ()=> changeTrack(1));

  // Load user and greet
  const user = loadFromStorage(STORAGE_KEYS.USER);
  const greet = document.getElementById("greeting");
  if(user) greet.innerText = `Hey ${user.name} — mood: ${user.mood}`;
  else greet.innerText = `Hi — set your preferences on Home`;

  // Use array methods: filter songs by user mood (if available), else show all
  const chosen = user && user.mood
    ? SONGS.filter(s => s.mood === user.mood)
    : SONGS.slice(); // copy via slice

  // Use map to build DOM nodes and appendChild
  const songsContainer = document.getElementById("songs");
  songsContainer.innerHTML = "";

  // For analytics: count songs per mood using reduce
  const moodCounts = SONGS.reduce((acc, s) => {
    acc[s.mood] = (acc[s.mood] || 0) + 1;
    return acc;
  }, {});
  console.log("Song mood counts:", moodCounts);

  // generate UI elements using a callback pattern:
  const generateSongElement = (song, cb) => {
    const li = document.createElement("li");
    li.className = "song";
    li.innerHTML = `
      <div class="meta">
        <strong>${song.title}</strong>
        <div><small class="muted">${song.artist} • ${song.mood}</small></div>
      </div>
      <div class="actions">
        <button data-id="${song.id}" class="playBtn">Play</button>
        <button data-id="${song.id}" class="saveBtn">Save</button>
      </div>
    `;
    // call callback to attach handlers
    if(typeof cb === "function") cb(li, song);
    return li;
  };

  // Use for..of (loop) to append elements
  for(const s of chosen){
    const li = generateSongElement(s, (elem, song) => {
      // attach event listeners
      const playBtn = elem.querySelector(".playBtn");
      const saveBtn = elem.querySelector(".saveBtn");

      playBtn.addEventListener("click", () => {
        // find index in SONGS
        currentIndex = SONGS.findIndex(x => x.id === song.id);
        playSongAtIndex(currentIndex);
      });

      saveBtn.addEventListener("click", () => {
        saveSong(song);
        saveBtn.innerText = "Saved";
      });
    });
    songsContainer.appendChild(li);
  }

  // Async: fetch extra tips from public API (JSONPlaceholder used as demo)
  try {
    const tips = await fetchTips();
    const tipsEl = document.getElementById("tips");
    // map and show
    tipsEl.innerHTML = tips.slice(0,3).map(t => `<div><strong>${t.title}</strong><div><small>${t.body}</small></div></div>`).join("");
  } catch (err) {
    document.getElementById("tips").innerText = "Could not load tips.";
    console.error(err);
  }

  // helper to play
  function playSongAtIndex(idx){
    if(idx < 0 || idx >= SONGS.length) return;
    const song = SONGS[idx];
    audio.src = song.url;
    now.innerText = `Playing: ${song.title} — ${song.artist}`;
    audio.play().catch(e => {
      console.warn("Playback prevented until user gestures:", e);
    });
  }

  // change track
  function changeTrack(dir){
    if(currentIndex === -1) currentIndex = 0;
    else currentIndex = (currentIndex + dir + SONGS.length) % SONGS.length;
    playSongAtIndex(currentIndex);
  }

  // saveSong using localStorage and demonstrate destructuring/spread
  const saveSong = (song) => {
    const saved = loadFromStorage(STORAGE_KEYS.SAVED, []);
    // avoid duplicates using map/filter
    if(saved.some(s => s.id === song.id)) return;
    const toSave = { ...song, savedAt: new Date().toISOString() }; // spread
    saved.push(toSave);
    saveToStorage(STORAGE_KEYS.SAVED, saved);
  }

  // previous/next auto on ended
  audio.addEventListener("ended", () => changeTrack(1));
}

// ---------- Async fetch example (async/await + try/catch) ----------
async function fetchTips(){
  // Using JSONPlaceholder as a public demo API
  const url = "https://jsonplaceholder.typicode.com/posts";
  try {
    const res = await fetch(url);
    if(!res.ok) throw new Error("Network response not ok");
    const data = await res.json();
    // use filter/map to only include posts with even id as "tips demo"
    return data.filter(p => p.id % 2 === 0).map(({id,title,body}) => ({id,title,body}));
  } catch (err) {
    // rethrow so caller can handle
    throw err;
  }
}

// ---------- Profile page rendering ----------
function renderSavedSongs(){
  const list = document.getElementById("savedList");
  const saved = loadFromStorage(STORAGE_KEYS.SAVED, []);
  list.innerHTML = "";
  if(saved.length === 0){
    list.innerHTML = "<li>No saved songs yet. Go to Suggestions to save tracks.</li>";
    return;
  }

  // use map to create nodes
  saved.map(s => {
    const li = document.createElement("li");
    li.className = "song";
    li.innerHTML = `
      <div class="meta">
        <strong>${s.title}</strong>
        <div><small class="muted">${s.artist} • ${s.mood}</small></div>
      </div>
      <div class="actions">
        <button class="playSaved" data-url="${s.url}">Play</button>
        <button class="removeSaved" data-id="${s.id}">Remove</button>
      </div>
    `;
    // attach play event using callback arrow function
    li.querySelector(".playSaved").addEventListener("click", (e) => {
      // open suggestions and play via query params — simple approach
      const u = `suggestions.html?play=${s.id}`;
      window.location.href = u;
    });
    li.querySelector(".removeSaved").addEventListener("click", () => {
      const remaining = saved.filter(x => x.id !== s.id);
      saveToStorage(STORAGE_KEYS.SAVED, remaining);
      renderSavedSongs(); // rerender
    });
    list.appendChild(li);
  });
}

// Additional: if suggestions.html was opened with ?play=ID, auto play
(function checkAutoPlayOnLoad(){
  if(!window.location.search) return;
  const params = new URLSearchParams(window.location.search);
  const playId = params.get("play");
  if(!playId) return;
  // Wait DOM ready and then simulate click
  window.addEventListener("DOMContentLoaded", () => {
    // find the song element in SONGS and play it after suggestions init (if present)
    // try to initialise suggestions page if not already
    const attemptPlay = () => {
      const idx = SONGS.findIndex(s => String(s.id) === String(playId));
      if(idx !== -1){
        // If audio ready in page, use its function; else we call play by setting audio
        const audioEl = document.getElementById("audio");
        if(audioEl){
          audioEl.src = SONGS[idx].url;
          const now = document.getElementById("now");
          if(now) now.innerText = `Playing: ${SONGS[idx].title}`;
          audioEl.play().catch(()=>{});
        } else {
          // fallback: nothing to do
        }
      }
    };
    // small delay to let suggestions init
    setTimeout(attemptPlay, 600);
  });
})();

