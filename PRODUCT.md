# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

static HTML/CSS/JS (vanilla Leaflet WebGIS, zero external npm build dependencies, standalone single-page application served via native python http.server).

## Users

University lecture evaluator (Dr. Ir. Yus Sholva, S.T., M.T.) and engineering students/researchers studying hydrological & spatial GeoAI flood modeling for Pontianak City.

## Product Purpose

Deliver an interactive spatial WebGIS flood simulation that models rain duration vs. ground basin retention accumulation based on Slide 15 and 16 of the lecture presentation. The user can scrub rain duration (1 hr -> Gambar 1, 1.5 hr -> Gambar 2, up to 5 stages) to visually observe flood polygons filling the lowest topographic depression and expanding outward according to elevation contours.

## Positioning

Unlike typical generic Leaflet demos with default blue shapes, this project grounds itself in the actual Pontianak delta geography (Kapuas & Landak river network, flat peat/alluvial 0.1-1.5 mdpl terrain, backwater effect) and uses an authentic cartographic / print-atlas aesthetic directly matching the lecture's contour map study.

## Operating Context

Evaluated on desktop browser (and mobile responsive view), running locally or deployed statically to GitHub Pages. Evaluator expects immediate visual responsiveness, realistic stage progression (Gambar 1 to 5), volume/catchment calculations, and clean spatial telemetry.

## Capabilities and Constraints

- Capabilities:
  - Interactive Leaflet map centered on the Pontianak study basin area.
  - Time-series scrubber/slider (0h normal to 3h peak, 5 discrete stages matching Gambar 1-5).
  - Contour elevation layers (0m, 5m, 10m, 20m, 50m) derived from the lecture's topographic diagram.
  - Multi-depth polygon inundation with hypsometric depth tinting.
  - Real-time hydrological metric readout: cumulative rainfall (mm), estimated runoff volume (m³), flooded surface area (ha), water table elevation, and EWS status tier (Aman, Waspada, Siaga, Banjir).
  - Play / Pause / Step animation controls.
  - Layer toggles (contours, flood polygon, river network, telemetry stations from FloodSense-Kalbar).
- Constraints:
  - No API key dependencies (OpenStreetMap base tiles, fallback SVG cartography canvas if offline).
  - Lightweight, instant load.

## Brand Commitments

- Visual tone: Institutional cartographic atlas register — warm paper-toned ground (`#f7f4ec` / `#eee9dc`), refined serifs for display (Lora/Playfair/Georgia), crisp hairline borders (`#3a352a`), deep indigo/slate water inks, muted topo tints, zero AI-slop neon/glassmorphism/emojis.
- Terminology: Accurate Indonesian hydrological terms as presented in the lecture (*Garis Kontur, Cekungan, Muka Air Tanah, Pasang Surut, Backwater*).

## Evidence on Hand

- Slide deck: `Early Warning System Banjir.pdf` (Dr. Ir. Yus Sholva, S.T., M.T.).
- Slide 15: Spatial polygon visualization stages (Gambar 1 to Gambar 5) over the Dataran Rendah depression (contours 5m, 10m, 50m).
- Slide 16: Task specification relating rainfall duration to surface water storage.
- Slide 17-20: Sensor network telemetry & EWS risk classification (Aman, Waspada, Siaga, Banjir).

## Product Principles

1. Educational fidelity: Match the exact mechanics and stages specified in Slides 15 & 16.
2. Cartographic craft: Look like a meticulously drafted survey atlas rather than an AI dashboard template.
3. Zero-friction execution: Single index.html or minimal static files that run immediately with no build step.
