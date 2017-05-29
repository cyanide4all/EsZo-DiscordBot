// Import the discord.js module
const Discord = require('discord.js');

// Create an instance of a Discord client
const client = new Discord.Client();

// Establish token
const token = 'MzE3NDIxMTMzMTMxNjc3Njk2.DA4cng.u4j9D0jeCgVf5y3G9M4xF3YQqyg';

const regexSupp = /support/
const regexDuplicates = /repetido/
const regexRein = /rein/
const regexPing = /ping/


client.on('ready', () => {
  console.log('Bot starts doing his thing...');

});

// Listeners para mensajes
client.on('message', message => {
  // Listener para walker
  if (message.author.username === 'DarkWalker') {
    message.reply("¡¡¡¡¡¡¡¡¡FELIZ CUMPLEAÑOS WALKER!!!1!UNO!");
  }
  if (regexSupp.test(message.content)) {
    message.channel.send('PROTEGED AL SUPPORT JODER')
  }
  if (regexDuplicates.test(message.content)) {
    message.channel.send('OOPS, ALL DUPLICATES!')
  }
  if (regexRein.test(message.content)) {
    message.channel.send('RECTANGLE')
  }
  if (regexPing.test(message.content)) {
    message.channel.send('CONEXIÓN DE MIERDA')
  }

});

client.login(token);
