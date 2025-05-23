import { expect, test, vi } from "vitest";
import { sendMessage, onMessage } from "../src/index.js";

test("sendMessage/onMessage Iframe", async () => {
    const iframe: HTMLIFrameElement = document.createElement('iframe');
    iframe.srcdoc = `
        <script type="module">
            console.log(import.meta.url);
            import { sendMessage, onMessage } from '/src/index';
            sendMessage(window.parent, 'Init');

            onMessage(async (message) => {
                return Promise.resolve('World');
            }, window.parent);
        </script>`;

    document.body.appendChild(iframe);

    let cb, unlisten;
    const done = new Promise<void>((resolve) => {
        cb = vi.fn(async (message) => {
            expect(message).toBe('Init');
            const response = await sendMessage(iframe.contentWindow as Window, 'Hello');
            expect(response).toBe('World');
            resolve();
        });
        unlisten = onMessage(cb, iframe);
    });

    await done;

    const iframe2 = document.createElement('iframe');
    iframe2.srcdoc = `
        <script type="module">
            import { sendMessage, onMessage } from '/src/index';
            sendMessage(window.parent, 'Init');
        </script>`;
    document.body.appendChild(iframe2);

    await new Promise(resolve => setTimeout(resolve, 1000));

    expect(cb).toHaveBeenCalledTimes(1);

    const spy = vi.spyOn(window, 'removeEventListener');
    unlisten();
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

    const done = new Promise<void>((resolve) => {
        onMessage(async (message) => {
            expect(message).toBe('Init');
            const response = await sendMessage(div, 'Hello', { endpoint: 'parent' });
            expect(response).toBe('World');
            resolve();
        }, div, 'parent');
    });


    let childCb = vi.fn(async (message) => {
        return Promise.resolve('World');
    });
    const unlistenChild = onMessage(childCb, div, 'child');

    sendMessage(div, 'Init', { endpoint: 'child' });
    await done;

    unlistenChild();

    sendMessage(div, 'Hello', { endpoint: 'parent' });

    await new Promise(resolve => setTimeout(resolve, 1000));

    expect(childCb).toHaveBeenCalledTimes(1);

    try {
        sendMessage(div, 'Hello', { endpoint: 'child1' });
    } catch (e) {
        expect(e.message).toBe('Index is either parent or child');
    }
});

test("Skip callback processing", async () => {
    const iframe: HTMLIFrameElement = document.createElement('iframe');
    iframe.srcdoc = `
        <script type="module">
            import { sendMessage, onMessage, ON_MESSAGE_CALLBACK_SKIP_PROCESSING } from '/src/index';

            sendMessage(window.parent, 'Init');

            onMessage(async (message) => {
                console.log(message);
                if (message.type === "a") {
                    return "data_for_a";
                } else {
                    return ON_MESSAGE_CALLBACK_SKIP_PROCESSING;
                }
            }, window.parent);

            onMessage(async (message) => {
                console.log(message);
                if (message.type === "b") {
                    return "data_for_b";
                } else {
                    return ON_MESSAGE_CALLBACK_SKIP_PROCESSING;
                }
            }, window.parent);
        </script>`;

    document.body.appendChild(iframe);

    const done = new Promise<void>((resolve) => {
        const cb = vi.fn(async (message) => {
            expect(message).toBe('Init');

            const response1 = await sendMessage(iframe.contentWindow as Window, { type: "a" });
            expect(response1).toBe("data_for_a");

            const response2 = await sendMessage(iframe.contentWindow as Window, { type: "b" });
            expect(response2).toBe("data_for_b");

            resolve();
        });
        onMessage(cb, iframe);
    });

    await done;
});