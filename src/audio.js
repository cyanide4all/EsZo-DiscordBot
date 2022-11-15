import glob from "glob";
import { USER_ID_ESZOBOT, SUPPORTED_COMMANDS, REGEX } from "../eszo.const.js";
import { createReadStream } from "fs";
import ytdl from "ytdl-core";

import { createRequire } from "module";
const { joinVoiceChannel, createAudioPlayer, createAudioResource } =
  createRequire(import.meta.url)("@discordjs/voice"); // Workaround for ES6 modules

const getConnection = (channel) => {
  if (!channel) return null;
  return joinVoiceChannel({
    guildId: channel.guild.id,
    channelId: channel.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
  });
};

export default (client) => {
  let connection = null;

  const getAudioPlayer = () => {
    const player = createAudioPlayer();

    player.on("error", console.error);

    player.on("stateChange", (_, newState) => {
      if (newState.status === "idle") {
        connection.destroy();
      }
    });

    return player;
  };

  const player = getAudioPlayer();

  const playAudioInChannel = function (source, channel) {
    connection = getConnection(channel);
    if (connection) {
      const resource = createAudioResource(source);
      connection.subscribe(player);
      player.play(resource);
    }
  };

  client.on("voiceStateUpdate", (prevState, newState) => {
    if (prevState.member.id != USER_ID_ESZOBOT) {
      if (newState.channel == null && prevState.channel != null) {
        if (Math.random() > 0.95) {
          playAudioInChannel(
            createReadStream("audio/casa.mp3"),
            prevState.channel
          );
        }
      }
      if (newState.channel != null && prevState.channel == null) {
        if (Math.random() > 0.95) {
          playAudioInChannel(
            createReadStream("audio/hellomonkey.mp3"),
            newState.channel
          );
        }
      }
    }
  });

  client.on("messageCreate", (message) => {
    // Comandos definidos
    if (
      SUPPORTED_COMMANDS.findIndex(
        (cmd) => message.content && message.content.toLowerCase() == cmd
      ) !== -1
    ) {
      playAudioInChannel(
        createReadStream(
          "audio/" +
            message.content.toLowerCase().slice(1, message.content.length) +
            ".mp3"
        ),
        message.member.voice?.channel
      );
    }
    // Youtube
    else if (REGEX.YT.test(message.content)) {
      if (ytdl.validateURL(message.content.split(" ")[1])) {
        playAudioInChannel(
          ytdl(message.content.split(" ")[1], { filter: "audioonly" }),
          message.member.voice?.channel
        );
      } else {
        message.reply(
          "HAY COSAS PATÉTICAS, Y LUEGO ESTÁ NO SABER COPIAR LA URL DE UN VÍDEO EN YOUTUBE"
        );
      }
    }
    // WAH
    else if (REGEX.WAH.test(message.content)) {
      if (Math.random() < 0.9) {
        playAudioInChannel(
          createReadStream("audio/wah.mp3"),
          message.member.voice?.channel
        );
      } else {
        playAudioInChannel(
          createReadStream("audio/wahluigi.mp3"),
          message.member.voice?.channel
        );
      }
    }
    // F
    else if (message.content === "F") {
      glob("*/F-*.mp3", null, function (_, files) {
        playAudioInChannel(
          createReadStream(
            `audio/F-${Math.floor(Math.random() * files.length)}.mp3`
          ),
          message.member.voice?.channel
        );
      });
    }
    // TORBJORN
    else if (REGEX.TORB.test(message.content)) {
      playAudioInChannel(
        createReadStream("audio/torb.mp3"),
        message.member.voice?.channel
      );
    }
  });
};
