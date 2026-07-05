const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const html = read('index.html');
const mainJs = read('main.js');

function createElement() {
  const attrs = {};
  return {
    hidden: false,
    innerHTML: '',
    classList: {
      values: new Set(),
      toggle(name, enabled) {
        if (enabled) this.values.add(name);
        else this.values.delete(name);
      },
      contains(name) {
        return this.values.has(name);
      },
      add(name) {
        this.values.add(name);
      },
      remove(name) {
        this.values.delete(name);
      }
    },
    setAttribute(name, value) {
      attrs[name] = value;
    },
    getAttribute(name) {
      return attrs[name] || '';
    },
    addEventListener() {},
    querySelectorAll() {
      return [];
    }
  };
}

function loadMain(mode) {
  const elements = {
    'lang-en': createElement(),
    'lang-zh': createElement()
  };
  const toggle = createElement();
  const storage = { lang: 'zh' };
  const source = mainJs.replace(
    /const SITE_LANGUAGE_MODE\s*=\s*'en';/,
    `const SITE_LANGUAGE_MODE = '${mode}';`
  );
  const context = {
    console,
    fetch: async () => ({ json: async () => ({}) }),
    localStorage: {
      getItem(key) {
        return storage[key] || null;
      },
      setItem(key, value) {
        storage[key] = value;
      },
      removeItem(key) {
        delete storage[key];
      }
    },
    document: {
      documentElement: { lang: '' },
      body: { style: {} },
      addEventListener() {},
      getElementById(id) {
        return elements[id] || null;
      },
      querySelector(selector) {
        return selector === '.lang-toggle' ? toggle : null;
      },
      querySelectorAll() {
        return [];
      }
    },
    window: { innerWidth: 1024 },
    IntersectionObserver: function IntersectionObserver() {
      this.observe = () => {};
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context);
  return { context, storage, toggle, elements };
}

assert.match(
  mainJs,
  /const SITE_LANGUAGE_MODE\s*=\s*'en';/,
  'site language mode should default to English-only'
);

assert.match(
  mainJs,
  /const SUPPORTED_LANGUAGE_MODES\s*=\s*\[\s*'en'\s*,\s*'zh'\s*,\s*'both'\s*\];/,
  'site language mode should explicitly support en, zh, and both'
);

assert.match(
  mainJs,
  /function resolveLanguageMode\(\)/,
  'language mode should be resolved through a single helper'
);

assert.match(
  html,
  /<div class="lang-toggle" hidden>/,
  'language switcher should be hidden in the default English-only markup'
);

assert.doesNotMatch(html, /github\.com\/wwn1233/i, 'GitHub profile links should be removed');
assert.doesNotMatch(html, /aria-label="GitHub"/i, 'GitHub social icon should be removed');
assert.doesNotMatch(html, />github\.com\/wwn1233</i, 'GitHub contact row should be removed');

async function runBehaviorTests() {
  {
  const { context, storage, toggle, elements } = loadMain('en');
  assert.equal(context.resolveLanguageMode(), 'en');
  assert.equal(context.initLangToggle(), 'en');
  context.updateLanguageToggle('en');
  assert.equal(toggle.hidden, true);
  assert.equal(elements['lang-en'].classList.contains('active'), true);
  assert.equal(elements['lang-zh'].classList.contains('active'), false);
  await context.switchLang('zh');
  assert.equal(context.document.documentElement.lang, 'en');
  assert.equal(storage.lang, undefined);
  }

  {
  const { context, toggle, elements } = loadMain('zh');
  assert.equal(context.resolveLanguageMode(), 'zh');
  assert.equal(context.initLangToggle(), 'zh');
  context.updateLanguageToggle('zh');
  assert.equal(toggle.hidden, true);
  assert.equal(elements['lang-en'].classList.contains('active'), false);
  assert.equal(elements['lang-zh'].classList.contains('active'), true);
  }

  {
  const { context, storage, toggle, elements } = loadMain('both');
  assert.equal(context.resolveLanguageMode(), 'both');
  assert.equal(context.initLangToggle(), 'zh');
  context.updateLanguageToggle('zh');
  assert.equal(toggle.hidden, false);
  assert.equal(elements['lang-en'].classList.contains('active'), false);
  assert.equal(elements['lang-zh'].classList.contains('active'), true);
  await context.switchLang('en');
  assert.equal(context.document.documentElement.lang, 'en');
  assert.equal(storage.lang, 'en');
  }
}

for (const file of ['i18n/en.json', 'i18n/zh.json', 'data/papers.json', 'data/experience.json']) {
  JSON.parse(read(file));
}

runBehaviorTests()
  .then(() => {
    console.log('site config tests passed');
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
