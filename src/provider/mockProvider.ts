import crypto from "crypto";

export type ProviderResult = {
  messageId: string;
  status: "accepted";
};

export function sendTemplateMessage(
  to: string,
  templateName: string,
  parameters: string[]
): ProviderResult {
  if (templateName === "force_failure") {
    throw new Error("Provider failure: forced error for template 'force_failure'");
  }

  const messageId = `msg_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

  return {
    messageId,
    status: "accepted",
  };
}
