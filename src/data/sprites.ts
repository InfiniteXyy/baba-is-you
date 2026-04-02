import { useState, useEffect } from 'react';

interface FrameData {
  frame: { x: number; y: number; w: number; h: number };
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
}

interface SpritesheetJson {
  frames: Record<string, FrameData>;
  meta: { size: { w: number; h: number }; image: string };
}

// Map textureName → array of frame keys [frame0key, frame1key, frame2key]
type FrameMap = Map<string, string[]>;

let spritePromise: Promise<SpriteSheet> | null = null;

export interface SpriteSheet {
  image: HTMLImageElement;
  json: SpritesheetJson;
  frameMap: FrameMap;
}

const spriteCache = new Map<string, string>();

function buildFrameMap(json: SpritesheetJson): FrameMap {
  const map: FrameMap = new Map();
  for (const key of Object.keys(json.frames)) {
    // key = "characters/BABA_00.png"
    // Extract textureName: remove directory prefix and _NN.png suffix
    const slash = key.lastIndexOf('/');
    const withoutDir = slash >= 0 ? key.slice(slash + 1) : key;
    const match = withoutDir.match(/^(.+)_(\d{2})\.png$/);
    if (!match) continue;
    const textureName = match[1];
    const frameIdx = parseInt(match[2], 10);
    if (!map.has(textureName)) {
      map.set(textureName, []);
    }
    const frames = map.get(textureName)!;
    frames[frameIdx] = key;
  }
  return map;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function doLoad(): Promise<SpriteSheet> {
  const [json, image] = await Promise.all([
    fetch('/assets/game_sprites.json').then(r => r.json()) as Promise<SpritesheetJson>,
    loadImage('/assets/game_sprites.webp'),
  ]);
  const frameMap = buildFrameMap(json);
  return { image, json, frameMap };
}

export function loadSpriteSheet(): Promise<SpriteSheet> {
  if (!spritePromise) {
    spritePromise = doLoad();
  }
  return spritePromise;
}

export function getSpriteDataUrl(
  sheet: SpriteSheet,
  textureName: string,
  frame = 0,
  size = 48
): string | null {
  const cacheKey = `${textureName}_${frame}_${size}`;
  if (spriteCache.has(cacheKey)) return spriteCache.get(cacheKey)!;

  const frameKeys = sheet.frameMap.get(textureName);
  if (!frameKeys) return null;
  // Fall back to frame 0 if requested frame doesn't exist
  const frameKey = frameKeys[frame] ?? frameKeys[0];
  if (!frameKey) return null;

  const frameData = sheet.json.frames[frameKey];
  if (!frameData) return null;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const f = frameData.frame;
  const src = frameData.sourceSize;
  const trim = frameData.spriteSourceSize;
  const scale = size / src.w;

  if (frameData.rotated) {
    // TexturePacker rotated 90° CW: frame.w/h are ORIGINAL dimensions,
    // atlas region is (f.h × f.w). Swap source w/h when sampling.
    const dx = trim.x * scale;
    const dy = trim.y * scale;
    const dw = trim.w * scale;
    const dh = trim.h * scale;
    ctx.save();
    ctx.translate(dx + dw / 2, dy + dh / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(sheet.image, f.x, f.y, f.h, f.w, -dh / 2, -dw / 2, dh, dw);
    ctx.restore();
  } else if (frameData.trimmed) {
    const dx = trim.x * scale;
    const dy = trim.y * scale;
    const dw = trim.w * scale;
    const dh = trim.h * scale;
    ctx.drawImage(sheet.image, f.x, f.y, f.w, f.h, dx, dy, dw, dh);
  } else {
    ctx.drawImage(sheet.image, f.x, f.y, f.w, f.h, 0, 0, size, size);
  }

  const url = canvas.toDataURL();
  spriteCache.set(cacheKey, url);
  return url;
}

export function useSprites(): SpriteSheet | null {
  const [sheet, setSheet] = useState<SpriteSheet | null>(null);
  useEffect(() => {
    loadSpriteSheet().then(setSheet);
  }, []);
  return sheet;
}
