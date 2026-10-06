/**
 * GeoAI Flood Simulation — Pontianak Multi-Zone Study Basins
 * Implementation matching Slide 15–20 of Dr. Ir. Yus Sholva's lecture.
 */

// Simulation Stages (Slide 15: Gambar 1 s/d 5)
const STAGES = [
  {
    step: 0,
    hours: 0.0,
    label: "Kondisi Normal (0.0 Jam)",
    figure: "Kondisi Normal",
    description: "Kondisi cuaca cerah; muka air tanah di bawah elevasi permukaan. Drainase parit alami berfungsi normal tanpa limpasan permukaan.",
    maxBand: -1,
    rainfall_mm: 0,
    risk: "AMAN",
    riskClass: "tier-aman",
    leadTime: "> 12 Jam",
    waterLevel: 0.15
  },
  {
    step: 1,
    hours: 1.0,
    label: "Hujan 1.0 Jam",
    figure: "Gambar 1",
    description: "Air mulai menggenangi cekungan depresi terendah (Dataran Rendah). Muka air mencapai 0,45 m.",
    maxBand: 0,
    rainfall_mm: 45,
    risk: "WASPADA",
    riskClass: "tier-waspada",
    leadTime: "6–8 Jam",
    waterLevel: 0.45
  },
  {
    step: 2,
    hours: 1.5,
    label: "Hujan 1.5 Jam",
    figure: "Gambar 2",
    description: "Hujan berlanjut; genangan meluas melintasi elevasi kontur kedua, muka air naik ke 0,88 m.",
    maxBand: 1,
    rainfall_mm: 68,
    risk: "WASPADA",
    riskClass: "tier-waspada",
    leadTime: "3–4 Jam",
    waterLevel: 0.88
  },
  {
    step: 3,
    hours: 2.0,
    label: "Hujan 2.0 Jam",
    figure: "Gambar 3",
    description: "Efek backwater pasang laut menahan aliran parit; kontur ketiga tergenang luas. Muka air mencapai 1,48 m.",
    maxBand: 2,
    rainfall_mm: 90,
    risk: "SIAGA",
    riskClass: "tier-siaga",
    leadTime: "1–2 Jam",
    waterLevel: 1.48
  },
  {
    step: 4,
    hours: 2.5,
    label: "Hujan 2.5 Jam",
    figure: "Gambar 4",
    description: "Genangan masif menutupi mayoritas permukiman cekungan hingga elevasi kontur keempat. Muka air mencapai 2,12 m.",
    maxBand: 3,
    rainfall_mm: 115,
    risk: "SIAGA",
    riskClass: "tier-siaga",
    leadTime: "< 1 Jam",
    waterLevel: 2.12
  },
  {
    step: 5,
    hours: 3.0,
    label: "Hujan 3.0 Jam",
    figure: "Gambar 5",
    description: "Puncak inundasi ekstrem; kapasitas tampung tanah gambut & aluvial jenuh total. Muka air mencapai 2,85 m.",
    maxBand: 4,
    rainfall_mm: 140,
    risk: "BANJIR",
    riskClass: "tier-banjir",
    leadTime: "AKTIF",
    waterLevel: 2.85
  }
];

// Helper: Indonesian number formatting
function formatIdNum(n, decimals = 1) {
  if (n === null || n === undefined) return "0";
  return n.toLocaleString("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function formatIntId(n) {
  return Math.round(n).toLocaleString("id-ID");
}

// App State
let currentZone = null;
let currentStep = 1;
let isPlaying = false;
let playInterval = null;
let playSpeed = 1600;

// Leaflet Map & Layer Groups
let map;
let layerContours;
let layerFlood;
let layerReal;
let layerFlows;
let layerRivers;
let layerStations;

document.addEventListener("DOMContentLoaded", () => {
  const defaultZoneId = (BASIN_DATA.meta && BASIN_DATA.meta.default_zone) || "pontianak_selatan";
  currentZone = BASIN_DATA.zones.find(z => z.id === defaultZoneId) || BASIN_DATA.zones[0];

  initMap();
  initRainOverlay();
  setupControls();
  setupZoneSelector();
  selectZone(currentZone.id, false); // initial render
});

function initMap() {
  const center = [currentZone.center[1], currentZone.center[0]];

  map = L.map("map", {
    center: center,
    zoom: 14,
    zoomControl: true,
    attributionControl: true
  });

  // Scale bar
  L.control.scale({
    metric: true,
    imperial: false,
    position: "bottomleft"
  }).addTo(map);

  // Base Tiles with Cartographic Attribution
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    minZoom: 12,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Studi GeoAI Pontianak (Dr. Ir. Yus Sholva)'
  }).addTo(map);

  // Initialize Layer Groups
  layerContours = L.layerGroup().addTo(map);
  layerReal = L.layerGroup().addTo(map);
  layerFlood = L.layerGroup().addTo(map);
  layerFlows = L.layerGroup().addTo(map);
  layerRivers = L.layerGroup().addTo(map);
  layerStations = L.layerGroup().addTo(map);

  drawRivers();
  drawStations();
}

