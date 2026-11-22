// Node unit tests for Nursery Rhyme BD.
// Run from the project root:  node tests/test.js
// Exits 0 only if every check passes.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const L = require('../js/logic.js');

const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? ' :: ' + extra : '')); }
}

const rhymesSrc = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/rhymes-source.json'), 'utf8'));
const i18nSrc = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/i18n-source.json'), 'utf8'));
const RHYMES = rhymesSrc.rhymes;

// ---- Data integrity (source of truth) ----
console.log('rhyme data integrity');
check('exactly 10 rhymes', RHYMES.length === 10, String(RHYMES.length));
check('unique ids', new Set(RHYMES.map((r) => r.id)).size === 10);
RHYMES.forEach(function (r) {
  check('validateRhyme clean: ' + r.id, L.validateRhyme(r).length === 0, L.validateRhyme(r).join(','));
});
check('total Bengali lines = 76',
  RHYMES.reduce((n, r) => n + r.linesBn.length, 0) === 76,
  String(RHYMES.reduce((n, r) => n + r.linesBn.length, 0)));
check('per-rhyme line counts',
  JSON.stringify(RHYMES.map((r) => r.linesBn.length)) === JSON.stringify([7, 4, 4, 8, 12, 16, 11, 6, 4, 4]),
  JSON.stringify(RHYMES.map((r) => r.linesBn.length)));
check('roman lines match Bengali line counts',
  RHYMES.every((r) => r.linesRoman.length === r.linesBn.length));
check('only talgach + brishti are excerpts',
  JSON.stringify(RHYMES.filter((r) => r.excerpt).map((r) => r.id)) === JSON.stringify(['talgach', 'brishti']));
check('categories all valid', RHYMES.every((r) => L.CATEGORIES.includes(r.category)));
check('category spread: 1 lullaby, 4 fun, 2 birds, 2 nature, 1 morning',
  JSON.stringify(RHYMES.map((r) => r.category).sort()) ===
  JSON.stringify(['birds', 'birds', 'fun', 'fun', 'fun', 'fun', 'lullaby', 'morning', 'nature', 'nature']));
check('no Nazrul text shipped (copyright guard)',
  !JSON.stringify(RHYMES).includes('কাঠবেড়ালি') && !JSON.stringify(RHYMES).includes('কাঠবিড়ালি'));
check('every rhyme has emoji', RHYMES.every((r) => typeof r.emoji === 'string' && r.emoji.length > 0));

// ---- i18n completeness ----
console.log('i18n completeness');
const keys = Object.keys(i18nSrc);
check('33 i18n keys', keys.length === 33, String(keys.length));
check('every key has en + bn non-empty',
  keys.every((k) => typeof i18nSrc[k].en === 'string' && i18nSrc[k].en.length > 0 &&
    typeof i18nSrc[k].bn === 'string' && i18nSrc[k].bn.length > 0));
check('category keys exist for all categories',
  L.CATEGORIES.every((c) => i18nSrc['cat_' + c] && i18nSrc['cat_' + c].en && i18nSrc['cat_' + c].bn));

// ---- Generated ASCII-safe JS matches the source ----
console.log('generated JS files');
['js/rhymes.js', 'js/i18n.js', 'js/logic.js', 'js/app.js', 'index.html', 'css/style.css'].forEach(function (rel) {
  const buf = fs.readFileSync(path.join(ROOT, rel));
  check(rel + ' is pure ASCII', [...buf].every((b) => b < 128));
});
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/rhymes.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/i18n.js'), 'utf8'), sandbox);
check('generated rhymes.js decodes to the same 10 rhymes',
  JSON.stringify(sandbox.window.RHYMES) === JSON.stringify(RHYMES));
check('generated i18n.js decodes to the same strings',
  JSON.stringify(sandbox.window.I18N) === JSON.stringify(i18nSrc));

// ---- rhymeOfDay ----
console.log('rhymeOfDay');
check('deterministic: same date twice', L.rhymeOfDay(RHYMES, '2026-11-22').id === L.rhymeOfDay(RHYMES, '2026-11-22').id);
check('2026-11-22 is sokale', L.rhymeOfDay(RHYMES, '2026-11-22').id === 'sokale',
  L.rhymeOfDay(RHYMES, '2026-11-22').id);
