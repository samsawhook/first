import { NextResponse } from "next/server";
import { Resend } from "resend";
import type { IOIPayload } from "@/lib/types";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const body: IOIPayload = await req.json();

  const { company, side, amount, impliedValuation, name, email, phone, notes } = body;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #0f172a;">
      <div style="background: #0D1421; color: #e2e8f0; padding: 24px 32px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 600;">Indication of Interest — ${side === "buy" ? "BUY" : "SELL"}</h1>
        <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Non-binding · Received via nth Venture Investor Portal</p>
      </div>
      <div style="background: #f8fafc; padding: 24px 32px; border: 1px solid #e2e8f0; border-top: none;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #64748b; width: 160px;">Company</td><td style="padding: 8px 0; font-weight: 600;">${company}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Side</td><td style="padding: 8px 0; font-weight: 600; color: ${side === "buy" ? "#059669" : "#e11d48"};">${side.toUpperCase()}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Target Amount</td><td style="padding: 8px 0;">$${amount}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Implied Valuation</td><td style="padding: 8px 0;">${impliedValuation ? `$${impliedValuation}` : "Open"}</td></tr>
        </table>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #64748b; width: 160px;">Name</td><td style="padding: 8px 0;">${name}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Email</td><td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #3b82f6;">${email}</a></td></tr>
          ${phone ? `<tr><td style="padding: 8px 0; color: #64748b;">Phone</td><td style="padding: 8px 0;">${phone}</td></tr>` : ""}
          ${notes ? `<tr><td style="padding: 8px 0; color: #64748b; vertical-align: top;">Notes</td><td style="padding: 8px 0;">${notes}</td></tr>` : ""}
        </table>
        <div style="margin-top: 20px; padding: 12px 16px; background: #fefce8; border: 1px solid #fef08a; border-radius: 6px; font-size: 12px; color: #854d0e;">
          This is a non-binding indication only. nth Venture LLC is not a registered broker-dealer. No transaction will occur through this platform. Submitter confirmed accredited investor status under SEC Rule 501(a) of Regulation D.
        </div>
      </div>
    </div>
  `;

  try {
    await resend.emails.send({
      from: "nth Venture Portal <portal@nthventure.com>",
      to: ["invest@nthventure.com"],
      replyTo: email,
      subject: `[IOI] ${side === "buy" ? "Buy" : "Sell"} Indication — ${company} — ${name}`,
      html,
    });

    // Send confirmation to submitter
    await resend.emails.send({
      from: "nth Venture <portal@nthventure.com>",
      to: [email],
      subject: `Your IOI for ${company} has been received`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; color: #0f172a; padding: 32px;">
          <h2 style="margin: 0 0 8px; font-size: 18px;">We received your indication of interest.</h2>
          <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
            Your non-binding ${side.toUpperCase()} IOI for <strong>${company}</strong> ($${amount}) has been logged.
            The nth Venture team will follow up within 2 business days if there is a matching counterparty.
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
