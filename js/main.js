"use strict";

/* ==========================================================================
   Constants and seed data
   ========================================================================== */

const STORAGE_KEY = "startline_state_v1";

const DISTANCE_PRESETS = {
  supersprint: { label: "Super sprint", swim: 400, bike: 10, run: 2.5 },
  sprint: { label: "Sprint", swim: 750, bike: 20, run: 5 },
  standard: { label: "Standard (Olympic)", swim: 1500, bike: 40, run: 10 },
  middle: { label: "Middle (70.3)", swim: 1900, bike: 90, run: 21.1 },
  long: { label: "Long (Ironman)", swim: 3800, bike: 180, run: 42.2 }
};

const PHASE_ORDER = ["early", "raceweek", "raceday", "after"];
const PHASE_META = {
  early: {
    title: "Early prep",
    blurb: "More than a week to go. Focus on rules, kit and the longer jobs.",
    icon: "icon-clipboard"
  },
  raceweek: {
    title: "Race week",
    blurb: "Race week is here. Tighten up weather, nutrition and your bike.",
    icon: "icon-clipboard"
  },
  raceday: {
    title: "At the race",
    blurb: "This is it. Work through your race-morning list.",
    icon: "icon-flag"
  },
  after: {
    title: "After the race",
    blurb: "Race done. Recover well and note what you learned.",
    icon: "icon-tick"
  }
};

const KIT_ORDER = ["transition", "morning", "bike", "support"];
const KIT_META = {
  transition: { title: "Transition bag" },
  morning: { title: "Race-morning bag" },
  bike: { title: "Bike kit" },
  support: { title: "Support crew" }
};

function seedItems(prefix, titles) {
  return titles.map(function (entry, index) {
    var title = typeof entry === "string" ? entry : entry[0];
    var detail = typeof entry === "string" ? "" : entry[1];
    return {
      id: prefix + "-" + (index + 1),
      title: title,
      detail: detail,
      done: false,
      custom: false
    };
  });
}

function blankRace() {
  return {
    name: "",
    location: "",
    locationLat: null,
    locationLon: null,
    date: "",
    time: "",
    distancePreset: "standard",
    customSwim: null,
    customBike: null,
    customRun: null,
    notes: "",
    waterTemp: null
  };
}

function defaultState() {
  return {
    version: 1,
    race: null,
    weatherCache: null,
    phases: {
      early: seedItems("early", [
        "Confirm your race entry and category",
        "Read the athlete guide in full",
        ["Learn the local rules", "Drafting zone, helmet standards, mount and dismount lines"],
        "Check the swim, bike and run course maps",
        "Service the bike: tyres, brakes and gears",
        "Test your race-day nutrition in training",
        ["Sort travel and accommodation", "If your race is away from home"],
        "Update bike computer maps and firmware"
      ]),
      raceweek: seedItems("raceweek", [
        "Check the race-day weather forecast",
        "Check the wetsuit rules for the water temperature",
        ["Prepare your nutrition", "Bottles mixed and labelled, gels counted"],
        "Do a final bike check: tyres, brakes, gears, cages",
        ["Count out your race gels", "Race count plus spares, flavours you trained with"],
        "Study the transition layout or course map",
        "Confirm check-in time and bag-drop deadline",
        "Wash your wetsuit, goggles and tri-suit"
      ]),
      raceday: seedItems("raceday", [
        ["Athlete check-in", "Collect your number and timing chip"],
        ["Rack the bike", "Check whether racking is the night before or race morning"],
        ["Charge your watch and bike computer", "Watch, bike computer, any lights"],
        ["Set two alarms", "Two alarms beat one"],
        "Attach your race number",
        ["Pack your transition bag", "Helmet, shoes, goggles, dry kit"],
        "Sort your race-morning breakfast and nutrition",
        ["Walk the transition route", "Swim exit, rack, mount line, dismount line, run out"]
      ]),
      after: seedItems("after", [
        ["Collect your bike and bags", "Transition has closing hours, check when it ends"],
        ["Eat and drink within the hour", "Whatever you can face"],
        ["Change into dry, warm clothes", "You cool down faster than you think"],
        "Check for any niggles",
        ["Write your race notes", "Future you reads this"],
        ["Thank whoever waited for you", "They were part of this race too"]
      ])
    },
    kit: {
      transition: seedItems("kit-transition", [
        "Wetsuit",
        ["Goggles (plus a spare pair)", ""],
        "Swim cap",
        "Tri-suit",
        "Helmet",
        "Cycling shoes",
        "Race number belt",
        "Sunglasses",
        "Running shoes",
        "Socks",
        ["Small flannel", "Keep it in your shoes or under the rack, never loose"],
        "Body lubricant or anti-chafe balm"
      ]),
      morning: seedItems("kit-morning", [
        ["Phone, wallet and keys", "Together, and counted before you leave"],
        "Race entry confirmation or ID",
        "Pre-race breakfast",
        "Water bottle",
        "Warm layer for before the start",
        "Flip-flops or sliders",
        ["Ear plugs", "Useful in cold water"],
        "Sun cream",
        "Blister plasters"
      ]),
      bike: seedItems("kit-bike", [
        "Bike",
        ["Tyres checked and pumped", ""],
        "Bike computer or GPS watch mount",
        "Spare tube",
        "Tyre levers",
        "CO2 or mini pump",
        "Multi-tool",
        ["Bottles filled and labelled", ""],
        "On-bike nutrition"
      ]),
      support: seedItems("kit-support", [
        "Tracking link shared with your support crew",
        "Meeting point agreed for after the race",
        "Dry kit and snacks for after",
        "Portable phone charger"
      ])
    }
  };
}

