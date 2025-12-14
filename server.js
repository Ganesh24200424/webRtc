import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'path';
import "dotenv/config";
const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});
const allusers = {};

// /your/system/path
const __dirname = dirname(fileURLToPath(import.meta.url));


// exposing public directory to outside world
app.use(express.static("public"));

// handle incoming http request
app.get("/", (req, res) => {
    console.log("GET Request /");
    res.sendFile(join(__dirname + "/app/index.html"));
});

// handle socket connections
io.on("connection", (socket) => {
    console.log(`Someone connected to socket server and socket id is ${socket.id}`);
    socket.on("join-user", username => {
        console.log(`${username} joined socket connection`);
        allusers[username] = { username, id: socket.id };
        // inform everyone that someone joined
        io.emit("joined", allusers);
    });

    socket.on("offer", ({ from, to, offer }) => {
        console.log({ from, to, offer });
        io.to(allusers[to].id).emit("offer", { from, to, offer });
    });

    socket.on("answer", ({ from, to, answer }) => {
        io.to(allusers[from].id).emit("answer", { from, to, answer });
    });

    socket.on("end-call", ({ from, to }) => {
        io.to(allusers[to].id).emit("end-call", { from, to });
    });

    socket.on("call-ended", caller => {
        const [from, to] = caller;
        io.to(allusers[from].id).emit("call-ended", caller);
        io.to(allusers[to].id).emit("call-ended", caller);
    })

    socket.on("icecandidate", candidate => {
        console.log({ candidate });
        //broadcast to other peers
        socket.broadcast.emit("icecandidate", candidate);
    });

    socket.on("private-message", ({ from, to, message }) => {
        console.log("PRIVATE MESSAGE SERVER:", from, "->", to, message);

        const targetUser = allusers[to];

        if (!targetUser) {
            console.log("TARGET USER NOT FOUND:", to);
            return;
        }

        io.to(targetUser.id).emit("private-message", {
            from,
            message
        });
    });

})

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log("Server running on port", PORT);
});