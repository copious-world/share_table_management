const assert = require('assert');

assert(process.argv.length == 3, 'node server.js <domain socket path>');

const net = require('net');

const udsPath = process.argv[2];
console.log('UDS path: ' + udsPath);

function createServer(name, portPath) {
    let server = net.createServer((socket) => {
        console.log(name + ' server connected');
        socket.on('end', function() {
            console.log(name + ' server disconnected');
        });
        socket.write('start sending now!');
        socket.pipe(socket);
    });
    server.listen(portPath, function() {
        console.log(name + ' server listening on ' + portPath);
    });

    return server;
}

var udsServer = createServer('UDS', udsPath);



process.on('SIGINT', (signal) => {
    console.log("Shutting down")
    if ( udsServer ) {
        udsServer.close()
        process.exit(0)
    }
})