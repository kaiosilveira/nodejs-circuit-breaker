import http from "http";
import Express from "express";

const PORT = 3000;
const app = Express();

http
  .createServer(app)
  .listen(PORT, () => console.log(`Server listening at ${PORT} 🚀`));
