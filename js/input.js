// ===== INPUT =====
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
