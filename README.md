# BeaverJs

This is a library to simplify the messaging between different components in the browser.
It's best used for extensions needing to communicating from different contexts.

## Usage

### Browser-Context

This is where the website is.

```typescript
import { ContextEventHandler } from 'beaverjs';

interface EventMap {
  click: undefined;
  tabChanged: string;
  store: {key: string, value: boolean};
}

const listener = new ContextEventHandler<EventMap>();

document.addEventHandler('click', () => listener.emitBackground('click'));
document.addEventHandler('playing', () => 
  listener.emitContent('store', { key: 'playing', value: true }));

listener.on('tabChanged', tabName => console.log('Tab Changed:', tabName));
```


### Content-Script

```typescript
import { ContentEventHandler } from 'beaverjs';

interface EventMap {
  click: undefined;
  tabChanged: string;
  store: { key: string, value: boolean };
}

const listener = new ContentEventHandler<EventMap>();

listener.on('store', ({key, value}) => {
  browser.storage.local.set({[key]: value});
});
```

### Background-Script

```typescript
import { BackgroundEventHandler } from 'beaverjs';

interface EventMap {
  click: undefined;
  tabChanged: string;
  store: { key: string, value: boolean };
}

const listener = new BackgroundEventHandler<EventMap>();

listener.on('click', () => console.log('click'));

browser.tabs.onUpdated.addListener((id, changeInfo, tab) => 
  listener.emit('tabChanged', tab.title));
```

