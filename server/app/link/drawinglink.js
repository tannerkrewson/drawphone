//
// Drawphone DrawingLink
//

import Link from "./link.js";

class DrawingLink extends Link {
    constructor(player, drawing) {
        super(player, drawing);
        this.type = "drawing";
    }
}

export default DrawingLink;
