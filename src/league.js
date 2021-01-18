module.exports = (client, riotApiClient, firebaseDatabase) => {
    function addPoints(userId, toAdd, onSuccess, onError) {
        firebaseDatabase.ref(`/users/${userId}`).once('value').then((snapshot) => {
            var userObj = snapshot.val() ? snapshot.val() : { points: 0 };
            newUser = { ...userObj, points: userObj.points + toAdd };
            firebaseDatabase.ref(`/users/${userId}`).set(newUser, (err) => {
                if (err) {
                    onError();
                } else {
                    onSuccess(newUser.points);
                }
            });
        });
    }


    client.on('message', message => {
        if (message.content === "!capitalismo") {
            firebaseDatabase.ref('/users/').once('value').then((snapshot) => {
                const data = (snapshot.val() && snapshot.val());
                let dataAsArray = Object.keys(data).map(each => ({
                    userId: each,
                    points: data[each].points ? data[each].points : 0
                })).sort((a,b)=> b.points - a.points)
                message.channel.send(`
                TOP 3 CAPITALISTAS DE ESZO:
                    <@!${dataAsArray[0].userId}> - ${dataAsArray[0].points} colacoins
                    <@!${dataAsArray[1].userId}> - ${dataAsArray[1].points} colacoins
                    <@!${dataAsArray[2].userId}> - ${dataAsArray[2].points} colacoins`)
            });
        }
        if (message.content === "!coins") {
            firebaseDatabase.ref(`/users/${message.author.id}`).once('value').then((snapshot) => {
                const data = (snapshot.val() && snapshot.val());
                message.channel.send(`Tienes ${data.points} colacoins`)
            });
        }
        if (message.content === "dame punto") {
            addPoints(
                message.author.id, 
                10, 
                (newPoints) => message.reply(`Ahora tienes ${newPoints}`)),
                () => message.reply("Algo ha salido mal")
        }
    })    
}