// Switch Active Zone (Pontianak Selatan, Barat, Timur, Tenggara)
function selectZone(zoneId, fly = true) {
  const target = BASIN_DATA.zones.find(z => z.id === zoneId);
  if (!target) return;

  currentZone = target;

  // Fly map smoothly to zone center
  if (fly && map) {
    map.flyTo([currentZone.center[1], currentZone.center[0]], 14, { duration: 1.2 });
  }

  // Update Geotechnical Info
  document.getElementById("geoSoil").innerText = currentZone.soil;
  document.getElementById("geoGWL").innerText = currentZone.water_table;
  document.getElementById("geoDrainage").innerText = currentZone.drainage;
  document.getElementById("geoRunoffC").innerText = formatIdNum(currentZone.runoff_c, 2);

  // Update Zone Notes Callout
  const notesEl = document.getElementById("zoneNotes");
  if (notesEl) {
    notesEl.innerHTML = `
      <span class="zone-notes-title">${currentZone.name} — ${currentZone.subtitle}</span>
      ${currentZone.notes}
    `;
  }

  // Sync Dropdown selector
  const selectEl = document.getElementById("zoneSelect");
  if (selectEl && selectEl.value !== zoneId) {
    selectEl.value = zoneId;
  }

  // Redraw Contours and Flood Polygons
  drawContours();
  renderStep(currentStep);
}

// Draw Animated Water Flow Paths & Backwater Intrusion
function drawFlowPaths(stage) {
  layerFlows.clearLayers();
  if (!currentZone || !currentZone.flow_paths) return;

  const step = stage.step;

  currentZone.flow_paths.forEach(fp => {
    const latlngs = fp.coords.map(pt => [pt[1], pt[0]]);
    const isOutflow = fp.type === "outflow";

    // Dynamic styling based on simulation stage
    let weight, opacity, className, color;

    if (isOutflow) {
      // Outflow runs strong at start, but gets choked/blocked at peak backwater
      weight = step <= 2 ? (2.5 + step * 0.8) : (4.5 - (step - 2) * 0.5);
      opacity = step === 0 ? 0.6 : 0.95;
      color = "#0284c7";
      className = "flow-path-outflow";
    } else {
      // Inflow / backwater surges into the basin as stage rises
      weight = step === 0 ? 1.5 : (2.0 + step * 0.8);
      opacity = step === 0 ? 0.35 : (0.5 + step * 0.1);
      color = "#ea580c";
      className = "flow-path-inflow";
    }

    // Outer glow casing
    const casing = L.polyline(latlngs, {
      color: isOutflow ? "#bae6fd" : "#ffedd5",
      weight: weight + 3,
      opacity: 0.6
    });

    // Main animated polyline
    const line = L.polyline(latlngs, {
      color: color,
      weight: weight,
      opacity: opacity,
      className: className
    });

    const flowTypeLabel = isOutflow ? "Limpasan Keluar" : "Intrusi Pasang (Backwater)";
    line.bindTooltip(
      `<strong>${fp.name}</strong> [${flowTypeLabel}]<br/>${fp.desc}`,
      { sticky: true, className: "carto-tooltip" }
    );

    layerFlows.addLayer(casing);
    layerFlows.addLayer(line);

    // Directional badge at middle waypoint
    const midIdx = Math.floor(latlngs.length / 2);
    const midPt = latlngs[midIdx];
    if (midPt) {
      const arrowIcon = isOutflow ? "⇢" : "⇠";
      const badgeClass = isOutflow ? "flow-badge-out" : "flow-badge-in";
      const badge = L.divIcon({
        className: `flow-badge ${badgeClass}`,
        html: `${arrowIcon} ${fp.name.split(' ')[0]}`,
        iconSize: [60, 16],
        iconAnchor: [30, 8]
      });
      const marker = L.marker(midPt, { icon: badge, interactive: false });
      layerFlows.addLayer(marker);
    }
  });
}

