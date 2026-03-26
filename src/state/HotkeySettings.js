/**
 * HotkeySettings factory function
 * Manages hotkey modifier configuration with persistence
 */

import { DEFAULT_HOTKEY_MODIFIERS, EVENTS } from '../utils/consts.js';
import { loadHotkeySettings, saveHotkeySettings } from '../utils/storage.js';

/**
 * @param {import('./EventBus.js').EventBus} eventBus
 */
export function createHotkeySettings(eventBus) {
  let modifiers = loadHotkeySettings();

  /**
   * Get current modifier settings
   * @returns {{ ctrl: boolean, shift: boolean, alt: boolean, meta: boolean }}
   */
  function getModifiers() {
    return { ...modifiers };
  }

  /**
   * Set modifier settings
   * @param {{ ctrl?: boolean, shift?: boolean, alt?: boolean, meta?: boolean }} newModifiers
   * @returns {boolean} Success status
   */
  function setModifiers(newModifiers) {
    const updated = {
      ctrl: newModifiers.ctrl ?? modifiers.ctrl,
      shift: newModifiers.shift ?? modifiers.shift,
      alt: newModifiers.alt ?? modifiers.alt,
      meta: newModifiers.meta ?? modifiers.meta,
    };

    // At least one modifier must be selected
    if (!updated.ctrl && !updated.shift && !updated.alt && !updated.meta) {
      console.warn('[HotkeySettings] At least one modifier must be selected');
      return false;
    }

    modifiers = updated;
    saveHotkeySettings(modifiers);
    eventBus.emit(EVENTS.HOTKEY_MODIFIERS_CHANGED, { modifiers: { ...modifiers } });
    return true;
  }

  /**
   * Check if required modifiers are pressed for the given event
   * @param {KeyboardEvent} event
   * @returns {boolean}
   */
  function isModifierPressed(event) {
    const ctrlMatch = !modifiers.ctrl || event.ctrlKey;
    const shiftMatch = !modifiers.shift || event.shiftKey;
    const altMatch = !modifiers.alt || event.altKey;
    const metaMatch = !modifiers.meta || event.metaKey;

    // All required modifiers must be pressed
    // Also ensure at least one of the configured modifiers is actually pressed
    const anyRequired = modifiers.ctrl || modifiers.shift || modifiers.alt || modifiers.meta;
    const anyPressed = event.ctrlKey || event.shiftKey || event.altKey || event.metaKey;

    return ctrlMatch && shiftMatch && altMatch && metaMatch && anyRequired && anyPressed;
  }

  /**
   * Reset to default modifiers
   */
  function resetToDefault() {
    modifiers = { ...DEFAULT_HOTKEY_MODIFIERS };
    saveHotkeySettings(modifiers);
    eventBus.emit(EVENTS.HOTKEY_MODIFIERS_CHANGED, { modifiers: { ...modifiers } });
  }

  /**
   * Get display string for current modifiers
   * @returns {string}
   */
  function getDisplayString() {
    const parts = [];
    if (modifiers.ctrl) parts.push('Ctrl');
    if (modifiers.shift) parts.push('Shift');
    if (modifiers.alt) parts.push('Alt');
    if (modifiers.meta) parts.push('Meta');
    return parts.join(' + ');
  }

  function destroy() {
    // No cleanup needed
  }

  return {
    getModifiers,
    setModifiers,
    isModifierPressed,
    resetToDefault,
    getDisplayString,
    destroy,
  };
}
