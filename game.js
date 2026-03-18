// ===== CONSTANTS =====
const CELL = 64;
const GRID_W = 8;  // playable grid width in cells
const GRID_H = 6;  // playable grid height in cells
const WALL_PX = 24; // wall thickness in pixels
const CANVAS_W = WALL_PX * 2 + GRID_W * CELL;  // 560
const CANVAS_H = WALL_PX * 2 + GRID_H * CELL;  // 432
// Interior pixel bounds
const IX = WALL_PX;
const IY = WALL_PX;
// Legacy grid constants (used by placement logic — grid cell 0,0 = top-left of interior)
const COLS = GRID_W;
const ROWS = GRID_H;
const INTERIOR = { x: 0, y: 0, w: GRID_W, h: GRID_H };
const DOOR = { x: 2, y: GRID_H, w: 2, h: 1 };  // relative to interior grid
const WINDOW_POS = { x: GRID_W, y: 1, w: 1, h: 2 };
const ART_PX = 8; // 64/8 = 8px per art pixel

// Light Sources — origin is art-pixel offset of the light-emitting part
const LIGHT_SOURCES = {
    lamp:    { radius: 3, color: [240, 200, 120], intensity: 0.14, ox: 4, oy: 1 },  // lampshade
    candles: { radius: 2, color: [240, 190, 100], intensity: 0.12, ox: 4, oy: 1 },  // flames
    crystal: { radius: 2, color: [240, 160, 100], intensity: 0.12, ox: 4, oy: 2 },  // salt lamp body
};

const ELEMENTS = { WOOD: 'Wood', FIRE: 'Fire', EARTH: 'Earth', METAL: 'Metal', WATER: 'Water' };

const PRODUCTIVE_CYCLE = { Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood' };
const DESTRUCTIVE_PAIRS = [['Wood','Earth'],['Earth','Water'],['Water','Fire'],['Fire','Metal'],['Metal','Wood']];

// Bagua: 3x3 grid over interior (8x6), each zone ~2.67x2 cells
// Mapped as rows top-to-bottom, cols left-to-right
const BAGUA_ZONES = [
    { name: 'Wealth',    element: 'Wood',  color: '#606c38', col: 0, row: 0 },
    { name: 'Fame',      element: 'Fire',  color: '#bc6c25', col: 1, row: 0 },
    { name: 'Love',      element: 'Earth', color: '#a8606a', col: 2, row: 0 },
    { name: 'Family',    element: 'Wood',  color: '#5a7a48', col: 0, row: 1 },
    { name: 'Health',    element: 'Earth', color: '#dda15e', col: 1, row: 1 },
    { name: 'Children',  element: 'Metal', color: '#9a8a70', col: 2, row: 1 },
    { name: 'Knowledge', element: 'Water', color: '#5a7080', col: 0, row: 2 },
    { name: 'Career',    element: 'Water', color: '#3a4550', col: 1, row: 2 },
    { name: 'Travel',    element: 'Metal', color: '#7a7268', col: 2, row: 2 },
];

const FURNITURE_DEFS = [
    { id: 'bed',        name: 'Bed',         w: 2, h: 2, element: 'Wood',  qty: 1 },
    { id: 'nightstand', name: 'Nightstand',  w: 1, h: 1, element: 'Wood',  qty: 2 },
    { id: 'dresser',    name: 'Dresser',     w: 2, h: 1, element: 'Wood',  qty: 1 },
    { id: 'desk',       name: 'Desk',        w: 2, h: 1, element: 'Wood',  qty: 1 },
    { id: 'chair',      name: 'Chair',       w: 1, h: 1, element: 'Metal', qty: 2 },
    { id: 'bookshelf',  name: 'Bookshelf',   w: 1, h: 2, element: 'Wood',  qty: 1 },
    { id: 'mirror',     name: 'Mirror',      w: 1, h: 1, element: 'Metal', qty: 1 },
    { id: 'plant',      name: 'Plant',       w: 1, h: 1, element: 'Wood',  qty: 2 },
    { id: 'lamp',       name: 'Lamp',        w: 1, h: 1, element: 'Fire',  qty: 2 },
    { id: 'rug',        name: 'Rug',         w: 2, h: 2, element: 'Earth', qty: 1 },
    { id: 'runner',     name: 'Runner',      w: 1, h: 2, element: 'Earth', qty: 1 },
    { id: 'fountain',   name: 'Fountain',    w: 1, h: 1, element: 'Water', qty: 1 },
    { id: 'candles',    name: 'Candles',     w: 1, h: 1, element: 'Fire',  qty: 2 },
    { id: 'crystal',    name: 'Crystal',     w: 1, h: 1, element: 'Earth', qty: 1 },
    { id: 'windchime',  name: 'Wind Chime',  w: 1, h: 1, element: 'Metal', qty: 1 },
];

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

// ===== INIT =====
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

function generateBgPattern() {
    const S = 48; // cell size
    const P = 3;  // art pixel size
    // 2x2 tile: coin at (0,0) and (1,1) gives seamless checkerboard
    const pw = S * 2, ph = S * 2;
    const pc = document.createElement('canvas');
    pc.width = pw; pc.height = ph;
    const p = pc.getContext('2d');
    p.fillStyle = '#221c12';

    const ox = (S - 8 * P) / 2;
    const oy = ox;
    const coin = (cx, cy) => {
        const f = (col, row, w, h) => {
            p.fillRect(cx + ox + col * P, cy + oy + row * P, w * P, h * P);
        };
        f(2,0, 4,1);
        f(1,1, 6,1);
        f(0,2, 8,1);
        f(0,3, 3,1);
        f(5,3, 3,1);
        f(0,4, 3,1);
        f(5,4, 3,1);
        f(0,5, 8,1);
        f(1,6, 6,1);
        f(2,7, 4,1);
    };

    coin(0, 0);
    coin(S, S);

    document.body.style.backgroundImage = `url(${pc.toDataURL()})`;
    document.body.style.backgroundSize = `${pw}px ${ph}px`;
}

function init() {
    generateBgPattern();
    // Init inventory
    FURNITURE_DEFS.forEach((def, i) => {
        state.inventory[def.id] = def.qty;
    });
    buildSidebar();
    setupEvents();
    setupRulesPopup();
    updateBaguaLegend();
    gameLoop();
}

function setupRulesPopup() {
    const overlay = document.getElementById('rules-overlay');
    const btnStart = document.getElementById('btn-start');
    const btnRules = document.getElementById('btn-rules');

    btnStart.addEventListener('click', () => overlay.classList.add('hidden'));
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.add('hidden');
    });
    btnRules.addEventListener('click', () => overlay.classList.remove('hidden'));
}

// ===== SIDEBAR =====
function buildSidebar() {
    const list = document.getElementById('furniture-list');
    list.innerHTML = '';
    FURNITURE_DEFS.forEach((def, i) => {
        const div = document.createElement('div');
        div.className = 'furniture-item';
        div.dataset.index = i;

        const thumb = document.createElement('canvas');
        thumb.width = 36;
        thumb.height = 36;
        const tctx = thumb.getContext('2d');
        tctx.scale(36 / (Math.max(def.w, def.h) * CELL), 36 / (Math.max(def.w, def.h) * CELL));
        drawFurniture(tctx, def.id, 0, 0, def.w, def.h);

        const info = document.createElement('div');
        info.className = 'item-info';
        info.innerHTML = `<div class="item-name">${def.name}</div><div class="item-details">${def.w}x${def.h} ${def.element}</div>`;

        const qty = document.createElement('span');
        qty.className = 'item-qty';
        qty.id = `qty-${def.id}`;
        qty.textContent = state.inventory[def.id];

        div.appendChild(thumb);
        div.appendChild(info);
        div.appendChild(qty);

        div.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startSidebarDrag(i, e);
        });
        list.appendChild(div);
    });
}

function updateSidebar() {
    FURNITURE_DEFS.forEach((def, i) => {
        const el = document.querySelector(`.furniture-item[data-index="${i}"]`);
        const qty = document.getElementById(`qty-${def.id}`);
        if (qty) qty.textContent = state.inventory[def.id];
        if (el) {
            el.classList.toggle('depleted', state.inventory[def.id] <= 0);
            el.classList.remove('selected');
        }
    });
}

