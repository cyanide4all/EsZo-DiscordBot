/**
 * Configuración del módulo de canales privados de cumpleaños.
 *
 * Variables de entorno:
 *   BIRTHDAY_GUILD_ID
 *   BIRTHDAY_ROLE_ID
 *   BIRTHDAY_CATEGORY_ID
 *   BIRTHDAY_MANAGER_ROLE_ID
 *   BIRTHDAY_REGISTRATION_CHANNEL_ID (opcional; ID del canal donde la gente registra su cumpleaños)
 *   BIRTHDAY_ADMIN_CHANNEL_ID (compatibilidad con v8; se usa si no defines el anterior)
 *   BIRTHDAY_TIMEZONE (opcional; por defecto Europe/Madrid)
 *   BIRTHDAY_CREATE_DAYS_BEFORE (opcional; por defecto 45)
 *   BIRTHDAY_REGISTRATION_REMINDER_DAYS (opcional; por defecto 7)
 *   BIRTHDAY_BUTTON_COOLDOWN_MS (opcional; por defecto 3000)
 *   BIRTHDAY_AUTO_CLOSE_DAYS (opcional; por defecto 3)
 */
export default {
  enabled: process.env.BIRTHDAY_ROOMS_ENABLED !== "false",
  guildId: process.env.BIRTHDAY_GUILD_ID ?? null,
  participantRoleId: process.env.BIRTHDAY_ROLE_ID ?? null,
  categoryId: process.env.BIRTHDAY_CATEGORY_ID ?? null,
  managerRoleId: process.env.BIRTHDAY_MANAGER_ROLE_ID ?? null,
  registrationChannelId: process.env.BIRTHDAY_REGISTRATION_CHANNEL_ID ?? process.env.BIRTHDAY_ADMIN_CHANNEL_ID ?? null,
  timezone: process.env.BIRTHDAY_TIMEZONE ?? "Europe/Madrid",
  createDaysBefore: Number(process.env.BIRTHDAY_CREATE_DAYS_BEFORE ?? 45),
  registrationReminderDays: Number(process.env.BIRTHDAY_REGISTRATION_REMINDER_DAYS ?? 7),
  buttonCooldownMs: Number(process.env.BIRTHDAY_BUTTON_COOLDOWN_MS ?? 3000),
  autoCloseDays: Number(process.env.BIRTHDAY_AUTO_CLOSE_DAYS ?? 3),
  checkEveryMs: 15 * 60 * 1000,
};
