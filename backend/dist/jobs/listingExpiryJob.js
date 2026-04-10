"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startListingExpiryJob = startListingExpiryJob;
exports.stopListingExpiryJob = stopListingExpiryJob;
const supabase_1 = require("../config/supabase");
let expiryInterval = null;
async function processExpiredListings() {
    const now = new Date().toISOString();
    // Find published listings that have expired
    const { data: expired, error: fetchError } = await supabase_1.supabase
        .from('listings')
        .select('id')
        .eq('status', 'published')
        .lt('expires_at', now);
    if (fetchError) {
        console.error('[listingExpiryJob] Failed to fetch expired listings:', fetchError.message);
        return;
    }
    if (expired && expired.length > 0) {
        const expiredIds = expired.map(l => l.id);
        // Update them to 'archived'
        const { error: updateError } = await supabase_1.supabase
            .from('listings')
            .update({ status: 'archived' })
            .in('id', expiredIds);
        if (updateError) {
            console.error('[listingExpiryJob] Failed to archive listings:', updateError.message);
        }
        else {
            console.log(`[listingExpiryJob] Archived ${expired.length} expired listing(s)`);
        }
    }
}
function startListingExpiryJob() {
    if (expiryInterval)
        return;
    // Run immediately on start
    processExpiredListings().catch(err => console.error('[listingExpiryJob] Initial check failed:', err));
    // Then schedule every hour
    expiryInterval = setInterval(() => {
        processExpiredListings().catch(err => console.error('[listingExpiryJob] Recurring check failed:', err));
    }, 60 * 60 * 1000);
    console.log('✅ Listing expiry check started (every hour)');
}
async function stopListingExpiryJob() {
    if (expiryInterval) {
        clearInterval(expiryInterval);
        expiryInterval = null;
        console.log('[listingExpiryJob] Listing expiry check stopped');
    }
}
//# sourceMappingURL=listingExpiryJob.js.map