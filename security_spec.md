# Security Specification & Threat Model

This document outlines the security invariants, threat vector payloads, and verification specifications for the Real-Time Chat & Voice/Video Call application.

## 1. Core Data Invariants

1. **Identity Isolation**: A user profile can only be created or written to by its authenticated owner (`request.auth.uid == userId`).
2. **Contact Integrity**: User directories can be queried and read only by authenticated users.
3. **One-to-One Consent**: A chat can only be established and updated between exactly 2 participants, and one of these participants must be the current user.
4. **Relational Synchrony (The Master Gate)**: Message streams (`/chats/{chatId}/messages/{messageId}`) can only be read, created, or updated if the user is a verified member of the parent `/chats/{chatId}` document. Offline or deleted users immediately lose active subcollection write capability.
5. **Message Ownership**: Only the original message sender can update the message `text`, setting `edited = true`. Only the message recipient can update the `seen` field.
6. **Temporal Lock**: All timestamp parameters (`createdAt`, `updatedAt`, `timestamp`) must strictly map to the true server-time `request.time`. Client-supplied timelines are rejected.
7. **Secure Handshakes**: Call status updates (`ringing`, `accepted`, `rejected`, `ended`) and SDP mapping must only occur between the active `callerId` and `receiverId` declared on the `calls` document.

---

## 2. The "Dirty Dozen" Threat Payloads

The following payloads represent unauthorized writes, privilege escalations, and ID injections which are rejected by the Firebase security rules.

### T1: Identity Impersonation (Profile Spoofing)
* **Target Path**: `users/victim_user_123`
* **Violator**: ID `attacker_456`
* **Payload**:
  ```json
  {
    "uid": "victim_user_123",
    "displayName": "Impersonator",
    "email": "victim@example.com"
  }
  ```
* **Status**: `PERMISSION_DENIED`

### T2: Profile Bypass via Rogue Attributes (Shadow Fields)
* **Target Path**: `users/attacker_456`
* **Violator**: ID `attacker_456`
* **Payload**:
  ```json
  {
    "uid": "attacker_456",
    "displayName": "Attacker",
    "email": "attacker@example.com",
    "isAdmin": true,
    "bypassBilling": true
  }
  ```
* **Status**: `PERMISSION_DENIED` (Exact schema validation fails due to unmapped properties on profile write)

### T3: Chat Eavesdropping (Unrelated Read)
* **Target Path**: `chats/user1_user2`
* **Violator**: ID `attacker_456` (Not present in participants list)
* **Operation**: `READ` or `LIST`
* **Status**: `PERMISSION_DENIED`

### T4: Message Injection from Third-Party ID
* **Target Path**: `chats/user1_user2/messages/msg_999`
* **Violator**: ID `attacker_456` (Not a participant of `user1_user2` chat)
* **Payload**:
  ```json
  {
    "id": "msg_999",
    "senderId": "attacker_456",
    "receiverId": "user1",
    "text": "Phishing Link",
    "timestamp": "request.time",
    "edited": false,
    "seen": false
  }
  ```
* **Status**: `PERMISSION_DENIED` (Gated by parent document search)

### T5: Client Timestamp Fudging (Temporal Deception)
* **Target Path**: `chats/user1_user2/messages/msg_101`
* **Violator**: ID `user1`
* **Payload**:
  ```json
  {
    "id": "msg_101",
    "senderId": "user1",
    "receiverId": "user2",
    "text": "Hello World",
    "timestamp": "2020-01-01T00:00:00Z",
    "edited": false,
    "seen": false
  }
  ```
* **Status**: `PERMISSION_DENIED` (Enforced `timestamp == request.time`)

### T6: Spoofing Message State (Attacker Seals Edit)
* **Target Path**: `chats/user1_user2/messages/msg_sent_by_user1`
* **Violator**: ID `user2` (Receiver attempting to edit Sender's content)
* **Payload**:
  ```json
  {
    "text": "Malicious Altered Text",
    "edited": true
  }
  ```
* **Status**: `PERMISSION_DENIED`

### T7: Message Self-Read (Sender falsifying Recipient Action)
* **Target Path**: `chats/user1_user2/messages/msg_sent_by_user1`
* **Violator**: ID `user1` (Sender attempting to mark own message as `seen`)
* **Payload**:
  ```json
  {
    "seen": true
  }
  ```
* **Status**: `PERMISSION_DENIED` (Only `receiverId == request.auth.uid` can modify `seen`)

### T8: Multi-Party Chat Escalation (Violating Private Chat Bounds)
* **Target Path**: `chats/new_chat_room`
* **Violator**: ID `user1`
* **Payload**:
  ```json
  {
    "id": "new_chat_room",
    "participants": ["user1", "user2", "attacker_456", "extra_user"],
    "typing": {},
    "unreadCount": {}
  }
  ```
* **Status**: `PERMISSION_DENIED` (Total participant size bounded at `<= 2`)

### T9: Signal Hijacking (Rogue Signaling Answer)
* **Target Path**: `calls/call_session_777`
* **Violator**: ID `attacker_456` (Not caller or receiver of this call)
* **Payload**:
  ```json
  {
    "answer": { "type": "answer", "sdp": "v=0..." },
    "status": "accepted"
  }
  ```
* **Status**: `PERMISSION_DENIED`

### T10: Denial-of-Wallet Character Flooding (Resource Poisoning)
* **Target Path**: `chats/user1_user2`
* **Violator**: ID `user1` (Fuzzing with standard-size field containing 5MB text)
* **Status**: `PERMISSION_DENIED` (Size constraints: `.size() <= 10000` text limit on string inputs)

### T11: Path Variable Manipulation (Poisoned Segment Attack)
* **Target Path**: `calls/SOME_JUNK_CHARACTER_#@$%_2MB_LONG_STRING`
* **Violator**: Any authenticated user
* **Status**: `PERMISSION_DENIED` (`isValidId()` constraint blocks arbitrary long non-regex strings)

### T12: Privilege Escalation via Claims Hijacking
* **Target Path**: `users/user1`
* **Violator**: ID `user1` (Setting custom claim parameter mimicking server privileges on auth token)
* **Status**: `PERMISSION_DENIED` (Security rules completely bypass token claims, looking up explicit parameters instead)

---

## 3. Threat Matrix Evaluator

| Threat Vector | Defense Vector | Evaluator Rule |
| :--- | :--- | :--- |
| **Identity Spoofing** | Checked by profile-to-auth-ID lock | `data.uid == request.auth.uid` |
| **State Shortcutting** | Structured update branches using Map diff filters | `.diff(existing()).affectedKeys().hasOnly([...])` |
| **Resource Poisoning** | Validation boundaries and regular expression filters | `isValidId(docId) && text.size() <= 10000` |
| **Parent Membership Loss** | Strict relative document calls on sub-resource paths | `get(/databases/$(database)/documents/chats/$(chatId))` |
