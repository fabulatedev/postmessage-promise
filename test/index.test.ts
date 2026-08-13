import { expect, test, vi } from "vitest";
import { sendMessage, onMessage, ON_MESSAGE_CALLBACK_SKIP_PROCESSING } from "../src/index.js";

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
test("sendMessage closes the request channel once it resolves", async () => {
    const channels: MessageChannel[] = [];
    const OriginalMessageChannel = window.MessageChannel;
    const closeSpies: any[] = [];
    (window as any).MessageChannel = class extends OriginalMessageChannel {
        constructor() {
            super();
            channels.push(this as unknown as MessageChannel);
            closeSpies.push(vi.spyOn(this.port1, 'close'));
        }
    };

    try {
        const target: any = {
            tagName: 'IFRAME',
            contentWindow: {
                postMessage: (_msg: any, _origin: string, transfer: MessagePort[]) =>
                    transfer[0].postMessage('World'),
            },
        };

        await expect(sendMessage(target, 'Hello')).resolves.toBe('World');

        expect(closeSpies[0]).toHaveBeenCalled();
        expect(channels[0].port1.onmessage).toBeNull();
    } finally {
        (window as any).MessageChannel = OriginalMessageChannel;
    }
});

test("sendMessage closes an unanswered channel after closeAfterMs", async () => {
    const channels: MessageChannel[] = [];
    const OriginalMessageChannel = window.MessageChannel;
    const closeSpies: any[] = [];
    (window as any).MessageChannel = class extends OriginalMessageChannel {
        constructor() {
            super();
            channels.push(this as unknown as MessageChannel);
            closeSpies.push(vi.spyOn(this.port1, 'close'));
        }
    };

    try {
        const target: any = {
            tagName: 'IFRAME',
            contentWindow: { postMessage: () => undefined },
        };

        let settled = false;
        sendMessage(target, 'Hello', { closeAfterMs: 20 }).then(
            () => { settled = true; },
            () => { settled = true; },
        );

        await new Promise(resolve => setTimeout(resolve, 80));

        expect(closeSpies[0]).toHaveBeenCalled();
        expect(settled).toBe(false);
    } finally {
        (window as any).MessageChannel = OriginalMessageChannel;
    }
});

test("sendMessage leaves the channel open while a request is pending", async () => {
    const OriginalMessageChannel = window.MessageChannel;
    const closeSpies: any[] = [];
    (window as any).MessageChannel = class extends OriginalMessageChannel {
        constructor() {
            super();
            closeSpies.push(vi.spyOn(this.port1, 'close'));
        }
    };

    try {
        const target: any = {
            tagName: 'IFRAME',
            contentWindow: { postMessage: () => undefined },
        };

        sendMessage(target, 'Hello');
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(closeSpies[0]).not.toHaveBeenCalled();
    } finally {
        (window as any).MessageChannel = OriginalMessageChannel;
    }
});

test("onMessage closes the transferred reply port after replying", async () => {
    const channel = new MessageChannel();
    const closeSpy = vi.spyOn(channel.port2, 'close');

    const unlisten = onMessage(async (data) =>
        data === 'Hello' ? 'World' : ON_MESSAGE_CALLBACK_SKIP_PROCESSING, window);

    try {
        const replied = new Promise<any>((resolve) => {
            channel.port1.onmessage = (event) => resolve(event.data);
        });

        window.dispatchEvent(new MessageEvent('message', {
            data: 'Hello',
            source: window,
            ports: [channel.port2],
        }));

        await expect(replied).resolves.toBe('World');
        expect(closeSpy).toHaveBeenCalled();
    } finally {
        unlisten();
        channel.port1.close();
    }
});

test("onMessage leaves the reply port open when the callback skips", async () => {
    const channel = new MessageChannel();
    const closeSpy = vi.spyOn(channel.port2, 'close');

    // onMessage listens on window, so every registered listener receives this
    // event and shares the one transferred port. A listener that skips must
    // leave it open for whichever listener actually owns the message.
    const unlisten = onMessage(async () => ON_MESSAGE_CALLBACK_SKIP_PROCESSING, window);

    try {
        window.dispatchEvent(new MessageEvent('message', {
            data: 'Hello',
            source: window,
            ports: [channel.port2],
        }));

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(closeSpy).not.toHaveBeenCalled();
    } finally {
        unlisten();
        channel.port1.close();
        channel.port2.close();
    }
});
