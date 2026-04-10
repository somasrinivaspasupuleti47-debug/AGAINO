import { emailService } from '../services/emailService';

export async function enqueueOtpEmail(to: string, otp: string): Promise<void> {
  // Direct async call (removes BullMQ/Redis dependency)
  emailService.sendOtpEmail(to, otp);
}

export async function enqueuePasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  emailService.sendPasswordResetEmail(to, resetUrl);
}

export async function enqueueAdminEmail(jobName: string, data: any): Promise<void> {
  if (jobName === 'admin.listing.published') {
    emailService.notifyAdminListingPublished(data.listingId, data.title, data.sellerId);
  } else if (jobName === 'admin.listing.sold') {
    emailService.notifyAdminListingSold(data.listingId, data.title, data.sellerId);
  }
}
