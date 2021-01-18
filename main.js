// Import bot
var bot = require("./src/core").bot;

// Import twitter
var twitter = require("./src/core").twitter;

// Import riot
var riot = require("./src/core").riot;

// Import firebase
var firebaseDatabase = require("./src/core").firebaseDatabase

// Import funciones de servidor
require("./src/server")(bot);

// Import modulo de peticiones interactivas
require("./src/peticiones")(bot);

// Import modulo de texto
require("./src/texto")(bot, twitter);

// Import modulo de audio
require("./src/audio")(bot);

// Import modulo de lel
require("./src/league")(bot, riot, firebaseDatabase);

// Import método que arranca el bot
var start = require("./src/core").run;

start();