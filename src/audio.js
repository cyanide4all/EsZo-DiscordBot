var regex = require("./regexp");

module.exports = (client) => {

    //Desconecta del canal de voz si lo hay, luego ejecuta el callback
    var disconectVoiceThenExecute = function(callback){
        var conexiones = client.voiceConnections.array();
        if(conexiones.length > 0){
            conexiones[0].channel.leave();
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
            if ("!bling" == message.content || "!panda" == message.content
            || "!airhorn" == message.content || "!joeputa" == message.content
            || "!fgilipollas" == message.content || "!laloli" == message.content
            || "!salchichonio" == message.content || "!daviz" == message.content
            || "!subnormal" == message.content || "!janso" == message.content
            || "!yaves" == message.content || "!elagua" == message.content
            || "!augale" == message.content || "!duah" == message.content
            || "!mishon" == message.content || "!goodjob" == message.content
            || "!notcool" == message.content || "!showme" == message.content
            || "!thebird" == message.content || "!pitorro" == message.content) {
                playAudioFile("audio/"+message.content.slice(1,message.content.length)+".mp3", message.member)
                message.delete()
            } else {
                if(regex.regexEmpiezaPorExclamacion.test(message.content) && !("!stop" == message.content) && !("!cumple" == message.content) && !("!halpmepls" == message.content)){
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
            
            if (regex.regexRekt.test(message.content) ) {
                playAudioFile("audio/rekt.mp3", message.member)
            }
        })
    }
        
        