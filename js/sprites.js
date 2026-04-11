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

        case 'succulent':
            // Terra cotta pot - earth element
            fill(1, 6, 6, 1, '#c47a4a'); // rim
            fill(2, 7, 4, 1, '#a8654a'); // body
            fill(2, 6, 1, 1, '#8a4a30'); // rim shadow left
            fill(5, 6, 1, 1, '#8a4a30'); // rim shadow right
            // Chunky rosette of sage leaves
            fill(1, 4, 6, 1, '#5a7a48'); // widest bottom row
            fill(2, 3, 4, 1, '#6a8a58'); // mid
            fill(2, 2, 4, 1, '#7a9a68'); // upper
            fill(3, 1, 2, 1, '#8aaa78'); // tip
            // Center highlight
            fill(3, 3, 2, 1, '#8aaa78');
            fill(3, 2, 2, 1, '#a0c088');
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
