var PORT = 51145;
var HOST = "localhost";

var cp = require("child_process");
var dgram = require("dgram");
var net = require("net");

// Make sure that dietyd is running.
ensureDaemon();

function start() {
    var command = process.argv[2];

    if (command == "exit") {
        send("x", "");
    }
    else if (command == "list") {
        send("l", "");
    }
    else if (command == "kill") {
        send("k", getArguments());
    }
    else if (command == "new") {
        send("n", getArguments());
    }
}

/**
 * Ensures that deityd is running by executing the process.
 * deityd will not start a new server and quit if it is already running.
 */
function ensureDaemon() {
    //cp.exec("node deityd").unref();
    var d = cp.spawn("node", ["deityd"], { stdio: "ignore", detached: true });

    setTimeout(start, 200);
}

function getArguments() {
    return process.argv.slice(3).join(" ");
}

/**
 * Sends a message to deityd.
 * @param {String} command One-letter command.
 * @param {String} message Optional message to go with the command.
 */
function send(command, message) {
    var socket = new net.Socket();

    // Print any data received from the daemon
    socket.on("data", function(buffer) {
        console.log(buffer.toString().trim());
    });
    socket.on("end", function() {
        process.exit();
    });

    socket.connect(PORT);
    socket.write(command + message);
    // Socket will be ended by deityd
}