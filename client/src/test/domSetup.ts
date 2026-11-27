import { JSDOM } from 'jsdom';

let initialized = false;

export function setupDomEnvironment(): void {
  if (initialized) return;
  initialized = true;

  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost:3000/',
  });

  const win = dom.window as unknown as Window & typeof globalThis;

  Object.assign(globalThis, {
    window: win,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    HTMLInputElement: dom.window.HTMLInputElement,
    HTMLButtonElement: dom.window.HTMLButtonElement,
    HTMLSelectElement: dom.window.HTMLSelectElement,
    HTMLTextAreaElement: dom.window.HTMLTextAreaElement,
    HTMLDialogElement: dom.window.HTMLDialogElement,
    Event: dom.window.Event,
    KeyboardEvent: dom.window.KeyboardEvent,
    MouseEvent: dom.window.MouseEvent,
    CustomEvent: dom.window.CustomEvent,
    DOMException: dom.window.DOMException,
    Node: dom.window.Node,
  });

  if (typeof navigator === 'undefined') {
    Object.defineProperty(globalThis, 'navigator', {
      value: dom.window.navigator,
      configurable: true,
    });
  }

  // JSDOM does not implement HTMLDialogElement.showModal / close natively
  if (dom.window.HTMLDialogElement) {
    const proto = dom.window.HTMLDialogElement.prototype as unknown as {
      open: boolean;
      returnValue: string;
      showModal?: () => void;
      close?: () => void;
    };
    if (!proto.showModal) {
      proto.showModal = function showModal(this: HTMLDialogElement) {
        this.setAttribute('open', '');
      };
    }
    if (!proto.close) {
      proto.close = function close(this: HTMLDialogElement) {
        this.removeAttribute('open');
        this.dispatchEvent(new dom.window.Event('close'));
      };
    }
  }

  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
}

setupDomEnvironment();
