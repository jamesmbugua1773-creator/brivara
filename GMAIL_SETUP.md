# Gmail SMTP Setup for Brivara

This guide shows how to configure Gmail as your email provider for Brivara.

## Step 1: Enable 2-Factor Authentication (Required)

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Sign in with the Gmail account you want to use
3. Scroll to **"How you sign in to Google"**
4. Click **"2-Step Verification"**
5. Follow the prompts to enable 2FA

## Step 2: Generate an App Password

Once 2FA is enabled:

1. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
2. Sign in again if prompted
3. Select **"Mail"** from the dropdown
4. Select **"Windows Computer"** (or your device)
5. Click **"Generate"**
6. Google will show a 16-character password (something like: `abcd efgh ijkl mnop`)
7. **Copy this password** (without spaces)

## Step 3: Configure Brivara Backend

Edit `backend/.env`:

```bash
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-gmail@gmail.com"
SMTP_PASS="abcdefghijklmnop"
EMAIL_FROM="noreply@brivara.com"
WEBSITE_URL="http://localhost:3000"
```

Replace:
- `your-gmail@gmail.com` with your Gmail address
- `abcdefghijklmnop` with the 16-character app password (no spaces)
- `noreply@brivara.com` with your desired sender email
- `http://localhost:3000` with your actual website URL (for email links)

## Step 4: Test It

### Register a new account:
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "SecurePass123",
    "country": "US",
    "sponsorCode": "admin123"
  }'
```

You should receive a **registration confirmation email** at `test@example.com`.

### Test password reset:
```bash
curl -X POST http://localhost:4000/api/auth/forgot \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

You should receive a **password reset email** with a link.

## Emails Sent Automatically

Once configured, the system sends:

1. **On Account Creation**: Welcome email with account details
2. **On Deposit Confirmation**: Email showing deposit amount + status
3. **On Withdrawal Completion**: Email showing withdrawal details + tx hash
4. **On Password Reset Request**: Email with reset link + token
5. **On Password Reset Success**: Confirmation email

## Troubleshooting

### "Invalid login credentials"
- Verify the 16-character app password (no spaces)
- Confirm you used the **app password**, not your regular Gmail password
- Check 2FA is actually enabled

### "Less secure apps" error
- Google has disabled this. Use **App Passwords** instead
- If you're still getting errors, ensure 2FA is fully enabled

### "SMTP connection timeout"
- Check your firewall allows port 587 outgoing
- Try a different port: 465 (secure) or 25 (less common)
- Verify `SMTP_HOST` is exactly `smtp.gmail.com`

### Emails not arriving
- Check spam/junk folder
- Verify email address is correct in `.env`
- Look at backend logs for send errors

## Production Checklist

- [ ] Gmail account has strong password
- [ ] 2FA is enabled
- [ ] App password is 16 characters (no spaces)
- [ ] `.env` is not committed to Git
- [ ] Email domain is properly configured (`EMAIL_FROM`)
- [ ] Website URL is correct for reset links
- [ ] Test all 5 email types before going live
- [ ] Monitor email bounce rates

## Alternative Email Providers

If you prefer not to use Gmail:

- **SendGrid**: [sendgrid.com](https://sendgrid.com) - $20/mo, high volume
- **Mailgun**: [mailgun.com](https://mailgun.com) - $0.50/mo per email
- **AWS SES**: [aws.amazon.com/ses](https://aws.amazon.com/ses) - $0.10/1000 emails
- **Ethereal** (dev only): Free SMTP for testing

Each requires updating `SMTP_HOST` and credentials in `.env`.

## Help

If you encounter issues:
1. Check backend logs: `tail -f backend/server.log`
2. Verify Gmail security settings: [myaccount.google.com/security](https://myaccount.google.com/security)
3. Test SMTP connection manually using Telnet or a tool
