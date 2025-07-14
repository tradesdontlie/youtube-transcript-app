# OAuth2 Setup Instructions

## Step 1: Create OAuth2 Credentials

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Select your project** (or create a new one)
3. **Enable YouTube Data API v3**:
   - Go to "APIs & Services" > "Library"
   - Search for "YouTube Data API v3"
   - Click "Enable"

## Step 2: Create OAuth2 Client ID

1. **Go to "APIs & Services" > "Credentials"**
2. **Click "Create Credentials" > "OAuth 2.0 Client ID"**
3. **Configure the OAuth consent screen** (if prompted):
   - User Type: External
   - App name: "YouTube Transcript App"
   - User support email: Your email
   - Scopes: Add `youtube.readonly` and `youtube.force-ssl`
4. **Create OAuth2 Client ID**:
   - Application type: **Web application**
   - Name: "YouTube Transcript App"
   - Authorized redirect URIs: `http://localhost:3000/auth/callback`

## Step 3: Download Credentials

1. **Download the JSON file** from the credentials page
2. **Rename it to `credentials.json`**
3. **Place it in the root directory** of your project

## Step 4: Authenticate

1. **Start your server**: `npm start`
2. **Visit**: http://localhost:3000/auth
3. **Sign in with Google** and grant permissions
4. **You'll be redirected back** with authentication complete

## Step 5: Test

```bash
curl http://localhost:3000/api/auth/status
```

Should show `"authenticated": true`

## API Endpoints

- `GET /auth` - Start OAuth2 flow
- `GET /auth/callback` - OAuth2 callback
- `GET /api/auth/status` - Check authentication status
- `POST /api/auth/logout` - Clear tokens

## Scopes Required

- `https://www.googleapis.com/auth/youtube.readonly`
- `https://www.googleapis.com/auth/youtube.force-ssl`

## Notes

- Tokens are automatically refreshed
- Tokens are saved in `./data/youtube-oauth-token.json`
- You'll need to re-authenticate if tokens expire and refresh fails