// Declaro constantes para las regex de interpretación de mensajes
// La i final implica case insensitiveness

const regexSaludos = /(Hola a todos)|(buenas)|(señores?)/i;
const regexCarga = /(carga)|(punto)|(payload)|(proteg)/i;
const regexPeplo = /(pero)|(orisa)|(support)/i;
const regexAsco =
  /(asco)|(c[aá]ncer)|(sida)|(zanker)|(asquer)|(pharah?)|(yasuo)|(hanzo)/i;
const regexRate = /^(?!http).*[0-9]+\/[0-9]+/;
const regexJiros = /jiro+u*s+/i;
const regexCallMe = /(c[ao]ll$)|(c[ao]ll )|(cell)|(selfon)|(avis)/i;
const regexBorja = /(borj)|(Hagrov)/i;
const regexQuejaBot = /((c[aá]lla(te)?)|(que te calles)|(ktkys)|(puto)).*bot/i;
const regexStaph = /(bot staph)|(para bot)/i;
const regexNoLink = /^(?!http).*/;
const regexTTSMal = /^(\/TTS).*/;
const regexTorb = /(torb)|(enano)|(upgrade)/i;
const regexEmpiezaPorExclamacion = /^![^ ]*$/;
const regexSiNo =
  /(s[ií] o no,? bot)|(bot.* s[ií] o no)|(a que (s[ií]|no),? bot)/i;
const regexCuantos = /(Cu[aá]ntos somos\??)/i;
const regexGale = /[gG]aleginho.*/i;
const regexHum = /hu*m+\b/i;
const regexWah = /(luigi)|((w|gu)a+h*)/i;
const regexYT = /^!yt /;
const regexPagar = /!pagar [0-9]+ <@![0-9]+>$/i;
const regexRiotRegister = /^!riotRegister .+$/i;
const regexApuesta = /!bet [0-9]+ <@![0-9]+> (gana|pierde)$/;
const regexProgrammedMsg = /!progMsg [0-9]{18} [0-9]+[mMhHsS] .+/i;
const regexBaneo = /!putoPlatino <@![0-9]+> [0-9]{1,2}/i;

module.exports = {
  regexSaludos,
  regexCarga,
  regexPeplo,
  regexAsco,
  regexRate,
  regexJiros,
  regexCallMe,
  regexBorja,
  regexQuejaBot,
  regexStaph,
  regexNoLink,
  regexTTSMal,
  regexTorb,
  regexEmpiezaPorExclamacion,
  regexSiNo,
  regexCuantos,
  regexGale,
  regexHum,
  regexWah,
  regexYT,
  regexPagar,
  regexRiotRegister,
  regexApuesta,
  regexProgrammedMsg,
  regexBaneo,
};
