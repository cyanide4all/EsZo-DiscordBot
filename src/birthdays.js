import { DISCORD_EVENTS } from "../eszo.const.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const birthdaysData = require("../config/bdays.json");
const BDAY_REQUEST = "!cumples";

export default (client) => {
  let lastBirthdayMesageTimestamp = -1;
  client.on(DISCORD_EVENTS.MESSAGE, (message) => {
    if (message.content === BDAY_REQUEST) {
      const currentDate = new Date();
      const bdaysOfTheMonth = birthdaysData
        .filter(
          (each) =>
            new Date(each.date).getMonth() === currentDate.getMonth() &&
            new Date(each.date).getDate() >= currentDate.getDate()
        )
        .sort((a, b) => {
          return new Date(a.date).getDate() < new Date(b.date).getDate()
            ? -1
            : 1;
        });
      if (bdaysOfTheMonth.length === 0) {
        message.reply("No hay cumples este mes");
      } else {
        let response = `Cumples del mes: \n`;
        bdaysOfTheMonth.forEach((each) => {
          response = response.concat(
            `${each.cummer} el día ${new Date(each.date).getDate()}\n`
          );
        });
        message.reply(response);
      }
    }
  });

  client.on(DISCORD_EVENTS.MESSAGE, (message) => {
    const currentDate = new Date();
    if (
      new Date(lastBirthdayMesageTimestamp).getDate() < currentDate.getDate()
    ) {
      const bdaysOfToday = birthdaysData.filter(
        (each) =>
          new Date(each.date).getMonth() === currentDate.getMonth() &&
          new Date(each.date).getDate() === currentDate.getDate()
      );
      lastBirthdayMesageTimestamp = currentDate.getTime();
      if (bdaysOfToday.length > 0) {
        bdaysOfToday.forEach((each) => {
          message.guild.systemChannel.send(`HOY ES EL CUM DE <@!${each.id}>`);
        });
      }
    }
  });
};
