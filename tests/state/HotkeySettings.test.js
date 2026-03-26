import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHotkeySettings } from '../../src/state/HotkeySettings.js';
import { DEFAULT_HOTKEY_MODIFIERS, EVENTS, STORAGE_KEYS } from '../../src/utils/consts.js';

function createMockEventBus() {
  return {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };
}

describe('HotkeySettings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('initial state', () => {
    it('should use default modifiers when no saved settings', () => {
      const eventBus = createMockEventBus();
      const hotkeySettings = createHotkeySettings(eventBus);

      expect(hotkeySettings.getModifiers()).toEqual(DEFAULT_HOTKEY_MODIFIERS);
    });

    it('should load saved modifiers from localStorage', () => {
      const savedSettings = {
        modifiers: { ctrl: false, shift: true, alt: true, meta: false },
        timestamp: Date.now(),
        version: '1.0',
      };
      localStorage.setItem(STORAGE_KEYS.HOTKEY_SETTINGS, JSON.stringify(savedSettings));

      const eventBus = createMockEventBus();
      const hotkeySettings = createHotkeySettings(eventBus);

      expect(hotkeySettings.getModifiers()).toEqual({
        ctrl: false,
        shift: true,
        alt: true,
        meta: false,
      });
    });
  });

  describe('setModifiers', () => {
    it('should update modifiers and emit event', () => {
      const eventBus = createMockEventBus();
      const hotkeySettings = createHotkeySettings(eventBus);

      const result = hotkeySettings.setModifiers({ ctrl: false, shift: true });

      expect(result).toBe(true);
      expect(hotkeySettings.getModifiers().ctrl).toBe(false);
      expect(hotkeySettings.getModifiers().shift).toBe(true);
      expect(eventBus.emit).toHaveBeenCalledWith(
        EVENTS.HOTKEY_MODIFIERS_CHANGED,
        expect.objectContaining({
          modifiers: expect.objectContaining({ ctrl: false, shift: true }),
        }),
      );
    });

    it('should reject when all modifiers are disabled', () => {
      const eventBus = createMockEventBus();
      const hotkeySettings = createHotkeySettings(eventBus);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = hotkeySettings.setModifiers({
        ctrl: false,
        shift: false,
        alt: false,
        meta: false,
      });
      consoleSpy.mockRestore();

      expect(result).toBe(false);
      // Should retain previous values
      expect(hotkeySettings.getModifiers().ctrl).toBe(true);
    });

    it('should persist settings to localStorage', () => {
      const eventBus = createMockEventBus();
      const hotkeySettings = createHotkeySettings(eventBus);

      hotkeySettings.setModifiers({ ctrl: false, alt: true });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.HOTKEY_SETTINGS));
      expect(stored.modifiers.ctrl).toBe(false);
      expect(stored.modifiers.alt).toBe(true);
    });

    it('should handle partial updates (only ctrl)', () => {
      const eventBus = createMockEventBus();
      const hotkeySettings = createHotkeySettings(eventBus);

      hotkeySettings.setModifiers({ shift: true });

      const modifiers = hotkeySettings.getModifiers();
      expect(modifiers.ctrl).toBe(true); // unchanged
      expect(modifiers.shift).toBe(true); // updated
    });
  });

  describe('isModifierPressed', () => {
    it('should return true when required modifier is pressed', () => {
      const eventBus = createMockEventBus();
      const hotkeySettings = createHotkeySettings(eventBus);
      // Default: ctrl only

      const event = new KeyboardEvent('keydown', { ctrlKey: true });
      expect(hotkeySettings.isModifierPressed(event)).toBe(true);
    });

    it('should return false when required modifier is not pressed', () => {
      const eventBus = createMockEventBus();
      const hotkeySettings = createHotkeySettings(eventBus);

      const event = new KeyboardEvent('keydown', { shiftKey: true });
      expect(hotkeySettings.isModifierPressed(event)).toBe(false);
    });

    it('should require all configured modifiers', () => {
      const eventBus = createMockEventBus();
      const hotkeySettings = createHotkeySettings(eventBus);
      hotkeySettings.setModifiers({ ctrl: true, shift: true });

      // Only ctrl pressed - should fail
      const eventCtrlOnly = new KeyboardEvent('keydown', { ctrlKey: true });
      expect(hotkeySettings.isModifierPressed(eventCtrlOnly)).toBe(false);

      // Both pressed - should pass
      const eventBoth = new KeyboardEvent('keydown', { ctrlKey: true, shiftKey: true });
      expect(hotkeySettings.isModifierPressed(eventBoth)).toBe(true);
    });

    it('should return false when no modifiers are pressed', () => {
      const eventBus = createMockEventBus();
      const hotkeySettings = createHotkeySettings(eventBus);

      const event = new KeyboardEvent('keydown', {});
      expect(hotkeySettings.isModifierPressed(event)).toBe(false);
    });
  });

  describe('resetToDefault', () => {
    it('should reset to default modifiers', () => {
      const eventBus = createMockEventBus();
      const hotkeySettings = createHotkeySettings(eventBus);

      hotkeySettings.setModifiers({ ctrl: false, alt: true, meta: true });
      hotkeySettings.resetToDefault();

      expect(hotkeySettings.getModifiers()).toEqual(DEFAULT_HOTKEY_MODIFIERS);
    });

    it('should emit event on reset', () => {
      const eventBus = createMockEventBus();
      const hotkeySettings = createHotkeySettings(eventBus);

      hotkeySettings.setModifiers({ alt: true });
      eventBus.emit.mockClear();

      hotkeySettings.resetToDefault();

      expect(eventBus.emit).toHaveBeenCalledWith(
        EVENTS.HOTKEY_MODIFIERS_CHANGED,
        expect.objectContaining({ modifiers: DEFAULT_HOTKEY_MODIFIERS }),
      );
    });
  });

  describe('getDisplayString', () => {
    it('should return formatted string for single modifier', () => {
      const eventBus = createMockEventBus();
      const hotkeySettings = createHotkeySettings(eventBus);

      expect(hotkeySettings.getDisplayString()).toBe('Ctrl');
    });

    it('should return formatted string for multiple modifiers', () => {
      const eventBus = createMockEventBus();
      const hotkeySettings = createHotkeySettings(eventBus);

      hotkeySettings.setModifiers({ ctrl: true, shift: true, alt: true });

      expect(hotkeySettings.getDisplayString()).toBe('Ctrl + Shift + Alt');
    });
  });

  describe('persistence edge cases', () => {
    it('should handle corrupted localStorage data', () => {
      localStorage.setItem(STORAGE_KEYS.HOTKEY_SETTINGS, 'not valid json');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const eventBus = createMockEventBus();
      const hotkeySettings = createHotkeySettings(eventBus);
      consoleSpy.mockRestore();

      // Should fall back to defaults
      expect(hotkeySettings.getModifiers()).toEqual(DEFAULT_HOTKEY_MODIFIERS);
    });

    it('should handle missing modifiers object in stored data', () => {
      const invalidData = { timestamp: Date.now(), version: '1.0' };
      localStorage.setItem(STORAGE_KEYS.HOTKEY_SETTINGS, JSON.stringify(invalidData));

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const eventBus = createMockEventBus();
      const hotkeySettings = createHotkeySettings(eventBus);
      consoleSpy.mockRestore();

      expect(hotkeySettings.getModifiers()).toEqual(DEFAULT_HOTKEY_MODIFIERS);
      // Should have removed invalid data
      expect(localStorage.getItem(STORAGE_KEYS.HOTKEY_SETTINGS)).toBeNull();
    });

    it('should coerce non-boolean values to boolean', () => {
      const weirdData = {
        modifiers: { ctrl: 1, shift: 0, alt: 'yes', meta: null },
        timestamp: Date.now(),
        version: '1.0',
      };
      localStorage.setItem(STORAGE_KEYS.HOTKEY_SETTINGS, JSON.stringify(weirdData));

      const eventBus = createMockEventBus();
      const hotkeySettings = createHotkeySettings(eventBus);

      const modifiers = hotkeySettings.getModifiers();
      expect(modifiers.ctrl).toBe(true); // 1 -> true
      expect(modifiers.shift).toBe(false); // 0 -> false
      expect(modifiers.alt).toBe(true); // 'yes' -> true
      expect(modifiers.meta).toBe(false); // null -> false
    });
  });

  describe('destroy', () => {
    it('should not throw when called', () => {
      const eventBus = createMockEventBus();
      const hotkeySettings = createHotkeySettings(eventBus);

      expect(() => hotkeySettings.destroy()).not.toThrow();
    });
  });
});