// Draw Topographic Contours for Current Zone
function drawContours() {
  layerContours.clearLayers();
  if (!currentZone) return;

  // Distinct hypsometric terrain tints (lowland basin green to upland ridge tan)
  const terrainTints = [
    "#8fad88", // Band 0: lowest basin (0–0.4m)
    "#b5c99a", // Band 1: low plain (0.4–0.85m)
    "#d8e2dc", // Band 2: transition (0.85–1.45m)
    "#f1dca7", // Band 3: terrace (1.45–2.1m)
    "#e0b184"  // Band 4: ridge (2.1–2.9m)
  ];

  // Draw from outer band (4) down to inner band (0) so inner layers render cleanly on top
  for (let i = currentZone.bands.length - 1; i >= 0; i--) {
    const band = currentZone.bands[i];
    const latlngs = band.coords.map(pt => [pt[1], pt[0]]);

    const poly = L.polygon(latlngs, {
      color: "#283618",
      weight: 1.5,
      opacity: 0.95,
      dashArray: i === 0 ? null : "4, 4",
      fillColor: terrainTints[i],
      fillOpacity: 0.45
    });

    poly.bindTooltip(
      `<strong>${currentZone.name}</strong><br/>Kontur Topografi: +${formatIdNum(band.z_top, 2)} m<br/>Elevasi: ${band.label}`,
      { sticky: true, className: "carto-tooltip" }
    );

    layerContours.addLayer(poly);

    // Visible elevation badge at the southern point of each contour
    const southPt = latlngs[Math.floor(latlngs.length / 2)];
    if (southPt) {
      const badgeIcon = L.divIcon({
        className: "contour-badge-marker",
        html: `+${formatIdNum(band.z_top, 2)} m`,
        iconSize: [44, 17],
        iconAnchor: [22, 8]
      });
      const badgeMarker = L.marker(southPt, { icon: badgeIcon, interactive: false });
      layerContours.addLayer(badgeMarker);
    }
  }
}

// Draw River Network (Sungai Kapuas & Sungai Landak)
function drawRivers() {
  layerRivers.clearLayers();

  BASIN_DATA.rivers.forEach(riv => {
    const latlngs = riv.coords.map(pt => [pt[1], pt[0]]);

    const line = L.polyline(latlngs, {
      color: "#2563eb",
      weight: 3.5,
      opacity: 0.8,
      lineCap: "round",
      lineJoin: "round"
    });

    line.bindTooltip(`${riv.name} (Alur Sungai Utama)`, {
      sticky: true,
      className: "carto-tooltip"
    });

    layerRivers.addLayer(line);
  });
}

// Draw 10 IoT Telemetry Stations (Slide 18)
function drawStations() {
  layerStations.clearLayers();

  const colorMap = {
    rain: "#16a34a",
    flow: "#9333ea",
    tide: "#0284c7",
    weather: "#d97706"
  };

  BASIN_DATA.stations.forEach(st => {
    const color = colorMap[st.type] || "#dc2626";

    const iconHtml = `
      <div style="
        width: 14px;
        height: 14px;
        background: ${color};
        border: 2px solid #ffffff;
        box-shadow: 0 1px 4px rgba(0,0,0,0.4);
        border-radius: 50%;
      "></div>
    `;

    const customIcon = L.divIcon({
      className: "station-marker",
      html: iconHtml,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    const marker = L.marker([st.ll[1], st.ll[0]], { icon: customIcon });

    const popupContent = `
      <div style="font-family: var(--font-sans); padding: 4px; min-width: 190px;">
        <div style="font-weight: 700; font-size: 12px; margin-bottom: 3px; color: #1e1d1a;">${st.name}</div>
        <div style="font-size: 11px; color: #444; margin-bottom: 2px;">Tipe: <b>${st.type.toUpperCase()} Sensor</b></div>
        <div style="font-size: 10px; color: #666; line-height: 1.35;">${st.description}</div>
        <div style="font-size: 9px; color: #888; margin-top: 5px; border-top: 1px solid #ddd; padding-top: 3px;">
          Jaringan: LoRa / 4G BPBD Kota Pontianak (FloodSense-Kalbar)
        </div>
      </div>
    `;

    marker.bindPopup(popupContent);
    layerStations.addLayer(marker);
  });
}

// Map local water depth to color ramp (matches Depth Legend)
function getDepthColor(depthM) {
  if (depthM > 2.0) return "#1e3a8a";     // > 2,0 m (Inundasi Parah)
  if (depthM >= 1.0) return "#2563eb";    // 1,0 – 2,0 m (Tinggi)
  if (depthM >= 0.5) return "#3b82f6";    // 0,5 – 1,0 m (Sedang)
  return "#93c5fd";                       // < 0,5 m (Dangkal)
}

// Render Flood Polygons for Current Zone and Step (Slide 15 Gambar 1 s/d 5)
function renderFloodPolygon(stage) {
  layerFlood.clearLayers();
  if (!currentZone) return;

  if (stage.maxBand < 0) return; // Dry / Normal

  // Render water filling the contour rings from highest inundated ring down to lowest
  for (let b = stage.maxBand; b >= 0; b--) {
    const band = currentZone.bands[b];
    const latlngs = band.coords.map(pt => [pt[1], pt[0]]);

    const bandGroundZ = b === 0 ? 0.0 : currentZone.bands[b - 1].z_top;
    const localDepth = Math.max(0.1, stage.waterLevel - bandGroundZ);
    const fillColor = getDepthColor(localDepth);

    const floodPoly = L.polygon(latlngs, {
      color: "#1e3a8a",
      weight: 2,
      opacity: 0,
      fillColor: fillColor,
      fillOpacity: 0
    });

    floodPoly.bindTooltip(
      `<strong>${stage.figure} — ${currentZone.name}</strong><br/>Kontur Tergenang: ${band.label}<br/>Muka Air: +${formatIdNum(stage.waterLevel, 2)} m<br/>Kedalaman: ~${formatIdNum(localDepth, 2)} m`,
      { sticky: true, className: "carto-tooltip" }
    );

    layerFlood.addLayer(floodPoly);

    // Fade the water in like a rising flood (CSS transition on leaflet paths)
    const targetOpacity = 0.98;
    const targetFill = 0.78;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      floodPoly.setStyle({ opacity: targetOpacity, fillOpacity: targetFill });
    }));
  }
}

