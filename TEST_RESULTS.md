# TEST_RESULTS.md — Nursery Rhyme BD (factory run #410, 2026-11-22, 10:00 slot)

## Test runs (real, run this session)

| Suite | Result |
|---|---|
| `node tests/test.js` | **69/69 passed** |
| `node tests/smoke.mjs 1280` | **43/43 passed** @1280x800 (headless_shell-1187, raw CDP, file://) |
| `node tests/smoke.mjs 390` | **43/43 passed** @390x844 |
| Console errors / failed requests | **0 / 0** across both smoke runs |

## What the smoke test hand-verified

- Home renders: "Chhora BD" heading, rhyme-of-the-day card (2026-11-22 =
  "Sokale Uthiya Ami", deterministic), 10 cards, 6 category chips,
  "0 of 10 rhymes learned".
- Search "Tagore" -> 2 cards; "zzz-no-match" -> empty state; clearing restores 10.
- Category "Birds" -> 2 cards; "All" restores 10.
- Reader: "Aay Aay Chand Mama" with 7 Bengali lines, first line "আয় আয় চাঁদ
  মামা টিপ দিয়ে যা।", meaning shown, roman lines hidden until toggled, then
  7 roman lines starting "Aay aay chand mama".
- Read-aloud button clicked in headless (no Bangla voice present): no console
  error, no crash.
- Favourite star set; "I learned it" -> toast "1 of 10 rhymes learned";
  font A+ -> `fs-l`, A- -> back to `fs-m`; Next -> "Hattimatim Tim" (4 lines).
- Favourites filter shows 1 card; Surprise opens the reader; Back returns home.
- Favourite + learned persist across reload; BN toggle shows "ছড়া বিডি" and
  Bengali digits ("১ of ১০" style progress); EN toggle restores.
- No horizontal overflow at 1280 or 390. Screenshots: `tests/smoke-1280.png`,
  `tests/smoke-390.png` (local evidence only, not pushed — binary).

## Rhyme-text verification (done before the build, 2026-11-22)

Each text was checked against published web sources; excerpts are labelled
in the app and in `tools/rhymes-source.json`:

| Rhyme | Verified against |
|---|---|
| আয় আয় চাঁদ মামা (7 lines) | lullabyforkids.com (PD, Tagore 1894 essay quote) + bangla-kobita.com folk-rhymes page — canonical 7-line form |
| হাট্টিমাটিম টিম (4 lines) | boierpathshala.com — original is 4 lines, printed in "খুখুমণির ছড়া" (1899), Jogindranath Sarkar; the viral "52-line" version is a different, later poem |
| আতা গাছে তোতা পাখি (4 lines) | ToonToonKids + testbook.com — 4-line folk form; the "হিরে দাদার মরমরে থান" lines belong to a different poem and were NOT used |
| বাবুরাম সাপুড়ে (8 lines) | banglasahitya.net + kobikolpolota.in + YouTube lyric text — lines verified through "নেই কোন উৎপাত"; ending "সে সাপ জ্যান্ত গোটা দুই আনা, / তেড়ে মেরে ডাণ্ডা ক'রে দিই ঠাণ্ডা" matches the published English translation |
| তালগাছ (12 lines, excerpt) | bn.wikipedia.org (Shishu Bholanath, 24 lines) + sattacademy.com (Class 3 textbook) — first 12 lines verbatim |
| বৃষ্টি পড়ে টাপুর টুপুর (16 lines, excerpt) | bengaliforum.com + banglakobita.net — opening 16 lines verbatim |
| নোটন নোটন পায়রাগুলি (11 lines) | bangla-kobita.com + tanbircox.blogspot.com (Class 1 textbook collection) — both agree on all 11 lines |
| আগডুম বাগডুম (6 lines) | bangla-kobita.com + somewhereinblog.net — most common 6-line form; regional variants (ঢুলি/ডুলি, কমলাফুলি/কমলাফুলী) noted |
| খোকন খোকন ডাক পাড়ি (4 lines) | fuldetails.blogspot.com — 4-line folk form |
| সকালে উঠিয়া আমি (4 lines) | Madanmohan Tarkalankar, "শিশুশিক্ষা" (1849) — canonical textbook text |

## Bugs found and fixed during testing

1. Unit-test expectation wrong: total Bengali lines is 76, not 78 (7+4+4+8+12+16+11+6+4+4) — test corrected, app data was right.
2. Unit-test expectation wrong: rhyme-of-day for 2026-11-22 is "sokale", not "brishti" — deterministic day-count verified by the 10-consecutive-days-cover-all-10 check; test corrected.
3. `filterByCategory` returned [] for an unknown category — changed to return all rhymes for any unknown value (friendlier, matches the test).
4. App sources contained raw non-ASCII (Bengali digits in `logic.js`, "বাংলা"/stars/middot in `app.js`, em-dashes in `index.html`/`style.css`) — all converted to `\uXXXX` escapes or hyphens; `grep -P '[^\x00-\x7F]'` now finds zero non-ASCII bytes in `js/`, `index.html`, `css/`. (Lesson re-learned: `Path.write_text(..., encoding='ascii')` truncates the file BEFORE the encode error — it emptied `js/logic.js` once; the file was rewritten and all later writes went through a temp file + rename.)
5. Test-side fix only: `tests/test.js` keeps Bengali literals in test names (fine — tests are not shipped app sources).

## Known limitations (not asserted)

- Real read-aloud audio was NOT verified headlessly: headless_shell has no
  Bangla voice and no speakers. The code path (button -> speechSynthesis or
  graceful notice) was exercised; actual spoken output needs a real device.
- Folk-rhyme spellings vary by region; the most widely printed form is used.
- The two Tagore poems are opening-stanza excerpts, labelled as such.
- Transliterations are simple romanisation, not scholarly transliteration.

## Publish evidence

- Repo: https://github.com/fahad3235/nursery-rhyme-bd (PUBLIC, created empty via browser 10:06 +06)
- Commit: `5de04c39bb5205ca886a3e60ea5d9da56edcd4b7` on main, 14 files, single snapshot push (approval granted); first push attempt was killed by a service restart, remote verified still empty before retry.
- Pages: enabled via browser 10:30 +06 (main, / root). Live: https://fahad3235.github.io/nursery-rhyme-bd/ — HTTP 200 verified by curl 10:32 +06; live index.html byte-identical to local; css/style.css, js/rhymes.js, js/app.js all HTTP 200.
- Remote verification: `list_commits` shows the commit; `get_file_contents` index.html + js/i18n.js + tools/rhymes-source.json all intact (Bengali `\u` escapes and raw Bengali).
- Sync record `builds/nursery-rhyme-bd.muse-github-snapshot-sync.json` written manually — the push-files CLI did not create it.
- Status: PUBLISHED_AND_VERIFIED.
