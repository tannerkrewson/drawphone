import "./theme";
import "./globals";

import { connect } from "./adapter";
import { game } from "../shared/game";

if (window.nova) window.nova.defineGame(game);
connect(window.nova);
