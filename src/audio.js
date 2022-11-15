import glob from "glob";
import {
  USER_ID_ESZOBOT,
  SUPPORTED_COMMANDS,
  CHANNEL_ID_BEEP_BEEP_BOP,
} from "../eszo.const.js";
import { createReadStream } from "fs";

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

  const playAudioFileInChannel = function (uri, channel) {
    connection = getConnection(channel);
    if (connection) {
      const resource = createAudioResource(createReadStream(uri));
      connection.subscribe(player);
      player.play(resource);
    }
  };

  client.on("voiceStateUpdate", (prevState, newState) => {
    if (prevState.member.id != USER_ID_ESZOBOT) {
      if (newState.channel == null && prevState.channel != null) {
        if (Math.random() > 0.95) {
          playAudioFileInChannel("audio/casa.mp3", prevState.channel);
        }
      }
      if (newState.channel != null && prevState.channel == null) {
        if (Math.random() > 0.95) {
          playAudioFileInChannel("audio/hellomonkey.mp3", newState.channel);
        }
      }
    }
  });

  client.on("messageCreate", (message) => {
    if (message.channelId === CHANNEL_ID_BEEP_BEEP_BOP) {
      // Comandos definidos
      if (
        SUPPORTED_COMMANDS.findIndex(
          (cmd) => message.content && message.content.toLowerCase() == cmd
        ) !== -1
      ) {
        playAudioFileInChannel(
          "audio/" +
            message.content.toLowerCase().slice(1, message.content.length) +
            ".mp3",
          message.member.voice?.channel
        );
      }
      // F
      else if (message.content === "F") {
        glob("*/F-*.mp3", null, function (_, files) {
          playAudioFileInChannel(
            `audio/F-${Math.floor(Math.random() * files.length)}.mp3`,
            message.member.voice?.channel
          );
        });
      }
      // TORBJORN
      else if (regex.regexTorb.test(message.content)) {
        playAudioFileInChannel("audio/torb.mp3", message.member.voice?.channel);
      }
    }
  });
};
