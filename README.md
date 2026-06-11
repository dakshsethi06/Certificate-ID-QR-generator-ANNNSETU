# Annsetu Certificate Generator & Verifier

A serverless web application built for PN Annsetu Networks to generate uniquely identifiable certificates, embed QR codes onto them, and provide a secure public verification portal. 

## 🌟 Features

- **Dynamic Uploads:** Upload any raw certificate template (PNG, JPG, JPEG).
- **Recipient Details:** Capture the recipient's Name and Position/Role to store in the database.
- **Visual Position Editor:** Drag and drop the QR + ID stamp exactly where you want it on the certificate.
- **Size Scaling:** Adjust the size of the QR stamp using a built-in slider to fit any design.
- **Instant Generation:** Generates a secure, unique `PAN-XXXXX-XXXXX` ID and embeds a scannable QR code directly onto the image via HTML5 Canvas.
- **Serverless Database:** Uses Netlify Blobs for fast, zero-config key-value storage of authentic certificates.
- **Public Verification Page:** Scanning the QR code takes users to a secure page that validates the certificate against the database and displays the recipient's details.
- **Admin Dashboard:** A secured portal (`/admin.html`) to view all issued certificates and revoke/delete invalid ones.

## 🛠️ Tech Stack

- **Frontend:** Vanilla HTML, CSS (Custom Annsetu brand design), JavaScript, HTML5 Canvas
- **Backend:** Netlify Serverless Functions (`Node.js`)
- **Database:** Netlify Blobs (Key-Value Store)
- **Libraries:** `qrcode.js` (Client-side QR generation)

## 🚀 Deployment (Netlify)

This project is built to run perfectly on Netlify's free tier. 

1. Push this repository to GitHub.
2. Connect the repository to Netlify.
3. The `netlify.toml` file will automatically configure the build settings and serverless functions.
4. **Enable Blobs:** Ensure that Netlify Blobs are available for your site (usually automatic for serverless functions).

### Environment Variables

To secure the Admin Dashboard (`/admin.html`), set the following environment variables in your Netlify Site Configuration (under **Build & deploy > Environment**):

- `ADMIN_USERNAME`: Your chosen admin username (Fallback: `admin`)
- `ADMIN_PASSWORD`: Your chosen secure password (Fallback: `admin123`)

*Note: You must trigger a new deploy after changing environment variables for them to take effect.*

## 💻 Local Development

If you want to run the project locally on your machine:

1. You must use a local web server (opening `index.html` directly in the browser will block the Canvas API due to CORS).
2. A simple Node.js server is included. Run it using:
   ```bash
   node serve.js
   ```
3. Open `http://localhost:8080`.
*(Note: The local `serve.js` saves data to a local `certificates.json` file. It does not connect to your live Netlify database).*

---
*© 2026 PN ANNSETU NETWORKS PRIVATE LIMITED.*
