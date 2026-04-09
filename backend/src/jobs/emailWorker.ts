import { Worker } from 'bullmq';
import nodemailer from 'nodemailer';
import { getRedisClient } from '../config/redis';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export function startEmailWorker(): void {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    console.warn('⚠️  SMTP not configured — emails will not be sent');
    return;
  }

  const worker = new Worker(
    'email',
    async (job) => {
      const { to, otp, resetUrl, listingId, title, sellerId } = job.data;

      if (job.name === 'send-otp') {
        await transporter.sendMail({
          from: `"AGAINO" <${env.SMTP_USER}>`,
          to,
          subject: 'Your AGAINO verification code',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border-radius:12px;border:1px solid #eee">
              <h2 style="color:#f97316">Verify your email</h2>
              <p>Use the code below to complete your registration:</p>
              <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#f97316;padding:16px 0">${otp}</div>
              <p style="color:#888;font-size:13px">This code expires in 10 minutes. Do not share it with anyone.</p>
            </div>
          `,
        });
        console.log(`✅ OTP email sent to ${to}`);
      }

      if (job.name === 'send-password-reset') {
        await transporter.sendMail({
          from: `"AGAINO" <${env.SMTP_USER}>`,
          to,
          subject: 'Reset your AGAINO password',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border-radius:12px;border:1px solid #eee">
              <h2 style="color:#f97316">Reset your password</h2>
              <p>Click the button below to reset your password. This link expires in 30 minutes.</p>
              <a href="${resetUrl}" style="display:inline-block;background:#f97316;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">Reset Password</a>
              <p style="color:#888;font-size:13px">If you didn't request this, ignore this email.</p>
            </div>
          `,
        });
        console.log(`✅ Password reset email sent to ${to}`);
      }

      if (job.name === 'admin.listing.published') {
        await transporter.sendMail({
          from: `"AGAINO" <${env.SMTP_USER}>`,
          to: env.ADMIN_EMAIL,
          subject: `🛍️ New Listing Posted: ${title}`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border-radius:12px;border:1px solid #eee">
              <h2 style="color:#f97316">New Listing on AGAINO</h2>
              <table style="width:100%;border-collapse:collapse;margin-top:16px">
                <tr><td style="padding:8px;color:#888;width:120px">Listing ID</td><td style="padding:8px;font-weight:bold">${listingId}</td></tr>
                <tr style="background:#fafafa"><td style="padding:8px;color:#888">Title</td><td style="padding:8px;font-weight:bold">${title}</td></tr>
                <tr><td style="padding:8px;color:#888">Seller ID</td><td style="padding:8px">${sellerId}</td></tr>
              </table>
              <a href="http://localhost:3000/listings/${listingId}" style="display:inline-block;background:#f97316;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">View Listing</a>
            </div>
          `,
        });
        console.log(`✅ Admin notified of new listing: ${title}`);
      }
    },
    { connection: getRedisClient() },
  );

  worker.on('failed', (job, err) => {
    console.error(`❌ Email job failed [${job?.name}]:`, err.message);
  });

  console.log('✅ Email worker started');
}
