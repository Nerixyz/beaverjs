import { InternalMessage } from './types';
import { Destination, getWorkerId, isBackground, isContent, isContext, isPassthrough, isWorker } from './destination';

const HAS_BROWSER = !!globalThis.browser;

export type ListenerFunction = (message: InternalMessage, worker?: number) => void;
type ActorKey = 'content' | 'context' | 'background' | 'worker';

export interface ListenerConfig {
  listenFrom: Set<ActorKey>;
  onMessage: ListenerFunction;
  thisActor: ActorKey;
  worker?: Worker;
}

export function listen(config: ListenerConfig) {
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
    throw new Error("Never");
  }

  const handleMessage = (message: InternalMessage): boolean => {
    if(!isDestination(message.destination)) return false;

    if(config.thisActor === 'worker') {
      config.onMessage(message, getWorkerId(message.destination));
      return true;
    } else {
      config.onMessage(message);
      return !isPassthrough(message.destination);
    }
  }
  const baseHandler = (src: ActorKey, onFail?: (data: InternalMessage) => void) => (data: InternalMessage) => {
    if(typeof data !== 'object' || !(data as InternalMessage).destination) return;
    if(!handleMessage(data)) {
      if(config.worker && isWorker(data.destination))
        config.worker.postMessage(data);

      if(config.thisActor === 'content') {
        if(isContext(data.destination) && src !== 'context') {
          postMessage(data, '*');
        }
        if(isBackground(data.destination) && src !== 'background') {
          browser.runtime.sendMessage(data);
        }
      } else {
        onFail?.(data);
      }
    }
  }

  if(config.thisActor === 'worker') {
    addEventListener('message', ({data}) => baseHandler('context')(data));
    return;
  }
  // only do stuff the worker can't do
  for (const source of config.listenFrom) {
    switch (source) {
      case 'content': {
        if(config.thisActor === 'context') {
          addEventListener('message', ({data}) => baseHandler('content')(data));
        } else if(config.thisActor === 'background' && HAS_BROWSER) {
            browser.runtime.onMessage.addListener(baseHandler('content'));
        } else throw new Error("invalid actor");
        break;
      }
      case 'context': {
        addEventListener('message', ({data}) => baseHandler('context')(data));
        break;
      }
      case 'background': {
        browser.runtime.onMessage.addListener(baseHandler('background'));
        break;
      }
      case 'worker': {
        if(config.worker) {
          config.worker.addEventListener('message', ({data}) => baseHandler('worker', e => {
              // this is either context or background
            if(config.thisActor === 'context') {
              postMessage(e, '*'); // re-emit
            } else {
              browser.runtime.sendMessage(e);
            }
          })(data));
        }
        break;
      }
    }
  }
}
