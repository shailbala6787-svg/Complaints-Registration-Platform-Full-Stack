import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOTPEmail = async (email: string, otp: string) => {
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'info@shailbala-uppolice.shop';

  try {
    const { data, error } = await resend.emails.send({
      from: `ComplainAI <${fromEmail}>`,
      to: [email],
      subject: 'Your Registration OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 400px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #4f46e5;">ComplainAI - OTP Verification</h2>
          <p>Your one-time password for registration is:</p>
          <h1 style="letter-spacing: 8px; color: #4f46e5; text-align: center;">${otp}</h1>
          <p style="color: #666; font-size: 13px;">This OTP expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend API Error details:', error);
      throw new Error(error.message);
    }

    console.log(`OTP Email sent successfully to ${email} via Resend. ID: ${data?.id}`);
  } catch (error) {
    console.error('Resend Error:', error);
    throw error; // Re-throw so the background .catch can see it
  }
};
