# Production Apple & Google Wallet Certificates Setup Guide

This guide details how to generate, configure, and deploy production certificates for **Apple Wallet** (`.pkpass`) and **Google Wallet** passes in TapIt.

---

## 1. Apple Wallet Setup

Apple Wallet passes require a Pass Type ID Certificate issued by Apple Developer Portal and signed with your developer private key.

### Step 1: Pre-generated Key and CSR
The workspace contains pre-generated credentials in the `certs/` directory:
- `certs/pass.key` — Private RSA Key
- `certs/pass.csr` — Certificate Signing Request

> [!NOTE]
> `certs/` and all key files (`*.key`, `*.csr`, `*.pem`, `*.cer`, `*.p12`) are excluded from Git via `.gitignore` for security.

### Step 2: Create Pass Type ID in Apple Developer Console
1. Log in to [Apple Developer Console -> Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list/passTypeId).
2. Under **Identifiers**, select **Pass Type IDs** from the dropdown menu and click **+**.
3. Fill in:
   - **Description:** `TapIt Pass`
   - **Identifier:** `pass.in.man2web.tapit`
4. Click **Register**.

### Step 3: Issue Pass Certificate
1. Select your new Pass Type ID (`pass.in.man2web.tapit`) and click **Create Certificate**.
2. Upload the `certs/pass.csr` file from your project directory.
3. Click **Continue** and download the generated `pass.cer` file.

### Step 4: Convert Certificate and Update Environment
1. Place the downloaded `pass.cer` file into the project `certs/` folder (`certs/pass.cer`).
2. Run the automated setup script:
   ```bash
   ./scripts/convert-apple-cert.sh
   ```
3. The script converts `pass.cer` to `pass.pem` format and appends the following environment variables to `apps/web/.env.local`:
   ```env
   APPLE_PASS_TYPE_ID=pass.in.man2web.tapit
   APPLE_PASS_CERT="..."
   APPLE_PASS_KEY="..."
   ```

---

## 2. Google Wallet Setup

Google Wallet passes require a Google Pay Passes Issuer ID and a Google Service Account key for JWT signing.

### Step 1: Request Issuer ID
1. Log in to [Google Pay & Wallet Console](https://pay.google.com/business/console).
2. Request access to the **Google Wallet API**.
3. Once approved, copy your **Issuer ID** (e.g. `3388000000022345678`).

### Step 2: Create Service Account Key
1. Go to [Google Cloud Console -> Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts).
2. Create a Service Account (e.g. `tapit-wallet@your-project.iam.gserviceaccount.com`).
3. Click the created service account -> **Keys** -> **Add Key** -> **Create new key (JSON)**.
4. Download the service account JSON key file.
5. In [Google Pay Console](https://pay.google.com/business/console), go to **Users** and add the service account email with **Developer** permissions.

### Step 3: Add Credentials to Web Environment
Append the following variables to `apps/web/.env.local` (and your Vercel / Hostinger production environment):

```env
GOOGLE_WALLET_ISSUER_ID=3388000000022345678
GOOGLE_SERVICE_ACCOUNT_EMAIL=tapit-wallet@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

---

## 3. Verification

Once environment variables are populated:
1. Start the web server:
   ```bash
   pnpm web
   ```
2. Test Apple Wallet pass endpoint:
   `http://localhost:3000/api/wallet/apple/<username>`
3. Test Google Wallet save endpoint:
   `http://localhost:3000/api/wallet/google/<username>`
