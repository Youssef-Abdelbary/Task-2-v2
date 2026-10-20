// Resets the reviews collection and seeds a known dataset for the Thunder Client tests.
// Requires the API server to be running (cd server && npm run dev).
//
//   node thunder-client/seed.mjs
//
// The four fixture users get fixed _id values so the Thunder Client environment
// variables stay valid every time you re-seed.
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:3000/api';
const serverDir = new URL('../server/', import.meta.url);

// server/.env is read directly so this script needs no dependencies of its own.
const env = Object.fromEntries(
  fs.readFileSync(new URL('.env', serverDir), 'utf8')
    .split('\n')
    .filter((line) => line.trim() && !line.trim().startsWith('#'))
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    })
);

const mongoose = (await import(new URL('node_modules/mongoose/index.js', serverDir).href)).default;
const { ObjectId } = mongoose.Types;

const USERS = [
  { _id: '000000000000000000000001', name: 'Nour Hassan', email: 'nour@cafeteria.example.com' },
  { _id: '000000000000000000000002', name: 'Omar Fathy', email: 'omar@cafeteria.example.com' },
  { _id: '000000000000000000000003', name: 'Salma Adel', email: 'salma@cafeteria.example.com' },
  { _id: '000000000000000000000004', name: 'Youssef Tarek', email: 'youssef@cafeteria.example.com' }
];

const FIXED_REVIEW_ID = '000000000000000000000011';

// [mealCode, rating, userIndex, comment]
const REVIEWS = [
  ['ML101', 4, 0, 'Koshari was solid, plenty of crispy onions.'],
  ['ML101', 4, 1, 'Good portion, sauce could be spicier.'],
  ['ML101', 4, 2, 'Reliable lunch, never disappoints.'],
  ['ML101', 5, 3, 'Best thing on the menu this week.'],
  ['ML202', 2, 0, 'Molokhia was lukewarm.'],
  ['ML202', 4, 1, 'Much better than last time.'],
  ['ML111', 3, 0, 'Falafel was fine, nothing special.'],
  ['ML111', 3, 1, 'Decent but a bit dry.'],
  ['ML303', 5, 2, 'Pasta bake is underrated.']
];

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

await mongoose.connect(env.MONGO_URI);
const db = mongoose.connection;

await db.collection('reviews').deleteMany({});
await db.collection('users').deleteMany({
  $or: [
    { _id: { $in: USERS.map((u) => new ObjectId(u._id)) } },
    { email: { $in: USERS.map((u) => u.email) } }
  ]
});
await db.collection('users').insertMany(
  USERS.map((u) => ({
    _id: new ObjectId(u._id),
    name: u.name,
    email: u.email,
    password: 'seeded-fixture-not-a-real-hash',
    createdAt: new Date(),
    updatedAt: new Date()
  }))
);
await mongoose.disconnect();
console.log(`reset reviews, seeded ${USERS.length} fixture users`);

let created = 0;
for (const [mealCode, rating, userIndex, comment] of REVIEWS) {
  const r = await api('POST', '/reviews', { mealCode, rating, comment, reviewedBy: USERS[userIndex]._id });
  if (r.status !== 201) throw new Error(`${mealCode} -> ${r.status} ${JSON.stringify(r.body)}`);
  created++;
}
console.log(`seeded ${created} reviews via POST /api/reviews`);

// One review with a fixed _id so the "GET by id" request can use a literal id
// and the collection needs no environment variables at all. Its meal has a
// single review, so it never shows up in /popular at the default threshold.
await mongoose.connect(env.MONGO_URI);
await mongoose.connection.collection('reviews').insertOne({
  _id: new ObjectId(FIXED_REVIEW_ID),
  mealCode: 'ML500',
  rating: 4,
  comment: 'Fixed-id fixture used by the GET /api/reviews/:id test.',
  reviewedBy: new ObjectId(USERS[3]._id),
  createdAt: new Date(),
  updatedAt: new Date(),
  __v: 0
});
await mongoose.disconnect();
console.log(`seeded fixture review ${FIXED_REVIEW_ID} (ML500)`);

console.log('\npopular (default minReviews=2):');
console.log(JSON.stringify((await api('GET', '/reviews/popular')).body, null, 2));
