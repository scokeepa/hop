import { describe, expect, it } from 'vitest';
import { resolveTextInputAnchorRect } from './text-input-anchor';

describe('resolveTextInputAnchorRect', () => {
  it('places the IME input anchor at the visible caret position', () => {
    const anchor = resolveTextInputAnchorRect(
      { pageIndex: 0, x: 120, y: 240, height: 18 },
      30,
      40,
      1.5,
      { left: 10, top: 20, right: 810, bottom: 620 },
      15,
      50,
    );

    expect(anchor).toEqual({
      left: 205,
      top: 370,
      width: 9,
      height: 27,
    });
  });

  it('keeps the input anchor inside the viewport', () => {
    const anchor = resolveTextInputAnchorRect(
      { pageIndex: 0, x: 900, y: 900, height: 12 },
      0,
      0,
      1,
      { left: 10, top: 20, right: 110, bottom: 120 },
      0,
      0,
    );

    expect(anchor.left).toBe(104);
    expect(anchor.top).toBe(104);
    expect(anchor.width).toBe(6);
    expect(anchor.height).toBe(16);
  });
});
