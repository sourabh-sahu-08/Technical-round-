import dotenv from "dotenv";
dotenv.config();

const webhookSecret = process.env.WEBHOOK_SECRET;

if (!webhookSecret) {
  console.error("Configuration error: WEBHOOK_SECRET is required but not set.");
  process.exit(1);
}

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  webhookSecret,
  messagingApiToken: process.env.MESSAGING_API_TOKEN || "",
};
