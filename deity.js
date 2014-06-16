var PORT = 51145;
var HOST = "localhost";

var cp = require("child_process");
var net = require("net");

// Make sure that deityd is running.
ensureDaemon();

// Ensures that deityd is running by trying to connect to its socket.
// If no connection can be established, deityd is started.
function ensureDaemon() {
    var socket = new net.Socket();
    socket.setTimeout(200);

    // Socket connected and deityd is running.
    socket.on("connect", function() {
        socket.end();
        socket.destroy();

        //console.log("Deity daemon is running");

        start();
    });

    // Socket failed to connect and deityd is not running.
    socket.on("error", function() {
        socket.end();
        socket.destroy();

        startDaemon();
        console.log("Starting deity daemon...");

        // Give the daemon some time to start before sending it commands.
        setTimeout(start, 200);
    });

    // Socket timed out. Can't determine if deityd is running, so notify and exit.
    socket.on("timeout", function() {
        socket.end();
        socket.destroy();

        console.error("Can't determine if deity is running");
        console.error("Try killing all node processes and trying again.");
        console.error("You may need to open port localhost:51145.")
    });
    socket.connect(PORT);
}

// Consolidates any extra arguments into a single string.
function getArguments() {
    return process.argv.slice(3).join(" ");
}

// Sends a message to deityd.
function send(command, message) {
    var socket = new net.Socket();

    // Print any data received from the daemon
    socket.on("data", function(buffer) {
        console.log(buffer.toString().trim());
    });

    // Exit the script if deityd terminates the TCP connection.
    socket.on("end", function() {
        process.exit();
    });

    socket.connect(PORT);
    socket.write(command + message);
    // Socket will be ended by deityd
}

// Processes arguments and sends the appropriate message to deityd.
function start() {
    var command = process.argv[2];

    if (command == "exit") {
        send("x", "");
    }
    else if (command == "force") {
        send ("!", "");
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

// Start deityd
function startDaemon() {
    var deityd = cp.spawn("node", ["deityd"], { stdio: "ignore", detached: true });

    // Prevent the current script from waiting until deityd exits.
    deityd.unref();
}