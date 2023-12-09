# postmessage-promise

Simple promise based post message / listener.

Uses MessageChannels under the hood.

## Usage

```js
import { onMessage, sendMessage } from 'promise-postmessage';

onMessage(
    async (event) => {
        // some async operation
        const resp = await foo(event.data);
        return resp;
    }, 

    // source frame
    window.parent 
);

const resp = await sendMessage(
    // target frame window.
    document.getElementById('iframe')
        .contentWindow

    // Message payload
    { foo: 'bar' }, 
);
```

### Example: Create a simple forwarding bridge
```js
import { onMessage, sendMessage } from 'promise-postmessage';

const frame1 = document.getElementById("frame1").contentWindow;
const frame2 = window.parent; // Or could be another child iframe.

onMessage((event) => {
    return sendMessage(frame2, event.data);
}, frame1);

onMessage((event) => {
    return sendMessage(frame1, event.data);
}, frame2);
```