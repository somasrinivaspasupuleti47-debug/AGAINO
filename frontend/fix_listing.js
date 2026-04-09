const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://vbrzrzcrtxzqglmtlihp.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZicnpyemNydHh6cWdsbXRsaWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NzczMDQsImV4cCI6MjA5MTA1MzMwNH0.EwHPWWIh5R7m5EUVjs352mAdC02sV1Nd3lzlWF7OnNw"
);

async function fixListing() {
  const defaultImages = [
    {
      original: "/uploads/originals/4139818a-f3ec-47e8-8d95-931f0892c5c5.webp",
      thumbnail: "/uploads/thumbnails/4139818a-f3ec-47e8-8d95-931f0892c5c5.webp"
    }
  ];
  
  // Find listings where images is null
  const { data: listings } = await supabase.from('listings').select('_id, images');
  
  for (const l of listings) {
    if (!l.images) {
      await supabase.from('listings').update({ images: defaultImages }).eq('_id', l._id);
      console.log(`Updated listing ${l._id} with a placeholder image.`);
    }
  }
}
fixListing();
