// src/app/lib/figmaSummarize.ts
type RGBA = { r: number; g: number; b: number; a: number };
type Paint = { type: string; opacity?: number; visible?: boolean; color?: RGBA; gradientStops?: any[]; imageRef?: string; scaleMode?: string };
type Effect = { type: string; radius?: number; color?: RGBA; offset?: { x: number; y: number }; visible?: boolean };

const clamp255 = (x: number) => Math.max(0, Math.min(255, Math.round(x * 255)));
const rgbaToHex = (rgba: RGBA) => {
  const r = clamp255(rgba.r).toString(16).padStart(2, '0');
  const g = clamp255(rgba.g).toString(16).padStart(2, '0');
  const b = clamp255(rgba.b).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`.toUpperCase();
};

const describePaints = (paints?: Paint[]) => {
  if (!paints || !paints.length) return null;
  return paints
    .filter(p => p?.type)
    .map(p => {
      if (p.type === 'SOLID' && p.color) {
        return { type: 'SOLID', color: rgbaToHex(p.color), opacity: p.opacity ?? 1 };
      }
      if (p.type?.includes('GRADIENT')) {
        return {
          type: 'GRADIENT',
          mode: p.type,
          stops: p.gradientStops?.map((s: any) => ({ pos: s.position, color: rgbaToHex(s.color) })) ?? [],
        };
      }
      if (p.type === 'IMAGE') {
        return { type: 'IMAGE', imageRef: p.imageRef ?? null, scaleMode: p.scaleMode ?? 'FILL' };
      }
      return { type: p.type };
    });
};

const describeEffects = (effects?: Effect[]) => {
  if (!effects || !effects.length) return null;
  return effects.filter(e => e?.visible !== false).map(e => {
    if (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') {
      return {
        type: e.type,
        radius: e.radius ?? 0,
        color: e.color ? rgbaToHex(e.color) : undefined,
        offset: e.offset ?? { x: 0, y: 0 },
      };
    }
    return { type: e.type, radius: (e as any).radius ?? 0 };
  });
};

// Turn a Figma document node into a compact summary for LLMs
export function nodeToLLMSummary(node: any): any {
  const box = node.absoluteBoundingBox ?? {};
  const layout = {
    layoutMode: node.layoutMode ?? null,         // HORIZONTAL | VERTICAL (auto-layout) or null
    primaryAxisSizingMode: node.primaryAxisSizingMode ?? null,   // FIXED/AUTO
    counterAxisSizingMode: node.counterAxisSizingMode ?? null,
    itemSpacing: node.itemSpacing ?? null,
    padding: {
      top: node.paddingTop ?? null,
      right: node.paddingRight ?? null,
      bottom: node.paddingBottom ?? null,
      left: node.paddingLeft ?? null,
    },
    constraints: node.constraints ?? null,       // {horizontal,vertical}
    layoutAlign: node.layoutAlign ?? null,
    layoutGrow: node.layoutGrow ?? null,
  };

  const base = {
    id: node.id,
    name: node.name,
    type: node.type,                              // FRAME, TEXT, RECTANGLE, COMPONENT, INSTANCE, etc.
    visible: node.visible !== false,
    size: { width: box.width ?? null, height: box.height ?? null },
    position: { x: box.x ?? null, y: box.y ?? null },
    cornerRadius: node.cornerRadius ?? null,
    strokes: describePaints(node.strokes),
    strokeWeight: node.strokeWeight ?? null,
    strokeAlign: node.strokeAlign ?? null,
    fills: describePaints(node.fills),
    effects: describeEffects(node.effects),
    opacity: node.opacity ?? 1,
    blendMode: node.blendMode ?? null,
    layout,
  };

  // TEXT specifics (flattened, good enough for LLM prompt)
  if (node.type === 'TEXT') {
    const style = node.style ?? {};
    return {
      ...base,
      text: {
        characters: node.characters ?? '',
        fontFamily: style.fontFamily ?? null,
        fontPostScriptName: style.fontPostScriptName ?? null,
        fontSize: style.fontSize ?? null,
        fontWeight: style.fontWeight ?? null,
        textAlignHorizontal: style.textAlignHorizontal ?? null,
        textAlignVertical: style.textAlignVertical ?? null,
        letterSpacing: style.letterSpacing ?? null,
        lineHeightPx: style.lineHeightPx ?? null,
        fill: node.fills?.[0]?.color ? rgbaToHex(node.fills[0].color) : null,
      },
    };
  }

  return base;
}

// Shallow “children overview” so LLM knows the structure without getting huge
export function summarizeChildren(children: any[] | undefined, cap = 15) {
  if (!children?.length) return [];
  return children.slice(0, cap).map((c: any) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    size: c.absoluteBoundingBox
      ? { width: c.absoluteBoundingBox.width, height: c.absoluteBoundingBox.height }
      : null,
  }));
}
