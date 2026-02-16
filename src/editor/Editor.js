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
import { Decoration, keymap, ViewPlugin } from 'https://esm.sh/@codemirror/view';
import { tags as t } from 'https://esm.sh/@lezer/highlight@1.2.3';
import { basicSetup, EditorView } from 'https://esm.sh/codemirror@6.0.2';
import { glsl } from 'https://esm.sh/codemirror-lang-glsl@0.5.0';

import { EVENTS, UI } from '../utils/consts.js';

export class Editor {
  #editorView;
  #editMode;
  #soundCode;
  #visualCode;
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
    this.#soundCode = '';
    this.#visualCode = '';
    this.#isVisible = isVisible;
  }

  get mode() {
    return this.#editMode;
  }
  get isVisible() {
    return this.#isVisible;
  }

  /**
   * Get current code from the active editor
   * @returns {string}
   */
  getCurrentCode() {
    if (this.#editorView) {
      return this.#editorView.state.doc.toString();
    }
    return this.#editMode === UI.EDITOR_MODES.SOUND ? this.#soundCode : this.#visualCode;
  }

  /**
   * Get both sound and visual codes
   * Saves current editor content before returning
   * @returns {{ soundCode: string, visualCode: string }}
   */
  getAllCodes() {
    if (this.#editorView) {
      this.#saveCurrentCode();
    }
    return {
      soundCode: this.#soundCode,
      visualCode: this.#visualCode,
    };
  }

  /**
   * Set code for a specific mode
   * @param {'sound' | 'visual'} mode
   * @param {string} code
   */
  setCode(mode, code) {
    if (mode === UI.EDITOR_MODES.SOUND) {
      this.#soundCode = code;
    } else {
      this.#visualCode = code;
    }

    if (this.#editMode === mode && this.#editorView) {
      this.#editorView.dispatch({
        changes: { from: 0, to: this.#editorView.state.doc.length, insert: code },
      });
    }
  }

  /**
   * Initialize the CodeMirror editor
   */
  init() {
    this.#editorView = new EditorView({
      doc: this.getCurrentCode(),
      parent: document.getElementById('editor'),
      extensions: this.#createExtensions(),
    });

    this.#updateModeDisplay();
  }

  /**
   * Switch between sound and visual modes
   */
  switchMode() {
    const oldMode = this.#editMode;

    // Save current content
    if (this.#editorView) {
      this.#saveCurrentCode();
    }

    // Toggle mode
    this.#editMode =
      this.#editMode === UI.EDITOR_MODES.SOUND ? UI.EDITOR_MODES.VISUAL : UI.EDITOR_MODES.SOUND;

    // Load code for the new mode
    if (this.#editorView) {
      const newCode = this.#editMode === UI.EDITOR_MODES.SOUND ? this.#soundCode : this.#visualCode;
      this.#editorView.dispatch({
        changes: { from: 0, to: this.#editorView.state.doc.length, insert: newCode },
      });
    }

    this.#updateModeDisplay();
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
   * Save current editor content to the appropriate code store
   */
  #saveCurrentCode() {
    if (!this.#editorView) return;
    const code = this.#editorView.state.doc.toString();
    if (this.#editMode === UI.EDITOR_MODES.SOUND) {
      this.#soundCode = code;
    } else {
      this.#visualCode = code;
    }
  }

  /**
   * Update the edit mode indicator in the DOM
   */
  #updateModeDisplay() {
    const el = document.getElementById('editMode');
    if (!el) return;

    const isSound = this.#editMode === UI.EDITOR_MODES.SOUND;
    el.textContent = isSound ? '[Sound]' : '[Visual]';
    el.style.color = isSound ? '#51cf66' : '#ffd43b';
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
          this.#saveCurrentCode();
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
