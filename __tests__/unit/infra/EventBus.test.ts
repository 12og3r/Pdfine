import { describe, it, expect, vi } from 'vitest'
import { EventBus } from '../../../src/core/infra/EventBus'

describe('EventBus', () => {
  it('should emit and receive events', () => {
    const bus = new EventBus()
    const handler = vi.fn()

    bus.on('textChanged', handler)
    bus.emit('textChanged', { pageIdx: 0, blockId: 'block-1' })

    expect(handler).toHaveBeenCalledWith({ pageIdx: 0, blockId: 'block-1' })
  })

  it('should handle multiple listeners', () => {
    const bus = new EventBus()
    const handler1 = vi.fn()
    const handler2 = vi.fn()

    bus.on('textChanged', handler1)
    bus.on('textChanged', handler2)
    bus.emit('textChanged', { pageIdx: 0, blockId: 'b' })

    expect(handler1).toHaveBeenCalledOnce()
    expect(handler2).toHaveBeenCalledOnce()
  })

  it('should unsubscribe via returned function', () => {
    const bus = new EventBus()
    const handler = vi.fn()

    const unsub = bus.on('editStart', handler)
    bus.emit('editStart', { blockId: 'b1' })
    expect(handler).toHaveBeenCalledOnce()

    unsub()
    bus.emit('editStart', { blockId: 'b2' })
    expect(handler).toHaveBeenCalledOnce() // Not called again
  })

  it('should remove all listeners', () => {
    const bus = new EventBus()
    const handler = vi.fn()

    bus.on('textChanged', handler)
    bus.on('editStart', handler)
    bus.removeAllListeners()

    bus.emit('textChanged', { pageIdx: 0, blockId: 'b' })
    bus.emit('editStart', { blockId: 'b' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('should not throw if emitting with no listeners', () => {
    const bus = new EventBus()
    expect(() => bus.emit('textChanged', { pageIdx: 0, blockId: 'b' })).not.toThrow()
  })

  it('should catch handler errors without breaking other listeners', () => {
    const bus = new EventBus()
    const errorHandler = vi.fn(() => { throw new Error('test error') })
    const goodHandler = vi.fn()

    bus.on('textChanged', errorHandler)
    bus.on('textChanged', goodHandler)

    bus.emit('textChanged', { pageIdx: 0, blockId: 'b' })

    expect(errorHandler).toHaveBeenCalled()
    expect(goodHandler).toHaveBeenCalled()
  })
})
