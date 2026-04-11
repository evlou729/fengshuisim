// ===== SCORING ENGINE =====
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
        if (!isPlant(def.id) && def.id !== 'fountain') return false;
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
    const plants = state.placedItems.filter(item => isPlant(FURNITURE_DEFS[item.defIndex].id));

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
            if (occupied > 7) {
                clutterZones++;
            }
        }
    }
    if (clutterZones > 0) {
        score -= 3 * clutterZones;
        tips.push('Some areas are too cluttered - spread items out');
    }

    if (total > 14) {
        score -= 6;
        tips.push('Room has too many items - consider removing some');
    } else if (total > 12) {
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

function calculateScoreQuiet() {
    const savedChiPath = state.chiPath;
    const savedHighlights = { ...state.itemHighlights };
    const result = calculateScore();
    state.chiPath = savedChiPath;
    state.itemHighlights = savedHighlights;
    return result;
}
