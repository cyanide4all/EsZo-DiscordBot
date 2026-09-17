import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import birthdayRoomsConfig from "../config/birthdayRooms.config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, "../config/birthdayRooms.state.json");
const BIRTHDAYS_FILE = path.join(__dirname, "../config/bdays.json");
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const buttonCooldowns = new Map();

const IDS = {
  INVITE: "birthday:invite",
  INVITE_INTERNAL_SELECT: "birthday:invite-internal-select",
  INVITE_EXTERNAL: "birthday:invite-external",
  GIFT: "birthday:gift",
  REMOVE_GIFT: "birthday:remove-gift",
  JOIN: "birthday:join",
  DECLINE: "birthday:decline",
  PAID: "birthday:paid",
  UNPAID: "birthday:unpaid",
  CLOSE: "birthday:close",
  INVITE_MODAL: "birthday:invite-modal",
  GIFT_MODAL: "birthday:gift-modal",
  INVITE_USER: "birthday:invite-user",
  GIFT_NAME: "birthday:gift-name",
  GIFT_AMOUNT: "birthday:gift-amount",
  GIFT_PAYER_SELECT: "birthday:gift-payer-select",
};

const pendingGifts = new Map();

const emptyState = () => ({ rooms: {}, closedCycles: {}, birthdayPromptedAt: {}, birthdayPromptFailures: {}, birthdayNotes: {}, registryMessageId: null, registryChannelId: null });

async function loadState() {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.rooms) return emptyState();
    return { ...emptyState(), ...parsed };
  } catch (error) {
    if (error.code !== "ENOENT") console.error("[birthdayRooms] loadState", error);
    return emptyState();
  }
}

async function saveState(state) {
  const tempFile = `${STATE_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(state, null, 2), "utf8");
  await fs.rename(tempFile, STATE_FILE);
}


async function loadBirthdays() {
  try {
    const raw = await fs.readFile(BIRTHDAYS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code !== "ENOENT") console.error("[birthdayRooms] loadBirthdays", error);
    return [];
  }
}

async function saveBirthdays(birthdays) {
  const tempFile = `${BIRTHDAYS_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(birthdays, null, 2) + "\n", "utf8");
  await fs.rename(tempFile, BIRTHDAYS_FILE);
}

function parseBirthDate(value) {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const currentYear = new Date().getUTCFullYear();
  if (year < 1900 || year > currentYear || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return { day, month, year, timestamp: date.getTime(), formatted: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}` };
}

function nextBirthdayOccurrence(birthday, now, timezone) {
  const { year, month, day } = localDateParts(now, timezone);
  const currentYear = Number(year);
  const md = birthdayMonthDay(birthday.date, timezone);
  const [birthMonth, birthDay] = md.split("-").map(Number);

  function validOccurrence(y) {
    const d = new Date(Date.UTC(y, birthMonth - 1, birthDay, 12, 0, 0));
    if (d.getUTCMonth() !== birthMonth - 1 || d.getUTCDate() !== birthDay) {
      // 29/02: en años no bisiestos lo tratamos como 28/02 para no perder el cumpleaños.
      if (birthMonth === 2 && birthDay === 29) return new Date(Date.UTC(y, 1, 28, 12, 0, 0));
    }
    return d;
  }

  const todayUtc = Date.UTC(currentYear, Number(month) - 1, Number(day));
  let occurrence = validOccurrence(currentYear);
  let occurrenceDay = Date.UTC(occurrence.getUTCFullYear(), occurrence.getUTCMonth(), occurrence.getUTCDate());
  if (occurrenceDay < todayUtc) {
    occurrence = validOccurrence(currentYear + 1);
    occurrenceDay = Date.UTC(occurrence.getUTCFullYear(), occurrence.getUTCMonth(), occurrence.getUTCDate());
  }
  const daysUntil = Math.round((occurrenceDay - todayUtc) / DAY_MS);
  const dateKey = `${occurrence.getUTCFullYear()}-${String(occurrence.getUTCMonth() + 1).padStart(2, "0")}-${String(occurrence.getUTCDate()).padStart(2, "0")}`;
  return { daysUntil, dateKey };
}

function birthdayDisplayName(member, fallback) {
  return (member?.displayName || fallback || "alguien").replace(/[@#`*_~|>]/g, "").slice(0, 80);
}

function localDateParts(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
}

function birthdayMonthDay(timestamp, timezone) {
  const date = new Date(timestamp);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
  return `${map.month}-${map.day}`;
}

function todayKey(date, timezone) {
  const { year, month, day } = localDateParts(date, timezone);
  return `${year}-${month}-${day}`;
}

function todayMonthDay(date, timezone) {
  const { month, day } = localDateParts(date, timezone);
  return `${month}-${day}`;
}

function slugifyChannelName(name) {
  return `cumple-${name}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}


function canUseBirthdayRegistryCommands(member, config) {
  if (!member) return false;
  return member.roles?.cache?.has(config.participantRoleId) || canManage(member, config);
}

function formatUpcomingBirthdays(birthdays, timezone) {
  const now = new Date();
  const rows = birthdays
    .map((birthday) => {
      const next = nextBirthdayOccurrence(birthday, now, timezone);
      return { birthday, ...next };
    })
    // "Próximo trimestre" = próximos tres meses. 93 días cubre cualquier combinación
    // de tres meses consecutivos sin perder el último día por meses de 31 días.
    .filter((entry) => entry.daysUntil >= 0 && entry.daysUntil <= 93)
    .sort((a, b) => a.daysUntil - b.daysUntil || String(a.birthday.cummer ?? "").localeCompare(String(b.birthday.cummer ?? ""), "es"));

  if (!rows.length) return "🎂 No hay cumpleaños registrados en los próximos tres meses.";

  const lines = rows.map(({ birthday, dateKey, daysUntil }) => {
    const [, month, day] = dateKey.split("-");
    const when = daysUntil === 0 ? "hoy" : daysUntil === 1 ? "mañana" : `en ${daysUntil} días`;
    const name = String(birthday.cummer || "Alguien").replace(/[@#`*_~|>]/g, "").slice(0, 80);
    return `🎈 **${name}** — ${day}/${month} (${when})`;
  });

  return ["🎂 **Próximos cumpleaños — próximos 3 meses**", "", ...lines].join("\n");
}

async function handleBirthdayInfoCommands(message, config, state) {
  if (!message.inGuild()) return false;
  const command = message.content.trim().toLowerCase();
  if (!["!info-cumples", "!cumples", "!proximoscumples"].includes(command)) return false;

  if (!canUseBirthdayRegistryCommands(message.member, config)) {
    await message.reply("Este comando solo está disponible para quienes tienen el rol de cumpleaños o para los gestores.").catch(() => {});
    return true;
  }

  const allowedChannelId = config.registrationChannelId ?? state.registryChannelId ?? null;
  if (allowedChannelId && message.channelId !== allowedChannelId) {
    await message.reply(`Usa los comandos de cumpleaños en <#${allowedChannelId}>.`).catch(() => {});
    return true;
  }

  if (command === "!info-cumples") {
    await message.channel.send({
      content: [
        "🎂 **Ayuda de cumpleaños**",
        "",
        "`!micumple DD/MM/AAAA` — Guarda o actualiza tu fecha de nacimiento.",
        "Ejemplo: `!micumple 07/03/1994`",
        "`!info-micumple texto` — Deja una nota para que aparezca en el canal secreto de tu próximo cumpleaños.",
        "`!info-micumple borrar` — Borra esa nota.",
        "`!cumples` — Muestra los cumpleaños de los próximos 3 meses.",
        "`!proximoscumples` — Hace lo mismo que `!cumples`.",
        "",
        "La fecha escrita con `!micumple` se borra del canal después de guardarse."
      ].join("\n"),
      allowedMentions: { parse: [] },
    });
    return true;
  }

  const birthdays = await loadBirthdays();
  await message.channel.send({
    content: formatUpcomingBirthdays(birthdays, config.timezone),
    allowedMentions: { parse: [] },
  });
  return true;
}
function canManage(member, config) {
  return (
    member.permissions.has(PermissionFlagsBits.ManageChannels) ||
    (config.managerRoleId && member.roles.cache.has(config.managerRoleId))
  );
}

function parseUserId(value) {
  return value.trim().match(/^(?:<@!?)?(\d{16,20})(?:>)?$/)?.[1] ?? null;
}

function roomKey(guildId, birthdayUserId, dateKey) {
  return `${guildId}:${birthdayUserId}:${dateKey}`;
}

function participantIds(room) {
  return [...new Set(room.participantIds ?? [])];
}

function eligibleUserIds(room) {
  // Compatibilidad con estados antiguos: si no existe eligibleUserIds,
  // consideramos elegibles a los participantes/invitados ya guardados.
  return [...new Set(room.eligibleUserIds ?? [
    ...(room.participantIds ?? []),
    ...(room.temporaryInviteIds ?? []),
  ])];
}

function declinedUserIds(room) {
  return [...new Set(room.declinedUserIds ?? [])];
}

function pendingUserIds(room) {
  const accepted = new Set(participantIds(room));
  const declined = new Set(declinedUserIds(room));
  return eligibleUserIds(room).filter((id) => !accepted.has(id) && !declined.has(id));
}

function giftList(room) {
  if (Array.isArray(room.gifts)) return room.gifts;
  return [];
}

