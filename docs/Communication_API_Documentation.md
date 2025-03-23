# Communication API Documentation

## Version: 1.0
## Date: March 23, 2025

## Overview

The Communication API provides endpoints for managing various types of communications within the OpenCap platform, including creating messages, managing message threads, and retrieving communications by user or thread.

## Base URL

```
/api/communications
```

## Authentication

All API endpoints require authentication. Include the authentication token in the Authorization header of your requests:

```
Authorization: Bearer <your_token>
```

## API Endpoints

### 1. Create a new Communication

**Endpoint:** `POST /api/communications`

**Description:** Creates a new communication record.

**Request Body:**

```json
{
  "communicationId": "COM-001",
  "MessageType": "email",
  "Sender": "60a1f77bcf86cd7994390001",
  "Recipient": "60a1f77bcf86cd7994390002",
  "Timestamp": "2025-03-20T10:00:00.000Z",
  "Content": "Hello, this is a test message.",
  "ThreadId": "THREAD-001"
}
```

**Response (201 Created):**

```json
{
  "_id": "607f1f77bcf86cd799439011",
  "communicationId": "COM-001",
  "MessageType": "email",
  "Sender": "60a1f77bcf86cd7994390001",
  "Recipient": "60a1f77bcf86cd7994390002",
  "Timestamp": "2025-03-20T10:00:00.000Z",
  "Content": "Hello, this is a test message.",
  "ThreadId": "THREAD-001",
  "createdAt": "2025-03-23T00:00:00.000Z",
  "updatedAt": "2025-03-23T00:00:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid communication data
- `500 Server Error`: Server error

### 2. Create a new Message in a Thread

**Endpoint:** `POST /api/communications/thread`

**Description:** Creates a new message in a thread, automatically generating a communicationId and optionally a ThreadId if not provided.

**Request Body:**

```json
{
  "MessageType": "email",
  "Sender": "60a1f77bcf86cd7994390001",
  "Recipient": "60a1f77bcf86cd7994390002",
  "Content": "This is a response in the thread.",
  "ThreadId": "THREAD-001"  // Optional: if not provided, a new ThreadId will be generated
}
```

**Response (201 Created):**

```json
{
  "_id": "607f1f77bcf86cd799439012",
  "communicationId": "COM-6a3b4c2d",  // Auto-generated
  "MessageType": "email",
  "Sender": "60a1f77bcf86cd7994390001",
  "Recipient": "60a1f77bcf86cd7994390002",
  "Timestamp": "2025-03-23T01:30:00.000Z",  // Auto-set to current time
  "Content": "This is a response in the thread.",
  "ThreadId": "THREAD-001",
  "createdAt": "2025-03-23T01:30:00.000Z",
  "updatedAt": "2025-03-23T01:30:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid communication data
- `500 Server Error`: Server error

### 3. Get all Communications

**Endpoint:** `GET /api/communications`

**Description:** Retrieves all communication records.

**Response (200 OK):**

```json
[
  {
    "_id": "607f1f77bcf86cd799439011",
    "communicationId": "COM-001",
    "MessageType": "email",
    "Sender": "60a1f77bcf86cd7994390001",
    "Recipient": "60a1f77bcf86cd7994390002",
    "Timestamp": "2025-03-20T10:00:00.000Z",
    "Content": "Hello, this is a test message.",
    "ThreadId": "THREAD-001",
    "createdAt": "2025-03-23T00:00:00.000Z",
    "updatedAt": "2025-03-23T00:00:00.000Z"
  },
  {
    "_id": "607f1f77bcf86cd799439012",
    "communicationId": "COM-002",
    "MessageType": "SMS",
    "Sender": "60a1f77bcf86cd7994390002",
    "Recipient": "60a1f77bcf86cd7994390001",
    "Timestamp": "2025-03-20T11:00:00.000Z",
    "Content": "Got your message, thanks!",
    "ThreadId": "THREAD-001",
    "createdAt": "2025-03-23T00:00:00.000Z",
    "updatedAt": "2025-03-23T00:00:00.000Z"
  }
]
```

**Error Responses:**

- `404 Not Found`: No communications found
- `500 Server Error`: Server error

### 4. Get all Messages in a Thread

**Endpoint:** `GET /api/communications/thread/:threadId`

**Description:** Retrieves all messages in a specific thread, ordered chronologically.

**Parameters:**

- `threadId` (string, required): ID of the thread

**Response (200 OK):**

```json
{
  "messages": [
    {
      "_id": "607f1f77bcf86cd799439011",
      "communicationId": "COM-001",
      "MessageType": "email",
      "Sender": "60a1f77bcf86cd7994390001",
      "Recipient": "60a1f77bcf86cd7994390002",
      "Timestamp": "2025-03-20T10:00:00.000Z",
      "Content": "Hello, this is a test message.",
      "ThreadId": "THREAD-001",
      "createdAt": "2025-03-23T00:00:00.000Z",
      "updatedAt": "2025-03-23T00:00:00.000Z"
    },
    {
      "_id": "607f1f77bcf86cd799439012",
      "communicationId": "COM-002",
      "MessageType": "SMS",
      "Sender": "60a1f77bcf86cd7994390002",
      "Recipient": "60a1f77bcf86cd7994390001",
      "Timestamp": "2025-03-20T11:00:00.000Z",
      "Content": "Got your message, thanks!",
      "ThreadId": "THREAD-001",
      "createdAt": "2025-03-23T00:00:00.000Z",
      "updatedAt": "2025-03-23T00:00:00.000Z"
    }
  ]
}
```

**Error Responses:**

- `404 Not Found`: No messages found in this thread
- `500 Server Error`: Server error

### 5. Get all Messages for a User

**Endpoint:** `GET /api/communications/user/:userId`

**Description:** Retrieves all messages where the specified user is either the sender or recipient.

**Parameters:**

- `userId` (string, required): MongoDB ObjectId of the user

**Response (200 OK):**

```json
{
  "messages": [
    {
      "_id": "607f1f77bcf86cd799439011",
      "communicationId": "COM-001",
      "MessageType": "email",
      "Sender": "60a1f77bcf86cd7994390001",
      "Recipient": "60a1f77bcf86cd7994390002",
      "Timestamp": "2025-03-20T10:00:00.000Z",
      "Content": "Hello, this is a test message.",
      "ThreadId": "THREAD-001",
      "createdAt": "2025-03-23T00:00:00.000Z",
      "updatedAt": "2025-03-23T00:00:00.000Z"
    },
    {
      "_id": "607f1f77bcf86cd799439012",
      "communicationId": "COM-002",
      "MessageType": "SMS",
      "Sender": "60a1f77bcf86cd7994390002",
      "Recipient": "60a1f77bcf86cd7994390001",
      "Timestamp": "2025-03-20T11:00:00.000Z",
      "Content": "Got your message, thanks!",
      "ThreadId": "THREAD-001",
      "createdAt": "2025-03-23T00:00:00.000Z",
      "updatedAt": "2025-03-23T00:00:00.000Z"
    }
  ]
}
```

**Error Responses:**

- `400 Bad Request`: Invalid user ID format
- `404 Not Found`: No messages found for this user
- `500 Server Error`: Server error

### 6. Get Communication by ID

**Endpoint:** `GET /api/communications/:id`

**Description:** Retrieves a specific communication by its MongoDB ID.

**Parameters:**

- `id` (string, required): MongoDB ID of the communication

**Response (200 OK):**

```json
{
  "_id": "607f1f77bcf86cd799439011",
  "communicationId": "COM-001",
  "MessageType": "email",
  "Sender": "60a1f77bcf86cd7994390001",
  "Recipient": "60a1f77bcf86cd7994390002",
  "Timestamp": "2025-03-20T10:00:00.000Z",
  "Content": "Hello, this is a test message.",
  "ThreadId": "THREAD-001",
  "createdAt": "2025-03-23T00:00:00.000Z",
  "updatedAt": "2025-03-23T00:00:00.000Z"
}
```

**Error Responses:**

- `404 Not Found`: Communication not found
- `500 Server Error`: Server error

### 7. Update Communication by ID

**Endpoint:** `PUT /api/communications/:id`

**Description:** Updates a specific communication by its MongoDB ID.

**Parameters:**

- `id` (string, required): MongoDB ID of the communication

**Request Body:**

```json
{
  "Content": "Updated message content"
}
```

**Response (200 OK):**

```json
{
  "_id": "607f1f77bcf86cd799439011",
  "communicationId": "COM-001",
  "MessageType": "email",
  "Sender": "60a1f77bcf86cd7994390001",
  "Recipient": "60a1f77bcf86cd7994390002",
  "Timestamp": "2025-03-20T10:00:00.000Z",
  "Content": "Updated message content",
  "ThreadId": "THREAD-001",
  "createdAt": "2025-03-23T00:00:00.000Z",
  "updatedAt": "2025-03-23T02:00:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid communication data
- `404 Not Found`: Communication not found
- `500 Server Error`: Server error

### 8. Delete Communication by ID

**Endpoint:** `DELETE /api/communications/:id`

**Description:** Deletes a specific communication by its MongoDB ID.

**Parameters:**

- `id` (string, required): MongoDB ID of the communication

**Response (200 OK):**

```json
{
  "message": "Communication deleted successfully"
}
```

**Error Responses:**

- `404 Not Found`: Communication not found
- `500 Server Error`: Server error

## Message Types

The Communication API supports the following message types:

- `email`: Email communications
- `SMS`: Text message communications
- `notification`: In-app notifications

## Thread Management

Threads are used to group related communications together. When creating a new message:

1. You can specify an existing ThreadId to add the message to that thread
2. If no ThreadId is provided when using the `/thread` endpoint, a new thread will be automatically created
3. All messages in a thread can be retrieved using the thread ID
