//
// Drawphone WordLink
//

import Link from "./link.js";

class WordLink extends Link {
    constructor(player, word) {
        super(player, word);
        this.type = "word";
    }
}

export default WordLink;
