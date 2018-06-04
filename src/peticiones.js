module.exports = (client) => {
  var regex = require("./regexp");

  client.on('message', message => { 
    if (regex.regexSiNo.test(message.content)) {
      let response = Math.random() < 0.5 ? -1 : 1;
      if (response > 0) {
        response = "SI"
      } else {
        response = "NO"
      }
      message.reply(`PUES OBVIAMENTE, ${response}`).catch(console.log)
    }
    if (regex.regexCuantos.test(message.content)) {
      let response = `${message.guild.memberCount - 1} Y YO, EL BOT, SOY EL BOT, YO ESTUVE, SÍ.`
      message.reply(response).catch(console.log)
    }
  })
}
