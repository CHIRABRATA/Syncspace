Communication Protocol Analysis:

Create a comparison table: Short Polling vs Long Polling vs SSE vs WebSockets (Protocol, Directionality, Connection Overhead, Latency, Use Cases).

Explicitly state why WebSockets is chosen for SyncSpace document editing over SSE and Short Polling.

State Sync & Failure Analysis:

Explain what happens when a WebSocket connection drops for 5 seconds while a user continues typing locally.

List 3 distinct engineering challenges this disconnect causes for state consistency.

System Boundaries Definition:

Define what SyncSpace will do in early stages (text sync, presence, user auth) vs what is explicitly out of scope (e.g., video streaming, rich-text canvas rendering like Figma).