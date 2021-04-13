//jshint: esversion 6

const serveStatic = require('serve-static');
const express = require('express');
const app = express();
app.use(express.static("public"));

// app.get('', (req, res) => {
//     res.sendFile("index.html")
// });

var history = require('connect-history-api-fallback');

app.use(history());
app.use(serveStatic(__dirname + '/dist'));

const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

io.on('connection', (socket) => {
    socket.on('howdy', (message) => {
        console.log(message);
    });
    socket.on('presence-position', (position) => {
        console.log(position);
        io.emit('presence-position', position);
    });
});

http.listen(process.env.PORT || 3000, () => {
    console.log('listnin yeet');
});