function totalGiftCents(room) {
  return giftList(room).reduce((total, gift) => total + (Number(gift.amountCents) || 0), 0);
}

function paymentShares(room) {
  const participants = participantIds(room);
  const total = totalGiftCents(room);
  const shares = new Map();
  if (!participants.length) return shares;

  const base = Math.floor(total / participants.length);
  let remainder = total % participants.length;
  for (const id of participants) {
    shares.set(id, base + (remainder > 0 ? 1 : 0));
    if (remainder > 0) remainder -= 1;
  }
  return shares;
}

function advancedByPayer(room) {
  const advanced = new Map();
  for (const gift of giftList(room)) {
    if (!gift.payerId) continue;
    advanced.set(gift.payerId, (advanced.get(gift.payerId) ?? 0) + (Number(gift.amountCents) || 0));
  }
  return advanced;
}

function giftPayersValid(room) {
  const participants = new Set(participantIds(room));
  return giftList(room).every((gift) => gift.payerId && participants.has(gift.payerId));
}

// Calcula una liquidación global de todos los regalos. Cada participante debe
// asumir su parte del total y recibe crédito por todo lo que haya adelantado.
// Así, varios regalos pagados por la misma persona se consolidan en una sola
// posición y las deudas cruzadas se compensan antes de proponer transferencias.
function settlementPlan(room) {
  const participants = participantIds(room);
  const shares = paymentShares(room);
  const advanced = advancedByPayer(room);

  const debtors = [];
  const creditors = [];
  for (const id of participants) {
    const balance = (advanced.get(id) ?? 0) - (shares.get(id) ?? 0);
    if (balance > 0) creditors.push({ id, cents: balance });
    else if (balance < 0) debtors.push({ id, cents: -balance });
  }

  const transfers = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].cents, creditors[j].cents);
    if (amount > 0) {
      transfers.push({ from: debtors[i].id, to: creditors[j].id, amountCents: amount });
      debtors[i].cents -= amount;
      creditors[j].cents -= amount;
    }
    if (debtors[i].cents === 0) i += 1;
    if (creditors[j].cents === 0) j += 1;
  }
  return transfers;
}

function outgoingTransfers(room, userId) {
  return settlementPlan(room).filter((transfer) => transfer.from === userId);
}

function formatEuros(cents) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format((Number(cents) || 0) / 100);
}

function parseMoneyToCents(value) {
  const cleaned = value.trim().replace(/\s/g, "").replace(/€/g, "");
  if (!cleaned) return null;
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

function resetPayments(room) {
  room.paidUserIds = [];
  room.settledAt = null;
}


function roomIsFullySettled(room) {
  return (
    giftList(room).length > 0 &&
    giftPayersValid(room) &&
    participantIds(room).length > 0 &&
    pendingUserIds(room).length === 0 &&
    unpaidIds(room).length === 0
  );
}

function autoCloseDays(config) {
  const value = Number(config.autoCloseDays ?? 3);
  return Number.isFinite(value) && value >= 0 ? value : 3;
}

function localDateKey(date, timezone) {
  const { year, month, day } = localDateParts(date, timezone);
  return `${year}-${month}-${day}`;
}

function birthdayHasPassed(room, now, timezone) {
  // dateKey es YYYY-MM-DD. El cumpleaños se considera "pasado" a partir del día siguiente.
  return Boolean(room.dateKey) && localDateKey(now, timezone) > room.dateKey;
}

async function markRoomSettled(channel, room, state, config, now = new Date()) {
  if (!roomIsFullySettled(room) || room.settledAt) return false;
  // Aunque todos paguen antes, no empieza la cuenta atrás hasta que haya pasado el cumpleaños.
  if (!birthdayHasPassed(room, now, config.timezone)) return false;

  room.settledAt = now.toISOString();
  await saveState(state);
  const days = autoCloseDays(config);
  const when = days === 0 ? 'en unos minutos' : `en **${days} día${days === 1 ? '' : 's'}**`;
  await channel.send({
    content: `🎂 **Cumpleaños superado y deudas saldadas.** Pescadería Paqui da el expediente por concluido.\n🔒 El canal se cerrará automáticamente ${when}. Un gestor puede cerrarlo antes con **Cerrar canal**.`,
    allowedMentions: { parse: [] },
  });
  await updateDashboard(channel, room);
  return true;
}

async function checkAutoCloseChannels(client, config, state, now = new Date()) {
  const days = autoCloseDays(config);
  const delayMs = days * 24 * 60 * 60 * 1000;

  for (const [key, room] of Object.entries(state.rooms)) {
    if (!roomIsFullySettled(room)) continue;

    const guild = await client.guilds.fetch(room.guildId).catch(() => null);
    const channel = guild ? await guild.channels.fetch(room.channelId).catch(() => null) : null;

    // Si se pagó todo antes del cumpleaños, el chequeo periódico inicia el cierre al día siguiente.
    if (!room.settledAt) {
      if (!channel || !birthdayHasPassed(room, now, config.timezone)) continue;
      await markRoomSettled(channel, room, state, config, now);
    }

    const settledAt = new Date(room.settledAt).getTime();
    if (!Number.isFinite(settledAt) || now.getTime() - settledAt < delayMs) continue;

    state.closedCycles ??= {};
    state.closedCycles[key] = new Date().toISOString();
    state.birthdayNotes ??= {};
    delete state.birthdayNotes[room.birthdayUserId];
    delete state.rooms[key];
    await saveState(state);

    if (channel) {
      await channel.delete('Cumpleaños cerrado automáticamente: cumpleaños pasado y deudas saldadas').catch((error) =>
        console.error('[birthdayRooms] auto close delete', error),
      );
    }
  }
}

function debtorIds(room) {
  return [...new Set(settlementPlan(room).map((transfer) => transfer.from))];
}

function unpaidIds(room) {
  const paid = new Set(room.paidUserIds ?? []);
  return debtorIds(room).filter((id) => !paid.has(id));
}

function paymentChecklistText(room) {
  const participants = participantIds(room);
  const paid = new Set(room.paidUserIds ?? []);
  const shares = paymentShares(room);
  const advanced = advancedByPayer(room);
  const plan = settlementPlan(room);
  const debtors = new Set(plan.map((t) => t.from));

  if (!participants.length) return "Todavía no hay participantes confirmados.";
  if (giftList(room).length && !giftPayersValid(room)) {
    return "⚠️ Hay regalos antiguos sin un pagador válido. Quita esos regalos y vuelve a añadirlos indicando quién adelantó el dinero.";
  }

  const participantLines = participants.map((id) => {
    const ownShare = shares.get(id) ?? 0;
    const fronted = advanced.get(id) ?? 0;
    if (!debtors.has(id)) {
      return `✅ <@${id}> — parte ${formatEuros(ownShare)}${fronted ? ` · adelantó ${formatEuros(fronted)}` : ""}`;
    }
    return `${paid.has(id) ? "✅" : "⬜"} <@${id}> — parte ${formatEuros(ownShare)}${fronted ? ` · adelantó ${formatEuros(fronted)}` : ""}`;
  });

  const transferLines = plan.length
    ? plan.map((t) => `${paid.has(t.from) ? "✅" : "⬜"} <@${t.from}> → <@${t.to}>: **${formatEuros(t.amountCents)}**`)
    : ["No hace falta hacer transferencias: las cantidades adelantadas ya cuadran con el reparto."];

  const totalDebtors = debtorIds(room).length;
  const paidDebtors = debtorIds(room).filter((id) => paid.has(id)).length;
  return [
    `**Checklist de pagos (${paidDebtors}/${totalDebtors})**`,
    ...participantLines,
    "",
    "**Transferencias finales (compensadas)**",
    ...transferLines,
  ].join("\n");
}

const REMINDER_MESSAGES = [
  "⚰️ **ESQUELAS PAQUI INFORMA**\nLa deuda sigue más viva que algunos familiares. Procedan al pago antes de que haya que ponerle flores al Excel.",
  "🏥 **PARTE MÉDICO**\nEl paciente presenta tensión estable, saturación correcta y una deuda que no responde al tratamiento.",
  "⚱️ **FUNERARIA MANOLO**\nDos cosas son inevitables en esta vida: la muerte y que Pescadería Paqui encuentre una transferencia pendiente.",
  "🪦 **CONSULTA A LA OUIJA**\nLos muertos no han contestado. El Excel sí. Y viene con importes pendientes.",
  "🚑 **SERVICIO DE URGENCIAS DEL BIZUM**\nSe descarta emergencia médica. Hacienda Cumpleañera mantiene el pronóstico reservado.",
  "🕯️ **MINUTO DE SILENCIO**\nPor todos aquellos que dijeron «te lo paso esta tarde» y jamás regresaron.",
  "🛩️ **CAJA NEGRA RECUPERADA**\nLas últimas palabras registradas fueron: «yo juraría que ya había pagado».",
  "🏚️ **HALLAZGO ARQUEOLÓGICO**\nAparece una tablilla de una civilización perdida con la inscripción «luego te hago el Bizum». Los expertos la datan del martes pasado.",
  "☢️ **CONSEJO DE SEGURIDAD NUCLEAR**\nLos niveles de radiación son normales. Los de morosidad, sorprendentemente, no.",
  "🧬 **INSTITUTO DE GENÉTICA**\nHan secuenciado el genoma humano entero y todavía no encuentran el gen que impide hacer una transferencia.",
  "🐟 **PESCADERÍA PAQUI**\nHoy: merluza, gallo y consecuencias. Las deudas siguen pendientes. Pregunte por nuestros planes de financiación.",
  "⚖️ **JUZGADO DE PRIMERA INSTANCIA DE VILLACONEJOS**\nEl acusado queda absuelto por falta de pruebas. La deuda no.",
  "📺 **SUPERVIVIENTES: EDICIÓN DEUDORES**\nEl último en hacer la transferencia gana un coco y el desprecio administrativo de Paqui.",
  "🚨 **PROTECCIÓN CIVIL**\nRecomienda permanecer en casa, cerrar puertas y ventanas y, ya que tienes el móvil en la mano, pagar lo que debes.",
  "🐗 **ATENCIÓN: SE HA ESCAPADO UN JABALÍ EN ALBACETE**\nNo tiene absolutamente nada que ver, pero el departamento de contabilidad insiste en comunicar que quedan pagos pendientes.",
  "🧾 **GESTORÍA MANOLO E HIJOS S.L.**\nRogamos procedan al abono antes de que venga mi cuñado con el Excel y una carpeta azul.",
  "🪐 **NASA / MERCADONA — COMUNICADO CONJUNTO**\nMercurio está retrógrado, el pasillo de congelados está fregado y todavía quedan pagos pendientes. Coincidencia: probablemente.",
  "📡 **ÚLTIMA HORA DESDE CUENCA**\nUna señora ha cerrado una ventana porque hacía corriente. En otro orden de cosas, la deuda continúa entre nosotros.",
  "📺 **TELETEXTO 742**\nBetis 2 - Getafe 1. Euromillones: no te ha tocado. Transferencias pendientes: sorprendentemente, sí.",
  "🧙 **ORÁCULO DE LA ROTONDA**\nHe consultado tres cartas, dos palomas y un ticket del Lidl. Todo apunta a que toca pagar.",
  "☎️ **SERVICIO TÉCNICO DEL CUMPLEAÑOS**\n¿Ha probado a apagar y encender el Bizum? Si persiste la incidencia, pruebe a pagar.",
  "🦆 **FEDERACIÓN NACIONAL DE PATOS CON CALZADO**\nCuac cuac. No tenemos más declaraciones. El departamento de contabilidad sí.",
  "🏗️ **OBRAS Y REFORMAS ANTONIO**\nPresupuesto sin compromiso. La transferencia, en cambio, sí tiene compromiso.",
  "🧀 **QUESERÍA EL TRANCHEte FELIZ**\nCurado, semicurado y pagos sin curar. Pregunte por nuestras ofertas de martes.",
];

function reminderText(room) {
  const unpaid = unpaidIds(room);
  if (!unpaid.length) return null;
  const plan = settlementPlan(room);
  const line = unpaid.map((id) => {
    const total = plan
      .filter((transfer) => transfer.from === id)
      .reduce((sum, transfer) => sum + transfer.amountCents, 0);
    return `<@${id}> (${formatEuros(total)})`;
  }).join(", ");
  const meme = REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)];
  return `${meme}\n\nPendientes: ${line}`;
}

