# Campus Notification System Design

## Stage 1: REST API Design

Base URL: `/api/v1`

Common headers:

```http
Content-Type: application/json
Accept: application/json
X-Request-Id: <uuid>
X-Client-Version: web-1.0.0
```

No authentication is required for this assignment. In production, the gateway would still inject a trusted `X-Student-Id` or service identity after pre-authorization.

### 1. Fetch Notifications

```http
GET /api/v1/students/{studentId}/notifications?type=Placement&page=1&pageSize=20&read=false
```

Query parameters:

| Name | Type | Required | Notes |
|---|---:|---:|---|
| `type` | string | no | `Placement`, `Result`, `Event` |
| `page` | number | no | default `1` |
| `pageSize` | number | no | default `20`, max `100` |
| `read` | boolean | no | filters read/unread state |

Response:

```json
{
  "data": [
    {
      "id": "8b829ec9-a69d-4b24-bc37-481bfce68263",
      "type": "Placement",
      "title": "CSX Corporation hiring",
      "message": "Campus drive opens tomorrow.",
      "createdAt": "2026-04-22T17:51:18Z",
      "read": false
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 146,
    "hasNextPage": true
  }
}
```

### 2. Mark Notification as Read

```http
PATCH /api/v1/students/{studentId}/notifications/{notificationId}/read
```

Request:

```json
{
  "read": true
}
```

Response:

```json
{
  "notificationId": "8b829ec9-a69d-4b24-bc37-481bfce68263",
  "studentId": 1042,
  "read": true,
  "readAt": "2026-05-05T10:30:00Z"
}
```

### 3. Create/Send Notification

```http
POST /api/v1/notifications
```

Request:

```json
{
  "type": "Placement",
  "title": "CSX Corporation hiring",
  "message": "Applications close Friday.",
  "audience": {
    "department": "CSE",
    "graduationYear": 2026
  },
  "channels": ["in_app", "email"]
}
```

Response:

```json
{
  "notificationId": "8b829ec9-a69d-4b24-bc37-481bfce68263",
  "status": "accepted",
  "queuedRecipients": 1240
}
```

### 4. Bulk Notify Multiple Users

```http
POST /api/v1/notifications/bulk
```

Request:

```json
{
  "studentIds": [1042, 1043, 1044],
  "notification": {
    "type": "Result",
    "title": "Mid-sem result published",
    "message": "Result is available in the student portal.",
    "channels": ["in_app", "email"]
  }
}
```

Response:

```json
{
  "batchId": "0e0d3ab2-4eda-4576-8834-44dd571be9b5",
  "status": "accepted",
  "queuedRecipients": 3
}
```

### Real-Time Notifications

Use WebSockets:

```http
GET /ws/students/{studentId}/notifications
```

Event example:

```json
{
  "event": "notification.created",
  "data": {
    "id": "8b829ec9-a69d-4b24-bc37-481bfce68263",
    "type": "Placement",
    "title": "CSX Corporation hiring",
    "message": "Applications close Friday.",
    "createdAt": "2026-04-22T17:51:18Z",
    "read": false
  }
}
```

Scalable event flow:

1. Admin service receives a notification creation request.
2. API validates input, writes the notification envelope, and publishes a `notification.created` event to Kafka.
3. Fanout workers resolve recipients and insert recipient status rows in batches.
4. Push gateway instances subscribe to Kafka or Redis Streams and deliver events to connected WebSocket clients.
5. Email workers consume email jobs independently.
6. Clients reconcile with REST on reconnect using `createdAt` or cursor pagination.

For 50,000+ users, keep WebSocket servers stateless, store connection routing in Redis, run behind an L4/L7 load balancer with sticky sessions or a connection registry, and publish events through Kafka/Redis Pub/Sub so any gateway can deliver to the right socket. Backpressure is handled by bounded queues, per-user rate limits, and REST reconciliation when a client falls behind.

All services use a custom logging middleware that attaches `requestId`, `studentId`, route, latency, status code, and error classification. Direct `console.log` or framework default access logs are disabled.

## Stage 2: Database Design

PostgreSQL is the primary database. It is optimal here because the system needs strong consistency for read status, relational filtering by user/type/time, transactional batch inserts, mature indexing, JSONB for optional metadata, partitioning, and operational tooling.

### Schema

