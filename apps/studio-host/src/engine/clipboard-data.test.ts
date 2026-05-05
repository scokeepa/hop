import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  readClipboardDataForPaste,
  writeClipboardData,
  type ClipboardDataForCommand,
} from './clipboard-data';

describe('clipboard command data helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserves text, html, and image clipboard items for paste', async () => {
    vi.stubGlobal('DataTransfer', TestDataTransfer);
    vi.stubGlobal('File', TestFile);

    const clipboard = {
      read: vi.fn(async () => [
        {
          types: ['text/html', 'text/plain', 'image/png'],
          getType: async (type: string) => new Blob(
            [type === 'text/html' ? '<b>A</b>' : type === 'text/plain' ? 'A' : 'png'],
            { type },
          ),
        },
      ]),
    };

    const clipboardData = await readClipboardDataForPaste(clipboard as never);

    expect(clipboardData?.getData('text/html')).toBe('<b>A</b>');
    expect(clipboardData?.getData('text/plain')).toBe('A');
    expect((clipboardData?.items as unknown as TestDataTransferItemList).files[0]).toMatchObject({
      name: 'clipboard.png',
      type: 'image/png',
    });
  });

  it('falls back to readText when rich clipboard reads fail', async () => {
    vi.stubGlobal('DataTransfer', TestDataTransfer);
    const clipboard = {
      read: vi.fn(async () => {
        throw new Error('permission denied');
      }),
      readText: vi.fn(async () => 'plain text'),
    };

    const clipboardData = await readClipboardDataForPaste(clipboard);

    expect(clipboardData?.getData('text/plain')).toBe('plain text');
  });

  it('keeps readable formats when one advertised clipboard type fails', async () => {
    vi.stubGlobal('DataTransfer', TestDataTransfer);
    const clipboard = {
      read: vi.fn(async () => [
        {
          types: ['text/html', 'image/png', 'text/plain'],
          getType: async (type: string) => {
            if (type === 'image/png') throw new Error('image unavailable');
            return new Blob([type === 'text/html' ? '<b>A</b>' : 'A'], { type });
          },
        },
      ]),
      readText: vi.fn(async () => 'fallback'),
    };

    const clipboardData = await readClipboardDataForPaste(clipboard as never);

    expect(clipboardData?.getData('text/html')).toBe('<b>A</b>');
    expect(clipboardData?.getData('text/plain')).toBe('A');
    expect(clipboard.readText).not.toHaveBeenCalled();
  });

  it('writes rich clipboard data before falling back to plain text', async () => {
    const write = vi.fn(async () => {});
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('ClipboardItem', TestClipboardItem);

    const didWrite = await writeClipboardData(clipboardDataWith({
      'text/html': '<b>A</b>',
      'text/plain': 'A',
    }), { write, writeText });

    expect(didWrite).toBe(true);
    expect(write).toHaveBeenCalledOnce();
    expect(writeText).not.toHaveBeenCalled();
  });

  it('falls back to plain text when rich clipboard writes fail', async () => {
    const write = vi.fn(async () => {
      throw new Error('html denied');
    });
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('ClipboardItem', TestClipboardItem);

    const didWrite = await writeClipboardData(clipboardDataWith({
      'text/html': '<b>A</b>',
      'text/plain': 'A',
    }), { write, writeText });

    expect(didWrite).toBe(true);
    expect(write).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledWith('A');
  });

  it('reports write failure without mutating the document first', async () => {
    const didWrite = await writeClipboardData(clipboardDataWith({
      'text/plain': 'A',
    }), {
      writeText: vi.fn(async () => {
        throw new Error('permission denied');
      }),
    });

    expect(didWrite).toBe(false);
  });
});

function clipboardDataWith(values: Record<string, string>): ClipboardDataForCommand {
  return {
    items: [] as unknown as DataTransferItemList,
    getData: (type: string) => values[type] ?? '',
    setData: () => {},
  };
}

class TestDataTransfer {
  values = new Map<string, string>();
  items = new TestDataTransferItemList();

  getData(type: string): string {
    return this.values.get(type) ?? '';
  }

  setData(type: string, value: string): void {
    this.values.set(type, value);
  }
}

class TestDataTransferItemList {
  files: TestFile[] = [];

  add(file: TestFile): null {
    this.files.push(file);
    return null;
  }
}

class TestFile extends Blob {
  name: string;

  constructor(parts: BlobPart[], name: string, options: FilePropertyBag) {
    super(parts, options);
    this.name = name;
  }
}

class TestClipboardItem {
  constructor(readonly itemData: Record<string, Blob>) {}
}
