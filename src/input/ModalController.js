/**
 * ModalController factory function
 * Manages help modal, settings modal, slider popups, and document click-to-dismiss behavior
 */

/**
 * @param {Object} deps
 * @param {import('../controllers/UIController.js')} deps.uiController
 * @param {import('../ui/SettingsModal.js')} deps.settingsModal
 */
export function createModalController({ uiController, settingsModal }) {
  const cleanups = [];

  function init() {
    // Status bar clickable items
    bindClick('bpmStatus', (e) => {
      e.stopPropagation();
      uiController.showSliderPopup('bpm', e);
    });

    bindClick('volumeStatus', (e) => {
      e.stopPropagation();
      uiController.showSliderPopup('volume', e);
    });

    bindClick('helpStatus', (e) => {
      e.stopPropagation();
      uiController.showHelpModal();
    });

    bindClick('closeHelp', () => {
      uiController.hideHelpModal();
    });

    // Document click to dismiss popups and modals
    const handleDocumentClick = (e) => {
      if (!e.target.closest('.slider-popup') && !e.target.closest('.status-clickable')) {
        uiController.hideAllSliderPopups();
      }
      if (
        !e.target.closest('.modal-content') &&
        !e.target.closest('#helpStatus') &&
        !e.target.closest('#mobileHelp') &&
        !e.target.closest('#toolbarHelp')
      ) {
        uiController.hideHelpModal();
      }
      if (
        !e.target.closest('.modal-content') &&
        !e.target.closest('#mobilePresets') &&
        !e.target.closest('#toolbarSettings')
      ) {
        settingsModal.hide();
      }
    };

    document.addEventListener('click', handleDocumentClick);
    cleanups.push(() => document.removeEventListener('click', handleDocumentClick));
  }

  /**
   * Bind a click handler to an element by ID
   * @param {string} id
   * @param {function(Event): void} handler
   */
  function bindClick(id, handler) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', handler);
    cleanups.push(() => el.removeEventListener('click', handler));
  }

  function destroy() {
    for (const cleanup of cleanups) {
      cleanup();
    }
    cleanups.length = 0;
  }

  return { init, destroy };
}
