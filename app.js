// ============================================================
//  EDC LV 2026 — Group Planner
//  Real-time via Firebase Firestore
// ============================================================
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCHrcKSvd2wcm7v6etxbtwl7JdlgyGiMzU",
  authDomain:        "edc-planner-18de3.firebaseapp.com",
  projectId:         "edc-planner-18de3",
  storageBucket:     "edc-planner-18de3.firebasestorage.app",
  messagingSenderId: "364050253720",
  appId:             "1:364050253720:web:f03fbaa8afc412d68a4ded",
  measurementId:     "G-HC79E255XM"
};

// ── STAGE STYLES ─────────────────────────────────────────────
const STAGE_STYLE = {
  "Med Tent Meetup":   { bg: "#FF0000", fg: "#FFFFFF", border: "#FF6FA8" },
  "Kinetic Field":     { bg: "#7B2FFF", fg: "#FFFFFF", border: "#9B5FFF" },
  "Cosmic Meadow":     { bg: "#00C896", fg: "#000000", border: "#00FFB8" },
  "Neon Garden":       { bg: "#FF2D78", fg: "#FFFFFF", border: "#FF6FA8" },
  "Circuit Grounds":   { bg: "#00B4FF", fg: "#000000", border: "#5AD4FF" },
  "Basspod":           { bg: "#FF6B00", fg: "#000000", border: "#FF9B40" },
  "Wasteland":         { bg: "#FF3B3B", fg: "#FFFFFF", border: "#FF7070" },
  "Quantum Valley":    { bg: "#00FFCC", fg: "#000000", border: "#80FFE8" },
  "Bionic Jungle":     { bg: "#76FF03", fg: "#000000", border: "#AAFF55" },
  "Stereobloom":       { bg: "#FF9100", fg: "#000000", border: "#FFBA55" },
  "Takis Rave Hangar": { bg: "#E040FB", fg: "#FFFFFF", border: "#EF80FF" },
  "Forest House":      { bg: "#64DD17", fg: "#000000", border: "#96F050" },
  "Casa Bacardi":      { bg: "#FF4081", fg: "#FFFFFF", border: "#FF80AA" },
  "Art Car":           { bg: "#FFD600", fg: "#000000", border: "#FFE866" },
  "Other":             { bg: "#546E7A", fg: "#FFFFFF", border: "#88A0AB" },
};

const DAY_STYLE = {
  "Night 1 (Fri May 15 - Sat May 16)": { bg: "#0D0D2B", fg: "#9B8FFF", border: "#7B2FFF" },
  "Night 2 (Sat May 16 - Sun May 17)": { bg: "#0D2B1A", fg: "#00FFA3", border: "#00C896" },
  "Night 3 (Sun May 17 - Mon May 18)": { bg: "#2B0D1A", fg: "#FF6FA8", border: "#FF2D78" },
};

const DAY_ORDER = [
  "Night 1 (Fri May 15 - Sat May 16)",
  "Night 2 (Sat May 16 - Sun May 17)",
  "Night 3 (Sun May 17 - Mon May 18)",
];
// ── DIAL TIME HELPERS ────────────────────────────────────────
// EDC window: 5:00 PM (index 0) → 5:25 AM (index 149), 5-min steps
// index 150 on end dial = "None"
const TIME_SLOTS = [];
for (let i = 0; i <= 149; i++) {
  const totalMins = 17 * 60 + i * 5;
  const wrapped   = totalMins % (24 * 60);
  const h24 = Math.floor(wrapped / 60);
  const min = wrapped % 60;
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  const ap  = h24 < 12 ? "AM" : "PM";
  TIME_SLOTS.push({ h12, min, ap, label: `${h12}:${String(min).padStart(2, "0")} ${ap}` });
}

function sliderToTime(val) {
  if (val >= 150 || val < 0) return "";
  return TIME_SLOTS[val].label;
}

// ── INIT ─────────────────────────────────────────────────────
let db;
let allPicks = [];

try {
  firebase.initializeApp(FIREBASE_CONFIG);
  db = firebase.firestore();
  initApp();
} catch (e) {
  showFirebaseError(e);
}

function initApp() {
  setupTabs();
  setupForm();
  setupStarfield();
  setupNightTabs();
  subscribeToPicksRealtime();
}

// ── REALTIME SUBSCRIPTION ────────────────────────────────────
function subscribeToPicksRealtime() {
  db.collection("picks")
    .orderBy("createdAt", "asc")
    .onSnapshot(
      (snapshot) => {
        allPicks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderSignupFeed();
        renderGroupPlan();
        renderTimeline();
        renderPersonSelector();
        renderPersonalTimeline();
        updateLiveBadge(true);
      },
      (err) => {
        console.error("Firestore error:", err);
        updateLiveBadge(false);
      }
    );
}

