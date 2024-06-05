export function isWindow(el) {
    // detect if el is a window object type.
    return el.self === el;
}

export function isWindowOrIframe(el) {
    return isWindow(el) || el.tagName === 'IFRAME';
}

export function addMessageBusToElementIfNotPresent(el) {
    el.messageBus = el.messageBus || new MessageBus();
    return el;
}

export type Endpoint = 'parent' | 'child';

class MessageBus {
    private listeners: Function[][];

    constructor() {
        this.listeners = [[], []];
    }


    addListener(cb, endpoint: Endpoint) {
        this.#validateEndpoint(endpoint);

        const idx = this.#getIdx(endpoint);
        this.listeners[idx - 1].push(cb);
    }

    removeListener(cb, endpoint: Endpoint) {
        this.#validateEndpoint(endpoint);

        const idx = this.#getIdx(endpoint);
        const index = this.listeners[idx - 1].indexOf(cb);
        if (index > -1) {
            this.listeners[idx - 1].splice(index, 1);
        }
    }

    emit(data, endpoint: Endpoint) {
        this.#validateEndpoint(endpoint);
        const idx = this.#getIdx(endpoint);
        const listenerIdx = 1 - (idx - 1);
        const payload = structuredClone(data);
        return Promise.race(this.listeners[listenerIdx].map(cb => cb(payload)));
    }

    #getIdx(endpoint: Endpoint) {
        return endpoint === 'parent' ? 1 : 2;
    }

    #validateEndpoint(endpoint: Endpoint) {
        if (endpoint !== 'parent' && endpoint !== 'child') {
            throw new Error('Index is either parent or child');
        }
    }
}