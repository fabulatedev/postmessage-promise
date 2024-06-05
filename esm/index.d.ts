import { Endpoint } from "./util";
/**
 * Listen to messages from a source frame | DOM Node.
 *
 * @param {*} cb
 * @param {*} source - optional source frame, listens to all messages if not provided.
 */
export declare function onMessage(cb: (data: any) => Promise<any> | any, source?: HTMLElement | Window, endpoint?: Endpoint): () => void;
/**
 * Send messages to a target frame.
 *
 * @param {*} target
 * @param {*} message
 * @returns Promose<Response>
 */
export declare function sendMessage(target: HTMLElement | Window, message: any, origin?: string, endpoint?: Endpoint): any;
