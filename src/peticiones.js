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
    if (message.content == "!bolalan") {
      if (message.member.roles.cache["763334745294766091"]) {
        message.reply(`QUE SÍ, PESAO'`)
      } else {
        message.member.roles.add("763334745294766091");
        message.reply(`VAS A LA LAN (${Math.random() < 0.5 ? "a nadie le gusta la idea, a nadie le importas" : "VIEEEEEEEEENNNN!!!!UNO"}). Para apuntarte a las cosas -> https://docs.google.com/spreadsheets/d/1ptkV-mR_HCH5mCDq-CBzXez0ntXJk52eIKoND47tid8/edit?usp=sharing`)
      }
    }
  })
}
