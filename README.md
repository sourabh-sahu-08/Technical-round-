# Valcura Backend API Integration Assessment

## Overview

This project is a small Express/TypeScript API designed for a backend integration assessment. It features a mock messaging provider, webhook handling capabilities, and duplicate event protection. The API allows you to send templated messages and receive delivery status events via webhooks, simulating a real-world messaging service integration.

## Project Structure

```text
valcura-assignment/
├── scripts/
│   └── verify.ts           # End-to-end verification script
├── src/
│   ├── provider/
│   │   └── mockProvider.ts # Mock messaging provider implementation
│   ├── routes/
│   │   ├── sendTemplate.ts # POST /send-template route
│   │   └── webhook.ts      # POST /webhooks/message route
│   ├── config.ts           # Environment variables and config loading
│   └── server.ts           # Express application setup and entry point
├── .env.example            # Example environment variables
├── .gitignore              # Git ignore file
├── package.json            # NPM dependencies and scripts
├── README.md               # Project documentation
└── tsconfig.json           # TypeScript configuration
```

## Prerequisites

Before you begin, ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (version 20 or higher)
- [Git](https://git-scm.com/)
- npm (comes with Node.js)

## Getting Started

### 1. Clone the Repository

First, clone the project to your local machine using Git:

```bash
git clone <repository-url>
cd <repository-directory>
```

*(Note: Replace `<repository-url>` and `<repository-directory>` with the actual URL and directory name of this repository.)*

### 2. Install Dependencies

Install all the required packages using npm:

```bash
npm install
```

### 3. Environment Setup

The application requires certain environment variables to function correctly. 

1. Copy the example environment file to create your own `.env` file:
   ```bash
   # On Linux/macOS
   cp .env.example .env
   
   # On Windows (Command Prompt/PowerShell)
   copy .env.example .env
   ```

2. Open the newly created `.env` file in your preferred text editor and fill in the values:
   
   - **`WEBHOOK_SECRET`** (Required): This is used to authenticate incoming webhook requests. The server will refuse to start without it. You can generate a secure random secret string using a password generator or by running this command in your terminal:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - **`MESSAGING_API_TOKEN`** (Optional): A token for the messaging provider. The mock provider included in this project works without it.

Example `.env` file:
```env
MESSAGING_API_TOKEN=your_mock_token_here
WEBHOOK_SECRET=your_super_secret_webhook_key
```

### 4. Running the Application

You can run the application in development or production mode.

**Development Mode:**
Runs the application directly using `ts-node`.
```bash
npm run dev
```

**Production Mode:**
Compiles the TypeScript code to JavaScript and runs the compiled output.
```bash
npm run build
npm start
```

### 5. Verification

To ensure everything is set up correctly, you can run the built-in verification script. This script starts the server on port 3001, runs a series of tests against the endpoints, and automatically shuts it down.

```bash
npm run verify
```

---

## API Documentation

### POST `/send-template`

Sends a templated message via the mock provider.

**Request Body:**
```json
{
  "to": "+919876543210",
  "templateName": "appointment_reminder",
  "parameters": ["Dr Sharma", "6:30 PM"]
}
```
*Note: Passing `"force_failure"` as the `templateName` will intentionally trigger a provider failure to test error handling.*

**Responses:**
- **202 Accepted** (Success):
  ```json
  { "messageId": "msg_abc123", "status": "accepted" }
  ```
- **400 Bad Request** (Validation Error):
  ```json
  { "error": "invalid_request" }
  ```
- **502 Bad Gateway** (Provider Failure):
  ```json
  { "error": "provider_error" }
  ```

---

### POST `/webhooks/message`

Receives a delivery status event from the messaging provider. It uses an in-memory `Set` to track and prevent duplicate event processing.

**Headers:**
- `x-webhook-secret`: Must match the `WEBHOOK_SECRET` in your `.env` file.

**Request Body:**
```json
{
  "eventId": "evt_001",
  "messageId": "msg_12345",
  "status": "delivered"
}
```
*Valid statuses: `sent`, `delivered`, `read`, `failed`*

**Responses:**
- **200 OK** (Successfully processed):
  ```json
  { "status": "processed", "processed": true }
  ```
- **200 OK** (Duplicate event - ignored):
  ```json
  { "status": "duplicate", "processed": false }
  ```
- **400 Bad Request** (Validation error):
  ```json
  { "error": "invalid_webhook" }
  ```
- **401 Unauthorized** (Missing or invalid secret):
  ```json
  { "error": "unauthorized" }
  ```

---

## Implementation Notes

- **No Database Needed:** Duplicate event tracking is handled via an in-memory `Set` for simplicity during this assessment.
- **Provider Abstraction:** The mock provider is isolated in `src/provider/mockProvider.ts`. It can be easily swapped out for a real provider implementation without having to alter the route logic.
- **Startup Validation:** The `WEBHOOK_SECRET` validation runs immediately at startup in `src/config.ts`. If the secret is missing, the process exits with status code `1`.