// ── Rain Animation Overlay ──────────────────────────────────────────────────
// Pure CSS streaks; DOM elements spawned once, visibility + fall speed driven by stage.
const RAIN_DROPS_COUNT = 140;

function initRainOverlay() {
  const overlay = document.getElementById("rainOverlay");
  if (!overlay) return;

  const frag = document.createDocumentFragment();
  for (let i = 0; i < RAIN_DROPS_COUNT; i++) {
    const drop = document.createElement("div");
    drop.className = "rain-drop";
    drop.style.left = `${(Math.random() * 105).toFixed(1)}%`;
    drop.style.animationDelay = `${(Math.random() * 1.5).toFixed(2)}s`;
    drop.style.animationDuration = `${(0.55 + Math.random() * 0.45).toFixed(2)}s`;
    drop.style.opacity = (0.25 + Math.random() * 0.45).toFixed(2);
    drop.style.height = `${Math.floor(45 + Math.random() * 45)}px`;
    frag.appendChild(drop);
  }
  overlay.appendChild(frag);
}

function updateRainAnimation(stage) {
  const overlay = document.getElementById("rainOverlay");
  if (!overlay) return;

  // Intensity tier per stage
  // stage 0 (0.0j): dry
  // stage 1 (1.0j): light drizzle (45 mm/h starts)
  // stage 2-3 (1.5-2.0j): steady tropical rain
  // stage 4-5 (2.5-3.0j): torrential convective storm (Slide 15 peak)
  const tiers = ["none", "light", "medium", "medium", "heavy", "peak"];
  const tier = tiers[stage.step] || "none";

  if (tier === "none") {
    overlay.classList.remove("rain-active");
    overlay.removeAttribute("data-intensity");
    return;
  }

  overlay.classList.add("rain-active");
  overlay.setAttribute("data-intensity", tier);

  // Toggle active drops count by hiding drops beyond the tier threshold
  const drops = overlay.children;
  const countPerTier = { light: 35, medium: 70, heavy: 110, peak: RAIN_DROPS_COUNT };
  const visibleCount = countPerTier[tier] || 0;

  for (let i = 0; i < drops.length; i++) {
    drops[i].style.display = i < visibleCount ? "block" : "none";
  }
}

