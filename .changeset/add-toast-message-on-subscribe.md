---
"cwv-monitor-client": patch
---

Add toast message on subscribe button click

- Replaced `CustomEventButton` with a new `SubscribeButton` component for both App Router and Pages Router
- Integrated `sonner` toast library to show a success notification when subscribing
- Added `Toaster` provider to root layouts for both routing strategies
