/**
 * Editor class
 * Manages CodeMirror 6 GLSL editor with sound/visual mode switching
 * Communicates state changes via EventBus
 */

import { indentWithTab } from 'https://esm.sh/@codemirror/commands';
import {
  HighlightStyle,
  indentUnit,
  syntaxHighlighting,
  syntaxTree,
} from 'https://esm.sh/@codemirror/language';
import { EditorState } from 'https://esm.sh/@codemirror/state';
import { Decoration, keymap, ViewPlugin } from 'https://esm.sh/@codemirror/view';
import { tags as t } from 'https://esm.sh/@lezer/highlight@1.2.3';
import { basicSetup, EditorView } from 'https://esm.sh/codemirror@6.0.2';
import { glsl } from 'https://esm.sh/codemirror-lang-glsl@0.5.0';

import { EVENTS, UI } from '../utils/consts.js';

export class Editor {
  #editorView;
  #editMode;
  #activeTab;
  #states; // { soundMain, soundUtils, visualMain, visualUtils } - EditorState objects
  #extensions;
  #isVisible;
  #eventBus;

  /**
   * @param {Object} options
   * @param {import('../state/EventBus.js').EventBus} options.eventBus
   * @param {string} [options.editMode='sound']
   * @param {boolean} [options.isVisible=true]
   */
  constructor({ eventBus, editMode = UI.EDITOR_MODES.SOUND, isVisible = true }) {
    this.#eventBus = eventBus;
    this.#editorView = null;
    this.#editMode = editMode;
    this.#activeTab = UI.EDITOR_TABS.MAIN;
    this.#states = {
      soundMain: null,
      soundUtils: null,
      visualMain: null,
      visualUtils: null,
    };
    this.#extensions = null;
    this.#isVisible = isVisible;
  }

  get mode() {
    return this.#editMode;
  }
  get tab() {
    return this.#activeTab;
  }
  get isVisible() {
    return this.#isVisible;
  }

  /**
   * Get current code from the active editor (current mode + tab)
   * @returns {string}
   */
  getCurrentCode() {
    if (this.#editorView) {
      return this.#editorView.state.doc.toString();
    }
    return this.#getCodeForModeAndTab(this.#editMode, this.#activeTab);
  }

  /**
   * Get code for compile (main + utils for current mode)
   * @returns {{ main: string, utils: string }}
   */
  getCodeForCompile() {
    // Sync current editor state
    this.#syncCurrentState();

    if (this.#editMode === UI.EDITOR_MODES.SOUND) {
      return {
        main: this.#getCodeFromState('soundMain'),
        utils: this.#getCodeFromState('soundUtils'),
      };
    }
    return {
      main: this.#getCodeFromState('visualMain'),
      utils: this.#getCodeFromState('visualUtils'),
    };
  }

  /**
   * Get all codes (4 states)
   * Saves current editor content before returning
   * @returns {{ soundMain: string, soundUtils: string, visualMain: string, visualUtils: string }}
   */
  getAllCodes() {
    // Sync current editor state
    this.#syncCurrentState();

    return {
      soundMain: this.#getCodeFromState('soundMain'),
      soundUtils: this.#getCodeFromState('soundUtils'),
      visualMain: this.#getCodeFromState('visualMain'),
      visualUtils: this.#getCodeFromState('visualUtils'),
    };
  }

  /**
   * Set code for a specific mode (backwards compatible - sets main)
   * @param {'sound' | 'visual'} mode
   * @param {string} code
   */
  setCode(mode, code) {
    this.setCodeForTab(mode, UI.EDITOR_TABS.MAIN, code);
  }

  /**
   * Set code for a specific mode and tab
   * @param {'sound' | 'visual'} mode
   * @param {'main' | 'utils'} tab
   * @param {string} code
   */
  setCodeForTab(mode, tab, code) {
    const stateKey = this.#getStateKey(mode, tab);

    // Create new state with fresh history
    this.#states[stateKey] = this.#createEditorState(code);

    // If this is the current tab, update the view
    if (this.#editMode === mode && this.#activeTab === tab && this.#editorView) {
      this.#editorView.setState(this.#states[stateKey]);
    }
  }

  /**
   * Set all codes at once (for loading presets)
   * @param {{ soundMain?: string, soundUtils?: string, visualMain?: string, visualUtils?: string }} codes
   */
  setAllCodes(codes) {
    // Create new states with fresh history for each provided code
    if (codes.soundMain !== undefined) {
      this.#states.soundMain = this.#createEditorState(codes.soundMain);
    }
    if (codes.soundUtils !== undefined) {
      this.#states.soundUtils = this.#createEditorState(codes.soundUtils);
    }
    if (codes.visualMain !== undefined) {
      this.#states.visualMain = this.#createEditorState(codes.visualMain);
    }
    if (codes.visualUtils !== undefined) {
      this.#states.visualUtils = this.#createEditorState(codes.visualUtils);
    }

    // Update editor view with current tab's state
    if (this.#editorView) {
      const stateKey = this.#getStateKey(this.#editMode, this.#activeTab);
      this.#editorView.setState(this.#states[stateKey]);
    }
  }

  /**
   * Initialize the CodeMirror editor
   */
  init() {
    // Initialize all 4 editor states (only if not already set)
    const keys = ['soundMain', 'soundUtils', 'visualMain', 'visualUtils'];
    for (const key of keys) {
      if (!this.#states[key]) {
        this.#states[key] = this.#createEditorState('');
      }
    }

    // Create view with current tab's state
    const currentStateKey = this.#getStateKey(this.#editMode, this.#activeTab);
    this.#editorView = new EditorView({
      state: this.#states[currentStateKey],
      parent: document.getElementById('editor'),
    });

    this.#initTabBar();
    this.#updateModeDisplay();
    this.#updateTabDisplay();
  }

  /**
   * Initialize tab bar event handlers
   */
  #initTabBar() {
    const tabBar = document.getElementById('tabBar');
    if (!tabBar) return;

    tabBar.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('.tab');
      if (!tabBtn) return;

      const tab = tabBtn.dataset.tab;
      if (tab && tab !== this.#activeTab) {
        this.switchTab(tab);
      }
    });
  }

  /**
   * Switch between main and utils tabs
   * @param {'main' | 'utils'} tab
   */
  switchTab(tab) {
    if (tab === this.#activeTab) return;

    const oldTab = this.#activeTab;

    // Sync current editor state before switching
    this.#syncCurrentState();

    // Switch tab
    this.#activeTab = tab;

    // Switch to the new tab's state (preserves its own undo history)
    if (this.#editorView) {
      const newStateKey = this.#getStateKey(this.#editMode, this.#activeTab);
      this.#editorView.setState(this.#states[newStateKey]);
    }

    this.#updateTabDisplay();
    this.#eventBus.emit(EVENTS.EDITOR_TAB_CHANGED, { old: oldTab, new: this.#activeTab });
  }

  /**
   * Switch between sound and visual modes
   */
  switchMode() {
    const oldMode = this.#editMode;

    // Sync current editor state before switching
    this.#syncCurrentState();

    // Toggle mode
    this.#editMode =
      this.#editMode === UI.EDITOR_MODES.SOUND ? UI.EDITOR_MODES.VISUAL : UI.EDITOR_MODES.SOUND;

    // Switch to the new mode's state (preserves its own undo history)
    if (this.#editorView) {
      const newStateKey = this.#getStateKey(this.#editMode, this.#activeTab);
      this.#editorView.setState(this.#states[newStateKey]);
    }

    this.#updateModeDisplay();
    this.#updateTabDisplay();
    this.#eventBus.emit(EVENTS.EDITOR_MODE_CHANGED, { old: oldMode, new: this.#editMode });
  }

  /**
   * Toggle editor visibility
   */
  toggleVisibility() {
    const container = document.querySelector('.editor-container');
    if (!container) return;

    this.#isVisible = !this.#isVisible;

    if (this.#isVisible) {
      container.classList.remove('hidden');
    } else {
      container.classList.add('hidden');
    }

    this.#eventBus.emit(EVENTS.EDITOR_VISIBILITY_CHANGED, { isVisible: this.#isVisible });
  }

  /**
   * Sync current editor view state to the states map
   */
  #syncCurrentState() {
    if (!this.#editorView) return;
    const stateKey = this.#getStateKey(this.#editMode, this.#activeTab);
    this.#states[stateKey] = this.#editorView.state;
  }

  /**
   * Get state key for a specific mode and tab
   * @param {'sound' | 'visual'} mode
   * @param {'main' | 'utils'} tab
   * @returns {'soundMain' | 'soundUtils' | 'visualMain' | 'visualUtils'}
   */
  #getStateKey(mode, tab) {
    const modePrefix = mode === UI.EDITOR_MODES.SOUND ? 'sound' : 'visual';
    const tabSuffix = tab === UI.EDITOR_TABS.MAIN ? 'Main' : 'Utils';
    return `${modePrefix}${tabSuffix}`;
  }

  /**
   * Get code from a specific state
   * @param {'soundMain' | 'soundUtils' | 'visualMain' | 'visualUtils'} stateKey
   * @returns {string}
   */
  #getCodeFromState(stateKey) {
    const state = this.#states[stateKey];
    return state ? state.doc.toString() : '';
  }

  /**
   * Get code for a specific mode and tab
   * @param {'sound' | 'visual'} mode
   * @param {'main' | 'utils'} tab
   * @returns {string}
   */
  #getCodeForModeAndTab(mode, tab) {
    const stateKey = this.#getStateKey(mode, tab);
    return this.#getCodeFromState(stateKey);
  }

  /**
   * Get or create extensions (lazy initialization)
   * @returns {Extension[]}
   */
  #getExtensions() {
    if (!this.#extensions) {
      this.#extensions = this.#createExtensions();
    }
    return this.#extensions;
  }

  /**
   * Create a new EditorState with the given code
   * @param {string} code
   * @returns {EditorState}
   */
  #createEditorState(code) {
    return EditorState.create({
      doc: code,
      extensions: this.#getExtensions(),
    });
  }

  /**
   * Update the edit mode indicator in the DOM
   */
  #updateModeDisplay() {
    const el = document.getElementById('editMode');
    if (el) {
      const isSound = this.#editMode === UI.EDITOR_MODES.SOUND;
      el.textContent = isSound ? '[Sound]' : '[Visual]';
      el.style.color = isSound ? '#51cf66' : '#ffd43b';
    }

    // Update tab bar mode class and main tab label
    const tabBar = document.getElementById('tabBar');
    if (tabBar) {
      tabBar.classList.remove('sound', 'visual');
      tabBar.classList.add(this.#editMode);
    }

    const tabMain = document.getElementById('tabMain');
    if (tabMain) {
      tabMain.textContent = this.#editMode;
    }
  }

  /**
   * Update tab bar active state
   */
  #updateTabDisplay() {
    const tabBar = document.getElementById('tabBar');
    if (!tabBar) return;

    const tabs = tabBar.querySelectorAll('.tab');
    for (const tab of tabs) {
      if (tab.dataset.tab === this.#activeTab) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    }
  }

  /**
   * Create GLSL built-in function set for highlighting
   * @returns {Set<string>}
   */
  #createGlslBuiltins() {
    return new Set([
      'abs',
      'acos',
      'acosh',
      'asin',
      'asinh',
      'atan',
      'atanh',
      'ceil',
      'clamp',
      'cos',
      'cosh',
      'cross',
      'degrees',
      'dFdx',
      'dFdy',
      'distance',
      'dot',
      'equal',
      'exp',
      'exp2',
      'floor',
      'fract',
      'fwidth',
      'gl_FragCoord',
      'gl_FragColor',
      'gl_Position',
      'gl_PointCoord',
      'gl_VertexID',
      'greaterThan',
      'greaterThanEqual',
      'max',
      'min',
      'mix',
      'mod',
      'pow',
      'reflect',
      'sin',
      'sign',
      'step',
      'smoothstep',
      'tan',
      'sqrt',
      'texture',
      'normalize',
    ]);
  }

  /**
   * Create function highlighter ViewPlugin
   * @param {Set<string>} builtins
   * @returns {ViewPlugin}
   */
  #createFunctionHighlighter(builtins) {
    const builtinDeco = Decoration.mark({ class: 'cm-builtinFunc' });
    const userDeco = Decoration.mark({ class: 'cm-userFunc' });

    return ViewPlugin.fromClass(
      class {
        decorations;
        constructor(view) {
          this.decorations = this.build(view);
        }
        update(update) {
          if (update.docChanged || update.viewportChanged) {
            this.decorations = this.build(update.view);
          }
        }
        build(view) {
          const decos = [];
          const tree = syntaxTree(view.state);
          tree.iterate({
            enter: (node) => {
              if (node.name === 'Identifier') {
                const fullNode = tree.resolveInner(node.from, 1);
                if (fullNode.parent?.name === 'CallExpression') {
                  const name = view.state.doc.sliceString(node.from, node.to);
                  decos.push(
                    (builtins.has(name) ? builtinDeco : userDeco).range(node.from, node.to),
                  );
                }
              }
            },
          });
          return Decoration.set(decos);
        }
      },
      { decorations: (v) => v.decorations },
    );
  }

  /**
   * Create GLSL syntax highlight style
   * @returns {HighlightStyle}
   */
  #createHighlightStyle() {
    return HighlightStyle.define([
      { tag: t.standard(t.typeName), color: '#a68cee' },
      { tag: t.controlKeyword, color: '#cdcb99' },
      { tag: t.processingInstruction, color: '#cdcb99' },
      { tag: t.definitionKeyword, color: '#deb492' },
      { tag: t.brace, color: '#cdcdcd' },
      { tag: t.strong, color: '#cdcdcd' },
      { tag: t.variableName, color: '#fff' },
      { tag: t.number, color: '#d19a66' },
      { tag: t.comment, color: '#5c6370', fontStyle: 'italic' },
    ]);
  }

  /**
   * Create dark editor theme
   * @returns {Extension}
   */
  #createDarkTheme() {
    return EditorView.theme(
      {
        '&': { color: '#f8f8f2', backgroundColor: 'rgb(0,0,0,.3)' },
        '.cm-content': {
          fontFamily: 'Monaco, Consolas, monospace',
          fontSize: '13px',
          lineHeight: '1.5',
        },
        '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
        },
        '& .cm-selectionBackground': { background: 'rgba(255, 255, 255, 0.15)' },
        '&.cm-focused .cm-cursor': { borderLeftColor: '#61afef' },
        '.cm-line': { padding: '0 4px' },
        '.cm-cursor': { borderLeftColor: '#f8f8f2' },
        '.cm-activeLine': { backgroundColor: 'none' },
        '.cm-gutters': {
          backgroundColor: '#1e1e1e',
          color: '#858585',
          border: 'none',
        },
        '.cm-activeLineGutter': { backgroundColor: '#2a2a2a' },
        '.cm-foldGutter span': { padding: '0 4px', fontSize: '1rem', lineHeight: '1' },
        '.cm-builtinFunc span': { color: '#A3CEF1' },
        '.cm-userFunc span': { color: '#72e2bd' },
      },
      { dark: true },
    );
  }

  /**
   * Create all editor extensions
   * @returns {Extension[]}
   */
  #createExtensions() {
    const builtins = this.#createGlslBuiltins();

    return [
      basicSetup,
      glsl(),
      syntaxHighlighting(this.#createHighlightStyle()),
      indentUnit.of('  '),
      keymap.of([indentWithTab]),
      this.#createDarkTheme(),
      this.#createFunctionHighlighter(builtins),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          this.#syncCurrentState();
        }
      }),
    ];
  }

  /**
   * Destroy the editor instance
   */
  destroy() {
    if (this.#editorView) {
      this.#editorView.destroy();
      this.#editorView = null;
    }
  }
}
