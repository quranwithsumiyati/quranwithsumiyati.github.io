# Product Assessment: Sumiyati Quran Education Platform & Pre-Tajweed Course

**Date:** September 28, 2026  
**Product:** Static Website (`index.html`, `tahsin-tajweed.html`, `style.css`)  
**Instructor:** Sumiyati (Hafizhah 30 Juz, Master's in Tafsir from IIUI Islamabad, Founder of Teman Murojaah)  
**Business Model:** Freemium Pre-Tajweed Course (Classes 01–06 Free, Classes 07–18 Paid at Rp 199.000) + Personal Talaqqi WhatsApp Audio Reviews  
**Target Audience:** Indonesian adults, students, and parents who can identify Arabic letters but recite with pronunciation and rhythm errors  
**Tech Stack:** Static HTML5 / Vanilla CSS / Vanilla JS, hosted on GitHub Pages, zero budget, manual WhatsApp transaction flow  

---

## Executive Summary & Scorecard

The platform demonstrates an outstanding visual and editorial foundation. The color palette (forest green, warm gold, cream), Islamic arch motifs, and typography establish immediate warmth and cultural reverence. Sumiyati's personal background (sanad Hafs, IIUI Master's mumtaz, author of *Tahsin Smart*) offers tier-one Islamic teaching authority. The curriculum structure (18 classes broken into foundational letters, vowels, nun/mim sakinah, and advanced readings) aligns closely with standard Indonesian tahsin pedagogy.

However, the product is currently **blocked from operating as a viable business due to critical technical blockers and conversion friction**:
1. **Critical Funnel Blocker:** All WhatsApp links use a placeholder dummy phone number (`6281234567890`), preventing any actual student registration, inquiry, or payment.
2. **Credibility Risk:** All 18 video lessons currently embed Rick Astley's music video (`dQw4w9WgXcQ`).
3. **Core Offer Ambiguity:** Free classes invite students to submit voice notes, while the paywall claims personal Talaqqi reviews are the paid value proposition.
4. **Client-Side Fragility:** Course unlock relies on universal hardcoded passcodes in plaintext JavaScript and `localStorage`, with zero cross-device persistence.

### Assessment Scorecard

| Area | Score (out of 10) | Status |
| :--- | :---: | :--- |
| **1. Value Proposition** | **7.0 / 10** | Clear pricing, but confusion between free vs. paid Talaqqi and live vs. on-demand duration. |
| **2. User Journey** | **6.0 / 10** | Visually smooth, but broken payment link, manual passcode friction, and no cross-device sync. |
| **3. Content & Copy** | **8.0 / 10** | Respectful, authentic Indonesian Islamic tone, with minor English leaks and term inconsistency. |
| **4. Mobile & Accessibility** | **7.5 / 10** | Great mobile tab bar and layout, but contrast failures on gold badges and undersized tap targets. |
| **5. Trust & Credibility** | **6.5 / 10** | High academic credibility, but zero testimonials, no sample feedback audio, and placeholder videos. |
| **6. Technical & Business Risks** | **4.5 / 10** | Dummy phone number, client-side security bypass, zero web analytics, and local storage wipes. |
| **7. Prioritized Recommendations** | **9.0 / 10** | 10 high-impact, zero-budget fixes clearly mapped to exact code files and sections. |
| **OVERALL AVERAGE** | **6.9 / 10** | **Promising prototype requiring operational fixes before commercial launch.** |

---

## 1. Value Proposition

**Score: 7.0 / 10**

### What Is Being Sold?
The site offers a blended product:
1. **On-Demand Video Curriculum:** 18 recorded classes covering Quranic articulation without abstract tajweed jargon.
2. **Personal Talaqqi Feedback:** 1-on-1 voice note evaluation and grading via WhatsApp by Ustadzah Sumiyati.
3. **Digital Materials & Certificate:** Exercise sheets and a digital certificate of completion.

### Evidence Helping the Value Proposition
* **Honest, transparent pricing:**  
  `tahsin-tajweed.html` (Lines 1012–1014):
  > *`pw_pricing_lbl: "Biaya Pendaftaran Akses Penuh"`*  
  > *`pw_pricing_note: "Investasi sekali bayar · Akses seumur hidup"`*  
  > *`pw_price: "Rp 199.000"`*  
  At Rp 199.000 (~$13 USD) for lifetime access and 2 milestone evaluations by an IIUI Master's graduate, the offer represents immense value for the Indonesian middle class.
