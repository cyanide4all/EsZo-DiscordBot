module.exports = (client) => {
    // Listener para cuando se viene alguien nuevo
    client.on('guildMemberAdd', member => {
        // El mensaje se manda al canal por defecto (boop)
        member.guild.defaultChannel.send(`Bienvenido a nuestro servidor, ${member}.\nEs un lugar bonito y lleno de personas amables.\nQuédate si no maineas ni Bastion, ni Yasuo ni Symmetra.\nSi necesitas ayuda escribe '!halpmepls'`);
    })
    
    // Listener para cuando alguien se pira o lo echamos (Aunque eso es poco probable)
    client.on('guildMemberRemove', member => {
        // El mensaje se manda al canal por defecto (boop)
        member.guild.defaultChannel.send(`Nuestro querido miembro, ${member}, se ha ido para siempre.\nSe ruega una oración por su alma y la asistencia a la conducción`);
        if(member.roles.length > 0){
            member.guild.defaultChannel.send('Sus roles eran:')
            // WIP--------------  TODO TODO
            for(var x in member.roles){
                member.guild.defaultChannel.send(member.roles[x][role].name)
            }
            member.guild.defaultChannel.send('Le echaremos de menos. O no.')
            // WIP--------------  TODO TODO
        }
    })   
}
