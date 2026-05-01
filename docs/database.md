# Database Schema

## Users

* id
* username
* email
* password_hash
* created_at
* updated_at

## Refresh Tokens

* id
* user_id
* token_family_id
* token_hash
* expires_at
* last_used_at
* revoked_at
* replaced_by_token_id
* user_agent
* ip_address

## Auth Rate Limits

* route_key
* identifier
* window_start
* attempt_count

## Schema Migrations

* id
* description
* applied_at

## Auth Admin Audit Logs

* id
* action
* actor_type
* actor_identifier
* actor_ip_address
* actor_user_agent
* target_user_id
* status
* revoked_session_count
* error_message
* created_at

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
