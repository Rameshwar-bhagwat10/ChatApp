# WebSocket Events

## Connection

Client connects using JWT token.

---

## Client → Server

### send_message

Payload:
{
chatId,
content,
type
}

### typing_start

### typing_stop

### mark_as_read

---

## Server → Client

### receive_message

### message_delivered

### message_seen

### user_typing

---

## Rules

* Stateless events
* Acknowledge important actions
* Handle reconnect logic
