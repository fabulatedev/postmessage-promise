import { expect, test, vi } from "vitest";
import { sendMessage, onMessage, offMessage } from "../src/index.js";

window.pm = { onMessage, sendMessage };

test("sendMessage/onMessage Iframe", async () => {
    const iframe = document.createElement('iframe');
    iframe.srcdoc = `
        <script type="module">
            console.log(import.meta.url);
            import { sendMessage, onMessage } from '/src/index.js';
            sendMessage(window.parent, 'Init');

            onMessage(async (message) => {
                return Promise.resolve('World');
            }, window.parent);
        </script>`;

    document.body.appendChild(iframe);

    let cb;
    const done = new Promise((resolve) => {
        cb = vi.fn(async (message) => {
            expect(message).toBe('Init');
            const response = await sendMessage(iframe.contentWindow, 'Hello');
            expect(response).toBe('World');
            resolve();
        });
        onMessage(cb, iframe);
    });
    
    await done;

    const iframe2 = document.createElement('iframe');
    iframe2.srcdoc = `
        <script type="module">
            import { sendMessage, onMessage } from '/src/index.js';
            sendMessage(window.parent, 'Init');
        </script>`;
    document.body.appendChild(iframe2);

    await new Promise(resolve => setTimeout(resolve, 1000));

    expect(cb).toHaveBeenCalledTimes(1);

    const spy = vi.spyOn(window, 'removeEventListener');
    offMessage(cb, iframe);
    expect(spy).toHaveBeenCalledTimes(1);

    try {
        sendMessage(null, 'Hello');
    } catch (e) {
        expect(e.message).toBe('No target provided to sendMessage');
    }
});

test("sendMessage/onMessage DOM Element", async () => {
    const div = document.createElement('div');
    document.body.appendChild(div);

    const done = new Promise((resolve) => {
        onMessage(async (message) => {
            expect(message).toBe('Init');
            const response = await sendMessage(div, 'Hello', null, 'parent');
            expect(response).toBe('World');
            resolve();
        }, div, 'parent');
    });


    let childCb = vi.fn(async (message) => {
        return Promise.resolve('World');
    });
    onMessage(childCb, div, 'child');

    sendMessage(div, 'Init', null, 'child');
    await done;

    offMessage(childCb, div, 'child');

    sendMessage(div, 'Hello', null, 'parent');

    await new Promise(resolve => setTimeout(resolve, 1000));

    expect(childCb).toHaveBeenCalledTimes(1);

    try {
        sendMessage(div, 'Hello', null, 'child1');
    } catch (e) {
        expect(e.message).toBe('Index is either parent or child');
    }
});