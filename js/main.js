// ===== INIT =====
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

// ===== START =====
init();
