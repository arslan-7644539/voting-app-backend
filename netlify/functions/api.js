import serverless from "serverless-http";
import { app, ConnectDB } from "../../app.js";

let isDbConnected = false;
let dbConnectionPromise = null;

// Ensure MongoDB connection (with promise caching)
const ensureDbConnection = async () => {
  if (!isDbConnected && !dbConnectionPromise) {
    dbConnectionPromise = ConnectDB()
      .then(() => {
        isDbConnected = true;
        console.log("✅ Database connected in Lambda.");
      })
      .catch((error) => {
        console.error("❌ Database connection error:", error);
        throw error;
      })
      .finally(() => {
        dbConnectionPromise = null; // Clear for next retry if needed
      });
  }

  if (dbConnectionPromise) await dbConnectionPromise;

  if (!isDbConnected) throw new Error("Database connection failed.");
};

// Create serverless Express handler
const serverlessHandler = serverless(app, {
  binary: ["image/*", "application/pdf", "application/octet-stream"],
  request: (req, event) => {
    console.log("🔍 Incoming Event Details:");
    console.log("Body Type:", typeof event.body);
    console.log("isBase64Encoded:", event.isBase64Encoded);
    console.log(
      "Content-Type:",
      event.headers["content-type"] || event.headers["Content-Type"]
    );

    // Decode base64 bodies if necessary
    if (event.isBase64Encoded && event.body) {
      try {
        const decoded = Buffer.from(event.body, "base64").toString("utf-8");
        event.body = decoded;
        event.isBase64Encoded = false;
        console.log("✅ Body successfully decoded.");
      } catch (err) {
        console.error("❌ Base64 Decode Error:", err);
      }
    }

    return req;
  },
});

// Lambda Handler
export const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false; // Don't wait for Node event loop

  try {
    console.log("📥 Event:", JSON.stringify(event, null, 2));
    console.log("Method:", event.httpMethod, "Path:", event.path);

    await ensureDbConnection(); // Connect to DB before handling

    const result = await serverlessHandler(event, context);

    console.log("📤 Response Status:", result.statusCode);
    return result;
  } catch (error) {
    console.error("❌ Lambda Error:", error);

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
