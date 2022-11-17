import { DISCORD_EVENTS } from "../eszo.const.js";

export default (client) => {
  client.on(DISCORD_EVENTS.NEW_MEMBER, (member) => {
    member.guild.systemChannel &&
      member.guild.systemChannel
        .send(
          `Bienvenido a nuestro servidor, ${member}.\nContigo ya somos ${member.guild.memberCount}!\nEste es un lugar bonito y lleno de personas amables.\nQuédate si no eres cuadrado`
        )
        .catch(console.log);
  });

  client.on(DISCORD_EVENTS.MEMBER_LEAVE, (member) => {
    member.guild.systemChannel &&
      member.guild.systemChannel.send(
        `Nuestro querido miembro, ${member}, se ha ido para siempre.\nSe ruega una oración por su alma y la asistencia a la conducción`
      );
  });

  client.on(DISCORD_EVENTS.MEMBER_UPDATE, (oldMember, newMember) => {
    if (
      newMember.guild.systemChannel &&
      oldMember.displayName !== newMember.displayName
    ) {
      newMember.guild.systemChannel.send(
        `${oldMember.displayName} ahora se llama ${newMember.displayName}`
      );
    }
  });
};
