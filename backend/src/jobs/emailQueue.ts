import { Queue } from 'bullmq';
import { getRedisClient } from '../config/redis';

export const emailQueue = new Queue('email', {
  connection: getRedisClient(),
});

export async function enqueueOtpEmail(to: string, otp: string): Promise<void> {
  await emailQueue.add('send-otp', { to, otp });
}

export async function enqueuePasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await emailQueue.add('send-password-reset', { to, resetUrl });
}

export async function enqueueAdminEmail(jobName: string, data: object): Promise<void> {
  await emailQueue.add(jobName, data);
}
