const assert = require('assert');
const {spawn} = require('child_process')


let sp = spawn('node',['unspawned.js'], {
                        stdio: ['inherit', 'inherit', 'inherit', 'ipc']})
sp.on('message',(msg) => {
    console.log(`got a message: "${msg}"`)
})

assert(process.argv.length == 3, 'node server.js <domain socket path>');

const net = require('net');

const udsPath = process.argv[2];
console.log('UDS path: ' + udsPath);

function createServer(name, portPath) {
    let server = net.createServer((socket) => {
        socket._x_path = false;
        console.log(name + ' server connected: ' + socket.remoteAddress);
        socket.on('end', function() {
            console.log(name +  `-${socket._x_path}-` + ' server disconnected');
        });
        socket.write('start sending now!');
        socket.on('data',(data) => {
            let str = data.toString();
            if ( socket._x_path === false ) {
                console.log(`connecting from: ${str}...  `)
                socket._x_path = str;
                socket.pipe(socket);
            }
        })
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