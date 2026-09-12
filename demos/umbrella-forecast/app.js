"use strict";

/* ------------------------------------------------------------------ *
 * 定数
 * ------------------------------------------------------------------ */
const GEOCODE_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const REVERSE_GEOCODE_URL = "https://nominatim.openstreetmap.org/reverse";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

// WMO weather code -> [絵文字, 説明]
const WEATHER_CODE_MAP = {
  0: ["☀️", "快晴"], 1: ["🌤️", "晴れ"], 2: ["⛅", "薄曇り"], 3: ["☁️", "曇り"],
  45: ["🌫️", "霧"], 48: ["🌫️", "霧氷"],
  51: ["🌦️", "小雨"], 53: ["🌦️", "小雨"], 55: ["🌧️", "雨"],
  56: ["🌧️", "着氷性の雨"], 57: ["🌧️", "着氷性の雨"],
  61: ["🌧️", "弱い雨"], 63: ["🌧️", "雨"], 65: ["🌧️", "強い雨"],
  66: ["🌧️", "着氷性の雨"], 67: ["🌧️", "着氷性の雨"],
  71: ["🌨️", "弱い雪"], 73: ["🌨️", "雪"], 75: ["❄️", "強い雪"], 77: ["❄️", "雪あられ"],
  80: ["🌦️", "にわか雨"], 81: ["🌧️", "にわか雨"], 82: ["⛈️", "激しいにわか雨"],
  85: ["🌨️", "にわか雪"], 86: ["❄️", "激しいにわか雪"],
  95: ["⛈️", "雷雨"], 96: ["⛈️", "雷雨（ひょう）"], 99: ["⛈️", "激しい雷雨"],
};

function weatherIcon(code) {
  return (WEATHER_CODE_MAP[code] || ["🌡️", "不明"])[0];
}

/* ------------------------------------------------------------------ *
 * 状態
 * ------------------------------------------------------------------ */
let selectedLocation = null; // { lat, lon, name }

/* ------------------------------------------------------------------ *
 * DOM 参照
 * ------------------------------------------------------------------ */
const el = {
  tabBtns: document.querySelectorAll(".tab-btn"),
  tabCurrent: document.getElementById("tab-current"),
  tabSearch: document.getElementById("tab-search"),
  btnGeolocate: document.getElementById("btn-geolocate"),
  geolocateStatus: document.getElementById("geolocate-status"),
  inputSearch: document.getElementById("input-search"),
  btnSearch: document.getElementById("btn-search"),
  searchResults: document.getElementById("search-results"),
  selectedLocationBox: document.getElementById("selected-location"),
  selectedLocationName: document.getElementById("selected-location-name"),
  inputDate: document.getElementById("input-date"),
  inputTime: document.getElementById("input-time"),
  inputDuration: document.getElementById("input-duration"),
  btnCheck: document.getElementById("btn-check"),
  globalStatus: document.getElementById("global-status"),
  resultCard: document.getElementById("result-card"),
  verdictIcon: document.getElementById("verdict-icon"),
  verdictHeadline: document.getElementById("verdict-headline"),
  verdictSub: document.getElementById("verdict-sub"),
  statProb: document.getElementById("stat-prob"),
  statPrecip: document.getElementById("stat-precip"),
  statTemp: document.getElementById("stat-temp"),
  hourlyList: document.getElementById("hourly-list"),
};

/* ------------------------------------------------------------------ *
 * 初期化
 * ------------------------------------------------------------------ */
function init() {
  const now = new Date();
  el.inputDate.value = formatDateInput(now);
  const rounded = new Date(now);
  rounded.setMinutes(0, 0, 0);
  rounded.setHours(rounded.getHours() + (now.getMinutes() > 0 ? 1 : 0));
  el.inputTime.value = formatTimeInput(rounded);

  el.tabBtns.forEach((btn) => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));
  el.btnGeolocate.addEventListener("click", handleGeolocate);
  el.btnSearch.addEventListener("click", handleSearch);
  el.inputSearch.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleSearch(); }
  });
  el.btnCheck.addEventListener("click", handleCheckForecast);
}

function formatDateInput(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function formatTimeInput(d) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ *
 * タブ切り替え
 * ------------------------------------------------------------------ */
function switchTab(name) {
  el.tabBtns.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === name));
  el.tabCurrent.classList.toggle("hidden", name !== "current");
  el.tabSearch.classList.toggle("hidden", name !== "search");
}

