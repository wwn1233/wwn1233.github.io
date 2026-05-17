/* ============================================================
   main.js — Personal Homepage
   ============================================================ */

/* ----------------------------------------------------------
   1. Papers Renderer
   ---------------------------------------------------------- */

/**
 * Render a single paper card.
 */
function renderPaperCard(paper) {
  const titleHtml = paper.url
    ? `<a href="${paper.url}" target="_blank" rel="noopener">${paper.title}</a>`
    : paper.title;

  // Apply .me class to the highlighted author markup
  const authorsHtml = paper.authors
    ? paper.authors.replace(/<strong>(.*?)<\/strong>/g, '<strong class="me">$1</strong>')
    : '';

  return `
    <div class="paper-card">
      <div class="paper-title">${titleHtml}</div>
      ${authorsHtml ? `<div class="paper-authors">${authorsHtml}</div>` : ''}
      <div class="paper-meta">
        <span class="paper-venue">${paper.venue}</span>
        <span class="paper-year">${paper.year}</span>
      </div>
    </div>`;
}

/**
 * Render all paper categories into #papers-container.
 */
async function renderPapers() {
  const container = document.getElementById('papers-container');
  if (!container) return;

  try {
    const res = await fetch('data/papers.json');
    const data = await res.json();

    const html = data.categories.map(cat => `
      <div class="papers-category">
        <div class="category-label">${cat.label}</div>
        ${cat.papers.map(renderPaperCard).join('')}
      </div>`).join('');

    container.innerHTML = html;
  } catch (err) {
    console.error('[Papers] Failed to load papers.json:', err);
    container.innerHTML = '<p style="color:var(--text-muted)">Failed to load papers.</p>';
  }
}

/* ----------------------------------------------------------
   2. Experience Renderer  (added in Task 3)
   ---------------------------------------------------------- */

/**
 * Return the current UI language ('en' or 'zh').
 */
function getCurrentLang() {
  return document.documentElement.lang === 'zh' ? 'zh' : 'en';
}

/**
 * Render all experience items into #experience-container.
 */
async function renderExperience() {
  const container = document.getElementById('experience-container');
  if (!container) return;

  try {
    const res = await fetch('data/experience.json');
    const data = await res.json();
    const lang = getCurrentLang();

    const html = `<div class="timeline">${data.experiences.map(exp => {
      const t = exp[lang];

      const awardsHtml = (t.awards || []).map(a =>
        `<span class="timeline-award">${a}</span>`).join('');

      const tagsHtml = (t.tags || []).map(tag =>
        `<span class="timeline-tag">${tag}</span>`).join('');

      return `
        <div class="timeline-item">
          <div class="timeline-period">${exp.period}</div>
          <div class="timeline-body">
            <div class="timeline-company">${t.company}</div>
            <div class="timeline-role">${t.role}</div>
            ${awardsHtml}
            ${tagsHtml ? `<div class="timeline-tags">${tagsHtml}</div>` : ''}
          </div>
        </div>`;
    }).join('')}</div>`;

    container.innerHTML = html;
  } catch (err) {
    console.error('[Experience] Failed to load experience.json:', err);
    container.innerHTML = '<p style="color:var(--text-muted)">Failed to load experience.</p>';
  }
}

/* ----------------------------------------------------------
   3. i18n Engine  (added in Task 4)
   ---------------------------------------------------------- */

/** Loaded translation bundles keyed by lang code */
const i18nCache = {};

/**
 * Load and cache a translation bundle.
 */
async function loadI18n(lang) {
  if (i18nCache[lang]) return i18nCache[lang];
  try {
    const res = await fetch(`i18n/${lang}.json`);
    const data = await res.json();
    i18nCache[lang] = data;
    return data;
  } catch (err) {
    console.error(`[i18n] Failed to load ${lang}.json:`, err);
    return {};
  }
}

/**
 * Resolve a dot-separated key like "sidebar.name" from a flat or nested object.
 */
function resolveKey(obj, key) {
  return key.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : null), obj);
}

/**
 * Apply the loaded translation bundle to all [data-i18n] elements.
 */
function applyI18n(bundle) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const value = resolveKey(bundle, key);
    if (value !== null) {
      el.innerHTML = value;
    }
  });
}

/**
 * Switch the UI language, re-render dynamic sections, and persist preference.
 */
async function switchLang(lang) {
  document.documentElement.lang = lang;

  // Update toggle buttons
  document.getElementById('lang-en').classList.toggle('active', lang === 'en');
  document.getElementById('lang-zh').classList.toggle('active', lang === 'zh');

  // Load and apply translations
  const bundle = await loadI18n(lang);
  applyI18n(bundle);

  // Re-render dynamic content in the new language
  await renderExperience();

  // Persist
  try { localStorage.setItem('lang', lang); } catch (_) {}
}

/**
 * Initialise the lang toggle from stored preference or browser lang.
 */
function initLangToggle() {
  let lang = 'en';
  try {
    const stored = localStorage.getItem('lang');
    if (stored === 'en' || stored === 'zh') lang = stored;
  } catch (_) {}
  return lang;
}

/* ----------------------------------------------------------
   4. Mobile Nav Toggle
   ---------------------------------------------------------- */
function initMobileNav() {
  const toggle = document.getElementById('nav-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');

  if (!toggle || !sidebar || !overlay) return;

  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', () => {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });

  overlay.addEventListener('click', closeSidebar);

  // Close sidebar when a nav link is clicked on mobile
  sidebar.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 767) closeSidebar();
    });
  });
}

/* ----------------------------------------------------------
   5. Active Nav Link on Scroll
   ---------------------------------------------------------- */
function initScrollSpy() {
  const sections = document.querySelectorAll('.section[id]');
  const navLinks = document.querySelectorAll('.sidebar-nav a[href^="#"]');

  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
        });
      }
    });
  }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });

  sections.forEach(sec => observer.observe(sec));
}

/* ----------------------------------------------------------
   6. Init
   ---------------------------------------------------------- */
async function init() {
  const lang = initLangToggle();
  document.documentElement.lang = lang;

  // Update toggle button state immediately
  document.getElementById('lang-en').classList.toggle('active', lang === 'en');
  document.getElementById('lang-zh').classList.toggle('active', lang === 'zh');

  // Load translations (for non-default lang or always to populate dynamic keys)
  const bundle = await loadI18n(lang);
  applyI18n(bundle);

  // Render dynamic sections
  await Promise.all([renderPapers(), renderExperience()]);

  // UI behaviour
  initMobileNav();
  initScrollSpy();
}

document.addEventListener('DOMContentLoaded', init);