function startSidebarDrag(index, e) {
    const def = FURNITURE_DEFS[index];
    if (state.inventory[def.id] <= 0) return;
    state.selectedPlaced = null;
    state.drag = {
        source: 'sidebar',
        defIndex: index,
        w: def.w,
        h: def.h,
        rotation: 0,
        placedId: null,
        originX: null,
        originY: null,
    };
    updateMouseFromEvent(e);
    updateSidebar();
    updateSelectionInfo();
}

// ===== EVENTS =====
function cancelDrag() {
    const drag = state.drag;
    if (!drag) return;
    if (drag.source === 'placed' && drag.originX !== null) {
        const def = FURNITURE_DEFS[drag.defIndex];
        state.placedItems.push({
            id: drag.placedId,
            defIndex: drag.defIndex,
            x: drag.originX,
            y: drag.originY,
            w: drag.originW,
            h: drag.originH,
            rotation: drag.originRot,
        });
        state.inventory[def.id]--;
    }
    state.drag = null;
}

function pickUpPlacedItem(idx) {
    const item = state.placedItems[idx];
    if (!item) return;
    const def = FURNITURE_DEFS[item.defIndex];
    state.drag = {
        source: 'placed',
        defIndex: item.defIndex,
        w: item.w,
        h: item.h,
        rotation: item.rotation,
        placedId: item.id,
        originX: item.x,
        originY: item.y,
        originW: item.w,
        originH: item.h,
        originRot: item.rotation,
    };
    state.inventory[def.id]++;
    state.placedItems.splice(idx, 1);
    state.selectedPlaced = null;
    clearScoreDisplay();
    updateSidebar();
    updateSelectionInfo();
}

function updateMouseFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    state.mousePos = { px, py };
    const gx = px2gx(px);
    const gy = py2gy(py);
    if (gx >= 0 && gy >= 0 && gx < GRID_W && gy < GRID_H) {
        state.mouseCell = { x: gx, y: gy };
    } else {
        state.mouseCell = null;
    }
}

const DRAG_THRESHOLD = 5; // pixels before mousedown becomes a drag
let pendingCanvasDrag = null; // { idx, startX, startY }

function setupEvents() {
    // Track mouse position globally during drags, on canvas otherwise
    document.addEventListener('mousemove', (e) => {
        updateMouseFromEvent(e);

        // Check if pending canvas drag should activate
        if (pendingCanvasDrag && !state.drag) {
            const dx = e.clientX - pendingCanvasDrag.startX;
            const dy = e.clientY - pendingCanvasDrag.startY;
            if (Math.sqrt(dx * dx + dy * dy) >= DRAG_THRESHOLD) {
                const idx = pendingCanvasDrag.idx;
                pendingCanvasDrag = null;
                if (idx < state.placedItems.length) {
                    pickUpPlacedItem(idx);
                }
            }
        }
    });

    canvas.addEventListener('mouseleave', () => {
        if (!state.drag) {
            state.mouseCell = null;
            state.mousePos = null;
        }
    });

    // Mousedown on canvas: start pending drag or select
    canvas.addEventListener('mousedown', (e) => {
        if (state.drag) return; // already dragging from sidebar
        const cell = state.mouseCell;
        if (!cell) return;

        const idx = findPlacedAt(cell.x, cell.y);
        if (idx !== -1) {
            e.preventDefault();
            pendingCanvasDrag = { idx, startX: e.clientX, startY: e.clientY };
        } else {
            state.selectedPlaced = null;
            updateSelectionInfo();
        }
    });

    // Mouseup: drop the dragged item, or handle click on placed item
    document.addEventListener('mouseup', (e) => {
        // If we had a pending drag that didn't reach threshold, treat as click (select)
        if (pendingCanvasDrag && !state.drag) {
            const idx = pendingCanvasDrag.idx;
            pendingCanvasDrag = null;
            if (idx < state.placedItems.length) {
                state.selectedPlaced = (state.selectedPlaced === idx) ? null : idx;
                updateSelectionInfo();
            }
            return;
        }
        pendingCanvasDrag = null;

        if (!state.drag) return;
        const drag = state.drag;
        const def = FURNITURE_DEFS[drag.defIndex];
        const cell = state.mouseCell;

        let placed = false;
        if (cell) {
            placed = tryDropAt(cell.x, cell.y, drag);
        }

        if (!placed) {
            // If mouse is outside the canvas, return item to inventory
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const outsideCanvas = mx < 0 || my < 0 || mx >= canvas.width || my >= canvas.height;

            if (drag.source === 'placed' && drag.originX !== null) {
                if (outsideCanvas) {
                    // Return to inventory (inventory was already incremented on pickup)
                    clearScoreDisplay();
                } else {
                    // Snap back to original position
                    state.placedItems.push({
                        id: drag.placedId,
                        defIndex: drag.defIndex,
                        x: drag.originX,
                        y: drag.originY,
                        w: drag.originW,
                        h: drag.originH,
                        rotation: drag.originRot,
                    });
                    state.inventory[def.id]--;
                }
            }
            // sidebar drags just cancel — inventory was never decremented
        }

        state.drag = null;
        updateSidebar();
        updateSelectionInfo();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'r' || e.key === 'R') {
            if (state.drag) {
                // Rotate the drag preview
                const tmp = state.drag.w;
                state.drag.w = state.drag.h;
                state.drag.h = tmp;
                state.drag.rotation = (state.drag.rotation + 90) % 360;
            } else {
                rotateSelected();
            }
        }
        if (e.key === 'Delete' || e.key === 'Backspace') removeSelected();
        if (e.key === 'b' || e.key === 'B') {
            state.showBaguaAlways = !state.showBaguaAlways;
            updateBaguaLegend();
        }
        if (e.key === 'Escape') {
            if (state.drag) {
                cancelDrag();
                updateSidebar();
            }
            state.selectedPlaced = null;
            updateSelectionInfo();
        }
    });

    document.getElementById('btn-rotate').addEventListener('click', () => {
        if (state.drag) {
            const tmp = state.drag.w;
            state.drag.w = state.drag.h;
            state.drag.h = tmp;
            state.drag.rotation = (state.drag.rotation + 90) % 360;
        } else {
            rotateSelected();
        }
    });
    document.getElementById('btn-remove').addEventListener('click', removeSelected);
    document.getElementById('btn-deselect').addEventListener('click', () => {
        if (state.drag) {
            cancelDrag();
            updateSidebar();
        }
        state.selectedPlaced = null;
        updateSelectionInfo();
    });
    document.getElementById('btn-check').addEventListener('click', checkFengShui);
    document.getElementById('btn-clear').addEventListener('click', clearAllFurniture);
    document.getElementById('btn-bagua').addEventListener('click', () => {
        state.showBaguaAlways = !state.showBaguaAlways;
        updateBaguaLegend();
    });
}

function updateSelectionInfo() {
    const el = document.getElementById('selection-info');
    if (state.drag) {
        const def = FURNITURE_DEFS[state.drag.defIndex];
        el.textContent = `Dragging: ${def.name} (${state.drag.w}x${state.drag.h})  R=Rotate  Drop on grid to place`;
    } else if (state.selectedPlaced !== null) {
        const item = state.placedItems[state.selectedPlaced];
        if (item) {
            const def = FURNITURE_DEFS[item.defIndex];
            el.textContent = `Selected: ${def.name}  R=Rotate  Del=Remove  Drag to move`;
        } else {
            el.textContent = '';
        }
    } else {
        el.textContent = 'Drag furniture from sidebar to place';
    }
}

function isFloorOverlay(id) { return id === 'rug' || id === 'runner'; }

// ===== PLACEMENT =====
function isInBounds(gx, gy, w, h) {
    for (let dx = 0; dx < w; dx++) {
        for (let dy = 0; dy < h; dy++) {
            const cx = gx + dx;
            const cy = gy + dy;
            if (cx < INTERIOR.x || cx >= INTERIOR.x + INTERIOR.w ||
                cy < INTERIOR.y || cy >= INTERIOR.y + INTERIOR.h) {
                return false;
            }
        }
    }
    return true;
}

