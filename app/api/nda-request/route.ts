import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface NDAPayload {
  dealName: string;
  name: string;
  email: string;
}

export async function POST(req: Request) {
  const body: NDAPayload = await req.json();
  const { dealName, name, email } = body;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #0f172a;">
      <div style="background: #0D1421; color: #e2e8f0; padding: 24px 32px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 600;">NDA Request</h1>
        <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Received via nth Venture Investor Portal</p>
      </div>
      <div style="background: #f8fafc; padding: 24px 32px; border: 1px solid #e2e8f0; border-top: none;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #64748b; width: 160px;">Deal</td><td style="padding: 8px 0; font-weight: 600;">${dealName}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Name</td><td style="padding: 8px 0;">${name}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Email</td><td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #3b82f6;">${email}</a></td></tr>
        </table>
        <p style="margin-top: 16px; font-size: 13px; color: #64748b;">
          Submitter confirmed accredited investor status and agreement to maintain confidentiality under NDA.
          Please send the NDA and offering documents within one business day.
        </p>
      </div>
    </div>
  `;

  try {
    await resend.emails.send({
      from: "nth Venture Portal <portal@nthventure.com>",
      to: ["invest@nthventure.com"],
      reply_to: email,
      subject: `[NDA Request] ${dealName} — ${name}`,
      html,
    });

    await resend.emails.send({
      from: "nth Venture <portal@nthventure.com>",
      to: [email],
      subject: `NDA request for "${dealName}" received`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; color: #0f172a; padding: 32px;">
          <h2 style="margin: 0 0 8px; font-size: 18px;">Your NDA request has been received.</h2>
          <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
            We received your request for deal details and NDA for <strong>${dealName}</strong>.
            The nth Venture team will send the NDA and offering summary within one business day.
          </p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
            Questions? Reply to this email or contact <a href="mailto:invest@nthventure.com" style="color: #3b82f6;">invest@nthventure.com</a>.
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