/* ==========================================================================
   State load / save
   ========================================================================== */

var state = loadState();
var openPhases = new Set();
var openKit = new Set();
var addItemContext = null;
var lastFocusedElement = null;

function loadState() {
  var fallback = defaultState();
  try {
    var raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    var parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallback;
    parsed.race = parsed.race ? Object.assign({}, blankRace(), parsed.race) : null;
    parsed.phases = parsed.phases || fallback.phases;
    parsed.kit = parsed.kit || fallback.kit;
    PHASE_ORDER.forEach(function (key) {
      if (!Array.isArray(parsed.phases[key])) parsed.phases[key] = fallback.phases[key];
    });
    KIT_ORDER.forEach(function (key) {
      if (!Array.isArray(parsed.kit[key])) parsed.kit[key] = fallback.kit[key];
    });
    if (!("weatherCache" in parsed)) parsed.weatherCache = null;
    return parsed;
  } catch (err) {
    console.error("Could not read saved data, starting fresh.", err);
    return fallback;
  }
}

function saveState() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("Could not save your data. Your changes may not persist.", err);
  }
}

function generateId() {
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
}

/* ==========================================================================
   Date and phase helpers
   ========================================================================== */

function daysUntil(dateStr) {
  var race = new Date(dateStr + "T00:00:00");
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((race - today) / 86400000);
}

function raceDateTime() {
  return new Date(state.race.date + "T" + state.race.time + ":00");
}

function currentPhaseKey() {
  var d = daysUntil(state.race.date);
  if (d > 7) return "early";
  if (d >= 1) return "raceweek";
  if (d === 0) return "raceday";
  return "after";
}

function formatDate(dateStr) {
  try {
    var date = new Date(dateStr + "T00:00:00");
    return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(date);
  } catch (err) {
    return dateStr;
  }
}

function formatDistanceMeters(metres) {
  if (metres == null || isNaN(metres)) return "--";
  if (metres < 1000) return metres + "m";
  var km = metres / 1000;
  return trimZero(km) + "km";
}

function formatDistanceKm(km) {
  if (km == null || isNaN(km)) return "--";
  return trimZero(km) + "km";
}

function trimZero(num) {
  var rounded = Math.round(num * 10) / 10;
  return rounded % 1 === 0 ? String(rounded) : String(rounded);
}

function getDistances() {
  var race = state.race;
  if (race.distancePreset === "custom") {
    return {
      swim: race.customSwim,
      bike: race.customBike,
      run: race.customRun
    };
  }
  var preset = DISTANCE_PRESETS[race.distancePreset] || DISTANCE_PRESETS.standard;
  return { swim: preset.swim, bike: preset.bike, run: preset.run };
}

function countdownText() {
  var d = daysUntil(state.race.date);
  if (d > 1) return { number: String(d), unit: "days to go" };
  if (d === 1) return { number: "1", unit: "day to go" };
  if (d === 0) {
    var msDiff = raceDateTime() - new Date();
    if (msDiff > 3 * 3600 * 1000) {
      return { number: "Today", unit: "Starts at " + state.race.time };
    }
    if (msDiff > 0) {
      var hrs = Math.floor(msDiff / 3600000);
      var mins = Math.round((msDiff % 3600000) / 60000);
      var label = hrs > 0 ? hrs + "h " + mins + "m" : mins + "m";
      return { number: label, unit: "to your start" };
    }
    return { number: "Racing", unit: "Good luck out there" };
  }
  var since = Math.abs(d);
  return { number: String(since), unit: since === 1 ? "day since your race" : "days since your race" };
}

function shortCountdownText() {
  var d = daysUntil(state.race.date);
  if (d > 1) return d + " days";
  if (d === 1) return "Tomorrow";
  if (d === 0) return "Today";
  return Math.abs(d) + (Math.abs(d) === 1 ? " day ago" : " days ago");
}

/* ==========================================================================
   Wetsuit guidance
   ========================================================================== */

function computeWetsuitStatus(tempC) {
  if (tempC === null || tempC === undefined || isNaN(tempC)) return null;
  if (tempC < 11) {
    return { status: "banned", message: "Below 11°C, open-water swimming cannot go ahead under British Triathlon rules." };
  }
  if (tempC < 22) {
    return { status: "legal", message: "A wetsuit is legal at this temperature, and most people choose to wear one." };
  }
  if (tempC <= 24.6) {
    return { status: "optional", message: "A wetsuit is optional at this temperature if you're in the 60+ age group. Under 60, wetsuits are banned above 22°C." };
  }
  return { status: "banned", message: "Above 24.6°C, wetsuits are banned under British Triathlon and World Triathlon rules." };
}

/* ==========================================================================
   DOM references
   ========================================================================== */

