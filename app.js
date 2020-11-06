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

const Primus = require('primus');
const Rooms = require('primus-rooms');
const PrimusRedisRooms = require('primus-redis-rooms');

const primus = new Primus(server, {
    redis: {
        host: 'localhost',
        port: 6379,
        channel: 'primus' // Optional, defaults to `'primus`'
    },
    transformer: 'websockets'
});

primus.plugin('rooms', Rooms);
// primus.use('redis', PrimusRedisRooms);

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
});

primus.on('disconnection', (ws)=>{
    console.log("Disconnected", ws.id)
    delete primus.SOCKET_LIST[ws.id]
});
server.listen(port);
