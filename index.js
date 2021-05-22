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
let usersSockets = [];
let andrisSockets = [];
let rafalsSockets = [];
let touchizationOngoing = false;
let touchizationMuted = false;
let nextToucher;

io.on('connection', (socket) => {



    function removeAndri(socket) {
        const andriIndex = andris.findIndex((andri) => {
            return andri.socket === socket.id;
        });
        if(andriIndex !== -1) {
            andris.splice(andriIndex, 1);
        }
        const andrisSocketsIndex = andrisSockets.findIndex((andriSocket) => {
            return andriSocket.id === socket.id;
        });
        if(andrisSocketsIndex !== -1) {
            andrisSockets.splice(andrisSocketsIndex, 1);
        }
    }

    function removeRafal(socket) {
        const rafalIndex = rafals.findIndex((rafal) => {
            return rafal.socket === socket.id;
        });
        if(rafalIndex !== -1) {
            rafals.splice(rafalIndex, 1);
        }
        const rafalsSocketsIndex = rafalsSockets.findIndex((rafalSocket) => {
            return rafalSocket.id === socket.id;
        });
        if(rafalsSocketsIndex !== -1) {
            rafalsSockets.splice(rafalsSocketsIndex, 1);
        }
    }

    function removeUser(socket) {
        const userIndex = users.findIndex((user) => {
            return user.socket === socket.id;
        });
        
        if(userIndex !== -1) {
            users.splice(userIndex, 1);
        }
        const usersSocketsIndex = usersSockets.findIndex((userSocket) => {
            return userSocket.id === socket.id;
        });
        if(usersSocketsIndex !== -1) {
            usersSockets.splice(usersSocketsIndex, 1);
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

        if(message.id === 'andri') {
            removeAndri(socket);
            andris.push({
                ...message,
                socket: socket.id
            });
            andrisSockets.push(socket);
            socket.join('andris');
        } else if(message.id === 'rafal') {
            removeRafal(socket);
            rafals.push({
                ...message,
                socket: socket.id
            });
            rafalsSockets.push(socket)
            socket.join('rafals');

        } else {
            console.log(message);
            removeUser(socket);
            users.push({
                ...message,
                socket: socket.id
            });
            usersSockets.push(socket);
            socket.join('users');
   
        }
        updateClientsAtAndri()
        // console.log('connected users: ');
        // console.log(users);
        // console.log('connected rafals: ');
        // console.log(rafals);
        // console.log('connected andris: ');
        // console.log(andris);
    });

    //local presence

    socket.on('presence', (presence) => {

        socket.broadcast.emit('presence', presence);
    });

    //global weather

    socket.on('weather', (weather) => {

        socket.broadcast.emit('weather', weather);
    });

    socket.on('chat', (message) => {

    });

    /////////UPDATE USER////////

    socket.on('updateUser', (payload) => {
        if(payload.id === 'user') {
            const userIndex = users.findIndex((user) => {
                return user.socket === socket.id;
            });
            if(userIndex !== -1) {

                users[userIndex].audioStarted = true;
            }
        }
        if(payload.id === 'rafal') {
            const rafalIndex = rafals.findIndex((rafal) => {
                return rafal.socket === socket.id;
            });
            if(rafalIndex !== -1) {

                rafals[rafalIndex].audioStarted = true;
            }
        }
        updateClientsAtAndri();
    });

    /////////////////////////TOUCHIZATION SEQUENCE//////////////////////

    function startTouchizationSequence() {
        touchizationOngoing = true;
        rafals.forEach((rafal) => {
            rafal.touching = true;
            socket.join('touching');
        });
        io.to('rafals').emit('touchization', 'nowtouched');
        updateClientsAtAndri();
        nextToucher = users.find(user => !user.touching);
        if(!!nextToucher) {
            io.to(nextToucher.socket).emit('touchization', 'pleasetouch');
        }
    }

    function getRandomColor() {
        return Math.random() * 360;
    }

    let rafalColorTimer;

    function rafalRandomColors(on) {
        if(on === true) {
            rafalColorTimer = setInterval(() => {
                const newColor = getRandomColor();
                console.log(newColor);
                io.to('rafals').emit('touchcolor', newColor);
            }, 300);
        } else {
            console.log('stop');
            clearInterval(rafalColorTimer);
        }
    }

    let usersColorTimer;
    function usersRandomColors(on) {
        if(on === true) {
            usersColorTimer = setInterval(() => {
                const newColor = getRandomColor();
                console.log(newColor);
                io.to('users').emit('touchcolor', newColor);
            }, 300);
        } else {
            console.log('stop');
            clearInterval(usersColorTimer);
        }
    }

    function userIsTouching() {
        console.log('userIsTouching');
        const userIndex = users.findIndex((user) => user.socket === socket.id);
        console.log(userIndex);
        users[userIndex].touching = true;
        console.log(users);
        socket.join('touching');
        updateClientsAtAndri();
        nextToucher = users.find(user => !user.touching);
        const newColor = getRandomColor();
        io.emit('touchcolor', newColor);
        if(!!nextToucher) {
            io.to(nextToucher.socket).emit('touchization', 'pleasetouch');
        } else {
            console.log('ausgetoucht');
            touchizationOngoing = false;
            touchizationMuted = false;
        }
    }

    function skipUserTouching() {
        console.log('Skip');

        //set touching to true in users
        const userIndex = users.findIndex((user) => user.socket === nextToucher.socket);
        console.log(userIndex);
        users[userIndex].touching = true;


        console.log(users);

        //join the socket to the room

        const userSocketIndex = usersSockets.findIndex((userSocket) => userSocket.id === nextToucher.socket);
        usersSockets[userSocketIndex].join('touching');

        //tell user its been skipped
        io.to(nextToucher.socket).emit('touchization', 'skip');

        updateClientsAtAndri();
        nextToucher = users.find(user => !user.touching);
        const newColor = getRandomColor();
        io.emit('touchcolor', newColor);
        if(!!nextToucher) {
            io.to(nextToucher.socket).emit('touchization', 'pleasetouch');
        } else {
            console.log('ausgetoucht');
            touchizationOngoing = false;
            touchizationMuted = false;
        }
    }

    function resetTouchization() {
        touchizationOngoing = false;
        touchizationMuted = false;
        io.emit('touchization', 'reset');
    }

    socket.on('touchization', (command) => {
        console.log(command);
        if(command === 'rafalColorsOn') {
            rafalRandomColors(true);
            io.emit('touchization', 'rafalColorsOn');
        }
        if(command === 'rafalColorsOff') {
            rafalRandomColors(false);
            io.emit('touchization', 'rafalColorsOff')
        }
        if(command === 'usersColorsOn') {
            usersRandomColors(true);
            io.emit('touchization', 'usersColorsOn')
        }
        if(command === 'usersColorsOff') {
            usersRandomColors(false);
            io.emit('touchization', 'usersColorsOff')
        }
        // if(command === 'start') {
        //     //startTouchizationSequence();
        //     sendColorToAll = !sendColorToAll;
        //     if(sendColorToAll) {
        //         io.to('users').emit('touchization','nowtouched');
        //     } else {
        //         io.to('users').emit('touchization','nownottouched');
        //     }
        // }
        // if(command === 'yestouch' && touchizationOngoing) {
        //     userIsTouching(socket.id);
        // }
        // if(command === 'muteon') {
        //     touchizationMuted = true;
        //     io.emit('touchization', 'muteon');
        //     rafalRandomColors(false);
        // }
        // if(command === 'muteoff') {
        //     touchizationMuted = false;
        //     io.emit('touchization', 'muteoff');
        //     rafalRandomColors(true);
        // }
        // if(command === 'skip') {
        //     skipUserTouching();
        // }
        // if(command === 'reset') {
        //     resetTouchization();
        // }
    });

    socket.on('poem-mira', (message) => {
        console.log(message);
        if(message.outputRafals) {
            io.to('rafals').emit('poem-mira', message);
        }
        if(message.outputUsers) {
            io.to('users').emit('poem-mira', message);
        }
    });
    socket.on('poem-rafal', (message) => {
        console.log(message);
        if(message.outputRafals) {
            io.to('rafals').emit('poem-rafal', message);
        }
        if(message.outputUsers) {
            io.to('users').emit('poem-rafal', message);
        }
    });


    // socket.on('touchsequence', (message) => {
    //     //start
    //     if(message === 'start') {
    //         let counter = 0;


    //     }
    //     //requesttouch
    //     //sendtouch
    //     //end
    //     if(message === 'end') {

    //     }
    // });

    // socket.on('sendtouch', () => {

    // });



    //disconnect

    socket.on('disconnect', () => {
        removeUser(socket);
        removeAndri(socket);
        removeRafal(socket);

        updateClientsAtAndri()
    });
});

http.listen(process.env.PORT || 3000, () => {
    console.log('listnin 3K yeet');
});