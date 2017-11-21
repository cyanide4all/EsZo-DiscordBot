// Import the discord.js module
const Discord = require('discord.js');
// Import the checker functionality
const ApplyChecker = require('./checker.js');
// Import covfefify
const covfefify = require('./covfefify.js');
// Import configuracion
var CONFIG = require('./config.json');

// Import twitter
var Twitter = require('twitter-node-client').Twitter;
//Callback functions para twitter
var error = function (err, response, body) {
  	console.log('\nERROR: ' + err + "\nResponse: " + response + "\nBody: " + body);
};
var success = function (data) {
    //Nada
    //console.log('Data [%s]', data);
};

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
const client = new Discord.Client();

// Declaro constantes para las regex de interpretación de mensajes
// La i final implica case insensitiveness
const regexSupp = /(support)|(supp)/i
const regexDuplicates = /repetid[oa]/i
const regexRein = /rein/i
const regexPing = /(ping)|(lag)/i
const regexSaludos = /(Hola a todos)|(gente)|(buenas)|(señores)/i
const regexCarga = /(carga)|(punto)|(payload)|(proteg)/i
const regexPeplo = /(pero)|(orisa)|(support)/i
const regexAsco = /(asco)|(c[aá]ncer)|(sida)|(zanker)|(asquer)|(pharah?)|(yasuo)|(hanzo)/i
const regexRate = /^(?!http).*[0-9]+\/[0-9]+/
const regexPansal1 = /(hola)|(buenas)|(gente)/i
const regexPansal2 = /(Que tal)/
const regexKek = /kek/i
const regexPuton = /(que gracioso)|(hahaha)|(puto tonto)/i
const regexChancla = /(chancla)|(chancla mortal) nid jilin/i
const regexNegrito = /(felipe)|(negritoriko)/i
const regexBamboo = /(bambú)|(bambu)|(bamboo)/i
const regexJiros = /jiro+u*s+/i
const regexCallMe = /(c[ao]ll)|(cell)|(selfon)|(avis)/i
const regexBorja = /(borj)|(Hagrov)/i
const regexQuejaBot = /((c[aá]llate)|(que te calles)|(ktkys)|(puto)).*bot/i
const regexStaph = /(bot staph)|(para bot)/i
const regexNoLink = /^(?!http).*/
const regexTTSMal = /^(\/TTS).*/

//LOCAL PERSISTENCE
var listeningAudioPetitions = true;
var cumpleBolas = true;
var hablarDelJuego = true;

var http = require("http");

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Get response\n');
}).listen(process.env.PORT || 5000)

setInterval(function() {
    http.get("http://eszobot.herokuapp.com");
    console.log("Sent keepalive request");
}, 200000); // every 5 minutes (300000)

setInterval(function() {
    hablarDelJuego = true;
}, 86400000); // every day (86400000)



//Cuando el bot hace sus cosas pasa esto:
client.on('ready', () => {
  console.log("Doing some gud' ol' barrel rolls...");
});

//Desconecta del canal de voz si lo hay, luego ejecuta el callback
var disconectVoiceThenExecute = function(callback){
  var conexiones = client.voiceConnections.array();
  if(conexiones.length > 0){
    conexiones[0].channel.leave();
  }
  callback()
}

