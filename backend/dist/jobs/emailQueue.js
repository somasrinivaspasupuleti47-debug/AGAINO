"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailQueue = void 0;
exports.enqueueOtpEmail = enqueueOtpEmail;
exports.enqueuePasswordResetEmail = enqueuePasswordResetEmail;
exports.enqueueAdminEmail = enqueueAdminEmail;
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
exports.emailQueue = new bullmq_1.Queue('email', {
    connection: (0, redis_1.getRedisClient)(),
});
async function enqueueOtpEmail(to, otp) {
    await exports.emailQueue.add('send-otp', { to, otp });
}
async function enqueuePasswordResetEmail(to, resetUrl) {
    await exports.emailQueue.add('send-password-reset', { to, resetUrl });
}
async function enqueueAdminEmail(jobName, data) {
    await exports.emailQueue.add(jobName, data);
}
//# sourceMappingURL=emailQueue.js.map