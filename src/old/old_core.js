//Config del bot, bien desde archivo o servidor
var CONFIG = require("../config/config.json");
// Import the discord.js module
const Discord = require("discord.js");
// Import twitter
var Twitter = require("twitter-node-client").Twitter;
// Import riot api
var RiotRequest = require("riot-lol-api");
//Inicializacion del cliente de discord
const client = new Discord.Client();
// Inicialización de firebase
var firebase = require("firebase");

//Cuando el bot hace sus cosas pasa esto:
client.on("ready", () => {
  console.log("Doing some gud' ol' barrel rolls...");
});

// Token para la conexion y asociacion al bot
const token = process.env.discordToken || CONFIG.discordToken;

//CONFIG twitter
var twitter = new Twitter({
  consumerKey: process.env.twitterConsumerKey || CONFIG.twitterConsumerKey,
  consumerSecret:
    process.env.twitterConsumerSecret || CONFIG.twitterConsumerSecret,
  accessToken: process.env.twitterAccessToken || CONFIG.twitterAccessToken,
  accessTokenSecret:
    process.env.twitterAccessTokenSecret || CONFIG.twitterAccessTokenSecret,
  callBackUrl: process.env.twitterCallBackUrl || CONFIG.twitterCallBackUrl,
});

// CONFIG firebase
var config = {
  apiKey: process.env.firebaseApiKey || CONFIG.firebaseApiKey,
  authDomain: process.env.firebaseAuthDomain || CONFIG.firebaseAuthDomain,
  databaseURL: process.env.firebaseDatabaseURL || CONFIG.firebaseDatabaseURL,
  storageBucket:
    process.env.firebaseStorageBucket || CONFIG.firebaseStorageBucket,
};
firebase.initializeApp(config);

// Get a reference to the database service
var firebaseDatabase = firebase.database();

var riot = new RiotRequest(process.env.riotToken || CONFIG.riotToken);

// Instancia de cliente Discord
module.exports = {
  bot: client,
  run: () => client.login(token),
  twitter: twitter,
  riot: riot,
  firebaseDatabase: firebaseDatabase,
};
