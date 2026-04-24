import { describe, expect, it, vi } from 'vitest';
import { tryHandleCellSelectionClick } from './input-handler-mouse';

describe('tryHandleCellSelectionClick', () => {
  it('promotes phase 1 selection into a mouse-driven range selection on plain click', () => {
    const advanceCellSelectionPhase = vi.fn();
    const shiftSelectCell = vi.fn();
    const updateCellSelection = vi.fn();
    const focus = vi.fn();
    const preventDefault = vi.fn();

    const handled = tryHandleCellSelectionClick.call(
      {
        cursor: {
          isInCellSelectionMode: () => true,
          getCellSelectionPhase: vi.fn()
            .mockReturnValueOnce(1)
            .mockReturnValueOnce(2),
          advanceCellSelectionPhase,
          shiftSelectCell,
          ctrlToggleCell: vi.fn(),
        },
        hitTestCellRowCol: () => ({ row: 2, col: 3 }),
        updateCellSelection,
        textarea: { focus },
      },
      {
        button: 0,
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
        preventDefault,
      } as unknown as MouseEvent,
    );

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalled();
    expect(advanceCellSelectionPhase).toHaveBeenCalled();
    expect(shiftSelectCell).toHaveBeenCalledWith(2, 3);
    expect(updateCellSelection).toHaveBeenCalled();
    expect(focus).toHaveBeenCalled();
  });

  it('preserves modifier-driven selection behaviors', () => {
    const shiftSelectCell = vi.fn();
    const ctrlToggleCell = vi.fn();

    const handled = tryHandleCellSelectionClick.call(
      {
        cursor: {
          isInCellSelectionMode: () => true,
          getCellSelectionPhase: () => 2,
          advanceCellSelectionPhase: vi.fn(),
          shiftSelectCell,
          ctrlToggleCell,
        },
        hitTestCellRowCol: () => ({ row: 1, col: 1 }),
        updateCellSelection: vi.fn(),
        textarea: { focus: vi.fn() },
      },
      {
        button: 0,
        shiftKey: true,
        ctrlKey: false,
        metaKey: false,
        preventDefault: vi.fn(),
      } as unknown as MouseEvent,
    );

    expect(handled).toBe(true);
    expect(shiftSelectCell).toHaveBeenCalledWith(1, 1);
    expect(ctrlToggleCell).not.toHaveBeenCalled();
  });
});
