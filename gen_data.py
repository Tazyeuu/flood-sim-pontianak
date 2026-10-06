"""Generates js/data.js — multi-zone study basins for Kota Pontianak.
4 major flood-prone zones + 10 IoT stations (Slide 18, FloodSense-Kalbar site plan).
Pure stdlib. Run: python3 gen_data.py
"""
import json, math, random

random.seed(42)

M_PER_DEG_LAT = 111_320.0

def make_to_ll(lat0, lon0):
    m_per_deg_lon = M_PER_DEG_LAT * math.cos(math.radians(lat0))
    def to_ll(x_m, y_m):
        return [
            round(lon0 + x_m / m_per_deg_lon, 6),
            round(lat0 + y_m / M_PER_DEG_LAT, 6)
        ]
    return to_ll

def make_ring(to_ll, r_base, r_noise, n=72, phase=0.0):
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        r = r_base * (1.0
            + r_noise * math.sin(3 * a + phase)
            + r_noise * 0.5  * math.sin(5 * a + 2 * phase)
            + r_noise * 0.25 * math.sin(7 * a + 0.5 * phase))
        pts.append(to_ll(r * math.cos(a), r * math.sin(a)))
    pts.append(pts[0])
    return pts

def shoelace_area(pts, lat0, lon0):
    m_per_deg_lon = M_PER_DEG_LAT * math.cos(math.radians(lat0))
    s = 0.0
    for i in range(len(pts) - 1):
        x1 = (pts[i][0] - lon0) * m_per_deg_lon
        y1 = (pts[i][1] - lat0) * M_PER_DEG_LAT
        x2 = (pts[i+1][0] - lon0) * m_per_deg_lon
        y2 = (pts[i+1][1] - lat0) * M_PER_DEG_LAT
        s += x1 * y2 - x2 * y1
    return abs(s) / 2.0

ZONES_DEF = [
    {
        "id": "pontianak_selatan",
        "name": "Pontianak Selatan",
        "subtitle": "Cekungan Parit Tokaya & Untan",
        "district": "Kecamatan Pontianak Selatan",
        "lat0": -0.058, "lon0": 109.340,
        "soil": "Organosol (Gambut) + Aluvial",
        "water_table": "0,15 m (Kondisi Jenuh)",
        "drainage": "Terhambat Pasang (Backwater Parit Tokaya)",
        "runoff_c": 0.85,
        "radii":  [200, 420, 700, 1050, 1450],
        "z_tops": [0.40, 0.85, 1.45, 2.10, 2.90],
        "phases": [0.5, 1.9, 3.1, 4.4, 0.9],
        "notes": "Kawasan cekungan delta dengan permeabilitas rendah. Genangan dipicu efek backwater luapan Sungai Kapuas saat pasang puncak.",
    },
    {
        "id": "pontianak_barat",
        "name": "Pontianak Barat",
        "subtitle": "Koridor Sungai Jawi & Parit Mayor",
        "district": "Kecamatan Pontianak Barat",
        "lat0": -0.016, "lon0": 109.310,
        "soil": "Aluvial Lumpur Pantai",
        "water_table": "0,10 m (Sangat Dangkal)",
        "drainage": "Rentan Pasang Surut Rob Primer",
        "runoff_c": 0.90,
        "radii":  [180, 380, 640, 950, 1350],
        "z_tops": [0.35, 0.75, 1.30, 1.95, 2.70],
        "phases": [1.1, 2.4, 0.3, 1.7, 3.2],
        "notes": "Pemukiman padat sepanjang kanal Sungai Jawi. Koefisien limpasan tinggi (0,90) karena dominasi tutupan aspal & bangunan rapat.",
    },
    {
        "id": "pontianak_timur",
        "name": "Pontianak Timur",
        "subtitle": "Delta Pertemuan Kapuas-Landak",
        "district": "Kecamatan Pontianak Timur",
        "lat0": -0.025, "lon0": 109.375,
        "soil": "Aluvial Sungai Landak & Kapuas",
        "water_table": "0,25 m",
        "drainage": "Pertemuan Arus Muara (Sedimentasi Aktif)",
        "runoff_c": 0.80,
        "radii":  [220, 460, 750, 1100, 1500],
        "z_tops": [0.45, 0.90, 1.50, 2.20, 3.00],
        "phases": [2.0, 0.6, 3.8, 1.2, 4.0],
        "notes": "Pertemuan Sungai Landak dan Sungai Kapuas. Sangat dipengaruhi kiriman debit hulu sungai bertepatan dengan pasang laut.",
    },
    {
        "id": "pontianak_tenggara",
        "name": "Pontianak Tenggara",
        "subtitle": "Kubah Gambut & Parit Sei Raya",
        "district": "Kecamatan Pontianak Tenggara",
        "lat0": -0.078, "lon0": 109.365,
        "soil": "Gambut Tebal Organosol (> 2 m)",
        "water_table": "0,20 m",
        "drainage": "Kanal Buatan / Parit Sekunder",
        "runoff_c": 0.78,
        "radii":  [210, 440, 720, 1080, 1480],
        "z_tops": [0.40, 0.85, 1.40, 2.05, 2.85],
        "phases": [0.8, 2.2, 4.1, 0.4, 2.9],
        "notes": "Zona transisi kubah gambut menuju kawasan suburban. Genangan tertahan lama karena sifat gambut yang menyerap lalu lambat mengalirkan air.",
    },
]

