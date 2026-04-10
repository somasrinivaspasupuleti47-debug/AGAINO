export declare const emailService: {
    sendOtpEmail(to: string, otp: string): Promise<void>;
    sendPasswordResetEmail(to: string, resetUrl: string): Promise<void>;
    notifyAdminListingPublished(listingId: string, title: string, sellerId: string): Promise<void>;
    notifyAdminListingSold(listingId: string, title: string, sellerId: string): Promise<void>;
};
//# sourceMappingURL=emailService.d.ts.map