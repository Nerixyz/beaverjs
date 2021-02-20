import { BaseEventHandler } from './BaseEventHandler';
import { InternalMessage, InternalMessageData, StructuredCloneData } from './types';
import { Destination, isBackground, isContent, isContext, isWorker } from './destination';
import { listen } from './listeners';

export class ContentEventHandler<EventMap extends Record<string, StructuredCloneData>> extends BaseEventHandler<EventMap, InternalMessageData, [Destination | undefined]> {

  emitBackground<K extends keyof EventMap>(key: K, data: EventMap[K]) {
    return this.emit(key, data, Destination.Background);
  }

  emitContext<K extends keyof EventMap>(key: K, data: EventMap[K]) {
    return this.emit(key, data, Destination.Context);
  }

  protected sendEvent(serialized: InternalMessageData, destination?: Destination): void {
    destination ??= Destination.Passthrough;
    if (isContext(destination) || isContent(destination) && isWorker(destination)) {
      postMessage({ destination, data: serialized } as InternalMessage, '*');
    }
    if (isBackground(destination) && globalThis.browser) {
      browser.runtime.sendMessage({ destination, data: serialized } as InternalMessage);
    }
  }

  protected serialize<K extends keyof EventMap>(type: K, data: EventMap[K]): InternalMessageData {
    return { data, event: type as string };
  }

  protected deserialize<K extends keyof EventMap>(serialized: InternalMessageData): { type: K; data: EventMap[K]; } {
    return { data: serialized.data as EventMap[K], type: serialized.event as any };
  }

  protected setup(): void {
    listen({
      thisActor: 'content',
      listenFrom: new Set(['background', 'context']),
      onMessage: msg => {
        this.handleSerialized(msg.data);
      }
    })
  }
}
