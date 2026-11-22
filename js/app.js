// Nursery Rhyme BD - DOM wiring. All visible text comes from window.I18N
// (EN/BN) and window.RHYMES, so this file stays pure ASCII.
// State (localStorage key 'nursery-rhyme-bd:v1'): lang, favourites, learned,
// font size, romanised-lines toggle. No network requests, no user data leaves
// the device.
'use strict';

(function () {
  var STORE_KEY = 'nursery-rhyme-bd:v1';
  var RHYMES = window.RHYMES || [];
  var I18N = window.I18N || {};
  var L = window.NRB;

  function t(key) {
    var pack = I18N[key] || {};
    return pack[state.lang] || pack.en || key;
  }
  function fill(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, function (_, k) {
      return vars[k] !== undefined ? vars[k] : '{' + k + '}';
    });
  }

  var state = {
    lang: 'en', favourites: [], learned: [], font: 'm',
    showRoman: false, category: 'all', query: '', favOnly: false,
    currentId: null, speaking: false,
  };

  function loadState() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s.lang === 'bn' || s.lang === 'en') state.lang = s.lang;
      if (Array.isArray(s.favourites)) state.favourites = s.favourites.filter(function (id) { return typeof id === 'string'; });
      if (Array.isArray(s.learned)) state.learned = s.learned.filter(function (id) { return typeof id === 'string'; });
      if (s.font === 's' || s.font === 'm' || s.font === 'l') state.font = s.font;
      if (typeof s.showRoman === 'boolean') state.showRoman = s.showRoman;
    } catch (e) { /* corrupted prefs: start fresh */ }
  }
  function saveState() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        lang: state.lang, favourites: state.favourites,
        learned: state.learned, font: state.font, showRoman: state.showRoman,
      }));
    } catch (e) { /* storage full/blocked: app still works in-memory */ }
  }

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  function rhymeById(id) {
    for (var i = 0; i < RHYMES.length; i++) if (RHYMES[i].id === id) return RHYMES[i];
    return null;
  }
  function visibleRhymes() {
    var list = L.filterByCategory(RHYMES, state.category);
    if (state.favOnly) list = list.filter(function (r) { return state.favourites.indexOf(r.id) !== -1; });
    return L.searchRhymes(list, state.query);
  }

  function renderStatic() {
    document.documentElement.lang = state.lang === 'bn' ? 'bn' : 'en';
    $('appTitle').textContent = t('appTitle');
    $('appSubtitle').textContent = t('appSubtitle');
    $('langBtn').textContent = state.lang === 'bn' ? 'English' : '\u09ac\u09be\u0982\u09b2\u09be';
    $('search').placeholder = t('searchPlaceholder');
    $('search').value = state.query;
    $('surpriseBtn').textContent = t('surpriseMe');
    $('favOnlyBtn').textContent = t('favouritesOnly');
    $('favOnlyBtn').classList.toggle('active', state.favOnly);
    $('rhymeOfDayLabel').textContent = t('rhymeOfDay');
    $('progressText').textContent = fill(t('learnedCount'), {
      n: L.fmtCount(L.learnedCount(state.learned), state.lang),
      total: L.fmtCount(RHYMES.length, state.lang),
    });
    $('footerNote').textContent = t('footerNote');
    renderChips();
  }

  function renderChips() {
    var box = $('catChips');
    clear(box);
    var cats = ['all'].concat(L.CATEGORIES);
    cats.forEach(function (cat) {
      var b = el('button', 'chip' + (state.category === cat ? ' active' : ''));
      b.textContent = t('cat_' + cat);
      b.setAttribute('aria-pressed', state.category === cat ? 'true' : 'false');
      b.addEventListener('click', function () { state.category = cat; renderChips(); renderGrid(); });
      box.appendChild(b);
    });
  }

  function renderRhymeOfDay() {
    var today = L.rhymeOfDay(RHYMES, L.localDateStr(new Date()));
    var card = $('rhymeOfDayCard');
    clear(card);
    if (!today) { card.style.display = 'none'; return; }
    card.style.display = '';
    var emoji = el('span', 'rod-emoji', today.emoji);
    var title = el('span', 'rod-title', state.lang === 'bn' ? today.titleBn : today.titleEn);
    var first = el('span', 'rod-first', today.linesBn[0]);
    var hint = el('span', 'rod-hint', L.fmtCount(today.linesBn.length, state.lang) + ' ' + t('linesCount').replace(/^\S+\s/, ''));
    card.appendChild(emoji);
    var mid = el('span', 'rod-mid');
    mid.appendChild(title);
    mid.appendChild(first);
    card.appendChild(mid);
    card.appendChild(hint);
    card.onclick = function () { openReader(today.id); };
  }

  function renderGrid() {
    var list = visibleRhymes();
    var grid = $('rhymeGrid');
    clear(grid);
    var empty = $('emptyState');
    if (!list.length) {
      empty.textContent = state.favOnly && !state.query ? t('noFavourites') : t('noResults');
      empty.style.display = '';
      return;
    }
    empty.style.display = 'none';
    list.forEach(function (r) {
      var card = el('article', 'card');
      card.setAttribute('tabindex', '0');
      var top = el('div', 'card-top');
      top.appendChild(el('span', 'card-emoji', r.emoji));
      var fav = el('button', 'star' + (state.favourites.indexOf(r.id) !== -1 ? ' on' : ''), state.favourites.indexOf(r.id) !== -1 ? '\u2605' : '\u2606');
      fav.setAttribute('aria-label', t('favouritesOnly'));
      fav.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var res = L.toggleInList(state.favourites, r.id);
        state.favourites = res.list;
        saveState();
        renderGrid();
        renderStatic();
      });
      top.appendChild(fav);
      card.appendChild(top);
      card.appendChild(el('h3', 'card-title', state.lang === 'bn' ? r.titleBn : r.titleEn));
      card.appendChild(el('p', 'card-first', r.linesBn[0]));
      var meta = el('p', 'card-meta');
      meta.appendChild(document.createTextNode(
        (state.lang === 'bn' ? r.authorBn : r.authorEn) + ' \u00b7 ' +
        L.fmtCount(r.linesBn.length, state.lang) + ' ' +
        t('linesCount').replace(/^\S+\s/, '')
      ));
      if (state.learned.indexOf(r.id) !== -1) {
        meta.appendChild(document.createTextNode(' \u00b7 ' + t('learned')));
      }
      card.appendChild(meta);
      card.addEventListener('click', function () { openReader(r.id); });
      card.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') openReader(r.id); });
      grid.appendChild(card);
    });
  }

  function renderReader() {
    var r = rhymeById(state.currentId);
    if (!r) { showHome(); return; }
    $('readerEmoji').textContent = r.emoji;
    $('readerTitle').textContent = state.lang === 'bn' ? r.titleBn : r.titleEn;
    $('readerAuthor').textContent = state.lang === 'bn' ? r.authorBn : r.authorEn;
    $('readerSource').textContent = t('source') + ': ' + (state.lang === 'bn' ? r.sourceBn : r.sourceEn);
    var badge = $('excerptBadge');
    if (r.excerpt) { badge.textContent = t('excerptNote'); badge.style.display = ''; }
    else badge.style.display = 'none';

    var lines = $('readerLines');
    clear(lines);
    lines.className = 'lines fs-' + state.font;
    r.linesBn.forEach(function (line) { lines.appendChild(el('li', '', line)); });

    var roman = $('romanLines');
    clear(roman);
    if (state.showRoman) {
      roman.style.display = '';
      r.linesRoman.forEach(function (line) { roman.appendChild(el('li', '', line)); });
    } else roman.style.display = 'none';
    $('romanToggle').checked = state.showRoman;
    $('romanLabel').textContent = t('showRoman');

    var meaning = $('meaningText');
    meaning.textContent = state.lang === 'bn' ? r.meaningBn : r.meaningEn;
    $('meaningLabel').textContent = t('meaning');

    $('speakBtn').textContent = state.speaking ? t('stop') : t('readAloud');
    $('favBtn').textContent = (state.favourites.indexOf(r.id) !== -1 ? '\u2605 ' : '\u2606 ') + t('favouritesOnly').replace('\u2b50 ', '');
    $('learnedBtn').textContent = state.learned.indexOf(r.id) !== -1 ? t('learned') : t('markLearned');
    $('learnedBtn').classList.toggle('done', state.learned.indexOf(r.id) !== -1);
    $('printBtn').textContent = t('print');
    $('backBtn').textContent = t('back');
    $('prevBtn').textContent = t('prev');
    $('nextBtn').textContent = t('next');
    $('fontLabel').textContent = t('fontSize');
    $('fontMinus').textContent = 'A\u2212';
    $('fontPlus').textContent = 'A+';
    $('voiceNote').style.display = 'none';
  }

  function showHome() {
    state.currentId = null;
    stopSpeaking();
    $('homeView').style.display = '';
    $('readerView').style.display = 'none';
    renderStatic();
    renderRhymeOfDay();
    renderGrid();
    window.scrollTo(0, 0);
  }
  function openReader(id) {
    state.currentId = id;
    stopSpeaking();
    $('homeView').style.display = 'none';
    $('readerView').style.display = '';
    renderReader();
    window.scrollTo(0, 0);
  }

  function stopSpeaking() {
    try {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    } catch (e) { /* speech unavailable */ }
    if (state.speaking) { state.speaking = false; renderReader(); }
  }

  function speakCurrent() {
    var r = rhymeById(state.currentId);
    if (!r) return;
    if (state.speaking) { stopSpeaking(); return; }
    if (!L.isSpeechAvailable()) {
      $('voiceNote').textContent = t('voiceNote');
      $('voiceNote').style.display = '';
      return;
    }
    try {
      var text = r.linesBn.join(' ');
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'bn-BD';
      u.rate = 0.85;
      var voices = window.speechSynthesis.getVoices();
      for (var i = 0; i < voices.length; i++) {
        if (voices[i].lang && voices[i].lang.toLowerCase().indexOf('bn') === 0) {
          u.voice = voices[i];
          break;
        }
      }
      u.onend = function () { state.speaking = false; renderReader(); };
      u.onerror = function () {
        state.speaking = false;
        $('voiceNote').textContent = t('voiceNote');
        $('voiceNote').style.display = '';
        renderReader();
      };
      state.speaking = true;
      renderReader();
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) {
      state.speaking = false;
      $('voiceNote').textContent = t('voiceNote');
      $('voiceNote').style.display = '';
      renderReader();
    }
  }

  function toast(msg) {
    var n = $('toast');
    n.textContent = msg;
    n.classList.add('show');
    setTimeout(function () { n.classList.remove('show'); }, 1800);
  }

  function bind() {
    $('langBtn').addEventListener('click', function () {
      state.lang = state.lang === 'bn' ? 'en' : 'bn';
      saveState();
      showHome();
    });
    $('search').addEventListener('input', function (ev) {
      state.query = ev.target.value;
      renderGrid();
    });
    $('favOnlyBtn').addEventListener('click', function () {
      state.favOnly = !state.favOnly;
      renderStatic();
      renderGrid();
    });
    $('surpriseBtn').addEventListener('click', function () {
      var idx = Math.floor(Math.random() * RHYMES.length);
      openReader(RHYMES[idx].id);
    });
    $('backBtn').addEventListener('click', showHome);
    $('prevBtn').addEventListener('click', function () {
      openReader(L.prevRhymeId(visibleRhymes().length ? visibleRhymes() : RHYMES, state.currentId));
    });
    $('nextBtn').addEventListener('click', function () {
      openReader(L.nextRhymeId(visibleRhymes().length ? visibleRhymes() : RHYMES, state.currentId));
    });
    $('romanToggle').addEventListener('change', function (ev) {
      state.showRoman = ev.target.checked;
      saveState();
      renderReader();
    });
    $('speakBtn').addEventListener('click', speakCurrent);
    $('favBtn').addEventListener('click', function () {
      var res = L.toggleInList(state.favourites, state.currentId);
      state.favourites = res.list;
      saveState();
      renderReader();
    });
    $('learnedBtn').addEventListener('click', function () {
      var res = L.toggleInList(state.learned, state.currentId);
      state.learned = res.list;
      saveState();
      renderReader();
      toast(fill(t('learnedCount'), {
        n: L.fmtCount(L.learnedCount(state.learned), state.lang),
        total: L.fmtCount(RHYMES.length, state.lang),
      }));
    });
    $('printBtn').addEventListener('click', function () { window.print(); });
    $('fontMinus').addEventListener('click', function () {
      state.font = state.font === 'l' ? 'm' : 's';
      saveState();
      renderReader();
    });
    $('fontPlus').addEventListener('click', function () {
      state.font = state.font === 's' ? 'm' : 'l';
      saveState();
      renderReader();
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && state.currentId) showHome();
    });
  }

  loadState();
  bind();
  showHome();
})();
