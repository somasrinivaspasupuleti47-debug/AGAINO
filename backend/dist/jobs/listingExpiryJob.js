"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startListingExpiryJob = startListingExpiryJob;
exports.stopListingExpiryJob = stopListingExpiryJob;
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
const Listing_1 = require("../modules/listings/models/Listing");
const listingService_1 = require("../modules/listings/listingService");
const QUEUE_NAME = 'listing-expiry';
let expiryQueue = null;
let expiryWorker = null;
async function processExpiredListings() {
    const now = new Date();
    const expired = await Listing_1.Listing.find({
        status: 'published',
        expiresAt: { $lt: now },
    });
    for (const listing of expired) {
        listing.status = 'archived';
        await listing.save();
        await (0, listingService_1.invalidateListingCache)(listing._id.toString());
        console.log(`[listingExpiryJob] Archived expired listing: ${listing._id}`);
    }
    if (expired.length > 0) {
        console.log(`[listingExpiryJob] Archived ${expired.length} expired listing(s)`);
    }
}
function startListingExpiryJob() {
    const connection = (0, redis_1.getRedisClient)();
    expiryQueue = new bullmq_1.Queue(QUEUE_NAME, { connection });
    // Schedule repeatable job every hour
    expiryQueue
        .add('expire-listings', {}, {
        repeat: { every: 60 * 60 * 1000 }, // every hour in ms
        jobId: 'listing-expiry-repeatable',
    })
        .catch((err) => console.error('[listingExpiryJob] Failed to schedule job:', err));
    expiryWorker = new bullmq_1.Worker(QUEUE_NAME, async () => {
        await processExpiredListings();
    }, { connection });
    expiryWorker.on('completed', () => {
        console.log('[listingExpiryJob] Expiry check completed');
    });
    expiryWorker.on('failed', (_job, err) => {
        console.error('[listingExpiryJob] Expiry check failed:', err);
    });
    console.log('✅ Listing expiry job scheduled (every hour)');
}
async function stopListingExpiryJob() {
    if (expiryWorker) {
        await expiryWorker.close();
        expiryWorker = null;
    }
    if (expiryQueue) {
        await expiryQueue.close();
        expiryQueue = null;
    }
}
//# sourceMappingURL=listingExpiryJob.js.map