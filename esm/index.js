import { addMessageBusToElementIfNotPresent, isWindow, isWindowOrIframe } from "./util";
/**
 * Listen to messages from a source frame | DOM Node.
 *
 * @param {*} cb
 * @param {*} source - optional source frame, listens to all messages if not provided.
 */
export function onMessage(cb, source, endpoint) {
    if (!source || isWindowOrIframe(source)) {
        let sourceWindow = isWindow(source) ? source : null;
        const _callback = async (event) => {
            if (source) {
                sourceWindow = sourceWindow || source.contentWindow;
                if (sourceWindow !== event.source) {
                    return;
                }
            }
            const response = await cb(event.data);
            const port = event.ports[0];
            if (port) {
                port.postMessage(response);
            }
        };
        window.addEventListener('message', _callback);
        return () => {
            window.removeEventListener('message', _callback);
        };
    }
    else {
        addMessageBusToElementIfNotPresent(source);
        source.messageBus.addListener(cb, endpoint);
        return () => {
            source.messageBus.removeListener(cb, endpoint);
        };
    }
}
/**
 * Send messages to a target frame.
 *
 * @param {*} target
 * @param {*} message
 * @returns Promose<Response>
 */
export function sendMessage(target, message, origin, endpoint) {
    if (!target) {
        throw new Error('No target provided to sendMessage');
    }
    if (isWindowOrIframe(target)) {
        const targetWindow = isWindow(target) ? target : target.contentWindow;
        if (!targetWindow) {
            throw new Error('Target window is not available');
        }
        const channel = new MessageChannel();
        return new Promise((resolve, reject) => {
            channel.port1.onmessage = (event) => {
                resolve(event.data);
            };
            targetWindow.postMessage(message, origin || '*', [channel.port2]);
        });
    }
    addMessageBusToElementIfNotPresent(target);
    return target.messageBus.emit(message, endpoint);
}
