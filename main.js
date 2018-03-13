// Import bot
var bot = require("./src/core").bot;
require("./src/server")(bot);
// Import método que arranca el bot
var start = require("./src/core").run;

start();