var els = {
  topbarTitle: document.getElementById("topbar-title"),
  topbarAction: document.getElementById("topbar-action"),
  views: document.getElementById("views"),
  tabs: Array.prototype.slice.call(document.querySelectorAll(".tab")),

  todayEmpty: document.getElementById("today-empty"),
  todayHasRace: document.getElementById("today-has-race"),
  raceStrip: document.getElementById("race-strip"),
  todayRaceName: document.getElementById("today-race-name"),
  todayRaceMeta: document.getElementById("today-race-meta"),
  todayCountNumber: document.getElementById("today-count-number"),
  todayCountUnit: document.getElementById("today-count-unit"),
  todayPhaseLabel: document.getElementById("today-phase-label"),
  todayPhaseBlurb: document.getElementById("today-phase-blurb"),
  todayTasks: document.getElementById("today-tasks"),
  todayKitSummary: document.getElementById("today-kit-summary"),
  todayWeatherSummary: document.getElementById("today-weather-summary"),
  todayFootnote: document.getElementById("today-footnote"),
  resetLink: document.getElementById("reset-link"),
  finishRaceBtn: document.getElementById("finish-race-btn"),

  prepIntro: document.getElementById("prep-intro"),
  phaseList: document.getElementById("phase-list"),

  kitSummaryCount: document.getElementById("kit-summary-count"),
  kitSummaryBar: document.getElementById("kit-summary-bar"),
  kitList: document.getElementById("kit-list"),

  raceName: document.getElementById("race-name"),
  raceMeta: document.getElementById("race-meta"),
  raceCountdownChip: document.getElementById("race-countdown-chip"),
  statSwim: document.getElementById("stat-swim"),
  statBike: document.getElementById("stat-bike"),
  statRun: document.getElementById("stat-run"),
  weatherBody: document.getElementById("weather-body"),
  weatherRefresh: document.getElementById("weather-refresh"),
  waterTempInput: document.getElementById("water-temp-input"),
  wetsuitReadout: document.getElementById("wetsuit-readout"),

  dialogRace: document.getElementById("dialog-race"),
  formRace: document.getElementById("form-race"),
  inputName: document.getElementById("input-name"),
  inputLocation: document.getElementById("input-location"),
  inputLocationOptions: document.getElementById("edit-location-options"),
  inputDate: document.getElementById("input-date"),
  inputTime: document.getElementById("input-time"),
  inputDistance: document.getElementById("input-distance"),
  customDistanceRow: document.getElementById("custom-distance-row"),
  inputSwim: document.getElementById("input-swim"),
  inputBike: document.getElementById("input-bike"),
  inputRun: document.getElementById("input-run"),
  inputNotes: document.getElementById("input-notes"),

  formCreateRace: document.getElementById("form-create-race"),
  createInputName: document.getElementById("create-input-name"),
  createInputLocation: document.getElementById("create-input-location"),
  createInputLocationOptions: document.getElementById("create-location-options"),
  createInputDate: document.getElementById("create-input-date"),
  createInputTime: document.getElementById("create-input-time"),
  createInputDistance: document.getElementById("create-input-distance"),
  createCustomDistanceRow: document.getElementById("create-custom-distance-row"),
  createInputSwim: document.getElementById("create-input-swim"),
  createInputBike: document.getElementById("create-input-bike"),
  createInputRun: document.getElementById("create-input-run"),
  createInputNotes: document.getElementById("create-input-notes"),

  dialogAddItem: document.getElementById("dialog-add-item"),
  formAddItem: document.getElementById("form-add-item"),
  addItemTitle: document.getElementById("add-item-title"),
  addItemInputTitle: document.getElementById("add-item-input-title"),
  addItemInputDetail: document.getElementById("add-item-input-detail"),

  dialogConfirm: document.getElementById("dialog-confirm"),
  confirmTitle: document.getElementById("confirm-title"),
  confirmMessage: document.getElementById("confirm-message"),
  confirmOk: document.getElementById("confirm-ok"),
  confirmCancel: document.getElementById("confirm-cancel")
};

var editLocationCoords = null;
var createLocationCoords = null;
var editLocationAutocomplete = createLocationAutocomplete(els.inputLocation, els.inputLocationOptions, function (coords) {
  editLocationCoords = coords;
});
var createLocationAutocompleteInstance = createLocationAutocomplete(els.createInputLocation, els.createInputLocationOptions, function (coords) {
  createLocationCoords = coords;
});

/* ==========================================================================
   Row / list rendering helpers
   ========================================================================== */

function createRow(item, kind, key, allowDelete) {
  var li = document.createElement("li");
  li.className = "row" + (item.done ? " is-done" : "");
  li.dataset.kind = kind;
  li.dataset.key = key;
  li.dataset.id = item.id;

  var label = document.createElement("label");
  label.className = "row-check";

  var checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = !!item.done;
  checkbox.setAttribute("aria-label", item.title);

  var text = document.createElement("span");
  text.className = "row-text";
  var title = document.createElement("span");
  title.className = "row-title";
  title.textContent = item.title;
  text.appendChild(title);
  if (item.detail) {
    var detail = document.createElement("span");
    detail.className = "row-detail";
    detail.textContent = item.detail;
    text.appendChild(detail);
  }

  label.appendChild(checkbox);
  label.appendChild(text);
  li.appendChild(label);

  if (allowDelete && item.custom) {
    var del = document.createElement("button");
    del.type = "button";
    del.className = "row-delete";
    del.setAttribute("aria-label", "Delete " + item.title);
    del.innerHTML = '<svg class="icon icon-sm" aria-hidden="true"><use href="#icon-x"/></svg>';
    del.addEventListener("click", function (evt) {
      evt.preventDefault();
      confirmAction("Delete task", "Remove \u201c" + item.title + "\u201d from your list?", function () {
        deleteItem(kind, key, item.id);
      });
    });
    li.appendChild(del);
  }

  return li;
}

function findList(kind, key) {
  return kind === "phase" ? state.phases[key] : state.kit[key];
}

function toggleItem(kind, key, id) {
  var list = findList(kind, key);
  var item = list.find(function (entry) { return entry.id === id; });
  if (!item) return;
  item.done = !item.done;
  saveState();
  renderAll();
}

