const assert = require('assert');

assert(process.argv.length == 4, 'node server.js <domain socket path> <server count>');

const net = require('net');

const udsPath = process.argv[2];
console.log('UDS path: ' + udsPath);
const srv_count = process.argv[3];
console.log(`running ${srv_count} servers`)

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




let udsServers = []

for ( let i = 0; i < srv_count; i++ ) {
    udsServers[i] = createServer('UDS', `${udsPath}-${i}` );
}



process.on('SIGINT', (signal) => {
    console.log("Shutting down")
    if ( udsServers.length ) {
        for ( let i = 0; i < srv_count; i++ ) {
            udsServers[i].close()
        }
        process.exit(0)
    }
})