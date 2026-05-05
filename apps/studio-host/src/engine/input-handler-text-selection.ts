/* eslint-disable @typescript-eslint/no-explicit-any */

import { resolveVirtualScrollPageLeft } from '../view/page-left';

const INVALID_PARAGRAPH_INDEX = 0xFFFFFF00;
const HIT_TEST_SCREEN_OFFSETS = [
  [0, 0],
  [-4, 0],
  [4, 0],
  [0, -4],
  [0, 4],
  [-8, 0],
  [8, 0],
  [0, -8],
  [0, 8],
] as const;
const WORD_CHARACTER_RE = /^[\p{L}\p{N}\p{M}_]$/u;

function isWordCharacter(char: string | undefined): boolean {
  return char !== undefined && WORD_CHARACTER_RE.test(char);
}

export function hitTestNearPagePoint(
  wasm: { hitTest: (pageIdx: number, pageX: number, pageY: number) => any },
  pageIdx: number,
  pageX: number,
  pageY: number,
  zoom: number,
): any | null {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  for (const [screenDx, screenDy] of HIT_TEST_SCREEN_OFFSETS) {
    try {
      const hit = wasm.hitTest(
        pageIdx,
        pageX + (screenDx / safeZoom),
        pageY + (screenDy / safeZoom),
      );
      if (hit && hit.paragraphIndex < INVALID_PARAGRAPH_INDEX) {
        return hit;
      }
    } catch {
      // Try the next nearby screen point.
    }
  }
  return null;
}

export function selectWordAtPointer(this: any, e: MouseEvent): boolean {
  if (isEditorChromeTarget(e.target)) {
    return false;
  }

  const resolved = resolveTextHitAtPointer.call(this, e);
  if (!resolved) return false;

  const { hit } = resolved;
  try {
    const text = getParagraphTextForHit.call(this, hit);
    const chars = Array.from(text);
    if (chars.length === 0) return false;

    let index = Math.min(hit.charOffset, chars.length - 1);
    if (!isWordCharacter(chars[index]) && index > 0 && isWordCharacter(chars[index - 1])) {
      index -= 1;
    }
    if (!isWordCharacter(chars[index])) return false;

    let startOffset = index;
    while (startOffset > 0 && isWordCharacter(chars[startOffset - 1])) {
      startOffset -= 1;
    }

    let endOffset = index + 1;
    while (endOffset < chars.length && isWordCharacter(chars[endOffset])) {
      endOffset += 1;
    }

    selectTextRange.call(this, hit, startOffset, endOffset);
    return true;
  } catch (err) {
    console.warn('[InputHandler] 단어 선택 실패:', err);
    return false;
  }
}

export function selectParagraphAtPointer(this: any, e: MouseEvent): boolean {
  if (isEditorChromeTarget(e.target)) {
    return false;
  }

  const resolved = resolveTextHitAtPointer.call(this, e);
  if (!resolved) return false;

  try {
    const length = getParagraphLengthForHit.call(this, resolved.hit);
    selectTextRange.call(this, resolved.hit, 0, length);
    return true;
  } catch (err) {
    console.warn('[InputHandler] 문단 선택 실패:', err);
    return false;
  }
}

function selectTextRange(this: any, hit: any, startOffset: number, endOffset: number): void {
  this.cursor.clearSelection();
  this.cursor.moveTo({ ...hit, charOffset: startOffset });
  this.cursor.setAnchor();
  this.cursor.moveTo({ ...hit, charOffset: endOffset });
  this.active = true;
  this.isDragging = false;
  this.updateCaret();
  this.textarea.focus();
}

function resolveTextHitAtPointer(this: any, e: MouseEvent): { hit: any } | null {
  const zoom = this.viewportManager.getZoom();
  const scrollContent = this.container.querySelector('#scroll-content');
  if (!scrollContent) return null;

  const contentRect = scrollContent.getBoundingClientRect();
  const contentX = e.clientX - contentRect.left;
  const contentY = e.clientY - contentRect.top;
  const pageIdx = this.virtualScroll.getPageAtY(contentY);
  if (pageIdx < 0) return null;

  const pageOffset = this.virtualScroll.getPageOffset(pageIdx);
  const pageLeft = resolveVirtualScrollPageLeft(
    this.virtualScroll,
    pageIdx,
    (scrollContent as HTMLElement).clientWidth,
  );
  const pageX = (contentX - pageLeft) / zoom;
  const pageY = (contentY - pageOffset) / zoom;

  const hit = hitTestNearPagePoint(this.wasm, pageIdx, pageX, pageY, zoom);
  return hit && hit.paragraphIndex < INVALID_PARAGRAPH_INDEX ? { hit } : null;
}

function getParagraphLengthForHit(this: any, hit: any): number {
  if ((hit.cellPath?.length ?? 0) > 1 && hit.parentParaIndex !== undefined) {
    return this.wasm.getCellParagraphLengthByPath(
      hit.sectionIndex,
      hit.parentParaIndex,
      JSON.stringify(hit.cellPath),
    );
  }

  if (hit.parentParaIndex !== undefined && hit.cellIndex !== undefined && hit.cellParaIndex !== undefined) {
    return this.wasm.getCellParagraphLength(
      hit.sectionIndex,
      hit.parentParaIndex,
      hit.controlIndex!,
      hit.cellIndex,
      hit.cellParaIndex,
    );
  }

  return this.wasm.getParagraphLength(hit.sectionIndex, hit.paragraphIndex);
}

function getParagraphTextForHit(this: any, hit: any): string {
  const length = getParagraphLengthForHit.call(this, hit);

  if ((hit.cellPath?.length ?? 0) > 1 && hit.parentParaIndex !== undefined) {
    return this.wasm.getTextInCellByPath(
      hit.sectionIndex,
      hit.parentParaIndex,
      JSON.stringify(hit.cellPath),
      0,
      length,
    );
  }

  if (hit.parentParaIndex !== undefined && hit.cellIndex !== undefined && hit.cellParaIndex !== undefined) {
    return this.wasm.getTextInCell(
      hit.sectionIndex,
      hit.parentParaIndex,
      hit.controlIndex!,
      hit.cellIndex,
      hit.cellParaIndex,
      0,
      length,
    );
  }

  return this.wasm.getTextRange(hit.sectionIndex, hit.paragraphIndex, 0, length);
}

function isEditorChromeTarget(target: EventTarget | null): boolean {
  const closest = (target as { closest?: (selector: string) => Element | null } | null)?.closest;
  if (typeof closest !== 'function') return false;
  return Boolean(closest.call(target, '#menu-bar, #icon-toolbar, #style-bar'));
}
