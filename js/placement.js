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
