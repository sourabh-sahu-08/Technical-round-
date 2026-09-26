import "./config"; // validates env vars and exits early if invalid
import express from "express";
import { config } from "./config";
import sendTemplateRouter from "./routes/sendTemplate";
import webhookRouter from "./routes/webhook";

const app = express();
app.use(express.json());

app.use("/send-template", sendTemplateRouter);
app.use("/webhooks", webhookRouter);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

export default app;
