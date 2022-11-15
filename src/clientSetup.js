import { Client, GatewayIntentBits } from "discord.js";
import createExpressApp from "express";
import * as http from 'http';

export default () => {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildBans,
      GatewayIntentBits.GuildEmojisAndStickers,
      GatewayIntentBits.GuildIntegrations,
      GatewayIntentBits.GuildWebhooks,
      GatewayIntentBits.GuildInvites,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildMessageTyping,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.DirectMessageReactions,
      GatewayIntentBits.DirectMessageTyping,
      GatewayIntentBits.GuildScheduledEvents,
      GatewayIntentBits.AutoModerationConfiguration,
      GatewayIntentBits.AutoModerationExecution,
    ],
  });

  client.on("ready", () => {
    console.log("Doing some gud' ol' barrel rolls...");
  });
  
  const app = createExpressApp();
  app.get("/", (_, res) => {
    res.sendStatus(200);
  });
  app.listen(10000);

  setInterval(function() {
    http.get("https://eszobot.onrender.com/");
    console.log("Sent keepalive request");
  }, 200000);
  
  return client;
};
