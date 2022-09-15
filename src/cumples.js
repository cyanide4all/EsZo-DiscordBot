var regex = require("./regexp");
const cumples  = require("./cumples.json")

module.exports = (client) => {

    let ultimoCumFelicitado = new Date(0);


    function felicitarCumple(diaMesHoy){
        let cumpleString = cumples.filter((each) => {
            const diaMesCum = new Date(each.date);

            return ((diaMesHoy.getDate()===diaMesCum.getDate() && diaMesHoy.getMonth()===diaMesCum.getMonth()))
        })
        ultimoCumFelicitado = new Date();
        return cumpleString;
    }

    client.on('voiceStateUpdate',
        (prevState, newState) => {
            const diaMesHoy = new Date();

            if (ultimoCumFelicitado.getDate() !== diaMesHoy.getDate() || ultimoCumFelicitado.getMonth() !==  diaMesHoy.getMonth())
            felicitarCumple(diaMesHoy).map((each) => {
                newState.guild.systemChannel.send(`
                        HOY ES EL CUM DE ${each.cummer} !!!! (Y de güolquer)
                        FELICITAD TODOS A <@!${each.id}> !!!!
                        `).catch(console.log)
            })
        });

    client.on('message', message => {
        const diaMesHoy = new Date();

        if (ultimoCumFelicitado.getDate() !== diaMesHoy.getDate() || ultimoCumFelicitado.getMonth() !==  diaMesHoy.getMonth())
        felicitarCumple(diaMesHoy).map((each) => {
            message.member.guild.systemChannel.send(`
                        HOY ES EL CUM DE ${each.cummer} !!!! (Y de güolquer)
                        FELICITAD TODOS A <@!${each.id}> !!!!
                        `).catch(console.log)
        })
    });
}