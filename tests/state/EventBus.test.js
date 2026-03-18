import { describe, expect, it, vi } from 'vitest';
import { createEventBus } from '../../src/state/EventBus.js';

describe('EventBus', () => {
  describe('on/emit', () => {
    it('should emit events to subscribers', () => {
      const eventBus = createEventBus();
      const callback = vi.fn();

      eventBus.on('test', callback);
      eventBus.emit('test', { value: 42 });

      expect(callback).toHaveBeenCalledWith({ value: 42 });
    });

    it('should support multiple subscribers for same event', () => {
      const eventBus = createEventBus();
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      eventBus.on('test', callback1);
      eventBus.on('test', callback2);
      eventBus.emit('test', { data: 'hello' });

      expect(callback1).toHaveBeenCalledWith({ data: 'hello' });
      expect(callback2).toHaveBeenCalledWith({ data: 'hello' });
    });

    it('should not call subscribers for different events', () => {
      const eventBus = createEventBus();
      const callback = vi.fn();

      eventBus.on('eventA', callback);
      eventBus.emit('eventB', {});

      expect(callback).not.toHaveBeenCalled();
    });

    it('should return unsubscribe function from on()', () => {
      const eventBus = createEventBus();
      const callback = vi.fn();

      const unsubscribe = eventBus.on('test', callback);
      unsubscribe();
      eventBus.emit('test', {});

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('off', () => {
    it('should remove listener with off()', () => {
      const eventBus = createEventBus();
      const callback = vi.fn();

      eventBus.on('test', callback);
      eventBus.off('test', callback);
      eventBus.emit('test', {});

      expect(callback).not.toHaveBeenCalled();
    });

    it('should only remove specified listener', () => {
      const eventBus = createEventBus();
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      eventBus.on('test', callback1);
      eventBus.on('test', callback2);
      eventBus.off('test', callback1);
      eventBus.emit('test', { data: 'test' });

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should handle off() for non-existent event gracefully', () => {
      const eventBus = createEventBus();
      const callback = vi.fn();

      // Should not throw
      expect(() => eventBus.off('nonexistent', callback)).not.toThrow();
    });
  });

  describe('once', () => {
    it('should only call listener once', () => {
      const eventBus = createEventBus();
      const callback = vi.fn();

      eventBus.once('test', callback);
      eventBus.emit('test', { first: true });
      eventBus.emit('test', { second: true });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ first: true });
    });

    it('should return unsubscribe function', () => {
      const eventBus = createEventBus();
      const callback = vi.fn();

      const unsubscribe = eventBus.once('test', callback);
      unsubscribe();
      eventBus.emit('test', {});

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should clear all listeners on destroy()', () => {
      const eventBus = createEventBus();
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      eventBus.on('eventA', callback1);
      eventBus.on('eventB', callback2);
      eventBus.destroy();
      eventBus.emit('eventA', {});
      eventBus.emit('eventB', {});

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('listenerCount', () => {
    it('should return correct listener count', () => {
      const eventBus = createEventBus();
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      expect(eventBus.listenerCount('test')).toBe(0);

      eventBus.on('test', callback1);
      expect(eventBus.listenerCount('test')).toBe(1);

      eventBus.on('test', callback2);
      expect(eventBus.listenerCount('test')).toBe(2);

      eventBus.off('test', callback1);
      expect(eventBus.listenerCount('test')).toBe(1);
    });

    it('should return 0 for non-existent event', () => {
      const eventBus = createEventBus();
      expect(eventBus.listenerCount('nonexistent')).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should catch errors in listeners without stopping other listeners', () => {
      const eventBus = createEventBus();
      const errorCallback = vi.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = vi.fn();

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      eventBus.on('test', errorCallback);
      eventBus.on('test', normalCallback);
      eventBus.emit('test', { data: 'test' });

      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalledWith({ data: 'test' });
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle error in once listener and still auto-unsubscribe', () => {
      const eventBus = createEventBus();
      const errorCallback = vi.fn(() => {
        throw new Error('Once error');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      eventBus.once('test', errorCallback);
      eventBus.emit('test', {});
      eventBus.emit('test', {}); // second emit

      expect(errorCallback).toHaveBeenCalledTimes(1);
      expect(eventBus.listenerCount('test')).toBe(0);

      consoleSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should allow same callback to be registered multiple times', () => {
      const eventBus = createEventBus();
      const callback = vi.fn();

      // Set uses reference equality, so same function registered twice = 1 entry
      eventBus.on('test', callback);
      eventBus.on('test', callback);
      eventBus.emit('test', {});

      // Set deduplicates, so callback should only be called once
      expect(callback).toHaveBeenCalledTimes(1);
      expect(eventBus.listenerCount('test')).toBe(1);
    });

    it('should handle emit to non-existent event gracefully', () => {
      const eventBus = createEventBus();

      expect(() => eventBus.emit('nonexistent', { data: 'test' })).not.toThrow();
    });

    it('should handle operations after destroy gracefully', () => {
      const eventBus = createEventBus();
      const callback = vi.fn();

      eventBus.on('test', callback);
      eventBus.destroy();

      // All operations should be safe after destroy
      expect(() => eventBus.emit('test', {})).not.toThrow();
      expect(() => eventBus.on('test', callback)).not.toThrow();
      expect(() => eventBus.off('test', callback)).not.toThrow();
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle unsubscribe called multiple times', () => {
      const eventBus = createEventBus();
      const callback = vi.fn();

      const unsubscribe = eventBus.on('test', callback);
      unsubscribe();
      unsubscribe(); // second call should be safe
      unsubscribe(); // third call should be safe

      expect(() => eventBus.emit('test', {})).not.toThrow();
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle listener removing itself during emit', () => {
      const eventBus = createEventBus();
      const results = [];

      const selfRemovingCallback = () => {
        results.push('self-removing');
        eventBus.off('test', selfRemovingCallback);
      };
      const normalCallback = () => {
        results.push('normal');
      };

      eventBus.on('test', selfRemovingCallback);
      eventBus.on('test', normalCallback);
      eventBus.emit('test', {});

      // Both should have been called during first emit
      expect(results).toContain('self-removing');
      expect(results).toContain('normal');

      // Second emit: only normal should be called
      results.length = 0;
      eventBus.emit('test', {});
      expect(results).toEqual(['normal']);
    });

    it('should handle recursive emit from within listener', () => {
      const eventBus = createEventBus();
      let emitCount = 0;
      const maxEmits = 3;

      const recursiveCallback = vi.fn(() => {
        emitCount++;
        if (emitCount < maxEmits) {
          eventBus.emit('test', { count: emitCount });
        }
      });

      eventBus.on('test', recursiveCallback);
      eventBus.emit('test', { count: 0 });

      expect(recursiveCallback).toHaveBeenCalledTimes(maxEmits);
    });

    it('should clean up empty listener sets after off', () => {
      const eventBus = createEventBus();
      const callback = vi.fn();

      eventBus.on('test', callback);
      expect(eventBus.listenerCount('test')).toBe(1);

      eventBus.off('test', callback);
      expect(eventBus.listenerCount('test')).toBe(0);

      // Internal map should be cleaned up (no dangling empty sets)
      // Adding new listener should work correctly
      eventBus.on('test', callback);
      expect(eventBus.listenerCount('test')).toBe(1);
    });

    it('should handle listener adding new listener during emit', () => {
      const eventBus = createEventBus();
      const results = [];

      const addingCallback = () => {
        results.push('adding');
        eventBus.on('test', () => results.push('newly-added'));
      };

      eventBus.on('test', addingCallback);
      eventBus.emit('test', {});

      // First emit: only 'adding' should be called (new listener added after iteration started)
      // Behavior depends on Set iteration - new entries may or may not be visited
      expect(results).toContain('adding');

      // Second emit: both should definitely be called
      results.length = 0;
      eventBus.emit('test', {});
      expect(results).toContain('adding');
      expect(results).toContain('newly-added');
    });
  });
});
