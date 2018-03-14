//Config del bot, bien desde archivo o servidor
var CONFIG = require('../config/config.json');
// Import the discord.js module
const Discord = require('discord.js');
// Import twitter
var Twitter = require('twitter-node-client').Twitter;
//httpclient
var http = require("http");
//Inicializacion del cliente de discord
const client = new Discord.Client();

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Get response\n');
}).listen(process.env.PORT || 5000)

setInterval(function() {
    http.get("http://eszobot.herokuapp.com");
    console.log("Sent keepalive request");
}, 200000); // every 5 minutes (300000)

//Cuando el bot hace sus cosas pasa esto:
client.on('ready', () => {
  console.log("Doing some gud' ol' barrel rolls...");
});

// Token para la conexion y asociacion al bot
var temporalToken = CONFIG.discordToken;
if(temporalToken == ""){
  temporalToken = process.env.discordToken;
}
const token = temporalToken;

//Tokens para twitter
var twitter = new Twitter({
    "consumerKey": CONFIG.twitterConsumerKey,
    "consumerSecret": CONFIG.twitterConsumerSecret,
    "accessToken": CONFIG.twitterAccessToken,
    "accessTokenSecret": CONFIG.twitterAccessTokenSecret,
    "callBackUrl": CONFIG.twitterCallBackUrl
});

// Instancia de cliente Discord
module.exports = {
    bot: client,
    run: () => client.login(token),
    twitter: twitter
};