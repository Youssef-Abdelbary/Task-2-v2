# Testing the Cafeteria Meal Review API by hand in Thunder Client

Local testing helper. Not part of the assignment deliverable — delete this
folder (or leave it out of your commit) before opening the pull request.

## 1. Start the API

```bash
cd server
npm run dev
```

## 2. Seed the database

From the repo root, in a second terminal:

```bash
node thunder-client/seed.mjs
```

This wipes the `reviews` collection, inserts four fixture users with fixed ids,
and re-creates the baseline reviews. Run it again any time you want a clean
slate.

### Fixture users

| user | id |
|---|---|
| Nour Hassan | `000000000000000000000001` |
| Omar Fathy | `000000000000000000000002` |
| Salma Adel | `000000000000000000000003` |
| Youssef Tarek | `000000000000000000000004` |

### Seeded reviews

| mealCode | ratings | count | average |
|---|---|---|---|
| `ML101` | 4, 4, 4, 5 | 4 | 4.25 |
| `ML111` | 3, 3 | 2 | 3 |
| `ML202` | 2, 4 | 2 | 3 |
| `ML303` | 5 | 1 | 5 |
| `ML500` | 4 | 1 | 4 |

`ML101` and `ML202` reproduce the example in the task README. `ML111` is tied
with `ML202` on `reviewCount`, which is what proves the `mealCode`-ascending
tie-break. `ML303` sits below the default threshold, which proves `minReviews`
filtering. `ML500`'s single review is inserted with the fixed id
`000000000000000000000011` so the "get by id" request can use a literal URL.

## 3. Build the requests

Open the Thunder Client sidebar, go to **Collections**, use the `...` menu →
**New Collection** and name it `Cafeteria`. Then for each request below:

1. Right-click the collection → **New Request**, name it.
2. Set the method dropdown and paste the URL.
3. For a `POST`, open the **Body** tab, choose **Json**, paste the body.
4. Open the **Tests** tab and add one row per assertion:
   - left dropdown: `Response Code` or `Json Query`
   - middle input: the json path (`Json Query` only)
   - action dropdown: `equal`, `notNull`, `isNull`
   - right input: the expected value
5. Press **Send**. Green rows in the Tests tab mean it passed.

`Run All` on a collection is a paid Thunder Client feature, so send the
requests one at a time.

### A note on `{{#guid}}`

Requests 03 and 04 use `ML900-{{#guid}}` / `ML901-{{#guid}}` as the meal code.
`{{#guid}}` is a Thunder Client system variable that generates a fresh UUID on
every send, which keeps those two from tripping the unique index when you
re-send them. Type it literally into the body.

---

## The requests

All URLs are under `http://localhost:3000/api`.

### 01 · Health check
`GET http://localhost:3000/api/health`

| check | path | action | value |
|---|---|---|---|
| Response Code | | equal | `200` |
| Json Query | `json.ok` | equal | `true` |

### 02 · List fixture users
`GET http://localhost:3000/api/users`

| check | path | action | value |
|---|---|---|---|
| Response Code | | equal | `200` |
| Json Query | `json.users` | notNull | |

### 03 · POST review · valid
`POST http://localhost:3000/api/reviews`

```json
{
  "mealCode": "ML900-{{#guid}}",
  "rating": 5,
  "comment": "Created from Thunder Client",
  "reviewedBy": "000000000000000000000001"
}
```

| check | path | action | value |
|---|---|---|---|
| Response Code | | equal | `201` |
| Json Query | `json.review._id` | notNull | |
| Json Query | `json.review.rating` | equal | `5` |
| Json Query | `json.review.reviewedBy` | equal | `000000000000000000000001` |
| Json Query | `json.review.createdAt` | notNull | |
| Json Query | `json.review.updatedAt` | notNull | |

### 04 · POST review · anonymous, no reviewedBy
`POST http://localhost:3000/api/reviews`

```json
{
  "mealCode": "ML901-{{#guid}}",
  "rating": 4
}
```

