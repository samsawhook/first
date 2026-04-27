import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface ContactPayload {
  companyName: string;
  companyContact: string;  // company's contact email (CC'd)
  senderName: string;
  senderEmail: string;
  message: string;
}

export async function POST(req: Request) {
  const body: ContactPayload = await req.json();
  const { companyName, companyContact, senderName, senderEmail, message } = body;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #0f172a;">
      <div style="background: #0D1421; color: #e2e8f0; padding: 24px 32px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 600;">Investor Message — ${companyName}</h1>
        <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Received via nth Venture Investor Portal</p>
      </div>
      <div style="background: #f8fafc; padding: 24px 32px; border: 1px solid #e2e8f0; border-top: none;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #64748b; width: 160px;">Company</td><td style="padding: 8px 0; font-weight: 600;">${companyName}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">From</td><td style="padding: 8px 0;">${senderName}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Email</td><td style="padding: 8px 0;"><a href="mailto:${senderEmail}" style="color: #3b82f6;">${senderEmail}</a></td></tr>
        </table>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
        <p style="font-size: 14px; line-height: 1.7; margin: 0; white-space: pre-wrap;">${message}</p>
      </div>
    </div>
  `;

  try {
    // Notify fund team + CC the company contact
    await resend.emails.send({
      from: "nth Venture Portal <portal@nthventure.com>",
      to: ["invest@nthventure.com"],
      cc: [companyContact],
      reply_to: senderEmail,
      subject: `[Portfolio] Message for ${companyName} from ${senderName}`,
      html,
    });

    // Confirm to sender
    await resend.emails.send({
      from: "nth Venture <portal@nthventure.com>",
      to: [senderEmail],
      subject: `Your message to ${companyName} has been sent`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; color: #0f172a; padding: 32px;">
          <h2 style="margin: 0 0 8px; font-size: 18px;">Message sent to ${companyName}.</h2>
          <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
            Your message has been forwarded to the ${companyName} team and the nth Venture fund managers.
            Expect a response within a few business days.
          </p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
            Questions? Contact <a href="mailto:invest@nthventure.com" style="color: #3b82f6;">invest@nthventure.com</a>.
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
