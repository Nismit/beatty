/**
 * ToolbarController factory function
 * Manages toolbar interactions (settings, help)
 */

/**
 * @param {Object} deps
 * @param {import('../controllers/UIController.js').UIController} deps.uiController
 * @param {import('./SettingsModal.js')} deps.settingsModal
 */
export function createToolbarController({ uiController, settingsModal }) {
  function init() {
    const settingsBtn = document.getElementById('toolbarSettings');
    const helpBtn = document.getElementById('toolbarHelp');

    if (settingsBtn) {
      settingsBtn.addEventListener('click', handleSettings);
    }

    if (helpBtn) {
      helpBtn.addEventListener('click', handleHelp);
    }
  }

  function handleSettings() {
    settingsModal.show();
  }

  function handleHelp() {
    uiController.showHelpModal();
  }

  function destroy() {
    // Cleanup if needed
  }

  return { init, destroy };
}
