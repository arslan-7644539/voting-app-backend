// netlify/functions/api.js
import serverless from "serverless-http";
import { app, ConnectDB } from "../../app.js";

await ConnectDB(); // DB connect before function ready

export const handler = serverless(app);