// ── DIAL BUILDER ─────────────────────────────────────────────
function buildDial(colH, colM, colP, hiddenInput, isEnd) {
  const hours   = [...new Set(TIME_SLOTS.map(s => String(s.h12)))];
  const minutes = [...new Set(TIME_SLOTS.map(s => String(s.min).padStart(2, "0")))];
  const periods = ["PM", "AM"];
  const ITEM_H  = 36;
  const REPEATS = 20; // repeat items many times so scroll feels infinite

function populate(col, items) {
    const repeated = Array(REPEATS).fill(items).flat();
    col.innerHTML = repeated.map(v =>
      `<div class="dial-item" data-val="${v}">${v}</div>`
    ).join("");
  }

  populate(colH, hours);
  populate(colM, minutes);
  populate(colP, periods);

function getCenterIdx(col) {
    return Math.round(col.scrollTop / ITEM_H) + 2;
  }

  function getSelectedVal(col) {
    const items = [...col.querySelectorAll(".dial-item")];
    const idx   = Math.min(getCenterIdx(col), items.length - 1);
    return items[idx] ? items[idx].dataset.val : items[0].dataset.val;
  }

  function updateHighlights(col) {
    const centerIdx = getCenterIdx(col);
    [...col.querySelectorAll(".dial-item")].forEach((item, i) => {
      item.classList.toggle("selected", i === centerIdx);
    });
  }

  function syncHidden() {
    const h  = getSelectedVal(colH);
    const m  = getSelectedVal(colM);
    const ap = getSelectedVal(colP);
    const label = `${h}:${m} ${ap}`;
    const idx = TIME_SLOTS.findIndex(s => s.label === label);
    hiddenInput.value = idx === -1 ? (isEnd ? "150" : "0") : String(idx);
    updateHighlights(colH);
    updateHighlights(colM);
    updateHighlights(colP);
  }

  function snapCol(col) {
    const idx = Math.round(col.scrollTop / ITEM_H);
    col.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
  }

  [colH, colM, colP].forEach(col => {
    let wheelLocked = false;
    col.addEventListener("wheel", (e) => {
      e.preventDefault();
      if (wheelLocked) return;
      wheelLocked = true;
      const direction  = e.deltaY > 0 ? 1 : -1;
      const currentIdx = Math.round(col.scrollTop / ITEM_H);
      const items      = [...col.querySelectorAll(".dial-item")];
      const newIdx     = Math.max(0, Math.min(items.length - 1, currentIdx + direction));
      col.scrollTo({ top: newIdx * ITEM_H, behavior: "smooth" });
      setTimeout(syncHidden, 150);
      setTimeout(() => { wheelLocked = false; }, 200);
    }, { passive: false });

    col.addEventListener("scrollend", () => {
      snapCol(col);
      syncHidden();
    });

    let scrollTimer;
    col.addEventListener("scroll", () => {
      updateHighlights(col);
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        snapCol(col);
        syncHidden();
      }, 120);
    }, { passive: true });
  });

function scrollToVal(col, val, list) {
    const midOffset = Math.floor(REPEATS / 2) * list.length;
    const localIdx  = list.indexOf(String(val));
    const targetIdx = midOffset + (localIdx >= 0 ? localIdx : 0);
    col.scrollTop   = (targetIdx - 2) * ITEM_H;
  }

  const initSlot = isEnd ? TIME_SLOTS[Math.min(24, TIME_SLOTS.length - 1)] : TIME_SLOTS[0];
  setTimeout(() => {
    scrollToVal(colH, String(initSlot.h12), hours);
    scrollToVal(colM, String(initSlot.min).padStart(2, "0"), minutes);
    scrollToVal(colP, "PM", periods);
    setTimeout(syncHidden, 80);
  }, 0);
}

function resetDial(colH, colM, colP, hiddenInput, isEnd) {
  const hours   = [...new Set(TIME_SLOTS.map(s => String(s.h12)))];
  const minutes = [...new Set(TIME_SLOTS.map(s => String(s.min).padStart(2, "0")))];
  const periods = ["PM", "AM"];
  const ITEM_H  = 36;
  const REPEATS = 20;

  function scrollToVal(col, val, list) {
    const midOffset = Math.floor(REPEATS / 2) * list.length;
    const localIdx  = list.indexOf(String(val));
    const targetIdx = midOffset + (localIdx >= 0 ? localIdx : 0);
    col.scrollTop = (targetIdx - 2) * ITEM_H;
  }

  const slot = isEnd ? TIME_SLOTS[Math.min(24, TIME_SLOTS.length - 1)] : TIME_SLOTS[0];
  scrollToVal(colH, String(slot.h12), hours);
  scrollToVal(colM, String(slot.min).padStart(2, "0"), minutes);
  scrollToVal(colP, "PM", periods);
  hiddenInput.value = isEnd ? "150" : "0";
}

// ── FORM LOGIC ────────────────────────────────────────────────
function setupForm() {
  const btn      = document.getElementById("btn-add-pick");
  const clearBtn = document.getElementById("btn-clear-form");

  btn.addEventListener("click", handleAddPick);
  clearBtn.addEventListener("click", clearForm);

  ["input-name", "input-artist"].forEach(id => {
    document.getElementById(id).addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleAddPick();
    });
  });

  // Build dials
  buildDial(
    document.getElementById("dial-start-h"),
    document.getElementById("dial-start-m"),
    document.getElementById("dial-start-p"),
    document.getElementById("input-start"),
    false
  );
  buildDial(
    document.getElementById("dial-end-h"),
    document.getElementById("dial-end-m"),
    document.getElementById("dial-end-p"),
    document.getElementById("input-end"),
    true
  );

  // End "no end time" checkbox
  const noneCheck   = document.getElementById("end-none-check");
  const endDialWrap = document.getElementById("dial-end-wrap");
  if (noneCheck && endDialWrap) {
    endDialWrap.style.opacity = "0.3";
    endDialWrap.style.pointerEvents = "none";
    noneCheck.addEventListener("change", () => {
      const disabled = noneCheck.checked;
      endDialWrap.style.opacity = disabled ? "0.3" : "1";
      endDialWrap.style.pointerEvents = disabled ? "none" : "auto";
      if (disabled) document.getElementById("input-end").value = "150";
    });
  }

  const savedName = localStorage.getItem("edc_planner_name");
  if (savedName) document.getElementById("input-name").value = savedName;
}

