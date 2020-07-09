module.exports = (client, twitter) => {
  
  // Import de las regex
  var regex = require("./regexp");
  
  var comandosDeAudio = require("./comandos");

  var estoySilenciado = false;
  
  client.on('message', message => {   
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
          twitter.postTweet({'status': message.content}, () => {}, () => {});
        }
    }else{
      // Si el mensaje no lo escribe el bot ni está silenciado, y si el mensaje viene de un canal válido
      if( message.author.username != 'EstrellaZorro' 
          && !estoySilenciado 
          && (message.channel.id == 730686599049773086 // EstrellaZorro -> BOTS/beep-beep-bop
          || message.channel.id == 382239046790807562) // TESTOTESTOTEST -> GENERAL/texto
          ){
        // Respuesta a un saludo al servidor
        if (regex.regexSaludos.test(message.content)) {
          message.reply('HOLA MAMÁ').catch(console.log)
        }
        // Respuesta a aza y las cargas
        if (regex.regexCarga.test(message.content) && message.author.username == 'blackjack15926811'){
          message.reply('QUE TOQUES LA PUTA CARGA AZA JODER').catch(console.log)
        }
        if (/hola bot/i.test(message.content)){
          message.reply('HOLAS, PERO SOY UN BOT. DEBERÍAS HABLAR CON SERES HUMANOS').catch(console.log)
        }
        if (/gracias bot/i.test(message.content)){
          message.reply('DE NADA, PERO SOY UN BOT. DEBERÍAS HABLAR CON SERES HUMANOS').catch(console.log)
        }
        if (regex.regexQuejaBot.test(message.content)){
          message.reply('LO SIENTO LO HAGO SIN QUERER').catch(console.log)
          estoySilenciado = true;
          setTimeout(
            () => {
              estoySilenciado = false
            }, 300000
          )
        }
        // Respuesta a peplo y las orisas
        if (regex.regexPeplo.test(message.content) && message.author.username == 'Peplo'){
          message.reply('PE... PE... PERO ORISA, PEPLO!').catch(console.log)
        }
        // Respuesta a halpmepls
        if (message.content === '!halpmepls'){
          message.channel.send('ESTE TÍO DICE QUE NECESITA AYUDA PUTO PRINGAO\'. \nSEGURO QUE ES UN LELPLAYER. \nEH TÍOS, QUE NECESITA AYUDA!!!!1!uno!. PERO MIRA QUÉ PRINGAO\'...').catch(console.log)
        }
        // Respuesta al asco
        if (regex.regexAsco.test(message.content)){
          message.channel.send('',{ file: 'https://cdn.discordapp.com/attachments/268398719802540032/321729711950528513/unknown.png'}).catch(console.log)
        }
        if (regex.regexRate.test(message.content)){
          message.channel.send('',{ file: 'http://i.imgur.com/TGGnTq1.jpg'}).catch(console.log)
        }
        if (message.content == ':sad:' || message.content == '!sad'){
          message.channel.send('',{ file: 'https://cdn.discordapp.com/attachments/268398719802540032/382006568553676812/Sin_titulo.png'}).catch(console.log)
        }
        if (regex.regexCallMe.test(message.content)) {
          message.channel.send('https://68.media.tumblr.com/f67ea264b93b8df0e558b61f019a2240/tumblr_o4rc1yh5ql1uulaizo1_500.gif').catch(console.log)
        }
        if (regex.regexHum.test(message.content)) {
          message.channel.send('https://media.giphy.com/media/CaiVJuZGvR8HK/giphy.gif').catch(console.log)
        }
        if (regex.regexBorja.test(message.content)) {
          message.channel.send('',{ file: 'https://cdn.discordapp.com/attachments/268398719802540032/330319777694220288/kek.jpg'}).catch(console.log)
        }
        if (regex.regexTTSMal.test(message.content)) {
          message.reply('QUE NO SE ESCRIBE ASÍ SUBNORMAL. ESCRIBE "!halpmepls" PARA MÁS AYUDA SALU3').catch(console.log)
        }
        if (message.content === '!halluda') {
          message.channel.send(`SE DECIR ESTO: ${comandosDeAudio.join(", ")}`).catch(console.log)
        }
      }
    }
  });
}
