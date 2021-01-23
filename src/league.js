var regex = require("./regexp");
const { defaultUserObj } = require("./struct");
const pollingTime = 30000;

module.exports = (client, riotRequest, firebaseDatabase) => {
  
  const requestSummonerByName = (name) => {
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

  const getActiveGameBySummonerId = (summonerId) => {
    return new Promise((resolve, reject) => {
      riotRequest.request(
      "euw1",
      "spectator",
      `/lol/spectator/v4/active-games/by-summoner/${summonerId}`,
      function (err, data) {
        if(err) {
          return reject(err);
        } resolve(data);
      }
    )});
  }

  const createBet = (newBet) => {
    return new Promise((resolve, reject) => {
      var newKey = firebaseDatabase.ref().child('bets').push().key;
      firebaseDatabase.ref(`/bets/${newKey}`).set(newBet, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      })
    })
  }

  const getMatchDatafromMatchId = (matchID, accountId) => {
    return new Promise((resolve, reject) => {
      riotRequest.request(
        "euw1",
        "match",
        `/lol/match/v4/matches/${matchID}`,
        function (err, data) {
          if (!err) {
            resolve(handleDtoMatchData(data, accountId))
          } else {
            reject(err)
          }
        }
      );
    })
  }
  
  const handleDtoMatchData = (data, accountId) => {
      const participantId  = data.participantIdentities.find(e => e.player.currentAccountId === accountId).participantId // 1 to 10
      const firstTeamWon= data.teams[0].win;
      const firstTeamId = data.teams[0].teamId;
      const Userteam = data.participants.find(e => e.participantId === participantId).teamId;
      return firstTeamWon === 'Win' ? firstTeamId === Userteam : firstTeamId !== Userteam;
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
              riotSummonerId: riotUser.id,
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
            return acc.concat(`\n\t<@!${current.author}> ha apostado ${current.amount} colacoins a que <@!${current.target}> ${current.type ? 'gana' : 'pierde' }`)
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
      const targetId = split[2].slice(3, split[2].length-1);
      const type = split[3] === "gana"
      // TODO todo el sistema de apuestas contra la api de riot
      // Step 1a - Comprobar que tenemos pasta suficiente
      firebaseDatabase.ref(`/users/${message.author.id}`).once('value').then((snapshot) => {
        const author = snapshot.val() ? snapshot.val() : defaultUserObj
        if (!(author.points < amount)) {
          // Step 1b - Comprobar que tenemos los datos del jugador en firebase
          firebaseDatabase.ref(`/users/${targetId}`).once('value').then((snapshot) => {
            target = snapshot.val()
            if (target && target.riotSummonerId && target.riotAccountId) {
              // Step 2 - Comprobar que el jugador está en una partida
              getActiveGameBySummonerId(target.riotSummonerId).then(currentGame => {
                // Step 3 - Que la partida no pase de 7 min (420 seg)
                if (currentGame.gameLength <= 420) {
                  // Step 4 - Ver si esta persona ya ha apostado en la partida
                  firebaseDatabase.ref(`/bets/`).once('value').then((snapshot) => {
                    const apuestas = snapshot.val() ? Object.values(snapshot.val()) : [];
                    const prevBet = apuestas.find(each => each.gameId === currentGame.gameId && each.author === message.author.id)
                    if (!prevBet) {
                      // Step 5 - Le quitamos la cantidad de la apuesta al apostador
                      const newUser = {...author, points: author.points - amount};
                      firebaseDatabase.ref(`/users/${message.author.id}`).set(newUser, (err) => {
                        if (!err) {
                          // Step 6 - Registrar la apuesta
                          const newBet = {
                            author: message.author.id,
                            amount,
                            target: targetId,
                            type,
                            gameId: currentGame.gameId
                          }
                          createBet(newBet).then(() => {
                            message.reply("Apuesta registrada")
                            // Step 7 - Empezar polling por si acaba la partida
                            const pollingFunc = () => {
                              getMatchDatafromMatchId(gameId, target.riotAccountId).then((playerWon) => {
                                // Step 8 - Pagar la coca
                                if (type === playerWon) {
                                  firebaseDatabase.ref(`/users/${message.author.id}`).once('value').then((snapshot2) => {
                                    const winner = {...snapshot2.val(), points: snapshot2.val().points + amount*2}
                                    firebaseDatabase.ref(`/users/${message.author.id}`).set(winner, (err) => {
                                      if (!err) {
                                        message.channel.send(`<@!${message.author.id} ha ganado la apuesta y ${amount * 2} colacoins`)
                                      } else {
                                        console.log(err)
                                      }
                                    })
                                  })
                                } else {
                                  message.channel.send(`<@!${message.author.id} ha perdido la apuesta de ${amount} colacoins`)
                                }
                              }).catch(setTimeout(pollingFunc, pollingTime))
                            }
                            setTimeout(pollingFunc, pollingTime)
                          }).catch(console.log)
                        } else {
                          console.log(err)
                        }
                      })
                    } else {
                      message.reply(`Ya has apostado en esta partida. \nHas apostado ${prevBet.amount} colacoins a que <@!${prevBet.target}> ${prevBet.type ? 'gana' : 'pierde' }`).catch(console.log)
                    }
                  })
                } else {
                  message.reply(`YA ES DEMASIADO TARDE. Haber madrugao'`).catch(console.log)
                }
              }).catch(() => message.reply('Ni siquiera está jugando(???) de qué vas?')).catch(console.log)
            } else {
              message.reply('No puedes apostar por alguien que no haya hecho "!riotRegister"').catch(console.log)
            }
          })
        } else {
          message.reply("No haber nacido pobre").catch(console.log)
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