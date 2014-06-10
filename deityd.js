var PORT = 51145;
var HOST = "localhost";

var cp = require("child_process");
var dgram = require("dgram");
var net = require("net");

//ensureSingleDaemon();

var processes = {};
var socket = dgram.createSocket("udp4", function(buf) {
    var data = buf.toString().trim();
});

/**function ensureSingleDaemon() {
    var socket = new net.Socket();
    socket.setTimeout(100);
    socket.on("connect", function() {
        // Daemon is up, so exit.
        socket.end();
        socket.destroy();
        process.exit();
    });
    socket.on("error", function() {
        socket.end();
        socket.destroy();
        startDaemon();
    });
    socket.on("timeout", function() {
        socket.end();
        socket.destroy();
        process.disconnect();
        startDaemon();
    });
    socket.connect(PORT);
}*/

startDaemon();

/**
 * Close all processes and exit deityd.
 */
function exit() {
    console.log("Exiting");

    // Close each process.
    for (var p in processes) {
        processes[p].kill();
    }

    // Give processes time to exit
    // TODO: Implement a process counter using events and exit deityd when all processes are closed.
    setTimeout(process.exit, 1000);
}

/**
 * Kills the specified process.
 */
function killProcess(p, socket) {
    if (processes[p] != null) {
        processes[p].kill();
    }
    else {
        return "No such process";
    }
}

/**
 * Lists all running processes.
 * @return {[type]} [description]
 */
function list() {
    var output = "";

    for (var p in processes) {
        output += p;
        output += "(" + processes[p].pid + ")";
        output += "\r\n";
    }

    return output;
}

function newProcess(message) {
    console.log("New process: " + message);

    var processName = message.split(" ", 1)[0];
    var processCommand = message.substring(processName.length + 1);

    var process = cp.exec(processCommand);
    processes[processName] = process;

    process.on("exit", function() {
        delete processes[processName];
    });
}

function startDaemon() {
    process.stdout = {};
    process.stdin = {};
    process.stderr = {};

    // TCP server on the daemon.
    // The function is fired on a connection.
    var server = net.createServer(function(socket) {
        // Client has connected to server.
        console.log("Accepted connection");

        // Event fired when a command has been received.
        socket.on("data", function(buffer) {
            data = buffer.toString().trim();

            var command = data.toString().charAt(0);
            var message = data.toString().substring(1);

            if (command == "k") { // Kill
                killProcess(message, socket);
                socket.end("Killing " + message);
            }
            else if (command == "l") { // List
                socket.end(list());
            }
            else if (command == "n") { // New
                newProcess(message);
                socket.end("New process " + message);
            }
            else if (command == "x") { // Exit
                // Kill the connection to the client.
                socket.end();
                exit();
            }
        });

        // Notify when a connection dies.
        socket.on("end", function() {
            console.log("Disconnected");
        });
    });

    // Notify and exit if the server failed to start, probably because the port is blocked.
    server.on("error", function() {
        console.log("Failed to start. Is deityd already running?");
        process.exit();
    });

    // Run the server.
    // Will fail if the port is already bound, ensuring a single instance of the daemon.
    server.listen(PORT, function() {
        console.log("Server listening");
    });
}