function deleteItem(kind, key, id) {
  var list = findList(kind, key);
  var index = list.findIndex(function (entry) { return entry.id === id; });
  if (index === -1) return;
  list.splice(index, 1);
  saveState();
  renderAll();
}

function buildDisclosureGroup(config) {
  var details = document.createElement("details");
  details.className = "disclosure";
  details.open = config.isOpen;
  details.dataset.key = config.key;

  var list = config.items;
  var doneCount = list.filter(function (i) { return i.done; }).length;
  var total = list.length;
  var pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  var summary = document.createElement("summary");
  summary.innerHTML =
    '<svg class="icon" aria-hidden="true"><use href="#' + config.icon + '"/></svg>' +
    '<span class="disclosure-title">' + escapeHtml(config.title) + "</span>" +
    '<span class="disclosure-meta">' + doneCount + " of " + total + "</span>" +
    '<svg class="icon icon-sm disclosure-chevron" aria-hidden="true"><use href="#icon-chevron"/></svg>';
  details.appendChild(summary);

  var progressWrap = document.createElement("div");
  progressWrap.className = "phase-progress-wrap";
  var track = document.createElement("div");
  track.className = "progress-track";
  var fill = document.createElement("div");
  fill.className = "progress-fill" + (pct === 100 && total > 0 ? " is-complete" : "");
  fill.style.width = pct + "%";
  track.appendChild(fill);
  progressWrap.appendChild(track);
  details.appendChild(progressWrap);

  var ul = document.createElement("ul");
  ul.className = "checklist";
  list.forEach(function (item) {
    ul.appendChild(createRow(item, config.kind, config.key, true));
  });
  details.appendChild(ul);

  var addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "add-row";
  addBtn.innerHTML = '<svg class="icon icon-sm" aria-hidden="true"><use href="#icon-plus"/></svg><span>Add task</span>';
  addBtn.addEventListener("click", function () {
    openAddItemDialog(config.kind, config.key, config.title);
  });
  details.appendChild(addBtn);

  details.addEventListener("toggle", function () {
    var trackerSet = config.kind === "phase" ? openPhases : openKit;
    if (details.open) trackerSet.add(config.key);
    else trackerSet.delete(config.key);
  });

  details.addEventListener("change", function (evt) {
    if (evt.target && evt.target.matches('input[type="checkbox"]')) {
      var li = evt.target.closest("li");
      if (li) toggleItem(li.dataset.kind, li.dataset.key, li.dataset.id);
    }
  });

  return details;
}

