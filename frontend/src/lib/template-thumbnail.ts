import { svg } from "lit";
import type { SVGTemplateResult } from "lit";
import {
  GRID_COLS,
  getRoomBounds,
  cellIsInside,
} from "./grid.js";
import { getCellColor } from "./heatmap.js";
import type { ZoneConfig } from "./zone-defaults.js";
import type { FurnitureItem } from "./furniture.js";

/**
 * Render an SVG thumbnail of a room template.
 *
 * Shows zone-colored grid cells and furniture outlines.
 * The SVG viewBox is cropped to the room bounds so it fills any container size.
 */
export function renderTemplateThumbnail(
  grid: number[],
  zoneConfigs: (ZoneConfig | null)[],
  _roomWidth: number,
  _roomDepth: number,
  _furniture: FurnitureItem[],
): SVGTemplateResult {
  const u8 = grid instanceof Uint8Array ? grid : new Uint8Array(grid);
  const bounds = getRoomBounds(u8);

  // No inside cells — return empty SVG
  if (bounds.minCol > bounds.maxCol || bounds.minRow > bounds.maxRow) {
    return svg`<svg viewBox="0 0 1 1" preserveAspectRatio="xMidYMid meet"></svg>`;
  }

  const { minCol, maxCol, minRow, maxRow } = bounds;
  const cols = maxCol - minCol + 1;
  const rows = maxRow - minRow + 1;

  const cellRects: SVGTemplateResult[] = [];
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const idx = r * GRID_COLS + c;
      const val = u8[idx];
      if (!cellIsInside(val)) continue;
      const color = getCellColor(val, zoneConfigs);
      cellRects.push(
        svg`<rect x="${c - minCol}" y="${r - minRow}" width="1" height="1" fill="${color}" />`
      );
    }
  }

  return svg`<svg viewBox="0 0 ${cols} ${rows}" preserveAspectRatio="xMidYMid meet">
    ${cellRects}
  </svg>`;
}