```sql
CREATE TYPE notification_type AS ENUM ('Placement', 'Result', 'Event');
CREATE TYPE notification_channel AS ENUM ('in_app', 'email');

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  roll_number TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  department TEXT NOT NULL,
  graduation_year INT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notification_read_status (
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  email_status TEXT NOT NULL DEFAULT 'pending',
  push_status TEXT NOT NULL DEFAULT 'pending',
  PRIMARY KEY (notification_id, student_id)
);

CREATE INDEX idx_read_status_student_delivered
  ON notification_read_status (student_id, delivered_at DESC);

CREATE INDEX idx_read_status_student_unread
  ON notification_read_status (student_id, delivered_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX idx_notifications_type_created
  ON notifications (type, created_at DESC);
```

Relationships:

- One user can receive many notifications through `notification_read_status`.
- One notification can be delivered to many users.
- `notification_read_status` is the many-to-many join table and stores per-student delivery/read/channel state.

### API Queries

Fetch notifications:

```sql
SELECT n.id, n.type, n.title, n.message, n.created_at, rs.read_at IS NOT NULL AS read
FROM notification_read_status rs
JOIN notifications n ON n.id = rs.notification_id
WHERE rs.student_id = $1
  AND ($2::notification_type IS NULL OR n.type = $2)
  AND ($3::BOOLEAN IS NULL OR (rs.read_at IS NOT NULL) = $3)
ORDER BY rs.delivered_at DESC
LIMIT $4 OFFSET (($5 - 1) * $4);
```

Mark read:

```sql
UPDATE notification_read_status
SET read_at = CASE WHEN $3 = TRUE THEN COALESCE(read_at, now()) ELSE NULL END
WHERE student_id = $1 AND notification_id = $2
RETURNING notification_id, student_id, read_at;
```

Create notification:

```sql
INSERT INTO notifications (type, title, message, metadata, created_by)
VALUES ($1, $2, $3, $4, $5)
RETURNING id;
```

Resolve audience:

```sql
SELECT id
FROM users
WHERE active = TRUE
  AND ($1::TEXT IS NULL OR department = $1)
  AND ($2::INT IS NULL OR graduation_year = $2);
```

Bulk recipient insert:

```sql
INSERT INTO notification_read_status (notification_id, student_id)
SELECT $1, unnest($2::BIGINT[])
ON CONFLICT (notification_id, student_id) DO NOTHING;
```

Scaling challenges and solutions:

- Millions of rows in `notification_read_status`: use composite indexes by access pattern, monthly partitioning by `delivered_at`, and archival for old notifications.
- Hot users or broadcasts: batch inserts, queue fanout, and cache recent inbox results in Redis.
- Cross-campus growth: shard by `student_id` when a single PostgreSQL cluster cannot handle write volume.
- Heavy unread counters: maintain Redis counters or materialized aggregate rows updated by workers.

## Stage 3: Query Optimization

Given query:

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

Correctness issues:

- A normalized design should not store `studentID` and `isRead` directly on `notifications`; those are per-recipient properties.
- `SELECT *` pulls unnecessary columns.
- CamelCase column names are awkward in PostgreSQL unless quoted.
- `createdAt ASC` is likely not the desired inbox order; most inboxes show newest first.

Performance issues:

- Without a composite index, PostgreSQL scans many rows to find one student.
- Filtering `isRead = false` after scanning wastes IO.
- Sorting all matched rows adds CPU and memory cost.

Optimized index:

```sql
CREATE INDEX idx_read_status_student_unread_delivered
ON notification_read_status (student_id, delivered_at DESC)
WHERE read_at IS NULL;
```

Improved query:

```sql
SELECT n.id, n.type, n.title, n.message, n.created_at
FROM notification_read_status rs
JOIN notifications n ON n.id = rs.notification_id
WHERE rs.student_id = 1042
  AND rs.read_at IS NULL
ORDER BY rs.delivered_at DESC
LIMIT 50;
```

Complexity improvement:

- Before: near `O(N log N)` in the worst case because many rows are scanned and sorted.
- After: approximately `O(log N + K)` where `K` is the returned page size, because the index directly locates unread rows for the student in sorted order.

Do not add indexes on every column. Indexes increase storage, slow inserts/updates/deletes, add vacuum and maintenance overhead, confuse the planner when redundant, and only help when they match real query predicates, joins, and ordering.

Find all students who received Placement notifications in the last 7 days:

