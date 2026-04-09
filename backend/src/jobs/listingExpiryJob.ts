import { Queue, Worker } from 'bullmq';
import { getRedisClient } from '../config/redis';
import { Listing } from '../modules/listings/models/Listing';
import { invalidateListingCache } from '../modules/listings/listingService';

const QUEUE_NAME = 'listing-expiry';

let expiryQueue: Queue | null = null;
let expiryWorker: Worker | null = null;

async function processExpiredListings(): Promise<void> {
  const now = new Date();

  const expired = await Listing.find({
    status: 'published',
    expiresAt: { $lt: now },
  });

  for (const listing of expired) {
    listing.status = 'archived';
    await listing.save();
    await invalidateListingCache(listing._id.toString());
    console.log(`[listingExpiryJob] Archived expired listing: ${listing._id}`);
  }

  if (expired.length > 0) {
    console.log(`[listingExpiryJob] Archived ${expired.length} expired listing(s)`);
  }
}

export function startListingExpiryJob(): void {
  const connection = getRedisClient();

  expiryQueue = new Queue(QUEUE_NAME, { connection });

  // Schedule repeatable job every hour
  expiryQueue
    .add(
      'expire-listings',
      {},
      {
        repeat: { every: 60 * 60 * 1000 }, // every hour in ms
        jobId: 'listing-expiry-repeatable',
      },
    )
    .catch((err) => console.error('[listingExpiryJob] Failed to schedule job:', err));

  expiryWorker = new Worker(
    QUEUE_NAME,
    async () => {
      await processExpiredListings();
    },
    { connection },
  );

  expiryWorker.on('completed', () => {
    console.log('[listingExpiryJob] Expiry check completed');
  });

  expiryWorker.on('failed', (_job, err) => {
    console.error('[listingExpiryJob] Expiry check failed:', err);
  });

  console.log('✅ Listing expiry job scheduled (every hour)');
}

export async function stopListingExpiryJob(): Promise<void> {
  if (expiryWorker) {
    await expiryWorker.close();
    expiryWorker = null;
  }
  if (expiryQueue) {
    await expiryQueue.close();
    expiryQueue = null;
  }
}
