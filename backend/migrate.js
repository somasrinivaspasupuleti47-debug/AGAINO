const { MongoClient } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://vbrzrzcrtxzqglmtlihp.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZicnpyemNydHh6cWdsbXRsaWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NzczMDQsImV4cCI6MjA5MTA1MzMwNH0.EwHPWWIh5R7m5EUVjs352mAdC02sV1Nd3lzlWF7OnNw";
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  const client = new MongoClient('mongodb://localhost:27017/againo');
  try {
    await client.connect();
    const db = client.db('againo');
    const listings = await db.collection('listings').find().toArray();
    console.log(`Found ${listings.length} listings in MongoDB`);
    
    for (const l of listings) {
      // transform if needed
      // Map MongoDB _id to Supabase _id? Wait, Supabase _id is UUID. We can just insert it without _id and let Supabase generate one, or keep it if Supabase column _id is string
      
      const newListing = {
        title: l.title,
        description: l.description,
        price: l.price,
        category: l.category,
        subcategory: l.subcategory,
        condition: l.condition,
        status: l.status,
        images: l.images,
        location: l.location,
        seller_id: l.sellerId || "test-user-id" // Might need a valid firebase user id
      };
      
      const { data, error } = await supabase.from('listings').insert(newListing);
      if (error) {
        console.error(`Error inserting ${l.title}:`, error);
      } else {
        console.log(`Inserted ${l.title}`);
      }
    }
  } finally {
    await client.close();
  }
}
migrate();
