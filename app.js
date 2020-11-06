var express = require('express')
var http = require('http')
var app = express();
const Democracy = require('democracy');

const port = parseInt(process.argv[2], 10);

app.get('/',function(request, response){
    response.sendFile(__dirname + '/client/index.html');
});
app.get('/client/pong.js', function(request, response){
    response.sendFile(__dirname + '/client/pong.js');
});
app.get('/client/game.js', function(request, response){
    response.sendFile(__dirname + '/client/game.js');
});
app.get('/client/pong.css', function(request, response){
    response.sendFile(__dirname + '/client/pong.css');
});

app.use('/client', express.static(__dirname + '/client'));
var server = http.createServer(app);

/*** THIS PART ***/
const Primus = require('primus');
const Rooms = require('primus-rooms');

var primus = new Primus(server, {transformer: 'websockets'});

primus.plugin('rooms', Rooms);

const democracy = new Democracy({
    source: `0.0.0.0:${port}`,
    peers: ['0.0.0.0:3000', '0.0.0.0:3001'],
});

democracy.subscribe('global');
democracy.on('global', (msg)=>{
    primus.write(msg);
});
primus.SOCKET_LIST = {};
primus.ROOMS = {};

primus.on('connection', (ws)=>{
    console.log("CONNECTED to ", port, " id: ", ws.id);
    var socket = ws.socket;
    ws.player = 'player1'; //By default, the player is player 1, can change later.

    console.log('socket communication');
    SOCKET_LIST[ws.id] = ws;
    primus.SOCKET_LIST[ws.id] = ws;
    console.log('New Socket Added');
    console.log('Number of Active connections:' + Object.keys(primus.SOCKET_LIST).length);

    ws.on('data', (data)=>{
        console.log("Okay Data Received.", data);
        // console.log("Primus Sock Value: ", primus.SOCK);

        switch(data.eventName){
            case "gameStartEvents":
                ws.write({'eventName':'keyPressedFromServer', 'key':data.key});
                // democracy.publish('global', {'eventName':'keyPressedFromServer', 'key':data.key});
                break;
            case "keyPressed":
                console.log("Key Pressed", data.key);
                var dataPacket = {};
                var broadcastData = false;
                switch (data.key){
                    case 81: //key Q
                        if (ws.player == 'player1'){
                            dataPacket.player = 'player1';
                            dataPacket.direction = 'up';
                            if (data.roomName)
                                broadcastData = true;
                        }
                        break;
                    case 65: //Key A
                        if (ws.player == 'player1') {
                            dataPacket.player = 'player1';
                            dataPacket.direction = 'down';
                            if (data.roomName)
                                broadcastData = true;
                        }
                        break;
                    case 80: //Key P
                        if (ws.player == 'player2') {
                            dataPacket.player = 'player2';
                            dataPacket.direction = 'up';
                            if (data.roomName)
                                broadcastData = true;
                        }
                        break;
                    case 76: //Key L
                        if (ws.player == 'player2') {
                            dataPacket.player = 'player2';
                            dataPacket.direction = 'down';
                            if (data.roomName)
                                broadcastData = true;
                        }
                        break;
                }

                if (broadcastData){
                    //TODO need to do here for broadcasting
                    //for now sending to only one
                    dataPacket.eventName = 'gameplayEventFromServer'
                    ws.room(data.roomName).write(dataPacket);
                    // democracy.publish('global', dataPacket);
                }
                else{
                    dataPacket.eventName = 'gameplayEventFromServer'
                    ws.write(dataPacket);
                    // democracy.publish('global', dataPacket);
                }
                break;
            case "keyReleased":
                console.log("Key Released", data.key);
                var dataPacket = {};
                var broadcastData = false;
                switch (data.key){
                    case 81: //key Q
                        if (ws.player == 'player1'){
                            dataPacket.player = 'player1';
                            dataPacket.direction = 'stop';
                            if (data.roomName)
                                broadcastData = true;
                        }
                        break;
                    case 65: //Key A
                        if (ws.player == 'player1') {
                            dataPacket.player = 'player1';
                            dataPacket.direction = 'stop';
                            if (data.roomName)
                                broadcastData = true;
                        }
                        break;
                    case 80: //Key P
                        if (ws.player == 'player2') {
                            dataPacket.player = 'player2';
                            dataPacket.direction = 'stop';
                            if (data.roomName)
                                broadcastData = true;
                        }
                        break;
                    case 76: //Key L
                        if (ws.player == 'player2') {
                            dataPacket.player = 'player2';
                            dataPacket.direction = 'stop';
                            if (data.roomName)
                                broadcastData = true;
                        }
                        break;
                }
                if (broadcastData){
                    //TODO need to do here for broadcasting
                    //for now sending to only one
                    dataPacket.eventName = 'gameplayEventFromServer'
                    ws.room(data.roomName).write(dataPacket);
                    // democracy.publish('global', dataPacket);
                }
                else{
                    dataPacket.eventName = 'gameplayEventFromServer'
                    ws.write(dataPacket);
                    // democracy.publish('global', dataPacket);
                }
                break;
            case "ballPosition":
                console.log("Ball X: " + data.ball_x + " Y: " + data.ball_y);
                ws.ball_x = data.ball_x;
                ws.ball_y = data.ball_y;

                // TODO Broadcast the ball position to all the players in the room;
                if (data.roomName != undefined){
                    var roomName = data.roomName;
                    if (roomName != undefined){
                        if (ws.player == 'player1'){
                            ws.room(roomName).write({"eventName":"updateBallPositionFromServer", "ball_x": data.ball_x, "ball_y": data.ball_y});
                        }
                    }
                }
                else
                    ws.write({'eventName':'updateBallPositionFromServer', 'ball_x':data.ball_x, 'ball_y': data.ball_y});
                // democracy.publish('global', {'eventName':'updateBallPositionFromServer', 'ball_x':data.ball_x, 'ball_y': data.ball_y});
                break;
            case "createRoom":
                const ROOM = {
                    id: Math.random(),
                    name: data.roomName,
                    connectedSockets: []
                }
                primus.ROOMS[ROOM.id] = ROOM;
                ws.player = "player1";
                joinRoom(ws, ROOM);
                break;
            case "getRoomNames":
                const roomNames = [];
                for (const id in primus.ROOMS){
                    const {name} = primus.ROOMS[id];
                    const ROOM = {name, id};
                    roomNames.push(ROOM);
                }
                // callback(roomNames, SOCKET_LIST[connectionSocketId]);
                // socket.emit('roomList', roomNames);
                ws.write({"eventName":"roomList", "roomNames": roomNames});
                break;
            case "create":
                var room = data.roomName
                var room_instance = {
                    id: data.roomName,
                    name: data.roomName,
                    connectedSockets: []
                }
                primus.ROOMS[room_instance.id] = room_instance;
                ws.join(room, function(){
                    ws.room(room).write(({"eventName":"message", "message": (ws.id + "Joined Room " + room)}))
                });
                break;
            case "join":
                var room = data.roomName
                ws.player = "player2";
                ws.join(room, function(){
                    ws.room(room).write(({"eventName":"message", "message": (ws.id + "Joined Room " + room)}))
                });
                ws.room(room).clients(function(error, clients){
                    console.log("Currently Connected in room" + clients);
                    if (clients.length == 2)
                        ws.room(room).write({"eventName":"startMultiPlayerGameFromServer", "roomName":room});
                });
                break;
        }
    });


    socket.on('disconnect', function(){
        if (socket.roomId != undefined) {
            const room = ROOMS[socket.roomId];
            for (i in room.connectedSockets) {
                room.connectedSockets[i].roomId = undefined;
            }
        }
        delete ROOMS[socket.roomId];
        delete SOCKET_LIST[socket.id];
        console.log('Socket Deleted');
        console.log(Object.keys(SOCKET_LIST).length);
    });

    socket.on('gameStartEvents', function(data){
        // Can later filter the 0 , 1, 2 and ESC key behavior
        socket.emit('keyPressedFromServer', data);
    });

    socket.on('keyPressed', function (data){
        console.log("Key Pressed");
        console.log(data);
        const dataPacket = {};
        var broadcastData = false;
        switch (data){
            case 81: //key Q
                if (socket.player == 'player1') {
                    dataPacket.player = 'player1';
                    dataPacket.direction = 'up';
                    broadcastData = true;
                }
                break;
            case 65: //key A
                // var dataPacket = {};
                if (socket.player == 'player1') {
                    dataPacket.player = 'player1';
                    dataPacket.direction = 'down';
                    broadcastData = true;
                }
                break;
            case 80: //key P
                if (socket.player == 'player2') {
                    dataPacket.player = 'player2';
                    dataPacket.direction = 'up';
                    broadcastData = true;
                }
                break;
            case 76: //key L
                if (socket.player == 'player2') {
                    dataPacket.player = 'player2';
                    dataPacket.direction = 'down';
                    broadcastData = true;
                }
                break;
        }
        if (socket.roomId != undefined && broadcastData) {
            var room = ROOMS[socket.roomId];
            for (idx in room.connectedSockets) {
                room.connectedSockets[idx].emit('gameplayEventFromServer', dataPacket)
            }
        }
        else{
            socket.emit('gameplayEventFromServer', dataPacket);
        }
    });

    socket.on('keyReleased', function (data){
        console.log("Key Released");
        console.log(data);

        var dataPacket = {};
        var broadcastData = false;
        switch (data){
            case 81: //key Q
                if (socket.player == 'player1') {
                    console.log(socket.player, data, " relased")
                    dataPacket.player = 'player1';
                    dataPacket.direction = 'stop';
                    broadcastData = true;
                }
                break;
            case 65: //key A
                if (socket.player == 'player1') {
                    console.log(socket.player, data, " relased")
                    dataPacket.player = 'player1';
                    dataPacket.direction = 'stop';
                    broadcastData = true;
                }
                break;
            case 80: //key P
                if (socket.player == 'player2') {
                    console.log(socket.player, data, " relased")
                    dataPacket.player = 'player2';
                    dataPacket.direction = 'stop';
                    broadcastData = true;
                }
                // socket.emit('gameplayEventFromServer', dataPacket);
                break;
            case 76: //key L
                if (socket.player == 'player2') {
                    console.log(socket.player, data, " relased")
                    dataPacket.player = 'player2';
                    dataPacket.direction = 'stop';
                    broadcastData = true;
                }
                // socket.emit('gameplayEventFromServer', dataPacket);
                break;
        }
        if (socket.roomId != undefined && broadcastData) {
            var room = ROOMS[socket.roomId];
            for (idx in room.connectedSockets) {
                room.connectedSockets[idx].emit('gameplayEventFromServer', dataPacket)
            }
        }
        else{
            socket.emit('gameplayEventFromServer', dataPacket);
        }
    });

    socket.on('createRoom', (roomName, callback) => {
        const ROOM = {
            id: Math.random(),
            name: roomName,
            connectedSockets: []
        }
        ROOMS[ROOM.id] = ROOM;
        socket.player = "player1";
        joinRoom(socket, ROOM);
        callback()

    });

    socket.on('joinRoom', (roomId, callback) => {
        const ROOM = ROOMS[roomId];
        socket.player = "player2";
        joinRoom(socket, ROOM);
        // callback();
        for (idx in ROOM.connectedSockets) {
            ROOM.connectedSockets[idx].emit("startDoublePlayer", "");
        }
    });

    socket.on('getRoomNames', () => {
        const roomNames = [];
        for (const id in ROOMS){
            const {name} = ROOMS[id];
            const ROOM = {name, id};
            roomNames.push(ROOM);
        }
        // callback(roomNames, SOCKET_LIST[connectionSocketId]);
        socket.emit('roomList', roomNames);
    });

    // socket.on('paddlePosition', (paddlePosition)=>{
    //     console.log("Player : " +  paddlePosition.player);
    //     console.log("Paddle X: " + paddlePosition.paddle_x + " Y : " + paddlePosition.paddle_y);
    //     if (paddlePosition.player == 'player1'){
    //         socket.left_paddle_x = paddlePosition.paddle_x;
    //         socket.left_paddle_y = paddlePosition.paddle_y;
    //     }
    //     else if (paddlePosition.player == 'player2'){
    //         socket.right_paddle_x = paddlePosition.paddle_x;
    //         socket.right_paddle_y = paddlePosition.paddle_y;
    //     }
    // });

    socket.on('ballPosition', (ballPosition)=>{
        console.log("Ball X: " + ballPosition.ball_x + " Y: " + ballPosition.ball_y);
        socket.ball_x = ballPosition.ball_x;
        socket.ball_y = ballPosition.ball_y;

        if (socket.roomId != undefined){
            const room = ROOMS[socket.roomId];
            if (room != undefined){
                for (const i in room.connectedSockets) {
                    if (socket.player == 'player1') {
                        room.connectedSockets[i].emit('updateBallPositionFromServer', ballPosition)
                    }
                }
            }
        }

    });

});