function escapeHtml(str) {
  var div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ==========================================================================
   View renderers
   ========================================================================== */

function renderToday() {
  var race = state.race;
  els.todayEmpty.hidden = !!race;
  els.todayHasRace.hidden = !race;
  els.todayFootnote.hidden = !race;
  if (!race) return;

  els.todayRaceName.textContent = race.name || "Your race";
  els.todayRaceMeta.textContent = (race.location || "Location not set") + " \u00B7 " + formatDate(race.date);

  var count = countdownText();
  els.todayCountNumber.textContent = count.number;
  els.todayCountUnit.textContent = count.unit;

  var phaseKey = currentPhaseKey();
  var meta = PHASE_META[phaseKey];
  els.todayPhaseLabel.textContent = meta.title;
  els.todayPhaseBlurb.textContent = meta.blurb;
  els.finishRaceBtn.hidden = phaseKey !== "after";

  els.todayTasks.innerHTML = "";
  var outstanding = state.phases[phaseKey].filter(function (i) { return !i.done; }).slice(0, 3);
  if (outstanding.length === 0) {
    var li = document.createElement("li");
    li.className = "row";
    li.innerHTML = '<span class="row-text"><span class="row-title">Nothing outstanding for this phase</span></span>';
    els.todayTasks.appendChild(li);
  } else {
    outstanding.forEach(function (item) {
      els.todayTasks.appendChild(createRow(item, "phase", phaseKey, false));
    });
  }

  var kitTotal = 0, kitDone = 0;
  KIT_ORDER.forEach(function (key) {
    state.kit[key].forEach(function (item) {
      kitTotal++;
      if (item.done) kitDone++;
    });
  });
  var kitLeft = kitTotal - kitDone;
  els.todayKitSummary.textContent = kitLeft === 0 ? "Everything is packed" : kitLeft + " of " + kitTotal + " items left";

  var d = daysUntil(race.date);
  if (d < 0) {
    els.todayWeatherSummary.textContent = "Your race has been and gone";
  } else if (d > 16) {
    els.todayWeatherSummary.textContent = "Forecast available from 16 days out";
  } else if (state.weatherCache && state.weatherCache.date === race.date && state.weatherCache.locationKey === race.location) {
    var wc = state.weatherCache.data;
    els.todayWeatherSummary.textContent = describeWeatherShort(wc);
  } else {
    els.todayWeatherSummary.textContent = "Tap to check the forecast";
  }
}

function describeWeatherShort(payload) {
  if (!payload) return "Tap to check the forecast";
  var temp = payload.tempAtStart != null ? payload.tempAtStart : payload.tempMax;
  var parts = [];
  if (temp != null) parts.push(Math.round(temp) + "\u00B0C");
  if (payload.precipMax != null) parts.push(Math.round(payload.precipMax) + "% rain");
  return parts.length ? parts.join(" \u00B7 ") : "Forecast ready";
}

function renderPrep() {
  els.prepIntro.textContent = "Everything to do before, during and after " + (state.race && state.race.name || "your race") + ".";
  els.phaseList.innerHTML = "";
  PHASE_ORDER.forEach(function (key) {
    var meta = PHASE_META[key];
    els.phaseList.appendChild(buildDisclosureGroup({
      kind: "phase",
      key: key,
      title: meta.title,
      icon: meta.icon,
      items: state.phases[key],
      isOpen: openPhases.has(key)
    }));
  });
}

function renderKit() {
  var total = 0, done = 0;
  els.kitList.innerHTML = "";
  KIT_ORDER.forEach(function (key) {
    var meta = KIT_META[key];
    var items = state.kit[key];
    total += items.length;
    done += items.filter(function (i) { return i.done; }).length;
    els.kitList.appendChild(buildDisclosureGroup({
      kind: "kit",
      key: key,
      title: meta.title,
      icon: "icon-bag",
      items: items,
      isOpen: openKit.has(key)
    }));
  });
  var left = total - done;
  els.kitSummaryCount.textContent = left === 0 ? "Everything is packed" : left + " items left";
  var pct = total === 0 ? 0 : Math.round((done / total) * 100);
  els.kitSummaryBar.style.width = pct + "%";
  els.kitSummaryBar.classList.toggle("is-complete", pct === 100 && total > 0);
}

function renderRace() {
  var race = state.race;
  if (!race) return;
  els.raceName.textContent = race.name || "Your race";
  els.raceMeta.textContent = (race.location || "Location not set") + " \u00B7 " + formatDate(race.date) + " \u00B7 " + race.time;
  els.raceCountdownChip.textContent = shortCountdownText();

  var distances = getDistances();
  els.statSwim.textContent = formatDistanceMeters(distances.swim);
  els.statBike.textContent = formatDistanceKm(distances.bike);
  els.statRun.textContent = formatDistanceKm(distances.run);

  els.waterTempInput.value = race.waterTemp != null ? race.waterTemp : "";
  updateWetsuitReadout();

  renderWeatherSection();
}

function updateWetsuitReadout() {
  var val = els.waterTempInput.value;
  var tempC = val === "" ? null : parseFloat(val);
  var result = computeWetsuitStatus(tempC);
  els.wetsuitReadout.classList.remove("status-legal", "status-optional", "status-banned");
  if (!result) {
    els.wetsuitReadout.textContent = "Enter a water temperature to see whether a wetsuit is legal, optional or banned.";
    return;
  }
  els.wetsuitReadout.classList.add("status-" + result.status);
  els.wetsuitReadout.textContent = result.message;
}

function renderWeatherSection() {
  var race = state.race;
  var d = daysUntil(race.date);

  if (d < 0) {
    els.weatherBody.innerHTML = '<p class="panel-blurb">Your race has been and gone. Well done for getting through your prep.</p>';
    return;
  }
  if (d > 16) {
    els.weatherBody.innerHTML = '<p class="panel-blurb">The forecast opens up 16 days before race day. Check back on ' + escapeHtml(formatDate(shiftDate(race.date, -16))) + '.</p>';
    return;
  }

  var cacheKey = race.location + "|" + race.date;
  if (state.weatherCache && state.weatherCache.key === cacheKey && state.weatherCache.data) {
    renderWeatherData(state.weatherCache.data);
    return;
  }

  fetchWeather(false);
}

function shiftDate(dateStr, days) {
  var date = new Date(dateStr + "T00:00:00");
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function renderWeatherLoading() {
  els.weatherBody.innerHTML = '<p class="panel-blurb">Checking the forecast.</p>';
}

function renderWeatherError(message) {
  els.weatherBody.innerHTML =
    '<div class="weather-error"><p>' + escapeHtml(message) + '</p></div>';
  var tryAgain = document.createElement("button");
  tryAgain.type = "button";
  tryAgain.className = "btn btn-secondary";
  tryAgain.textContent = "Try again";
  tryAgain.addEventListener("click", function () { fetchWeather(true); });
  els.weatherBody.querySelector(".weather-error").appendChild(tryAgain);
}

function renderWeatherData(payload) {
  var rows = [];
  if (payload.tempAtStart != null) {
    rows.push({ label: "At your " + state.race.time + " start", value: Math.round(payload.tempAtStart) + "\u00B0C" });
  }
  rows.push({ label: "Range for the day", value: Math.round(payload.tempMin) + "\u2013" + Math.round(payload.tempMax) + "\u00B0C" });
  rows.push({ label: "Chance of rain", value: Math.round(payload.precipMax) + "%" });
  rows.push({ label: "Wind", value: Math.round(payload.windMax) + " km/h" });
  if (payload.sunrise) rows.push({ label: "Sunrise", value: payload.sunrise });
  if (payload.uvMax != null) rows.push({ label: "UV index", value: String(Math.round(payload.uvMax)) });

  var html = '<div class="weather-body-row">';
  rows.forEach(function (row) {
    html += '<div class="weather-stat"><span class="weather-stat-value">' + escapeHtml(row.value) + '</span><span class="weather-stat-label">' + escapeHtml(row.label) + '</span></div>';
  });
  html += "</div>";
  html += '<p class="panel-blurb">' + escapeHtml(weatherAdvisory(payload)) + '</p>';
  els.weatherBody.innerHTML = html;
}

function weatherAdvisory(payload) {
  if (payload.precipMax >= 50) return "Rain looks likely. Pack accordingly for transition.";
  if (payload.windMax >= 25) return "A breezy forecast for the bike leg.";
  if (payload.tempMax <= 10) return "A cold start. Plan warm layers for the wait before your wave.";
  return "Conditions look reasonable. Check again closer to race day.";
}

/* ==========================================================================
   Weather fetching (Open-Meteo, no API key required)
   ========================================================================== */

function fetchWeather(force) {
  var race = state.race;
  var cacheKey = race.location + "|" + race.date;
  if (!force && state.weatherCache && state.weatherCache.key === cacheKey && state.weatherCache.data) {
    renderWeatherData(state.weatherCache.data);
    return;
  }
  if (!race.location || !race.location.trim()) {
    renderWeatherError("Add a race location to fetch a forecast.");
    return;
  }
  renderWeatherLoading();

  var geoLookup = (race.locationLat != null && race.locationLon != null)
    ? Promise.resolve({ lat: race.locationLat, lon: race.locationLon })
    : geocodeLocation(race.location);

  geoLookup
    .then(function (geo) {
      return getForecast(geo.lat, geo.lon, race.date).then(function (payload) {
        state.weatherCache = { key: cacheKey, locationKey: race.location, date: race.date, data: payload };
        saveState();
        renderWeatherData(payload);
        els.todayWeatherSummary.textContent = describeWeatherShort(payload);
      });
    })
    .catch(function (err) {
      console.error(err);
      var message = err && err.message === "Location not found."
        ? "Could not find that location. Try a nearby town or city name instead."
        : "Could not load the forecast. Check your connection and try again.";
      renderWeatherError(message);
    });
}

function geocodeLocation(location) {
  var candidates = [location];
  var parts = location.split(",").map(function (part) { return part.trim(); }).filter(Boolean);
  if (parts.length > 1) candidates.push(parts[parts.length - 1]);

  function tryCandidate(index, countryCode) {
    if (index >= candidates.length) {
      if (countryCode) return tryCandidate(0, null);
      throw new Error("Location not found.");
    }
    var url = "https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(candidates[index]) + "&count=1&language=en&format=json";
    if (countryCode) url += "&countryCode=" + countryCode;
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("Geocoding request failed.");
      return res.json();
    }).then(function (json) {
      if (!json.results || !json.results.length) return tryCandidate(index + 1, countryCode);
      return { lat: json.results[0].latitude, lon: json.results[0].longitude };
    });
  }

  return tryCandidate(0, "GB");
}

