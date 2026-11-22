# Chhora BD — Bangla Nursery Rhymes

![status](https://img.shields.io/badge/status-published-brightgreen)
![offline](https://img.shields.io/badge/offline-yes-blue)
![rhymes](https://img.shields.io/badge/rhymes-10-orange)

**Chhora BD** (ছড়া বিডি) is a free, fully offline bilingual (Bangla/English)
nursery-rhyme app for little ones — and for parents and teachers who want the
classic Bangla ছড়া in one place, with the words right.

## Problem

Every Bengali child grows up on the same handful of rhymes — *আয় আয় চাঁদ
মামা*, *হাট্টিমাটিম টিম*, *বাবুরাম সাপুড়ে* — but parents hunting for them
online hit ad-covered video sites, misquoted lyrics, and modern remixes that
change the words. There was no small, offline, text-first collection of the
classics with correct lyrics, a plain-English meaning, and a read-aloud mode
for bedtime.

## Features

1. **10 verified classic rhymes** — *আয় আয় চাঁদ মামা*, *হাট্টিমাটিম টিম*,
   *আতা গাছে তোতা পাখি*, *বাবুরাম সাপুড়ে*, *তালগাছ*, *বৃষ্টি পড়ে টাপুর
   টুপুর*, *নোটন নোটন পায়রাগুলি*, *আগডুম বাগডুম*, *খোকন খোকন ডাক পাড়ি*,
   *সকালে উঠিয়া আমি* — 76 lines in total, each with author/source, a
   romanised transliteration, and a one-line meaning in Bangla and English.
2. **Read-aloud** — device text-to-speech reads any rhyme in Bangla
   (bn-BD voice when the device has one); a clear notice appears when no
   Bangla voice is available.
3. **Rhyme of the day** — deterministic by date, the same rhyme on every
   device; plus a "Surprise me" shuffle.
4. **Search + category filters** — search by title, poet, or first line
   (Bangla or English); filter by Lullaby / Fun / Birds / Nature / Morning.
5. **Favourites + "I learned it"** — star rhymes, tick off the ones your
   child has memorised, and watch the "X of 10 learned" progress. Saved in
   localStorage; nothing leaves the device.
6. **Kid-sized reading** — big text with three font sizes, EN/বাংলা UI
   toggle with Bengali digits, printable rhyme cards, large tap targets,
   390px-mobile friendly, zero network requests.

## Accuracy — how the words were verified

Every rhyme text was checked against published sources on 2026-11-22 before
the build (see `TEST_RESULTS.md` for the source list). All 10 are public
domain: anonymous folk rhymes, or authors dead more than 60 years
(Rabindranath Tagore d. 1941, Sukumar Ray d. 1923, Madanmohan Tarkalankar
d. 1858; *হাট্টিমাটিম টিম* printed in *খুখুমণির ছড়া*, 1899). Two long poems
(*তালগাছ*, *বৃষ্টি পড়ে টাপুর টুপুর*) ship as clearly-labelled excerpts —
the opening stanzas only. Folk rhymes have regional spelling variants; the
most widely printed version is used.

One deliberate omission: Kazi Nazrul Islam's *খুকি ও কাঠবেড়ালি* ("কাঠবিড়ালি
কাঠবিড়ালি পেয়ারা তুমি খাও") is **not** included — Nazrul died in 1976, so
it is still in copyright in Bangladesh (life + 60 years, until 2036).

## Stack

- Plain HTML + CSS + vanilla JavaScript — no framework, no build step, no
  dependencies, no network requests.
- `js/rhymes.js` / `js/i18n.js` are generated from `tools/rhymes-source.json`
  / `tools/i18n-source.json` by `tools/build-i18n.py`, which stores Bengali
  as `\uXXXX` escapes so the shipped JS is pure ASCII.
- `js/logic.js` holds the pure, testable logic (search, filter, rhyme of the
  day, favourites/learned toggles, Bengali digits); `js/app.js` wires the DOM.

## Prerequisites

Any modern browser. For read-aloud, a device with a Bangla
text-to-speech voice (Chrome on Android usually has one; desktop Chrome
often does not).

## Install & run

```bash
# No install step — open the file directly, or serve it:
python3 -m http.server 8000
# then open http://localhost:8000/
```

To regenerate the data files after editing the JSON sources:

```bash
python3 tools/build-i18n.py
```

## Testing

```bash
node tests/test.js          # 69 unit tests (data integrity, search, filter,
                            # rhyme-of-day, navigation, digits)
node tests/smoke.mjs 1280   # 43 headless-Chrome checks @1280x800
node tests/smoke.mjs 390    # 43 headless-Chrome checks @390x844
```

Results: 69/69 unit, 43/43 smoke @1280, 43/43 smoke @390, 0 console errors,
0 failed requests. See `TEST_RESULTS.md`.

## Deployment

Static site — any static host works. GitHub Pages: enable Pages on `main`,
root folder.

## Limitations

- Read-aloud depends on the device's speech synthesis; the app cannot add a
  Bangla voice a device does not have, and real audio output was not asserted
  in headless tests (no speakers, no trusted gesture).
- Folk-rhyme spellings vary by region (e.g. ঢুলি/ডুলি in *আগডুম বাগডুম*);
  the app uses the most widely printed form and notes the variance.
- Two Tagore poems are excerpts (opening stanzas), labelled in the app.
- Transliterations are simple romanisation for parents learning the sounds,
  not scholarly transliteration.

## Status

Factory run #410 (2026-11-22, 10:00 slot). Published and verified — see
`TEST_RESULTS.md` for the evidence.
