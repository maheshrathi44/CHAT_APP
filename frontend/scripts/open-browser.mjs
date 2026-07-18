import { exec } from "node:child_process";
import net from "node:net";

const PORT = process.env.PORT || 3000;
const URL = `http://localhost:${PORT}`;

const openCommand =
  process.platform === "darwin"
    ? "open"
    : process.platform === "win32"
    ? "start"
    : "xdg-open";

function waitForServer(retriesLeft = 60) {
  const socket = net.createConnection(PORT, "localhost");

  socket.once("connect", () => {
    socket.end();
    exec(`${openCommand} ${URL}`);
  });

  socket.once("error", () => {
    socket.destroy();
    if (retriesLeft > 0) {
      setTimeout(() => waitForServer(retriesLeft - 1), 500);
    }
  });
}

waitForServer();