function canPlace(gx, gy, w, h, ignoreId) {
    if (!isInBounds(gx, gy, w, h)) return false;
    // Check collisions (rugs don't block other items)
    for (const item of state.placedItems) {
        if (ignoreId !== undefined && item.id === ignoreId) continue;
        const iDef = FURNITURE_DEFS[item.defIndex];
        if (isFloorOverlay(iDef.id)) continue;
        for (let dx = 0; dx < w; dx++) {
            for (let dy = 0; dy < h; dy++) {
                if (gx + dx >= item.x && gx + dx < item.x + item.w &&
                    gy + dy >= item.y && gy + dy < item.y + item.h) {
                    return false;
                }
            }
        }
    }
    return true;
}

function canDropAt(gx, gy, drag) {
    const def = FURNITURE_DEFS[drag.defIndex];
    if (isFloorOverlay(def.id)) {
        return isInBounds(gx, gy, drag.w, drag.h);
    }
    return canPlace(gx, gy, drag.w, drag.h);
}

function tryDropAt(gx, gy, drag) {
    const def = FURNITURE_DEFS[drag.defIndex];
    if (!canDropAt(gx, gy, drag)) return false;

    state.placedItems.push({
        id: drag.source === 'placed' ? drag.placedId : state.nextItemId++,
        defIndex: drag.defIndex,
        x: gx, y: gy,
        w: drag.w, h: drag.h,
        rotation: drag.rotation,
    });
    // Decrement inventory (sidebar drags haven't decremented yet; placed drags already incremented on pickup)
    if (drag.source === 'sidebar') {
        state.inventory[def.id]--;
    } else {
        // placed source: inventory was incremented on pickup, now decrement for the drop
        state.inventory[def.id]--;
    }
    clearScoreDisplay();
    return true;
}

function findPlacedAt(gx, gy) {
    // Find topmost non-rug item first, then rug
    for (let i = state.placedItems.length - 1; i >= 0; i--) {
        const item = state.placedItems[i];
        const def = FURNITURE_DEFS[item.defIndex];
        if (isFloorOverlay(def.id)) continue;
        if (gx >= item.x && gx < item.x + item.w &&
            gy >= item.y && gy < item.y + item.h) {
            return i;
        }
    }
    // Check rugs
    for (let i = state.placedItems.length - 1; i >= 0; i--) {
        const item = state.placedItems[i];
        const def = FURNITURE_DEFS[item.defIndex];
        if (!isFloorOverlay(def.id)) continue;
        if (gx >= item.x && gx < item.x + item.w &&
            gy >= item.y && gy < item.y + item.h) {
            return i;
        }
    }
    return -1;
}

function rotateSelected() {
    if (state.selectedPlaced === null) return;
    const item = state.placedItems[state.selectedPlaced];
    if (!item) return;
    // Swap w and h
    const newW = item.h;
    const newH = item.w;
    const def = FURNITURE_DEFS[item.defIndex];
    // Check if rotated version fits
    if (isFloorOverlay(def.id) || canPlace(item.x, item.y, newW, newH, item.id)) {
        item.w = newW;
        item.h = newH;
        item.rotation = (item.rotation + 90) % 360;
        clearScoreDisplay();
    }
    updateSelectionInfo();
}

function removeSelected() {
    if (state.selectedPlaced === null) return;
    const item = state.placedItems[state.selectedPlaced];
    if (!item) return;
    const def = FURNITURE_DEFS[item.defIndex];
    state.inventory[def.id]++;
    state.placedItems.splice(state.selectedPlaced, 1);
    state.selectedPlaced = null;
    clearScoreDisplay();
    updateSidebar();
    updateSelectionInfo();
}

// ===== RENDERING =====
function gameLoop() {
    render();
    requestAnimationFrame(gameLoop);
}

function render() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    drawFloor();
    drawWalls();
    drawDoor();
    drawWindow();

    if (state.showBaguaAlways && !state.showBagua) drawBaguaZoneTint();
    if (state.showBagua) drawBaguaOverlay();

    // Clip all item rendering to the interior
    ctx.save();
    ctx.beginPath();
    ctx.rect(IX, IY, GRID_W * CELL, GRID_H * CELL);
    ctx.clip();

    // Draw floor overlays (rugs/runners)
    for (const item of state.placedItems) {
        const def = FURNITURE_DEFS[item.defIndex];
        if (isFloorOverlay(def.id)) drawPlacedItem(item);
    }

    // Light pass
    drawGlows(state.placedItems);

    // Draw chi path if available
    if (state.chiPath) drawChiPath();

    // Draw non-floor-overlay items
    for (const item of state.placedItems) {
        const def = FURNITURE_DEFS[item.defIndex];
        if (!isFloorOverlay(def.id)) drawPlacedItem(item);
    }

    ctx.restore();

    // Draw selection highlight
    if (state.selectedPlaced !== null) {
        const item = state.placedItems[state.selectedPlaced];
        if (item) {
            ctx.strokeStyle = '#dda15e';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(gx2px(item.x) + 1, gy2py(item.y) + 1, item.w * CELL - 2, item.h * CELL - 2);
            ctx.setLineDash([]);
        }
    }

    // Draw ghost preview during drag
    if (state.drag && state.mouseCell) {
        drawGhostPreview();
    }

    // Draw cell highlight when not dragging
    if (state.mouseCell && !state.drag) {
        const { x, y } = state.mouseCell;
        if (x >= INTERIOR.x && x < INTERIOR.x + INTERIOR.w &&
            y >= INTERIOR.y && y < INTERIOR.y + INTERIOR.h) {
            ctx.fillStyle = 'rgba(221,161,94,0.12)';
            ctx.fillRect(gx2px(x), gy2py(y), CELL, CELL);
        }
    }
}

function drawFloorRegion(rx, ry, rw, rh) {
    const base = '#a27035';
    const line = '#936639';
    const plankH = CELL / 4;
    const plankW = CELL;
    const offset = CELL / 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(rx, ry, rw, rh);
    ctx.clip();

    ctx.fillStyle = base;
    ctx.fillRect(rx, ry, rw, rh);

    ctx.fillStyle = line;
    // Horizontal seams across full canvas grid so pattern is seamless
    const startRow = Math.floor(ry / plankH);
    const endRow = Math.ceil((ry + rh) / plankH);
    for (let r = startRow; r <= endRow; r++) {
        ctx.fillRect(rx, r * plankH, rw, 1);
    }
    for (let r = startRow; r < endRow; r++) {
        const rowOffset = (r % 2) * offset;
        const rowY = r * plankH;
        for (let vx = rowOffset; vx < rx + rw; vx += plankW) {
            if (vx > rx) {
                ctx.fillRect(vx, rowY, 1, plankH);
            }
        }
    }

    ctx.restore();
}

function drawFloor() {
    const ix = IX;
    const iy = IY;
    const ir = IX + GRID_W * CELL;
    const ib = IY + GRID_H * CELL;

    // Interior floor
    drawFloorRegion(ix, iy, ir - ix, ib - iy);

    // Door gap floor
    const doorLx = gx2px(DOOR.x);
    const doorRx = gx2px(DOOR.x + DOOR.w);
    drawFloorRegion(doorLx, ib, doorRx - doorLx, CANVAS_H - ib);
}

function drawWalls() {
    ctx.fillStyle = '#f3d5b5';

    const ix = IX;
    const iy = IY;
    const ir = IX + GRID_W * CELL;
    const ib = IY + GRID_H * CELL;
    const doorLx = gx2px(DOOR.x);
    const doorRx = gx2px(DOOR.x + DOOR.w);
    const winTy = gy2py(WINDOW_POS.y);
    const winBy = gy2py(WINDOW_POS.y + WINDOW_POS.h);

    // Top wall: canvas top to interior top
    ctx.fillRect(0, 0, CANVAS_W, iy);
    // Bottom wall: interior bottom to canvas bottom, with door gap
    ctx.fillRect(0, ib, doorLx, CANVAS_H - ib);
    ctx.fillRect(doorRx, ib, CANVAS_W - doorRx, CANVAS_H - ib);
    // Left wall: canvas left to interior left
    ctx.fillRect(0, 0, ix, CANVAS_H);
    // Right wall: interior right to canvas right, with window gap
    ctx.fillRect(ir, 0, CANVAS_W - ir, winTy);
    ctx.fillRect(ir, winBy, CANVAS_W - ir, CANVAS_H - winBy);

    // Inner edge lines
    ctx.fillStyle = '#d4b898';
    ctx.fillRect(ix, iy, ir - ix, 1);                  // top
    ctx.fillRect(ix, ib - 1, doorLx - ix, 1);          // bottom left of door
    ctx.fillRect(doorRx, ib - 1, ir - doorRx, 1);      // bottom right of door
    ctx.fillRect(ix, iy, 1, ib - iy);                  // left
    ctx.fillRect(ir - 1, iy, 1, ib - iy);              // right
}

