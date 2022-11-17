import Config from "./config/config.js";
import clientSetup from "./src/clientSetup.js";
import setupAudioModule from "./src/audio.js";
import setupMemberManagementModule from "./src/memberManagement.js";

const client = clientSetup();
setupAudioModule(client);
setupMemberManagementModule(client);

client.login(process.env.discordToken || Config.discordToken);
