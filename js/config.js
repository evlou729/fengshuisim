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
    { name: 'Wealth',    element: 'Wood',  color: '#88a050', col: 0, row: 0 },
    { name: 'Fame',      element: 'Fire',  color: '#e09040', col: 1, row: 0 },
    { name: 'Love',      element: 'Earth', color: '#d48890', col: 2, row: 0 },
    { name: 'Family',    element: 'Wood',  color: '#80a868', col: 0, row: 1 },
    { name: 'Health',    element: 'Earth', color: '#e8b870', col: 1, row: 1 },
    { name: 'Children',  element: 'Metal', color: '#c0b498', col: 2, row: 1 },
    { name: 'Knowledge', element: 'Water', color: '#80a0b0', col: 0, row: 2 },
    { name: 'Career',    element: 'Water', color: '#3a4550', col: 1, row: 2 },
    { name: 'Travel',    element: 'Metal', color: '#a8a090', col: 2, row: 2 },
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
    { id: 'succulent',  name: 'Succulent',   w: 1, h: 1, element: 'Earth', qty: 2 },
    { id: 'lamp',       name: 'Lamp',        w: 1, h: 1, element: 'Fire',  qty: 2 },
    { id: 'rug',        name: 'Rug',         w: 2, h: 2, element: 'Earth', qty: 1 },
    { id: 'runner',     name: 'Runner',      w: 1, h: 2, element: 'Earth', qty: 1 },
    { id: 'fountain',   name: 'Fountain',    w: 1, h: 1, element: 'Water', qty: 1 },
    { id: 'candles',    name: 'Candles',     w: 1, h: 1, element: 'Fire',  qty: 2 },
    { id: 'crystal',    name: 'Crystal',     w: 1, h: 1, element: 'Earth', qty: 1 },
    { id: 'windchime',  name: 'Wind Chime',  w: 1, h: 1, element: 'Metal', qty: 1 },
];

const DRAG_THRESHOLD = 5; // pixels before mousedown becomes a drag
