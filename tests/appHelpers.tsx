/**
 * Shared helpers for app-level tests (happy-dom + React 18 act).
 * Not a test file — imported by tests/*.test.tsx.
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { expect } from 'vitest';
import App from '../src/App';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

export interface MountedApp {
  container: HTMLDivElement;
  root: Root;
  bodyText: () => string;
  unmount: () => Promise<void>;
  waitFor: (pred: () => boolean, timeoutMs?: number) => Promise<void>;
  clickButton: (label: RegExp | string, scope?: string) => Promise<void>;
  clickByAriaLabel: (ariaLabel: string) => Promise<void>;
  setInput: (selector: string, value: string) => Promise<void>;
  setSelect: (selector: string, value: string) => Promise<void>;
}

export async function mountApp(startPath = '/'): Promise<MountedApp> {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  // Path-based routing (BrowserRouter): normalize the URL before render.
  window.history.replaceState({}, '', startPath);
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root!: Root;

  await act(async () => {
    root = createRoot(container);
    root.render(<App />);
    await Promise.resolve();
  });

  const bodyText = () => container.textContent ?? '';

  const waitFor = async (pred: () => boolean, timeoutMs = 4000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (pred()) return;
      await act(async () => {
        await new Promise((r) => setTimeout(r, 25));
      });
    }
    expect(pred(), 'waitFor condition to become true').toBe(true);
  };

  const clickButton = async (label: RegExp | string, scope = '') => {
    const selector = scope ? `${scope} button, ${scope} a` : 'button, a';
    const clickable = [...container.querySelectorAll(selector)];
    const target = clickable.find((el) => {
      const text = el.textContent ?? '';
      return typeof label === 'string' ? text.includes(label) : label.test(text);
    });
    expect(target, `button/link matching ${label}`).toBeTruthy();
    await act(async () => {
      target!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
  };

  const clickByAriaLabel = async (ariaLabel: string) => {
    const button = container.querySelector(`button[aria-label="${ariaLabel}"]`);
    expect(button, `button[aria-label=${ariaLabel}]`).toBeTruthy();
    await act(async () => {
      button!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
  };

  const setInput = async (selector: string, value: string) => {
    const input = container.querySelector(selector) as HTMLInputElement | null;
    expect(input, `input ${selector}`).toBeTruthy();
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )!.set!;
    await act(async () => {
      setter.call(input, value);
      input!.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });
  };

  const setSelect = async (selector: string, value: string) => {
    const select = container.querySelector(selector) as HTMLSelectElement | null;
    expect(select, `select ${selector}`).toBeTruthy();
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLSelectElement.prototype,
      'value',
    )!.set!;
    await act(async () => {
      setter.call(select, value);
      select!.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
  };

  return {
    container,
    root,
    bodyText,
    waitFor,
    clickButton,
    clickByAriaLabel,
    setInput,
    setSelect,
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}