# ── Per-zone water flow paths (drainage routes & tidal inflow) ────────────────
# Each path: type "outflow" (rain runoff drains toward river/parit) or
# "inflow" (tidal surge / river backwater pushes INTO the basin).
# Coords run from the zone basin edge to the receiving water body.
FLOW_PATHS = {
    "pontianak_selatan": [
        {
            "id": "fp_sel_out1",
            "type": "outflow",
            "name": "Parit Tokaya (Saluran Keluar)",
            "desc": "Limpasan hujan dialirkan melalui Parit Tokaya menuju muara Sungai Kapuas. Kapasitas tampung terbatas saat pasang puncak.",
            "coords": [
                [109.3395, -0.0625], [109.3375, -0.0580], [109.3355, -0.0530],
                [109.3340, -0.0470], [109.3330, -0.0410], [109.3345, -0.0360],
            ],
        },
        {
            "id": "fp_sel_out2",
            "type": "outflow",
            "name": "Parit Untan (Saluran Keluar)",
            "desc": "Saluran drainase sisi barat kampus Untan; aliran lambat karena sedimen gambut mengendap di dasar parit.",
            "coords": [
                [109.3330, -0.0600], [109.3290, -0.0555], [109.3260, -0.0490],
                [109.3245, -0.0420], [109.3265, -0.0365],
            ],
        },
        {
            "id": "fp_sel_in1",
            "type": "inflow",
            "name": "Backwater Kapuas (Masuk Cekungan)",
            "desc": "Saat pasang laut puncak (+1,2 m), air laut mendorong balik melalui muara parit dan menggenangi cekungan dari sisi utara.",
            "coords": [
                [109.3345, -0.0360], [109.3355, -0.0420], [109.3370, -0.0480],
                [109.3385, -0.0540], [109.3395, -0.0600],
            ],
        },
    ],
    "pontianak_barat": [
        {
            "id": "fp_bar_out1",
            "type": "outflow",
            "name": "Kanal Sungai Jawi (Saluran Keluar)",
            "desc": "Saluran primer barat; hampir seluruh limpasan pemukiman padat dialirkan ke sini sebelum bertemu muara Kapuas Kecil.",
            "coords": [
                [109.3085, -0.0185], [109.3060, -0.0175], [109.3035, -0.0170],
                [109.3010, -0.0180], [109.2965, -0.0205], [109.2920, -0.0230],
            ],
        },
        {
            "id": "fp_bar_in1",
            "type": "inflow",
            "name": "Rob Muara (Masuk Kanal)",
            "desc": "Rob pasang surut dari Muara Kapuas Kecil menembus ke dalam kanal Sungai Jawi hingga titik rawan Parit Mayor.",
            "coords": [
                [109.2920, -0.0230], [109.2975, -0.0205], [109.3030, -0.0185],
                [109.3070, -0.0180], [109.3105, -0.0170],
            ],
        },
    ],
    "pontianak_timur": [
        {
            "id": "fp_tim_out1",
            "type": "outflow",
            "name": "Parit Tanjung Hulu (Saluran Keluar)",
            "desc": "Drainase timur bermuara ke Sungai Landak; terhambat saat debit Landak tinggi bersamaan dengan pasang.",
            "coords": [
                [109.3765, -0.0275], [109.3740, -0.0250], [109.3715, -0.0230],
                [109.3690, -0.0245], [109.3675, -0.0270],
            ],
        },
        {
            "id": "fp_tim_in1",
            "type": "inflow",
            "name": "Kiriman Debit Landak (Masuk Delta)",
            "desc": "Luapan Sungai Landak dan backwater Kapuas memenuhi delta pertemuan dari arah barat laut.",
            "coords": [
                [109.3670, -0.0270], [109.3700, -0.0255], [109.3730, -0.0245],
                [109.3755, -0.0255], [109.3770, -0.0280],
            ],
        },
    ],
    "pontianak_tenggara": [
        {
            "id": "fp_ten_out1",
            "type": "outflow",
            "name": "Parit Sei Raya (Saluran Keluar)",
            "desc": "Kanal sekunder mengalirkan air gambut ke parit primer utara; pengeringan lambat karena daya serap gambut tinggi.",
            "coords": [
                [109.3650, -0.0795], [109.3640, -0.0760], [109.3630, -0.0725],
                [109.3625, -0.0690], [109.3635, -0.0660],
            ],
        },
        {
            "id": "fp_ten_out2",
            "type": "outflow",
            "name": "Kanal Parit H. Husin (Saluran Keluar)",
            "desc": "Jalur drainase timur menuju parit utama; sering tersumbat sedimen dan sampah pemukiman.",
            "coords": [
                [109.3685, -0.0800], [109.3695, -0.0765], [109.3690, -0.0730],
                [109.3675, -0.0700], [109.3660, -0.0670],
            ],
        },
        {
            "id": "fp_ten_in1",
            "type": "inflow",
            "name": "Genangan Tertahan (Blackwater)",
            "desc": "Air gambut yang telah masuk sulit keluar; genangan blackwater bertahan hingga berminggu-minggu setelah hujan berhenti.",
            "coords": [
                [109.3660, -0.0670], [109.3665, -0.0705], [109.3670, -0.0740],
                [109.3665, -0.0775], [109.3655, -0.0800],
            ],
        },
    ],
}

