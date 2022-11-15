import Config from "./config/config.js";
import clientSetup from "./src/clientSetup.js";
import setupAudioModule from "./src/audio.js";

const client = clientSetup();
setupAudioModule(client);

client.login(process.env.discordToken || Config.discordToken);
