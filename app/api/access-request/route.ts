import { NextResponse } from "next/server";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

interface AccessPayload {
  name: string;
  email: string;
  context?: string;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(req: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const body: AccessPayload = await req.json();
  const name    = (body.name    ?? "").trim().slice(0, 200);
  const email   = (body.email   ?? "").trim().slice(0, 200);
  const context = (body.context ?? "").trim().slice(0, 2000);

  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Name and a valid email are required" }, { status: 400 });
  }

  const ua = req.headers.get("user-agent") ?? "—";
  const referer = req.headers.get("referer") ?? "—";
  const submittedAt = new Date().toISOString();

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #0f172a;">
      <div style="background: #0D1421; color: #e2e8f0; padding: 24px 32px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 600;">Portal Access Request</h1>
        <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Received via nth Venture Investor Portal</p>
      </div>
      <div style="background: #f8fafc; padding: 24px 32px; border: 1px solid #e2e8f0; border-top: none;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Name</td><td style="padding: 8px 0; font-weight: 600;">${escapeHtml(name)}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Email</td><td style="padding: 8px 0;"><a href="mailto:${escapeHtml(email)}" style="color: #3b82f6;">${escapeHtml(email)}</a></td></tr>
          ${context ? `<tr><td style="padding: 8px 0; color: #64748b; vertical-align: top;">Context</td><td style="padding: 8px 0; white-space: pre-wrap;">${escapeHtml(context)}</td></tr>` : ""}
          <tr><td style="padding: 8px 0; color: #64748b;">Submitted</td><td style="padding: 8px 0; color: #64748b; font-size: 12px;">${submittedAt}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Referer</td><td style="padding: 8px 0; color: #94a3b8; font-size: 12px;">${escapeHtml(referer)}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">User agent</td><td style="padding: 8px 0; color: #94a3b8; font-size: 12px;">${escapeHtml(ua)}</td></tr>
        </table>
        <div style="margin-top: 20px; padding: 14px 16px; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; font-size: 13px; color: #78350f;">
          <strong>To approve:</strong> reply to this email with an invite code from the
          authorized list, or add their hashed identifier to <code>VALID_INVITE_HASHES</code>
          / <code>VALID_SSN_HASHES</code> in <code>components/AccessGate.tsx</code>.
        </div>
      </div>
    </div>
  `;

  try {
    await resend.emails.send({
      from: "nth Venture Portal <portal@nthventure.com>",
      to: ["invest@nthventure.com"],
      reply_to: email,
      subject: `[Access Request] ${name} <${email}>`,
      html,
    });

    await resend.emails.send({
      from: "nth Venture <portal@nthventure.com>",
      to: [email],
      subject: "Portal access request received",
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; color: #0f172a; padding: 32px;">
          <h2 style="margin: 0 0 8px; font-size: 18px;">Thanks — we received your request.</h2>
          <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
            The nth Venture team reviews access requests manually. If approved, you'll
            receive an invite code by reply email, typically within one business day.
          </p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
            Questions? Reply to this email or contact
            <a href="mailto:invest@nthventure.com" style="color: #3b82f6;">invest@nthventure.com</a>.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Resend error:", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
