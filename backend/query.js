const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb://localhost:27017/againo');
  try {
    await client.connect();
    const db = client.db('againo');
    const listings = await db.collection('listings').find().limit(3).toArray();
    console.log(JSON.stringify(listings, null, 2));
  } finally {
    await client.close();
  }
}
run();