```sql
SELECT DISTINCT u.id, u.roll_number, u.email, u.full_name
FROM users u
JOIN notification_read_status rs ON rs.student_id = u.id
JOIN notifications n ON n.id = rs.notification_id
WHERE n.type = 'Placement'
  AND rs.delivered_at >= now() - interval '7 days';
```

## Stage 4: Performance Optimization

Problem: fetching notifications from the database on every page load overloads the database.

Solutions:

1. Redis caching: store recent notifications per user as `notifications:user:{studentId}:recent` with a short TTL. Invalidate or update the list when new notifications arrive or read state changes.
2. Pagination and lazy loading: fetch the first page only, then load older pages as the user scrolls.
3. Real-time push: use WebSockets so clients receive new notifications without polling.
4. CDN or edge caching: cache public event notifications or static metadata at the edge. User-specific read state should not be cached publicly.

Trade-offs:

- Freshness vs performance: longer Redis TTLs reduce database load but can show stale read state. Event-driven invalidation improves freshness at higher complexity.
- Complexity vs scalability: WebSockets, queues, and Redis add infrastructure but remove expensive repeated reads.
- Cost implications: Redis and Kafka add operating cost, but they are cheaper than scaling the primary database for avoidable read traffic.

## Stage 5: Scalable Notification System

Original pseudo-code:

```text
for each student:
  send_email(student_id)
  save_to_db(student_id)
  push_to_app(student_id)
```

Problems:

- Blocking email and push calls slow the request.
- One failed student can interrupt the batch.
- No retry mechanism or dead-letter queue.
- No idempotency, so retries can duplicate rows or emails.
- Poor throughput for 50,000 recipients.

Redesigned architecture:

- API service validates the request and creates a notification envelope.
- Producer publishes a batch fanout job to Kafka or RabbitMQ.
- Fanout workers resolve recipients and create per-student jobs in chunks.
- Database workers insert read-status rows idempotently.
- Email workers send mail with retry and provider-specific rate limits.
- Push workers publish to WebSocket gateways.
- Failed jobs go to a dead-letter queue after bounded retries.

Improved pseudo-code:

```python
def create_notification(request):
    notification_id = db.insert_notification(request.notification)
    queue.publish(
        topic="notification.fanout",
        key=notification_id,
        value={
            "notification_id": notification_id,
            "audience": request.audience,
            "channels": request.channels,
            "idempotency_key": request.idempotency_key,
        },
    )
    return {"status": "accepted", "notification_id": notification_id}


def fanout_worker(event):
    recipients = user_repository.find_audience(event["audience"])
    for chunk in chunks(recipients, 1000):
        queue.publish("notification.persist", {"notification_id": event["notification_id"], "student_ids": chunk})
        if "email" in event["channels"]:
            queue.publish("notification.email", {"notification_id": event["notification_id"], "student_ids": chunk})
        if "in_app" in event["channels"]:
            queue.publish("notification.push", {"notification_id": event["notification_id"], "student_ids": chunk})


def persist_worker(job):
    db.bulk_insert_read_status(
        notification_id=job["notification_id"],
        student_ids=job["student_ids"],
        on_conflict="do_nothing",
    )


def email_worker(job):
    for student_id in job["student_ids"]:
        retry.with_backoff(
            lambda: email_provider.send_once(
                idempotency_key=f'{job["notification_id"]}:{student_id}:email',
                student_id=student_id,
            ),
            dead_letter_topic="notification.email.dlq",
        )


def push_worker(job):
    for student_id in job["student_ids"]:
        websocket_gateway.publish(student_id, job["notification_id"])
```

Saving the notification envelope should be synchronous because the API must return a durable notification ID. Per-recipient inserts, email delivery, and push delivery should be asynchronous because they are high-volume, failure-prone operations that need retries, rate limiting, and independent scaling. If product requirements demand immediate inbox visibility before response, keep only a small transactional write synchronous and push all external side effects to workers.

## Stage 6: Priority Inbox

Implementation is in `priority_inbox.py`. It fetches from `http://20.207.122.201/evaluation-service/notifications`, assigns priority weights `Placement > Result > Event`, and uses a bounded heap for efficient top-10 retrieval without a database.

For continuous incoming notifications, keep the heap size at `N` and process each new event in `O(log N)`. With `N = 10`, memory remains constant and each insert is cheap.

