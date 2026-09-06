const vscode = require('vscode');

const WORD_RE = /[A-Za-z_][A-Za-z0-9_]*/;
const DEFAULTS = {
  color1: '#FFD000',
  color2: '#22C55E',
  color3: '#3B82F6',
  opacity: 0.34,
  showUnderline: true,
  mouseToggle: false
};
const STATE_KEY = 'wordCycleHighlight.settings';

/** @type {vscode.ExtensionContext | undefined} */
let extensionContext;
/** @type {vscode.TextEditorDecorationType[]} */
let decorationTypes = [];
/** @type {Map<string, Map<string, number>>} */
const highlighted = new Map();
/** @type {Map<string, number>} */
const nextColor = new Map();

let lastToggleWord = '';
let lastToggleAt = 0;
let rebuilding = false;
let visibleTimer;

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function uriKey(doc) {
  return doc.uri.toString();
}

function parseColor(input) {
  const raw = String(input || '').trim();
  let hex = raw.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((ch) => ch + ch).join('');
  }
  if (hex.length === 8 && /^[0-9a-fA-F]{8}$/.test(hex)) {
    hex = hex.slice(0, 6);
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return null;
  }
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16)
  };
}

function toRgba(color, alpha) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

function toHex(color) {
  const ch = (n) => n.toString(16).padStart(2, '0');
  return `#${ch(color.r)}${ch(color.g)}${ch(color.b)}`;
}

function loadSettings() {
  const saved = extensionContext ? extensionContext.globalState.get(STATE_KEY) : undefined;
  return {
    color1: saved && saved.color1 ? saved.color1 : DEFAULTS.color1,
    color2: saved && saved.color2 ? saved.color2 : DEFAULTS.color2,
    color3: saved && saved.color3 ? saved.color3 : DEFAULTS.color3,
    opacity: saved && Number.isFinite(saved.opacity) ? saved.opacity : DEFAULTS.opacity,
    showUnderline: saved && typeof saved.showUnderline === 'boolean' ? saved.showUnderline : DEFAULTS.showUnderline,
    mouseToggle: saved && typeof saved.mouseToggle === 'boolean' ? saved.mouseToggle : DEFAULTS.mouseToggle
  };
}

async function saveSettings(next) {
  if (!extensionContext) {
    return;
  }
  await extensionContext.globalState.update(STATE_KEY, next);
}

function loadPalette() {
  const settings = loadSettings();
  const opacity = Math.min(1, Math.max(0.05, Number(settings.opacity) || DEFAULTS.opacity));
  const colors = [settings.color1, settings.color2, settings.color3];
  const palette = [];
  for (const item of colors) {
    const parsed = parseColor(item);
    if (!parsed) {
      continue;
    }
    palette.push({
      bg: toRgba(parsed, opacity),
      underline: toHex(parsed),
      overview: toHex(parsed),
      showUnderline: settings.showUnderline !== false
    });
  }
  if (palette.length > 0) {
    return palette;
  }
  return [DEFAULTS.color1, DEFAULTS.color2, DEFAULTS.color3].map((hex) => {
    const parsed = parseColor(hex);
    return {
      bg: toRgba(parsed, opacity),
      underline: hex,
      overview: hex,
      showUnderline: settings.showUnderline !== false
    };
  });
}

function colorCount() {
  return Math.max(decorationTypes.length, 1);
}

function wordAt(document, position) {
  const range = document.getWordRangeAtPosition(position, WORD_RE);
  if (!range) {
    return null;
  }
  return { word: document.getText(range), range };
}

function wordMap(doc) {
  const key = uriKey(doc);
  if (!highlighted.has(key)) {
    highlighted.set(key, new Map());
  }
  return highlighted.get(key);
}

function findRanges(document, word) {
  const ranges = [];
  const text = document.getText();
  const re = new RegExp('\\b' + escapeRegExp(word) + '\\b', 'g');
  let match;
  while ((match = re.exec(text))) {
    ranges.push(new vscode.Range(
      document.positionAt(match.index),
      document.positionAt(match.index + word.length)
    ));
  }
  return ranges;
}

function applyDocument(document) {
  if (!document || decorationTypes.length === 0) {
    return;
  }
  const words = highlighted.get(uriKey(document)) || new Map();
  const rangesByColor = decorationTypes.map(() => []);
  for (const [word, color] of words) {
    rangesByColor[color % decorationTypes.length].push(...findRanges(document, word));
  }
  for (const editor of vscode.window.visibleTextEditors) {
    if (editor.document.uri.toString() !== document.uri.toString()) {
      continue;
    }
    decorationTypes.forEach((type, i) => editor.setDecorations(type, rangesByColor[i]));
  }
}

function applyAllVisible() {
  const seen = new Set();
  for (const editor of vscode.window.visibleTextEditors) {
    const key = uriKey(editor.document);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    applyDocument(editor.document);
  }
}

function rebuildDecorations() {
  if (rebuilding) {
    return;
  }
  rebuilding = true;
  try {
    for (const type of decorationTypes) {
      type.dispose();
    }
    decorationTypes = loadPalette().map((color) => {
      const options = {
        backgroundColor: color.bg,
        overviewRulerColor: color.overview,
        overviewRulerLane: vscode.OverviewRulerLane.Center
      };
      if (color.showUnderline) {
        options.textDecoration = `underline 2px solid ${color.underline}`;
      }
      return vscode.window.createTextEditorDecorationType(options);
    });
    applyAllVisible();
  } finally {
    rebuilding = false;
  }
}

