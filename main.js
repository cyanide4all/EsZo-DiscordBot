// Import the discord.js module
const Discord = require('discord.js');

// Create an instance of a Discord client
const client = new Discord.Client();

// Establish token
const token = 'MzE3NDIxMTMzMTMxNjc3Njk2.DA4cng.u4j9D0jeCgVf5y3G9M4xF3YQqyg';

client.on('ready', () => {
  console.log('Bot starts doing his thing...');
});

// Listeners para mensajes
client.on('message', message => {
  // Listener para walker
  /*if (message.author.username === 'Shoorema#3786') {
    message.reply("Test completado");
  }
  */
  message.reply("Test completado");
});

client.login(token);
