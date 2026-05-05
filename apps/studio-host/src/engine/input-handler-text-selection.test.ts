import { describe, expect, it, vi } from 'vitest';
import {
  hitTestNearPagePoint,
  selectParagraphAtPointer,
  selectWordAtPointer,
} from './input-handler-text-selection';

describe('hitTestNearPagePoint', () => {
  it('falls back to nearby screen points after an exact miss', () => {
    const hitTest = vi.fn()
      .mockImplementationOnce(() => {
        throw new Error('miss');
      })
      .mockReturnValueOnce({ paragraphIndex: 0xFFFFFF00 })
      .mockReturnValueOnce({ sectionIndex: 0, paragraphIndex: 2, charOffset: 5 });

    const hit = hitTestNearPagePoint({ hitTest }, 0, 100, 200, 2);

    expect(hit).toEqual({ sectionIndex: 0, paragraphIndex: 2, charOffset: 5 });
    expect(hitTest).toHaveBeenNthCalledWith(1, 0, 100, 200);
    expect(hitTest).toHaveBeenNthCalledWith(2, 0, 98, 200);
    expect(hitTest).toHaveBeenNthCalledWith(3, 0, 102, 200);
  });
});

describe('selectWordAtPointer', () => {
  it('selects the word around the double-click point', () => {
    const context = createTextSelectionContext({
      hit: { sectionIndex: 0, paragraphIndex: 3, charOffset: 7 },
      text: 'Hello 월드_123!',
      length: 13,
    });

    const handled = selectWordAtPointer.call(context, pointerEvent());

    expect(handled).toBe(true);
    expect(context.cursor.clearSelection).toHaveBeenCalled();
    expect(context.cursor.moveTo).toHaveBeenNthCalledWith(1, { sectionIndex: 0, paragraphIndex: 3, charOffset: 6 });
    expect(context.cursor.setAnchor).toHaveBeenCalled();
    expect(context.cursor.moveTo).toHaveBeenNthCalledWith(2, { sectionIndex: 0, paragraphIndex: 3, charOffset: 12 });
    expect(context.updateCaret).toHaveBeenCalled();
    expect(context.textarea.focus).toHaveBeenCalled();
  });

  it('does not handle double-clicks from editor chrome', () => {
    const context = createTextSelectionContext({
      hit: { sectionIndex: 0, paragraphIndex: 3, charOffset: 7 },
      text: 'Hello 월드_123!',
      length: 13,
    });

    const handled = selectWordAtPointer.call(context, pointerEvent({
      closest: (selector: string) => selector === '#menu-bar, #icon-toolbar, #style-bar' ? {} : null,
    }));

    expect(handled).toBe(false);
    expect(context.wasm.hitTest).not.toHaveBeenCalled();
  });
});

describe('selectParagraphAtPointer', () => {
  it('selects the whole paragraph under a triple-click', () => {
    const context = createTextSelectionContext({
      hit: { sectionIndex: 0, paragraphIndex: 3, charOffset: 4 },
      text: 'Hello world',
      length: 11,
    });

    const handled = selectParagraphAtPointer.call(context, pointerEvent());

    expect(handled).toBe(true);
    expect(context.cursor.moveTo).toHaveBeenNthCalledWith(1, { sectionIndex: 0, paragraphIndex: 3, charOffset: 0 });
    expect(context.cursor.setAnchor).toHaveBeenCalled();
    expect(context.cursor.moveTo).toHaveBeenNthCalledWith(2, { sectionIndex: 0, paragraphIndex: 3, charOffset: 11 });
  });
});

function createTextSelectionContext({
  hit,
  text,
  length,
}: {
  hit: { sectionIndex: number; paragraphIndex: number; charOffset: number };
  text: string;
  length: number;
}) {
  return {
    viewportManager: { getZoom: () => 2 },
    container: {
      querySelector: () => ({
        clientWidth: 500,
        getBoundingClientRect: () => ({ left: 10, top: 20 }),
      }),
    },
    virtualScroll: {
      getPageAtY: () => 0,
      getPageOffset: () => 100,
      getPageLeft: () => null,
      getPageWidth: () => 400,
    },
    wasm: {
      hitTest: vi.fn(() => hit),
      getParagraphLength: vi.fn(() => length),
      getTextRange: vi.fn(() => text),
    },
    cursor: {
      clearSelection: vi.fn(),
      moveTo: vi.fn(),
      setAnchor: vi.fn(),
    },
    updateCaret: vi.fn(),
    textarea: { focus: vi.fn() },
  };
}

function pointerEvent(target: { closest: (selector: string) => unknown } = { closest: () => null }): MouseEvent {
  return {
    clientX: 210,
    clientY: 140,
    target,
  } as unknown as MouseEvent;
}
