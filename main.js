// Import the discord.js module
const Discord = require('discord.js');

// Instancia de cliente Discord
const client = new Discord.Client();

// Token para la conexion y asociacion al bot
const token = 'MzE3NDIxMTMzMTMxNjc3Njk2.DA4cng.u4j9D0jeCgVf5y3G9M4xF3YQqyg';

// Declaro constantes para las regex de interpretación de mensajes
// La i final implica case insensitiveness
const regexSupp = /(support)|(supp)/i
const regexDuplicates = /repetid[oa]/i
const regexRein = /rein/i
const regexPing = /(ping)|(lag)/i
const regexSaludos = /(Hola a todos)|(gente)|(buenas)|(señores)/i
const regexCarga = /(carga)|(punto)|(payload)|(proteg)/i

var http = require("http");
setInterval(function() {
    http.get("http://eszobot.herokuapp.com");
    console.log("Sent keepalive request");
}, 600000); // every 5 minutes (300000)

//Cuando el bot hace sus cosas pasa esto:
client.on('ready', () => {
  console.log("Doing some gud' ol' barrel rolls...");
});

// Listeners para mensajes
client.on('message', message => {
  // Listener para walker
  if (message.author.username === 'DarkWalker') {
    message.reply("¡¡¡¡¡¡¡¡¡FELIZ CUMPLEAÑOS WALKER!!!1!UNO!");
  }
  // Respuesta a la palabra support
  if (regexSupp.test(message.content) && message.author.username != 'EstrellaZorro') {
    message.channel.send('PROTEGED AL SUPPORT JODER')
  }
  // Respuesta a la queja de repetidas
  if (regexDuplicates.test(message.content)) {
    message.channel.send('OOPS, ALL DUPLICATES!')
  }
  // Respuesta a reinhartd
  if (regexRein.test(message.content)) {
    message.channel.send('RECTANGLE')
  }
  // Respuesta a queja de ping
  if (regexPing.test(message.content)) {
    message.channel.send('CONEXIÓN DE MIERDA')
  }
  // Respuesta a un saludo al servidor
  if (regexSaludos.test(message.content)) {
    message.reply('HOLA MAMÁ')
  }
  // Respuesta a aza y las cargas TODO TODO TODO TODO TODO TODO TODO TODO
  if (regexCarga.test(message.content) && message.author == 'blackjack15926811'){// //TODO TODO TODO
    message.reply('QUE TOQUES LA PUTA CARGA AZA JODER')

  }
  // Respuesta a halpmepls
  if (message.content === '!halpmepls'){
    message.channel.send('ESTE TÍO DICE QUE NECESITA AYUDA PUTO PRINGAO\'. \nSEGURO QUE ES UN LELPLAYER. \nEH TÍOS, QUE NECESITA AYUDA!!!!1!uno!. PERO MIRA QUÉ PRINGAO\'...')
  }
});

// Listener para cuando se viene alguien nuevo
client.on('guildMemberAdd', member => {
  // El mensaje se manda al canal por defecto (boop)
  member.guild.defaultChannel.send(`Bienvenido a nuestro servidor, ${member}.\nEs un lugar bonito y lleno de personas amables.\nQuédate si no maineas ni Bastion, ni Yasuo ni Symetra.\nSi necesitas ayuda escribe '!halpmepls'`);
})

// Listener para cuando alguien se pira o lo echamos (Aunque eso es poco probable)
client.on('guildMemberRemove', member => {
  // El mensaje se manda al canal por defecto (boop)
  member.guild.defaultChannel.send(`Nuestro querido miembro, ${member}, se ha ido para siempre.\nSe ruega una oración por su alma y la asistencia a la conducción`);
  if(member.roles.length > 0){
    member.guild.defaultChannel.send('Sus roles eran:')
    // WIP--------------  TODO TODO
    for(var x in member.roles){
      member.guild.defaultChannel.send(member.roles[x][role].name)
    }
    member.guild.defaultChannel.send('Le echaremos de menos. O no.')
    // WIP--------------  TODO TODO
  }
})

client.login(token);