async function handleAddPick() {
  hideMsg("add-error");
  hideMsg("add-success");

  const name   = val("input-name").trim();
  const artist = val("input-artist").trim();
  const stage  = val("input-stage");
  const day    = val("input-day");

  const startVal = +document.getElementById("input-start").value;
  const endVal   = +document.getElementById("input-end").value;
  const start    = sliderToTime(startVal);
  const end      = endVal >= 150 ? "" : sliderToTime(endVal);

  if (!name)   return showError("add-error", "Please enter your name.");
  if (!artist) return showError("add-error", "Please enter an artist name.");
  if (!stage)  return showError("add-error", "Please select a stage.");
  if (!day)    return showError("add-error", "Please select a night.");
  if (!start)  return showError("add-error", "Please set a start time.");

  const artistNormalized = artist.replace(/\w\S*/g, w =>
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  );

  localStorage.setItem("edc_planner_name", name);

  const btn = document.getElementById("btn-add-pick");
  btn.disabled = true;
  btn.textContent = "Saving…";

  try {
    await db.collection("picks").add({
      name,
      artist: artistNormalized,
      stage,
      day,
      start,
      end,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    showSuccess("add-success", `✅ ${artistNormalized} added! It's live for everyone.`);

    document.getElementById("input-artist").value = "";
    resetDial(
      document.getElementById("dial-start-h"),
      document.getElementById("dial-start-m"),
      document.getElementById("dial-start-p"),
      document.getElementById("input-start"),
      false
    );
    resetDial(
      document.getElementById("dial-end-h"),
      document.getElementById("dial-end-m"),
      document.getElementById("dial-end-p"),
      document.getElementById("input-end"),
      true
    );
    const noneCheck   = document.getElementById("end-none-check");
    const endDialWrap = document.getElementById("dial-end-wrap");
    if (noneCheck && endDialWrap) {
      noneCheck.checked = true;
      endDialWrap.style.opacity = "0.3";
      endDialWrap.style.pointerEvents = "none";
      document.getElementById("input-end").value = "150";
    }
    document.getElementById("input-artist").focus();

  } catch (e) {
    showError("add-error", "Failed to save. Check your Firebase config in app.js.");
    console.error(e);
  } finally {
    btn.disabled = false;
    btn.textContent = "＋ Add Pick";
  }
}

async function deletePick(id) {
  try {
    await db.collection("picks").doc(id).delete();
  } catch (e) {
    console.error("Delete failed:", e);
  }
}

function clearForm() {
  document.getElementById("input-artist").value = "";
  document.getElementById("input-stage").value  = "";
  document.getElementById("input-day").value    = "";
  resetDial(
    document.getElementById("dial-start-h"),
    document.getElementById("dial-start-m"),
    document.getElementById("dial-start-p"),
    document.getElementById("input-start"),
    false
  );
  resetDial(
    document.getElementById("dial-end-h"),
    document.getElementById("dial-end-m"),
    document.getElementById("dial-end-p"),
    document.getElementById("input-end"),
    true
  );
  const noneCheck   = document.getElementById("end-none-check");
  const endDialWrap = document.getElementById("dial-end-wrap");
  if (noneCheck && endDialWrap) {
    noneCheck.checked = true;
    endDialWrap.style.opacity = "0.3";
    endDialWrap.style.pointerEvents = "none";
    document.getElementById("input-end").value = "150";
  }
  hideMsg("add-error");
  hideMsg("add-success");
}

// ── RENDER: SIGN UP FEED ─────────────────────────────────────
function renderSignupFeed() {
  const container = document.getElementById("all-picks-list");
  const countEl   = document.getElementById("total-count");

  countEl.textContent = `${allPicks.length} pick${allPicks.length !== 1 ? "s" : ""}`;

  if (allPicks.length === 0) {
    container.innerHTML = `<p class="empty-state">No picks yet — add yours above!</p>`;
    return;
  }

  const byPerson = new Map();
  allPicks.forEach(pick => {
    const key = pick.name.toLowerCase();
    if (!byPerson.has(key)) byPerson.set(key, { name: pick.name, picks: [] });
    byPerson.get(key).picks.push(pick);
  });

  const currentName = localStorage.getItem("edc_planner_name") || "";

  const sorted = [...byPerson.values()].sort((a, b) => {
    const aMe = a.name.toLowerCase() === currentName.toLowerCase();
    const bMe = b.name.toLowerCase() === currentName.toLowerCase();
    if (aMe && !bMe) return -1;
    if (!aMe && bMe) return 1;
    return a.name.localeCompare(b.name);
  });

  container.innerHTML = sorted.map(({ name, picks }) => {
    const isMe = name.toLowerCase() === currentName.toLowerCase();
    const pickCards = picks.map(p => {
      const st = STAGE_STYLE[p.stage] || STAGE_STYLE["Other"];
      const endDisplay = p.end ? `→ ${p.end}` : "→ ~1 hr";
      return `
        <div class="pick-card" style="border-left-color:${st.border}">
          <div class="pick-main">
            <span class="pick-artist">${esc(p.artist)}</span>
            <div class="pick-meta">
              <span class="stage-pill" style="background:${st.bg};color:${st.fg}">${esc(p.stage)}</span>
              <span class="pick-day">${esc(p.day)}</span>
              <span class="pick-time">${esc(p.start)} ${endDisplay}</span>
            </div>
          </div>
          ${isMe ? `<button class="btn-delete" title="Remove" onclick="deletePick('${p.id}')">✕</button>` : ""}
        </div>`;
    }).join("");

    return `
      <div class="picks-by-person">
        <div class="person-header">
          <span class="person-name">${esc(name)}${isMe ? " (you)" : ""}</span>
          <span class="person-count">${picks.length} pick${picks.length !== 1 ? "s" : ""}</span>
        </div>
        ${pickCards}
      </div>`;
  }).join("");
}

// ── RENDER: GROUP PLAN ───────────────────────────────────────
function renderGroupPlan() {
  const container = document.getElementById("group-plan-content");

  if (allPicks.length === 0) {
    container.innerHTML = `<p class="empty-state">Add picks in the Sign Up tab to see the group plan.</p>`;
    return;
  }

  const FUZZY_MINS = 15;
  const mergeMap = new Map();

  allPicks.forEach(p => {
    const artistDay = `${p.artist.toLowerCase()}|||${p.day}`;
    const pMins = parseTimeToMins(p.start) || 0;
    let matched = null;
    for (const [key, entry] of mergeMap.entries()) {
      if (!key.startsWith(artistDay)) continue;
      const entryMins = parseTimeToMins(entry.start) || 0;
      if (Math.abs(pMins - entryMins) <= FUZZY_MINS) { matched = entry; break; }
    }
    if (matched) {
      if (!matched.names.map(n => n.toLowerCase()).includes(p.name.toLowerCase()))
        matched.names.push(p.name);
      const matchedMins = parseTimeToMins(matched.start) || 0;
      if (pMins < matchedMins) matched.start = p.start;
      if (p.end && (!matched.end || (parseTimeToMins(p.end) || 0) > (parseTimeToMins(matched.end) || 0)))
        matched.end = p.end;
    } else {
      mergeMap.set(`${artistDay}|||${p.start}`, { ...p, names: [p.name] });
    }
  });

  const merged = [...mergeMap.values()];
  merged.sort((a, b) => {
    const dA = DAY_ORDER.indexOf(a.day);
    const dB = DAY_ORDER.indexOf(b.day);
    if (dA !== dB) return (dA === -1 ? 99 : dA) - (dB === -1 ? 99 : dB);
    return (parseTimeToMins(a.start) || 9999) - (parseTimeToMins(b.start) || 9999);
  });

  const byDay = new Map();
  merged.forEach(entry => {
    const d = entry.day || "Unknown";
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d).push(entry);
  });

  const personDayPicks = new Map();
  allPicks.forEach(p => {
    const key = `${p.name.toLowerCase()}|||${p.day}`;
    if (!personDayPicks.has(key)) personDayPicks.set(key, []);
    personDayPicks.get(key).push(p);
  });

  function getConflicts(entry) {
    const conflicts = [];
    entry.names.forEach(name => {
      const key = `${name.toLowerCase()}|||${entry.day}`;
      const otherPicks = personDayPicks.get(key) || [];
      otherPicks.forEach(other => {
        if (other.artist.toLowerCase() === entry.artist.toLowerCase() && other.start === entry.start) return;
        if (timesOverlap(entry.start, entry.end, other.start, other.end))
          conflicts.push({ name, other });
      });
    });
    return conflicts;
  }

  let html = "";
  DAY_ORDER.forEach(day => {
    if (!byDay.has(day)) return;
    const entries = byDay.get(day);
    const ds = DAY_STYLE[day] || { bg: "#0D002B", fg: "#B39DDB", border: "#7B2FFF" };

    html += `
      <div class="day-section">
        <div class="day-header" style="background:${ds.bg};color:${ds.fg};border-left:4px solid ${ds.border}">
          🌙 ${day.toUpperCase()}
          <span style="opacity:0.6;font-size:0.65rem;margin-left:8px">${entries.length} set${entries.length !== 1 ? "s" : ""}</span>
        </div>
        <div style="border-radius:0 0 12px 12px;overflow:hidden;border:1px solid #2A0060">
          <div class="plan-header-row">
            <div class="plan-header-col">TIME</div>
            <div class="plan-header-col">STAGE</div>
            <div class="plan-header-col">ARTIST</div>
            <div class="plan-header-col">WHO'S GOING</div>
            <div class="plan-header-col">CONFLICTS</div>
          </div>`;

    entries.forEach((entry, i) => {
      const st = STAGE_STYLE[entry.stage] || STAGE_STYLE["Other"];
      const rowBg = i % 2 === 0 ? "#0D001E" : "#110028";
      const endDisplay = entry.end ? entry.end : "~1 hr";
      const conflicts = getConflicts(entry);
      const hasConflict = conflicts.length > 0;
      const whoChips = entry.names.map(n => `<span class="who-chip">${esc(n)}</span>`).join(" ");
      const conflictText = hasConflict
        ? [...new Set(conflicts.map(c => `⚠️ ${esc(c.name)} → ${esc(c.other.artist)} @ ${esc(c.other.start)}`))]
            .join("<br>")
        : `<span class="conflict-ok">✅ Clear</span>`;

      html += `
        <div class="plan-row" style="background:${rowBg}${hasConflict ? ";border-left:3px solid #FF3B3B" : ""}">
          <div class="plan-col time">
            <span>${esc(entry.start)}</span>
            <span style="opacity:0.6;font-size:0.6rem">${endDisplay}</span>
          </div>
          <div class="plan-col stage">
            <span class="stage-pill" style="background:${st.bg};color:${st.fg}">${esc(entry.stage)}</span>
          </div>
          <div class="plan-col artist">${esc(entry.artist)}</div>
          <div class="plan-col who">${whoChips}</div>
          <div class="plan-col conflict ${hasConflict ? "conflict-warn" : ""}">${conflictText}</div>
        </div>`;
    });

    html += `</div></div>`;
  });

  // ── CREW BUBBLES ─────────────────────────────────────────
  const people = [...new Set(allPicks.map(p => p.name))];
  const pairCounts = new Map();

  [...mergeMap.values()].forEach(entry => {
    const names = entry.names;
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const key = [names[i], names[j]].sort().join("|||");
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      }
    }
  });

  const usedPeople = new Set();
  const crews = [];
  [...pairCounts.entries()]
    .filter(([, count]) => count >= 1)
    .sort((a, b) => b[1] - a[1])
    .forEach(([key, count]) => {
      const [a, b] = key.split("|||");
      if (!usedPeople.has(a) && !usedPeople.has(b)) {
        crews.push({ members: [a, b], score: count });
        usedPeople.add(a);
        usedPeople.add(b);
      }
    });

  people.forEach(p => {
    if (!usedPeople.has(p)) crews.push({ members: [p], score: 0 });
  });

  const CREW_COLORS = [
    { bg: "#7B2FFF", fg: "#FFFFFF", light: "#2A0060" },
    { bg: "#00C896", fg: "#000000", light: "#003322" },
    { bg: "#FF2D78", fg: "#FFFFFF", light: "#3D0020" },
    { bg: "#00B4FF", fg: "#000000", light: "#002B3D" },
    { bg: "#FF6B00", fg: "#000000", light: "#3D1A00" },
    { bg: "#E040FB", fg: "#FFFFFF", light: "#2B003D" },
    { bg: "#76FF03", fg: "#000000", light: "#1A3300" },
    { bg: "#FFD600", fg: "#000000", light: "#3D3300" },
  ];

  const crewHTML = crews.length === 0 ? "" : `
    <div class="crew-section">
      <div class="crew-header">
        <span class="crew-title">🫂 Suggested Duos</span>
        <span class="crew-sub">Based on shared sets — stay together, rave together</span>
      </div>
      <div class="crew-grid">
        ${crews.map((crew, ci) => {
          const col = CREW_COLORS[ci % CREW_COLORS.length];
          const isSolo = crew.members.length === 1;
          const label = isSolo ? "🎧 Side Quester" : "🤝 Duo";
          const pairs = [];
          for (let i = 0; i < crew.members.length; i++) {
            for (let j = i + 1; j < crew.members.length; j++) {
              const key = [crew.members[i], crew.members[j]].sort().join("|||");
              const count = pairCounts.get(key) || 0;
              if (count > 0) pairs.push(`${crew.members[i]} & ${crew.members[j]}: ${count} shared`);
            }
          }
          return `
            <div class="crew-bubble" style="background:${col.light};border-color:${col.bg}">
              <div class="crew-label" style="color:${col.bg}">
                ${label}
                ${crew.score > 0 ? `<span class="crew-score">${crew.score} shared set${crew.score !== 1 ? "s" : ""}</span>` : ""}
              </div>
              <div class="crew-members">
                ${crew.members.map(m => `<span class="crew-chip" style="background:${col.bg};color:${col.fg}">${esc(m)}</span>`).join("")}
              </div>
              ${pairs.length > 0 ? `<div class="crew-pairs">${pairs.map(p => `<span>${esc(p)}</span>`).join("")}</div>` : ""}
            </div>`;
        }).join("")}
      </div>
    </div>`;

  container.innerHTML = crewHTML + html;
}

