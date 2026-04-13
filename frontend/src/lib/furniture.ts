import { GRID_CELL_MM } from "./grid.js";

export interface FurnitureItem {
	id: string;
	type: "icon" | "svg";
	icon: string;
	label: string;
	x: number; // mm from left edge of room
	y: number; // mm from top edge of room
	width: number; // mm
	height: number; // mm
	rotation: number; // degrees
	lockAspect: boolean;
}

export interface FurnitureSticker {
	type: "icon" | "svg";
	icon: string;
	label: string;
	defaultWidth: number; // mm
	defaultHeight: number; // mm
	lockAspect?: boolean;
}

/**
 * Create a new furniture item from a sticker definition, centered in the room.
 *
 * @param sticker The sticker definition to create from
 * @param roomWidth Room width in mm
 * @param roomDepth Room depth in mm
 * @param id Unique ID for the item (pass a generated ID)
 * @returns A new FurnitureItem
 */
export function createFurnitureItem(
	sticker: FurnitureSticker,
	roomWidth: number,
	roomDepth: number,
	id: string,
): FurnitureItem {
	return {
		id,
		type: sticker.type,
		icon: sticker.icon,
		label: sticker.label,
		x: Math.max(0, (roomWidth - sticker.defaultWidth) / 2),
		y: Math.max(0, (roomDepth - sticker.defaultHeight) / 2),
		width: sticker.defaultWidth,
		height: sticker.defaultHeight,
		rotation: 0,
		lockAspect: sticker.lockAspect ?? sticker.type === "icon",
	};
}

/**
 * Remove a furniture item by ID from the list.
 *
 * @param furniture Current list of furniture items
 * @param id ID of the item to remove
 * @returns New filtered list (does not mutate original)
 */
export function removeFurnitureItem(
	furniture: FurnitureItem[],
	id: string,
): FurnitureItem[] {
	return furniture.filter((f) => f.id !== id);
}

/**
 * Update a furniture item by ID with partial updates.
 *
 * @param furniture Current list of furniture items
 * @param id ID of the item to update
 * @param updates Partial updates to apply
 * @returns New list with updated item (does not mutate original)
 */
export function updateFurnitureItem(
	furniture: FurnitureItem[],
	id: string,
	updates: Partial<FurnitureItem>,
): FurnitureItem[] {
	return furniture.map((f) => (f.id === id ? { ...f, ...updates } : f));
}

/**
 * Convert mm in room-space to px in the visible grid.
 *
 * @param mm Distance in millimetres
 * @param cellPx Width of a grid cell in pixels
 * @returns Distance in pixels
 */
export function mmToPx(mm: number, cellPx: number): number {
	return (mm / GRID_CELL_MM) * (cellPx + 1); // +1 for gap
}

/**
 * Convert px delta back to mm.
 *
 * @param px Distance in pixels
 * @param cellPx Width of a grid cell in pixels
 * @returns Distance in millimetres
 */
export function pxToMm(px: number, cellPx: number): number {
	return (px / (cellPx + 1)) * GRID_CELL_MM;
}

/**
 * Compute clamped move position for a furniture item being dragged.
 *
 * Clamps the position so the item stays within the given bounds.
 * The bounds represent the visible grid area in room-relative mm.
 *
 * @param origX Original X position (mm)
 * @param origY Original Y position (mm)
 * @param dxPx Drag delta X in pixels
 * @param dyPx Drag delta Y in pixels
 * @param cellPx Current cell pixel size
 * @param itemWidth Item width in mm
 * @param itemHeight Item height in mm
 * @param minX Minimum X bound (mm, room-relative)
 * @param maxX Maximum X bound (mm, room-relative)
 * @param minY Minimum Y bound (mm, room-relative)
 * @param maxY Maximum Y bound (mm, room-relative)
 * @returns Clamped { x, y } position in mm
 */
export function clampFurnitureMove(
	origX: number,
	origY: number,
	dxPx: number,
	dyPx: number,
	cellPx: number,
	itemWidth: number,
	itemHeight: number,
	minX: number,
	maxX: number,
	minY: number,
	maxY: number,
): { x: number; y: number } {
	const dxMm = pxToMm(dxPx, cellPx);
	const dyMm = pxToMm(dyPx, cellPx);
	return {
		x: Math.max(minX, Math.min(maxX - itemWidth, origX + dxMm)),
		y: Math.max(minY, Math.min(maxY - itemHeight, origY + dyMm)),
	};
}

/**
 * Compute resized dimensions for a furniture item.
 *
 * Supports locked-aspect (uniform) and free-form resize, with per-handle
 * direction control. The pointer delta is in screen-space pixels; this
 * function inverse-rotates it into the item's local frame so that handles
 * remain intuitive after rotation, and computes (x, y) so the visual
 * opposite edge/corner stays anchored on screen (since CSS rotation pivots
 * about the item's center).
 *
 * @param handle Resize handle id (e.g. "ne", "sw", "e", "n")
 * @param dxPx Drag delta X in screen pixels
 * @param dyPx Drag delta Y in screen pixels
 * @param cellPx Current cell pixel size
 * @param origX Original X position (mm, top-left of unrotated bounding box)
 * @param origY Original Y position (mm, top-left of unrotated bounding box)
 * @param origW Original width (mm)
 * @param origH Original height (mm)
 * @param lockAspect Whether to lock the aspect ratio
 * @param rotationDeg Item rotation in degrees (CW, matches CSS transform)
 * @returns Updated { x, y, width, height }
 */