// ── Animation Tween Helpers ─────────────────────────────────────────────────
let animWaterLevel = 0.45; // current tweened water level for cross-section
let csAnimFrame = null;

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function tweenNumber(el, from, to, duration, decimals) {
  if (!el) return;
  const startTime = performance.now();
  function frame(now) {
    const progress = Math.min(1, (now - startTime) / duration);
    const val = from + (to - from) * easeOutCubic(progress);
    el.textContent = formatIdNum(val, decimals);
    if (progress < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function tweenWaterLevel(targetWl, duration = 550) {
  if (csAnimFrame) cancelAnimationFrame(csAnimFrame);
  const startWl = animWaterLevel;
  const startTime = performance.now();
  function frame(now) {
    const progress = Math.min(1, (now - startTime) / duration);
    animWaterLevel = startWl + (targetWl - startWl) * easeOutCubic(progress);
    renderCrossSectionDirect(animWaterLevel);
    if (progress < 1) {
      csAnimFrame = requestAnimationFrame(frame);
    }
  }
  csAnimFrame = requestAnimationFrame(frame);
}

// ── Cross-Section Drawer (Profil Melintang A–B) ─────────────────────────────
const GROUND_PROFILE = [
  // [x, z_elevasi_m] — Sungai Kapuas → Pematang → Cekungan → Dataran Tinggi
  [45, 0.0], [50, -0.5], [120, 0.2], [180, 1.1], [280, 0.2],
  [380, 0.35], [460, 1.2], [560, 2.6], [585, 2.6]
];
const Z_TO_Y = z => 115 - z * 30; // 0m -> y115, 3.0m -> y25
const LEVEE_Z = 1.1;
const HOUSES_X = [270, 300, 330, 360];

function csInterpolateZ(x) {
  for (let i = 0; i < GROUND_PROFILE.length - 1; i++) {
    const [x0, z0] = GROUND_PROFILE[i];
    const [x1, z1] = GROUND_PROFILE[i + 1];
    if (x >= x0 && x <= x1) {
      return z0 + (z1 - z0) * (x - x0) / (x1 - x0);
    }
  }
  return 0;
}

function renderCrossSection(stage) {
  const drawer = document.getElementById("crossSectionDrawer");
  if (!drawer || !drawer.classList.contains("cs-open")) return;
  tweenWaterLevel(stage.waterLevel, 600);
}

function renderCrossSectionDirect(wl) {
  const drawer = document.getElementById("crossSectionDrawer");
  if (!drawer || !drawer.classList.contains("cs-open")) return;

  const waterY = Z_TO_Y(wl);

  // Build water polygon clipped to the ground profile
  let path = `M 45,${Z_TO_Y(0)} L 45,${waterY.toFixed(1)} `;
  const step = 5;
  let inWater = false;
  for (let x = 45; x <= 585; x += step) {
    const gz = csInterpolateZ(x);
    if (wl > gz) {
      if (!inWater) {
        path += `L ${x},${waterY.toFixed(1)} `;
        inWater = true;
      }
      path += `L ${x},${Z_TO_Y(gz).toFixed(1)} `;
    } else if (inWater) {
      path += `L ${x},${waterY.toFixed(1)} Z `;
      inWater = false;
      path += `M ${x},${waterY.toFixed(1)} `;
    }
  }
  if (inWater) path += `L 585,${waterY.toFixed(1)} Z `;
  path += "Z";

  const waterEl = document.getElementById("csWater");
  if (waterEl) {
    waterEl.setAttribute("d", path.trim());
    waterEl.setAttribute("opacity", wl > 0.05 ? "0.9" : "0");
  }

  // Water level line + label
  const line = document.getElementById("csWLine");
  if (line) {
    line.setAttribute("y1", waterY.toFixed(1));
    line.setAttribute("y2", waterY.toFixed(1));
    line.setAttribute("opacity", wl > 0.02 ? "0.9" : "0");
  }

  const lblRect = document.getElementById("csWLabel");
  const lblText = document.getElementById("csWLabelText");
  if (lblRect && lblText) {
    lblRect.setAttribute("y", (waterY - 14).toFixed(1));
    lblRect.setAttribute("opacity", "0.92");
    lblText.setAttribute("y", (waterY - 4).toFixed(1));
    lblText.setAttribute("opacity", "0.95");
    lblText.textContent = `Muka Air: +${formatIdNum(wl, 2)} m`;
  }

  // Status chips
  const chipLevee = document.getElementById("csChipLevee");
  const chipWater = document.getElementById("csChipWater");
  const chipHouse = document.getElementById("csChipHouse");

  const leveeOvertopped = wl > LEVEE_Z;
  if (chipLevee) {
    chipLevee.textContent = leveeOvertopped ? "Tanggul: Terlampaui (Overtopping)" : "Tanggul: Aman";
    chipLevee.className = "cs-chip " + (leveeOvertopped ? "chip-danger" : "");
  }

  if (chipWater) {
    chipWater.textContent = `Muka Air: +${formatIdNum(wl, 2)} m`;
  }

  const housesWet = HOUSES_X.some(hx => wl > csInterpolateZ(hx) + 0.05);
  if (chipHouse) {
    chipHouse.textContent = housesWet ? "Permukiman: Terendam" : "Permukiman: Kering";
    chipHouse.className = "cs-chip " + (housesWet ? "chip-warn" : "");
  }
}

function toggleCrossSection(force) {
  const drawer = document.getElementById("crossSectionDrawer");
  if (!drawer) return;
  const willOpen = force !== undefined ? force : !drawer.classList.contains("cs-open");
  drawer.classList.toggle("cs-open", willOpen);
  if (willOpen) {
    renderCrossSection(STAGES[currentStep]);
  }
}

// ── Real GeoJSON flood data engine (Lab GeoAI Pontianak) ────────────────────
// Stage → real dataset mapping
const REAL_FILES = {
  1: "data/genangan_1m.geojson",
  2: "data/genangan_2m.geojson",
  3: "data/genangan_3m.geojson",
  4: "data/genangan_3m.geojson",
  5: "data/genangan_4m.geojson"
};

const REAL_AREAS = { 1: 64.68, 2: 74.75, 3: 95.24, 4: 210.17 };
const realDataCache = {};
let showRealGeoJson = true;
let realRenderToken = 0;

async function fetchRealGeoJSON(stageKey) {
  if (realDataCache[stageKey]) return realDataCache[stageKey];
  const res = await fetch(REAL_FILES[stageKey]);
  const json = await res.json();
  realDataCache[stageKey] = json;
  return json;
}

const REAL_DEPTHS = { 1: 1, 2: 2, 3: 3, 4: 3, 5: 4 };

function realStyle(depthTier) {
  const styles = {
    1: { color: "#3b82f6", weight: 0.6, fillColor: "#93c5fd", fillOpacity: 0.35 },
    2: { color: "#2563eb", weight: 0.6, fillColor: "#60a5fa", fillOpacity: 0.40 },
    3: { color: "#1d4ed8", weight: 0.7, fillColor: "#2563eb", fillOpacity: 0.45 },
    4: { color: "#172554", weight: 0.8, fillColor: "#1e3a8a", fillOpacity: 0.50 }
  };
  return styles[depthTier] || styles[1];
}

async function renderRealFlood(stage) {
  const token = ++realRenderToken;
  layerReal.clearLayers();

  if (!showRealGeoJson) return;

  const stageKey = stage.step;
  if (stageKey === 0) {
    layerReal.clearLayers();
    return;
  }

  let geojson;
  try {
    geojson = await fetchRealGeoJSON(stageKey);
  } catch (e) {
    console.error("Gagal memuat GeoJSON:", e);
    return;
  }
  if (token !== realRenderToken) return;

  const tier = REAL_DEPTHS[stageKey];
  const st = realStyle(tier);
  const stageLabel = stage.figure || `Tahap ${stageKey}`;

  L.geoJSON(geojson, {
    style: () => st,
    onEachFeature: (feature, layer) => {
      layer.bindTooltip(
        `<strong>${stageLabel} (Kota Pontianak)</strong><br/>Genangan Riil: ${tier},0 m<br/>Sumber: GeoAI Lab`,
        { sticky: true, className: "carto-tooltip" }
      );
    }
  }).addTo(layerReal);

  const notice = document.getElementById("dataSourceNotice");
  if (notice) {
    const km2 = REAL_AREAS[tier];
    notice.innerHTML = `Genangan riil kota aktif: layer ${tier}m — <strong>${formatIdNum(km2 * 100, 0)} ha (${formatIdNum(km2, 1)} km²)</strong>. Kontur cekungan mikro zona tetap terisi penuh sesuai Slide 15.`;
  }
}

// Update UI and Telemetry Cards
function renderStep(stepIndex) {
  currentStep = Math.max(0, Math.min(stepIndex, STAGES.length - 1));
  const stage = STAGES[currentStep];

  // Update Map Layer
  renderFloodPolygon(stage);
  renderRealFlood(stage);
  drawFlowPaths(stage);
  updateRainAnimation(stage);
  renderCrossSection(stage);

  // Update Slider & Ticks
  const slider = document.getElementById("timeSlider");
  if (slider) slider.value = currentStep;

  document.querySelectorAll(".tick").forEach((el, idx) => {
    if (idx === currentStep) {
      el.classList.add("active-tick");
    } else {
      el.classList.remove("active-tick");
    }
  });

  // Calculate Aggregates based on Current Zone
  let cumAreaM2 = 0;
  if (currentZone && stage.maxBand >= 0) {
    cumAreaM2 = currentZone.bands[stage.maxBand].area_m2;
  }
  const floodedHa = cumAreaM2 / 10000;
  const floodedKm2 = cumAreaM2 / 1000000;

  // Hydrological Volume: V = C * I * A_catchment * t (C per active zone)
  const C = currentZone ? currentZone.runoff_c : 0.85;
  const I_m = (stage.rainfall_mm / 1000);
  const volM3 = Math.round(cumAreaM2 * I_m * C * 1.5);

  // Update DOM Elements
  document.getElementById("figTitle").innerText = stage.figure;
  document.getElementById("stageDesc").innerText = stage.description;
  document.getElementById("rainVal").innerText = formatIntId(stage.rainfall_mm);
  tweenNumber(document.getElementById("durVal"), parseFloat((document.getElementById("durVal").innerText || "0").replace(",", ".")), stage.hours, 400, 1);
  tweenNumber(document.getElementById("waterLevelVal"), parseFloat((document.getElementById("waterLevelVal").innerText || "0").replace(",", ".")), stage.waterLevel, 550, 2);
  tweenNumber(document.getElementById("volVal"), parseFloat((document.getElementById("volVal").innerText || "0").replace(/\./g, "").replace(",", ".")), volM3, 500, 0);

  if (cumAreaM2 > 0) {
    document.getElementById("areaVal").innerText = `${formatIdNum(floodedHa, 1)} ha (${formatIdNum(floodedKm2, 2)} km²)`;
  } else {
    document.getElementById("areaVal").innerText = "0 ha (0,00 km²)";
  }

  document.getElementById("leadTimeVal").innerText = stage.leadTime;

  const curDurLabel = document.getElementById("currentDurLabel");
  if (curDurLabel) {
    curDurLabel.innerText = `${formatIdNum(stage.hours, 1)} Jam — ${stage.figure}`;
  }

  // Update EWS Tier Banner
  document.querySelectorAll(".ews-tier").forEach(el => {
    el.className = "ews-tier";
  });
  const activeTierEl = document.getElementById(`tier-${stage.risk.toLowerCase()}`);
  if (activeTierEl) {
    activeTierEl.classList.add("active-tier", stage.riskClass);
  }

  // Update Water Flow Narration (stage + zone-specific)
  const flowEl = document.getElementById("flowNarration");
  if (flowEl && currentZone) {
    const narr = FLOW_NARRATIONS[stage.step];
    const flowColor = ["#15803d", "#0284c7", "#0284c7", "#ea580c", "#c2410c", "#b91c1c"][stage.step];
    flowEl.style.borderLeftColor = flowColor;
    flowEl.innerHTML = `
      <span class="zone-notes-title">${narr.title}</span>
      ${narr.text.replace("{zone}", currentZone.name)}
    `;
  }

  // Update Decision Support Card (SPK — Sistem Pendukung Keputusan)
  renderDecisionCard(stage, currentZone);
}

// Decision matrix: BPBD operational protocol per EWS tier.
// Sources: Slide 8 (pintu air/pompa/normalisasi), Slide 19–20 (EWS output channels),
// Slide 21 (decision-support requirement); escalation ladder follows standard
// BPBD/BNPB flood-response tiers. Trigger = active simulation stage telemetry.
const DECISION_MATRIX = [
  {
    risk: "AMAN", chip: "chip-aman",
    actions: [
      "Pemantauan rutin telemetri sensor (interval 15 menit) oleh operator BPBD.",
      "Pintu air muara parit dibuka penuh untuk mempercepat pembuangan air.",
      "Verifikasi fungsi pompa & genset cadangan stasiun drainase."
    ],
    footer: "Pemicu: muka air &lt; ambang waspada. Basis: telemetri FloodSense + simulasi tahap 0."
  },
  {
    risk: "WASPADA", chip: "chip-waspada",
    actions: [
      "Tutup pintu air muara parit untuk mencegah intrusi pasang (backwater).",
      "Siagakan stasiun pompa drainase; tes nyalakan pompa primer.",
      "Broadcast peringatan dini awal via WhatsApp/SMS ke warga bantaran sungai (Slide 19)."
    ],
    footer: "Pemicu: hujan berlangsung + pasang naik. Basis: simulasi tahap 1–2 (Gambar 1–2)."
  },
  {
    risk: "SIAGA", chip: "chip-siaga",
    actions: [
      "Operasikan pompa banjir untuk membuang air saat pasang puncak (Slide 8).",
      "Aktifkan posko siaga BPBD kelurahan & patroli titik rawan cekungan.",
      "Kirim peringatan dini bertingkat (SMS/WA/sirine wilayah) + instrumen mitigasi ke masyarakat."
    ],
    footer: "Pemicu: muka air &gt; 1,4 m (kontur ketiga tergenang). Basis: simulasi tahap 3–4 (Gambar 3–4)."
  },
  {
    risk: "BANJIR", chip: "chip-banjir",
    actions: [
      "Aktifkan sirine & lampu peringatan fisik di titik rawan (Slide 19).",
      "Status Tanggap Darurat BPBD: mobilisasi perahu evakuasi ke cekungan terisolir.",
      "Sebar peta sebaran genangan real-time (layer Poligon Genangan) untuk navigasi warga & logistik."
    ],
    footer: "Pemicu: muka air &gt; 2,7 m, kapasitas tampung jenuh. Basis: simulasi tahap 5 (Gambar 5)."
  }
];

function renderDecisionCard(stage, zone) {
  const chipEl = document.getElementById("decisionChip");
  const actionsEl = document.getElementById("decisionActions");
  const footerEl = document.getElementById("decisionFooter");
  if (!chipEl || !actionsEl) return;

  const entry = DECISION_MATRIX[stage.step === 0 ? 0 : stage.step <= 2 ? 1 : stage.step <= 4 ? 2 : 3];

  chipEl.textContent = entry.risk;
  chipEl.className = `decision-status-chip ${entry.chip}`;

  actionsEl.innerHTML = entry.actions.map(a => `<li>${a}</li>`).join("");

  if (footerEl) {
    const zoneName = zone ? zone.name : "zona aktif";
    footerEl.innerHTML = `${entry.footer}<br/>Zona aktif: ${zoneName} — keputusan mengikuti status simulasi terkini.`;
  }
}

// Narrasi dinamika aliran air per tahap simulasi
const FLOW_NARRATIONS = [
  {
    step: 0,
    title: "Kondisi Normal — Aliran Sehat",
    text: "Limpasan hujan sisa mengalir lancar dari cekungan {zone} melalui saluran drainase menuju sungai (⇢). Belum ada tekanan pasang; muka air parit di bawah elevasi jalan."
  },
  {
    step: 1,
    title: "Hujan Mulai — Limpasan Meningkat",
    text: "Curah hujan 45 mm/menambah beban parit di {zone}. Debit keluar (⇢) meningkat, namun muara mulai tertahan karena pasang laut naik (⇠)."
  },
  {
    step: 2,
    title: "Kolisi Dimulai — Outflow vs Pasang",
    text: "Air hujan dari {zone} (⇢) bertemu pasang laut di muara parit (⇠). Selisih arus mengecil, kecepatan aliran keluar menurun, genangan mulai bertahan di titik rendah."
  },
  {
    step: 3,
    title: "Backwater Aktif — Muara Terhambat",
    text: "Pasang puncak mendorong air laut balik ke dalam parit {zone} (⇠). Aliran keluar (⇢) nyaris berhenti; kolisi arus terjadi di sepanjang saluran primer."
  },
  {
    step: 4,
    title: "Genangan Masif — Drainase Lumpuh",
    text: "Kapasitas tampung {zone} meluap. Backwater (⇠) dominan, outflow (⇢) terhenti total; seluruh cekungan permukiman tergenang bersamaan."
  },
  {
    step: 5,
    title: "Puncak Banjir — Sistem Jenuh",
    text: "Seluruh jaringan drainase {zone} jenuh total. Tidak ada gradien aliran keluar; genangan hanya akan surut setelah pasang turun dan pompa/pintu air aktif."
  }
];

// Setup Zone Selector
function setupZoneSelector() {
  const sel = document.getElementById("zoneSelect");
  if (!sel) return;
  sel.addEventListener("change", (e) => {
    selectZone(e.target.value, true);
  });
}

// Control Event Bindings
function setupControls() {
  const slider = document.getElementById("timeSlider");
  slider.addEventListener("input", (e) => {
    pause();
    renderStep(parseInt(e.target.value));
  });

  document.querySelectorAll(".tick").forEach((el) => {
    el.addEventListener("click", () => {
      pause();
      const step = parseInt(el.getAttribute("data-step"));
      renderStep(step);
    });
  });

  document.getElementById("btnPlay").addEventListener("click", togglePlay);
  document.getElementById("btnStep").addEventListener("click", () => {
    pause();
    const next = (currentStep + 1) % STAGES.length;
    renderStep(next);
  });
  document.getElementById("btnReset").addEventListener("click", () => {
    pause();
    renderStep(0);
  });

// Cross-Section toggle and close buttons
const btnToggleProfile = document.getElementById("btnToggleProfile");
if (btnToggleProfile) {
  btnToggleProfile.addEventListener("click", () => toggleCrossSection());
}
const btnCloseCrossSection = document.getElementById("btnCloseCrossSection");
if (btnCloseCrossSection) {
  btnCloseCrossSection.addEventListener("click", () => toggleCrossSection(false));
}

// Sidebar Tab Switching
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const tabTarget = btn.getAttribute("data-tab");
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active-tab"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active-panel"));
    btn.classList.add("active-tab");
    const targetPanel = document.getElementById(`tab-${tabTarget}`);
    if (targetPanel) targetPanel.classList.add("active-panel");
  });
});

