import * as upstreamKeyboard from '@upstream/engine/input-handler-keyboard';
import { sanitizeAuthoringHtml } from '@/core/font-authoring-policy';

export * from '@upstream/engine/input-handler-keyboard';

export function onPaste(this: unknown, event: ClipboardEvent): void {
  let pasteContext = isNewDocumentContext(this) ? disableInternalClipboard(this) : this;
  const clipboardData = event.clipboardData;
  if (!clipboardData) {
    upstreamKeyboard.onPaste.call(pasteContext, event);
    return;
  }

  const text = clipboardData.getData('text/plain');
  const normalizedText = normalizePastedPlainText(text);
  const html = clipboardData.getData('text/html');
  const pastePlainParagraphs = shouldPastePlainTextParagraphs(normalizedText, html, clipboardData);
  if (pastePlainParagraphs) {
    pasteContext = disableInternalClipboard(pasteContext);
  }
  const normalizedHtml = pastePlainParagraphs ? '' : normalizePastedHtmlFragment(html);
  const sanitizedHtml = sanitizeAuthoringHtml(normalizedHtml);
  if (!pastePlainParagraphs && normalizedText === text && sanitizedHtml === html) {
    upstreamKeyboard.onPaste.call(pasteContext, event);
    return;
  }

  const clipboardProxy = new Proxy(clipboardData, {
    get(target, property) {
      if (property === 'getData') {
        return (type: string) => {
          if (type === 'text/html') return sanitizedHtml;
          if (type === 'text/plain') return normalizedText;
          return target.getData(type);
        };
      }
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });

  const eventProxy = new Proxy(event, {
    get(target, property) {
      if (property === 'clipboardData') return clipboardProxy;
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  upstreamKeyboard.onPaste.call(pasteContext, eventProxy as ClipboardEvent);
}

function normalizePastedPlainText(text: string): string {
  const normalized = normalizePlainTextLineEndings(text);
  return /[^\n]\n$/.test(normalized) ? normalized.slice(0, -1) : normalized;
}

function normalizePlainTextLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function normalizePastedHtmlFragment(html: string): string {
  if (!html) return html;

  return html
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/(<(?:p|div|li|td|th)[^>]*>)[\t ]*\n[\t ]*/gi, '$1')
    .replace(/[\t ]*\n[\t ]*(<\/(?:p|div|li|td|th)>)/gi, '$1')
    .replace(/>\s*\n\s*</g, '> <');
}

function shouldPastePlainTextParagraphs(
  text: string,
  html: string,
  clipboardData: DataTransfer,
): boolean {
  if (!text.includes('\n')) return false;
  if (hasPastedImageFile(clipboardData)) return false;
  return !/<(?:table|img|svg|math)\b/i.test(html);
}

function hasPastedImageFile(clipboardData: DataTransfer): boolean {
  const items = clipboardData.items;
  if (!items) return false;
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (item.kind === 'file' && item.type.startsWith('image/')) return true;
  }
  return false;
}

function isNewDocumentContext(context: unknown): boolean {
  return Boolean((context as { wasm?: { isNewDocument?: boolean } })?.wasm?.isNewDocument);
}

function disableInternalClipboard(context: unknown): unknown {
  const target = context as object;
  return new Proxy(target, {
    get(base, property) {
      if (property === 'wasm') {
        const wasm = Reflect.get(base, property, base);
        if (!wasm || typeof wasm !== 'object') return wasm;
        return new Proxy(wasm, {
          get(wasmBase, wasmProperty) {
            if (wasmProperty === 'hasInternalClipboard' || wasmProperty === 'clipboardHasControl') {
              return () => false;
            }
            const value = Reflect.get(wasmBase, wasmProperty, wasmBase);
            return typeof value === 'function' ? value.bind(wasmBase) : value;
          },
        });
      }
      const value = Reflect.get(base, property, base);
      return typeof value === 'function' ? value.bind(base) : value;
    },
  });
}
