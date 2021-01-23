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
          if (err) {
            return reject(Error(err));
          }
          resolve(data);
        }
      );
    });
  };

  const getActiveGameBySummonerId = (summonerId) => {
    return new Promise((resolve, reject) => {
      riotRequest.request(
        "euw1",
        "spectator",
        `/lol/spectator/v4/active-games/by-summoner/${summonerId}`,
        function (err, data) {
          if (err) {
            return reject(
              Error(
                `Esta """persona""" que juega al lel no esta jugando bien por el yokese.`
              )
            );
          }
          resolve(data);
        }
      );
    });
  };

  const createBet = (newBet) => {
    return new Promise((resolve, reject) => {
      var newKey = firebaseDatabase.ref().child("bets").push().key;
      firebaseDatabase.ref(`/bets/${newKey}`).set(newBet, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(newKey);
        }
      });
    });
  };

  const deleteBet = (bet) => {
    return new Promise((resolve, reject) => {
      firebaseDatabase.ref(`/bets/${bet}`).set(null, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  };

  const getMatchDatafromMatchId = (matchID, accountId) => {
    return new Promise((resolve, reject) => {
      riotRequest.request(
        "euw1",
        "match",
        `/lol/match/v4/matches/${matchID}`,
        // todo hacer esto de una forma mas inteligente
        // los errores no pueden hacer parte de la logica :)
        function (err, data) {
          if (!err) {
            resolve(handleDtoMatchData(data, accountId));
          } else if (err.status === 404) {
            resolve(null);
          } else {
            reject();
          }
        }
      );
    });
  };

  const handleDtoMatchData = (data, accountId) => {
    const participantId = data.participantIdentities.find(
      (e) => e.player.accountId === accountId // fails. ??
    ).participantId; // 1 to 10
    const firstTeamWon = data.teams[0].win;
    const firstTeamId = data.teams[0].teamId;
    const Userteam = data.participants.find(
      (e) => e.participantId === participantId
    ).teamId;
    return firstTeamWon === "Win"
      ? firstTeamId === Userteam
      : firstTeamId !== Userteam;
  };

  const setUserById = (id, newUserObject) =>
    new Promise((resolve, reject) => {
      firebaseDatabase.ref(`/users/${id}`).set(newUserObject, (err) => {
        if (!err) {
          resolve();
        } else {
          reject(Error(err));
        }
      });
    });

  const getUserById = (id) =>
    new Promise((resolve, reject) => {
      firebaseDatabase
        .ref(`/users/${id}`)
        .once("value")
        .then((snap) => resolve(snap.val() ?? defaultUserObj))
        .catch((e) => {
          console.error(e);
          reject();
        });
    });

  const getPreviousBet = (authorId, gameId) =>
    new Promise((resolve, reject) => {
      firebaseDatabase
        .ref(`/bets/`)
        .once("value")
        .then((snapshot) => {
          const apuestas = snapshot.val() ? Object.values(snapshot.val()) : [];
          const prevBet = apuestas.find(
            (each) => each.gameId === gameId && each.author === authorId
          );
          resolve(prevBet);
        });
    });

  client.on("message", async (message) => {
    // Riot Register
    if (regex.regexRiotRegister.test(message.content)) {
      const userNameArr = message.content.split(" ");
      const userName = userNameArr.splice(1, userNameArr.length - 1).join(" ");
      requestSummonerByName(encodeURIComponent(userName))
        .then((riotUser) => {
          firebaseDatabase
            .ref(`/users/${message.author.id}`)
            .once("value")
            .then((snapshot) => {
              const userObj = snapshot.val() ? snapshot.val() : defaultUserObj;
              const newUser = {
                ...userObj,
                riotSummonerId: riotUser.id,
                riotAccountId: riotUser.accountId,
              };
              firebaseDatabase
                .ref(`/users/${message.author.id}`)
                .set(newUser, (err) => {
                  if (err) {
                    console.log(err);
                  } else {
                    if (userObj.riotAccountId) {
                      message.reply("Actualizado").catch(console.log);
                    } else {
                      message.reply("Registrado").catch(console.log);
                    }
                  }
                });
            });
        })
        .catch(() => {
          message
            .reply("Ese ~~puto virgen~~ invocador no existe")
            .catch(console.log);
        });
    }

    // Ver apuestas
    if (message.content === "!bets") {
      firebaseDatabase
        .ref(`/bets/`)
        .once("value")
        .then((snapshot) => {
          const apuestas = snapshot.val() ? Object.values(snapshot.val()) : [];
          if (apuestas.length > 0) {
            const msg = apuestas.reduce((acc, current) => {
              return acc.concat(
                `\n\t<@!${current.author}> ha apostado ${
                  current.amount
                } colacoins a que <@!${current.target}> ${
                  current.type ? "gana" : "pierde"
                }`
              );
            }, "Apuestas vigentes: ");
            message.channel.send(msg).catch(console.log);
          } else {
            message.channel
              .send("No hay apuestas ahora mismo")
              .catch(console.log);
          }
        });
    }

    // Apostar
    if (regex.regexApuesta.test(message.content)) {
      try {
        const split = message.content.split(" ");
        const amount = Number(split[1]);
        const targetId = split[2].slice(3, split[2].length - 1);
        const type = split[3] === "gana";

        console.log(" Step 1a - Comprobar que tenemos pasta suficiente");
        const author = await getUserById(message.author.id);
        if (author.points < amount) {
          throw Error("no haber nacido pobre");
        }

        console.log(
          " Step 1b - Comprobar que tenemos los datos del jugador en firebase"
        );
        const target = await getUserById(targetId);
        if (!(target && target.riotSummonerId && target.riotAccountId)) {
          throw Error(`dile a <!@${targetId}> que haga !riotRegister anda`);
        }

        console.log(" Step 2 - Comprobar que el jugador está en una partida");
        const currentGame = await getActiveGameBySummonerId(
          target.riotSummonerId
        );

        console.log(" Step 3 - Que la partida no pase de 7 min (420 seg)");
        if (currentGame.gameLength >= 420) {
          throw Error("has apostado demasiado tarde, no leo");
        }

        console.log(
          " Step 4 - Ver si esta persona ya ha apostado en la partida"
        );
        const prevBet = await getPreviousBet(
          message.author.id,
          currentGame.gameId
        );
        if (prevBet) {
          throw Error("Ya has apostado https://twitter.com/stopludopatia ");
        }

        console.log(
          " Step 5 - Le quitamos la cantidad de la apuesta al apostador"
        );
        const newUser = {
          ...author,
          points: author.points - amount,
        };
        await setUserById(message.author.id, newUser);

        console.log(" Step 6 - Registrar la apuesta");
        const newBet = {
          author: message.author.id,
          amount,
          target: targetId,
          type,
          gameId: currentGame.gameId,
        };
        const betId = await createBet(newBet);
        message.reply("Apuesta registrada");

        console.log(" Step 7 - Empezar polling por si acaba la partida");
        const pollingFunc = async () => {
          const playerWon = await getMatchDatafromMatchId(
            currentGame.gameId,
            target.riotAccountId
          );

          if (playerWon === null) {
            setTimeout(pollingFunc, pollingTime);
          } else {
            console.log(" Step 8 - Pagar la coca");
            if (type === playerWon) {
              await deleteBet(betId) // delete previous bet
              const winnersnap = await getUserById(message.author.id);
              const winner = {
                ...winnersnap,
                points: winnersnap.points + amount * 2,
              };
              await setUserById(message.author.id, winner);
              message.channel.send(
                `<@!${message.author.id} ha ganado la apuesta y ${
                  amount * 2
                } colacoins`
              );
            } else {
              message.channel.send(
                `<@!${message.author.id} ha perdido la apuesta de ${amount} colacoins`
              );
            }
          }
        };
        setTimeout(pollingFunc, pollingTime);
      } catch (e) {
        console.log(e);
        if (e) {
          message.reply(e.message).catch(console.log);
        }
      }
    }
  });
};
