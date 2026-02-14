/**
 * EventBus factory function
 * Creates a simple pub/sub event system for decoupled communication
 *
 * @example
 * const eventBus = createEventBus();
 *
 * // Subscribe to an event
 * const unsubscribe = eventBus.on('user:login', (data) => {
 *   console.log('User logged in:', data);
 * });
 *
 * // Emit an event
 * eventBus.emit('user:login', { userId: 123 });
 *
 * // Unsubscribe
 * unsubscribe();
 * // or
 * eventBus.off('user:login', callback);
 */

/**
 * Creates a new EventBus instance
 * @returns {EventBus} EventBus instance
 *
 * @typedef {Object} EventBus
 * @property {function(string, function): function} on - Subscribe to an event, returns unsubscribe function
 * @property {function(string, function): void} off - Unsubscribe from an event
 * @property {function(string, *): void} emit - Emit an event with data
 * @property {function(string, function): function} once - Subscribe to an event once
 * @property {function(): void} destroy - Remove all listeners
 */
export function createEventBus() {
  /** @type {Map<string, Set<function>>} */
  const listeners = new Map();

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {function} callback - Callback function
   * @returns {function} Unsubscribe function
   */
  function on(event, callback) {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event).add(callback);

    // Return unsubscribe function
    return () => off(event, callback);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {function} callback - Callback function to remove
   */
  function off(event, callback) {
    const eventListeners = listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
      // Clean up empty sets
      if (eventListeners.size === 0) {
        listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event with data
   * @param {string} event - Event name
   * @param {*} data - Data to pass to listeners
   */
  function emit(event, data) {
    const eventListeners = listeners.get(event);
    if (eventListeners) {
      for (const callback of eventListeners) {
        try {
          callback(data);
        } catch (error) {
          console.error(`[EventBus] Error in listener for "${event}":`, error);
        }
      }
    }
  }

  /**
   * Subscribe to an event once (auto-unsubscribes after first call)
   * @param {string} event - Event name
   * @param {function} callback - Callback function
   * @returns {function} Unsubscribe function
   */
  function once(event, callback) {
    const wrapper = (data) => {
      off(event, wrapper);
      callback(data);
    };
    return on(event, wrapper);
  }

  /**
   * Remove all listeners and clean up
   */
  function destroy() {
    listeners.clear();
  }

  /**
   * Get the number of listeners for an event (for debugging)
   * @param {string} event - Event name
   * @returns {number} Number of listeners
   */
  function listenerCount(event) {
    return listeners.get(event)?.size ?? 0;
  }

  return {
    on,
    off,
    emit,
    once,
    destroy,
    listenerCount,
  };
}
