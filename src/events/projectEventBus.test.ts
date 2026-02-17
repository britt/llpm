import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getProjectEventBus, resetProjectEventBusForTesting } from './projectEventBus';

describe('ProjectEventBus', () => {
  beforeEach(() => {
    resetProjectEventBusForTesting();
  });

  it('should return a singleton instance', () => {
    const bus1 = getProjectEventBus();
    const bus2 = getProjectEventBus();
    expect(bus1).toBe(bus2);
  });

  it('should emit project:switched event with correct payload', () => {
    const bus = getProjectEventBus();
    const handler = vi.fn();

    bus.on('project:switched', handler);
    bus.emit('project:switched', { projectId: 'test-123', projectName: 'Test Project' });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ projectId: 'test-123', projectName: 'Test Project' });
  });

  it('should deliver events to multiple listeners', () => {
    const bus = getProjectEventBus();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    bus.on('project:switched', handler1);
    bus.on('project:switched', handler2);
    bus.emit('project:switched', { projectId: 'proj-1', projectName: 'Project One' });

    expect(handler1).toHaveBeenCalledOnce();
    expect(handler2).toHaveBeenCalledOnce();
  });

  it('should support removeListener for cleanup', () => {
    const bus = getProjectEventBus();
    const handler = vi.fn();

    bus.on('project:switched', handler);
    bus.removeListener('project:switched', handler);
    bus.emit('project:switched', { projectId: 'test-123', projectName: 'Test' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should create a fresh instance after resetForTesting', () => {
    const bus1 = getProjectEventBus();
    const handler = vi.fn();
    bus1.on('project:switched', handler);

    resetProjectEventBusForTesting();

    const bus2 = getProjectEventBus();
    expect(bus2).not.toBe(bus1);

    // Old listener should not be on new instance
    bus2.emit('project:switched', { projectId: 'new-id', projectName: 'New' });
    expect(handler).not.toHaveBeenCalled();
  });
});
