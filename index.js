/**
 * Listen to messages from a source frame.
 * 
 * @param {*} cb 
 * @param {*} source - optional source frame, listens to all messages if not provided.
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
 * @param {*} target
 * @param {*} message  
 * @returns Promose<Response>
 */
export function sendMessage(target, message) {
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