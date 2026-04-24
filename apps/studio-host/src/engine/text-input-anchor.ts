import type { CursorRect } from '@/core/types';

export type TextInputAnchor = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function resolveTextInputAnchorRect(
  rect: CursorRect,
  pageLeft: number,
  pageOffset: number,
  zoom: number,
  containerRect: Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'>,
  scrollLeft: number,
  scrollTop: number,
): TextInputAnchor {
  const height = Math.max(16, Math.round(rect.height * zoom));
  const width = Math.max(2, Math.round(height * 0.35));
  const rawLeft = containerRect.left + pageLeft + rect.x * zoom - scrollLeft;
  const rawTop = containerRect.top + pageOffset + rect.y * zoom - scrollTop;

  return {
    left: Math.max(containerRect.left, Math.min(rawLeft, containerRect.right - width)),
    top: Math.max(containerRect.top, Math.min(rawTop, containerRect.bottom - height)),
    width,
    height,
  };
}
