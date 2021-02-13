//
// Drawphone FirstWordLink
//

import Link from "./link.js";

class FirstWordLink extends Link {
    constructor(player) {
        super(player, false);
        this.type = "first-word";
    }
}

export default FirstWordLink;