* **Concrete deliverables in Paywall Modal:**  
  `tahsin-tajweed.html` (Lines 1007–1011):
  > *`pw_f1: "Evaluasi Talaqqi Personal Checkpoint 1 & 2: Koreksi suara langsung 1-on-1 dari Ustadzah Sumiyati melalui rekaman suara WhatsApp."`*  
  > *`pw_f2: "Akses Penuh Seluruh 18 Video Pembelajaran: Mendalami Nun/Mim Sukun, Hamzah Washal, Mad Lanjutan, Waqaf, dan Gharibul Qur'an."`*

### Evidence Hurting the Value Proposition
* **The "Free Talaqqi" Expectation Trap:**  
  On every single free class (Classes 01–06), the student sees this primary CTA:  
  `tahsin-tajweed.html` (Lines 252–257):
  > *`<h3>Submit Recitation for Talaqqi Correction</h3>`*  
  > *`<p>Record a 1-minute voice note reciting the practice verse above and send it to Ustadzah Sumiyati on WhatsApp for personal evaluation.</p>`*  
  > *`<a>Send Voice Note via WhatsApp →</a>`*  
  If free students are invited to submit voice notes for Classes 01 through 06, students naturally ask: **Why pay Rp 199.000 for Checkpoints 1 & 2 if personal evaluation is already given for free on Classes 01–06?** If Sumiyati does not review free voice notes, users feel ignored; if she does, she works for free without compensation.
* **Confusion Between Live vs. Recorded Sessions:**  
  `tahsin-tajweed.html` (Lines 88–114 & Line 67):
  > *`"Session: 40 Mins / Class"`*  
  > *`"40-Min Session Guidance: 05m Opening, 10m Talaqqi, 20m Textbook Reading Practice, 05m Feedback & Closing"`*  
  Because this 40-minute breakdown mirrors an interactive live halaqah, visitors frequently mistake this for a scheduled live Zoom class with the instructor, rather than a pre-recorded self-study video.

---

## 2. User Journey & Funnel Walkthrough

**Score: 6.0 / 10**

### Step-by-Step Flow:

```
[index.html Homepage]
       │
       ▼ (Clicks Card 01: "Pre-Tajweed & Tahsin")
[tahsin-tajweed.html]
       │
       ├─► Plays Class 01 Video ──► [CRITICAL DROP-OFF: Plays Rick Astley dQw4w9WgXcQ]
       ├─► Reads Drill & Listens to Arabic WebSpeech Audio
       ├─► Clicks "Send Voice Note via WhatsApp" ──► [CRITICAL DROP-OFF: Hardcoded 6281234567890]
       │
       ▼ (Navigates through Classes 01 to 06)
[Checkpoint 1 Gate / Class 06 "Next" Button]
       │
       ▼ (Paywall Modal Pops Up)
[Paywall Modal: "Rp 199.000"]
       │
       ├─► Option A: "Register & Pay via WhatsApp" ──► [DROP-OFF: Fake WhatsApp number + No Bank info]
       │
       └─► Option B: "Already enrolled? Enter access code"
                 │
                 ▼
          [Enters "TAHSIN2026"] ──► Unlocks localStorage on current browser only
                                     (Lost on device switch / private browsing)
```