// ── TIMELINE ─────────────────────────────────────────────────
const TL_START_MIN = 17 * 60;
const TL_END_MIN   = 29 * 60 + 30;
const TL_TOTAL_MIN = TL_END_MIN - TL_START_MIN;

let activeTimelineNight = "Night 1 (Fri May 15 - Sat May 16)";

function setupNightTabs() {
  document.querySelectorAll(".night-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".night-tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeTimelineNight = btn.dataset.night;
      renderTimeline();
      renderPersonalTimeline();
    });
  });
}

// ── PERSONAL TIMELINE ────────────────────────────────────────
let activePersonTimeline = null;

function renderPersonSelector() {
  const selector = document.getElementById("person-selector");
  if (!selector) return;

  const people = [...new Set(allPicks.map(p => p.name))].sort();

  if (people.length === 0) {
    selector.innerHTML = `<p class="empty-state" style="padding:8px 0">No picks added yet.</p>`;
    return;
  }

  selector.innerHTML = people.map(name => `
    <button class="person-btn ${activePersonTimeline === name ? "active" : ""}"
      onclick="selectPerson('${esc(name)}')">${esc(name)}
    </button>`
  ).join("");
}

function selectPerson(name) {
  activePersonTimeline = name;
  renderPersonSelector();
  renderPersonalTimeline();
}

