module.exports = (client) => {
    // Listener para cuando se viene alguien nuevo
    client.on('guildMemberAdd', member => {
        // El mensaje se manda al canal por defecto (boop)
        member.guild.textChannels:toArray[0].send(`Bienvenido a nuestro servidor, ${member}.\nEs un lugar bonito y lleno de personas amables.\nQuédate si no maineas ni Bastion, ni Yasuo ni Symmetra.\nSi necesitas ayuda escribe '!halpmepls'`).catch(console.log);
    })
    
    // Listener para cuando alguien se pira o lo echamos (Aunque eso es poco probable)
    client.on('guildMemberRemove', member => {
        // El mensaje se manda al canal por defecto (boop)
        member.guild.defaultChannel.send(`Nuestro querido miembro, ${member}, se ha ido para siempre.\nSe ruega una oración por su alma y la asistencia a la conducción`);
        if(member.roles.length > 0){
            member.guild.textChannels:toArray[0].send('Sus roles eran:').catch(console.log)
            // WIP--------------  TODO TODO
            for(var x in member.roles){
                member.guild.textChannels:toArray[0].send(member.roles[x][role].name)
            }
            member.guild.textChannels:toArray[0].send('Le echaremos de menos. O no.').catch(console.log)
            // WIP--------------  TODO TODO
        }
    })   
}