function reminderReferenceAt(room) {
  if (room.lastReminderAt) return new Date(room.lastReminderAt).getTime();
  const firstGift = giftList(room)[0];
  if (firstGift?.addedAt) return new Date(firstGift.addedAt).getTime();
  return null;
}

async function sendPaymentReminder(channel, room, state, { automatic = false } = {}) {
  if (!giftList(room).length || !participantIds(room).length || !giftPayersValid(room) || !unpaidIds(room).length) return false;
  const content = reminderText(room);
  if (!content) return false;

  await channel.send({
    content: `${automatic ? "⏰ **Recordatorio semanal automático**\n" : ""}${content}`,
    allowedMentions: { users: unpaidIds(room) },
  });
  room.lastReminderAt = new Date().toISOString();
  await saveState(state);
  return true;
}

async function checkWeeklyReminders(client, state, now = new Date()) {
  for (const room of Object.values(state.rooms)) {
    if (!giftList(room).length || !participantIds(room).length || !giftPayersValid(room) || !unpaidIds(room).length) continue;
    const reference = reminderReferenceAt(room);
    if (!reference || now.getTime() - reference < WEEK_MS) continue;

    const guild = await client.guilds.fetch(room.guildId).catch(() => null);
    if (!guild) continue;
    const channel = await guild.channels.fetch(room.channelId).catch(() => null);
    if (!channel?.isTextBased()) continue;

    await sendPaymentReminder(channel, room, state, { automatic: true }).catch((error) =>
      console.error("[birthdayRooms] weekly reminder", error),
    );
  }
}

function dashboardText(room) {
  const participants = participantIds(room);
  const pending = pendingUserIds(room);
  const declined = declinedUserIds(room);
  const paid = new Set(room.paidUserIds ?? []);
  const gifts = giftList(room);
  const total = totalGiftCents(room);
  const shares = paymentShares(room);
  const advanced = advancedByPayer(room);
  const plan = settlementPlan(room);
  const debtors = new Set(plan.map((transfer) => transfer.from));

  const giftLines = gifts.length
    ? gifts.map((gift, index) => `${index + 1}. **${gift.name}** — ${formatEuros(gift.amountCents)} · ${gift.payerId ? `paga <@${gift.payerId}>` : "sin pagador asignado"}`)
    : ["Todavía no hay regalos añadidos."];

  const participantLines = participants.map((id) => {
    const share = shares.get(id) ?? 0;
    const fronted = advanced.get(id) ?? 0;
    const status = debtors.has(id) ? (paid.has(id) ? "✅" : "⬜") : "✅";
    return `${status} <@${id}> — parte **${formatEuros(share)}**${fronted ? ` · adelantó **${formatEuros(fronted)}**` : ""}`;
  });

  const transferLines = plan.length
    ? plan.map((transfer) => `${paid.has(transfer.from) ? "✅" : "⬜"} <@${transfer.from}> → <@${transfer.to}>: **${formatEuros(transfer.amountCents)}**`)
    : ["No hay transferencias pendientes."];

  return [
    `🎂 Canal para preparar el regalo de **${room.birthdayName || "cumpleañero"}**.`,
    "El cumpleañero no recibe menciones y tiene denegado ver/escribir en este canal (salvo la excepción de Administrador/propietario de Discord).",
    "Al entrar, cada persona debe confirmar si participa. Si elige **No participo**, pierde automáticamente el acceso al canal.",
    room.birthdayNote ? `\n💬 **Mensaje del cumpleañero**\n${room.birthdayNote}` : "",
    "",
    "**Regalos**",
    ...giftLines,
    "",
    `**Total:** ${formatEuros(total)}`,
    `**Participantes confirmados:** ${participants.length}`,
    `**Pendientes de confirmar:** ${pending.length}`,
    `**Han rechazado:** ${declined.length}`,
    participants.length && gifts.length
      ? "El bot compensa todos los regalos y calcula una liquidación global; varios regalos adelantados por la misma persona se suman automáticamente."
      : "Añade regalos y participantes para calcular el reparto.",
    gifts.length && !giftPayersValid(room)
      ? "⚠️ Hay algún regalo sin pagador válido; vuelve a añadirlo para poder liquidar y cerrar el canal."
      : "",
    "",
    "**Participantes**",
    participantLines.join("\n") || "Todavía no hay participantes.",
    "",
    "**Liquidación final**",
    ...transferLines,
  ].join("\n");
}

function dashboardComponents(room) {
  const giftsChosen = giftList(room).length > 0;
  const participants = participantIds(room);
  const pending = pendingUserIds(room);
  const payersValid = giftPayersValid(room);
  const canClose =
    giftsChosen &&
    payersValid &&
    participants.length > 0 &&
    pending.length === 0 &&
    unpaidIds(room).length === 0;

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(IDS.JOIN)
        .setLabel("Sí, participo")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(IDS.DECLINE)
        .setLabel("No participo")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(IDS.PAID)
        .setLabel("He pagado")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!giftsChosen || !payersValid || participants.length === 0),
      new ButtonBuilder()
        .setCustomId(IDS.UNPAID)
        .setLabel("No he pagado")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!giftsChosen || !payersValid || participants.length === 0),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(IDS.INVITE)
        .setLabel("Invitar persona")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(IDS.GIFT)
        .setLabel("Añadir regalo")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(IDS.REMOVE_GIFT)
        .setLabel("Quitar último regalo")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!giftsChosen),
      new ButtonBuilder()
        .setCustomId(IDS.CLOSE)
        .setLabel("Cerrar canal")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!canClose),
    ),
  ];
}

async function updateDashboard(channel, room) {
  if (!room.dashboardMessageId) return;
  const message = await channel.messages.fetch(room.dashboardMessageId).catch(() => null);
  if (!message) return;
  await message.edit({
    content: dashboardText(room),
    components: dashboardComponents(room),
    allowedMentions: { parse: [] },
  });
}