const tenDays = [];
for (let d = 0; d < 10; d++) {
  const dt = new Date(Date.UTC(2026, 10, 22 + d));
  tenDays.push(L.rhymeOfDay(RHYMES, dt.toISOString().slice(0, 10)).id);
}
check('10 consecutive days cover all 10 rhymes', new Set(tenDays).size === 10, tenDays.join(','));
check('invalid date falls back to first rhyme', L.rhymeOfDay(RHYMES, 'not-a-date').id === 'chand-mama');
check('empty list returns null', L.rhymeOfDay([], '2026-11-22') === null);

// ---- search ----
console.log('searchRhymes');
check('search "chand" finds chand-mama',
  L.searchRhymes(RHYMES, 'chand').map((r) => r.id).includes('chand-mama'));
check('search Bengali "চাঁদ" finds chand-mama',
  L.searchRhymes(RHYMES, 'চাঁদ').map((r) => r.id).includes('chand-mama'));
check('search "Tagore" finds 2', L.searchRhymes(RHYMES, 'Tagore').length === 2);
check('search "সুকুমার" finds baburam',
  L.searchRhymes(RHYMES, 'সুকুমার').map((r) => r.id).join() === 'baburam');
check('search first line "মাছ কুটলে" finds chand-mama',
  L.searchRhymes(RHYMES, 'মাছ কুটলে').map((r) => r.id).join() === 'chand-mama');
check('empty query returns all 10', L.searchRhymes(RHYMES, '').length === 10);
check('whitespace query returns all 10', L.searchRhymes(RHYMES, '   ').length === 10);
check('no match returns empty', L.searchRhymes(RHYMES, 'zzz-no-such-rhyme').length === 0);
check('case-insensitive "TAGORE"', L.searchRhymes(RHYMES, 'TAGORE').length === 2);

// ---- filter ----
console.log('filterByCategory');
check('birds -> 2', L.filterByCategory(RHYMES, 'birds').length === 2);
check('lullaby -> 1', L.filterByCategory(RHYMES, 'lullaby').length === 1);
check('fun -> 4', L.filterByCategory(RHYMES, 'fun').length === 4);
check('nature -> 2', L.filterByCategory(RHYMES, 'nature').length === 2);
check('morning -> 1', L.filterByCategory(RHYMES, 'morning').length === 1);
check('all -> 10', L.filterByCategory(RHYMES, 'all').length === 10);
check('unknown category -> 10', L.filterByCategory(RHYMES, 'nope').length === 10);

// ---- toggle / learned / navigation ----
console.log('toggleInList / learnedCount / navigation');
let t1 = L.toggleInList([], 'chand-mama');
check('toggle adds', t1.added === true && t1.list.join() === 'chand-mama');
let t2 = L.toggleInList(t1.list, 'chand-mama');
check('toggle removes', t2.added === false && t2.list.length === 0);
check('toggle does not mutate input', L.toggleInList(['a'], 'b').list.join() === 'a,b');
check('learnedCount 0', L.learnedCount([]) === 0);
check('learnedCount 3', L.learnedCount(['a', 'b', 'c']) === 3);
check('next of last wraps to first', L.nextRhymeId(RHYMES, 'sokale') === 'chand-mama');
check('prev of first wraps to last', L.prevRhymeId(RHYMES, 'chand-mama') === 'sokale');
check('next of chand-mama is hattimatim', L.nextRhymeId(RHYMES, 'chand-mama') === 'hattimatim');
check('next of unknown id returns first', L.nextRhymeId(RHYMES, 'nope') === 'chand-mama');
check('next on empty list is null', L.nextRhymeId([], 'chand-mama') === null);

// ---- digits / dates ----
console.log('digits / dates');
check('toBnDigits 0 -> ০', L.toBnDigits(0) === '০');
check('toBnDigits 10 -> ১০', L.toBnDigits(10) === '১০');
check('toBnDigits 2026 -> ২০২৬', L.toBnDigits(2026) === '২০২৬');
check('fmtCount en', L.fmtCount(7, 'en') === '7');
check('fmtCount bn', L.fmtCount(7, 'bn') === '৭');
check('localDateStr 2026-11-22', L.localDateStr(new Date(2026, 10, 22)) === '2026-11-22');
check('isSpeechAvailable false in node', L.isSpeechAvailable() === false);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