| check | path | action | value |
|---|---|---|---|
| Response Code | | equal | `201` |
| Json Query | `json.review._id` | notNull | |
| Json Query | `json.review.reviewedBy` | isNull | |

### 05 · POST review · missing mealCode
`POST http://localhost:3000/api/reviews`

```json
{ "rating": 4 }
```

Response Code equal `400`, `json.message` notNull.

### 06 · POST review · rating above max
`POST http://localhost:3000/api/reviews`

```json
{ "mealCode": "ML999", "rating": 6 }
```

Response Code equal `400`.

### 07 · POST review · rating below min
`POST http://localhost:3000/api/reviews`

```json
{ "mealCode": "ML999", "rating": 0 }
```

Response Code equal `400`.

### 08 · POST review · duplicate meal + user
`POST http://localhost:3000/api/reviews`

```json
{
  "mealCode": "ML101",
  "rating": 3,
  "comment": "Nour already reviewed ML101",
  "reviewedBy": "000000000000000000000001"
}
```

Response Code equal `409`. This is the compound unique index rejecting a second
review of `ML101` by the same user.

### 09 · GET all reviews
`GET http://localhost:3000/api/reviews`

| check | path | action | value |
|---|---|---|---|
| Response Code | | equal | `200` |
| Json Query | `json.reviews` | notNull | |
| Json Query | `json.reviews[0]._id` | notNull | |
| Json Query | `json.reviews[8]._id` | notNull | |

### 10 · GET review by id
`GET http://localhost:3000/api/reviews/000000000000000000000011`

| check | path | action | value |
|---|---|---|---|
| Response Code | | equal | `200` |
| Json Query | `json.review._id` | equal | `000000000000000000000011` |
| Json Query | `json.review.mealCode` | equal | `ML500` |

### 11 · GET review by id · unknown id
`GET http://localhost:3000/api/reviews/000000000000000000000099`

| check | path | action | value |
|---|---|---|---|
| Response Code | | equal | `404` |
| Json Query | `json.message` | equal | `Review not found` |

### 12 · GET popular · default minReviews=2
`GET http://localhost:3000/api/reviews/popular`

The important one — it covers sorting, averaging, the tie-break, the default
threshold, and the route ordering all at once.

| check | path | action | value |
|---|---|---|---|
| Response Code | | equal | `200` |
| Json Query | `json.popular[0].mealCode` | equal | `ML101` |
| Json Query | `json.popular[0].reviewCount` | equal | `4` |
| Json Query | `json.popular[0].averageRating` | equal | `4.25` |
| Json Query | `json.popular[1].mealCode` | equal | `ML111` |
| Json Query | `json.popular[1].reviewCount` | equal | `2` |
| Json Query | `json.popular[2].mealCode` | equal | `ML202` |
| Json Query | `json.popular[2].averageRating` | equal | `3` |
| Json Query | `json.popular[3]` | isNull | |

### 13 · GET popular · minReviews=1
`GET http://localhost:3000/api/reviews/popular?minReviews=1`

Response Code equal `200`, `json.popular[0].mealCode` equal `ML101`.

### 14 · GET popular · minReviews=4
`GET http://localhost:3000/api/reviews/popular?minReviews=4`

Response Code equal `200`, `json.popular[0].mealCode` equal `ML101`,
`json.popular[1]` isNull.

### 15 · GET popular · nothing qualifies
`GET http://localhost:3000/api/reviews/popular?minReviews=99`

Response Code equal `200`, `json.popular` notNull, `json.popular[0]` isNull.
The body should be exactly `{"popular":[]}`.

### 16–19 · GET popular · invalid minReviews

The same request four times, changing only the query value:

```
GET http://localhost:3000/api/reviews/popular?minReviews=0
GET http://localhost:3000/api/reviews/popular?minReviews=-1
GET http://localhost:3000/api/reviews/popular?minReviews=abc
GET http://localhost:3000/api/reviews/popular?minReviews=2.5
```

Each one: Response Code equal `400`, and `json.message` equal
`minReviews must be a positive integer`.
