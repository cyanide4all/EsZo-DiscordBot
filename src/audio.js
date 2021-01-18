var regex = require("./regexp");

var supportedCommands = require("./comandos");

var excludedCommands = require("./comandosExcluidos");

var glob = require("glob")

var ytdl = require('ytdl-core');


listeningAudioPetitions = true;
module.exports = (client) => {

    //Refactorizacion de reproduccion de audio
    var playAudioFile = function(uri, member, cb){
        if (member.voice && member.voice.channel && client.voice.connections.array().length === 0) {
            const voiceChannel = member.voice.channel
            voiceChannel.join().then(connection => {
                const dispatcher = connection.play(uri)
                dispatcher.once('finish', () => {
                    if (voiceChannel) {
                        voiceChannel.leave();
                    } else if (client.voice && client.voice.connections) {
                        client.voice.connections[0].disconect();
                        if(cb) {
                            cb();
                        }
                    }
                });
                dispatcher.once('error', e => {
                    console.log(e);
                });
            }).catch(console.log);
        }
    }
        
    // Listeners para pabla
    client.on('voiceStateUpdate', (oldMemberState, newMemberState) => {
        if(newMemberState.id == 161138305189150720 && newMemberState.voiceChannel != null){
            playAudioFile("audio/mniac.mp3", newMemberState)
        }
    });
    
    //  Listener para Castromiles
    client.on('voiceStateUpdate', (oldMemberState, newMemberState) => {
        if(newMemberState.id == 229206562697117696 && newMemberState.voiceChannel != null){
            playAudioFile("audio/cosas.mp3", newMemberState)
        }
    });  
    
    //  Listener para DM
    client.on('voiceStateUpdate', (oldMemberState, newMemberState) => {
        if(newMemberState.id == 161139020871499776 && newMemberState.voiceChannel != null){
            playAudioFile("audio/frens.mp3", newMemberState)
        }
    });
    
    //  Listener para Daviz
    client.on('voiceStateUpdate', (oldMemberState, newMemberState) => {
        if(newMemberState.id == 328906982675185664 && newMemberState.voiceChannel != null){
            playAudioFile("audio/daviz.mp3", newMemberState)
        }
    });
    
    client.on('message', message => {

        if (message.channel.id == 730686599049773086 // EstrellaZorro -> BOTS/beep-beep-bop
            || message.channel.id == 268398719802540032 // EstrellaZorro -> /boop
            || message.channel.id == 382239046790807562 // TESTOTESTOTEST -> GENERAL/texto
        ) {
            if (message.channel.id !== 268398719802540032) {
                // Listener para reproduccion
                if (supportedCommands.findIndex(cmd => message.content && message.content.toLowerCase() == cmd) !== -1) {
                    playAudioFile("audio/"+message.content.toLowerCase().slice(1,message.content.length)+".mp3", message.member, () => message.delete().catch(console.log))
                } else if (regex.regexYT.test(message.content)) {
                    if (ytdl.validateURL(message.content.split(" ")[1])) {
                        playAudioFile(ytdl(message.content.split(" ")[1], { filter: 'audioonly' }), message.member)
                    } else {
                        message.reply('HAY COSAS PATÉTICAS, Y LUEGO ESTÁ NO SABER COPIAR LA URL DE UN VÍDEO EN YOUTUBE')
                    }
                } else if (regex.regexWah.test(message.content)) {
                    if (Math.random() < 0.9) {
                        playAudioFile("audio/wah.mp3", message.member)
                    } else {
                        playAudioFile("audio/wahluigi.mp3", message.member)
                    }
                } else if(regex.regexEmpiezaPorExclamacion.test(message.content) && excludedCommands.findIndex(cmd => message.content == cmd) === -1){
                    message.reply('ESO NO ES UN COMANDO. NO TE DA VERGÜENZA ESCRIBIR MAL A TUS AÑOS?')
                }
            }
            // Desactivar audio
            if (regex.regexStaph.test(message.content) || "!stop" == message.content) {
                var conexiones = client.voice.connections.array();
                if (conexiones.length > 0) {
                    conexiones[0].channel.leave()
                }
                message.reply('JOOOOOOBAAAAAAA');
            }
            if (message.content === "F") {
                glob("*/F-*.mp3", null, function (er, files) {
                    playAudioFile(`audio/F-${Math.floor(Math.random() * (files.length))}.mp3`, message.member)
                })
            }
            //TORBJORN
            if (regex.regexTorb.test(message.content) ) {
                playAudioFile("audio/torb.mp3", message.member)
            }
        }
    })
}
        
        
