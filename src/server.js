module.exports = (client) => {
    // Listener para cuando se viene alguien nuevo
    client.on('guildMemberAdd', member => {
        // El mensaje se manda al canal por defecto (boop)
        member.guild.defaultChannel.send(`Bienvenido a nuestro servidor, ${member}.\nEs un lugar bonito y lleno de personas amables.\nQuédate si no eres cuadrado.\nSi necesitas ayuda escribe '!halpmepls'`).catch(console.log);
    })
    
    // Listener para cuando alguien se pira o lo echamos (Aunque eso es poco probable)
    client.on('guildMemberRemove', member => {
        // El mensaje se manda al canal por defecto (boop)
        member.guild.defaultChannel.send(`Nuestro querido miembro, ${member}, se ha ido para siempre.\nSe ruega una oración por su alma y la asistencia a la conducción`);
    })   

    // Listener para cuando alguien cambia de nombre
    client.on('guildMemberUpdate', (anterior, nuevo) => {
        nuevo.guild.defaultChannel.send(`${anterior.displayName} ahora se llama ${nuevo.displayName}`);
    })   
}