async function createBirthdayRoom(guild, birthday, config, state, dateKey) {
  const key = roomKey(guild.id, birthday.id, dateKey);
  const previousRoom = state.rooms[key] ?? null;
  if (previousRoom) {
    const existingChannel = await guild.channels.fetch(previousRoom.channelId).catch(() => null);
    if (existingChannel) return previousRoom;

    // El estado dice que el canal existe, pero Discord ya no lo tiene.
    // Mientras el ciclo no esté cerrado, lo recreamos conservando regalos, pagos y participantes.
    console.warn(`[birthdayRooms] El canal ${previousRoom.channelId} de ${birthday.cummer} ya no existe; se recreará.`);
  }
  if (state.closedCycles?.[key]) return null;

  const birthdayMember = await guild.members.fetch(birthday.id).catch(() => null);
  if (!birthdayMember) {
    console.warn(`[birthdayRooms] ${birthday.cummer} (${birthday.id}) no está en ${guild.name}`);
    return null;
  }

  const role = await guild.roles.fetch(config.participantRoleId).catch(() => null);
  if (!role) {
    console.error(`[birthdayRooms] No existe el rol ${config.participantRoleId} en ${guild.name}`);
    return null;
  }
  // Intentamos refrescar la caché de miembros, pero NO bloqueamos la creación del canal
  // si Discord no entrega todos los miembros a tiempo (GuildMembersTimeout).
  // El permiso del canal se concede al rol completo, así que el canal puede crearse
  // correctamente usando los miembros que ya estén en caché.
  await guild.members.fetch().catch((error) => {
    console.warn(
      `[birthdayRooms] No se pudo cargar la lista completa de miembros de ${guild.name}; ` +
      `se continuará con la caché disponible (${error?.code ?? error?.message ?? "error desconocido"}).`,
    );
  });
  const eligibleUserIds = role.members
    .filter((member) => !member.user.bot && member.id !== birthday.id)
    .map((member) => member.id);

  const permissionOverwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: guild.members.me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
      ],
    },
    {
      id: role.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    // Defensa extra: aunque el cumpleañero tenga el rol, no verá el canal.
    {
      id: birthday.id,
      deny: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];

  // Si estamos recuperando un canal borrado accidentalmente, restauramos también
  // los permisos individuales de invitados y de quienes rechazaron participar.
  if (previousRoom) {
    for (const userId of previousRoom.temporaryInviteIds ?? []) {
      if (userId === birthday.id) continue;
      permissionOverwrites.push({
        id: userId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      });
    }
    for (const userId of previousRoom.declinedUserIds ?? []) {
      permissionOverwrites.push({
        id: userId,
        deny: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      });
    }
  }

  const channel = await guild.channels.create({
    name: slugifyChannelName(birthday.cummer || birthdayMember.displayName),
    type: ChannelType.GuildText,
    parent: config.categoryId || undefined,
    permissionOverwrites,
    reason: `Canal automático para el cumpleaños de ${birthday.cummer}`,
  });

  const room = previousRoom
    ? {
        ...previousRoom,
        guildId: guild.id,
        channelId: channel.id,
        birthdayUserId: birthday.id,
        birthdayName: birthdayDisplayName(birthdayMember, birthday.cummer),
        birthdayNote: state.birthdayNotes?.[birthday.id]?.text ?? previousRoom.birthdayNote ?? null,
        dateKey,
        eligibleUserIds,
        dashboardMessageId: null,
        recreatedAt: new Date().toISOString(),
      }
    : {
        guildId: guild.id,
        channelId: channel.id,
        birthdayUserId: birthday.id,
        birthdayName: birthdayDisplayName(birthdayMember, birthday.cummer),
        birthdayNote: state.birthdayNotes?.[birthday.id]?.text ?? null,
        dateKey,
        eligibleUserIds,
        participantIds: [],
        declinedUserIds: [],
        temporaryInviteIds: [],
        externalInvites: [],
        paidUserIds: [],
        gifts: [],
        lastReminderAt: null,
        dashboardMessageId: null,
        createdAt: new Date().toISOString(),
        settledAt: null,
      };

  const dashboard = await channel.send({
    content: dashboardText(room),
    components: dashboardComponents(room),
    allowedMentions: { parse: [] },
  });
  room.dashboardMessageId = dashboard.id;
  state.rooms[key] = room;
  await saveState(state);

  return room;
}

async function checkBirthdays(client, config, state, now = new Date()) {
  if (!config.enabled || !config.participantRoleId) return;

  const birthdays = await loadBirthdays();
  if (!birthdays.length) return;
  const leadDays = Number.isFinite(Number(config.createDaysBefore)) ? Number(config.createDaysBefore) : 45;

  const guilds = config.guildId
    ? [await client.guilds.fetch(config.guildId).catch(() => null)].filter(Boolean)
    : [...client.guilds.cache.values()];

  for (const guild of guilds) {
    for (const birthday of birthdays) {
      const occurrence = nextBirthdayOccurrence(birthday, now, config.timezone);
      if (occurrence.daysUntil < 0 || occurrence.daysUntil > leadDays) continue;
      await createBirthdayRoom(guild, birthday, config, state, occurrence.dateKey).catch((error) =>
        console.error("[birthdayRooms] createBirthdayRoom", error),
      );
    }
  }
}

async function resolveConfiguredGuild(client, config, preferredGuild = null) {
  if (preferredGuild && (!config.guildId || preferredGuild.id === config.guildId)) return preferredGuild;
  if (config.guildId) return client.guilds.fetch(config.guildId).catch(() => null);
  if (client.guilds.cache.size === 1) return client.guilds.cache.first();
  return null;
}

async function ensureBirthdayRegistryChannel(guild, config, state) {
  if (!config.managerRoleId) {
    console.warn("[birthdayRooms] No se prepara el canal de registro: define BIRTHDAY_MANAGER_ROLE_ID.");
    return null;
  }

  const managerRole = await guild.roles.fetch(config.managerRoleId).catch(() => null);
  if (!managerRole) {
    console.warn(`[birthdayRooms] No existe el rol gestor ${config.managerRoleId} en ${guild.name}`);
    return null;
  }

  const participantRole = await guild.roles.fetch(config.participantRoleId).catch(() => null);
  if (!participantRole) {
    console.warn(`[birthdayRooms] No existe el rol de cumpleaños ${config.participantRoleId} en ${guild.name}`);
    return null;
  }

  let channel = null;
  if (config.registrationChannelId) {
    channel = await guild.channels.fetch(config.registrationChannelId).catch(() => null);
    if (!channel) {
      console.warn(`[birthdayRooms] No encuentro BIRTHDAY_REGISTRATION_CHANNEL_ID=${config.registrationChannelId} en ${guild.name}`);
    }
  }
  if (!channel && state.registryChannelId) {
    channel = await guild.channels.fetch(state.registryChannelId).catch(() => null);
  }
  if (!channel) {
    channel = guild.channels.cache.find(
      (candidate) => candidate.type === ChannelType.GuildText && candidate.name === "cumpleanos",
    ) ?? null;
  }

  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
    },
    {
      id: guild.members.me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
      ],
    },
    {
      id: managerRole.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    {
      id: participantRole.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];

  if (!channel) {
    channel = await guild.channels.create({
      name: "cumpleanos",
      type: ChannelType.GuildText,
      permissionOverwrites: overwrites,
      reason: "Canal de registro de cumpleaños para el rol configurado",
    });
  } else if (channel.isTextBased()) {
    await channel.permissionOverwrites.set(overwrites, "Permitir registro al rol de cumpleaños y gestión a gestores");
  }

  state.registryChannelId = channel.id;
  return channel;
}

function registrationDashboardText(role, members, birthdays, state) {
  const registered = new Set(birthdays.map((birthday) => String(birthday.id)));
  const people = members.filter((member) => !member.user.bot);
  const missing = people.filter((member) => !registered.has(member.id));
  const failed = new Set(Object.keys(state.birthdayPromptFailures ?? {}));

  const missingLines = missing.length
    ? missing.map((member) => `${failed.has(member.id) ? "⚠️" : "⬜"} <@${member.id}>${failed.has(member.id) ? " — no pude enviarle DM" : ""}`)
    : ["✅ Todo el mundo con el rol tiene su cumpleaños registrado."];

  return [
    "🎂 **Registro de cumpleaños**",
    `Se revisa automáticamente a quienes tienen el rol <@&${role.id}>.`,
    "Este canal lo pueden ver y usar los **gestores** y quienes tengan el rol de cumpleaños.",
    "",
    "**Comando para registrar tu fecha en este canal**",
    "`!micumple DD/MM/AAAA`",
    "Ejemplo: `!micumple 07/03/1994`",
    "`!info-cumples` — Ayuda de comandos de cumpleaños.",
    "`!cumples` / `!proximoscumples` — Cumpleaños de los próximos 3 meses.",
    "El bot borra el mensaje con la fecha después de guardarla para no dejarla publicada.",
    "",
    `Registrados con el rol: **${people.length - missing.length}/${people.length}**`,
    `Faltan: **${missing.length}**`,
    ...missingLines,
    "",
    "Los canales secretos se crean automáticamente **45 días antes** (o el valor configurado) y el cumpleañero no es mencionado ni avisado de su canal.",
  ].join("\n");
}