function renderPersonalTimeline() {
  const container = document.getElementById("personal-timeline-content");
  if (!container) return;

  if (!activePersonTimeline) {
    container.innerHTML = `<p class="empty-state">Select a person above to see their personal timeline.</p>`;
    return;
  }

  const nightPicks = allPicks.filter(p =>
    p.name.toLowerCase() === activePersonTimeline.toLowerCase() &&
    p.day === activeTimelineNight
  );

  if (nightPicks.length === 0) {
    container.innerHTML = `<p class="empty-state">${esc(activePersonTimeline)} has no picks for this night.</p>`;
    return;
  }

  const byStage = new Map();
  nightPicks.forEach(p => {
    if (!byStage.has(p.stage)) byStage.set(p.stage, []);
    byStage.get(p.stage).push(p);
  });

  const stagesWithPicks = [...byStage.keys()].sort((a, b) => {
    const order = Object.keys(STAGE_STYLE);
    return (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) -
           (order.indexOf(b) === -1 ? 99 : order.indexOf(b));
  });

  function minToPct(mins) {
    return ((mins - TL_START_MIN) / TL_TOTAL_MIN) * 100;
  }

  function pickToBlock(p) {
    let startM = parseTimeToMins(p.start);
    if (startM === null) return null;
    let endM = p.end ? parseTimeToMins(p.end) : startM + 60;
    if (!endM) endM = startM + 60;
    startM = Math.max(startM, TL_START_MIN);
    endM   = Math.min(endM, TL_END_MIN);
    if (startM >= endM) return null;
    return { left: minToPct(startM), width: minToPct(endM) - minToPct(startM) };
  }

  const axisLabels = [];
  for (let m = TL_START_MIN; m <= TL_END_MIN; m += 60) {
    const pct  = minToPct(m);
    const hour = m % (24 * 60);
    const h24  = Math.floor(hour / 60);
    const min  = hour % 60;
    const h12  = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
    const ampm = h24 < 12 ? "AM" : "PM";
    axisLabels.push({
      pct,
      label: `${h12}${min > 0 ? ":" + String(min).padStart(2, "0") : ""}${ampm}`,
      isMidnight: h24 === 0 && min === 0
    });
  }

  const gridHTML = axisLabels.map(a =>
    `<div class="tl-gridline${a.isMidnight ? " midnight" : ""}" style="left:${a.pct}%"></div>`
  ).join("");

  const axisHTML = `<div style="position:relative;height:18px;">` +
    axisLabels.map(a => `<span class="tl-axis-label" style="left:${a.pct}%">${a.label}</span>`).join("") +
  `</div>`;

  const ds = DAY_STYLE[activeTimelineNight] || { fg: "#B39DDB" };
  const midnightPct = minToPct(24 * 60);

  const rowsHTML = stagesWithPicks.map(stage => {
    const st = STAGE_STYLE[stage] || STAGE_STYLE["Other"];
    const blocksHTML = byStage.get(stage).map(p => {
      const block = pickToBlock(p);
      if (!block) return "";
      return `<div class="tl-block"
        style="left:${block.left}%;width:${block.width}%;background:${st.bg};color:${st.fg}"
        data-artist="${esc(p.artist)}"
        data-stage="${esc(stage)}"
        data-start="${esc(p.start)}"
        data-end="${esc(p.end || "~1hr")}"
        data-names="${esc(activePersonTimeline)}"
        onmouseenter="showTooltip(event,this)"
        onmouseleave="hideTooltip()"
        ontouchstart="showTooltip(event,this)"
      >
        <span class="tl-block-label">${esc(p.artist)}</span>
      </div>`;
    }).join("");

    return `
      <div class="tl-row">
        <div class="tl-stage-label" style="color:${st.bg};text-shadow:0 0 8px ${st.bg}44">${esc(stage)}</div>
        <div class="tl-row-track">${blocksHTML}</div>
      </div>`;
  }).join("");

  container.innerHTML = `
    <div class="tl-wrap">
      <div class="tl-grid">
        <div class="tl-gridlines">${gridHTML}
          <div style="position:absolute;top:-18px;left:calc(${midnightPct}% - 1px);
            font-family:var(--font-display);font-size:0.5rem;color:${ds.fg};
            letter-spacing:0.1em;white-space:nowrap;transform:translateX(-50%)">
            ── MIDNIGHT ──
          </div>
        </div>
        <div style="margin-left:130px">${axisHTML}</div>
        ${rowsHTML}
      </div>
    </div>`;
}

