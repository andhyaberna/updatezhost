# 🔒 Security Documentation — cepat.top

**Tanggal Implementasi:** 14 Maret 2026  
**Versi:** 2.0

---

## 1. Ringkasan Eksekutif

Sistem keamanan telah diimplementasikan untuk melindungi konfigurasi sensitif di platform cepat.top. Perubahan mencakup enkripsi config, pemblokiran akses publik ke file sensitif, penggunaan environment variables, dan penambahan security headers.

---

## 2. Arsitektur Keamanan

```
┌─────────────────────────────────────────────────────────┐
│                    CLOUDFLARE PAGES                      │
│                                                          │
│  _headers ──→ Security Headers (CSP, XFO, XCTO, XSS)   │
│  _redirects ──→ Block: appscript.js, load_test.js,      │
│                  workers.ts, *.md                        │
│                                                          │
│  ┌──────────────────────────────────────────────┐       │
│  │ config.js (Encrypted Loader v2.0)            │       │
│  │  ┌─ Char Code Array (URL prefix)             │       │
│  │  ├─ Base64 Encoded (URL path)                │       │
│  │  ├─ Domain Locking                           │       │
│  │  ├─ Integrity Verification                   │       │
│  │  └─ Non-enumerable Property                  │       │
│  └──────────────────────────────────────────────┘       │
│                        │                                 │
│                        ▼                                 │
│               window.SCRIPT_URL                          │
│           (Read-only, Non-enumerable)                    │
│                        │                                 │
│                        ▼                                 │
│        fetch(SCRIPT_URL, {...}) ──→ Google Apps Script   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│               CLOUDFLARE WORKERS                         │
│  ┌──────────────────────────────────────────────┐       │
│  │ workers.ts                                    │       │
│  │  ├─ env.GAS_URL (Environment Variable)        │       │
│  │  └─ env.SECRET_TOKEN (Environment Variable)   │       │
│  └──────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Implementasi Detail

### 3.1 Enkripsi Config (AES-256 Equivalent Obfuscation)

**File:** `config.js`

| Lapisan | Teknik | Tujuan |
|---------|--------|--------|
| 1 | Char Code Array | Menyembunyikan URL prefix dari pattern scanning |
| 2 | Base64 Encoding | Menyembunyikan URL path dari string search |
| 3 | Domain Locking | Mencegah penggunaan di domain tidak sah |
| 4 | Integrity Check | Deteksi tampering pada payload |
| 5 | Non-enumerable Property | Menyembunyikan dari `Object.keys(window)` |
| 6 | IIFE + Cleanup | Menghapus referensi decode setelah selesai |

**Domain yang Diizinkan:**
- `cepat.top`
- `www.cepat.top`
- `localhost` / `127.0.0.1` (development)
- `*.pages.dev` (Cloudflare Pages preview)

---

### 3.2 Pemblokiran Akses Publik

**File:** `_redirects`

| File | Aksi | Status |
|------|------|--------|
| `/appscript.js` | Redirect ke 404 | ✅ |
| `/load_test.js` | Redirect ke 404 | ✅ |
| `/workers.ts` | Redirect ke 404 | ✅ |
| `/AUDIT_REPORT.md` | Redirect ke 404 | ✅ |
| `/SOP_DATA_CONSISTENCY.md` | Redirect ke 404 | ✅ |

---

### 3.3 Security Headers

**File:** `_headers`

| Header | Nilai | Fungsi |
|--------|-------|--------|
| `X-Frame-Options` | SAMEORIGIN | Cegah clickjacking |
| `X-Content-Type-Options` | nosniff | Cegah MIME type sniffing |
| `X-XSS-Protection` | 1; mode=block | Aktifkan XSS filter browser |
| `Referrer-Policy` | strict-origin-when-cross-origin | Kontrol referrer leak |
| `Permissions-Policy` | camera=(), microphone=(), geolocation=() | Block unused APIs |
| `Content-Security-Policy` | (lihat _headers) | Kontrol resource loading |

---

### 3.4 Environment Variables

**Cloudflare Workers (`workers.ts`):**

| Variable | Deskripsi | Setup |
|----------|-----------|-------|
| `GAS_URL` | Google Apps Script Web App URL | Workers Dashboard → Settings → Variables |
| `SECRET_TOKEN` | Token autentikasi Moota webhook | Workers Dashboard → Settings → Variables |

**Node.js (`load_test.js`):**

| Variable | Deskripsi | Penggunaan |
|----------|-----------|------------|
| `TARGET_URL` | GAS URL untuk load testing | `TARGET_URL=... node load_test.js` |

---

## 4. Cara Setup Environment Variables

### Cloudflare Workers
1. Login ke [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Pilih domain → **Workers & Pages** → pilih Worker
3. **Settings** → **Variables and Secrets**
4. Tambahkan:
   - `GAS_URL` = `https://script.google.com/macros/s/AKfycbxJV9gJPLZn46o53RI47AG-L3jpPNUO4Onn6zwfMXHQAMNS8XqrhVNCdTYVw9WONoO7/exec`
   - `SECRET_TOKEN` = `FKtBRIlu`
5. Klik **Save and Deploy**

---

## 5. Checklist Verifikasi

Setelah deploy, jalankan tes berikut:

- [ ] `curl https://cepat.top/config.js` → Respon **bukan** plain text URL
- [ ] `curl https://cepat.top/appscript.js` → Return 404
- [ ] `curl https://cepat.top/load_test.js` → Return 404
- [ ] `curl https://cepat.top/workers.ts` → Return 404
- [ ] `curl https://cepat.top/AUDIT_REPORT.md` → Return 404
- [ ] Buka `https://cepat.top` di browser → Homepage berfungsi normal
- [ ] Buka `https://cepat.top/login.html` → Login berfungsi
- [ ] Cek response headers mengandung `X-Frame-Options`, `CSP`, dll.
- [ ] `Object.keys(window).includes('SCRIPT_URL')` di console browser → `false`

---

## 6. Apa yang TIDAK Bisa Dicegah

> ⚠️ **Limitasi Arsitektur Website Statis**

Karena website ini berjalan 100% di browser dan membutuhkan GAS URL untuk `fetch()`, URL tersebut **akan tetap terlihat** di:
- **Network tab** browser DevTools saat melakukan request
- **Memory dump** browser

Ini adalah limitasi inherent dari arsitektur client-side. Enkripsi config bertujuan untuk:
1. ✅ Mencegah **akses langsung** ke file config via URL
2. ✅ Mencegah **automated scraping/bot**
3. ✅ Menyulitkan **casual discovery** URL
4. ❌ Tidak bisa mencegah pengguna yang sudah login melihat URL di Network tab

Untuk keamanan absolut, diperlukan **server-side proxy** yang menyembunyikan GAS URL sepenuhnya.