function drawDoor() {
    // Door gap — floor already drawn by drawFloor
}

function drawWindow() {
    const ir = IX + GRID_W * CELL;
    const wallW = CANVAS_W - ir;
    const wy = gy2py(WINDOW_POS.y);
    const wh = WINDOW_POS.h * CELL;
    // Charcoal frame fills the window gap in the wall
    ctx.fillStyle = '#3a3a38';
    ctx.fillRect(ir, wy, wallW, wh);
    // Glass
    ctx.fillStyle = '#aec3b0';
    ctx.fillRect(ir + 4, wy + 6, wallW - 8, wh - 12);
    // Charcoal cross panes
    ctx.fillStyle = '#3a3a38';
    ctx.fillRect(ir + 4, wy + wh / 2 - 2, wallW - 8, 4);
    ctx.fillRect(ir + wallW / 2 - 2, wy + 6, 4, wh - 12);
    // Soft glow into room
    ctx.fillStyle = 'rgba(174,195,176,0.05)';
    ctx.fillRect(ir - CELL * 2, wy, CELL * 2, wh);
}

function drawGlows(items) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(IX, IY, GRID_W * CELL, GRID_H * CELL);
    ctx.clip();

    const step = CELL / 2; // half-cell rings for finer glow

    for (const item of items) {
        const def = FURNITURE_DEFS[item.defIndex];
        const cfg = LIGHT_SOURCES[def.id];
        if (!cfg) continue;

        // Light origin in canvas pixels
        const cx = gx2px(item.x) + cfg.ox * ART_PX;
        const cy = gy2py(item.y) + cfg.oy * ART_PX;
        const [r, g, b] = cfg.color;
        const maxDist = cfg.radius * CELL;
        const rings = Math.ceil(maxDist / step);

        // Draw outermost ring first, inner overwrites brighter
        for (let ring = rings; ring >= 0; ring--) {
            const dist = ring * step;
            const falloff = 1.0 - (dist / maxDist);
            if (falloff <= 0) continue;
            const alpha = cfg.intensity * falloff * falloff; // quadratic falloff

            ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
            ctx.fillRect(
                cx - dist,
                cy - dist,
                dist * 2 + step,
                dist * 2 + step
            );
        }
    }

    ctx.restore();
}

function drawBaguaZoneTint() {
    const zoneW = INTERIOR.w / 3;
    const zoneH = INTERIOR.h / 3;
    for (const zone of BAGUA_ZONES) {
        const zx = gx2px(INTERIOR.x + zone.col * zoneW);
        const zy = gy2py(INTERIOR.y + zone.row * zoneH);
        const zw = zoneW * CELL;
        const zh = zoneH * CELL;
        ctx.fillStyle = zone.color + '18';
        ctx.fillRect(zx, zy, zw, zh);
        ctx.strokeStyle = zone.color + '30';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(zx + 0.5, zy + 0.5, zw - 1, zh - 1);
        ctx.fillStyle = zone.color + '80';
        ctx.font = '7px "Silkscreen", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(zone.name, zx + zw / 2, zy + 10);
    }
}

function drawBaguaOverlay() {
    const zoneW = INTERIOR.w / 3;
    const zoneH = INTERIOR.h / 3;
    for (const zone of BAGUA_ZONES) {
        const zx = gx2px(INTERIOR.x + zone.col * zoneW);
        const zy = gy2py(INTERIOR.y + zone.row * zoneH);
        const zw = zoneW * CELL;
        const zh = zoneH * CELL;
        ctx.fillStyle = zone.color + '30';
        ctx.fillRect(zx, zy, zw, zh);
        ctx.strokeStyle = zone.color + '60';
        ctx.lineWidth = 1;
        ctx.strokeRect(zx, zy, zw, zh);
        ctx.fillStyle = zone.color + 'cc';
        ctx.font = '8px "Silkscreen", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(zone.name, zx + zw / 2, zy + 12);
        ctx.fillText(zone.element, zx + zw / 2, zy + 22);
    }
}

function drawPlacedItem(item) {
    const def = FURNITURE_DEFS[item.defIndex];
    const px = gx2px(item.x);
    const py = gy2py(item.y);

    const highlight = state.itemHighlights[item.id];
    if (highlight) {
        ctx.fillStyle = highlight === 'good' ? 'rgba(90,122,72,0.3)' : 'rgba(168,69,53,0.3)';
        ctx.fillRect(px, py, item.w * CELL, item.h * CELL);
    }

    ctx.save();
    ctx.translate(px + (item.w * CELL) / 2, py + (item.h * CELL) / 2);
    ctx.rotate((item.rotation * Math.PI) / 180);
    ctx.translate(-(def.w * CELL) / 2, -(def.h * CELL) / 2);
    drawFurniture(ctx, def.id, 0, 0, def.w, def.h);
    ctx.restore();
}

function drawGhostPreview() {
    const drag = state.drag;
    const def = FURNITURE_DEFS[drag.defIndex];
    const { w, h } = drag;
    const gx = state.mouseCell.x;
    const gy = state.mouseCell.y;

    const valid = canDropAt(gx, gy, drag);

    ctx.save();
    ctx.globalAlpha = 0.5;
    if (!valid) {
        ctx.fillStyle = 'rgba(200,60,60,0.3)';
        ctx.fillRect(gx2px(gx), gy2py(gy), w * CELL, h * CELL);
    }
    // Draw with current drag rotation
    const px = gx2px(gx);
    const py = gy2py(gy);
    ctx.translate(px + (w * CELL) / 2, py + (h * CELL) / 2);
    ctx.rotate((drag.rotation * Math.PI) / 180);
    ctx.translate(-(def.w * CELL) / 2, -(def.h * CELL) / 2);
    drawFurniture(ctx, def.id, 0, 0, def.w, def.h);
    ctx.restore();
}

