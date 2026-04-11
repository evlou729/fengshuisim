// ===== STATE =====
const state = {
    placedItems: [],       // { id, defIndex, x, y, w, h, rotation }
    inventory: {},         // { defId: remaining }
    selectedPlaced: null,  // placed item index or null
    mouseCell: null,       // { x, y } grid cell under mouse
    mousePos: null,        // { px, py } pixel pos relative to canvas
    drag: null,            // { source:'sidebar'|'placed', defIndex, w, h, rotation, placedId, originX, originY, originW, originH, originRot }
    showBagua: false,
    showBaguaAlways: true,
    scoreResult: null,
    nextItemId: 0,
    chiPath: null,
    itemHighlights: {},    // itemId -> 'good' | 'bad'
};

let pendingCanvasDrag = null; // { idx, startX, startY }

// ===== CANVAS =====
const canvas = document.getElementById('game-canvas');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;
const ctx = canvas.getContext('2d');

// Grid cell to pixel position
function gx2px(gx) { return IX + gx * CELL; }
function gy2py(gy) { return IY + gy * CELL; }
// Pixel to grid cell
function px2gx(px) { return Math.floor((px - IX) / CELL); }
function py2gy(py) { return Math.floor((py - IY) / CELL); }
// Chebyshev distance from grid cell to nearest cell of item footprint
function chebyshevDist(gx, gy, item) {
    const dx = Math.max(0, item.x - gx, gx - (item.x + item.w - 1));
    const dy = Math.max(0, item.y - gy, gy - (item.y + item.h - 1));
    return Math.max(dx, dy);
}

function isFloorOverlay(id) { return id === 'rug' || id === 'runner'; }
function isPlant(id) { return id === 'plant' || id === 'succulent'; }

function getBaguaZone(gx, gy) {
    const rx = gx - INTERIOR.x;
    const ry = gy - INTERIOR.y;
    if (rx < 0 || ry < 0 || rx >= INTERIOR.w || ry >= INTERIOR.h) return null;
    const zoneCol = Math.min(2, Math.floor(rx / (INTERIOR.w / 3)));
    const zoneRow = Math.min(2, Math.floor(ry / (INTERIOR.h / 3)));
    return BAGUA_ZONES.find(z => z.col === zoneCol && z.row === zoneRow);
}

function getItemCells(item) {
    const cells = [];
    for (let dx = 0; dx < item.w; dx++) {
        for (let dy = 0; dy < item.h; dy++) {
            cells.push({ x: item.x + dx, y: item.y + dy });
        }
    }
    return cells;
}

function isOccupied(gx, gy, ignoreRug) {
    for (const item of state.placedItems) {
        const def = FURNITURE_DEFS[item.defIndex];
        if (ignoreRug && isFloorOverlay(def.id)) continue;
        if (gx >= item.x && gx < item.x + item.w &&
            gy >= item.y && gy < item.y + item.h) {
            return true;
        }
    }
    return false;
}

function isAdjacentTo(item, gx, gy) {
    for (let dx = 0; dx < item.w; dx++) {
        for (let dy = 0; dy < item.h; dy++) {
            const ix = item.x + dx;
            const iy = item.y + dy;
            if ((Math.abs(ix - gx) === 1 && iy === gy) ||
                (Math.abs(iy - gy) === 1 && ix === gx)) {
                return true;
            }
        }
    }
    return false;
}

function areAdjacent(a, b) {
    for (let dx = 0; dx < a.w; dx++) {
        for (let dy = 0; dy < a.h; dy++) {
            if (isAdjacentTo(b, a.x + dx, a.y + dy)) return true;
        }
    }
    return false;
}

function findItems(defId) {
    return state.placedItems.filter(item => FURNITURE_DEFS[item.defIndex].id === defId);
}
