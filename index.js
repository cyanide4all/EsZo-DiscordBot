import Config from "./config/config.js";
import clientSetup from "./src/clientSetup.js";
import setupAudioModule from "./src/audio.js";
import setupMemberManagementModule from "./src/memberManagement.js";
import setupBirthdaysSupport from "./src/birthdays.js";
import setupAiModule from "./src/ai.js";

const client = clientSetup();

setupAudioModule(client);
setupMemberManagementModule(client);
setupBirthdaysSupport(client);
setupAiModule(client);

client.login(process.env.discordToken ?? Config.discordToken);
