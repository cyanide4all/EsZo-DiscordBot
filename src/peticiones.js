module.exports = (client) => {
  var regex = require("./regexp");
  var bannedUserId = null;

  client.on("message", (message) => {
    if (message.author.id === bannedUserId) {
      message.delete().catch(console.log);
    }

    if (regex.regexSiNo.test(message.content)) {
      let response = Math.random() < 0.5 ? -1 : 1;
      if (response > 0) {
        response = "SI";
      } else {
        response = "NO";
      }
      message.reply(`PUES OBVIAMENTE, ${response}`).catch(console.log);
    }

    if (regex.regexBaneo.test(message.content)) {
      if (message.author.id !== bannedUserId) {
        const splitMsg = message.content.split(" ");
        const targetId = splitMsg[1].slice(3, splitMsg[1].length - 1);
        message.guild.members.fetch(targetId).then((user) => {
          bannedUserId = targetId;
          user.voice.setChannel(null);
          setTimeout(() => {
            bannedUserId = null;
          }, splitMsg[2] * 1000);
        });
      }
    }
  });

  client.on("voiceStateUpdate", (prevState, newState) => {
    if (
      prevState.member.id != 317421133131677696 &&
      newState.channel !== null &&
      prevState.channel === null
    ) {
      if (bannedUserId === newState.member.id) {
        newState.setChannel(null);
      }
    }
  });
};
