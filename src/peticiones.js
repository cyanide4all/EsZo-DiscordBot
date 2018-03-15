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
      message.reply(`PUES OBVIAMENTE, ${response}`)
    }
  })
}