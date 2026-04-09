import { Queue } from 'bullmq';
export declare const emailQueue: Queue<any, any, string, any, any, string>;
export declare function enqueueOtpEmail(to: string, otp: string): Promise<void>;
export declare function enqueuePasswordResetEmail(to: string, resetUrl: string): Promise<void>;
export declare function enqueueAdminEmail(jobName: string, data: object): Promise<void>;
//# sourceMappingURL=emailQueue.d.ts.map