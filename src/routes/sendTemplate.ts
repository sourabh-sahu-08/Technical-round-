import { Router, Request, Response } from "express";
import { sendTemplateMessage } from "../provider/mockProvider";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { to, templateName, parameters } = req.body;

  if (
    typeof to !== "string" || to.trim() === "" ||
    typeof templateName !== "string" || templateName.trim() === "" ||
    !Array.isArray(parameters) ||
    !parameters.every((p) => typeof p === "string")
  ) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }

  try {
    const result = sendTemplateMessage(to, templateName, parameters);
    res.status(202).json(result);
  } catch {
    res.status(502).json({ error: "provider_error" });
  }
});

export default router;
