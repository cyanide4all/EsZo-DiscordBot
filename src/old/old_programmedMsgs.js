module.exports = (client) => {
    var regex = require("./regexp");
    client.on('message', message => {
        if (regex.regexProgrammedMsg.test(message.content)) {
            const splitMsg = message.content.split(" ")
            const destinatario = splitMsg[1];
            const espera = splitMsg[2];
            const tiempo = espera.slice(0, -1);
            const unidad = espera[espera.length - 1].toLowerCase();
            const contenido = splitMsg.slice(3,).join(" ");
            let tiempoMs = null;
            switch(unidad) {
                case ("h"): 
                    tiempoMs = tiempo * 3600000;
                    break;
                case("m"):
                    tiempoMs = tiempo * 60000;
                    break;
                case("s"):
                    tiempoMs = tiempo * 1000;
                    break;
            }
            if (tiempoMs) {
                client.users.fetch(destinatario).then((user) => {
                    message.reply(`Enviaré tu mensaje a ${user.username} en exactamente ${espera}`)
                    setTimeout(() => {
                        user.send(contenido)
                            .then(() => {
                                message.reply(`he entregado tu mensaje a ${user.username}. Decía algo así como: \n${contenido}`).catch(console.log);
                            }).catch(() => {
                                message.reply(`no he podido entregar tu mensaje a ${user.username}`)
                            })
                    }, tiempoMs)
                }).catch(() => message.reply("No he encontrado a ese usuario").catch(console.log))   
            } else {
                message.reply("El formato del tiempo de espera no es válido")
            }
        }
    })
  }
  