async function syncBirthdayRegistry(client, config, state) {
  if (!config.enabled || !config.participantRoleId) return;
  const guild = await resolveConfiguredGuild(client, config);
  if (!guild) return;

  const role = await guild.roles.fetch(config.participantRoleId).catch(() => null);
  if (!role) return;
  await guild.members.fetch().catch((error) => {
    console.warn(
      `[birthdayRooms] Registro: no se pudo cargar la lista completa de miembros de ${guild.name}; ` +
      `se usará la caché disponible (${error?.code ?? error?.message ?? "error desconocido"}).`,
    );
  });
  const members = [...role.members.values()].filter((member) => !member.user.bot);
  const birthdays = await loadBirthdays();
  const registered = new Set(birthdays.map((birthday) => String(birthday.id)));
  const now = Date.now();
  const remindEveryMs = (Number(config.registrationReminderDays) || 7) * DAY_MS;

  state.birthdayPromptedAt ??= {};
  state.birthdayPromptFailures ??= {};

  for (const member of members) {
    if (registered.has(member.id)) {
      delete state.birthdayPromptFailures[member.id];
      continue;
    }
    // En v8.1 el registro se hace en el canal configurado. Conservamos
    // el timestamp para compatibilidad con estados anteriores, pero no mandamos DMs.
    const last = new Date(state.birthdayPromptedAt[member.id] ?? 0).getTime();
    if (!Number.isFinite(last) || now - last >= remindEveryMs) {
      state.birthdayPromptedAt[member.id] = new Date().toISOString();
    }
  }

  const channel = await ensureBirthdayRegistryChannel(guild, config, state);
  if (channel?.isTextBased()) {
    const content = registrationDashboardText(role, members, birthdays, state);
    let dashboard = state.registryMessageId
      ? await channel.messages.fetch(state.registryMessageId).catch(() => null)
      : null;
    if (!dashboard) {
      dashboard = await channel.send({ content, allowedMentions: { parse: [] } });
      state.registryMessageId = dashboard.id;
    } else {
      await dashboard.edit({ content, allowedMentions: { parse: [] } });
    }
  }
  await saveState(state);
}

async function privateCommandReply(message, content) {
  if (message.inGuild()) {
    await message.channel.send({
      content: `<@${message.author.id}> ${content}`,
      allowedMentions: { users: [message.author.id] },
    }).catch(() => {});
    return;
  }
  await message.reply({ content, allowedMentions: { parse: [] } });
}

async function handleMyBirthdayCommand(message, client, config, state) {
  const match = message.content.trim().match(/^!micumple(?:\s+(.+))?$/i);
  if (!match) return false;

  if (message.inGuild()) {
    const allowedChannelId = config.registrationChannelId ?? state.registryChannelId ?? null;
    if (allowedChannelId && message.channelId !== allowedChannelId) {
      await message.reply(`Usa este comando en <#${allowedChannelId}> con el formato \`!micumple DD/MM/AAAA\`.`).catch(() => {});
      return true;
    }
    const deleted = await message.delete().then(() => true).catch(() => false);
    if (!deleted) {
      await message.reply("No puedo borrar el mensaje que contiene tu fecha. Pide a un gestor que me dé permiso para Gestionar mensajes en este canal.").catch(() => {});
      return true;
    }
  }

  const guild = await resolveConfiguredGuild(client, config, message.guild ?? null);
  if (!guild) {
    await privateCommandReply(message, "No puedo determinar en qué servidor registrar tu cumpleaños. Define `BIRTHDAY_GUILD_ID`.");
    return true;
  }
  const member = await guild.members.fetch(message.author.id).catch(() => null);
  if (!member || !member.roles.cache.has(config.participantRoleId)) {
    await privateCommandReply(message, "Este comando solo está disponible para quienes tienen el rol de cumpleaños del servidor.");
    return true;
  }

  const parsed = parseBirthDate(match[1] ?? "");
  if (!parsed) {
    await privateCommandReply(message, [
      "Formato incorrecto. Usa:",
      "`!micumple DD/MM/AAAA`",
      "Ejemplo: `!micumple 07/03/1994`",
    ].join("\n"));
    return true;
  }

  const birthdays = await loadBirthdays();
  const index = birthdays.findIndex((birthday) => String(birthday.id) === member.id);
  const entry = {
    cummer: birthdayDisplayName(member, member.user.username),
    id: member.id,
    date: parsed.timestamp,
  };
  if (index >= 0) birthdays[index] = { ...birthdays[index], ...entry };
  else birthdays.push(entry);
  await saveBirthdays(birthdays);

  state.birthdayPromptedAt ??= {};
  state.birthdayPromptFailures ??= {};
  delete state.birthdayPromptFailures[member.id];
  state.birthdayPromptedAt[member.id] = new Date().toISOString();
  await saveState(state);

  await privateCommandReply(message, `✅ Cumpleaños guardado correctamente: **${parsed.formatted}**. Si algún día cambia o lo escribiste mal, puedes volver a usar el mismo comando.`);
  await syncBirthdayRegistry(client, config, state);
  await checkBirthdays(client, config, state);
  return true;
}

async function handleMyBirthdayInfoCommand(message, client, config, state) {
  const match = message.content.trim().match(/^!info-micumple(?:\s+([\s\S]+))?$/i);
  if (!match) return false;
  if (message.inGuild()) await message.delete().catch(() => {});
  const guild = await resolveConfiguredGuild(client, config, message.guild ?? null);
  if (!guild) {
    await privateCommandReply(message, "No puedo determinar el servidor. Define `BIRTHDAY_GUILD_ID`.");
    return true;
  }
  const member = await guild.members.fetch(message.author.id).catch(() => null);
  if (!member || !member.roles.cache.has(config.participantRoleId)) {
    await privateCommandReply(message, "Este comando solo está disponible para quienes tienen el rol de cumpleaños.");
    return true;
  }

  const raw = (match[1] ?? "").trim();
  if (!raw) {
    await privateCommandReply(message, "Uso: `!info-micumple tu mensaje` o `!info-micumple borrar`. Máximo 500 caracteres.");
    return true;
  }

  state.birthdayNotes ??= {};
  if (raw.toLowerCase() === "borrar") {
    delete state.birthdayNotes[member.id];
    for (const room of Object.values(state.rooms)) {
      if (room.guildId === guild.id && room.birthdayUserId === member.id) {
        room.birthdayNote = null;
        const channel = await guild.channels.fetch(room.channelId).catch(() => null);
        if (channel?.isTextBased()) await updateDashboard(channel, room);
      }
    }
    await saveState(state);
    await privateCommandReply(message, "✅ Tu mensaje para el cumpleaños ha sido borrado.");
    return true;
  }

  if (raw.length > 500) {
    await privateCommandReply(message, `El mensaje es demasiado largo (${raw.length}/500). Recórtalo un poco.`);
    return true;
  }
  const text = raw.replace(/@everyone/gi, "＠everyone").replace(/@here/gi, "＠here");
  state.birthdayNotes[member.id] = { text, updatedAt: new Date().toISOString() };
  for (const room of Object.values(state.rooms)) {
    if (room.guildId === guild.id && room.birthdayUserId === member.id) {
      room.birthdayNote = text;
      const channel = await guild.channels.fetch(room.channelId).catch(() => null);
      if (channel?.isTextBased()) await updateDashboard(channel, room);
    }
  }
  await saveState(state);
  await privateCommandReply(message, "✅ Mensaje guardado. Se mostrará en el canal secreto de tu cumpleaños y se borrará cuando ese grupo se cierre.");
  return true;
}

function findRoomForChannel(state, channelId) {
  const entry = Object.entries(state.rooms).find(([, room]) => room.channelId === channelId);
  return entry ? { key: entry[0], room: entry[1] } : null;
}

async function showInviteModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId(IDS.INVITE_MODAL)
    .setTitle("Añadir invitado temporal");
  const input = new TextInputBuilder()
    .setCustomId(IDS.INVITE_USER)
    .setLabel("Mención o ID del usuario")
    .setPlaceholder("@usuario o 123456789012345678")
    .setRequired(true)
    .setStyle(TextInputStyle.Short);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

async function showGiftModal(interaction) {
  const modal = new ModalBuilder().setCustomId(IDS.GIFT_MODAL).setTitle("Añadir regalo");
  const gift = new TextInputBuilder()
    .setCustomId(IDS.GIFT_NAME)
    .setLabel("Regalo")
    .setRequired(true)
    .setStyle(TextInputStyle.Short);
  const amount = new TextInputBuilder()
    .setCustomId(IDS.GIFT_AMOUNT)
    .setLabel("Precio total del regalo (€)")
    .setPlaceholder("Ej. 39,99")
    .setRequired(true)
    .setStyle(TextInputStyle.Short);
  modal.addComponents(
    new ActionRowBuilder().addComponents(gift),
    new ActionRowBuilder().addComponents(amount),
  );
  await interaction.showModal(modal);
}

