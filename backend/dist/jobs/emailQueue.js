"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueOtpEmail = enqueueOtpEmail;
exports.enqueuePasswordResetEmail = enqueuePasswordResetEmail;
exports.enqueueAdminEmail = enqueueAdminEmail;
const emailService_1 = require("../services/emailService");
async function enqueueOtpEmail(to, otp) {
    // Direct async call (removes BullMQ/Redis dependency)
    emailService_1.emailService.sendOtpEmail(to, otp);
}
async function enqueuePasswordResetEmail(to, resetUrl) {
    emailService_1.emailService.sendPasswordResetEmail(to, resetUrl);
}
async function enqueueAdminEmail(jobName, data) {
    if (jobName === 'admin.listing.published') {
        emailService_1.emailService.notifyAdminListingPublished(data.listingId, data.title, data.sellerId);
    }
    else if (jobName === 'admin.listing.sold') {
        emailService_1.emailService.notifyAdminListingSold(data.listingId, data.title, data.sellerId);
    }
}
//# sourceMappingURL=emailQueue.js.map