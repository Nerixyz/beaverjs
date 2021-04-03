import { InternalMessage } from './types';
import { Destination, getWorkerId, isBackground, isContent, isContext, isPassthrough, isWorker } from './destination';
import deleteAll = browser.history.deleteAll;

const HAS_BROWSER = !!globalThis.browser;

export type ListenerFunction<S> = (message: InternalMessage, sender: S) => void;
type ActorKey = 'content' | 'context' | 'background' | 'worker';

export interface ListenerConfig<S> {
  listenFrom: Set<ActorKey>;
  onMessage: ListenerFunction<S>;
  thisActor: ActorKey;
  worker?: Worker;
}

export function listen<S>(config: ListenerConfig<S>) {
  const isDestination = (dst: Destination) => {
    switch (config.thisActor) {
      case 'worker':
        return isWorker(dst);
      case 'content':
        return isContent(dst);
      case 'context':
        return isContext(dst);
      case 'background':
        return isBackground(dst);
    }
    throw new Error('Never');
  };

  const handleMessage = (message: InternalMessage, sender: S): boolean => {
    if (!isDestination(message.destination)) return false;

    if (config.thisActor === 'worker') {
      config.onMessage(message, (getWorkerId(message.destination) as any) as S);
      return true;
    } else {
      config.onMessage(message, sender);
      return !isPassthrough(message.destination);
    }
  };
  const baseHandler = (src: ActorKey, onFail?: (data: InternalMessage) => void) => (
    data: InternalMessage,
    sender: S
  ) => {
    if (typeof data !== 'object' || !(data as InternalMessage).destination) return;
    if (!handleMessage(data, sender)) {
      if (config.worker && isWorker(data.destination)) config.worker.postMessage(data);

      if (config.thisActor === 'content') {
        if (isContext(data.destination) && src !== 'context') {
          postMessage(data, '*');
        }
        if (isBackground(data.destination) && src !== 'background') {
          browser.runtime.sendMessage(data);
        }
      } else {
        onFail?.(data);
      }
    }
  };

  if (config.thisActor === 'worker') {
    const handler = baseHandler('context');
    addEventListener('message', ({ data, source }) => handler(data, (source as any) as S));
    return;
  }
  // only do stuff the worker can't do
  for (const source of config.listenFrom) {
    switch (source) {
      case 'content': {
        if (config.thisActor === 'context') {
          const handler = baseHandler('content');
          addEventListener('message', ({ data, source }) => handler(data, (source as any) as S));
        } else if (config.thisActor === 'background' && HAS_BROWSER) {
          const handler = baseHandler('content');
          browser.runtime.onMessage.addListener((msg, sender) => handler(msg, (sender as any) as S));
        } else throw new Error('invalid actor');
        break;
      }
      case 'context': {
        const handler = baseHandler('context');
        addEventListener('message', ({ data, source }) => handler(data, (source as any) as S));
        break;
      }
      case 'background': {
        const handler = baseHandler('background');
        browser.runtime.onMessage.addListener((msg, source) => handler(msg, (source as any) as S));
        break;
      }
      case 'worker': {
        if (config.worker) {
          const handler = baseHandler('worker', e => {
            // this is either context or background
            if (config.thisActor === 'context') {
              postMessage(e, '*'); // re-emit
            } else {
              browser.runtime.sendMessage(e);
            }
          });

          config.worker.addEventListener('message', ({ data, source }) => handler(data, (source as any) as S));
        }
        break;
      }
    }
  }
}