async function handleInteraction(interaction, config, state) {
  if (!interaction.inGuild()) return;
  if (!interaction.isButton() && !interaction.isModalSubmit() && !interaction.isStringSelectMenu() && !interaction.isUserSelectMenu()) return;
  if (!interaction.customId.startsWith("birthday:")) return;

  if (interaction.isButton()) {
    const stateButtons = new Set([IDS.JOIN, IDS.DECLINE, IDS.PAID, IDS.UNPAID, IDS.REMOVE_GIFT, IDS.CLOSE]);
    const group = stateButtons.has(interaction.customId) ? "state" : interaction.customId;
    const cooldownMs = interaction.customId === IDS.INVITE_EXTERNAL ? 10000 : (Number(config.buttonCooldownMs) || 3000);
    const cooldownKey = `${interaction.channelId}:${interaction.user.id}:${group}`;
    const lastClick = buttonCooldowns.get(cooldownKey) ?? 0;
    if (Date.now() - lastClick < cooldownMs) {
      await interaction.reply({
        content: "⏳ Vas demasiado rápido con los botones. Espera un momento y vuelve a intentarlo.",
        ephemeral: true,
      });
      return;
    }
    buttonCooldowns.set(cooldownKey, Date.now());
  }

  const found = findRoomForChannel(state, interaction.channelId);
  if (!found) {
    await interaction.reply({ content: "No encuentro el estado de este cumpleaños.", ephemeral: true });
    return;
  }
  const { key, room } = found;
  const member = await interaction.guild.members.fetch(interaction.user.id);

  if (interaction.isButton() && interaction.customId === IDS.JOIN) {
    if (interaction.user.id === room.birthdayUserId) {
      await interaction.reply({ content: "El cumpleañero no participa en su propio regalo.", ephemeral: true });
      return;
    }
    if (!eligibleUserIds(room).includes(interaction.user.id)) {
      await interaction.reply({ content: "No estás en la lista de personas invitadas a este regalo.", ephemeral: true });
      return;
    }
    if (participantIds(room).includes(interaction.user.id)) {
      await interaction.reply({ content: "Ya habías confirmado que participas.", ephemeral: true });
      return;
    }

    room.declinedUserIds = declinedUserIds(room).filter((id) => id !== interaction.user.id);
    room.participantIds = participantIds(room);
    room.participantIds.push(interaction.user.id);
    resetPayments(room);
    await saveState(state);
    await updateDashboard(interaction.channel, room);
    await interaction.reply({
      content: "Participación confirmada ✅ El reparto se ha recalculado.",
      ephemeral: true,
    });
    return;
  }

  if (interaction.isButton() && interaction.customId === IDS.DECLINE) {
    if (interaction.user.id === room.birthdayUserId) {
      await interaction.reply({ content: "El cumpleañero ya está excluido del regalo.", ephemeral: true });
      return;
    }
    if (!eligibleUserIds(room).includes(interaction.user.id)) {
      await interaction.reply({ content: "No estás en la lista de personas invitadas a este regalo.", ephemeral: true });
      return;
    }

    const paidGiftNames = giftList(room)
      .filter((gift) => gift.payerId === interaction.user.id)
      .map((gift) => gift.name);
    if (paidGiftNames.length) {
      await interaction.reply({
        content: `No puedes salir todavía porque figuras como pagador de: **${paidGiftNames.join(", ")}**. Quita/reasigna esos regalos primero.`,
        ephemeral: true,
      });
      return;
    }

    const wasParticipant = participantIds(room).includes(interaction.user.id);
    room.participantIds = participantIds(room).filter((id) => id !== interaction.user.id);
    room.paidUserIds = (room.paidUserIds ?? []).filter((id) => id !== interaction.user.id);
    room.declinedUserIds = declinedUserIds(room);
    if (!room.declinedUserIds.includes(interaction.user.id)) room.declinedUserIds.push(interaction.user.id);
    if (wasParticipant) resetPayments(room);

    await saveState(state);
    await updateDashboard(interaction.channel, room);
    await interaction.reply({
      content: wasParticipant
        ? "Has salido del regalo. El reparto se ha recalculado y perderás acceso al canal."
        : "Has indicado que no participas. Perderás acceso al canal.",
      ephemeral: true,
    });

    // El deny individual prevalece sobre el allow del rol. En cuanto pulsa No participo
    // pierde vista, escritura e historial. Administradores/propietario son la excepción de Discord.
    await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
      ViewChannel: false,
      SendMessages: false,
      ReadMessageHistory: false,
    }).catch((error) => console.error("[birthdayRooms] remove declined user", error));
    return;
  }

  if (interaction.isButton() && interaction.customId === IDS.INVITE) {
    if (!canManage(member, config)) {
      await interaction.reply({ content: "Necesitas el rol gestor para crear invitaciones.", ephemeral: true });
      return;
    }

    const memberSelect = new UserSelectMenuBuilder()
      .setCustomId(IDS.INVITE_INTERNAL_SELECT)
      .setPlaceholder("Invitar a alguien que ya está en el servidor")
      .setMinValues(1)
      .setMaxValues(1);

    const externalButton = new ButtonBuilder()
      .setCustomId(IDS.INVITE_EXTERNAL)
      .setLabel("Crear enlace para alguien externo")
      .setStyle(ButtonStyle.Secondary);

    await interaction.reply({
      content: [
        "👥 **Añadir invitado**",
        "Elige a alguien que ya esté en el servidor o crea un enlace para una persona externa.",
        "",
        "La persona añadida tendrá acceso a **este canal** y deberá elegir **Sí, participo** o **No participo**.",
      ].join("\n"),
      components: [
        new ActionRowBuilder().addComponents(memberSelect),
        new ActionRowBuilder().addComponents(externalButton),
      ],
      ephemeral: true,
    });
    return;
  }

  if (interaction.isUserSelectMenu() && interaction.customId === IDS.INVITE_INTERNAL_SELECT) {
    if (!canManage(member, config)) {
      await interaction.reply({ content: "Necesitas el rol gestor para añadir invitados.", ephemeral: true });
      return;
    }

    const selectedId = interaction.values[0];
    const selectedMember = await interaction.guild.members.fetch(selectedId).catch(() => null);
    if (!selectedMember) {
      await interaction.update({ content: "No he podido encontrar a ese miembro en el servidor.", components: [] });
      return;
    }
    if (selectedMember.user.bot) {
      await interaction.update({ content: "Los bots no pueden participar en el regalo, bastante tienen ya.", components: [] });
      return;
    }
    if (selectedMember.id === room.birthdayUserId) {
      await interaction.update({ content: "No podemos invitar al cumpleañero a su propio canal secreto 😅", components: [] });
      return;
    }

    const alreadyEligible = eligibleUserIds(room).includes(selectedMember.id);
    const wasDeclined = declinedUserIds(room).includes(selectedMember.id);
    const canAlreadyView = interaction.channel.permissionsFor(selectedMember)?.has(PermissionFlagsBits.ViewChannel);
    if (alreadyEligible && !wasDeclined && canAlreadyView) {
      await interaction.update({
        content: `<@${selectedMember.id}> ya tiene acceso a este cumpleaños.`,
        components: [],
        allowedMentions: { parse: [] },
      });
      return;
    }

    await interaction.channel.permissionOverwrites.edit(selectedMember.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    });

    room.eligibleUserIds = eligibleUserIds(room);
    if (!room.eligibleUserIds.includes(selectedMember.id)) room.eligibleUserIds.push(selectedMember.id);
    room.declinedUserIds = declinedUserIds(room).filter((id) => id !== selectedMember.id);
    room.temporaryInviteIds ??= [];
    if (!room.temporaryInviteIds.includes(selectedMember.id)) room.temporaryInviteIds.push(selectedMember.id);

    await saveState(state);
    await updateDashboard(interaction.channel, room);
    await interaction.update({
      content: `✅ <@${selectedMember.id}> ya tiene acceso a este canal. Queda pendiente de marcar **Sí, participo** o **No participo**.`,
      components: [],
      allowedMentions: { parse: [] },
    });
    return;
  }

  if (interaction.isButton() && interaction.customId === IDS.INVITE_EXTERNAL) {
    if (!canManage(member, config)) {
      await interaction.reply({ content: "Necesitas el rol gestor para crear invitaciones.", ephemeral: true });
      return;
    }

    const invite = await interaction.channel.createInvite({
      maxAge: 7 * 24 * 60 * 60,
      maxUses: 0,
      unique: true,
      reason: `Invitación temporal para el cumpleaños de ${room.birthdayName ?? room.birthdayUserId}`,
    });

    room.externalInvites ??= [];
    room.externalInvites.push({
      code: invite.code,
      uses: invite.uses ?? 0,
      createdBy: interaction.user.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await saveState(state);

    await interaction.update({
      content: [
        "🔗 **Invitación temporal creada**",
        invite.url,
        "",
        "Envíale este enlace a la persona. Cuando entre al servidor con él, el bot le dará acceso a **este canal** y tendrá que elegir **Sí, participo** o **No participo**.",
        "Caduca en 7 días y el bot la eliminará después del primer uso detectado.",
      ].join("\n"),
      components: [],
    });
    return;
  }

  if (interaction.isButton() && interaction.customId === IDS.GIFT) {
    if (!canManage(member, config)) {
      await interaction.reply({ content: "Necesitas el rol gestor para decidir el regalo.", ephemeral: true });
      return;
    }
    await showGiftModal(interaction);
    return;
  }

  if (interaction.isButton() && interaction.customId === IDS.REMOVE_GIFT) {
    if (!canManage(member, config)) {
      await interaction.reply({ content: "Necesitas el rol gestor para quitar regalos.", ephemeral: true });
      return;
    }
    const gifts = giftList(room);
    if (!gifts.length) {
      await interaction.reply({ content: "No hay regalos que quitar.", ephemeral: true });
      return;
    }
    const removed = gifts.pop();
    room.gifts = gifts;
    resetPayments(room);
    await saveState(state);
    await updateDashboard(interaction.channel, room);
    await interaction.reply({
      content: `Se ha quitado **${removed.name}**. Reparto recalculado; los pagos deben confirmarse de nuevo.`,
      ephemeral: true,
    });
    return;
  }

  if (interaction.isButton() && interaction.customId === IDS.PAID) {
    if (!giftList(room).length) {
      await interaction.reply({ content: "Primero hay que añadir al menos un regalo.", ephemeral: true });
      return;
    }
    if (!participantIds(room).includes(interaction.user.id)) {
      await interaction.reply({ content: "No formas parte de los participantes de este regalo.", ephemeral: true });
      return;
    }
    if (!giftPayersValid(room)) {
      await interaction.reply({ content: "Hay regalos sin un pagador válido. Corrige eso antes de marcar pagos.", ephemeral: true });
      return;
    }
    const outgoing = outgoingTransfers(room, interaction.user.id);
    if (!outgoing.length) {
      await interaction.reply({
        content: "No tienes ninguna transferencia pendiente: con lo que has adelantado, tu parte ya está cubierta ✅",
        ephemeral: true,
      });
      return;
    }
    if (!room.paidUserIds.includes(interaction.user.id)) room.paidUserIds.push(interaction.user.id);
    await saveState(state);
    await updateDashboard(interaction.channel, room);
    const summary = outgoing.map((t) => `<@${t.to}> ${formatEuros(t.amountCents)}`).join(" · ");
    await interaction.reply({ content: `Pago completo marcado ✅ (${summary})`, ephemeral: true });
    await markRoomSettled(interaction.channel, room, state, config);
    return;
  }

  if (interaction.isButton() && interaction.customId === IDS.UNPAID) {
    if (!giftList(room).length) {
      await interaction.reply({ content: "Primero hay que añadir al menos un regalo.", ephemeral: true });
      return;
    }
    if (!participantIds(room).includes(interaction.user.id)) {
      await interaction.reply({ content: "No formas parte de los participantes de este regalo.", ephemeral: true });
      return;
    }
    if (!giftPayersValid(room)) {
      await interaction.reply({ content: "Hay regalos sin un pagador válido. Corrige eso antes de cambiar pagos.", ephemeral: true });
      return;
    }
    const outgoing = outgoingTransfers(room, interaction.user.id);
    if (!outgoing.length) {
      await interaction.reply({
        content: "No tienes ninguna transferencia que marcar como pendiente: tu parte ya queda cubierta con lo que has adelantado ✅",
        ephemeral: true,
      });
      return;
    }
    if (!(room.paidUserIds ?? []).includes(interaction.user.id)) {
      await interaction.reply({
        content: "Ya constabas como pendiente. Pescadería Paqui no había cerrado tu expediente 🐟",
        ephemeral: true,
      });
      return;
    }
    room.paidUserIds = (room.paidUserIds ?? []).filter((id) => id !== interaction.user.id);
    room.settledAt = null;
    await saveState(state);
    await updateDashboard(interaction.channel, room);
    const summary = outgoing.map((t) => `<@${t.to}> ${formatEuros(t.amountCents)}`).join(" · ");
    await interaction.reply({
      content: `Vuelves a figurar como pendiente 💸 (${summary}). Pescadería Paqui reabre el expediente.`,
      ephemeral: true,
    });
    return;
  }

  if (interaction.isButton() && interaction.customId === IDS.CLOSE) {
    if (!canManage(member, config)) {
      await interaction.reply({ content: "Necesitas el rol gestor para cerrar el canal.", ephemeral: true });
      return;
    }
    if (pendingUserIds(room).length > 0) {
      await interaction.reply({ content: "Todavía hay personas que no han confirmado si participan.", ephemeral: true });
      return;
    }
    if (!giftList(room).length || !giftPayersValid(room) || participantIds(room).length === 0 || unpaidIds(room).length > 0) {
      await interaction.reply({ content: "Todavía quedan pagos pendientes o hay regalos sin un pagador válido.", ephemeral: true });
      return;
    }
    await interaction.reply({ content: "Todos han pagado. Cerrando canal…", ephemeral: true });
    state.closedCycles ??= {};
    state.closedCycles[key] = new Date().toISOString();
    state.birthdayNotes ??= {};
    delete state.birthdayNotes[room.birthdayUserId];
    delete state.rooms[key];
    await saveState(state);
    await interaction.channel.delete("Cumpleaños cerrado: todos los participantes han pagado");
    return;
  }

  if (interaction.isModalSubmit() && interaction.customId === IDS.GIFT_MODAL) {
    if (!canManage(member, config)) {
      await interaction.reply({ content: "No tienes permisos para añadir regalos.", ephemeral: true });
      return;
    }
    const name = interaction.fields.getTextInputValue(IDS.GIFT_NAME).trim();
    const rawAmount = interaction.fields.getTextInputValue(IDS.GIFT_AMOUNT).trim();
    const amountCents = parseMoneyToCents(rawAmount);
    if (!amountCents) {
      await interaction.reply({
        content: "Introduce un precio válido, por ejemplo `39,99` o `120`.",
        ephemeral: true,
      });
      return;
    }

    const participants = participantIds(room);
    if (!participants.length) {
      await interaction.reply({
        content: "Primero tiene que haber al menos una persona que haya confirmado **Sí, participo**.",
        ephemeral: true,
      });
      return;
    }

    const options = [];
    for (const userId of participants.slice(0, 25)) {
      const participant = await interaction.guild.members.fetch(userId).catch(() => null);
      if (!participant || participant.user.bot) continue;
      options.push({
        label: (participant.displayName || participant.user.username).slice(0, 100),
        value: userId,
        description: `@${participant.user.username}`.slice(0, 100),
      });
    }
    if (!options.length) {
      await interaction.reply({ content: "No encuentro participantes válidos para elegir como pagador.", ephemeral: true });
      return;
    }

    const pendingKey = `${interaction.channelId}:${interaction.user.id}`;
    pendingGifts.set(pendingKey, { name, amountCents, createdAt: Date.now() });
    const selector = new StringSelectMenuBuilder()
      .setCustomId(IDS.GIFT_PAYER_SELECT)
      .setPlaceholder("Pagador de la multa")
      .addOptions(options);
    await interaction.reply({
      content: `🎁 **${name}** — ${formatEuros(amountCents)}\nSelecciona el **Pagador de la multa**:`,
      components: [new ActionRowBuilder().addComponents(selector)],
      ephemeral: true,
    });
    return;
  }

  if (interaction.isStringSelectMenu() && interaction.customId === IDS.GIFT_PAYER_SELECT) {
    if (!canManage(member, config)) {
      await interaction.reply({ content: "No tienes permisos para añadir regalos.", ephemeral: true });
      return;
    }
    const pendingKey = `${interaction.channelId}:${interaction.user.id}`;
    const pending = pendingGifts.get(pendingKey);
    if (!pending || Date.now() - pending.createdAt > 10 * 60 * 1000) {
      pendingGifts.delete(pendingKey);
      await interaction.reply({ content: "La selección ha caducado. Pulsa **Añadir regalo** otra vez.", ephemeral: true });
      return;
    }
    const payerId = interaction.values[0];
    if (!participantIds(room).includes(payerId)) {
      await interaction.reply({ content: "Ese usuario ya no figura como participante confirmado.", ephemeral: true });
      return;
    }
    room.gifts = giftList(room);
    room.gifts.push({
      id: `${Date.now()}-${interaction.user.id}`,
      name: pending.name,
      amountCents: pending.amountCents,
      payerId,
      addedBy: interaction.user.id,
      addedAt: new Date().toISOString(),
    });
    pendingGifts.delete(pendingKey);
    resetPayments(room);
    await saveState(state);
    await updateDashboard(interaction.channel, room);
    await interaction.update({
      content: `Regalo añadido: **${pending.name}** (${formatEuros(pending.amountCents)}). **Pagador de la multa:** <@${payerId}>. Se ha recalculado la liquidación global.`,
      components: [],
    });
    return;
  }
}


async function handleExternalInviteJoin(member, state) {
  const guildRooms = Object.entries(state.rooms).filter(([, room]) => room.guildId === member.guild.id);
  if (!guildRooms.length) return;

  let invites;
  try {
    invites = await member.guild.invites.fetch();
  } catch (error) {
    console.error("[birthdayRooms] No puedo comprobar invitaciones al entrar un miembro. El bot necesita permiso para gestionar/ver invitaciones del servidor.", error);
    return;
  }

  let matched = null;

  for (const [key, room] of guildRooms) {
    const pending = Array.isArray(room.externalInvites) ? room.externalInvites : [];
    for (const savedInvite of pending) {
      const current = invites.get(savedInvite.code);
      if (!current) continue;
      const previousUses = Number(savedInvite.uses) || 0;
      const currentUses = Number(current.uses) || 0;
      if (currentUses > previousUses && !matched) {
        matched = { key, room, savedInvite, invite: current };
      }
      savedInvite.uses = currentUses;
    }
  }

  if (!matched) {
    await saveState(state);
    return;
  }

  const { room, savedInvite, invite } = matched;
  const channel = await member.guild.channels.fetch(room.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  await channel.permissionOverwrites.edit(member.id, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
  });

  room.eligibleUserIds = eligibleUserIds(room);
  if (!room.eligibleUserIds.includes(member.id)) room.eligibleUserIds.push(member.id);
  room.declinedUserIds = declinedUserIds(room).filter((id) => id !== member.id);
  room.temporaryInviteIds ??= [];
  if (!room.temporaryInviteIds.includes(member.id)) room.temporaryInviteIds.push(member.id);
  room.externalInvites = (room.externalInvites ?? []).filter((entry) => entry.code !== savedInvite.code);

  await invite.delete("Invitación de cumpleaños utilizada").catch(() => {});
  await saveState(state);
  await updateDashboard(channel, room);
}

export default function setupBirthdayRoomsModule(client, overrides = {}) {
  const config = { ...birthdayRoomsConfig, ...overrides };
  let state = emptyState();
  let timer = null;

  client.once("ready", async () => {
    state = await loadState();

    if (!config.participantRoleId) {
      console.warn(
        "[birthdayRooms] Módulo sin activar: define BIRTHDAY_ROLE_ID (y, opcionalmente, BIRTHDAY_GUILD_ID/BIRTHDAY_CATEGORY_ID).",
      );
      return;
    }

    await syncBirthdayRegistry(client, config, state);
    await checkBirthdays(client, config, state);
    await checkWeeklyReminders(client, state);
    await checkAutoCloseChannels(client, config, state);
    timer = setInterval(() => {
      syncBirthdayRegistry(client, config, state).catch((error) =>
        console.error("[birthdayRooms] registry check", error),
      );
      checkBirthdays(client, config, state).catch((error) =>
        console.error("[birthdayRooms] periodic check", error),
      );
      checkWeeklyReminders(client, state).catch((error) =>
        console.error("[birthdayRooms] reminder check", error),
      );
      checkAutoCloseChannels(client, config, state).catch((error) =>
        console.error("[birthdayRooms] auto close check", error),
      );
    }, config.checkEveryMs);
    timer.unref?.();
  });

  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if (await handleMyBirthdayCommand(message, client, config, state)) return;
    if (await handleMyBirthdayInfoCommand(message, client, config, state)) return;
    if (await handleBirthdayInfoCommands(message, config, state)) return;
    if (!message.inGuild()) return;

    const birthdayRoom = findRoomForChannel(state, message.channelId);
    const normalizedContent = message.content.trim().toLowerCase();
    const isBirthdayModuleCommand =
      normalizedContent === "!info" ||
      normalizedContent === "!cumple-pagos" ||
      normalizedContent === "!cumple-recordatorio" ||
      normalizedContent.startsWith("!cumple-test");

    // Dentro de un canal de cumpleaños, celebramos cualquier mensaje que
    // contenga "cumple" o "cumpleaños", salvo los comandos del propio módulo.
    if (
      birthdayRoom &&
      !isBirthdayModuleCommand &&
      /\b(?:cumple|cumpleaños)\b/i.test(message.content)
    ) {
      await message.react("🥳").catch((error) =>
        console.error("[birthdayRooms] birthday reaction", error),
      );
    }

    if (birthdayRoom && normalizedContent === "!info") {
      await message.channel.send([
        "🎂 **Comandos del cumpleaños**",
        "",
        "`!cumple-pagos` — Muestra el checklist de pagos, importes y quién sigue pendiente.",
        "`!cumple-recordatorio` — Envía un recordatorio amistoso/meme a quienes aún deben pagar. Solo gestores.",
        "`!info` — Muestra esta ayuda.",
        "`!info-micumple texto` — El cumpleañero puede dejar por DM una nota para su propio cumpleaños; se limpia al cerrar el grupo.",
        "",
        "**Botones principales**",
        "✅ **Sí, participo** — Entras en el reparto.",
        "❌ **No participo** — Sales del grupo y pierdes acceso al canal.",
        "👥 **Invitar persona** — Abre dos opciones: añadir directamente a alguien que ya está en el servidor o crear un enlace temporal para una persona externa.",
        "🎁 **Añadir regalo** — Añade regalo, precio y después permite elegir el **Pagador de la multa**.",
        "💸 **He pagado** — Marca como liquidado todo lo que debes según el reparto global.",
        "↩️ **No he pagado** — Revierte tu pago y vuelves a aparecer como pendiente.",
        "🔒 **Cerrar canal** — Cierra el cumpleaños cuando todo esté resuelto. Si no se pulsa, el bot lo cerrará automáticamente unos días después de quedar todas las deudas saldadas.",
      ].join("\n"));
      return;
    }

    if (birthdayRoom && normalizedContent === "!cumple-pagos") {
      await message.channel.send({ content: paymentChecklistText(birthdayRoom.room), allowedMentions: { parse: [] } });
      return;
    }

    if (birthdayRoom && normalizedContent === "!cumple-recordatorio") {
      if (!canManage(message.member, config)) {
        await message.reply("Necesitas el rol gestor o permiso de Gestionar canales para enviar recordatorios.");
        return;
      }
      if (!giftList(birthdayRoom.room).length) {
        await message.reply("Todavía no hay regalos añadidos, así que no hay nada que recordar.");
        return;
      }
      if (!participantIds(birthdayRoom.room).length) {
        await message.reply("Todavía no hay participantes confirmados.");
        return;
      }
      if (!giftPayersValid(birthdayRoom.room)) {
        await message.reply("Hay regalos sin pagador válido. Corrígelos antes de enviar recordatorios.");
        return;
      }
      if (!unpaidIds(birthdayRoom.room).length) {
        await message.reply("Todo el mundo ha pagado ✅ No hay morosos a los que perseguir.");
        return;
      }
      await sendPaymentReminder(message.channel, birthdayRoom.room, state);
      return;
    }

    if (!message.content.startsWith("!cumple-test")) return;

    console.log("[birthdayRooms] !cumple-test recibido", {
      authorId: message.author.id,
      guildId: message.guild?.id,
      channelId: message.channel?.id,
    });

    if (!config.participantRoleId) {
      console.warn("[birthdayRooms] !cumple-test abortado: BIRTHDAY_ROLE_ID no definido.");
      await message.reply("Define BIRTHDAY_ROLE_ID antes de probar el módulo.");
      return;
    }

    console.log("[birthdayRooms] !cumple-test configuracion", {
      guildId: config.guildId,
      participantRoleId: config.participantRoleId,
      categoryId: config.categoryId,
      managerRoleId: config.managerRoleId,
      registrationChannelId: config.registrationChannelId,
    });

    if (!canManage(message.member, config)) {
      console.warn(`[birthdayRooms] !cumple-test abortado: ${message.author.id} no tiene permisos de gestor.`);
      await message.reply("Necesitas el rol gestor o permiso de Gestionar canales para usar esta prueba.");
      return;
    }

    console.log("[birthdayRooms] !cumple-test gestor autorizado.");

    const target = message.mentions.members.first();
    if (!target) {
      console.warn("[birthdayRooms] !cumple-test abortado: no se encontro usuario mencionado.");
      await message.reply("Uso: `!cumple-test @usuario`");
      return;
    }

    console.log("[birthdayRooms] !cumple-test usuario objetivo", {
      id: target.id,
      displayName: target.displayName,
    });

    const dateKey = `${todayKey(new Date(), config.timezone)}-test-${Date.now()}`;
    const birthday = {
      id: target.id,
      cummer: target.displayName,
      date: Date.now(),
    };

    console.log("[birthdayRooms] !cumple-test llamando a createBirthdayRoom", {
      dateKey,
      targetId: birthday.id,
    });

    try {
      const room = await createBirthdayRoom(message.guild, birthday, config, state, dateKey);

      if (!room) {
        console.warn("[birthdayRooms] !cumple-test createBirthdayRoom termino sin crear canal.");
        await message.reply("No se pudo crear el canal de prueba. Revisa los logs de birthdayRooms.");
        return;
      }

      console.log("[birthdayRooms] !cumple-test canal creado", {
        channelId: room.channelId,
        targetId: target.id,
      });

      await message.reply(`Canal de prueba creado: <#${room.channelId}>`);
    } catch (error) {
      console.error("[birthdayRooms] !cumple-test error", error);
      await message
        .reply("Ha ocurrido un error creando el canal de prueba. Revisa los logs del bot.")
        .catch(console.log);
    }
  });

  client.on("guildMemberAdd", (member) => {
    handleExternalInviteJoin(member, state).catch((error) =>
      console.error("[birthdayRooms] external invite join", error),
    );
    syncBirthdayRegistry(client, config, state).catch((error) =>
      console.error("[birthdayRooms] registry after join", error),
    );
  });

  client.on("guildMemberUpdate", (oldMember, newMember) => {
    const roleId = config.participantRoleId;
    if (!roleId) return;
    const hadRole = oldMember.roles.cache.has(roleId);
    const hasRole = newMember.roles.cache.has(roleId);
    if (hadRole === hasRole) return;
    syncBirthdayRegistry(client, config, state).catch((error) =>
      console.error("[birthdayRooms] registry after role change", error),
    );
  });

  client.on("interactionCreate", (interaction) => {
    handleInteraction(interaction, config, state).catch(async (error) => {
      console.error("[birthdayRooms] interaction", error);
      if (!interaction.isRepliable()) return;
      const payload = { content: "Ha ocurrido un error gestionando el cumpleaños.", ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => {});
      else await interaction.reply(payload).catch(() => {});
    });
  });

  return {
    checkNow: (now = new Date()) => checkBirthdays(client, config, state, now),
    syncRegistryNow: () => syncBirthdayRegistry(client, config, state),
    stop: () => timer && clearInterval(timer),
  };
}

export {
  birthdayMonthDay,
  dashboardComponents,
  dashboardText,
  parseMoneyToCents,
  parseUserId,
  paymentChecklistText,
  paymentShares,
  advancedByPayer,
  giftPayersValid,
  settlementPlan,
  slugifyChannelName,
  totalGiftCents,
  todayMonthDay,
  unpaidIds,
  checkWeeklyReminders,
  checkAutoCloseChannels,
};
