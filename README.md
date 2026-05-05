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

## Demo Guidance

Capture screenshots for:

- All Notifications page on desktop and mobile.
- Priority Notifications page after filtering.
- Mark-as-read interaction on an unread card.
- Loading skeleton and API failure state by temporarily blocking the API URL.

For a video demo, record a short flow: load inbox, filter by Placement, mark one notification as read, switch to Priority, then simulate a WebSocket event by setting `NEXT_PUBLIC_WS_URL` to a test socket server.