function renderTimeline() {
  const container = document.getElementById("timeline-content");
  if (!container) return;

  if (allPicks.length === 0) {
    container.innerHTML = `<p class="empty-state">Add picks in the Sign Up tab to see the timeline.</p>`;
    return;
  }

  const nightPicks = allPicks.filter(p => p.day === activeTimelineNight);

  if (nightPicks.length === 0) {
    container.innerHTML = `<p class="empty-state">No picks added for this night yet.</p>`;
    return;
  }

  const byStage = new Map();
  nightPicks.forEach(p => {
    if (!byStage.has(p.stage)) byStage.set(p.stage, []);
    byStage.get(p.stage).push(p);
  });

  const stagesWithPicks = [...byStage.keys()].sort((a, b) => {
    const order = Object.keys(STAGE_STYLE);
    return (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) -
           (order.indexOf(b) === -1 ? 99 : order.indexOf(b));
  });

  function getMergedPicks(picks) {
    const FUZZY = 15;
    const merged = [];
    picks.forEach(p => {
      const pMins = parseTimeToMins(p.start) || 0;
      const existing = merged.find(e =>
        e.artist.toLowerCase() === p.artist.toLowerCase() &&
        Math.abs((parseTimeToMins(e.start) || 0) - pMins) <= FUZZY
      );
      if (existing) {
        if (!existing.names.map(n => n.toLowerCase()).includes(p.name.toLowerCase()))
          existing.names.push(p.name);
        if (pMins < (parseTimeToMins(existing.start) || 0)) existing.start = p.start;
        if (p.end && (!existing.end || (parseTimeToMins(p.end) || 0) > (parseTimeToMins(existing.end) || 0)))
          existing.end = p.end;
      } else {
        merged.push({ ...p, names: [p.name] });
      }
    });
    return merged;
  }

  function minToPct(mins) {
    return ((mins - TL_START_MIN) / TL_TOTAL_MIN) * 100;
  }

  function pickToBlock(p) {
    let startM = parseTimeToMins(p.start);
    if (startM === null) return null;
    let endM = p.end ? parseTimeToMins(p.end) : startM + 60;
    if (!endM) endM = startM + 60;
    startM = Math.max(startM, TL_START_MIN);
    endM   = Math.min(endM, TL_END_MIN);
    if (startM >= endM) return null;
    return { left: minToPct(startM), width: minToPct(endM) - minToPct(startM) };
  }

  const axisLabels = [];
  for (let m = TL_START_MIN; m <= TL_END_MIN; m += 60) {
    const pct  = minToPct(m);
    const hour = m % (24 * 60);
    const h24  = Math.floor(hour / 60);
    const min  = hour % 60;
    const h12  = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
    const ampm = h24 < 12 ? "AM" : "PM";
    const label = `${h12}${min > 0 ? ":" + String(min).padStart(2, "0") : ""}${ampm}`;
    const isMidnight = h24 === 0 && min === 0;
    axisLabels.push({ pct, label, isMidnight });
  }

  const gridHTML = axisLabels.map(a =>
    `<div class="tl-gridline${a.isMidnight ? " midnight" : ""}" style="left:${a.pct}%"></div>`
  ).join("");

  const axisHTML = `<div style="position:relative;height:18px;">` +
    axisLabels.map(a =>
      `<span class="tl-axis-label" style="left:${a.pct}%">${a.label}</span>`
    ).join("") +
  `</div>`;

  const rowsHTML = stagesWithPicks.map(stage => {
    const st    = STAGE_STYLE[stage] || STAGE_STYLE["Other"];
    const picks = getMergedPicks(byStage.get(stage) || []);

    const blocksHTML = picks.map(p => {
      const block = pickToBlock(p);
      if (!block) return "";
      const names = p.names.join(", ");
      const endDisplay = p.end || "~1hr";
      return `<div class="tl-block"
        style="left:${block.left}%;width:${block.width}%;background:${st.bg};color:${st.fg}"
        data-artist="${esc(p.artist)}"
        data-stage="${esc(stage)}"
        data-start="${esc(p.start)}"
        data-end="${esc(endDisplay)}"
        data-names="${esc(names)}"
        onmouseenter="showTooltip(event,this)"
        onmouseleave="hideTooltip()"
        ontouchstart="showTooltip(event,this)"
      >
        <span class="tl-block-label">${esc(p.artist)}</span>
        <span class="tl-block-names">${block.width > 8 ? esc(names) : ""}</span>
      </div>`;
    }).join("");

    return `
      <div class="tl-row">
        <div class="tl-stage-label" style="color:${st.bg};text-shadow:0 0 8px ${st.bg}44">
          ${esc(stage)}
        </div>
        <div class="tl-row-track">${blocksHTML}</div>
      </div>`;
  }).join("");

  const legendHTML = `
    <div class="tl-legend">
      ${stagesWithPicks.map(s => {
        const st = STAGE_STYLE[s] || STAGE_STYLE["Other"];
        return `<div class="tl-legend-item">
          <div class="tl-legend-dot" style="background:${st.bg}"></div>
          ${esc(s)}
        </div>`;
      }).join("")}
    </div>`;

  const ds = DAY_STYLE[activeTimelineNight] || { fg: "#B39DDB" };
  const midnightPct = minToPct(24 * 60);

  container.innerHTML = `
    <div class="tl-wrap">
      <div class="tl-grid">
        <div class="tl-gridlines">${gridHTML}
          <div style="position:absolute;top:-18px;left:calc(${midnightPct}% - 1px);
            font-family:var(--font-display);font-size:0.5rem;color:${ds.fg};
            letter-spacing:0.1em;white-space:nowrap;transform:translateX(-50%)">
            ── MIDNIGHT ──
          </div>
        </div>
        <div style="margin-left:130px">${axisHTML}</div>
        ${rowsHTML}
      </div>
    </div>
    ${legendHTML}`;
}