// Listeners para mensajes
client.on('message', message => {
  ApplyChecker(message)

  if(message.channel.id == 346796946393923584){
    var adjuntos = message.attachments.array()
    if(adjuntos.length > 0){
      var adjunto = adjuntos[0] //TODO ponerse a hacer esto en multiples archivos algun día
      console.log("URL: " + adjunto.url);
      /*
      twitter.postMedia({'media' : adjunto.attachment}, error, function(response){
        console.log("LLEGUE HASTA AQUI");
        twitter.postTweet({'status': message.content, 'media_ids': [response.media_id_string] }, error, success);
      })
      */
    }else {
      twitter.postTweet({'status': message.content}, error, success);
    }


  }else{
    // Si el mensaje no lo escribe el bot
    if( message.author.username != 'EstrellaZorro'){
      // Listener para reproduccion
      if ("!bling" == message.content || "!panda" == message.content 
          || "!airhorn" == message.content || "!joeputa" == message.content
          || "!fgilipollas" == message.content || "!laloli" == message.content ) {
        disconectVoiceThenExecute(function(){
          //Conexion al canal del user o de bots en su defecto
          let channel = message.member.voiceChannel
          if(channel == null){
            channel = client.channels.get('336838964004651008');
          }
          channel.join().then(connection => {
            listeningAudioPetitions = !listeningAudioPetitions;
            const dispatcher = connection.playArbitraryInput("audio/"+message.content.slice(1,message.content.length)+".mp3")
            dispatcher.on('end', () =>{
              connection.channel.leave();
            });
          }).catch(console.log)
        })
      }
      // Desactivar audio
      if (regexStaph.test(message.content) || "!stop" == message.content) {
        disconectVoiceThenExecute(function(){message.reply('JOOOOOOBAAAAAAA')});
      }
      // Listener para walker
      if (cumpleBolas && message.author.username === 'DarkWalker') {
        message.reply("¡¡¡¡¡¡¡¡¡FELIZ CUMPLEAÑOS WALKER!!!1!UNO!");
      }
      if (message.content == '!cumple') {
        cumpleBolas = !cumpleBolas;
        if(cumpleBolas){
          message.reply('Hoy es el cumple de walker!!!');
        }else {
          message.reply('Ya no es el cumple de walker...');
        }
      }
      if(hablarDelJuego){
        hablarDelJuego = false;
        message.reply("HE PERDIDO");
      }
      // Respuesta a la palabra support
      if (regexSupp.test(message.content)) {
        message.channel.send('PROTEGED AL SUPPORT JODER')
      }
      // Respuesta a la queja de repetidas
      if (regexDuplicates.test(message.content)) {
        message.channel.send('',{ file: 'https://cdn.discordapp.com/attachments/268398719802540032/305840663516282880/C-DBN6mW0AEtgI4.png'})
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
      // Respuesta a aza y las cargas
      if (regexCarga.test(message.content) && message.author.username == 'blackjack15926811'){
        message.reply('QUE TOQUES LA PUTA CARGA AZA JODER')
      }
      if (/hola bot/i.test(message.content)){
          message.reply('HOLAS, PERO SOY UN BOT. DEBERÍAS HABLAR CON SERES HUMANOS')
      }
      if (regexQuejaBot.test(message.content)){
          message.reply('LO SIENTO LO HAGO SIN QUERER')
      }
      // Respuesta a peplo y las orisas
      if (regexPeplo.test(message.content) && message.author.username == 'Peplo'){
        message.reply('PE... PE... PERO ORISA, PEPLO!')
      }
      // Respuesta a halpmepls
      if (message.content === '!halpmepls'){
        message.channel.send('ESTE TÍO DICE QUE NECESITA AYUDA PUTO PRINGAO\'. \nSEGURO QUE ES UN LELPLAYER. \nEH TÍOS, QUE NECESITA AYUDA!!!!1!uno!. PERO MIRA QUÉ PRINGAO\'...')
      }
      // Respuesta al asco
      if (regexAsco.test(message.content)){
        message.channel.send('',{ file: 'https://cdn.discordapp.com/attachments/268398719802540032/321729711950528513/unknown.png'})
      }
      if (regexRate.test(message.content)){
        message.channel.send('',{ file: 'http://i.imgur.com/TGGnTq1.jpg'})
      }
      // Respuestas a los saludos de Panda
      if (regexPansal1.test(message.content) && message.author.username == 'Sr Panda'){
        message.reply('HOLA PAPÁ')
      }
      if (regexPansal2.test(message.content) && message.author.username == 'Sr Panda'){
        message.reply('CON LAG, COMO MAMÁ')
      }
      if (regexBamboo.test(message.content) && message.author.username == 'Sr Panda'){
        message.reply('DALES CON EL BAMBÚ, ACABA CON ELLOS PAPÁ')
      }
      if (message.content == ':sad:' || message.content == '!sad'){
        message.channel.send('',{ file: 'https://cdn.discordapp.com/attachments/268398719802540032/382006568553676812/Sin_titulo.png'})
      }
      // Puto tonto
      if (regexPuton.test(message.content)){
        message.channel.send('',{ file: 'https://cdn.discordapp.com/attachments/268398719802540032/322009184637812736/unknown.png'})
      }
      // Respuesta a Felipe
      if (regexNegrito.test(message.content)) {
        message.reply('El señor Negritoriko vende CHORIZO y SULFATO')
      }
      // Respuesta a la chancla
      if (regexChancla.test(message.content)) {
        message.channel.send('',{ file: 'https://cdn.discordapp.com/attachments/268398719802540032/325618149032722432/IMG_20170617_144948.JPG'})
      }
      //Respuesta al jirous
      if (regexJiros.test(message.content)) {
        message.reply('ES TIEMPO DE JIROS DE LOS CASUALS')
      }
      if (regexCallMe.test(message.content)) {
        message.channel.send('https://68.media.tumblr.com/f67ea264b93b8df0e558b61f019a2240/tumblr_o4rc1yh5ql1uulaizo1_500.gif')
      }
      if (regexBorja.test(message.content)) {
        message.channel.send('',{ file: 'https://cdn.discordapp.com/attachments/268398719802540032/330319777694220288/kek.jpg'})
      }
      if (regexTTSMal.test(message.content)) {
        message.reply('QUE NO SE ESCRIBE ASÍ SUBNORMAL. ESCRIBE "!halpmepls" PARA MÁS AYUDA SALU3')
      }
      // nueva sintaxis proporcionada por el checker y el ApplyChecker
      message.command('/covfefe', (message) => {
        message.reply(covfefify(message.content))
      })

      message.checks(message.content.length > 280, (message)=>{
        if(regexNoLink.test(message.content)){
           message.reply('muy largo; no leo')
        }
      })
    }
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
