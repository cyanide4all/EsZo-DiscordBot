var regex = require("./regexp");
const { 
    defaultUserObj, 
    dailyPoints, 
    points5min, 
    reactionPoints 
} = require("./struct")

module.exports = (client, firebaseDatabase) => {


    function cobrarPuntos(userId, isDisconect, cb) {
        firebaseDatabase.ref(`/users/${userId}`).once('value').then((snapshot) => {
            const userObj = snapshot.val() ? snapshot.val() : defaultUserObj;
            const now = new Date().getTime();
            const newUser = {
                ...userObj, 
                lastConnect: isDisconect ? null : now,
            }
            if (userObj.lastConnect && userObj.lastConnect < (now - 300000)) { // 300000 = ms en 5 min 
                newUser.points = userObj.points + Math.round(points5min * ((now - userObj.lastConnect)/300000))
            } 
            firebaseDatabase.ref(`/users/${userId}`).set(newUser, (err) => {
                if (err) {
                    console.log(err);
                }
            })
            if (cb) {
                cb(newUser.points)
            }
        })
    }

    // CONEXION
    client.on('voiceStateUpdate', (prevState, newState) => {
        // Al conectarse, comprobar si es la primera del día
        if (prevState.channel == null && newState.channel != null) {
            firebaseDatabase.ref(`/users/${newState.member.id}`).once('value').then((snapshot) => {
                const userObj = snapshot.val() ? snapshot.val() : defaultUserObj;
                const now = new Date().getTime();
                const newUser = {
                    ...userObj,
                    lastConnect: now
                }                
                if (userObj.dailyConnect < (now - 86400000)) { // 86400000 = ms en 1 día
                    newUser.points = userObj.points + dailyPoints
                    newUser.dailyConnect = now
                }
                firebaseDatabase.ref(`/users/${newState.member.id}`).set(newUser, (err) => {
                    if (err) {
                        console.log(err);
                    }
                })
            })
        }
        // Al desconectarse, comprobar cuánto ha pasado conectado
        if (newState.channel == null && prevState.channel != null) {
            cobrarPuntos(newState.member.id, true);
        }
    });

    // REACCION :dogo:
    client.on('messageReactionAdd', (reaction, author) => {
        if (reaction.emoji.id == 318132608057868309 && reaction.message.author.id != author.id) {
            firebaseDatabase.ref(`/users/${reaction.message.author.id}`).once('value').then((snapshot) => {
                const userObj = snapshot.val() ? snapshot.val() : defaultUserObj;
                const newUser = {
                    ...userObj,
                    points: userObj.points + reactionPoints
                }                
                firebaseDatabase.ref(`/users/${reaction.message.author.id}`).set(newUser, (err) => {
                    if (err) {
                        console.log(err);
                    }
                })
            })
        }
    });

    client.on('messageReactionRemove', (reaction, author) => {
        if (reaction.emoji.id == 318132608057868309 && reaction.message.author.id != author.id) {
            firebaseDatabase.ref(`/users/${reaction.message.author.id}`).once('value').then((snapshot) => {
                const userObj = snapshot.val() ? snapshot.val() : defaultUserObj;
                const newUser = {
                    ...userObj,
                    points: userObj.points >= reactionPoints ? userObj.points - reactionPoints : 0
                }                
                firebaseDatabase.ref(`/users/${reaction.message.author.id}`).set(newUser, (err) => {
                    if (err) {
                        console.log(err);
                    }
                })
            })
        }
    });


    // TEXTO
    client.on('message', message => {
        if (message.channel.id != 268398719802540032) {
            // TOP de colacoins
            if (message.content === "!capitalismo") {
                firebaseDatabase.ref('/users/').once('value').then((snapshot) => {
                    const data = (snapshot.val());
                    let dataAsArray = Object.keys(data).map(each => ({
                        userId: each,
                        points: data[each].points ? data[each].points : 0
                    })).sort((a,b)=> b.points - a.points)
                    if (dataAsArray.length >= 3) {
                        message.channel.send(`
                        TOP 3 CAPITALISTAS DE ESZO:
                            <@!${dataAsArray[0].userId}> - ${dataAsArray[0].points} colacoins
                            <@!${dataAsArray[1].userId}> - ${dataAsArray[1].points} colacoins
                            <@!${dataAsArray[2].userId}> - ${dataAsArray[2].points} colacoins`).catch(console.log)
                    } else {
                        message.channel.send(`Muy poco capitalista hoy por aquí...`).catch(console.log)
                    }
                });
            }
            // Mis colacoins
            if (message.content === "!coins") {
                firebaseDatabase.ref(`/users/${message.author.id}`).once('value').then((snapshot) => {
                    const data = snapshot.val() ? snapshot.val() : defaultUserObj;
                    if (!data) {
                        firebaseDatabase.ref(`/users/${message.author.id}`).set({ points: 0 }, (err) => {
                            if (err) {
                                console.log(err)
                            } else {
                                message.reply(`Tienes 0 colacoins`).catch(console.log)
                            }
                        });
                    } else {
                        message.reply(`Tienes ${data.points} colacoins`).catch(console.log)
                    }
                });
            }
            // Pedir puntos sin desconectarse
            if (message.content === "dame punto") { 
                cobrarPuntos(message.author.id, !(message.member && message.member.voice.channelID), (newPoints) => message.reply(`Ahora tienes ${newPoints} colacoins`).catch(console.log))
            }
            // Enviar punto
            if (regex.regexPagar.test(message.content)) {
                const split = message.content.split(" ");
                const cantidad = Number(split[1]);
                const destinatario = split[2].slice(3, split[2].length-1);
                if (destinatario != message.author.id) {
                    firebaseDatabase.ref(`/users/${message.author.id}`).once('value').then((snapshot) => {
                        const data = snapshot.val() ? snapshot.val() : defaultUserObj;
                        if (data.points >= cantidad) {
                            firebaseDatabase.ref(`/users/${destinatario}`).once('value').then((snapshot2) => {
                                const data2 = snapshot2.val() ? snapshot2.val() : defaultUserObj;
                                newData2 = { ...data2, points: data2.points + cantidad }
                                firebaseDatabase.ref(`/users/${destinatario}`).set(newData2, (err) => {
                                    if (err) {
                                        console.log(err)
                                    } else {
                                        const newData = { ...data, points: data.points - cantidad }
                                        firebaseDatabase.ref(`/users/${message.author.id}`).set(newData, (err) => {
                                            if (err) {
                                                console.log(err)
                                            } else {
                                                message.reply(`Has pagado ${cantidad} colacoins a <@!${destinatario}>`).catch(console.log)
                                            }
                                        });
                                    }
                                });
                            })
                        } else {
                            message.reply("No haber nacido pobre.").catch(console.log)
                        }
                    })
                }
            }
        }
    })    
}
