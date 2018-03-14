// Import bot
var bot = require("./src/core").bot;

// Import twitter
var twitter = require("./src/core").twitter;

// Import funciones de servidor
require("./src/server")(bot);

// Import modulo de texto
require("./src/texto")(bot, twitter);

// Import modulo de audio
require("./src/audio")(bot);

// Import método que arranca el bot
var start = require("./src/core").run;

start();