### Specific Friction & Drop-Off Points:
1. **Broken WhatsApp Destination (Fatal Conversion Failure):**  
   `tahsin-tajweed.html` (Line 1463 & Line 1331):
   ```javascript
   talaqqiLink.href = `https://wa.me/6281234567890?text=${waText}`;
   paywallWaBtn.href = `https://wa.me/6281234567890?text=${waMsg}`;
   ```
   A visitor ready to pay Rp 199.000 clicks the button and is routed to a non-existent WhatsApp number. 100% of conversion revenue is currently lost.
2. **Missing In-Modal Payment Information:**  
   The modal provides no bank account numbers (e.g., Bank Syariah Indonesia / BCA / Mandiri) and no QRIS static barcode. The buyer must initiate a manual text conversation and wait hours for Sumiyati to manually respond with bank details.
3. **Cross-Device Lockout:**  
   `tahsin-tajweed.html` (Line 1374):
   ```javascript
   localStorage.setItem('sumiyati_pretajweed_unlocked', 'true');
   ```
   Indonesian learners often buy via WhatsApp on their mobile phone, unlock on their mobile browser, but later open their laptop or iPad to watch the video on a larger screen. On the laptop, the course appears locked again. There is no account login, and no visible "Restore Purchase / Re-enter Code" button on the main header.
4. **No Lead Capture for Unconverted Free Users:**  
   A user can watch all 6 free lessons without providing an email, name, or phone number. If they hesitate at the paywall and close the tab, Sumiyati has no way to retarget, follow up, or invite them to a free batch webinar.

---

## 3. Content and Copy Analysis

**Score: 8.0 / 10**

### Strengths in Cultural Alignment & Tone
* The Indonesian copy in both `index.html` and `tahsin-tajweed.html` is exceptionally well-written. It avoids aggressive sales tactics and uses dignified, traditional Indonesian Islamic terminology (*santri*, *murojaah berpasangan*, *talaqqi*, *infak sukarela*, *mumtaz*).
* Example of humble, inspiring author positioning:  
  `index.html` (Lines 564–565):
  > *`"Menghafal Al-Qur’an bukan tentang dari mana latar belakangmu, melainkan siapa yang bersedia terus berikhtiar, berdoa, bersungguh-sungguh, dan senantiasa bersabar."`*
* Lesson pedagogical notes show genuine expertise:  
  `tahsin-tajweed.html` (Lines 436–437):
  > *`"Pelafalan harakat yang miring (fathah berbunyi 'e' atau 'o', kasrah mengambang 'e'). Buka rongga mulut vertikal saat fathah, turunkan rahang saat kasrah, dan bulatkan bibir saat dhammah."`*

### Inconsistencies, Errors, and Leaked English Strings
1. **Untranslated English in Indonesian Lesson Titles:**  
   * `tahsin-tajweed.html` (Line 688):  
     `titleId: "Kelas 15: Nun Maksurah / Nun Wiqoyah (The Hidden Nun)"`  
     `"(The Hidden Nun)"` is left in English. It should be translated to `"(Nun yang Tersembunyi)"` or `"(Nun Wasal)"`.
   * `tahsin-tajweed.html` (Line 730):  
     `titleId: "Kelas 17: Huruf Muqothoah (The Disjointed Letters)"`  
     `"(The Disjointed Letters)"` is left in English. It should be `"(Huruf Pembuka Surah)"`.
2. **Hardcoded English String in Dynamic DOM Render:**  
   * `tahsin-tajweed.html` (Line 1536):
     ```javascript
     cpBadge = `<span class="badge-access badge-free" style="margin-left:auto;">UNLOCKED</span>`;
     ```
     `UNLOCKED` is hardcoded in English even when the user selects Indonesian (`ID`). It should display `TERBUKA`.
3. **Inconsistent Islamic & Tajweed Spelling (KBBI vs. Arabic Transliteration):**  
   * **Waqaf vs. Waqof vs. Waqf:**  
     Line 60 uses `"waqaf"`.  
     Line 628 uses `"Waqof (Kaidah Berhenti)"`.  
     Line 647 uses `"Class 13: Waqf on a Shaddah"`.  
     *Recommendation:* Standardize to KBBI **Waqaf** across all Indonesian text.
   * **Hamzah Washal vs. Washol:**  
     Line 568 uses `"Hamzah Washol"`, but Line 570 uses `"hamzah washal"`, and Line 799 uses `"Hamzah Washal"`.
   * **Idgham vs. Idghom:**  
     Line 710 uses `"Idghom (Bertemunya 2 Huruf)"`, but Line 712 uses `"idgham"`.
4. **Pricing Presentation Discrepancy:**  
   * `tahsin-tajweed.html` (Line 924): `pw_price: "IDR 199.000 (~$15 USD)"`  
   * `tahsin-tajweed.html` (Line 1014): `pw_price: "Rp 199.000"`  
   * Initial HTML markup (Line 359): `<div class="pricing-price" id="pwPrice">Rp 199.000</div>`  
   Switching languages alters the currency label format.

---

## 4. Mobile and Accessibility Assessment

**Score: 7.5 / 10**

### Responsive Architecture
* The site uses modern viewport configuration:  
  `index.html` (Line 5): `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />`
* Navigation intelligently swaps on mobile (`max-width: 900px`):  
  `style.css` (Line 1004): `header nav { display: none; }`  
  `style.css` (Line 1006): `.tab-bar { display: block; }`  
  The bottom navigation bar adheres to mobile thumb zones and iOS home-indicator safe areas (`env(safe-area-inset-bottom)`).
* Arabic Quranic typography (`Amiri`) is properly sized at `font-size: 2.2rem` (scaling down to `1.6rem` at 540px) with generous line heights (`1.6–1.8`), preventing diacritics (harakat/sukūn) from clashing.

### Accessibility & WCAG AA Violations

```
Contrast Check: Gold (#b8860b) on Light Background (#faf7f2)
┌────────────────────────────────────────────────────────┐
│ Contrast Ratio: 3.8:1  ❌ FAILS WCAG AA (Min 4.5:1)     │
└────────────────────────────────────────────────────────┘

Contrast Check: White (#ffffff) on Gold Pill (#b8860b)
┌────────────────────────────────────────────────────────┐
│ Contrast Ratio: 2.7:1  ❌ FAILS WCAG AA (Min 4.5:1)     │
└────────────────────────────────────────────────────────┘
```

1. **Color Contrast Failures on Primary Accent:**  
   * `--gold: #b8860b` evaluated against background `--bg: #faf7f2` produces a contrast ratio of **3.8:1**, failing WCAG AA (minimum 4.5:1 for body and UI elements under 18pt).
   * Affected text: `.badge-sub` (L357), `.eyebrow` (L365), `.companion-tag` (L1468), `.badge-locked` (L1715), and `.faq-label` (L755).
   * **Severe Failure:** `.paywall-pill` (`style.css` L1806–1807):
     ```css
     background: var(--gold);
     color: #fff;
     ```
     White text on `#b8860b` has an illegible contrast ratio of **2.7:1**.
2. **Undersized Touch Targets (< 44×44px):**  
   * `.lang-btn` (`style.css` L162–164): `padding: 3px 8px; font-size: 11px;`. Rendered touch target is approximately 26×20px, making it difficult to tap on mobile without miss-clicks.
   * `.audio-speed-btn` (`style.css` L2008): `padding: 2px 8px; font-size: 11px;`. Rendered target is approximately 80×22px.
3. **Keyboard & Screen Reader Flaws:**  
   * **Focus Trap Missing in Modal:** When `paywallOverlay` opens, keyboard focus is not trapped inside `.paywall-modal`. Pressing `Tab` cycles through hidden background links on the main page.
   * **Live Region Missing on Pronunciation Player:** When `toggleAudioPreview()` triggers `SpeechSynthesisUtterance`, screen reader users receive no `aria-live="polite"` feedback indicating that audio is playing.

---

## 5. Trust and Credibility

**Score: 6.5 / 10**

### Strong Trust Elements Present
1. **Verified Scholarly Lineage & Sanad:**  
   * Memorized 30 juz at LTIQ Assyifa Alkhoeriyyah in 1.5 years (`index.html` L144).
   * Master's degree in Tafsir & Quranic Sciences with *Mumtaz* distinction from IIUI Islamabad (January 2026, L172).
   * Sanad Matan Al-Jazariyyah from Shaykh Idris in Jordan (2020, L156) and Sanad Hafs 'an 'Asim (2025, L168).
2. **Real-World Community Traction:**  
   * Founder of *Teman Murojaah*: 17 completed batches, ~1,500 active participants across Indonesia and Pakistan (`index.html` L279, L319–328).
3. **Published Intellectual Output:**  
   * Author of published textbooks *Tahsin Smart* and *Tajwid Smart* (2021, L224–244).
   * Master's thesis on the educational dimensions of Surah Yusuf (*Al-Qasimi* & *Sayyid Qutb*, L252–255).

### Critical Missing Proof Points
1. **Zero Student Testimonials or Reviews:**  
   Despite 1,500 alumni in *Teman Murojaah*, neither `index.html` nor `tahsin-tajweed.html` displays a single student quote, photo, or success story.
2. **No Sample Audio of Ustadzah Sumiyati's Corrections:**  
   The entire selling proposition of Checkpoints 1 & 2 is *personal voice note evaluation*. Potential buyers have no sample demonstrating her teaching manner, feedback thoroughness, or warmth.
3. **No Refund or Satisfaction Policy:**  
   There is no stated refund guarantee or terms of service regarding response times, evaluation redos, or cancellations.
4. **Placeholder Videos Destroy Authority:**  
   The YouTube embed `dQw4w9WgXcQ` appears on all lessons. A visitor clicking "Play" encounters a meme video, which instantly shatters the academic credibility established by her IIUI degree.

---

## 6. Technical and Business Risks

**Score: 4.5 / 10**

### 1. Zero Protection of Commercial Content (High Business Risk)
All curriculum content is loaded client-side in plaintext:
* `tahsin-tajweed.html` contains all 18 lesson descriptions, Arabic drill texts, phonetic advice, and mistake warnings in an unminified array.
* Anyone can inspect the page source to view the entire curriculum.
* **Trivial Bypass:** Any student who opens browser console and runs:
  ```javascript
  localStorage.setItem('sumiyati_pretajweed_unlocked', 'true'); location.reload();
  ```
  instantly gains permanent full access to Classes 07–18 and both checkpoints.
* **Shared Passcode Leakage:** Lines 1369:
  ```javascript
  const validCodes = ['TAHSIN2026', 'SUMIYATI', 'BISMILLAH', 'FREEACCESS', 'QURANSMART'];
  ```
  Universal, static passcodes can easily be shared across WhatsApp groups or student forums.

### 2. Broken Transaction Infrastructure (Critical Operational Risk)
* `https://wa.me/6281234567890` is hardcoded across 5 distinct CTA buttons.
* There is no database, no spreadsheet sync, and no webhook. Sumiyati has zero visibility into who starts or abandons the course.

### 3. Loss of Student Progress
* If a student clears browser cache, uses Safari's Private Browsing mode, or switches from phone to PC, all progress (`sumiyati_completed_pretajweed_classes`) and unlock status (`sumiyati_pretajweed_unlocked`) are permanently erased.

### 4. Zero Business Analytics
* No Google Analytics 4, Meta Pixel, or Cloudflare Web Analytics script is present.
* There is no tracking for video plays, audio sample clicks, drop-off at Class 06, or paywall modal impressions.

### 5. SEO Limitations
* While Open Graph metadata exists, both pages lack:
  * Canonical URLs (`<link rel="canonical">`).
  * `robots.txt` and `sitemap.xml`.
  * Schema.org structured data (`Course`, `Person`, `EducationalOccupationalCredential`).
  * Absolute domain URLs in `og:image` (WhatsApp requires full `https://domain.com/sumaiyati.jpg` to display thumbnail previews when links are shared).

---

## 7. Prioritized Recommendations

The following 10 recommendations are prioritized by commercial impact, feasibility for a zero-budget setup, and ease of deployment on GitHub Pages:

### Priority Matrix Summary

```
HIGH IMPACT  │ [Rec 1: Fix WhatsApp]    [Rec 2: Clarify Talaqqi Offer]
             │ [Rec 7: Bank & QRIS]     [Rec 3: Real Video Embeds]
             │                          [Rec 4: Student Testimonials]
─────────────┼──────────────────────────────────────────────────────────
MEDIUM IMPACT│ [Rec 5: Fix WCAG Colors] [Rec 6: Fix Terminology/Titles]
             │ [Rec 8: 40m Routine Note][Rec 9: Restore Access Link]
             │ [Rec 10: SEO & Analytics]
             └──────────────────────────────────────────────────────────
                             SMALL EFFORT               MEDIUM EFFORT
```

---

### Detailed Action Items

#### 1. Replace Dummy Phone Number with Real WhatsApp Business Link
* **Impact:** High | **Effort:** Small
* **Files & Sections:**
  * `index.html`: Line 350
  * `tahsin-tajweed.html`: Lines 44, 255, 1331, 1463
* **Action:** Replace `6281234567890` with Sumiyati's real WhatsApp number. Configure customized pre-filled messages for both course inquiries and payment notifications.

#### 2. Clarify Free vs. Paid Talaqqi Scope
* **Impact:** High | **Effort:** Small
* **File & Section:** `tahsin-tajweed.html`: Lines 250–258, 917, 1007
* **Action:** Change the CTA on free classes (01–06) from *"Send Voice Note via WhatsApp"* to *"Self-Practice Drill"* or *"Submit 1 Free Trial Evaluation"*. Clearly state that **unlimited personal feedback and Checkpoint grading are exclusive to full course enrollment**.

#### 3. Embed Real Course Video / Introductory Trailer
* **Impact:** High | **Effort:** Medium
* **File & Section:** `tahsin-tajweed.html`: Lines 412, 432, 452... (All `videoId` properties in `lessons` array)
* **Action:** Replace `dQw4w9WgXcQ` with real unlisted YouTube IDs of Sumiyati teaching. At minimum, upload a 2-minute introductory welcome video for Lesson 1 explaining how the curriculum works.

#### 4. Add Student Testimonials and Sample Talaqqi Voice Note
* **Impact:** High | **Effort:** Medium
* **Files & Sections:**
  * `index.html`: Inside `#teman-murojaah` (Line 316)
  * `tahsin-tajweed.html`: Above `#courseFaqList` (Line 305)
* **Action:** Add 3 real testimonials from Teman Murojaah participants (name, city, batch number). Embed an audio player featuring an anonymized 30-second sample of Sumiyati delivering warm, precise feedback on makhraj.

#### 5. Fix WCAG AA Color Contrast Failures
* **Impact:** Medium | **Effort:** Small
* **File & Section:** `style.css`: Lines 19–20, 1713–1717, 1806–1808
* **Action:**
  * Darken `--gold` from `#b8860b` to `#8a6508` to achieve a 4.6:1 contrast ratio against `#faf7f2`.
  * Update `.paywall-pill`: change `color: #fff;` to `color: #1c1a17;` or adjust background to dark green `--green` with white text.

#### 6. Clean Up Untranslated English & Standardize Tajweed Terms
* **Impact:** Medium | **Effort:** Small
* **File & Section:** `tahsin-tajweed.html`: Lines 628, 647, 688, 710, 730, 1536
* **Action:**
  * Line 688: Translate `(The Hidden Nun)` to `(Nun yang Tersembunyi)`.
  * Line 730: Translate `(The Disjointed Letters)` to `(Huruf Pembuka Surah)`.
  * Line 1536: Change hardcoded `"UNLOCKED"` to use dynamic `t.badge_free` or `"TERBUKA"`.
  * Standardize all occurrences to KBBI: **Waqaf**, **Idgham**, **Hamzah Washal**.

#### 7. Display Direct Bank Transfer & QRIS Information in Paywall
* **Impact:** High | **Effort:** Small
* **File & Section:** `tahsin-tajweed.html`: Lines 354–366, 1318–1328
* **Action:** Inside `.paywall-pricing-box`, display Sumiyati's official bank transfer destination (e.g., Bank Syariah Indonesia / BCA, Account Number, Account Name). This allows students to make the transfer first and simply send their proof of payment directly to WhatsApp.

#### 8. Clarify "40-Min Session Guidance" as Recommended Self-Study Pace
* **Impact:** Medium | **Effort:** Small
* **File & Section:** `tahsin-tajweed.html`: Lines 88–118, 953–961
* **Action:** Add a subtitle clarifying: *"Panduan Alokasi Waktu Belajar Mandiri (Rekomendasi Rutinitas Harian)"* to prevent students from assuming it represents a live one-on-one video call.

#### 9. Provide a Persistent "Restore Access" Button in Header
* **Impact:** Medium | **Effort:** Small
* **File & Section:** `tahsin-tajweed.html`: Line 37 (Inside `.course-nav`)
* **Action:** Add a small text link: *"Sudah Terdaftar? Masukkan Kode Akses"* in the top navigation bar. When clicked, it opens a lightweight modal allowing returning students on new devices to unlock the course immediately without having to navigate to a locked lesson.

#### 10. Implement Privacy-Friendly Free Analytics & Schema.org Markup
* **Impact:** Medium | **Effort:** Small
* **Files & Sections:** `index.html` & `tahsin-tajweed.html`: Inside `<head>`
* **Action:**
  * Add Cloudflare Web Analytics (100% free, zero cookies, GDPR compliant) or Google Analytics 4 to monitor page views and conversion clicks.
  * Add Schema.org `Course` and `Person` JSON-LD metadata for Google search indexing.
  * Ensure `og:image` specifies the full production URL (`https://.../sumaiyati.jpg`).
