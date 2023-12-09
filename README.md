# postmessage-promise
Simple promise based post message

## Usage

```js
import { onMessage, sendMessage } from 'promise-postmessage';

onMessage(async (event) => {
    // some async operation
    const resp = await foo(event.data);
    return resp;
}, window.parent /* source frame */);

const resp = await sendMessage(
    // Message payload
    { foo: 'bar' }, 
    // target frame window.
    document.getElementById('iframe').contentWindow
);
```