function searchLocations(query) {
  var baseUrl = "https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(query) + "&count=6&language=en&format=json";
  function fetchResults(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("Geocoding request failed.");
      return res.json();
    }).then(function (json) {
      return json.results || [];
    });
  }
  return Promise.all([
    fetchResults(baseUrl + "&countryCode=GB"),
    fetchResults(baseUrl)
  ]).then(function (lists) {
    var seen = {};
    var merged = [];
    lists[0].concat(lists[1]).forEach(function (result) {
      if (seen[result.id]) return;
      seen[result.id] = true;
      merged.push(result);
    });
    return merged.slice(0, 8);
  });
}

function formatLocationResult(result) {
  var parts = [result.name];
  if (result.admin1 && result.admin1 !== result.name) parts.push(result.admin1);
  if (result.country) parts.push(result.country);
  return parts.join(", ");
}

function getForecast(lat, lon, dateStr) {
  var url = "https://api.open-meteo.com/v1/forecast" +
    "?latitude=" + lat + "&longitude=" + lon +
    "&hourly=temperature_2m,precipitation_probability,wind_speed_10m" +
    "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise" +
    "&timezone=auto&start_date=" + dateStr + "&end_date=" + dateStr;
  return fetch(url).then(function (res) {
    if (!res.ok) throw new Error("Forecast request failed.");
    return res.json();
  }).then(function (json) {
    if (!json.daily || !json.daily.time || !json.daily.time.length) throw new Error("No forecast data returned.");
    var payload = {
      tempMin: json.daily.temperature_2m_min[0],
      tempMax: json.daily.temperature_2m_max[0],
      precipMax: json.daily.precipitation_probability_max[0],
      windMax: json.daily.wind_speed_10m_max[0],
      uvMax: json.daily.uv_index_max ? json.daily.uv_index_max[0] : null,
      sunrise: json.daily.sunrise ? json.daily.sunrise[0].slice(11, 16) : null,
      tempAtStart: null
    };
    if (json.hourly && json.hourly.time) {
      var hh = state.race.time.slice(0, 2);
      var target = dateStr + "T" + hh + ":00";
      var idx = json.hourly.time.indexOf(target);
      if (idx >= 0) payload.tempAtStart = json.hourly.temperature_2m[idx];
    }
    return payload;
  });
}

/* ==========================================================================
   Full render
   ========================================================================== */

function renderAll() {
  renderToday();
  renderPrep();
  renderKit();
  renderRace();
  updateTabbarVisibility();
}

/* ==========================================================================
   Navigation
   ========================================================================== */

var VIEW_TITLES = { today: "Today", prep: "Prep", kit: "Kit", race: "Race", "create-race": "Create your race" };
var TABBED_VIEWS = ["today", "prep", "kit", "race"];
var RACE_ONLY_VIEWS = ["prep", "kit", "race"];
var currentView = "today";

