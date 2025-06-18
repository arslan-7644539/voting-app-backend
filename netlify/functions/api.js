import serverless from "serverless-http";
import { app, ConnectDB } from "../../app.js";

// Global variable to track connection state
let isDbConnected = false;

// Function to ensure database connection
const ensureDbConnection = async () => {
  if (!isDbConnected) {
    try {
      await ConnectDB();
      isDbConnected = true;
      console.log("DB Connected in Lambda");
    } catch (error) {
      console.error("DB Connection Error:", error);
      throw error; // Re-throw to handle in handler
    }
  }
};

// Create serverless handler
const serverlessHandler = serverless(app);

// Lambda handler with database connection management
export const handler = async (event, context) => {
  // Lambda context reuse optimization
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    // Ensure database is connected before processing request
    await ensureDbConnection();

    // Process the request
    return await serverlessHandler(event, context);
  } catch (error) {
    console.error("Lambda Handler Error:", error);

    // Return error response
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // Add CORS if needed
      },
      body: JSON.stringify({
        error: "Internal Server Error",
        message: error.message,
      }),
    };
  }
};
