import { BaseEventHandler } from './BaseEventHandler';
import { InternalMessage, InternalMessageData, StructuredCloneData } from './types';
import { Destination } from './destination';
import { listen } from './listeners';

export class ContextEventHandler<EventMap extends Record<string, StructuredCloneData>> extends BaseEventHandler<
  EventMap,
  InternalMessageData,
  [Destination | undefined],
  undefined
> {
  emitBackground<K extends keyof EventMap>(key: K, data: EventMap[K]) {
    return this.emit(key, data, Destination.Background);
  }

  emitContent<K extends keyof EventMap>(key: K, data: EventMap[K]) {
    return this.emit(key, data, Destination.Content);
  }

  protected deserialize<K extends keyof EventMap>(serialized: InternalMessageData): { type: K; data: EventMap[K] } {
    return { data: serialized.data as EventMap[K], type: serialized.event as K };
  }

  protected sendEvent(serialized: InternalMessageData, destination: Destination | undefined): void {
    destination ??= Destination.Passthrough;
    postMessage({ data: serialized, destination } as InternalMessage, '*');
  }

  protected serialize<K extends keyof EventMap>(type: K, data: EventMap[K]): InternalMessageData {
    return { event: type as string, data };
  }

  protected setup(): void {
    listen<undefined /* TODO */>({
      thisActor: 'context',
      listenFrom: new Set(['content']),
      onMessage: (msg, sender) => {
        this.handleSerialized(msg.data, sender);
      },
    });
  }
}