function navigate(view) {
  if (!VIEW_TITLES[view]) view = "today";
  if (!state.race && RACE_ONLY_VIEWS.indexOf(view) !== -1) view = "today";
  currentView = view;
  Object.keys(VIEW_TITLES).forEach(function (key) {
    var section = document.getElementById("view-" + key);
    if (section) section.hidden = key !== view;
  });
  els.tabs.forEach(function (tab) {
    tab.setAttribute("aria-current", tab.dataset.target === view ? "true" : "false");
  });
  els.topbarTitle.textContent = VIEW_TITLES[view];
  els.topbarAction.hidden = view !== "race";
  els.views.scrollTop = 0;
  updateTabbarVisibility();
}

function updateTabbarVisibility() {
  els.tabs.forEach(function (tab) {
    var target = tab.dataset.target;
    tab.hidden = !state.race && RACE_ONLY_VIEWS.indexOf(target) !== -1;
  });
}

/* ==========================================================================
   Dialog helpers
   ========================================================================== */

function openDialog(dialog) {
  lastFocusedElement = document.activeElement;
  dialog.showModal();
}

function closeDialog(dialog) {
  if (dialog.open) dialog.close();
  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
}

document.querySelectorAll("[data-close-dialog]").forEach(function (btn) {
  btn.addEventListener("click", function () {
    closeDialog(document.getElementById(btn.dataset.closeDialog));
  });
});

[els.dialogRace, els.dialogAddItem, els.dialogConfirm].forEach(function (dialog) {
  dialog.addEventListener("click", function (evt) {
    if (evt.target === dialog) closeDialog(dialog);
  });
  dialog.addEventListener("cancel", function (evt) {
    evt.preventDefault();
    closeDialog(dialog);
  });
});

function confirmAction(title, message, onConfirm) {
  els.confirmTitle.textContent = title;
  els.confirmMessage.textContent = message;
  els.confirmOk.onclick = function () {
    onConfirm();
    closeDialog(els.dialogConfirm);
    els.confirmOk.onclick = null;
  };
  els.confirmCancel.onclick = function () { closeDialog(els.dialogConfirm); };
  openDialog(els.dialogConfirm);
}

function openAddItemDialog(kind, key, label) {
  addItemContext = { kind: kind, key: key };
  els.addItemTitle.textContent = "Add to " + label;
  els.formAddItem.reset();
  openDialog(els.dialogAddItem);
  els.addItemInputTitle.focus();
}

function openRaceDialog() {
  var race = state.race;
  els.inputName.value = race.name || "";
  els.inputLocation.value = race.location || "";
  els.inputDate.value = race.date || "";
  els.inputTime.value = race.time || "";
  els.inputDistance.value = race.distancePreset || "standard";
  els.inputSwim.value = race.customSwim != null ? race.customSwim : "";
  els.inputBike.value = race.customBike != null ? race.customBike : "";
  els.inputRun.value = race.customRun != null ? race.customRun : "";
  els.inputNotes.value = race.notes || "";
  editLocationCoords = (race.locationLat != null && race.locationLon != null)
    ? { lat: race.locationLat, lon: race.locationLon }
    : null;
  editLocationAutocomplete.setCoords(editLocationCoords);
  toggleCustomDistanceRow();
  openDialog(els.dialogRace);
}

function toggleCustomDistanceRow() {
  els.customDistanceRow.hidden = els.inputDistance.value !== "custom";
}

function resetCreateRaceForm() {
  els.formCreateRace.reset();
  els.createInputDistance.value = "standard";
  createLocationCoords = null;
  createLocationAutocompleteInstance.reset();
  toggleCreateCustomDistanceRow();
}

function toggleCreateCustomDistanceRow() {
  els.createCustomDistanceRow.hidden = els.createInputDistance.value !== "custom";
}

/* ==========================================================================
   Location autocomplete
   ========================================================================== */

function createLocationAutocomplete(inputEl, listEl, onSelect) {
  var debounceTimer = null;
  var results = [];
  var activeIndex = -1;
  var selectedCoords = null;
  var requestId = 0;

  function closeList() {
    listEl.hidden = true;
    listEl.innerHTML = "";
    activeIndex = -1;
    inputEl.setAttribute("aria-expanded", "false");
    inputEl.removeAttribute("aria-activedescendant");
  }

  function renderList() {
    listEl.innerHTML = "";
    if (!results.length) { closeList(); return; }
    results.forEach(function (result, index) {
      var li = document.createElement("li");
      li.className = "autocomplete-option" + (index === activeIndex ? " is-active" : "");
      li.id = inputEl.id + "-option-" + index;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", index === activeIndex ? "true" : "false");
      li.textContent = formatLocationResult(result);
      li.addEventListener("mousedown", function (evt) {
        evt.preventDefault();
        selectResult(index);
      });
      listEl.appendChild(li);
    });
    listEl.hidden = false;
    inputEl.setAttribute("aria-expanded", "true");
    if (activeIndex >= 0) {
      inputEl.setAttribute("aria-activedescendant", inputEl.id + "-option-" + activeIndex);
    } else {
      inputEl.removeAttribute("aria-activedescendant");
    }
  }

  function selectResult(index) {
    var result = results[index];
    if (!result) return;
    inputEl.value = formatLocationResult(result);
    selectedCoords = { lat: result.latitude, lon: result.longitude };
    onSelect(selectedCoords);
    closeList();
  }

  inputEl.addEventListener("input", function () {
    selectedCoords = null;
    onSelect(null);
    var query = inputEl.value.trim();
    if (debounceTimer) clearTimeout(debounceTimer);
    if (query.length < 3) { closeList(); return; }
    debounceTimer = setTimeout(function () {
      var thisRequest = ++requestId;
      searchLocations(query).then(function (found) {
        if (thisRequest !== requestId) return;
        results = found;
        activeIndex = -1;
        renderList();
      }).catch(function () {
        if (thisRequest !== requestId) return;
        closeList();
      });
    }, 350);
  });

  inputEl.addEventListener("keydown", function (evt) {
    if (listEl.hidden) return;
    if (evt.key === "ArrowDown") {
      evt.preventDefault();
      activeIndex = Math.min(activeIndex + 1, results.length - 1);
      renderList();
    } else if (evt.key === "ArrowUp") {
      evt.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      renderList();
    } else if (evt.key === "Enter") {
      evt.preventDefault();
      selectResult(activeIndex >= 0 ? activeIndex : 0);
    } else if (evt.key === "Escape") {
      closeList();
    }
  });

  inputEl.addEventListener("blur", function () {
    setTimeout(closeList, 100);
  });

  return {
    reset: function () {
      selectedCoords = null;
      results = [];
      closeList();
    },
    getCoords: function () { return selectedCoords; },
    setCoords: function (coords) { selectedCoords = coords; }
  };
}

