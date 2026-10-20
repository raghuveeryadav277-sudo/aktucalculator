# AKTUCalc - AKTU Academic Calculator

Browser-only SGPA, CGPA and percentage calculator for AKTU students. Not affiliated with AKTU; results are unofficial estimates.

## Features
Course cards, regulation (2022/2023/2024) and B.Tech branch selection, semesters 1-8 with independent subject lists, credit-weighted SGPA, cumulative CGPA from saved semesters (total grade points / total credits), percentage via a user/config factor, dashboard with bar chart, dark mode, LocalStorage persistence.

## Stack and files
HTML5, CSS3, vanilla JS (no dependencies, no Chart.js; chart is plain CSS).
```
aktucalc/
├── index.html
├── style.css
├── script.js
└── README.md
```

## Run locally (VS Code)
Open the folder in VS Code, install the **Live Server** extension, right-click `index.html` > *Open with Live Server*. Double-clicking `index.html` also works.

## Configure rules
Edit `CONFIG` at the top of `script.js`:
- `gradeSets`: grade to grade-point maps.
- `regulations`: label, grade set, `verified` flag, `pctFactor` (official K, or `null`).
- `courses` / `branches`: add entries; set `configured: true` plus `semesters` for a course to enable it.

## Verify formulas
The default grade table and all regulations are **unverified**. Compare them with the official AKTU ordinance/result documents for your batch, then set `verified: true` and fill `pctFactor` only if officially specified.

## LocalStorage
Everything is saved under key `aktucalc:v1` in your browser only. Clearing browser data deletes your records. Nothing is sent to a server. Use "Clear all saved data" to wipe it.

## Deploy
Upload the folder to any static host (GitHub Pages, Netlify, Vercel) over HTTPS. Replace the canonical URL in `index.html`. Add `robots.txt` and `sitemap.xml` with your domain.

## Test calculations
Example: credits 4/A+(10), 3/A(9), 3/B(7) gives (40+27+21)/10 = **8.80**. Two saved semesters with (88 pts, 10 cr) and (72 pts, 8 cr) give CGPA 160/18 = **8.89**.

## Known limitations
Only B.Tech is enabled (manual subject entry); other courses show "rules not configured". No official rules are bundled. No automated test suite, `robots.txt` or `sitemap.xml` yet.
