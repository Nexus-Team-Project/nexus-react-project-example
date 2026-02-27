import logger from "../logger";
import { AppError } from "../errors/AppError";

const SENDPULSE_TOKEN_URL = "https://api.sendpulse.com/oauth/access_token";
const SENDPULSE_SEND_EMAIL_URL = "https://api.sendpulse.com/smtp/emails";

async function getAccessToken(): Promise<string> {
  const clientId = process.env.SENDPULSE_CLIENT_ID;
  const clientSecret = process.env.SENDPULSE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    logger.error("SendPulse credentials not configured");
    throw new AppError(
      500,
      "SENDPULSE_NOT_CONFIGURED",
      "SendPulse credentials are missing",
    );
  }

  const response = await fetch(SENDPULSE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    logger.error("Failed to obtain SendPulse access token", {
      status: response.status,
    });
    throw new AppError(
      502,
      "SENDPULSE_AUTH_FAILED",
      "Failed to authenticate with SendPulse",
    );
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

export type SendEmailOptions = {
  templateId: number;
  subject: string;
  fromName: string;
  fromEmail: string;
  toEmail: string;
  variables?: Record<string, string | number>;
};

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const { templateId, subject, fromName, fromEmail, toEmail, variables } =
    options;

  logger.info("Sending email via SendPulse", { toEmail, templateId, subject });

  const accessToken = await getAccessToken();

  const payload = {
    email: {
      subject,
      template: {
        id: templateId,
        variables: variables ?? {},
      },
      from: { name: fromName, email: fromEmail },
      to: [{ email: toEmail }],
    },
  };

  const response = await fetch(SENDPULSE_SEND_EMAIL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const responseData = (await response.json()) as { result?: boolean };

  if (!response.ok || responseData.result === false) {
    logger.error("SendPulse failed to send email", {
      toEmail,
      status: response.status,
      responseData,
    });
    throw new AppError(502, "SENDPULSE_SEND_FAILED", "Failed to send email");
  }

  logger.info("Email sent successfully", { toEmail, templateId });
}
