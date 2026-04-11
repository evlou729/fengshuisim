// ===== BACKGROUND PATTERN =====
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
        ctx.fillStyle = zone.color + '55';
        ctx.fillRect(zx, zy, zw, zh);
        ctx.strokeStyle = zone.color + 'a0';
        ctx.lineWidth = 1;
        ctx.strokeRect(zx + 0.5, zy + 0.5, zw - 1, zh - 1);
        ctx.fillStyle = zone.color + 'ff';
        ctx.font = '7px "Silkscreen", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(zone.name, zx + zw / 2, zy + 10);
        ctx.fillText(zone.element, zx + zw / 2, zy + 18);
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
