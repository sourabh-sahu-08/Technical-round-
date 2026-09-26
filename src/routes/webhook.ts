import { Router, Request, Response } from "express";
import { config } from "../config";

const router = Router();

const VALID_STATUSES = new Set(["sent", "delivered", "read", "failed"]);
const processedEvents = new Set<string>();

router.post("/message", (req: Request, res: Response) => {
  const secret = req.headers["x-webhook-secret"];

  if (!secret || secret !== config.webhookSecret) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const { eventId, messageId, status } = req.body;

  if (
    typeof eventId !== "string" || eventId.trim() === "" ||
    typeof messageId !== "string" || messageId.trim() === "" ||
    typeof status !== "string" || !VALID_STATUSES.has(status)
  ) {
    res.status(400).json({ error: "invalid_webhook" });
    return;
  }

  if (processedEvents.has(eventId)) {
    res.status(200).json({ status: "duplicate", processed: false });
    return;
  }

  processedEvents.add(eventId);
  res.status(200).json({ status: "processed", processed: true });
});

export default router;
