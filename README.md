# Word Cycle Highlight

Spot every occurrence of a word in your code — and keep up to three different words in view at once.

![demo](images/demo.png)

## Why

Most highlighters only show you **one** word. This extension lets you track several: highlight `alpha`, then `beta`, then `gamma` — each word is highlighted everywhere it appears, and each new word automatically gets the **next color** from a rotating palette:

`yellow → green → blue → yellow → …`

## Features

- **Highlight whole words instantly** — add the word under the cursor with `Alt+1` (or the command palette) and every occurrence in the current file is highlighted.
- **Multi-word tracking** — highlight up to three words simultaneously; each new word takes the next color, so you can visually tell them apart at a glance.
- **Click to toggle off** — add an already-highlighted word again to remove it.
- **Optional double-click** — turning on *double-click highlight* in the Configure menu lets you toggle a word just by double-clicking it. **Off by default.**
- **Follows your edits** — highlights update live as you type or scroll, and each document keeps its own state.
- **Scrollbar overview markers** — tinted marks on the scrollbar show where the highlighted words are.
- **No JSON to edit** — colors, opacity, underline and double-click behavior are configured through a Quick Pick menu.

## Getting started

Use the commands or key bindings below to highlight the word under the cursor.

### Commands

| Command | What it does |
| --- | --- |
| `Word Highlight: Highlight Current Word` | Add the word under the cursor to the highlight cycle |
| `Word Highlight: Clear Current Word` | Remove the word under the cursor |
| `Word Highlight: Clear All` | Clear every highlight in the active file |
| `Word Highlight: Configure Colors` | Open the Quick Pick to tune colors, opacity, underline and double-click highlighting |

### Default key bindings

| Keys | Action |
| --- | --- |
| `Alt+1` | Highlight the current word |
| `Alt+2` | Clear the current word |
| `Alt+3` | Clear all highlights in the file |

All key bindings can be remapped in VS Code Keyboard Shortcuts, and every command is available from the Command Palette (`Ctrl+Shift+P`).

### Change the shortcuts

The defaults are not locked — every binding above is just a starting point you can override (extension keybindings are always user-editable in VS Code).

**Quickest way:** open **Keyboard Shortcuts** (`Ctrl+K Ctrl+S`), search for `word highlight`, click the row of the command you want, press your new combination, then confirm.

**Precise way:** run *Preferences: Open Keyboard Shortcuts (JSON)* and edit `keybindings.json`. For example, to *replace* the default `Alt+1` binding of *Highlight Current Word* with `Ctrl+Alt+H`:

```json
// 1. Add your own binding
{ "key": "ctrl+alt+h", "command": "wordCycleHighlight.cycle", "when": "editorTextFocus" },
// 2. Remove the extension's default Alt+1 binding (command prefixed with "-")
{ "key": "alt+1", "command": "-wordCycleHighlight.cycle", "when": "editorTextFocus" }
```

The three command ids you may want to rebind are `wordCycleHighlight.cycle` (default `Alt+1`), `wordCycleHighlight.clear` (default `Alt+2`) and `wordCycleHighlight.clearAll` (default `Alt+3`).

## How the colors cycle

| Highlighted word | Color | Default |
| --- | --- | --- |
| 1st word | yellow | `#FFD000` |
| 2nd word | green | `#22C55E` |
| 3rd word | blue | `#3B82F6` |

The next highlighted word wraps back to yellow. Each color is configurable, together with the highlight **opacity** (default `0.34`) and the **2px underline** under each occurrence.

> **Configuring:** run `Word Highlight: Configure Colors` and pick a color, opacity, underline or double-click highlighting in the Quick Pick. Settings are stored per-machine in VS Code global state — there is no `settings.json` entry to manage.

## Double-click highlighting

Double-clicking a word to toggle its highlight is **off by default**. To enable it:

1. Run `Word Highlight: Configure Colors` (or bind it to a key).
2. Choose **Turn double-click highlight on**.

With it on, double-clicking any identifier toggles its highlight — double-click again to remove it. Turn it off the same way if double-clicks in the editor start feeling too eager.

## What counts as a word

Words are matched as code identifiers (`letters`, `digits` and `_`, starting with a letter or `_`) and only whole-word matches are highlighted — `color` will not light up inside `backgroundColor`.

## Notes & tips

- By default, highlighting is triggered by the `Alt+1`/`Alt+2` bindings and the commands — keyboard cursor movement never triggers a highlight. Mouse double-click toggling is opt-in (see above).
- Highlights are tracked **per document**; switching files keeps each file's highlights intact.
- Long lists of highlights are also painted in the editor's overview ruler for quick navigation.

## Requirements

- VS Code `^1.74.0` or newer.

## License

[MIT](LICENSE)