/* ------------------------------------------------------------------ *
 * 現在地取得
 * ------------------------------------------------------------------ */
function handleGeolocate() {
  if (!navigator.geolocation) {
    el.geolocateStatus.textContent = "このブラウザは位置情報取得に対応していません。";
    el.geolocateStatus.classList.add("error-text");
    return;
  }
  el.geolocateStatus.classList.remove("error-text");
  el.geolocateStatus.textContent = "現在地を取得中...";
  el.btnGeolocate.disabled = true;

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        const name = await reverseGeocode(latitude, longitude);
        setSelectedLocation({ lat: latitude, lon: longitude, name });
        el.geolocateStatus.textContent = "現在地を取得しました。";
      } catch (err) {
        setSelectedLocation({ lat: latitude, lon: longitude, name: `緯度${latitude.toFixed(3)}, 経度${longitude.toFixed(3)}` });
        el.geolocateStatus.textContent = "地名の取得に失敗しましたが、座標は取得できました。";
      } finally {
        el.btnGeolocate.disabled = false;
      }
    },
    (err) => {
      el.btnGeolocate.disabled = false;
      el.geolocateStatus.classList.add("error-text");
      if (err.code === err.PERMISSION_DENIED) {
        el.geolocateStatus.textContent = "位置情報の利用が許可されていません。ブラウザの設定を確認してください。";
      } else {
        el.geolocateStatus.textContent = "現在地の取得に失敗しました。";
      }
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
  );
}

async function reverseGeocode(lat, lon) {
  const url = `${REVERSE_GEOCODE_URL}?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=ja&zoom=10`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("reverse geocode failed");
  const data = await res.json();
  const addr = data.address || {};
  const parts = [addr.city || addr.town || addr.village || addr.county, addr.state].filter(Boolean);
  return parts.length ? parts.join(" ") : (data.display_name || "現在地");
}

/* ------------------------------------------------------------------ *
 * 地名検索
 * ------------------------------------------------------------------ */
