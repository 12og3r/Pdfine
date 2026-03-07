import type { EditorEvents } from '../../types/events'

type EventCallback<T> = (data: T) => void;

export class EventBus {
  private listeners = new Map<string, Set<EventCallback<unknown>>>();

  on<K extends keyof EditorEvents>(
    event: K,
    callback: EventCallback<EditorEvents[K]>
  ): () => void {
    if (!this.listeners.has(event as string)) {
      this.listeners.set(event as string, new Set());
    }
    const set = this.listeners.get(event as string)!;
    set.add(callback as EventCallback<unknown>);

    return () => {
      set.delete(callback as EventCallback<unknown>);
      if (set.size === 0) {
        this.listeners.delete(event as string);
      }
    };
  }

  emit<K extends keyof EditorEvents>(event: K, data: EditorEvents[K]): void {
    const set = this.listeners.get(event as string);
    if (set) {
      for (const cb of set) {
        try {
          cb(data);
        } catch (err) {
          console.error(`EventBus error in handler for "${event as string}":`, err);
        }
      }
    }
  }

  off<K extends keyof EditorEvents>(
    event: K,
    callback: EventCallback<EditorEvents[K]>
  ): void {
    const set = this.listeners.get(event as string);
    if (set) {
      set.delete(callback as EventCallback<unknown>);
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