/* ==========================================================================
   Event wiring
   ========================================================================== */

els.tabs.forEach(function (tab) {
  tab.addEventListener("click", function () { navigate(tab.dataset.target); });
});

document.querySelectorAll("[data-nav]").forEach(function (el) {
  el.addEventListener("click", function () {
    if (el.dataset.nav === "create-race") resetCreateRaceForm();
    navigate(el.dataset.nav);
  });
});

els.topbarAction.addEventListener("click", openRaceDialog);

function clearAllData() {
  state = defaultState();
  openPhases = new Set();
  openKit = new Set();
  saveState();
  renderAll();
  navigate("today");
}

els.resetLink.addEventListener("click", function () {
  confirmAction(
    "Reset all data",
    "This clears your race details and every checklist. This cannot be undone.",
    clearAllData
  );
});

els.finishRaceBtn.addEventListener("click", function () {
  confirmAction(
    "Finish this race",
    "This clears your race details and every checklist, ready for your next race. This cannot be undone.",
    clearAllData
  );
});

els.inputDistance.addEventListener("change", toggleCustomDistanceRow);

els.formRace.addEventListener("submit", function (evt) {
  evt.preventDefault();
  var previousLocation = state.race.location;
  var previousDate = state.race.date;
  state.race.name = els.inputName.value.trim();
  state.race.location = els.inputLocation.value.trim();
  state.race.locationLat = editLocationCoords ? editLocationCoords.lat : null;
  state.race.locationLon = editLocationCoords ? editLocationCoords.lon : null;
  state.race.date = els.inputDate.value;
  state.race.time = els.inputTime.value;
  state.race.distancePreset = els.inputDistance.value;
  state.race.customSwim = els.inputSwim.value === "" ? null : parseFloat(els.inputSwim.value);
  state.race.customBike = els.inputBike.value === "" ? null : parseFloat(els.inputBike.value);
  state.race.customRun = els.inputRun.value === "" ? null : parseFloat(els.inputRun.value);
  state.race.notes = els.inputNotes.value.trim();
  if (previousLocation !== state.race.location || previousDate !== state.race.date) {
    state.weatherCache = null;
  }
  saveState();
  closeDialog(els.dialogRace);
  renderAll();
});

els.createInputDistance.addEventListener("change", toggleCreateCustomDistanceRow);

els.formCreateRace.addEventListener("submit", function (evt) {
  evt.preventDefault();
  var race = blankRace();
  race.name = els.createInputName.value.trim();
  race.location = els.createInputLocation.value.trim();
  race.locationLat = createLocationCoords ? createLocationCoords.lat : null;
  race.locationLon = createLocationCoords ? createLocationCoords.lon : null;
  race.date = els.createInputDate.value;
  race.time = els.createInputTime.value;
  race.distancePreset = els.createInputDistance.value;
  race.customSwim = els.createInputSwim.value === "" ? null : parseFloat(els.createInputSwim.value);
  race.customBike = els.createInputBike.value === "" ? null : parseFloat(els.createInputBike.value);
  race.customRun = els.createInputRun.value === "" ? null : parseFloat(els.createInputRun.value);
  race.notes = els.createInputNotes.value.trim();
  state.race = race;
  state.weatherCache = null;
  openPhases = new Set();
  openKit = new Set();
  saveState();
  renderAll();
  navigate("today");
});

els.formAddItem.addEventListener("submit", function (evt) {
  evt.preventDefault();
  if (!addItemContext) return;
  var title = els.addItemInputTitle.value.trim();
  if (!title) return;
  var detail = els.addItemInputDetail.value.trim();
  var list = findList(addItemContext.kind, addItemContext.key);
  list.push({ id: generateId(), title: title, detail: detail, done: false, custom: true });
  if (addItemContext.kind === "phase") openPhases.add(addItemContext.key);
  else openKit.add(addItemContext.key);
  saveState();
  closeDialog(els.dialogAddItem);
  renderAll();
});

els.weatherRefresh.addEventListener("click", function () {
  var d = daysUntil(state.race.date);
  if (d < 0 || d > 16) {
    renderWeatherSection();
    return;
  }
  fetchWeather(true);
});

els.waterTempInput.addEventListener("input", function () {
  var val = els.waterTempInput.value;
  state.race.waterTemp = val === "" ? null : parseFloat(val);
  saveState();
  updateWetsuitReadout();
});

/* ==========================================================================
   Init
   ========================================================================== */

renderAll();
navigate("today");
