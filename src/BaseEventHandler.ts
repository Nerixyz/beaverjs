import { filterMap } from './utilities';

type EventFn<S, T> = (data: T, sender: S) => void;
type EventEntry<S, T> = EventFn<S, T> | { fn: EventFn<S, T>; once?: boolean };
type ArrayOrSingle<T> = T | Array<T>;
type Values<T extends object> = T[keyof T];

export abstract class BaseEventHandler<
  EventMap extends Record<string, any>,
  SerializedEvent,
  SendArgs extends Array<any>,
  Sender
> {
  protected eventMap = new Map<keyof EventMap, ArrayOrSingle<EventEntry<Sender, EventMap[keyof EventMap]>>>();

  constructor() {
    queueMicrotask(() => this.setup());
  }

  protected abstract serialize<K extends keyof EventMap>(type: K, data: EventMap[K]): SerializedEvent;
  protected abstract deserialize<K extends keyof EventMap>(serialized: SerializedEvent): { type: K; data: EventMap[K] };

  protected abstract sendEvent(serialized: SerializedEvent, ...args: SendArgs): void;

  protected abstract setup(): void;

  private insertEvent<K extends keyof EventMap>(key: K, eventHandler: EventEntry<Sender, EventMap[K]>): void {
    // all the "as ..." are necessary because Typescript doesn't like inserting EventMap[K] into EventMap[keyof EventMap]
    // even though K extends keyof EventMap. This is probably due to the definition of `eventMap`

    if (this.eventMap.has(key)) {
      const entry = this.eventMap.get(key) as ArrayOrSingle<EventEntry<Sender, EventMap[K]>>;
      if (Array.isArray(entry)) {
        // 2 or more entries
        entry.push(eventHandler);
      } else {
        // only one entry
        this.eventMap.set(key, [
          entry as EventEntry<Sender, Values<EventMap>>,
          eventHandler as EventFn<Sender, Values<EventMap>>,
        ]);
      }
    } else {
      this.eventMap.set(key, eventHandler as EventFn<Sender, Values<EventMap>>);
    }
  }

  on<K extends keyof EventMap>(key: K, fn: EventFn<Sender, EventMap[K]>): this {
    this.insertEvent<K>(key, fn);
    return this;
  }

  once<K extends keyof EventMap>(key: K, fn: EventFn<Sender, EventMap[K]>): this {
    this.insertEvent(key, { fn, once: true });
    return this;
  }

  emit<K extends keyof EventMap>(key: K, data: EventMap[K], ...args: SendArgs) {
    const serialized = this.serialize(key, data);
    this.sendEvent(serialized, ...args);
  }

  protected handleEvent<K extends keyof EventMap>(key: K, data: EventMap[K], sender: Sender) {
    const entry = this.eventMap.get(key);
    if (!entry) return;

    if (typeof entry === 'function') {
      // "fast path" - no cleanup or anything
      entry(data, sender);
      return;
    }

    if (Array.isArray(entry)) {
      const result = entry.filter(value => {
        if (typeof value === 'function') {
          value(data, sender);
          return true;
        }

        value.fn(data, sender);
        return value.once;
      });

      if (result.length === 0) this.eventMap.delete(key);
      else if (result.length === 1) this.eventMap.set(key, result[0]);
      else this.eventMap.set(key, result);
    } else {
      if (entry.once) this.eventMap.delete(key);

      entry.fn(data, sender);
    }
  }

  protected handleSerialized(serialized: SerializedEvent, sender: Sender) {
    const deserialized = this.deserialize(serialized);
    // another function for better type checking
    this.handleEvent(deserialized.type, deserialized.data, sender);
  }
}
