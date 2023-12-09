export function onMessage(cb) {
    window.addEventListener('message', async (event) => {
        const response = await cb(event.data);
        const port = event.ports[0];
        if (port) {
            port.postMessage(response);
        }
    });
}

export function sendMessage(message) {
    const channel = new MessageChannel();
    return new Promise((resolve, reject) => {
        channel.port1.onmessage = (event) => {
            resolve(event.data);
        };
        window.parent.postMessage(message, '*', [channel.port2]);
    });
}