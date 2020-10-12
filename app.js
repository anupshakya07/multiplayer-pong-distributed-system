// require('./game')
// require('./pong')

var express = require('express')
var app = express();
var server = require('http').Server(app);


const port = 3000;
const Primus = require('primus');



app.get('/',function(request, response){
    response.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));
server.listen(port);

// const primus = Primus.createServer(function connection(spark){
//
// }, {port: port, transformer: 'websockets' });

// primus.on('connection', (ws) => {
//     console.log('CONNECT', port);
//
//     ws.on('data', (msg) => {
//         primus.write(msg);
//     });
// });



// const ws = new Primus('ws://localhost:3000/primus');
// ws.on('data', (data) => {
//     console.log("Data");
//     console.log(data);
// });

// var http = require('http');
// var url = require('url');
// var fs = require('fs');


// http.createServer(function(request, response){
//     // res.writeHead(200, {'Content-Type': 'text/plain'});
//     // res.end('Hello World!! Hi');
//     var path = url.parse(request.url).pathname;
//     switch (path) {
//         case '/':
//             response.writeHead(200, {
//                 'Content-Type': 'text/plain'
//             });
//             response.write("Here Root Path");
//             response.end();
//             // var pong = Game.start('game', Pong, {
//             //     sound:       true,
//             //     stats:       true,
//             //     footprints:  true,
//             //     predictions: true
//             // });
//             break;
//         case '/index.html':
//             fs.readFile(__dirname + path, function(error, data){
//                 if (error){
//                     response.writeHead(404);
//                     response.write(error);
//                     response.end();
//                 }
//                 else {
//                     response.writeHead(200, {
//                         'Content-Type': 'text/html'
//                     });
//                     response.write(data);
//                     response.end();
//                 }
//             });
//             break;
//     }
// }).listen(8010);