// Data source mode toggle (Real GeoJSON on/off)
  const btnReal = document.getElementById("btnModeReal");
  const btnMicro = document.getElementById("btnModeMicro");

  if (btnReal && btnMicro) {
    btnReal.addEventListener("click", () => {
      showRealGeoJson = true;
      btnReal.classList.add("active-mode");
      btnMicro.classList.remove("active-mode");
      renderStep(currentStep);
    });

    btnMicro.addEventListener("click", () => {
      showRealGeoJson = false;
      btnMicro.classList.add("active-mode");
      btnReal.classList.remove("active-mode");
      const notice = document.getElementById("dataSourceNotice");
      if (notice) notice.innerHTML = "Hanya kontur cekungan mikro zona aktif (Slide 15). Layer genangan riil kota disembunyikan.";
      layerReal.clearLayers();
      renderStep(currentStep);
    });
  }

  // Layer switches
  setupLayerToggle("toggleContours", layerContours);
  setupLayerToggle("toggleFlood", layerFlood);
  setupLayerToggle("toggleReal", layerReal);
  setupLayerToggle("toggleFlows", layerFlows);
  setupLayerToggle("toggleRivers", layerRivers);
  setupLayerToggle("toggleStations", layerStations);

  // Rain effect toggle switch
  const toggleRain = document.getElementById("toggleRain");
  if (toggleRain) {
    toggleRain.addEventListener("change", (e) => {
      const overlay = document.getElementById("rainOverlay");
      if (overlay) {
        overlay.style.display = e.target.checked ? "block" : "none";
      }
    });
  }
}

function setupLayerToggle(elementId, layerGroup) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.addEventListener("change", (e) => {
    if (e.target.checked) {
      map.addLayer(layerGroup);
    } else {
      map.removeLayer(layerGroup);
    }
  });
}

function togglePlay() {
  if (isPlaying) {
    pause();
  } else {
    play();
  }
}

function play() {
  isPlaying = true;
  const btn = document.getElementById("btnPlay");
  btn.innerHTML = `<span style="font-size:12px;">⏸</span> Jeda`;
  btn.classList.add("active");

  playInterval = setInterval(() => {
    if (currentStep >= STAGES.length - 1) {
      currentStep = 0;
    } else {
      currentStep++;
    }
    renderStep(currentStep);
  }, playSpeed);
}

function pause() {
  isPlaying = false;
  clearInterval(playInterval);
  const btn = document.getElementById("btnPlay");
  btn.innerHTML = `<span style="font-size:12px;">▶</span> Putar`;
  btn.classList.remove("active");
}