function drawChiPath() {
    if (!state.chiPath || state.chiPath.length < 2) return;
    ctx.save();
    ctx.strokeStyle = '#dda15e80';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(gx2px(state.chiPath[0].x) + CELL / 2, gy2py(state.chiPath[0].y) + CELL / 2);
    for (let i = 1; i < state.chiPath.length; i++) {
        ctx.lineTo(gx2px(state.chiPath[i].x) + CELL / 2, gy2py(state.chiPath[i].y) + CELL / 2);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
}

// ===== PIXEL ART SPRITES =====
function drawFurniture(c, id, px, py, w, h) {
    const cw = w * CELL;
    const ch = h * CELL;
    const P = ART_PX;

    const fill = (x, y, fw, fh, color) => {
        c.fillStyle = color;
        c.fillRect(px + x * P, py + y * P, fw * P, fh * P);
    };

    switch (id) {
        case 'bed':
            // Frame - warm walnut
            fill(0, 0, 16, 16, '#7a6248');
            // Headboard - darker walnut, mid-century slatted
            fill(0, 0, 16, 3, '#5c4633');
            fill(1, 0, 2, 2, '#6b5540');
            fill(4, 0, 2, 2, '#6b5540');
            fill(7, 0, 2, 2, '#6b5540');
            fill(10, 0, 2, 2, '#6b5540');
            fill(13, 0, 2, 2, '#6b5540');
            // Mattress
            fill(1, 3, 14, 11, '#fefae0');
            // Pillows - warm cream
            fill(2, 3, 5, 2, '#f5f0d8');
            fill(9, 3, 5, 2, '#f5f0d8');
            // Blanket - muted sage
            fill(1, 7, 14, 7, '#8a9a70');
            fill(2, 8, 12, 1, '#96a67c');
            // Blanket fold
            fill(1, 7, 14, 1, '#788860');
            // Accent pillow (overlaps blanket edge)
            fill(5, 6, 6, 2, '#a27035');
            fill(5, 6, 1, 2, '#936639');
            fill(10, 6, 1, 2, '#936639');
            break;

        case 'nightstand':
            fill(1, 1, 6, 6, '#7a6248');
            fill(1, 1, 6, 1, '#6b5540'); // top
            fill(2, 3, 4, 1, '#5c4633'); // drawer
            fill(3, 3, 2, 1, '#dda15e'); // handle
            fill(1, 6, 1, 2, '#5c4633'); // tapered legs
            fill(6, 6, 1, 2, '#5c4633');
            break;

        case 'dresser':
            fill(0, 1, 16, 7, '#7a6248');
            fill(0, 1, 16, 1, '#6b5540'); // top
            // Drawers
            for (let dy = 0; dy < 3; dy++) {
                fill(1, 3 + dy * 2, 6, 1, '#5c4633');
                fill(9, 3 + dy * 2, 6, 1, '#5c4633');
                fill(3, 3 + dy * 2, 2, 1, '#dda15e');
                fill(11, 3 + dy * 2, 2, 1, '#dda15e');
            }
            break;

        case 'desk':
            // Mid-century desk - warm wood
            fill(0, 2, 16, 5, '#8a7258');
            fill(0, 2, 16, 1, '#7a6248'); // top
            fill(0, 5, 2, 3, '#6b5540'); // tapered left leg
            fill(14, 5, 2, 3, '#6b5540'); // tapered right leg
            // Items on desk
            fill(3, 1, 3, 1, '#3a3a38'); // laptop
            fill(10, 1, 2, 1, '#bc6c25'); // pencil cup
            break;

        case 'chair':
            // Wooden chair - walnut
            fill(2, 0, 4, 2, '#6b5540'); // back
            fill(1, 0, 1, 2, '#5c4633'); // back post left
            fill(6, 0, 1, 2, '#5c4633'); // back post right
            fill(1, 2, 6, 3, '#7a6248'); // seat
            fill(2, 2, 4, 1, '#8a7258'); // seat highlight
            fill(1, 5, 1, 3, '#5c4633'); // legs
            fill(6, 5, 1, 3, '#5c4633');
            // Accent pillow - green with ochre stripe
            fill(2, 2, 4, 2, '#8a9a70');
            fill(2, 3, 4, 1, '#c49050');
            break;

        case 'bookshelf':
            fill(1, 0, 6, 16, '#7a6248');
            fill(1, 0, 6, 1, '#6b5540'); // top
            // Shelves
            fill(1, 4, 6, 1, '#5c4633');
            fill(1, 8, 6, 1, '#5c4633');
            fill(1, 12, 6, 1, '#5c4633');
            // Books - earthy tones
            fill(2, 1, 1, 3, '#bc6c25');
            fill(3, 1, 1, 3, '#5a7a8a');
            fill(4, 2, 1, 2, '#606c38');
            fill(5, 1, 1, 3, '#dda15e');
            fill(2, 5, 1, 3, '#8a6050');
            fill(3, 5, 2, 3, '#c4607a');
            fill(5, 6, 1, 2, '#606c38');
            fill(2, 9, 2, 3, '#bc6c25');
            fill(4, 9, 1, 3, '#5a7a8a');
            fill(5, 10, 1, 2, '#dda15e');
            break;

        case 'mirror':
            // Gold/brass frame
            fill(1, 0, 6, 8, '#dda15e');
            fill(1, 0, 6, 1, '#c89050'); // top frame darker
            fill(1, 7, 6, 1, '#c89050'); // bottom frame darker
            fill(2, 1, 4, 6, '#d0ddd8'); // glass - muted
            fill(2, 1, 2, 3, '#dce8e4'); // shine
            break;

        case 'plant':
            // Bonsai pot - shallow ceramic
            fill(1, 6, 6, 2, '#8a6a4a');
            fill(2, 6, 4, 1, '#9a7a5a');
            fill(2, 7, 4, 1, '#7a5a3a');
            // Soil
            fill(2, 6, 4, 1, '#5a4a35');
            // Trunk - gnarled
            fill(3, 4, 2, 2, '#6b5540');
            fill(4, 3, 1, 2, '#5c4633');
            fill(3, 3, 1, 1, '#6b5540');
            // Canopy - layered cloud shapes
            fill(2, 1, 4, 2, '#3a6a28');
            fill(1, 1, 1, 2, '#4a7a30');
            fill(6, 1, 1, 2, '#4a7a30');
            fill(3, 0, 2, 1, '#4a7a30');
            fill(5, 2, 2, 1, '#3a6a28');
            fill(0, 2, 2, 1, '#4a7a30');
            // Highlight leaves
            fill(2, 0, 1, 1, '#5a8a40');
            fill(5, 1, 1, 1, '#5a8a40');
            break;

        case 'lamp':
            // Shade - warm linen
            fill(1, 0, 6, 4, '#e8d8b0');
            fill(2, 0, 4, 1, '#dcc8a0');
            // Stem - charcoal
            fill(3, 4, 2, 3, '#3a3a38');
            // Base - charcoal
            fill(2, 7, 4, 1, '#2a2a28');
            break;

        case 'rug':
            // Persian rug 2x2 - earthy terra cotta and ochre (16x16 art pixels)
            fill(0, 0, 16, 16, '#a8654a');
            fill(1, 1, 14, 14, '#955840');
            // Outer border
            fill(1, 1, 14, 1, '#c49050');
            fill(1, 14, 14, 1, '#c49050');
            fill(1, 1, 1, 14, '#c49050');
            fill(14, 1, 1, 14, '#c49050');
            // Inner border
            fill(2, 2, 12, 1, '#704030');
            fill(2, 13, 12, 1, '#704030');
            fill(2, 2, 1, 12, '#704030');
            fill(13, 2, 1, 12, '#704030');
            // Inner field
            fill(3, 3, 10, 10, '#a8654a');
            // Central medallion
            fill(5, 5, 6, 6, '#c49050');
            fill(6, 6, 4, 4, '#955840');
            fill(7, 7, 2, 2, '#c49050');
            // Corner motifs
            fill(3, 3, 2, 2, '#c49050');
            fill(11, 3, 2, 2, '#c49050');
            fill(3, 11, 2, 2, '#c49050');
            fill(11, 11, 2, 2, '#c49050');
            // Side accents
            fill(7, 3, 2, 1, '#704030');
            fill(7, 12, 2, 1, '#704030');
            fill(3, 7, 1, 2, '#704030');
            fill(12, 7, 1, 2, '#704030');
            // Tassels
            for (let tx = 1; tx < 15; tx += 2) {
                fill(tx, 0, 1, 1, '#c49050');
                fill(tx, 15, 1, 1, '#c49050');
            }
            for (let tx = 2; tx < 15; tx += 4) {
                fill(tx, 0, 1, 1, '#a8654a');
                fill(tx, 15, 1, 1, '#a8654a');
            }
            break;

        case 'fountain':
            // Ceramic basin - earthy walnut
            fill(1, 4, 6, 4, '#7a6248');
            fill(2, 5, 4, 2, '#aec3b0'); // water (window green)
            fill(3, 1, 2, 4, '#5c4633'); // pillar
            fill(2, 0, 4, 2, '#7a6248'); // top bowl
            fill(3, 0, 2, 1, '#6b5540'); // bowl rim
            // Water drops
            fill(3, 3, 1, 1, '#c8daca');
            fill(4, 2, 1, 1, '#c8daca');
            // Basin rim highlight
            fill(1, 4, 6, 1, '#8a7258');
            break;

        case 'candles':
            // Candle bodies - warm ivory
            fill(1, 3, 2, 5, '#f0e8d0');
            fill(5, 4, 2, 4, '#f0e8d0');
            // Wicks
            fill(2, 2, 1, 1, '#3a3a38');
            fill(6, 3, 1, 1, '#3a3a38');
            // Flames
            fill(2, 1, 1, 1, '#dda15e');
            fill(1, 0, 1, 1, '#e8c080');
            fill(6, 2, 1, 1, '#dda15e');
            fill(5, 1, 1, 1, '#e8c080');
            // Plate - charcoal
            fill(0, 7, 8, 1, '#3a3a38');
            break;

        case 'crystal':
            // Himalayan salt lamp
            fill(3, 2, 2, 5, '#d4764a');
            fill(2, 3, 1, 3, '#e08a5a');
            fill(5, 3, 1, 3, '#c06840');
            fill(3, 1, 1, 2, '#e8a070');
            fill(4, 0, 1, 3, '#e08a5a');
            // Warm glow
            fill(2, 1, 1, 1, '#f0c8a0');
            fill(5, 4, 1, 1, '#f0c8a0');
            // Base - charcoal
            fill(2, 7, 4, 1, '#3a3a38');
            break;

        case 'windchime':
            // Top bar - gold/brass
            fill(1, 0, 6, 1, '#dda15e');
            // Strings and chimes - charcoal + gold
            fill(2, 1, 1, 3, '#5a5a58');
            fill(2, 4, 1, 2, '#dda15e');
            fill(4, 1, 1, 2, '#5a5a58');
            fill(4, 3, 1, 3, '#c89050');
            fill(6, 1, 1, 4, '#5a5a58');
            fill(6, 5, 1, 2, '#dda15e');
            // Center piece
            fill(3, 1, 1, 5, '#5a5a58');
            fill(3, 6, 2, 2, '#c89050');
            break;

        case 'runner':
            // Runner rug 1x2 - green, charcoal ring, yellow center (8x16)
            fill(0, 0, 8, 16, '#8a9a70');
            // Charcoal ring one pixel from edge
            fill(1, 1, 6, 1, '#3a3a38');
            fill(1, 14, 6, 1, '#3a3a38');
            fill(1, 1, 1, 14, '#3a3a38');
            fill(6, 1, 1, 14, '#3a3a38');
            // Green fill inside ring
            fill(2, 2, 4, 12, '#8a9a70');
            // Yellow rectangle in center
            fill(2, 5, 4, 6, '#c49050');
            // Tassels
            for (let tx = 0; tx < 8; tx += 2) {
                fill(tx, 0, 1, 1, '#c49050');
                fill(tx, 15, 1, 1, '#c49050');
            }
            break;

    }
}

// ===== SCORING ENGINE =====
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

function bfsPath(startX, startY, endCells) {
    const visited = new Set();
    const queue = [{ x: startX, y: startY, path: [{ x: startX, y: startY }] }];
    visited.add(`${startX},${startY}`);

    const endSet = new Set(endCells.map(c => `${c.x},${c.y}`));

    while (queue.length > 0) {
        const { x, y, path } = queue.shift();
        if (endSet.has(`${x},${y}`)) return path;

        for (const [nx, ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) {
            const key = `${nx},${ny}`;
            if (visited.has(key)) continue;
            if (nx < INTERIOR.x || nx >= INTERIOR.x + INTERIOR.w ||
                ny < INTERIOR.y || ny >= INTERIOR.y + INTERIOR.h) {
                // Allow door cells
                if (!(nx >= DOOR.x && nx < DOOR.x + DOOR.w && ny === DOOR.y)) continue;
            }
            if (isOccupied(nx, ny, true)) continue;
            visited.add(key);
            queue.push({ x: nx, y: ny, path: [...path, { x: nx, y: ny }] });
        }
    }
    return null;
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

// Category 1: Command Position
function scoreCommandPosition() {
    let score = 0;
    const tips = [];
    const bed = findItems('bed')[0];
    if (!bed) {
        tips.push('Place a bed - it is the most important piece!');
        return { score: 0, max: 20, tips };
    }

    const bedCells = getItemCells(bed);
    const doorCells = [{ x: DOOR.x, y: DOOR.y }, { x: DOOR.x + 1, y: DOOR.y }];

    // Bed can see the door (not blocked by tall furniture in line of sight)
    // Simplified: bed is not in a corner completely away from door view
    const bedCenterX = bed.x + bed.w / 2;
    const bedCenterY = bed.y + bed.h / 2;
    const doorCenterX = DOOR.x + DOOR.w / 2;
    const doorCenterY = DOOR.y + DOOR.h / 2;

    // Can see door: there's a rough line of sight
    let canSeeDoor = true;
    const steps = 20;
    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const cx = Math.floor(bedCenterX * (1 - t) + doorCenterX * t);
        const cy = Math.floor(bedCenterY * (1 - t) + doorCenterY * t);
        // Check if a non-bed, non-rug item blocks this cell
        for (const item of state.placedItems) {
            const def = FURNITURE_DEFS[item.defIndex];
            if (isFloorOverlay(def.id) || def.id === 'bed') continue;
            if (cx >= item.x && cx < item.x + item.w &&
                cy >= item.y && cy < item.y + item.h) {
                // Only tall items block: bookshelf, dresser
                if (def.id === 'bookshelf' || def.id === 'dresser') {
                    canSeeDoor = false;
                }
            }
        }
    }
    if (canSeeDoor) {
        score += 8;
    } else {
        tips.push('Move the bed so it has a clear view of the door');
    }

    // Bed NOT in direct line with door
    const bedInDoorLine = bed.x < DOOR.x + DOOR.w && bed.x + bed.w > DOOR.x;
    if (!bedInDoorLine) {
        score += 7;
    } else {
        // Check coffin position: bed directly facing door
        const bedBottom = bed.y + bed.h;
        if (bedInDoorLine && bedBottom >= INTERIOR.y + INTERIOR.h) {
            score -= 10;
            tips.push('COFFIN POSITION! Move bed out of direct line with door');
        } else {
            tips.push('Move bed out of direct alignment with the door (columns 3-4)');
        }
    }

    // Headboard against wall
    if (bed.y === INTERIOR.y || bed.x === INTERIOR.x ||
        bed.x + bed.w === INTERIOR.x + INTERIOR.w) {
        score += 5;
    } else {
        tips.push('Push the headboard against a wall for stability');
    }

    return { score: Math.max(0, score), max: 20, tips };
}

// Category 2: Chi Flow
function scoreChiFlow() {
    let score = 0;
    const tips = [];

    const doorEntryCells = [
        { x: DOOR.x, y: DOOR.y },
        { x: DOOR.x + 1, y: DOOR.y }
    ];

    // Door cells unblocked
    let doorBlocked = false;
    for (const dc of doorEntryCells) {
        // Check the cell just inside the room
        if (isOccupied(dc.x, INTERIOR.y + INTERIOR.h - 1, true)) {
            doorBlocked = true;
        }
    }
    if (!doorBlocked) {
        score += 5;
    } else {
        score -= 8;
        tips.push('The door entry is blocked! Clear the cells in front of the door');
    }

    // Clear BFS path from door to bed
    const bed = findItems('bed')[0];
    if (bed) {
        const bedCells = getItemCells(bed);
        // Find adjacent walkable cells next to bed
        const bedAdj = [];
        for (const bc of bedCells) {
            for (const [nx, ny] of [[bc.x-1,bc.y],[bc.x+1,bc.y],[bc.x,bc.y-1],[bc.x,bc.y+1]]) {
                if (!isOccupied(nx, ny, true) &&
                    nx >= INTERIOR.x && nx < INTERIOR.x + INTERIOR.w &&
                    ny >= INTERIOR.y && ny < INTERIOR.y + INTERIOR.h) {
                    bedAdj.push({ x: nx, y: ny });
                }
            }
        }
        const path = bfsPath(DOOR.x, INTERIOR.y + INTERIOR.h - 1, bedAdj.length > 0 ? bedAdj : bedCells);
        if (path) {
            score += 5;
            state.chiPath = path;
        } else {
            tips.push('Create a clear path from the door to the bed');
            state.chiPath = null;
        }

        // Bed accessible from at least one side
        if (bedAdj.length > 0) {
            score += 2;
        } else {
            tips.push('The bed should be accessible from at least one side');
        }
    }

    // Door entry corridor clear (3 cells deep)
    let corridorClear = true;
    for (let dy = 0; dy < 3; dy++) {
        const cy = INTERIOR.y + INTERIOR.h - 1 - dy;
        if (cy < INTERIOR.y) break;
        for (let dx = 0; dx < DOOR.w; dx++) {
            if (isOccupied(DOOR.x + dx, cy, true)) {
                corridorClear = false;
            }
        }
    }
    if (corridorClear) {
        score += 3;
    } else if (!doorBlocked) {
        tips.push('Keep the corridor in front of the door clear (3 cells deep)');
    }

    return { score: Math.max(0, score), max: 15, tips };
}

// Category 3: Bagua Harmony
function scoreBaguaHarmony() {
    let score = 0;
    const tips = [];
    let matchCount = 0;

    for (const item of state.placedItems) {
        const def = FURNITURE_DEFS[item.defIndex];
        const cells = getItemCells(item);
        for (const cell of cells) {
            const zone = getBaguaZone(cell.x, cell.y);
            if (!zone) continue;
            // Element match
            if (def.element === zone.element && matchCount < 5) {
                score += 2;
                matchCount++;
                state.itemHighlights[item.id] = 'good';
            }
            // Destructive clash
            for (const [a, b] of DESTRUCTIVE_PAIRS) {
                if ((def.element === a && zone.element === b) ||
                    (def.element === b && zone.element === a)) {
                    score -= 1;
                    if (score >= -3) {
                        state.itemHighlights[item.id] = 'bad';
                    }
                    break;
                }
            }
            break; // only check first cell per item
        }
    }

    // Plant/fountain in Wealth zone
    const wealthZone = BAGUA_ZONES.find(z => z.name === 'Wealth');
    const wealthItems = state.placedItems.filter(item => {
        const def = FURNITURE_DEFS[item.defIndex];
        if (def.id !== 'plant' && def.id !== 'fountain') return false;
        const zone = getBaguaZone(item.x, item.y);
        return zone && zone.name === 'Wealth';
    });
    if (wealthItems.length > 0) {
        score += 2;
    } else {
        tips.push('Place a plant or fountain in the Wealth zone (top-left)');
    }

    // Paired items in Love zone
    const loveItems = state.placedItems.filter(item => {
        const zone = getBaguaZone(item.x, item.y);
        return zone && zone.name === 'Love';
    });
    if (loveItems.length >= 2) {
        score += 3;
    } else {
        tips.push('Place paired items in the Love zone (top-right)');
    }

    return { score: Math.max(0, Math.min(15, score)), max: 15, tips };
}

// Category 4: Element Balance
function scoreElementBalance() {
    let score = 0;
    const tips = [];
    const counts = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };

    for (const item of state.placedItems) {
        const def = FURNITURE_DEFS[item.defIndex];
        counts[def.element]++;
    }

    const total = state.placedItems.length;
    const represented = Object.values(counts).filter(c => c > 0).length;

    if (represented === 5) {
        score += 5;
    } else {
        const missing = Object.entries(counts).filter(([,c]) => c === 0).map(([e]) => e);
        tips.push(`Missing elements: ${missing.join(', ')}`);
    }

    // No element > 40% of items
    if (total > 0) {
        const overRepresented = Object.entries(counts).filter(([, c]) => c / total > 0.4);
        if (overRepresented.length === 0) {
            score += 3;
        } else {
            tips.push(`Too much ${overRepresented[0][0]} element - add variety`);
        }
    }

    // Productive cycle adjacency
    let hasProductiveAdj = false;
    for (let i = 0; i < state.placedItems.length; i++) {
        for (let j = i + 1; j < state.placedItems.length; j++) {
            const a = state.placedItems[i];
            const b = state.placedItems[j];
            const eA = FURNITURE_DEFS[a.defIndex].element;
            const eB = FURNITURE_DEFS[b.defIndex].element;
            if (areAdjacent(a, b)) {
                if (PRODUCTIVE_CYCLE[eA] === eB || PRODUCTIVE_CYCLE[eB] === eA) {
                    hasProductiveAdj = true;
                }
            }
        }
    }
    if (hasProductiveAdj) {
        score += 2;
    } else if (total >= 2) {
        tips.push('Place items of adjacent elements next to each other (Wood->Fire->Earth->Metal->Water)');
    }

    return { score: Math.min(10, score), max: 10, tips };
}

// Category 5: Bed Symmetry
function scoreBedSymmetry() {
    let score = 0;
    const tips = [];
    const bed = findItems('bed')[0];
    if (!bed) return { score: 0, max: 10, tips: ['Place a bed first'] };

    const nightstands = findItems('nightstand');
    const lamps = findItems('lamp');

    // Check nightstands adjacent to bed on opposite sides (any orientation)
    const bedAdj = (item) => areAdjacent(item, bed);
    const leftOf = (item) => item.x + item.w <= bed.x;
    const rightOf = (item) => item.x >= bed.x + bed.w;
    const above = (item) => item.y + item.h <= bed.y;
    const below = (item) => item.y >= bed.y + bed.h;

    // Adjacent nightstands grouped by which side of the bed
    const nsLeft = nightstands.filter(n => bedAdj(n) && leftOf(n));
    const nsRight = nightstands.filter(n => bedAdj(n) && rightOf(n));
    const nsAbove = nightstands.filter(n => bedAdj(n) && above(n));
    const nsBelow = nightstands.filter(n => bedAdj(n) && below(n));

    // Symmetry: opposite sides have matching nightstands
    const hasLR = nsLeft.length > 0 && nsRight.length > 0;
    const hasTB = nsAbove.length > 0 && nsBelow.length > 0;

    // For flanking checks below, use left/right adjacency
    const leftAdj = (item) => bedAdj(item) && leftOf(item);
    const rightAdj = (item) => bedAdj(item) && rightOf(item);

    if (hasLR || hasTB) {
        score += 5;
    } else if (nsLeft.length > 0 || nsRight.length > 0 || nsAbove.length > 0 || nsBelow.length > 0) {
        score -= 2;
        tips.push('Add a matching nightstand on the other side of the bed');
    } else {
        tips.push('Place nightstands on both sides of the bed');
    }

    const lampLeft = lamps.filter(l => leftAdj(l) || nsLeft.some(n => areAdjacent(n, l)));
    const lampRight = lamps.filter(l => rightAdj(l) || nsRight.some(n => areAdjacent(n, l)));

    if (lampLeft.length > 0 && lampRight.length > 0) {
        score += 3;
    } else if (lamps.length >= 2) {
        tips.push('Place matching lamps on both sides of the bed');
    }

    // Any matching pair flanking bed
    const defCounts = {};
    for (const item of state.placedItems) {
        const def = FURNITURE_DEFS[item.defIndex];
        if (def.id === 'bed') continue;
        if (leftAdj(item)) {
            defCounts[def.id] = defCounts[def.id] || { left: 0, right: 0 };
            defCounts[def.id].left++;
        }
        if (rightAdj(item)) {
            defCounts[def.id] = defCounts[def.id] || { left: 0, right: 0 };
            defCounts[def.id].right++;
        }
    }
    const hasPair = Object.values(defCounts).some(c => c.left > 0 && c.right > 0);
    if (hasPair) score += 2;

    return { score: Math.max(0, Math.min(10, score)), max: 10, tips };
}

// Category 6: Mirror Placement
function scoreMirrorPlacement() {
    let score = 0;
    const tips = [];
    const mirrors = findItems('mirror');
    if (mirrors.length === 0) return { score: 5, max: 10, tips: ['Consider adding a mirror'] };

    const mirror = mirrors[0];
    const bed = findItems('bed')[0];

    // Mirror NOT facing bed (directly in same column)
    let facesBed = false;
    if (bed) {
        const mCenterX = mirror.x + 0.5;
        if (mCenterX >= bed.x && mCenterX < bed.x + bed.w) facesBed = true;
    }

    if (facesBed) {
        score -= 8;
        tips.push('AVOID: Mirror facing the bed causes restless sleep!');
        state.itemHighlights[mirror.id] = 'bad';
    } else {
        score += 6;
    }

    // Mirror reflects window
    const windowCells = [];
    for (let dy = 0; dy < WINDOW_POS.h; dy++) {
        windowCells.push({ x: WINDOW_POS.x, y: WINDOW_POS.y + dy });
    }
    // Mirror on same row as window and facing it
    const reflectsWindow = windowCells.some(wc =>
        mirror.y === wc.y && mirror.x < wc.x
    );
    if (reflectsWindow) {
        score += 4;
        state.itemHighlights[mirror.id] = state.itemHighlights[mirror.id] || 'good';
    } else {
        tips.push('Position mirror to reflect the window for more light');
    }

    // Mirror faces door
    const facesDoor = (mirror.x >= DOOR.x && mirror.x < DOOR.x + DOOR.w) &&
                       mirror.y < DOOR.y;
    if (facesDoor) {
        score -= 3;
        tips.push('Avoid placing mirror directly facing the door');
    }

    return { score: Math.max(0, Math.min(10, score)), max: 10, tips };
}

// Category 7: Plants
function scorePlants() {
    let score = 0;
    const tips = [];
    const plants = findItems('plant');

    if (plants.length === 0) {
        tips.push('Add at least one plant for vitality');
        return { score: 0, max: 10, tips };
    }

    score += 3;

    // Plant in Wealth zone
    const plantInWealth = plants.some(p => {
        const zone = getBaguaZone(p.x, p.y);
        return zone && zone.name === 'Wealth';
    });
    if (plantInWealth) {
        score += 3;
    } else {
        tips.push('Place a plant in the Wealth zone (top-left) for prosperity');
    }

    // Plant in Family zone
    const plantInFamily = plants.some(p => {
        const zone = getBaguaZone(p.x, p.y);
        return zone && zone.name === 'Family';
    });
    if (plantInFamily) {
        score += 2;
    }

    // Plant near window (within 2 cells of window wall)
    const plantNearWindow = plants.some(p =>
        p.x >= GRID_W - 2
    );
    if (plantNearWindow) {
        score += 2;
    } else {
        tips.push('Place a plant near the window for natural energy');
    }

    // Plant directly next to bed (penalty)
    const bed = findItems('bed')[0];
    if (bed) {
        const plantNextToBed = plants.some(p => areAdjacent(p, bed));
        if (plantNextToBed) {
            score -= 1;
            tips.push('Plants too close to bed can disrupt sleep energy');
        }
    }

    return { score: Math.max(0, Math.min(10, score)), max: 10, tips };
}

// Category 8: Clutter
function scoreClutter() {
    let score = 10;
    const tips = [];
    const total = state.placedItems.length;

    // Check 3x3 areas for overcrowding
    let clutterZones = 0;
    for (let y = INTERIOR.y; y <= INTERIOR.y + INTERIOR.h - 3; y++) {
        for (let x = INTERIOR.x; x <= INTERIOR.x + INTERIOR.w - 3; x++) {
            let occupied = 0;
            for (let dy = 0; dy < 3; dy++) {
                for (let dx = 0; dx < 3; dx++) {
                    if (isOccupied(x + dx, y + dy, false)) occupied++;
                }
            }
            if (occupied > 6) {
                clutterZones++;
            }
        }
    }
    if (clutterZones > 0) {
        score -= 3 * clutterZones;
        tips.push('Some areas are too cluttered - spread items out');
    }

    if (total > 12) {
        score -= 6;
        tips.push('Room has too many items - consider removing some');
    } else if (total > 10) {
        score -= 2;
        tips.push('Room is getting crowded');
    }

    if (total < 3) {
        score -= 5;
        tips.push('Room needs more furniture for balanced energy');
    }

    return { score: Math.max(0, Math.min(10, score)), max: 10, tips };
}

function calculateScore() {
    state.chiPath = null;
    state.itemHighlights = {};

    const categories = [
        { name: 'Command Position', fn: scoreCommandPosition },
        { name: 'Chi Flow', fn: scoreChiFlow },
        { name: 'Bagua Harmony', fn: scoreBaguaHarmony },
        { name: 'Element Balance', fn: scoreElementBalance },
        { name: 'Bed Symmetry', fn: scoreBedSymmetry },
        { name: 'Mirror Placement', fn: scoreMirrorPlacement },
        { name: 'Plants', fn: scorePlants },
        { name: 'Clutter', fn: scoreClutter },
    ];

    const results = categories.map(cat => {
        const result = cat.fn();
        return { name: cat.name, ...result };
    });

    const total = results.reduce((sum, r) => sum + r.score, 0);
    const max = results.reduce((sum, r) => sum + r.max, 0);

    let tier;
    if (total >= 90) tier = 'Grand Master';
    else if (total >= 75) tier = 'Excellent';
    else if (total >= 60) tier = 'Good';
    else if (total >= 40) tier = 'Needs Work';
    else if (total >= 20) tier = 'Disharmony';
    else tier = 'Chi Catastrophe';

    return { total, max, tier, categories: results };
}

// ===== SCORE UI =====
function calculateScoreQuiet() {
    const savedChiPath = state.chiPath;
    const savedHighlights = { ...state.itemHighlights };
    const result = calculateScore();
    state.chiPath = savedChiPath;
    state.itemHighlights = savedHighlights;
    return result;
}

function updateLiveScore() {
    if (state.placedItems.length === 0) {
        document.getElementById('score-value').textContent = '--';
        document.getElementById('score-tier').textContent = 'Place furniture and check!';
        document.getElementById('score-tier').style.color = '';
        return;
    }
    const result = calculateScoreQuiet();
    document.getElementById('score-value').textContent = result.total;
    const tierEl = document.getElementById('score-tier');
    tierEl.textContent = result.tier;
    tierEl.style.color = result.total >= 75 ? '#dda15e' :
                         result.total >= 40 ? '#bc6c25' : '#a84535';
}

function checkFengShui() {
    // Toggle off if already showing
    if (state.showBagua && state.scoreResult) {
        state.showBagua = false;
        state.itemHighlights = {};
        state.chiPath = null;
        updateBaguaLegend();
        return;
    }
    state.showBagua = true;
    updateBaguaLegend();
    const result = calculateScore();
    state.scoreResult = result;
    displayScore(result);
    document.getElementById('score-value').classList.add('checked');
}

function displayScore(result) {
    document.getElementById('score-value').textContent = result.total;

    const tierEl = document.getElementById('score-tier');
    tierEl.textContent = result.tier;
    tierEl.style.color = result.total >= 75 ? '#dda15e' :
                         result.total >= 40 ? '#bc6c25' : '#a84535';

    const breakdown = document.getElementById('score-breakdown');
    breakdown.innerHTML = '';

    for (const cat of result.categories) {
        const div = document.createElement('div');
        div.className = 'score-category';
        const pct = cat.max > 0 ? (cat.score / cat.max) * 100 : 0;
        const barClass = pct >= 60 ? 'good' : pct >= 30 ? 'ok' : 'bad';

        div.innerHTML = `
            <div class="score-cat-header">
                <span class="score-cat-name">${cat.name}</span>
                <span class="score-cat-value">${cat.score}/${cat.max}</span>
            </div>
            <div class="score-bar">
                <div class="score-bar-fill ${barClass}" style="width: ${Math.max(0, pct)}%"></div>
            </div>
        `;
        breakdown.appendChild(div);
    }

    // Tips
    const allTips = result.categories.flatMap(c => c.tips);
    const tipsList = document.getElementById('tips-list');
    tipsList.innerHTML = '';
    const shownTips = allTips.slice(0, 6);
    for (const tip of shownTips) {
        const li = document.createElement('li');
        li.textContent = tip;
        tipsList.appendChild(li);
    }
    if (shownTips.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'Perfect harmony achieved!';
        li.style.color = '#dda15e';
        tipsList.appendChild(li);
    }
}

function clearAllFurniture() {
    for (const item of state.placedItems) {
        const def = FURNITURE_DEFS[item.defIndex];
        state.inventory[def.id]++;
    }
    state.placedItems = [];
    state.selectedPlaced = null;
    state.drag = null;
    clearScoreDisplay();
    updateSidebar();
    updateSelectionInfo();
}

function updateBaguaLegend() {
    document.getElementById('bagua-legend').classList.toggle('visible',
        state.showBaguaAlways || state.showBagua);
}

function clearScoreDisplay() {
    state.scoreResult = null;
    state.showBagua = false;
    state.chiPath = null;
    state.itemHighlights = {};
    updateBaguaLegend();
    document.getElementById('score-value').classList.remove('checked');
    document.getElementById('score-breakdown').innerHTML = '';
    document.getElementById('tips-list').innerHTML = '';
    updateLiveScore();
}

// ===== START =====
init();
