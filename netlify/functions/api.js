import serverless from "serverless-http";
import chalk from "chalk";
import { app, ConnectDB } from "../../app.js";

let isDbConnected = false;
let dbConnectionPromise = null;

// ----------------------
// ✅ DB Connection Helper
// ----------------------
const ensureDbConnection = async () => {
  if (!isDbConnected && !dbConnectionPromise) {
    dbConnectionPromise = ConnectDB()
      .then(() => {
        isDbConnected = true;
        console.log(chalk.greenBright("✅ MongoDB Connected (Lambda)"));
      })
      .catch((error) => {
        console.error(
          chalk.red("❌ MongoDB Connection Failed:"),
          error.message
        );
        throw error;
      })
      .finally(() => {
        dbConnectionPromise = null;
      });
  }

  if (dbConnectionPromise) await dbConnectionPromise;
  if (!isDbConnected) throw new Error("Database connection failed");
};

// ----------------------
// ✅ Serverless Wrapper
// ----------------------
const serverlessHandler = serverless(app, {
  binary: ["image/*", "application/pdf", "application/octet-stream"],
  request: (req, event) => {
    const contentType =
      event.headers["content-type"] || event.headers["Content-Type"];

    console.log(chalk.cyan("\n🔍 Incoming Request:"));
    console.log("→ Method:", chalk.yellow(event.httpMethod));
    console.log("→ Path:", chalk.yellow(event.path));
    console.log("→ Content-Type:", chalk.gray(contentType));
    console.log("→ isBase64Encoded:", event.isBase64Encoded);

    if (event.isBase64Encoded && event.body) {
      try {
        event.body = Buffer.from(event.body, "base64").toString("utf-8");
        event.isBase64Encoded = false;
        console.log(chalk.green("✅ Body decoded successfully."));
      } catch (err) {
        console.error(chalk.red("❌ Base64 Decoding Error:"), err.message);
      }
    }

    return req;
  },
});

// ----------------------
// ✅ Lambda Handler
// ----------------------
export const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    console.log(chalk.magentaBright("\n📥 [Event Received]"));
    console.log("→ Method:", chalk.yellow(event.httpMethod));
    console.log("→ Path:", chalk.yellow(event.path));
    console.log("→ Time:", chalk.gray(new Date().toISOString()));

    await ensureDbConnection();

    const response = await serverlessHandler(event, context);

    console.log(chalk.greenBright("\n📤 [Response Sent]"));
    console.log("→ Status Code:", chalk.bold(response.statusCode));
    console.log("→ Time:", chalk.gray(new Date().toISOString()));

    return response;
  } catch (error) {
    console.error(chalk.bgRed.white.bold("\n🔥 [UNHANDLED ERROR]"));
    console.error(chalk.red("→ Message:"), error.message);
    console.error(chalk.gray("→ Stack:\n") + error.stack);
    console.error(chalk.gray("→ Time:"), new Date().toISOString());

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      },
      body: JSON.stringify({
        error: "Internal Server Error",
        message: error.message,
        ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
      }),
    };
  }
};