zones = []
for z in ZONES_DEF:
    to_ll = make_to_ll(z["lat0"], z["lon0"])
    bands = []
    for i, r in enumerate(z["radii"]):
        coords = make_ring(to_ll, r, r_noise=0.16, phase=z["phases"][i])
        area   = shoelace_area(coords, z["lat0"], z["lon0"])
        prev_z = z["z_tops"][i - 1] if i > 0 else 0.0
        bands.append({
            "id":      f"b{i+1}",
            "z_top":   z["z_tops"][i],
            "label":   f"{prev_z:.2f}–{z['z_tops'][i]:.2f} m",
            "area_m2": round(area),
            "coords":  coords,
        })
    zones.append({
        "id":          z["id"],
        "name":        z["name"],
        "subtitle":    z["subtitle"],
        "district":    z["district"],
        "center":      [z["lon0"], z["lat0"]],
        "soil":        z["soil"],
        "water_table": z["water_table"],
        "drainage":    z["drainage"],
        "runoff_c":    z["runoff_c"],
        "notes":       z["notes"],
        "bands":       bands,
        "flow_paths":  FLOW_PATHS[z["id"]],
    })

# ── Global River Network ──────────────────────────────────────────────────────
rivers = [
    {
        "name": "Sungai Kapuas", "id": "kapuas",
        "coords": [
            [109.288, -0.024], [109.303, -0.023], [109.318, -0.020],
            [109.332, -0.021], [109.348, -0.023], [109.360, -0.028],
            [109.375, -0.038], [109.395, -0.046], [109.412, -0.052],
        ]
    },
    {
        "name": "Sungai Landak", "id": "landak",
        "coords": [
            [109.352, 0.015], [109.348, 0.008], [109.353, 0.001], [109.349, -0.006],
            [109.354, -0.013], [109.358, -0.020], [109.356, -0.025], [109.360, -0.028],
        ]
    },
]

