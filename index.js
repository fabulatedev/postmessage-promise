/**
 * Listen to messages from a source frame.
 * 
 * @param {*} cb 
 * @param {*} source 
 */
export function onMessage(cb, source) {
    window.addEventListener('message', async (event) => {
        if (source && event.source !== source) {
            return;
        }
        const response = await cb(event);
        const port = event.ports[0];
        if (port) {
            port.postMessage(response);
        }
    });
}

/**
 * Send messages to a target frame.
 * 
 * @param {*} message 
 * @param {*} target 
 * @returns Promose<Response>
 */
export function sendMessage(message, target) {
    if (!target) {
        console.error('No target provided to sendMessage');
        return;
    }
    const channel = new MessageChannel();
    return new Promise((resolve, reject) => {
        channel.port1.onmessage = (event) => {
            resolve(event);
        };
        target.postMessage(message, '*', [channel.port2]);
    });
}