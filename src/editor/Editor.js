import { basicSetup, EditorView } from "https://esm.sh/codemirror@6.0.2";
import { keymap, ViewPlugin, Decoration } from "https://esm.sh/@codemirror/view";
import { indentWithTab } from "https://esm.sh/@codemirror/commands";
import { indentUnit, syntaxHighlighting, HighlightStyle, syntaxTree } from "https://esm.sh/@codemirror/language";
import { glsl } from "https://esm.sh/codemirror-lang-glsl@0.5.0";
import { tags as t } from "https://esm.sh/@lezer/highlight@1.2.3";

/**
 * Editor Module - Handles code editing functionality
 * Manages editor initialization, mode switching, and code management
 */
export class Editor {
  constructor(options = {}) {
    this.editMode = options.editMode || 'sound';
    this.currentSoundCode = options.currentSoundCode || '';
    this.currentVisualCode = options.currentVisualCode || '';
    this.isEditorVisible = options.isEditorVisible !== false;
    this.editorView = null;

    // Callbacks for communication with main system
    this.onCodeChange = options.onCodeChange || (() => {});
    this.onModeSwitch = options.onModeSwitch || (() => {});
    this.onVisibilityToggle = options.onVisibilityToggle || (() => {});
  }

  /**
   * GLSL組み込み関数のセットを作成
   */
  #createGlslBuiltins() {
    return new Set([
      "abs", "acos", "acosh", "asin", "asinh", "atan", "atanh",
      "ceil", "clamp", "cos", "cosh", "cross",
      "degrees", "dFdx", "dFdy", "distance", "dot",
      "equal", "exp", "exp2",
      "floor", "fract", "fwidth",
      "gl_FragCoord", "gl_FragColor", "gl_Position", "gl_PointCoord", "gl_VertexID",
      "greaterThan", "greaterThanEqual",
      "max", "min", "mix", "mod",
      "pow", "reflect", "sin", "sign", "step", "smoothstep", "tan", "sqrt",
      "texture", "normalize",
    ]);
  }

  /**
   * 関数ハイライト用ViewPluginを作成
   * @param {Set<string>} builtins - 組み込み関数のセット
   */
  #createFunctionHighlighter(builtins) {
    const builtinDeco = Decoration.mark({ class: "cm-builtinFunc" });
    const userDeco = Decoration.mark({ class: "cm-userFunc" });

    return ViewPlugin.fromClass(class {
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
        let decos = [];
        const tree = syntaxTree(view.state);
        tree.iterate({
          enter: node => {
            if (node.name === "Identifier") {
              const { from } = node;
              const fullNode = tree.resolveInner(from, 1);
              const parent = fullNode.parent;
              if (parent?.name === "CallExpression") {
                const name = view.state.doc.sliceString(node.from, node.to);
                const deco = builtins.has(name) ? builtinDeco : userDeco;
                decos.push(deco.range(node.from, node.to));
              }
            }
          }
        });
        return Decoration.set(decos);
      }
    }, {
      decorations: v => v.decorations
    });
  }

  /**
   * GLSLシンタックスハイライトスタイルを作成
   */
  #createHighlightStyle() {
    return HighlightStyle.define([
      { tag: t.standard(t.typeName), color: "#a68cee" },           // Types (vec3, mat4, float, int)
      { tag: t.controlKeyword, color: "#cdcb99" },                 // void, if, return
      { tag: t.processingInstruction, color: "#cdcb99" },          // #define, #include
      { tag: t.definitionKeyword, color: "#deb492" },              // struct
      { tag: t.brace, color: "#cdcdcd" },                          // { }
      { tag: t.strong, color: "#cdcdcd" },                         // ( )
      { tag: t.variableName, color: "#fff" },                      // variable names
      { tag: t.number, color: "#d19a66" },                         // numbers
      { tag: t.comment, color: "#5c6370", fontStyle: "italic" },   // comments
    ]);
  }

  /**
   * ダークテーマを作成
   */
  #createDarkTheme() {
    return EditorView.theme(
      {
        '&': { color: '#f8f8f2', backgroundColor: 'rgb(0,0,0,.3)' },
        '.cm-content': {
          fontFamily: 'Monaco, Consolas, monospace',
          fontSize: '14px',
          lineHeight: '1.5',
        },
        "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {
          backgroundColor: "rgba(255, 255, 255, 0.15)",
        },
        "& .cm-selectionBackground": { background: "rgba(255, 255, 255, 0.15)" },
        "&.cm-focused .cm-cursor": { borderLeftColor: "#61afef" },
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
        '.cm-builtinFunc span': { color: '#A3CEF1' },    // Built-in functions
        '.cm-userFunc span': { color: '#72e2bd' },       // User-defined functions
      },
      { dark: true },
    );
  }

  /**
   * エディタ拡張機能をまとめて作成
   */
  #createEditorExtensions() {
    const builtins = this.#createGlslBuiltins();
    const fnHighlighter = this.#createFunctionHighlighter(builtins);
    const highlightStyle = this.#createHighlightStyle();
    const darkTheme = this.#createDarkTheme();

    return [
      basicSetup,
      glsl(),
      syntaxHighlighting(highlightStyle),
      indentUnit.of("  "),
      keymap.of([indentWithTab]),
      darkTheme,
      fnHighlighter,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newCode = update.state.doc.toString();
          this.updateCode(newCode);
          this.onCodeChange(this.editMode, newCode);
        }
      }),
    ];
  }

  /**
   * Initialize the CodeMirror editor with dark theme
   */
  initEditor() {
    this.editorView = new EditorView({
      doc: this.getCurrentEditCode(),
      parent: document.getElementById('editor'),
      extensions: this.#createEditorExtensions(),
    });

    this.updateEditModeDisplay();
  }

  /**
   * Get the current code based on edit mode
   */
  getCurrentEditCode() {
    if (this.editorView) {
      return this.editorView.state.doc.toString();
    }

    return this.editMode === 'sound'
      ? this.currentSoundCode
      : this.currentVisualCode;
  }

  /**
   * Update the code for the current edit mode
   */
  updateCode(code) {
    if (this.editMode === 'sound') {
      this.currentSoundCode = code;
    } else {
      this.currentVisualCode = code;
    }
  }

  /**
   * Set code for a specific mode
   */
  setCode(mode, code) {
    if (mode === 'sound') {
      this.currentSoundCode = code;
    } else {
      this.currentVisualCode = code;
    }

    // If we're currently in this mode, update the editor
    if (this.editMode === mode && this.editorView) {
      this.editorView.dispatch({
        changes: {
          from: 0,
          to: this.editorView.state.doc.length,
          insert: code,
        },
      });
    }
  }

  /**
   * Update the edit mode display in the status line
   */
  updateEditModeDisplay() {
    const editModeElement = document.getElementById('editMode');
    if (editModeElement) {
      editModeElement.textContent =
        this.editMode === 'sound' ? '[Sound]' : '[Visual]';
      editModeElement.style.color =
        this.editMode === 'sound' ? '#51cf66' : '#ffd43b';
    }
  }

  /**
   * Switch between sound and visual edit modes
   */
  switchEditMode() {
    const oldMode = this.editMode;

    // Save current editor content to the current mode
    if (this.editorView) {
      const currentCode = this.editorView.state.doc.toString();
      this.updateCode(currentCode);
    }

    // Switch mode
    this.editMode = this.editMode === 'sound' ? 'visual' : 'sound';

    // Load code for the new mode
    if (this.editorView) {
      const newCode = this.editMode === 'sound' ? this.currentSoundCode : this.currentVisualCode;
      this.editorView.dispatch({
        changes: {
          from: 0,
          to: this.editorView.state.doc.length,
          insert: newCode,
        },
      });
    }

    this.updateEditModeDisplay();
    this.onModeSwitch(oldMode, this.editMode);
  }

  /**
   * Toggle editor visibility
   */
  toggleEditor() {
    const editorContainer = document.querySelector('.editor-container');
    if (!editorContainer) return;

    this.isEditorVisible = !this.isEditorVisible;

    if (this.isEditorVisible) {
      editorContainer.classList.remove('hidden');
    } else {
      editorContainer.classList.add('hidden');
    }

    // Notify visibility change
    this.onVisibilityToggle(this.isEditorVisible);
  }

  /**
   * Get current editor state
   */
  getState() {
    return {
      editMode: this.editMode,
      currentSoundCode: this.currentSoundCode,
      currentVisualCode: this.currentVisualCode,
      isEditorVisible: this.isEditorVisible,
    };
  }

  /**
   * Set editor state
   */
  setState(state) {
    if (state.editMode) {
      this.editMode = state.editMode;
    }
    if (state.currentSoundCode !== undefined) {
      this.currentSoundCode = state.currentSoundCode;
    }
    if (state.currentVisualCode !== undefined) {
      this.currentVisualCode = state.currentVisualCode;
    }
    if (state.isEditorVisible !== undefined) {
      this.isEditorVisible = state.isEditorVisible;
    }

    this.updateEditModeDisplay();
  }

  /**
   * Destroy the editor instance
   */
  destroy() {
    if (this.editorView) {
      this.editorView.destroy();
      this.editorView = null;
    }
  }
}
