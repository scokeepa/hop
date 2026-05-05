export type ClipboardDataForCommand = Pick<DataTransfer, 'getData' | 'setData' | 'items'>;

type ClipboardApi = Partial<Pick<Clipboard, 'read' | 'readText' | 'write' | 'writeText'>>;

export function createWritableClipboardData(): ClipboardDataForCommand {
  if (typeof DataTransfer !== 'undefined') {
    try {
      return new DataTransfer();
    } catch {
      // Fall through to the small test/runtime fallback below.
    }
  }

  const values = new Map<string, string>();
  return {
    items: [] as unknown as DataTransferItemList,
    getData: (type: string) => values.get(type) ?? '',
    setData: (type: string, value: string) => {
      values.set(type, value);
    },
  };
}

export function createSyntheticClipboardEvent(
  clipboardData: ClipboardDataForCommand,
): ClipboardEvent {
  return {
    clipboardData,
    preventDefault: () => {},
  } as unknown as ClipboardEvent;
}

export async function readClipboardDataForPaste(
  clipboard: ClipboardApi | undefined = getNavigatorClipboard(),
): Promise<ClipboardDataForCommand | null> {
  const clipboardData = createWritableClipboardData();

  try {
    if (clipboard?.read) {
      let hasClipboardData = false;
      const items = await clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          hasClipboardData = await readClipboardItemType(clipboardData, item, type) || hasClipboardData;
        }
      }
      if (hasClipboardData) return clipboardData;
    }
  } catch {
    // Fall back to readText below. Permission failures are common for toolbar paste.
  }

  try {
    if (clipboard?.readText) {
      const text = await clipboard.readText();
      if (text) {
        clipboardData.setData('text/plain', text);
        return clipboardData;
      }
    }
  } catch {
    // Let the caller fall back to the browser paste command.
  }

  return null;
}

export async function writeClipboardData(
  clipboardData: ClipboardDataForCommand,
  clipboard: ClipboardApi | undefined = getNavigatorClipboard(),
): Promise<boolean> {
  const plain = clipboardData.getData('text/plain');
  const html = clipboardData.getData('text/html');
  if (!plain && !html) return false;

  if (html && typeof ClipboardItem !== 'undefined' && clipboard?.write) {
    try {
      const itemData: Record<string, Blob> = {
        'text/html': new Blob([html], { type: 'text/html' }),
      };
      if (plain) {
        itemData['text/plain'] = new Blob([plain], { type: 'text/plain' });
      }
      await clipboard.write([new ClipboardItem(itemData)]);
      return true;
    } catch {
      // Fall through to text/plain below. Some runtimes expose write() but
      // reject HTML items, while writeText() still succeeds.
    }
  }

  try {
    if (plain && clipboard?.writeText) {
      await clipboard.writeText(plain);
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

async function readClipboardItemType(
  clipboardData: ClipboardDataForCommand,
  item: ClipboardItem,
  type: string,
): Promise<boolean> {
  try {
    const blob = await item.getType(type);
    if (type === 'text/html' || type === 'text/plain') {
      clipboardData.setData(type, await blob.text());
      return true;
    }
    if (type.startsWith('image/')) {
      return addImageBlob(clipboardData, blob, type);
    }
  } catch {
    // Some clipboard providers advertise a type but reject reading it.
    // Keep any other usable formats from the same clipboard read.
  }
  return false;
}

function addImageBlob(
  clipboardData: ClipboardDataForCommand,
  blob: Blob,
  mimeType: string,
): boolean {
  if (typeof File === 'undefined') return false;
  const add = clipboardData.items.add;
  if (typeof add !== 'function') return false;

  const file = new File([blob], `clipboard.${extensionForMime(mimeType)}`, {
    type: mimeType,
  });
  add.call(clipboardData.items, file);
  return true;
}

function extensionForMime(mimeType: string): string {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/gif') return 'gif';
  if (mimeType === 'image/webp') return 'webp';
  return 'png';
}

function getNavigatorClipboard(): ClipboardApi | undefined {
  return typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
}
