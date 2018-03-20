var regex = require("./regexp");

var supportedCommands = require("./comandos");

var excludedCommands = require("./comandosExcluidos");

listeningAudioPetitions = true;
module.exports = (client) => {

    //Desconecta del canal de voz si lo hay, luego ejecuta el callback
    var disconectVoiceThenExecute = function(callback){
        var conexiones = client.voiceConnections.array();
        if(conexiones.length > 0){
            conexiones[0].channel.leave();
            console.log("left the channel")
        }
        callback()
    }

    //Refactorizacion de reproduccion de audio
    var playAudioFile = function(uri, user){
        if(listeningAudioPetitions){
            listeningAudioPetitions = false;
            disconectVoiceThenExecute(function(){
                //Conexion al canal del user o de bots en su defecto
                let channel = user.voiceChannel
                if(channel == null){
                    channel = client.channels.get('336838964004651008');
                }
                channel.join().then(
                    conexion => {
                        const dispatcheru = conexion.playArbitraryInput(uri);
                        dispatcheru.on('end', () =>{
                            conexion.channel.leave();
                            listeningAudioPetitions = true;
                        });
                    }).catch(console.log)
                })
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
        
        //  Listener para Daviz
        client.on('voiceStateUpdate', (oldMemberState, newMemberState) => {
            if(newMemberState.id == 328906982675185664 && newMemberState.voiceChannel != null){
                playAudioFile("audio/daviz.mp3", newMemberState)
            }
        });
        
        client.on('message', message => {
            // Listener para reproduccion
            if (supportedCommands.findIndex(cmd => message.content == cmd) !== -1) {
                playAudioFile("audio/"+message.content.slice(1,message.content.length)+".mp3", message.member)
                message.delete()
            } else {
                if(regex.regexEmpiezaPorExclamacion.test(message.content) && excludedCommands.findIndex(cmd => message.content == cmd) === -1){
                    message.reply('ESO NO ES UN COMANDO! QUÉ ERES? TONTO O ALGO?')
                }
            }
            // Desactivar audio
            if (regex.regexStaph.test(message.content) || "!stop" == message.content) {
                disconectVoiceThenExecute(function(){message.reply('JOOOOOOBAAAAAAA');
                listeningAudioPetitions = true;});
            }
            //TORBJORN
            if (regex.regexTorb.test(message.content) ) {
                playAudioFile("audio/torb.mp3", message.member)
            }
        })
    }
        
        