// ── TOOLTIP ──────────────────────────────────────────────────
function showTooltip(e, el) {
  const tip = document.getElementById("tl-tooltip");
  tip.innerHTML = `
    <div class="tl-tooltip-artist">${el.dataset.artist}</div>
    <div class="tl-tooltip-row"><span>Stage</span>${el.dataset.stage}</div>
    <div class="tl-tooltip-row"><span>Time</span>${el.dataset.start} → ${el.dataset.end}</div>
    <div class="tl-tooltip-row"><span>Going</span>${el.dataset.names}</div>`;
  tip.classList.remove("hidden");
  positionTooltip(e);
}

function hideTooltip() {
  document.getElementById("tl-tooltip").classList.add("hidden");
}

function positionTooltip(e) {
  const tip = document.getElementById("tl-tooltip");
  const x   = (e.touches ? e.touches[0].clientX : e.clientX) + 14;
  const y   = (e.touches ? e.touches[0].clientY : e.clientY) - 10;
  const vw  = window.innerWidth;
  const tw  = tip.offsetWidth || 240;
  tip.style.left = (x + tw > vw ? x - tw - 28 : x) + "px";
  tip.style.top  = y + "px";
}

document.addEventListener("mousemove", e => {
  const tip = document.getElementById("tl-tooltip");
  if (tip && !tip.classList.contains("hidden")) positionTooltip(e);
});

