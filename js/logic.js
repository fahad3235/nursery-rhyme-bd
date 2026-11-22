// Nursery Rhyme BD - pure logic (no DOM). Usable from Node (tests) and the
// browser (window.NRB). All functions are total and side-effect free.
// This file is pure ASCII by design: Bengali digits are \u09e6-\u09ef escapes.
'use strict';

const CATEGORIES = ['lullaby', 'fun', 'birds', 'nature', 'morning'];
const BN_DIGITS = ['\u09e6', '\u09e7', '\u09e8', '\u09e9', '\u09ea', '\u09eb', '\u09ec', '\u09ed', '\u09ee', '\u09ef'];

/** Bengali digits for a non-negative integer (0 -> U+09E6). */
function toBnDigits(n) {
  return String(n).split('').map(function (ch) {
    return (ch >= '0' && ch <= '9') ? BN_DIGITS[ch.charCodeAt(0) - 48] : ch;
  }).join('');
}

/** Format a count in the current language. */
function fmtCount(n, lang) {
  return lang === 'bn' ? toBnDigits(n) : String(n);
}

/** Structural check for one rhyme record. Returns an array of problem keys. */
function validateRhyme(r) {
  const problems = [];
  if (!r || typeof r !== 'object') return ['notAnObject'];
  if (!r.id || !/^[a-z0-9-]+$/.test(r.id)) problems.push('id');
  if (!r.titleBn || typeof r.titleBn !== 'string') problems.push('titleBn');
  if (!r.titleEn || typeof r.titleEn !== 'string') problems.push('titleEn');
  if (CATEGORIES.indexOf(r.category) === -1) problems.push('category');
  if (!r.authorBn || !r.authorEn) problems.push('author');
  if (!r.sourceBn || !r.sourceEn) problems.push('source');
  if (!Array.isArray(r.linesBn) || r.linesBn.length === 0) problems.push('linesBn');
  if (!Array.isArray(r.linesRoman) || r.linesRoman.length !== (r.linesBn || []).length) {
    problems.push('linesRomanLength');
  }
  (r.linesBn || []).forEach(function (line, i) {
    if (typeof line !== 'string' || line.trim() === '') problems.push('emptyLineBn:' + i);
  });
  (r.linesRoman || []).forEach(function (line, i) {
    if (typeof line !== 'string' || line.trim() === '') problems.push('emptyLineRoman:' + i);
  });
  if (!r.meaningBn || !r.meaningEn) problems.push('meaning');
  if (typeof r.excerpt !== 'boolean') problems.push('excerpt');
  return problems;
}

/**
 * Deterministic rhyme of the day: days since the Unix epoch, modulo the
 * rhyme count. Same date -> same rhyme on every device, no randomness.
 */
function rhymeOfDay(rhymes, dateStr) {
  if (!rhymes.length) return null;
  const d = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(d.getTime())) return rhymes[0];
  const days = Math.floor(d.getTime() / 86400000);
  const idx = ((days % rhymes.length) + rhymes.length) % rhymes.length;
  return rhymes[idx];
}

/** Case-insensitive substring search over title (BN+EN), author and lines. */
function searchRhymes(rhymes, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return rhymes.slice();
  return rhymes.filter(function (r) {
    const hay = [
      r.titleBn, r.titleEn, r.authorBn, r.authorEn,
    ].concat(r.linesBn, r.linesRoman).join('\n').toLowerCase();
    return hay.indexOf(q) !== -1;
  });
}

/** Filter by category; 'all' (or any unknown value) returns everything. */
function filterByCategory(rhymes, category) {
  if (!category || category === 'all' || CATEGORIES.indexOf(category) === -1) return rhymes.slice();
  return rhymes.filter(function (r) { return r.category === category; });
}

/** Toggle an id in a list copy: returns { list, added }. */
function toggleInList(list, id) {
  const i = list.indexOf(id);
  if (i === -1) return { list: list.concat([id]), added: true };
  const next = list.slice();
  next.splice(i, 1);
  return { list: next, added: false };
}

function learnedCount(learnedIds) {
  return (learnedIds || []).length;
}

/** Next / previous rhyme id, cycling within the given ordered list. */
function nextRhymeId(rhymes, currentId) {
  if (!rhymes.length) return null;
  const i = rhymes.findIndex(function (r) { return r.id === currentId; });
  return rhymes[(i + 1) % rhymes.length].id;
}
function prevRhymeId(rhymes, currentId) {
  if (!rhymes.length) return null;
  const i = rhymes.findIndex(function (r) { return r.id === currentId; });
  return rhymes[(i - 1 + rhymes.length) % rhymes.length].id;
}

/** Local date (Asia/Dhaka-safe): YYYY-MM-DD from a Date object. */
function localDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

/** Speech synthesis available in this environment? (browser only) */
function isSpeechAvailable() {
  return typeof window !== 'undefined' &&
    typeof window.speechSynthesis !== 'undefined' &&
    typeof window.SpeechSynthesisUtterance !== 'undefined';
}

const NRB = {
  CATEGORIES: CATEGORIES,
  toBnDigits: toBnDigits,
  fmtCount: fmtCount,
  validateRhyme: validateRhyme,
  rhymeOfDay: rhymeOfDay,
  searchRhymes: searchRhymes,
  filterByCategory: filterByCategory,
  toggleInList: toggleInList,
  learnedCount: learnedCount,
  nextRhymeId: nextRhymeId,
  prevRhymeId: prevRhymeId,
  localDateStr: localDateStr,
  isSpeechAvailable: isSpeechAvailable,
};

if (typeof module !== 'undefined' && module.exports) module.exports = NRB;
if (typeof window !== 'undefined') window.NRB = NRB;
