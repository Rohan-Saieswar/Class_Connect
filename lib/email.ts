import { prisma } from "./prisma";
import { getWorkspaceBranding, WorkspaceBrandingInput } from "./branding";

export interface SendEmailOptions {
  workspace: WorkspaceBrandingInput;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  title: string;
  bodyContent: string;
  actionUrl?: string;
  actionText?: string;
}

/**
 * Builds a dynamic, workspace-branded HTML email template
 */
export function buildWorkspaceEmailHtml(options: SendEmailOptions): string {
  const branding = getWorkspaceBranding(options.workspace);
  const accent = branding.accentColor || "#6366f1";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${branding.name} Notification</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: ${accent}; padding: 28px 24px; color: #ffffff; text-align: left; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
    .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 32px 24px; }
    .content h2 { font-size: 18px; margin-top: 0; color: #0f172a; }
    .content p { font-size: 15px; line-height: 1.6; color: #334155; }
    .btn { display: inline-block; background: ${accent}; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 20px; }
    .footer { padding: 20px 24px; background: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${branding.name}</h1>
      <p>${branding.displayName} • ${branding.subheading}</p>
    </div>
    <div class="content">
      <h2>${options.title}</h2>
      <p>${options.bodyContent}</p>
      ${
        options.actionUrl
          ? `<a href="${options.actionUrl}" class="btn">${options.actionText || "View on " + branding.name}</a>`
          : ""
      }
    </div>
    <div class="footer">
      <p>This automated notification was sent to <strong>${options.recipientEmail}</strong> for the <strong>${branding.name}</strong> workspace.</p>
      <p>Section-Connect • SRM University–AP</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Enqueues and records an outbound email notification in the database
 */
export async function sendWorkspaceEmail(
  workspaceId: string,
  workspaceData: WorkspaceBrandingInput,
  options: Omit<SendEmailOptions, "workspace">
) {
  const htmlBody = buildWorkspaceEmailHtml({
    ...options,
    workspace: workspaceData,
  });

  const branding = getWorkspaceBranding(workspaceData);
  const formattedSubject = `[${branding.name}] ${options.subject}`;

  try {
    const emailRecord = await prisma.emailNotification.create({
      data: {
        workspaceId,
        recipientEmail: options.recipientEmail,
        subject: formattedSubject,
        htmlBody,
        status: "SENT",
        sentAt: new Date(),
      },
    });

    // In a production server with active SMTP credentials, nodemailer would transport here.
    // For local dev, we securely persist the full email history in the database.
    return emailRecord;
  } catch (error) {
    console.error("Failed to queue email notification:", error);
    return null;
  }
}