// ── TIME HELPERS ─────────────────────────────────────────────
function parseTimeToMins(t) {
  if (!t) return null;
  const m = String(t).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  let h = parseInt(m[1]);
  const min = parseInt(m[2]);
  const period = m[3].toUpperCase();
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  if (period === "AM" && h < 6) h += 24;
  return h * 60 + min;
}

function timesOverlap(aStart, aEnd, bStart, bEnd) {
  const aS = parseTimeToMins(aStart);
  const bS = parseTimeToMins(bStart);
  if (!aS || !bS) return false;
  const aE = aEnd ? parseTimeToMins(aEnd) : aS + 60;
  const bE = bEnd ? parseTimeToMins(bEnd) : bS + 60;
  if (!aE || !bE) return false;
  return aS < bE && bS < aE;
}

// ── TAB SWITCHING ────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(s => s.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
      if (btn.dataset.tab === "timeline") {
        renderTimeline();
        renderPersonSelector();
        renderPersonalTimeline();
      }
    });
  });
}

// ── LIVE BADGE ───────────────────────────────────────────────
function updateLiveBadge(connected) {
  const badge = document.getElementById("live-badge");
  if (connected) {
    badge.style.borderColor = "var(--pink)";
    badge.style.color = "var(--pink)";
    badge.innerHTML = `<span class="live-dot"></span> LIVE`;
  } else {
    badge.style.borderColor = "#555";
    badge.style.color = "#888";
    badge.innerHTML = `<span style="width:7px;height:7px;background:#888;border-radius:50%;display:inline-block"></span> OFFLINE`;
  }
}

// ── STARFIELD ────────────────────────────────────────────────
function setupStarfield() {
  const canvas = document.getElementById("starfield");
  const ctx    = canvas.getContext("2d");
  let stars    = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function initStars() {
    stars = Array.from({ length: 180 }, () => ({
      x:       Math.random() * canvas.width,
      y:       Math.random() * canvas.height,
      r:       Math.random() * 1.5 + 0.3,
      speed:   Math.random() * 0.3 + 0.05,
      opacity: Math.random(),
      pulse:   Math.random() * Math.PI * 2,
      color:   ["#FFFFFF", "#B39DDB", "#7B2FFF", "#00B4FF", "#FF2D78"][Math.floor(Math.random() * 5)],
    }));
  }

  function drawStars() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      s.pulse += 0.015;
      const alpha = 0.3 + Math.sin(s.pulse) * 0.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = s.color + Math.floor(alpha * 255).toString(16).padStart(2, "0");
      ctx.fill();
      s.y -= s.speed;
      if (s.y < -2) { s.y = canvas.height + 2; s.x = Math.random() * canvas.width; }
    });
    requestAnimationFrame(drawStars);
  }

  resize();
  initStars();
  drawStars();
  window.addEventListener("resize", () => { resize(); initStars(); });
}

// ── FIREBASE ERROR SCREEN ────────────────────────────────────
function showFirebaseError(e) {
  document.body.innerHTML = `
    <div style="font-family:monospace;max-width:600px;margin:80px auto;padding:32px;
      background:#0D001E;border:1px solid #FF3B3B;border-radius:12px;color:#FF6B6B">
      <h2 style="color:#FF3B3B;margin-bottom:16px">⚠️ Firebase Not Configured</h2>
      <p style="margin-bottom:12px">Open <code>app.js</code> and replace the <code>FIREBASE_CONFIG</code> values at the top with your own Firebase project credentials.</p>
      <p style="margin-bottom:12px">See <code>README.md</code> for step-by-step setup instructions.</p>
      <pre style="background:#1A0030;padding:12px;border-radius:6px;overflow:auto;font-size:0.8rem">${e.message}</pre>
    </div>`;
}

// ── UTILS ────────────────────────────────────────────────────
function val(id) { return document.getElementById(id).value; }
function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove("hidden");
}
function showSuccess(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 4000);
}
function hideMsg(id) {
  document.getElementById(id).classList.add("hidden");
}
