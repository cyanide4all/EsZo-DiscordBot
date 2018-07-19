module.exports = (client) => {
  var regex = require("./regexp");
  var galeguinhos = 0;
  client.on('message', message => { 
    if (regex.regexSiNo.test(message.content)) {
      let response = Math.random() < 0.5 ? -1 : 1;
      if (response > 0) {
        response = "SI"
      } else {
        response = "NO"
      }
      message.reply(`PUES OBVIAMENTE, ${response}`)
    }
    if (regex.regexCuantos.test(message.content)) {
if (message.guild.members.array().filter(each => regex.test(each.nickname)).length > 0) {
    galeguinhos = message.guild.members.array().filter(each => regex.test(each.nickname))
}
      let response = message.guild.memberCount - 1 + " DE LOS CUALES " + galeguinhos + " SON GALEGUINHO95 PORQUE ES PUTO TONTO. AH! Y YO, EL BOT, SOY EL BOT, YO ESTUVE, SÍ."
      message.reply(response).then(() => galeguinhos = 0).catch(console.log)
      
    }
  })
}
