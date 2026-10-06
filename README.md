# Simulasi Spasial Banjir Kota Pontianak (GeoAI & Early Warning System)

Aplikasi WebGIS interaktif berbasis standar web vanilla (zero-dependency) untuk memodelkan dinamika banjir komposit (limpasan hujan tropis + intrusi *backwater* pasang surut Sungai Kapuas & Landak) di dataran aluvial & kubah gambut Kota Pontianak, Kalimantan Barat.

> **Rujukan Akademis:** Bahan Kuliah *"GeoAI: Early Warning System dan Simulasi Banjir — Studi Kasus Banjir Kota Pontianak"* oleh **Dr. Ir. Yus Sholva, S.T., M.T.** (Slide 10–12, 15–16, 18–21).

---

## 1. Fitur Utama

- **Pemodelan Spasial Tahap Inundasi (Slide 15):** Simulasi berurutan dari pengisian cekungan depresi terendah hingga peluapan masif ke kontur lebih tinggi (*Gambar 1 s/d Gambar 5*).
- **Potongan Topografi Melintang A–B (Slide 10–12):** Diagram cross-section SVG interaktif yang memperlihatkan muka air Sungai Kapuas meluap melompati tanggul pematang (+1,1 m MSL) dan merendam cekungan permukiman secara *real-time* saat slider digerakkan.
- **Dinamika Aliran & Backwater:** Visualisasi vektor aliran animasi yang memperlihatkan kompetisi hidrolika antara limpasan parit keluar (⇢ *outflow*) dan desakan pasang Kapuas masuk (⇠ *backwater intrusion*).
- **Integrasi Data Spasial Riil (GeoAI Lab):** Mengintegrasikan layer GeoJSON genangan 1m, 2m, 3m, dan 4m Kota Pontianak dengan metrik luas terdampak terhitung (6.468 ha s/d 21.017 ha).
- **Protokol Tindakan SPK (Slide 21):** *Decision Support System* terintegrasi yang menerjemahkan status telemetri menjadi SOP mitigasi darurat BPBD Kota Pontianak (Aman, Waspada, Siaga, Banjir).
- **4 Zona Kajian Vulnerabel:** Pontianak Selatan (Parit Tokaya/Untan), Pontianak Barat (Kanal Sungai Jawi), Pontianak Timur (Delta Landak-Kapuas), dan Pontianak Tenggara (Kubah Gambut Sei Raya).
- **Efek Presipitasi Dinamis:** Partikel animasi hujan responsif terhadap tahap intensitas presipitasi ($45\text{ mm/jam}$).

---

## 2. Metodologi & Formula Hidrologi

Akumulasi volume limpasan air hujan dihitung menggunakan Metode Rasional:

$$V = C \times I \times A \times t$$

Dimana:
- $V$ = Volume limpasan permukaan kumulatif ($\text{m}^3$)
- $C$ = Koefisien limpasan zona ($0{,}78$ s/d $0{,}90$ tergantung tipe tanah organosol gambut vs aluvial kota)
- $I$ = Intensitas curah hujan konvektif ($45\text{ mm/jam}$)
- $A$ = Luas tangkapan cekungan aktif ($\text{m}^2$)
- $t$ = Durasi hujan kumulatif ($0{,}0$ s/d $3{,}0\text{ jam}$)

### Hubungan Tahap Durasi vs Gambar Slide 15:
1. **0,0 Jam (Kondisi Normal):** Muka air $+0{,}00\text{ m}$, tidak ada genangan.
2. **1,0 Jam (Gambar 1):** Muka air $+0{,}45\text{ m}$, air mengisi kantong depresi terendah ($0{,}0\text{--}0{,}4\text{ m}$).
3. **1,5 Jam (Gambar 2):** Muka air $+0{,}88\text{ m}$, luapan meluas ke kontur $+0{,}85\text{ m}$.
4. **2,0 Jam (Gambar 3):** Muka air $+1{,}45\text{ m}$, air melompati pematang aluvial; fenomena backwater aktif.
5. **2,5 Jam (Gambar 4):** Muka air $+2{,}12\text{ m}$, genangan mencakup sebagian besar permukiman.
6. **3,0 Jam (Gambar 5):** Muka air $+2{,}85\text{ m}$, kapasitas retensi tanah jenuh 100%, status **BANJIR**.

---

## 3. Struktur Berkas

```
flood-sim-pontianak/
├── index.html              # Antarmuka WebGIS & instrument panel
├── css/
│   └── style.css           # Desain kartografi klasik print-atlas
├── js/
│   ├── main.js             # Engine simulasi, Leaflet controller, SPK, SVG Cross-Section
│   └── data.js             # Vektor kontur 4 zona, jaringan sungai, & 10 stasiun IoT
├── data/
│   ├── genangan_1m.geojson # Layer genangan 1m riil Kota Pontianak
│   ├── genangan_2m.geojson # Layer genangan 2m riil
│   ├── genangan_3m.geojson # Layer genangan 3m riil
│   └── genangan_4m.geojson # Layer genangan 4m riil
├── gen_data.py             # Script generator topografi sintetis & koordinat hidrologis
└── PRODUCT.md              # Spesifikasi teknis desain
```

---

## 4. Cara Menjalankan Secara Lokal

Aplikasi ini menggunakan teknologi web murni tanpa build tool, bundler, atau npm dependency. Cukup jalankan server HTTP statis:

```bash
# Menggunakan Python built-in server:
python3 -m http.server 7777

# Buka pada browser:
http://localhost:7777/
```

---

## 5. Sumber Daya & Atribusi

- **Dasar Teori:** Dr. Ir. Yus Sholva, S.T., M.T. (Bahan Kuliah Sistem Informasi Geografis & GeoAI, Universitas Tanjungpura).
- **Basemap:** © [OpenStreetMap](https://www.openstreetmap.org/) contributors (desaturasi & kalibrasi via filter kartografi).
- **Framework Peta:** [Leaflet.js](https://leafletjs.com/) v1.9.4.
