import { EditorView, highlightActiveLine, lineNumbers, keymap } from 'https://esm.run/@codemirror/view@6.36.2';

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
   * Initialize the CodeMirror editor with dark theme
   */
  initEditor() {
    const darkTheme = EditorView.theme(
      {
        '&': { color: '#f8f8f2', backgroundColor: 'rgb(0,0,0,.3)' },
        '.cm-content': {
          fontFamily: 'Monaco, Consolas, monospace',
          fontSize: '14px',
          lineHeight: '1.5',
        },
        '.cm-focused': { outline: 'none' },
        '.cm-editor': { border: '1px solid #444' },
        '.cm-editor.cm-focused': { borderColor: '#4CAF50' },
        '.cm-line': { padding: '0 4px' },
        '.cm-cursor': { borderLeftColor: '#f8f8f2' },
        '.cm-activeLine': { backgroundColor: '#2a2a2a' },
        '.cm-gutters': {
          backgroundColor: '#1e1e1e',
          color: '#858585',
          border: 'none',
        },
        '.cm-activeLineGutter': { backgroundColor: '#2a2a2a' },
      },
      { dark: true },
    );

    this.editorView = new EditorView({
      doc: this.getCurrentEditCode(),
      parent: document.getElementById('editor'),
      extensions: [
        highlightActiveLine(),
        lineNumbers(),
        darkTheme,
      ],
    });

    this.updateEditModeDisplay();
  }

  /**
   * Get the current code based on edit mode
   */
  getCurrentEditCode() {
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
    this.editMode = this.editMode === 'sound' ? 'visual' : 'sound';

    if (this.editorView) {
      const newCode = this.getCurrentEditCode();
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
