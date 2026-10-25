# Northstar Private Client Workspace

A fictional document operations portal built with a Java API and Node.js frontend. It includes realistic-looking sample documents, activity, and intentionally weak cryptography for local CBOM/security scanner demos. All names, records, and credentials are fake. No cdxgen integration is included.

## Requirements

- JDK 17 or newer
- Node.js 18 or newer

## Start in the background (macOS/Linux)

From the repository root, compile the Java API and start both services:

```sh
mkdir -p backend/build
javac -d backend/build backend/src/main/java/demo/crypto/CryptoDemoServer.java
nohup java -cp backend/build demo.crypto.CryptoDemoServer >/dev/null 2>&1 & echo "Java PID: $!"
nohup node frontend/server.js >/dev/null 2>&1 & echo "Node PID: $!"
```

Open **http://localhost:3000** for the workspace dashboard. **http://localhost:8081** is the Java API status page; its data is also available at `/api/dashboard`.

Stop the services with the PID numbers printed above:

```sh
kill JAVA_PID NODE_PID
```
