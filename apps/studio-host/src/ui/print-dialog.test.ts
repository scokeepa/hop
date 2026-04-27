import { describe, expect, it } from 'vitest';
import { isSafePrintSvgReference } from './print-dialog';

describe('isSafePrintSvgReference', () => {
  it('allows image data URIs emitted by rhwp SVG export', () => {
    expect(isSafePrintSvgReference('data:image/png;base64,AAAA')).toBe(true);
    expect(isSafePrintSvgReference('data:image/svg+xml;base64,PHN2Zy8+')).toBe(true);
  });

  it('rejects scriptable or remote references', () => {
    expect(isSafePrintSvgReference('javascript:alert(1)')).toBe(false);
    expect(isSafePrintSvgReference('https://example.com/image.png')).toBe(false);
  });
});
