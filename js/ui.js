// ===== RULES POPUP =====
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

// ===== SCORE UI =====
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
