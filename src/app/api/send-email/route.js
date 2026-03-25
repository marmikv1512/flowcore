import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  try {
    const { to, subject, text } = await req.json();

    const data = await resend.emails.send({
      from: "Flowcore <onboarding@resend.dev>",
      to,
      subject,
      text,
    });

    return Response.json({ success: true, data });
  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}