export function computeFurnitureResize(
	handle: string,
	dxPx: number,
	dyPx: number,
	cellPx: number,
	origX: number,
	origY: number,
	origW: number,
	origH: number,
	lockAspect: boolean,
	rotationDeg: number,
): { x: number; y: number; width: number; height: number } {
	// Inverse-rotate the screen-space pointer delta into the item's local
	// (unrotated) frame, so handle directions stay intuitive after rotation.
	const rad = (rotationDeg * Math.PI) / 180;
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);
	const localDxPx = dxPx * cos + dyPx * sin;
	const localDyPx = -dxPx * sin + dyPx * cos;

	const dxMm = pxToMm(localDxPx, cellPx);
	const dyMm = pxToMm(localDyPx, cellPx);

	// Edge sign: +1 = east/south, -1 = west/north, 0 = centered (no axis).
	const sx = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0;
	const sy = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;

	let w = origW;
	let h = origH;

	if (lockAspect) {
		// Uniform scale from the dominant axis (in local frame).
		const delta = Math.abs(dxMm) > Math.abs(dyMm) ? dxMm : dyMm;
		const aspect = origW / origH;
		const sign = sx < 0 || sy < 0 ? -1 : 1;
		w = Math.max(100, origW + sign * delta);
		h = Math.max(100, w / aspect);
		w = h * aspect;
	} else {
		if (sx !== 0) w = Math.max(100, origW + sx * dxMm);
		if (sy !== 0) h = Math.max(100, origH + sy * dyMm);
	}

	const dw = w - origW;
	const dh = h - origH;

	// Compute (x, y) so the visual opposite edge/corner stays anchored on
	// screen. The opposite edge offset from the center in the local frame is
	// (-sx·w/2, -sy·h/2); requiring that point's screen position to be
	// invariant under the resize gives:
	//   x' = origX - dw/2 + R(θ)·(sx·dw/2, sy·dh/2).x
	//   y' = origY - dh/2 + R(θ)·(sx·dw/2, sy·dh/2).y
	const rdx = (sx * dw) / 2;
	const rdy = (sy * dh) / 2;
	const rotatedDx = rdx * cos - rdy * sin;
	const rotatedDy = rdx * sin + rdy * cos;

	const x = origX - dw / 2 + rotatedDx;
	const y = origY - dh / 2 + rotatedDy;

	return { x, y, width: w, height: h };
}

/**
 * Check whether a furniture item is completely outside the visible grid bounds.
 *
 * Returns true when the item's bounding box has zero overlap with the
 * grid area defined by [minX, maxX) x [minY, maxY).
 */
export function isFurnitureOutsideGrid(
	item: Pick<FurnitureItem, "x" | "y" | "width" | "height">,
	minX: number,
	maxX: number,
	minY: number,
	maxY: number,
): boolean {
	return (
		item.x + item.width <= minX ||
		item.x >= maxX ||
		item.y + item.height <= minY ||
		item.y >= maxY
	);
}

/**
 * Pick the appropriate CSS resize cursor for a handle on a rotated item.
 *
 * Browser resize cursors are bidirectional (n-resize and s-resize render
 * identically), so we only need 4 buckets and snap the visual handle angle
 * to the nearest 45° within [0°, 180°).
 *
 * @param handle Resize handle id (e.g. "n", "ne", "se")
 * @param rotationDeg Item rotation in degrees (CW, matches CSS transform)
 * @returns CSS cursor name: "ns-resize" | "ew-resize" | "nesw-resize" | "nwse-resize"
 */
export function getResizeCursor(handle: string, rotationDeg: number): string {
	const sx = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0;
	const sy = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;
	// Base angle CW from north for each handle (n=0°, ne=45°, e=90°, ...)
	const baseAngle = (Math.atan2(sx, -sy) * 180) / Math.PI;
	const wrapped = (((baseAngle + rotationDeg) % 180) + 180) % 180;
	const snapped = (Math.round(wrapped / 45) * 45) % 180;
	switch (snapped) {
		case 0:
			return "ns-resize";
		case 45:
			return "nesw-resize";
		case 90:
			return "ew-resize";
		case 135:
			return "nwse-resize";
		default:
			return "default";
	}
}

/**
 * Compute the new rotation angle for a furniture item being rotated.
 *
 * @param origRotation Original rotation in degrees
 * @param startAngle Angle from item center to pointer at drag start (degrees)
 * @param currentAngle Current angle from item center to pointer (degrees)
 * @returns New rotation angle (0-359 degrees, rounded to integer)
 */
export function computeFurnitureRotation(
	origRotation: number,
	startAngle: number,
	currentAngle: number,
): number {
	const deltaAngle = currentAngle - startAngle;
	return Math.round((origRotation + deltaAngle + 360) % 360);
}
