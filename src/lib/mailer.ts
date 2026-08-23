const CODE_EMAIL_FROM = process.env.MAIL_FROM ?? "Crossy <onboarding@resend.dev>";

export async function sendVerificationCode(
  email: string,
  code: string
): Promise<{ delivered: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // No mail provider configured - log the code so the flow is testable in dev
    console.log(`[mailer] RESEND_API_KEY not set - verification code for ${email}: ${code}`);
    return { delivered: false };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: CODE_EMAIL_FROM,
      to: [email],
      subject: "Your Crossy verification code",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:2px solid #1a1a15;border-radius:16px">
          <h1 style="font-size:20px;color:#1a1a15">Verify your email</h1>
          <p style="color:#555;font-size:14px">Use this code to finish creating your Crossy account:</p>
          <p style="font-size:32px;font-weight:800;letter-spacing:8px;color:#4F46E5;margin:16px 0">${code}</p>
          <p style="color:#999;font-size:12px">This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[mailer] Resend delivery failed:", res.status, body);
    return { delivered: false };
  }

  return { delivered: true };
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string
): Promise<{ delivered: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`[mailer] RESEND_API_KEY not set - password reset link for ${email}: ${resetUrl}`);
    return { delivered: false };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: CODE_EMAIL_FROM,
      to: [email],
      subject: "Reset your Crossy password",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:2px solid #1a1a15;border-radius:16px">
          <h1 style="font-size:20px;color:#1a1a15">Reset your password</h1>
          <p style="color:#555;font-size:14px">We received a request to reset the password for your Crossy account. Click the button below to choose a new one:</p>
          <p style="margin:20px 0">
            <a href="${resetUrl}" style="display:inline-block;background:#4F46E5;color:#ffffff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:12px;text-decoration:none;border:2px solid #1a1a15">Reset password</a>
          </p>
          <p style="color:#999;font-size:12px">This link expires in 15 minutes. If you didn't request a password reset, you can safely ignore this email - your password won't change.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[mailer] Resend delivery failed:", res.status, body);
    return { delivered: false };
  }

  return { delivered: true };
}
