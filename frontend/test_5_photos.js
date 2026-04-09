const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://vbrzrzcrtxzqglmtlihp.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZicnpyemNydHh6cWdsbXRsaWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NzczMDQsImV4cCI6MjA5MTA1MzMwNH0.EwHPWWIh5R7m5EUVjs352mAdC02sV1Nd3lzlWF7OnNw"
);

const testListing = {
  "title": "5 Photos Demo Product",
  "description": "Showcasing a product with 5 beautifully uploaded photos for all users to see.",
  "price": 5555,
  "category": "Electronics",
  "subcategory": "General",
  "condition": "new",
  "status": "published",
  "images": [
    {
      "original": "/uploads/originals/046da0cd-2696-4423-ac8e-264170c76308.webp",
      "thumbnail": "/uploads/thumbnails/046da0cd-2696-4423-ac8e-264170c76308.webp"
    },
    {
      "original": "/uploads/originals/11582312-1781-48c0-b571-a82ce078a040.webp",
      "thumbnail": "/uploads/thumbnails/11582312-1781-48c0-b571-a82ce078a040.webp"
    },
    {
      "original": "/uploads/originals/395201ca-35fd-48b6-a5f7-31e2b65f9fd7.webp",
      "thumbnail": "/uploads/thumbnails/395201ca-35fd-48b6-a5f7-31e2b65f9fd7.webp"
    },
    {
      "original": "/uploads/originals/4139818a-f3ec-47e8-8d95-931f0892c5c5.webp",
      "thumbnail": "/uploads/thumbnails/4139818a-f3ec-47e8-8d95-931f0892c5c5.webp"
    },
    {
      "original": "/uploads/originals/5f2ab384-6885-4400-b474-cc4b74c7e5f6.webp",
      "thumbnail": "/uploads/thumbnails/5f2ab384-6885-4400-b474-cc4b74c7e5f6.webp"
    }
  ],
  "location": {
    "city": "Tech City",
    "region": "Innovation State"
  },
  "seller_id": "test-seller-id"
};

async function insertDemo() {
  const { data, error } = await supabase.from('listings').insert(testListing);
  if (error) console.error(error);
  else console.log('Successfully inserted 5-photo demo listing');
}
insertDemo();
