const SVG_NS = 'http://www.w3.org/2000/svg';

type SvgAttrValue = string | number;

export function createSvgRoot(width = '100%', height = '100%'): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.style.width = width;
  svg.style.height = height;
  svg.style.overflow = 'visible';
  return svg;
}

export function setSvgAttrs(el: SVGElement, attrs: Record<string, SvgAttrValue>): void {
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, String(value));
  }
}

export function appendSvgElement<K extends keyof SVGElementTagNameMap>(
  parent: SVGElement,
  tagName: K,
  attrs: Record<string, SvgAttrValue>,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tagName);
  setSvgAttrs(el, attrs);
  parent.appendChild(el);
  return el;
}

export function appendSvgLine(
  svg: SVGSVGElement,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options: {
    stroke?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
  } = {},
): SVGLineElement {
  return appendSvgElement(svg, 'line', {
    x1,
    y1,
    x2,
    y2,
    stroke: options.stroke ?? '#333',
    'stroke-width': options.strokeWidth ?? 2,
    ...(options.strokeDasharray ? { 'stroke-dasharray': options.strokeDasharray } : {}),
  });
}

export function createOverlayLabel(x: number, y: number, text: string): HTMLDivElement {
  const label = document.createElement('div');
  label.style.cssText =
    `position:fixed;left:${x}px;top:${y}px;` +
    'background:rgba(0,0,0,0.75);color:#fff;font-size:11px;padding:2px 6px;' +
    'border-radius:3px;white-space:nowrap;pointer-events:none';
  label.textContent = text;
  return label;
}
