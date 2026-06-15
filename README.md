# Annsetu Certificate Generator & Verifier

A serverless web application built for **PN Annsetu Networks** to generate uniquely identifiable certificates, embed QR codes onto them, and provide a secure public verification portal.

**Live:** [qrcodegeneratorannsetu.netlify.app](https://qrcodegeneratorannsetu.netlify.app)

---

## 🌟 Features

### Certificate Generation
- **Secured Generator** — Basic Auth–protected page prevents unauthorized certificate generation
- **Dynamic Uploads** — Upload any certificate template (PNG, JPG, JPEG)
- **Recipient Details** — Capture name and position/role, stored in the database
- **Duplicate Prevention** — Case-insensitive duplicate name check prevents issuing multiple certificates to the same person
- **Visual Position Editor** — Drag-and-drop the QR + ID stamp exactly where you want it
- **Size & Opacity Controls** — Adjust the stamp size and transparency with built-in sliders
- **Instant Generation** — Generates a unique sequential ID (e.g., `PAN-INT-2026-001`) and embeds a scannable QR code via HTML5 Canvas
- **Employee Types** — Supports both Intern (`INT`) and Employee (`EMP`) certificate types

### Verification
- **Public Verification Page** — Scanning the QR code validates the certificate against the database and displays the recipient's details
- **Real-time Status** — Shows whether a certificate is authentic or invalid
- **XSS-Safe Rendering** — Securely escapes recipient details and query inputs before rendering.

### Admin Dashboard (`/admin.html`)
- **Secured Login** — Basic Auth–protected admin portal
- **Filter Tabs** — View all certificates, or filter by Interns / Employees with live counts
- **Type Badges** — Each row shows a color-coded Intern/Employee badge
- **Certificate Revocation** — Permanently revoke and delete invalid certificates
- **Refresh Data** — Live reload from the database

---

## 🔒 Security Features
- **Strict Endpoint Authentication** — Netlify endpoints (`/api/next-id`, `/api/store`, `/api/list`, `/api/delete`) require Basic Auth header validation matched against server-side environment credentials.
- **XSS Protections** — Custom HTML/JS escaping helpers applied before rendering database contents on `/admin.html` and inputs on `/verify.html`.
- **SQL Injection Prevention** — Full parameterized queries (`$1`, `$2`, etc.) used in all pool client queries.
- **Strict Input Validation** — Pattern matching on inputs (e.g., verification ID regex checks) and size limits.
- **Secure Error Handling** — Generic client responses used instead of leaking raw DB internals.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla HTML, CSS, JavaScript, HTML5 Canvas |
| **Backend** | Netlify Serverless Functions (Node.js) |
| **Database** | PostgreSQL (Neon) |
| **Libraries** | `qrcode.js` (client-side QR generation), `pg` (PostgreSQL client) |

---

## 📁 Project Structure

```
├── index.html                    # Certificate generator page
├── verify.html                   # Public certificate verification page
├── admin.html                    # Admin dashboard (protected)
├── script.js                     # Frontend logic (upload, drag, canvas rendering)
├── style.css                     # Global styles (Annsetu brand design)
├── icon-512.png                  # Annsetu logo
├── netlify.toml                  # Netlify build & function config
├── package.json                  # Dependencies (pg)
├── .env.example                  # Environment variable template
├── api/                          # Vercel Serverless Functions
│   ├── delete.mjs                # Revoke/delete certificate (admin, auth required)
│   ├── list.mjs                  # List all certificates (admin, auth required)
│   ├── next-id.mjs               # Generate next sequential certificate ID
│   ├── store.mjs                 # Store/update certificate details
│   └── verify.mjs                # Verify certificate by ID
└── netlify/functions/            # Netlify Serverless Functions (duplicated for Netlify)
    ├── delete.mjs
    ├── list.mjs
    ├── next-id.mjs
    ├── store.mjs
    └── verify.mjs
```

---

## 🚀 Deployment

This project supports seamless deployment on both **Vercel** and **Netlify** using their free tiers.

### Option A: Vercel (Recommended Alternative)

If Netlify limits are reached, Vercel is the recommended hosting platform:
1. Push this repository to GitHub.
2. Go to [Vercel](https://vercel.com) and click **Add New Project**.
3. Import your GitHub repository.
4. Vercel automatically detects the static files and the `/api/` directory (containing serverless functions).
5. Add the required **Environment Variables** (see table below) in Vercel.
6. Click **Deploy**.

### Option B: Netlify

1. Push this repository to GitHub.
2. Connect the repository to a new Netlify site.
3. The `netlify.toml` file auto-configures the build settings and serverless functions under `netlify/functions/`.
4. Add the required **Environment Variables** (see table below) in Netlify.
5. Click **Deploy**.

### Environment Variables

Set the following in **Netlify → Site configuration → Environment variables**:

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (e.g., from [Neon](https://neon.tech)) | *Required* |
| `ADMIN_USERNAME` | Admin dashboard username | `admin` |
| `ADMIN_PASSWORD` | Admin dashboard password | `admin123` |

> ⚠️ **Important:** You must trigger a new deploy after changing environment variables.

### Database Setup

1. Create a free PostgreSQL database on [Neon](https://neon.tech) (or any PostgreSQL provider).
2. Copy the connection string and set it as `DATABASE_URL` on Netlify.
3. The `certificates` table is auto-created on the first request.

---

## 💻 Local Development

To run locally, use the [Netlify CLI](https://docs.netlify.com/cli/get-started/):

```bash
npm install
npx netlify dev
```

Create a `.env` file from the template:
```bash
cp .env.example .env
```

Then update `DATABASE_URL` in `.env` with your PostgreSQL connection string.

---

*© 2026 PN ANNSETU NETWORKS PRIVATE LIMITED.*