primus.on('disconnection', (ws)=>{
    console.log("Disconnected", ws.id)
    delete SOCKET_LIST[ws.id];
    delete primus.SOCKET_LIST[ws.id]
});
server.listen(port);
/*** THIS PART ***/




// server.listen(port);
// http.createServer(app).listen(3001);
// http.createServer(app).listen(3002);

const SOCKET_LIST = {};
const ROOMS = {};

const joinRoom = (socket, room) => {
    room.connectedSockets.push(socket);
    socket.roomId = room.id;
    console.log(socket.id, "Joined ", room.id);


    // socket.join(room.id, () => {
    //     socket.roomId = room.id;
    //     console.log(socket.id, "Joined ", room.id);
    // })
}
/*

var io = require('socket.io')(server, {});
io.sockets.on('connection', function(socket){

    socket.player = 'player1'; //By default, the player is player 1, can change later.

    console.log('socket communication');
    SOCKET_LIST[socket.id] = socket;
    console.log('New Socket Added');
    console.log('Number of Active connections:' + Object.keys(SOCKET_LIST).length);


    socket.on('disconnect', function(){
        if (socket.roomId != undefined) {
            const room = ROOMS[socket.roomId];
            for (i in room.connectedSockets) {
                room.connectedSockets[i].roomId = undefined;
            }
        }
        delete ROOMS[socket.roomId];
        delete SOCKET_LIST[socket.id];
        console.log('Socket Deleted');
        console.log(Object.keys(SOCKET_LIST).length);
    });

    socket.on('gameStartEvents', function(data){
        // Can later filter the 0 , 1, 2 and ESC key behavior
        socket.emit('keyPressedFromServer', data);
    });

    socket.on('keyPressed', function (data){
        console.log("Key Pressed");
        console.log(data);
        const dataPacket = {};
        var broadcastData = false;
        switch (data){
            case 81: //key Q
                if (socket.player == 'player1') {
                    dataPacket.player = 'player1';
                    dataPacket.direction = 'up';
                    broadcastData = true;
                }
                break;
            case 65: //key A
                // var dataPacket = {};
                if (socket.player == 'player1') {
                    dataPacket.player = 'player1';
                    dataPacket.direction = 'down';
                    broadcastData = true;
                }
                break;
            case 80: //key P
                if (socket.player == 'player2') {
                    dataPacket.player = 'player2';
                    dataPacket.direction = 'up';
                    broadcastData = true;
                }
                break;
            case 76: //key L
                if (socket.player == 'player2') {
                    dataPacket.player = 'player2';
                    dataPacket.direction = 'down';
                    broadcastData = true;
                }
                break;
        }
        if (socket.roomId != undefined && broadcastData) {
            var room = ROOMS[socket.roomId];
            for (idx in room.connectedSockets) {
                room.connectedSockets[idx].emit('gameplayEventFromServer', dataPacket)
            }
        }
        else{
            socket.emit('gameplayEventFromServer', dataPacket);
        }
    });

    socket.on('keyReleased', function (data){
        console.log("Key Released");
        console.log(data);

        var dataPacket = {};
        var broadcastData = false;
        switch (data){
            case 81: //key Q
                if (socket.player == 'player1') {
                    console.log(socket.player, data, " relased")
                    dataPacket.player = 'player1';
                    dataPacket.direction = 'stop';
                    broadcastData = true;
                }
                break;
            case 65: //key A
                if (socket.player == 'player1') {
                    console.log(socket.player, data, " relased")
                    dataPacket.player = 'player1';
                    dataPacket.direction = 'stop';
                    broadcastData = true;
                }
                break;
            case 80: //key P
                if (socket.player == 'player2') {
                    console.log(socket.player, data, " relased")
                    dataPacket.player = 'player2';
                    dataPacket.direction = 'stop';
                    broadcastData = true;
                }
                // socket.emit('gameplayEventFromServer', dataPacket);
                break;
            case 76: //key L
                if (socket.player == 'player2') {
                    console.log(socket.player, data, " relased")
                    dataPacket.player = 'player2';
                    dataPacket.direction = 'stop';
                    broadcastData = true;
                }
                // socket.emit('gameplayEventFromServer', dataPacket);
                break;
        }
        if (socket.roomId != undefined && broadcastData) {
            var room = ROOMS[socket.roomId];
            for (idx in room.connectedSockets) {
                room.connectedSockets[idx].emit('gameplayEventFromServer', dataPacket)
            }
        }
        else{
            socket.emit('gameplayEventFromServer', dataPacket);
        }
    });

    socket.on('createRoom', (roomName, callback) => {
        const ROOM = {
            id: Math.random(),
            name: roomName,
            connectedSockets: []
        }
        ROOMS[ROOM.id] = ROOM;
        socket.player = "player1";
        joinRoom(socket, ROOM);
        callback()

    });

    socket.on('joinRoom', (roomId, callback) => {
        const ROOM = ROOMS[roomId];
        socket.player = "player2";
        joinRoom(socket, ROOM);
        // callback();
        for (idx in ROOM.connectedSockets) {
            ROOM.connectedSockets[idx].emit("startDoublePlayer", "");
        }
    });

    socket.on('getRoomNames', () => {
        const roomNames = [];
        for (const id in ROOMS){
            const {name} = ROOMS[id];
            const ROOM = {name, id};
            roomNames.push(ROOM);
        }
        // callback(roomNames, SOCKET_LIST[connectionSocketId]);
        socket.emit('roomList', roomNames);
    })

    // socket.on('paddlePosition', (paddlePosition)=>{
    //     console.log("Player : " +  paddlePosition.player);
    //     console.log("Paddle X: " + paddlePosition.paddle_x + " Y : " + paddlePosition.paddle_y);
    //     if (paddlePosition.player == 'player1'){
    //         socket.left_paddle_x = paddlePosition.paddle_x;
    //         socket.left_paddle_y = paddlePosition.paddle_y;
    //     }
    //     else if (paddlePosition.player == 'player2'){
    //         socket.right_paddle_x = paddlePosition.paddle_x;
    //         socket.right_paddle_y = paddlePosition.paddle_y;
    //     }
    // });

    socket.on('ballPosition', (ballPosition)=>{
        console.log("Ball X: " + ballPosition.ball_x + " Y: " + ballPosition.ball_y);
        socket.ball_x = ballPosition.ball_x;
        socket.ball_y = ballPosition.ball_y;

        if (socket.roomId != undefined){
            const room = ROOMS[socket.roomId];
            if (room != undefined){
                for (const i in room.connectedSockets) {
                    if (socket.player == 'player1') {
                        room.connectedSockets[i].emit('updateBallPositionFromServer', ballPosition)
                    }
                }
            }
        }

    })

});*/
