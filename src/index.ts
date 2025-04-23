import { Endpoint, addMessageBusToElementIfNotPresent, isPlainObject, isWindow, isWindowOrIframe } from "./util";

/**
 * Listen to messages from a source frame | DOM Node.
 * 
 * @param {*} cb 
 * @param {*} source - optional source frame, listens to all messages if not provided.
 */
export function onMessage(cb: (data: any) => Promise<any> | any, source?: HTMLIFrameElement | HTMLElement | Window, endpoint?: Endpoint, channelId?: string) {
    if (!source || isWindowOrIframe(source)) {
        let sourceWindow = isWindow(source) ? source : null;
        const _callback = async (event) => {
            if (source) {
                sourceWindow = sourceWindow || (source as any).contentWindow;
                if (sourceWindow !== event.source) {
                    return;
                }
            }

            // Skip processing if channelId doesn't match
            if (isPlainObject(event.data) &&
                event.data.channelId &&
                event.data.channelId !== channelId) {
                return;
            }

            const response = await cb(event.data);
            const port = event.ports[0];
            if (port) {
                port.postMessage(response);
            }
        }
        window.addEventListener('message', _callback);
        return () => {
            window.removeEventListener('message', _callback);
        }
    } else {
        addMessageBusToElementIfNotPresent(source);
        (source as any).messageBus.addListener(cb, endpoint);
        return () => {
            (source as any).messageBus.removeListener(cb, endpoint);
        }
    }
}

/**
 * Send messages to a target frame.
 * 
 * @param {*} target
 * @param {*} message  
 * @returns Promose<Response>
 */
export function sendMessage(target: HTMLIFrameElement | HTMLElement | Window, message: any, options: { origin?: string, endpoint?: Endpoint, needsResponse?: boolean } = {}, channelId?: string): Promise<any> {
    if (!target) {
        throw new Error('No target provided to sendMessage');
    }

    if (isWindowOrIframe(target)) {
        const targetWindow = isWindow(target) ? target as Window : (target as HTMLIFrameElement).contentWindow;

        if (!targetWindow) {
            throw new Error('Target window is not available');
        }

        const channel = new MessageChannel();
        return new Promise((resolve, reject) => {
            channel.port1.onmessage = (event) => {
                if (options.needsResponse && !event.data) {
                    return;
                }
                resolve(event.data);
            };
            // @TODO: We are using this approach to make the library backward compatible,
            // so that if the receiving side is using older version, it does not break.
            // But, we need to use a better approach eventually, like we need to send the payload in this format:
            // targetWindow.postMessage({ message, channelId }, options.origin || '*', [channel.port2]);
            if (isPlainObject(message)) {
                message["channelId"] = channelId;
            }
            targetWindow.postMessage(message, options.origin || '*', [channel.port2]);
        });
    }

    addMessageBusToElementIfNotPresent(target);
    return (target as any).messageBus.emit(message, options.endpoint);
}