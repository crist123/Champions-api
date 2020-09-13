import { Server } from "./server";
import { Common } from "./helper/common";

import * as dotenv from "dotenv";
dotenv.config({ path: `environments/${process.env.ENV || 'local'}/.env` });

const server = new Server();

server.listen(port => {
    let common = new Common();
    common.showLogMessage(`Servidor escuchando en http://localhost:${port}`);
});