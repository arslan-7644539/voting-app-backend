import mongoose from "mongoose";
import "dotenv/config"; // ensure .env variables are available

export const ConnectDB = async () => {
  try {
    const res = await mongoose?.connect(
      `${process.env.MONGODB_URI}/voting_apps`
    );
    console.log(`MongoDB Connected !! DB HOST:${res?.connection?.host}`);
  } catch (error) {
    console.log("🚀 ~ ConnectDB ~ error:", error);
    process.exit(1);
  }
};
