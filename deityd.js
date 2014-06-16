var PORT = 51145;
var HOST = "localhost";

var cp = require("child_process");
var dgram = require("dgram");
var net = require("net");

var processes = {};

startDaemon();

// Returns the number of running processes
function countProcesses() {
    return Object.getOwnPropertyNames(processes).length;
}

/**
 * Close all processes and exit deityd.
 */
function exit(socket, force) {
    // Close each process.
    for (var p in processes) {
        processes[p].kill();
    }

    if (force)
        process.exit();
    else
        exitLoop(socket);
}

// Try exiting every 500 ms if every process has died.
// TODO: Implement a process counter using events and exit deityd when all processes are closed.
function exitLoop(socket) {
    if (countProcesses() == 0) {
        socket.end();
        process.exit();
    }
    else {
        setTimeout(function() { exitLoop(socket); }, 500);
    }
}

// Kills the named processes.
function killProcess(p) {
    if (processes[p] != null) {
        processes[p].kill();
    }
    else {
        return "No such process";
    }
}

// Lists all running processes.
function list() {
    var n = countProcesses();

    // Check if the processes map is empty
    if (n == 0) {
        return "No processes";
    }
    else {
        var output = "" + n + " running ";

        // Pluralize
        if (n == 1)
            output += "process \r\n";
        else
            output += "processes \r\n";

        // List each process
        for (var p in processes) {
            output += p;
            output += "(" + processes[p].pid + ")";
            output += "\r\n";
        }

        return output;
    }
}

// Spawns a new process
function newProcess(message, socket) {
    console.log("New process: " + message);

    // Separate the process name from the command
    var processName = message.split(" ", 1)[0];
    var processCommand = message.substring(processName.length + 1);

    // Run the process and save it to the list
    var process = cp.exec(processCommand);
    processes[processName] = process;
    processes[processName].cmd = processCommand;

    // Remove an exited process from the list
    process.on("exit", function() {
        delete processes[processName];
    });

    return "New process " + processName + "(" + process.pid + ")";
}

function startDaemon() {
    // TCP server on the daemon.
    // The function is fired on a connection.
    var server = net.createServer(function(socket) {
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
                socket.end(newProcess(message, socket));
            }
            else if (command == "x") { // Exit
                // Kill the connection to the client.
                socket.write("Stopping deity daemon...");
                exit(socket, false);
            }
            else if (command == "!") { // Force exit
                socket.end("Force exiting!")
                process.exit(socket, true);
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