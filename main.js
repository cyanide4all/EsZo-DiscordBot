// Import bot
var bot = require("./src/core").bot;

// Import funciones de servidor
require("./src/server")(bot);

// Import modulo de texto
require("./src/texto")(bot);

// Import modulo de audio
require("./src/audio")(bot);

// Import método que arranca el bot
var start = require("./src/core").run;

start();