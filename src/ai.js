import config from "../config/config.js";
import iaConfig, { iaModel } from "../config/iaConfig.js";
import { DISCORD_EVENTS, REGEX } from "../eszo.const.js";
import { GoogleGenAI } from "@google/genai";
import { playTextInAudioChannel } from "./audio.js";

const ai = new GoogleGenAI({ apiKey: process.env.iaToken ?? config.aiToken });
const chat = ai.chats.create({
  model: iaModel,
  config: iaConfig,
});

export default (client) => {
  client.on(DISCORD_EVENTS.MESSAGE, (message) => {
    if (REGEX.AI.test(message.content)) {
      const actualAiRequest = message.content.slice(4); // Remove "!ai " portion

      chat
        .sendMessage({ message: actualAiRequest })
        .then((content) => {
          const ttsContent = content.text;
          if (message.member.voice?.channel) {
            playTextInAudioChannel(ttsContent, message.member.voice?.channel);
          } else {
            message.channel.send(ttsContent);
          }
        })
        .catch((err) => {
          console.log(err);
          message.reply("He pensado demasiado por hoy, déjame en paz");
        });
    }
  });
};
