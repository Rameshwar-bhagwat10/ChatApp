# Database Schema

## Users

* id
* username
* email
* password_hash

## Chats

* id
* type

## Chat Members

* user_id
* chat_id
* role

## Messages

* id
* chat_id
* sender_id
* content
* type
* status

## Message Status

* message_id
* user_id
* status

## Notes

* Indexed queries for performance
* Separate status tracking for scalability
