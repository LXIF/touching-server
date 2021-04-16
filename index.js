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

let users = [];
let andris = [];
let rafals = [];

io.on('connection', (socket) => {

    function removeAndri(socket) {
        const andriIndex = andris.findIndex((andri) => {
            return andri.socket === socket.id;
        });
        if(andriIndex !== -1) {
            andris.splice(andriIndex, 1);
            // console.log('andri ' + socket.id + ' disconnected');
            // console.log('andris: ', andris);
        }
    }

    function removeRafal(socket) {
        const rafalIndex = rafals.findIndex((rafal) => {
            return rafal.socket === socket.id;
        });
        if(rafalIndex !== -1) {
            // console.log('rafal ' + socket.id + ' disconnected');
            // console.log('rafals: ', rafals);
            rafals.splice(rafalIndex, 1);
        }
    }

    function removeUser(socket) {
        const userIndex = users.findIndex((user) => {
            return user.socket === socket.id;
        });
        
        if(userIndex !== -1) {
            // console.log('user ' + socket.id + ' disconnected');
            // console.log('user: ', user);
            users.splice(userIndex, 1);
        }
    }

    function updateClientsAtAndri() {
        io.to('andris').emit('updateUsers', [
            ...users,
            ...andris,
            ...rafals
        ]);
    }

    //handshakeish

    socket.on('howdy', (message) => {
        console.log('socket', socket.id);
        console.log(message);

        if(message.id === 'andri') {
            removeAndri(socket);
            andris.push({
                ...message,
                socket: socket.id
            });
            socket.join('andris');
        } else if(message.id === 'rafal') {
            removeRafal(socket);
            rafals.push({
                ...message,
                socket: socket.id
            });
            socket.join('rafals');
            // console.log(rafals);
        } else {
            removeUser(socket);
            users.push({
                ...message,
                socket: socket.id
            });
            socket.join('users');
            // console.log(user);
        }
        updateClientsAtAndri()
        console.log(users);
    });

    //local presence

    socket.on('presence', (presence) => {
        // console.log(presence);
        socket.broadcast.emit('presence', presence);
    });

    //global weather

    socket.on('weather', (weather) => {
        // console.log(weather);
        socket.broadcast.emit('weather', weather);
    });



    //disconnect

    socket.on('disconnect', () => {
        console.log('dis');
        removeUser(socket);
        removeAndri(socket);
        removeRafal(socket);

        updateClientsAtAndri()
    });
});

http.listen(process.env.PORT || 3000, () => {
    console.log('listnin yeet');
});