# ── 10 IoT Stations (Slide 18 — FloodSense-Kalbar Site Plan) ─────────────────
stations = [
    {"id":"st_plentong",       "name":"Stasiun Hujan (Plentong)",          "type":"rain",    "description":"Tipping bucket rain gauge (0,2 mm/tip), akurasi ±2%, sampling 5 menit",                   "ll":[109.319,-0.012]},
    {"id":"st_pln",            "name":"Stasiun Cuaca (PLN Pontianak)",      "type":"weather", "description":"AWS multi-parameter — Angin, Tekanan 300–1100 hPa, Suhu, Kelembapan",                    "ll":[109.336,-0.015]},
    {"id":"st_muara_kapuas",   "name":"Sensor Pasang Surut (Muara Kapuas)", "type":"tide",    "description":"Pressure/Radar tide gauge (resolusi 1 cm), pantau rob laut harian",                       "ll":[109.289,-0.025]},
    {"id":"st_sungai_jawi",    "name":"Stasiun Hujan (Sungai Jawi)",        "type":"rain",    "description":"Rain gauge koridor barat, terhubung gateway LoRa 8 km",                                    "ll":[109.308,-0.017]},
    {"id":"st_debit_landak",   "name":"Sensor Debit (Sungai Landak)",       "type":"flow",    "description":"Ultrasonic flow meter 0,1–5 m/s, pantau debit Landak",                                    "ll":[109.356,-0.005]},
    {"id":"st_hujan_sungairaya","name":"Stasiun Hujan (Sungai Raya)",       "type":"rain",    "description":"Automatic rain gauge DAS selatan, transmisi 4G LTE",                                       "ll":[109.378,-0.072]},
    {"id":"st_debit_sungairaya","name":"Sensor Debit (Sungai Raya)",        "type":"flow",    "description":"Sensor muka air ultrasonik IP67 di parit primer Sei Raya",                                 "ll":[109.362,-0.081]},
    {"id":"st_tide_kapuas_hilir","name":"Stasiun Pasang Surut (Kapuas Hilir)","type":"tide",  "description":"Radar level gauge pasang surut, range 0–10 m, di hilir Kapuas",                           "ll":[109.324,-0.035]},
    {"id":"st_debit_kapuas",   "name":"Sensor Debit (Sungai Kapuas)",       "type":"flow",    "description":"Acoustic Doppler Velocity profiler di alur utama Kapuas",                                   "ll":[109.349,-0.024]},
    {"id":"st_tanjung_hulu",   "name":"Stasiun Hujan (Tanjung Hulu)",       "type":"rain",    "description":"Rain gauge pemantau intensitas hujan konvektif DAS timur Pontianak",                        "ll":[109.373,-0.024]},
]

out_data = {
    "meta": {
        "note":         "Multi-zone synthetic flood basins & FloodSense-Kalbar IoT stations for Kota Pontianak. Ref: Slide 15–20, Bahan Kuliah GeoAI Dr. Ir. Yus Sholva.",
        "default_zone": "pontianak_selatan",
    },
    "zones":    zones,
    "rivers":   rivers,
    "stations": stations,
}

js_out = (
    "// Auto-generated by gen_data.py — multi-zone study basins & IoT stations.\n"
    "// SYNTHETIC flood modeling data. Ref: Slide 15–20, Bahan Kuliah GeoAI.\n"
    "const BASIN_DATA = "
    + json.dumps(out_data, ensure_ascii=False, separators=(',', ':'))
    + ";\n"
)

with open("js/data.js", "w") as f:
    f.write(js_out)

print(f"Generated {len(zones)} zones:")
for z in zones:
    areas = [b["area_m2"] for b in z["bands"]]
    print(f"  [{z['id']}] {z['name']} — bands: {[round(a/10000,1) for a in areas]} ha")
print(f"\nGenerated {len(stations)} IoT stations.")

# Self-checks
for z in zones:
    zs = [b["z_top"] for b in z["bands"]]
    assert zs == sorted(zs), f"z_top not ascending in {z['id']}: {zs}"
    assert all(b["area_m2"] > 0 for b in z["bands"]), f"non-positive area in {z['id']}"
print("\nAll checks passed.")
