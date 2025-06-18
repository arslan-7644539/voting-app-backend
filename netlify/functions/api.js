import serverless from "serverless-http";
import { app, ConnectDB } from "../../app.js";

ConnectDB()
  .then(() => {
    console.log("DB Connected in Lambda");
  })
  .catch((err) => {
    console.error("DB Connection Error:", err);
  });

export const handler = serverless(app);
