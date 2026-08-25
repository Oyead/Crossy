import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const CODE_EMAIL_FROM = `Crossy <${process.env.GMAIL_USER}>`;

async function sendEmail(
  to: string[],
  subject: string,
  html: string
): Promise<{ delivered: boolean }> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error("[mailer] GMAIL_USER or GMAIL_APP_PASSWORD not set");
    return { delivered: false };
  }

  console.log(`[mailer] Sending email to=${to} from="${CODE_EMAIL_FROM}" subject="${subject}"`);

  try {
    const info = await transporter.sendMail({
      from: CODE_EMAIL_FROM,
      to: to.join(", "),
      subject,
      html,
    });
    console.log("[mailer] Email sent:", info.messageId);
    return { delivered: true };
  } catch (error) {
    console.error("[mailer] Gmail send failed:", error);
    return { delivered: false };
  }
}

export async function sendVerificationCode(
  email: string,
  code: string
): Promise<{ delivered: boolean }> {
  return sendEmail(
    [email],
    "Your Crossy verification code",
    `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:2px solid #1a1a15;border-radius:16px">
        <h1 style="font-size:20px;color:#1a1a15">Verify your email</h1>
        <p style="color:#555;font-size:14px">Use this code to finish creating your Crossy account:</p>
        <p style="font-size:32px;font-weight:800;letter-spacing:8px;color:#4F46E5;margin:16px 0">${code}</p>
        <p style="color:#999;font-size:12px">This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>
      </div>
    `
  );
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string
): Promise<{ delivered: boolean }> {
  return sendEmail(
    [email],
    "Reset your Crossy password",
    `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:2px solid #1a1a15;border-radius:16px">
        <h1 style="font-size:20px;color:#1a1a15">Reset your password</h1>
        <p style="color:#555;font-size:14px">We received a request to reset the password for your Crossy account. Click the button below to choose a new one:</p>
        <p style="margin:20px 0">
          <a href="${resetUrl}" style="display:inline-block;background:#4F46E5;color:#ffffff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:12px;text-decoration:none;border:2px solid #1a1a15">Reset password</a>
        </p>
        <p style="color:#999;font-size:12px">This link expires in 15 minutes. If you didn't request a password reset, you can safely ignore this email - your password won't change.</p>
      </div>
    `
  );
}
