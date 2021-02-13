var fs = require("fs");

module.exports = (app) => {
    fs.readdirSync(__dirname).forEach((file) => {
        if (
            file === "index.js" ||
            file.substr(file.lastIndexOf(".") + 1) !== "js"
        )
            return;
        var name = file.substr(0, file.indexOf("."));
        require("./" + name)(app);
    });
};
