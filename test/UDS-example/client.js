var assert = require('assert');


assert(process.argv.length >= 6, 'node client.js <port or path> <packet size> <packet count> <proc number> (<use pipe index>)');

var net = require('net');
var crypto = require('crypto');

let srv_base_path = process.argv[2];

var packetSize = parseInt(process.argv[3]);
assert(!isNaN(packetSize), 'bad packet size');
console.log('packet size: ' + packetSize);

var packetCount = parseInt(process.argv[4]);
assert(!isNaN(packetCount), 'bad packet count');
console.log('packet count: ' + packetCount);


var pNum = parseInt(process.argv[5]);
assert(!isNaN(pNum), 'bad proc number');
console.log('proc number: ' + pNum);

if ( process.argv.length > 6 ) {
    srv_base_path += `-${pNum}`
}

let options = {'path': srv_base_path };
console.log('options: ' + JSON.stringify(options));

var client = net.connect(options, function() {
    console.log('client connected');
});

var printedFirst = false;
var packet = crypto.randomBytes(packetSize).toString('base64')

console.log(`${packetSize} ${packet}`)


packet = packet.substring(0,packetSize - `${pNum}`.length - 1);
console.log(packet)

packet += `-${pNum}`

console.log(packet)

var currPacketCount = 0;
var startTime;
var endTime;
var delta;
client.on('data', function(data) {
    if (printedFirst == false) {
        console.log('client received: ' + data);
        printedFirst = true;
        client.write(`name:${pNum}`);
    }
    else {
        currPacketCount += 1;
        if (data.length != packetSize)
            console.log('weird packet size: ' + data.length);
        let msg = data.toString();
        // console.log(msg)
        // if ( (currPacketCount % 50) == 0) {
        //     console.log(`client received a packet: ${currPacketCount} ${msg.split('-')[1]}`);
        // }
    }

    if (currPacketCount < packetCount) {
        if (currPacketCount == 0) {
            startTime = process.hrtime();
        }
        client.write(packet);
    } else {
        client.end();
        endTime = process.hrtime(startTime);
        delta = (endTime[0] * 1e9 + endTime[1]) / 1e6;
        console.log('millis: ' + delta);
    }
});