async function handleSearch() {
  const query = el.inputSearch.value.trim();
  el.searchResults.innerHTML = "";
  if (!query) return;

  el.btnSearch.disabled = true;
  el.btnSearch.textContent = "検索中...";
  try {
    const url = `${GEOCODE_SEARCH_URL}?q=${encodeURIComponent(query)}&format=jsonv2&addressdetails=1&limit=6&accept-language=ja`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const results = await res.json();
    if (!Array.isArray(results) || results.length === 0) {
      const li = document.createElement("li");
      li.className = "result-item";
      li.textContent = "見つかりませんでした。";
      el.searchResults.appendChild(li);
      return;
    }
    results.forEach((r) => {
      const li = document.createElement("li");
      li.className = "result-item";
      const addr = r.address || {};
      const primary = addr.city || addr.town || addr.village || addr.county || r.name || r.display_name.split(",")[0];
      const sub = r.display_name;
      li.innerHTML = `${escapeHtml(primary)}<span class="place-sub">${escapeHtml(sub)}</span>`;
      li.addEventListener("click", () => {
        const pref = addr.state || addr.province;
        setSelectedLocation({ lat: parseFloat(r.lat), lon: parseFloat(r.lon), name: [primary, pref].filter((v, i, a) => v && a.indexOf(v) === i).join(" ") });
        el.searchResults.innerHTML = "";
        el.inputSearch.value = "";
      });
      el.searchResults.appendChild(li);
    });
  } catch (err) {
    const li = document.createElement("li");
    li.className = "result-item error-text";
    li.textContent = "検索に失敗しました。通信環境を確認してください。";
    el.searchResults.appendChild(li);
  } finally {
    el.btnSearch.disabled = false;
    el.btnSearch.textContent = "検索";
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ------------------------------------------------------------------ *
 * 場所の確定
 * ------------------------------------------------------------------ */
function setSelectedLocation(loc) {
  selectedLocation = loc;
  el.selectedLocationBox.classList.remove("hidden");
  el.selectedLocationName.textContent = loc.name;
  el.btnCheck.disabled = false;
}

/* ------------------------------------------------------------------ *
 * 予報チェック
 * ------------------------------------------------------------------ */
async function handleCheckForecast() {
  if (!selectedLocation) return;

  const dateStr = el.inputDate.value;
  const timeStr = el.inputTime.value;
  const durationHours = parseInt(el.inputDuration.value, 10);
  if (!dateStr || !timeStr) {
    setGlobalStatus("日付と時刻を指定してください。", true);
    return;
  }

  const start = new Date(`${dateStr}T${timeStr}:00`);
  if (isNaN(start.getTime())) {
    setGlobalStatus("日時の指定が正しくありません。", true);
    return;
  }
  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

  const daysAhead = Math.ceil((end - stripTime(new Date())) / (24 * 60 * 60 * 1000)) + 1;
  const forecastDays = Math.min(Math.max(daysAhead, 1), 16);

  setGlobalStatus("予報を取得中...", false);
  el.btnCheck.disabled = true;
  el.resultCard.classList.add("hidden");

  try {
    const url = `${FORECAST_URL}?latitude=${selectedLocation.lat}&longitude=${selectedLocation.lon}` +
      `&hourly=precipitation_probability,precipitation,temperature_2m,weathercode` +
      `&forecast_days=${forecastDays}&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("forecast request failed");
    const data = await res.json();

    const hourly = extractWindow(data, start, end);
    if (hourly.length === 0) {
      setGlobalStatus("指定した日時の予報データが取得できませんでした（16日以上先、または過去の日時は取得できません）。", true);
      return;
    }
    renderResult(hourly);
    setGlobalStatus("", false);
  } catch (err) {
    setGlobalStatus("予報の取得に失敗しました。通信環境を確認してください。", true);
  } finally {
    el.btnCheck.disabled = false;
  }
}

function stripTime(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function extractWindow(data, start, end) {
  const times = data.hourly.time;
  const out = [];
  for (let i = 0; i < times.length; i++) {
    const t = new Date(times[i]);
    if (t >= start && t < end) {
      out.push({
        time: t,
        prob: data.hourly.precipitation_probability[i],
        precip: data.hourly.precipitation[i],
        temp: data.hourly.temperature_2m[i],
        code: data.hourly.weathercode[i],
      });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * 結果表示
 * ------------------------------------------------------------------ */
function renderResult(hourly) {
  const maxProb = Math.max(...hourly.map((h) => h.prob ?? 0));
  const totalPrecip = hourly.reduce((sum, h) => sum + (h.precip || 0), 0);
  const temps = hourly.map((h) => h.temp).filter((t) => t !== null && t !== undefined);
  const minTemp = temps.length ? Math.min(...temps) : null;
  const maxTemp = temps.length ? Math.max(...temps) : null;

  let level, icon, headline, sub;
  if (maxProb < 20 && totalPrecip < 0.2) {
    level = "safe"; icon = "☀️"; headline = "傘は不要です";
    sub = "この時間帯は雨の心配はほぼありません。";
  } else if (maxProb < 50 && totalPrecip < 1) {
    level = "warn"; icon = "🌂"; headline = "念のため折りたたみ傘があると安心";
    sub = "小雨がぱらつく可能性があります。";
  } else {
    level = "danger"; icon = "☂️"; headline = "傘は必須です";
    sub = "まとまった雨が予想されます。";
  }

  el.verdictIcon.textContent = icon;
  el.verdictIcon.className = `verdict-icon ${level}`;
  el.verdictHeadline.textContent = headline;
  el.verdictSub.textContent = sub;

  el.statProb.textContent = `${Math.round(maxProb)}%`;
  el.statPrecip.textContent = `${totalPrecip.toFixed(1)}mm`;
  el.statTemp.textContent = minTemp !== null ? `${Math.round(minTemp)}〜${Math.round(maxTemp)}°C` : "--°C";

  el.hourlyList.innerHTML = "";
  hourly.forEach((h) => {
    const row = document.createElement("div");
    row.className = "hourly-row";
    const timeLabel = `${String(h.time.getHours()).padStart(2, "0")}:00`;
    const prob = Math.max(0, Math.min(100, h.prob ?? 0));
    row.innerHTML = `
      <span class="h-time">${timeLabel}</span>
      <span class="h-icon">${weatherIcon(h.code)}</span>
      <span class="h-bar-wrap"><span class="h-bar" style="width:${prob}%"></span></span>
      <span class="h-prob">${prob}%</span>
      <span class="h-precip">${(h.precip || 0).toFixed(1)}mm</span>
    `;
    el.hourlyList.appendChild(row);
  });

  el.resultCard.classList.remove("hidden");
  el.resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setGlobalStatus(msg, isError) {
  el.globalStatus.textContent = msg;
  el.globalStatus.classList.toggle("error-text", !!isError);
}

init();
