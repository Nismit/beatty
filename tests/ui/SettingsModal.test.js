import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock storage
vi.mock('../../src/utils/storage.js', () => ({
  saveShader: vi.fn(),
}));

import { createSettingsModal } from '../../src/ui/SettingsModal.js';
import {
  DEFAULT_SOUND_SHADER,
  DEFAULT_VISUAL_SHADER,
  DEMO_SOUND_SHADER,
} from '../../src/gl/shader-templates.js';

function createMockDeps() {
  return {
    eventBus: {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    },
    editor: {
      setAllCodes: vi.fn(),
      getAllCodes: vi.fn(() => ({
        soundMain: 'sound code',
        soundUtils: '',
        visualMain: 'visual code',
        visualUtils: '',
      })),
    },
    hotkeySettings: {
      getModifiers: vi.fn(() => ({ ctrl: true, shift: false, alt: false, meta: false })),
      setModifiers: vi.fn(),
      getDisplayString: vi.fn(() => 'Ctrl'),
      resetToDefault: vi.fn(),
    },
    initShaders: vi.fn(),
  };
}

function setupDOM() {
  document.body.innerHTML = `
    <div class="modal-overlay" id="settingsModal">
      <div class="settings-tabs">
        <button class="settings-tab active" data-tab="shader">Shader</button>
        <button class="settings-tab" data-tab="hotkeys">Hotkeys</button>
      </div>
      <div class="settings-tab-content active" id="tab-shader"></div>
      <div class="settings-tab-content" id="tab-hotkeys"></div>
      <select id="soundPresetSelect">
        <option value="">-- Select --</option>
        <option value="default">Default</option>
        <option value="demo">Demo</option>
      </select>
      <select id="visualPresetSelect">
        <option value="">-- Select --</option>
        <option value="default">Default</option>
      </select>
      <button id="closeSettings">Close</button>
      <div id="hotkeyPreview"></div>
    </div>
  `;
}

describe('SettingsModal', () => {
  beforeEach(() => {
    setupDOM();
    vi.clearAllMocks();
  });

  describe('show/hide/isVisible with missing DOM', () => {
    it('should not throw when modal element is missing', () => {
      document.body.innerHTML = '';
      const deps = createMockDeps();
      const modal = createSettingsModal(deps);

      expect(() => modal.show()).not.toThrow();
      expect(() => modal.hide()).not.toThrow();
      expect(modal.isVisible()).toBe(false);
    });
  });

  describe('init with missing DOM elements', () => {
    it('should not throw when buttons are missing', () => {
      document.body.innerHTML = '<div id="settingsModal"></div>';
      const deps = createMockDeps();
      const modal = createSettingsModal(deps);

      expect(() => modal.init()).not.toThrow();
    });

    it('should not throw when hotkey checkboxes are missing', () => {
      document.body.innerHTML = `
        <div id="settingsModal"></div>
        <div id="hotkeyPreview"></div>
      `;
      const deps = createMockDeps();
      const modal = createSettingsModal(deps);

      expect(() => modal.init()).not.toThrow();
    });
  });

  describe('preset selects', () => {
    it('should apply sound default preset and close modal', () => {
      const deps = createMockDeps();
      const modal = createSettingsModal(deps);
      modal.init();
      modal.show();

      const select = document.getElementById('soundPresetSelect');
      select.value = 'default';
      select.dispatchEvent(new Event('change'));

      expect(deps.editor.setAllCodes).toHaveBeenCalledWith({
        soundMain: DEFAULT_SOUND_SHADER,
        soundUtils: '',
      });
      expect(deps.initShaders).toHaveBeenCalledWith(
        { main: DEFAULT_SOUND_SHADER, utils: '' },
        { main: 'visual code', utils: '' },
      );
      expect(modal.isVisible()).toBe(false);
    });

    it('should apply sound demo preset and close modal', () => {
      const deps = createMockDeps();
      const modal = createSettingsModal(deps);
      modal.init();
      modal.show();

      const select = document.getElementById('soundPresetSelect');
      select.value = 'demo';
      select.dispatchEvent(new Event('change'));

      expect(deps.editor.setAllCodes).toHaveBeenCalledWith({
        soundMain: DEMO_SOUND_SHADER,
        soundUtils: '',
      });
      expect(deps.initShaders).toHaveBeenCalled();
      expect(modal.isVisible()).toBe(false);
    });

    it('should apply visual default preset and close modal', () => {
      const deps = createMockDeps();
      const modal = createSettingsModal(deps);
      modal.init();
      modal.show();

      const select = document.getElementById('visualPresetSelect');
      select.value = 'default';
      select.dispatchEvent(new Event('change'));

      expect(deps.editor.setAllCodes).toHaveBeenCalledWith({
        visualMain: DEFAULT_VISUAL_SHADER,
        visualUtils: '',
      });
      expect(deps.initShaders).toHaveBeenCalledWith(
        { main: 'sound code', utils: '' },
        { main: DEFAULT_VISUAL_SHADER, utils: '' },
      );
      expect(modal.isVisible()).toBe(false);
    });

    it('should not apply preset when selecting empty value', () => {
      const deps = createMockDeps();
      const modal = createSettingsModal(deps);
      modal.init();
      modal.show();

      const select = document.getElementById('soundPresetSelect');
      select.value = '';
      select.dispatchEvent(new Event('change'));

      expect(deps.editor.setAllCodes).not.toHaveBeenCalled();
      expect(deps.initShaders).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should remove event listeners after destroy', () => {
      const deps = createMockDeps();
      const modal = createSettingsModal(deps);
      modal.init();

      modal.destroy();

      // After destroy, changing preset select should not call initShaders
      modal.show();
      deps.initShaders.mockClear();
      const select = document.getElementById('soundPresetSelect');
      select.value = 'default';
      select.dispatchEvent(new Event('change'));

      expect(deps.initShaders).not.toHaveBeenCalled();
    });

    it('should handle multiple destroy calls without error', () => {
      const deps = createMockDeps();
      const modal = createSettingsModal(deps);
      modal.init();

      expect(() => {
        modal.destroy();
        modal.destroy();
      }).not.toThrow();
    });
  });
});
