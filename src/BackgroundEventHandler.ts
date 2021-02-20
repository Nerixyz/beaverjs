import { InternalMessage, InternalMessageData, StructuredCloneData } from './types';
import { BaseEventHandler } from './BaseEventHandler';
import { Destination } from './destination';
import { listen } from './listeners';
import _QueryQueryInfo = browser.tabs._QueryQueryInfo;

export class BackgroundEventHandler<EventMap extends Record<string, StructuredCloneData>> extends BaseEventHandler<EventMap, InternalMessageData, [Destination | undefined]> {

  constructor(private query: _QueryQueryInfo = {}) {
    super();
  }

  emitContent<K extends keyof EventMap>(key: K, data: EventMap[K]) {
    return this.emit(key, data, Destination.Content);
  }

  emitContext<K extends keyof EventMap>(key: K, data: EventMap[K]) {
    return this.emit(key, data, Destination.Context);
  }

  protected sendEvent(serialized: InternalMessageData, destination?: Destination): void {
    destination ??= Destination.Passthrough;
    sendToAllTabs(this.query, { destination, data: serialized });
  }

  protected serialize<K extends keyof EventMap>(type: K, data: EventMap[K]): InternalMessageData {
    return { data, event: type as string };
  }

  protected deserialize<K extends keyof EventMap>(serialized: InternalMessageData): { type: K; data: EventMap[K]; } {
    return { data: serialized.data as EventMap[K], type: serialized.event as any };
  }

  protected setup(): void {
    listen({
      thisActor: 'background',
      listenFrom: new Set(['content']),
      onMessage: msg => {
        this.handleSerialized(msg.data);
      }
    });
  }
}

function sendToAllTabs(query: _QueryQueryInfo, msg: InternalMessage) {
  return browser.tabs.query(query)
    .then(tabs => tabs
      .forEach(tab => browser.tabs.sendMessage(tab.id ?? -1, msg)));
}
