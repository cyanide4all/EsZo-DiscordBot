const cumples = require("./cumples.json");

module.exports = (client) => {
  let ultimoCumFelicitado = new Date(0);

  function getCumplesHoy(diaMesHoy) {
    const cumpleString = cumples.filter((each) => {
      const diaMesCum = new Date(each.date);
      return (
        diaMesHoy.getDate() === diaMesCum.getDate() &&
        diaMesHoy.getMonth() === diaMesCum.getMonth()
      );
    });
    ultimoCumFelicitado = new Date();
    return cumpleString;
  }

  function createCumMessage() {
    return `
    HOY ES EL CUM DE ${each.cummer} !!!! (Y de güolquer)
    FELICITAD TODOS A <@!${each.id}> !!!!`;
  }

  function felicitarCumHoy(channel) {
    const diaMesHoy = new Date();

    if (
      ultimoCumFelicitado.getDate() !== diaMesHoy.getDate() ||
      ultimoCumFelicitado.getMonth() !== diaMesHoy.getMonth()
    )
      getCumplesHoy(diaMesHoy).forEach((each) => {
        channel.send(createCumMessage(each.cummer, each.id)).catch(console.log);
      });
  }

  client.on("voiceStateUpdate", (_, newState) => {
    felicitarCumHoy(newState.guild.systemChannel);
  });

  client.on("message", (message) => {
    felicitarCumHoy(message.member.guild.systemChannel);
    if (message.content === "!cumples") {
      const mesCurrente = new Date().getMonth();
      const cumplesDelMes = cumples.filter(
        (each) => new Date(each.date).getMonth() === mesCurrente
      );
      if (cumplesDelMes.length > 0) {
        message.reply(`ESTE MES CUMPLE${cumplesDelMes.length > 1 ? "N" : ""}:
        ${cumplesDelMes
          .sort(
            (a, b) => new Date(a.date).getDate() - new Date(b.date).getDate()
          )
          .map(
            (each) => `${each.cummer} el día ${new Date(each.date).getDate()}`
          )
          .join(",\n\t\t")}
        `);
      } else {
        message
          .reply("ESTE MES NO CUMPLE NADIE. (salvo wolquer)")
          .catch(console.log);
      }
    }
  });
};
