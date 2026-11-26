import "./theme";
import "./globals";
import { renderArchive } from "./archive.js";
import Results from "./screen/results.js";
import Screen from "./screen/screen.js";

const archive = new Screen();
archive.id = "#archive";
archive.setTitle("Your Previous Results");
archive.setSubtitle("View the results saved on this device");
const results = new Results(() => archive.show(), undefined);
void renderArchive((chains: unknown) => results.show({ chains }));
