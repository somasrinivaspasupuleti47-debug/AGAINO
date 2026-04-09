const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://vbrzrzcrtxzqglmtlihp.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZicnpyemNydHh6cWdsbXRsaWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NzczMDQsImV4cCI6MjA5MTA1MzMwNH0.EwHPWWIh5R7m5EUVjs352mAdC02sV1Nd3lzlWF7OnNw"
);

const listings = [
  {
    "title": "wallpaper",
    "description": "wallpaper",
    "price": 111,
    "category": "Other",
    "subcategory": "General",
    "condition": "used",
    "status": "published",
    "images": [
      {
        "original": "/uploads/originals/4139818a-f3ec-47e8-8d95-931f0892c5c5.webp",
        "thumbnail": "/uploads/thumbnails/4139818a-f3ec-47e8-8d95-931f0892c5c5.webp"
      }
    ],
    "location": {
      "city": "wallpaper",
      "region": "wallpaper"
    },
    "seller_id": "test-seller-id"
  },
  {
    "title": "wallpaper (2)",
    "description": "wallpaper",
    "price": 111,
    "category": "Other",
    "subcategory": "General",
    "condition": "used",
    "status": "published",
    "images": [
      {
        "original": "/uploads/originals/11582312-1781-48c0-b571-a82ce078a040.webp",
        "thumbnail": "/uploads/thumbnails/11582312-1781-48c0-b571-a82ce078a040.webp"
      }
    ],
    "location": {
      "city": "wallpaper city",
      "region": "wallpaper region"
    },
    "seller_id": "test-seller-id"
  },
  {
    "title": "photo",
    "description": "photo",
    "price": 11111,
    "category": "Other",
    "subcategory": "General",
    "condition": "used",
    "status": "published",
    "images": [
      {
        "original": "/uploads/originals/395201ca-35fd-48b6-a5f7-31e2b65f9fd7.webp",
        "thumbnail": "/uploads/thumbnails/395201ca-35fd-48b6-a5f7-31e2b65f9fd7.webp"
      }
    ],
    "location": {
      "city": "Mumbai",
      "region": "Maharashtra"
    },
    "seller_id": "test-seller-id"
  }
];

async function migrate() {
  for (const l of listings) {
    const { data, error } = await supabase.from('listings').insert(l);
    if (error) console.error(error);
    else console.log('Imported', l.title);
  }
}
migrate();
