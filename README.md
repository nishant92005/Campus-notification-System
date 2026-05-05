# Campus Notification System

Production-oriented campus notification design and frontend prototype.

## Contents

- `notification_system_design.md`: stages 1-6 system design, SQL, optimization, and scalable architecture.
- `priority_inbox.py`: working heap-based priority inbox implementation.
- `src/`: Next.js + Material UI frontend.

## Run the Priority Inbox

```bash
python priority_inbox.py
```

## Run the Frontend

```bash
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:3000`.

## Remote API Status

The evaluation API provided for notifications is currently not reliably accessible from this environment.

Observed issues:

- `http://20.207.122.201/evaluation-service/notifications` responds with `401 Unauthorized`.
- `http://20.244.56.144/evaluation-service/notifications` times out from this machine/network.
- Direct browser requests can also fail with CORS because the remote server sends invalid `Access-Control-Allow-Origin` headers.

Because of this, the frontend calls a local same-origin Next.js proxy route:

```text
/api/priority-notifications
```

That proxy attempts to call the remote API server-side. If the remote API is unavailable, unauthorized, or blocked by network rules, the app falls back to local demo notifications so the priority sorting, filtering, pagination, and read/unread UI can still be evaluated.

To test the Python priority inbox without the remote API:

```bash
python priority_inbox.py --demo
```

If a valid API token is provided later, run:

```bash
python priority_inbox.py --auth-token YOUR_TOKEN
```

## Demo Guidance

Capture screenshots for:

- All Notifications page on desktop and mobile.
- Priority Notifications page after filtering.
- Mark-as-read interaction on an unread card.
- Loading skeleton and API failure state by temporarily blocking the API URL.

For a video demo, record a short flow: load inbox, filter by Placement, mark one notification as read, switch to Priority, then simulate a WebSocket event by setting `NEXT_PUBLIC_WS_URL` to a test socket server.
