var regex = require("./regexp");

module.exports = (client, riotRequest, firebaseDatabase) => {
  
  function requestSummonerByName(name) {
    return new Promise((resolve, reject) => {
      riotRequest.request(
      "euw1",
      "summoner",
      `/lol/summoner/v4/summoners/by-name/${name}`,
      function (err, data) {
        if(err) {
          return reject(err);
        } resolve(data);
      }
    )});
  }

  client.on('message', (message) => {
    // Riot Register
    if (regex.regexRiotRegister.test(message.content)) {
      const userNameArr = message.content.split(" ")
      const userName = userNameArr.splice(1,userNameArr.length-1).join(" ")
      requestSummonerByName(encodeURIComponent(userName)).then(riotUser => {
        firebaseDatabase.ref(`/users/${message.author.id}`).once('value').then((snapshot) => {
          const userObj = snapshot.val() ? snapshot.val() : defaultUserObj;
          const newUser = {
              ...userObj, 
              riotAccountId: riotUser.accountId
          }
          firebaseDatabase.ref(`/users/${message.author.id}`).set(newUser, (err) => {
            if (err) {
                console.log(err);
            } else {
              if (userObj.riotAccountId) {
                message.reply("Actualizado").catch(console.log)
              } else {
                message.reply("Registrado").catch(console.log);
              }
            }
          })
        })
      }).catch(() => {
        message.reply("Ese ~~puto virgen~~ invocador no existe").catch(console.log);
      })
    }
    
    // Ver apuestas
    if (message.content === "!bets") {
      firebaseDatabase.ref(`/bets/`).once('value').then((snapshot) => {
        const apuestas = snapshot.val() ? Object.values(snapshot.val()) : [];
        if (apuestas.length > 0) {
          const msg =apuestas.reduce((acc, current) => {
            return acc.concat(`\n\t<@!${current.author}> ha apostado ${current.amount} colacoins a que <@!${current.target}> ${current.type}`)
          }, 'Apuestas vigentes: ')
          message.channel.send(msg).catch(console.log)
        } else {
          message.channel.send('No hay apuestas ahora mismo').catch(console.log)
        }
      })
    }

    // Apostar
    if (regex.regexApuesta.test(message.content)) {
      const split = message.content.split(" ");
      const amount = Number(split[1]);
      const target = split[2].slice(3, split[2].length-1);
      const type = split[3]
      const newBet = {
        author: message.author.id,
        amount,
        target,
        type
      }
      // TODO todo el sistema de apuestas contra la api de riot
      var newKey = firebaseDatabase.ref().child('bets').push().key;
      firebaseDatabase.ref(`/bets/${newKey}`).set(newBet, (err) => {
        if (err) {
          console.log(err);
        } else {
          message.reply("Apuesta registrada").catch(console.log)
        }
      })
    }
  })
}


/*
const summonerName = "obiwancanabis";
const accountId = "6wPxRUbeIi73BGVoOmVJm8GtQtxatBJsYk8cvbtBsgOzvQ";
const matchId = "5042873983";
// discordId -> summorname -> accountId
function requestSummonerByName(name, cb) {
  riotRequest.request(
    "euw1",
    "summoner",
    `/lol/summoner/v4/summoners/by-name/${name}`,
    function (err, data) {
      if (!err) {
        cb(data);
      } else {
        console.error(err);
      }
    }
  );
}

function getLatestMatchFromAccountId(encryptedAccountId, cb) {
  riotRequest.request(
    "euw1",
    "match",
    `/lol/match/v4/matchlists/by-account/${encryptedAccountId}`,
    function (err, data) {
      if (!err) {
        cb(data.matches[0]);
      } else {
        console.error(err);
      }
    }
  );
}

function getMatchDatafromMatchId(matchID, accountId, cb) {
  riotRequest.request(
    "euw1",
    "match",
    `/lol/match/v4/matches/${matchId}`,
    function (err, data) {
      if (!err) {
        cb(handleDtoMatchData(data))
      } else {
        console.error(err);
      }
    }
  );
}

function handleDtoMatchData(data) {
    const participantId  = data.participantIdentities.find(e => e.player.currentAccountId === accountId).participantId // 1 to 10
    const firstTeamWon= data.teams[0].win;
    const firstTeamId = data.teams[0].teamId;
    const Userteam = data.participants.find(e => e.participantId === participantId).teamId;
    return firstTeamWon === 'Win' ? firstTeamId === Userteam : firstTeamId !== Userteam;
}

// just to test
// requestSummonerByName(summonerName, console.log)
// getLatestMatchFromAccountId(accountId, console.log);
getMatchDatafromMatchId(matchId, accountId, console.log);
*/