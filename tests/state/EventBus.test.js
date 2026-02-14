import { describe, it, expect, vi } from 'vitest';
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
  });
});