async function configureSettings() {
  const settings = loadSettings();
  const pick = await vscode.window.showQuickPick(
    [
      { label: 'Color 1', description: settings.color1, key: 'color1' },
      { label: 'Color 2', description: settings.color2, key: 'color2' },
      { label: 'Color 3', description: settings.color3, key: 'color3' },
      { label: 'Opacity', description: String(settings.opacity), key: 'opacity' },
      {
        label: settings.showUnderline ? 'Turn underline off' : 'Turn underline on',
        key: 'showUnderline'
      },
      {
        label: settings.mouseToggle ? 'Turn double-click highlight off' : 'Turn double-click highlight on',
        key: 'mouseToggle',
        description: settings.mouseToggle ? 'enabled' : 'disabled'
      }
    ],
    { placeHolder: 'Word highlight settings' }
  );
  if (!pick) {
    return;
  }

  if (pick.key === 'mouseToggle') {
    settings.mouseToggle = !settings.mouseToggle;
    await saveSettings(settings);
    return;
  }

  if (pick.key === 'showUnderline') {
    settings.showUnderline = !settings.showUnderline;
    await saveSettings(settings);
    rebuildDecorations();
    return;
  }

  if (pick.key === 'opacity') {
    const value = await vscode.window.showInputBox({
      prompt: 'Opacity from 0.05 to 1. Lower is easier to read.',
      value: String(settings.opacity)
    });
    if (value === undefined) {
      return;
    }
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0.05 || n > 1) {
      vscode.window.showErrorMessage('Opacity must be a number from 0.05 to 1');
      return;
    }
    settings.opacity = n;
    await saveSettings(settings);
    rebuildDecorations();
    return;
  }

  const value = await vscode.window.showInputBox({
    prompt: 'Hex color, for example #FFD000',
    value: settings[pick.key]
  });
  if (value === undefined) {
    return;
  }
  const parsed = parseColor(value);
  if (!parsed) {
    vscode.window.showErrorMessage('Use hex like #FFD000');
    return;
  }
  settings[pick.key] = toHex(parsed);
  await saveSettings(settings);
  rebuildDecorations();
}

function assignNextColor(document) {
  const key = uriKey(document);
  const index = nextColor.get(key) ?? 0;
  nextColor.set(key, (index + 1) % colorCount());
  return index % colorCount();
}

function addWord(document, word) {
  const words = wordMap(document);
  if (words.has(word)) {
    return;
  }
  words.set(word, assignNextColor(document));
  applyDocument(document);
}

function toggleWord(document, word) {
  const words = wordMap(document);
  if (words.has(word)) {
    clearWord(document, word);
    return;
  }
  addWord(document, word);
}

function clearWord(document, word) {
  const key = uriKey(document);
  const words = highlighted.get(key);
  if (!words || !words.has(word)) {
    return;
  }
  words.delete(word);
  if (words.size === 0) {
    highlighted.delete(key);
    nextColor.delete(key);
  }
  applyDocument(document);
}

function currentWord(editor) {
  if (!editor) {
    return null;
  }
  const info = wordAt(editor.document, editor.selection.active);
  if (info) {
    return info.word;
  }
  if (!editor.selection.isEmpty) {
    const selected = editor.document.getText(editor.selection);
    const match = selected.match(WORD_RE);
    if (match && match[0] === selected) {
      return selected;
    }
  }
  return null;
}

function onSelectionChange(event) {
  if (!loadSettings().mouseToggle) {
    return;
  }
  if (event.kind !== vscode.TextEditorSelectionChangeKind.Mouse) {
    return;
  }
  const editor = event.textEditor;
  const sel = event.selections[0];
  if (!sel || sel.isEmpty) {
    return;
  }
  const info = wordAt(editor.document, sel.start);
  if (!info) {
    return;
  }
  if (!info.range.start.isEqual(sel.start) || !info.range.end.isEqual(sel.end)) {
    return;
  }

  const now = Date.now();
  if (info.word === lastToggleWord && now - lastToggleAt < 400) {
    return;
  }
  lastToggleWord = info.word;
  lastToggleAt = now;
  toggleWord(editor.document, info.word);
}

function activate(context) {
  extensionContext = context;
  rebuildDecorations();
  context.subscriptions.push({
    dispose: () => {
      for (const type of decorationTypes) {
        type.dispose();
      }
      decorationTypes = [];
    }
  });

  context.subscriptions.push(
    vscode.commands.registerCommand('wordCycleHighlight.cycle', () => {
      const editor = vscode.window.activeTextEditor;
      const word = currentWord(editor);
      if (editor && word) {
        addWord(editor.document, word);
      }
    }),
    vscode.commands.registerCommand('wordCycleHighlight.clear', () => {
      const editor = vscode.window.activeTextEditor;
      const word = currentWord(editor);
      if (editor && word) {
        clearWord(editor.document, word);
      }
    }),
    vscode.commands.registerCommand('wordCycleHighlight.openSettings', () => configureSettings()),
    vscode.commands.registerCommand('wordCycleHighlight.clearAll', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }
      const key = uriKey(editor.document);
      highlighted.delete(key);
      nextColor.delete(key);
      applyDocument(editor.document);
    }),
    vscode.window.onDidChangeTextEditorSelection(onSelectionChange),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && highlighted.has(uriKey(editor.document))) {
        applyDocument(editor.document);
      }
    }),
    vscode.window.onDidChangeVisibleTextEditors(() => {
      if (highlighted.size === 0) {
        return;
      }
      clearTimeout(visibleTimer);
      visibleTimer = setTimeout(() => applyAllVisible(), 100);
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (highlighted.has(event.document.uri.toString())) {
        applyDocument(event.document);
      }
    }),
    vscode.workspace.onDidCloseTextDocument((doc) => {
      const key = uriKey(doc);
      highlighted.delete(key);
      nextColor.delete(key);
    })
  );
}

function deactivate() {
  clearTimeout(visibleTimer);
  highlighted.clear();
  nextColor.clear();
}

module.exports = { activate, deactivate };
