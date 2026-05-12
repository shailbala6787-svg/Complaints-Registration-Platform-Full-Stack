import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Use explicit SMTP settings instead of 'service: gmail' shorthand
// This avoids DNS lookup hangs and connection timeouts
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // STARTTLS on port 587
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  connectionTimeout: 10000,  // 10 seconds to connect
  greetingTimeout: 10000,    // 10 seconds for SMTP greeting
  socketTimeout: 30000,      // 30 seconds for sending
});

export const sendOTPEmail = async (email: string, otp: string) => {
  const mailOptions = {
    from: `"ComplainAI" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Your Registration OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 400px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4f46e5;">ComplainAI - OTP Verification</h2>
        <p>Your one-time password for registration is:</p>
        <h1 style="letter-spacing: 8px; color: #4f46e5; text-align: center;">${otp}</h1>
        <p style="color: #666; font-size: 13px;">This OTP expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP Email sent successfully to ${email}`);
  } catch (error) {
    console.error('Nodemailer Error:', error);
    throw error; // Re-throw so the background .catch can see it
  }
};
