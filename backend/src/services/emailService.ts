import nodemailer from 'nodemailer'

const createTransporter = () => {
  if (process.env.NODE_ENV === 'production') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  }
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: { user: process.env.ETHEREAL_USER || 'your-ethereal-user', pass: process.env.ETHEREAL_PASS || 'your-ethereal-pass' },
  })
}

const BRAND_COLOR = '#00d4aa'
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@brivara.com'
const WEBSITE_URL = process.env.WEBSITE_URL || 'https://brivara.com'

function emailTemplate(title: string, content: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 28px; }
          .brand { color: ${BRAND_COLOR}; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .content h2 { color: ${BRAND_COLOR}; margin-top: 0; }
          .button { display: inline-block; padding: 12px 30px; background: ${BRAND_COLOR}; color: #1a1a2e; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 15px 0; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; }
          .code-box { background: #f0f0f0; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 14px; text-align: center; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Brivara <span class="brand">✓</span></h1>
            <p>${title}</p>
          </div>
          <div class="content">
            ${content}
            <div class="footer">
              <p>Best regards,<br><strong>Brivara Team</strong></p>
              <p>Making Success A Way of Life</p>
              <p><a href="${WEBSITE_URL}" style="color: ${BRAND_COLOR}; text-decoration: none;">Visit Brivara</a></p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}

export async function sendRegistrationEmail(email: string, username: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Dev: Account created for ${email} (${username})`)
    return
  }
  const transporter = createTransporter()
  const content = `
    <h2>Welcome to Brivara, ${username}! 🎉</h2>
    <p>Your account has been successfully created.</p>
    <p>You're now ready to:</p>
    <ul>
      <li>Deposit funds and start earning</li>
      <li>Activate packages and grow your portfolio</li>
      <li>Refer friends and earn bonuses</li>
      <li>Withdraw your earnings anytime</li>
    </ul>
    <p><a href="${WEBSITE_URL}/login" class="button">Log In Now</a></p>
    <p><strong>Account Details:</strong><br>
    Email: ${email}<br>
    Username: ${username}</p>
  `
  await transporter.sendMail({
    from: EMAIL_FROM,
    to: email,
    subject: 'Welcome to Brivara! Account Created Successfully',
    html: emailTemplate('Account Created Successfully', content),
  })
}

export async function sendPasswordResetEmail(email: string, resetToken: string, resetLink?: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Dev: Password reset requested for ${email}, token: ${resetToken}`)
    return
  }
  const transporter = createTransporter()
  const link = resetLink || `${WEBSITE_URL}/reset-password/${resetToken}`
  const content = `
    <h2>Password Reset Request</h2>
    <p>We received a request to reset the password for your Brivara account.</p>
    <p>Click the button below to reset your password:</p>
    <p><a href="${link}" class="button">Reset Password</a></p>
    <p><strong>Or use this code:</strong></p>
    <div class="code-box">${resetToken}</div>
    <p>This link expires in 1 hour.</p>
    <p><strong>Didn't request this?</strong><br>
    If you didn't request a password reset, please ignore this email. Your account is secure.</p>
  `
  await transporter.sendMail({
    from: EMAIL_FROM,
    to: email,
    subject: 'Reset Your Brivara Password',
    html: emailTemplate('Password Reset Request', content),
  })
}

export async function sendPasswordResetConfirmEmail(email: string, username: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Dev: Password reset completed for ${email}`)
    return
  }
  const transporter = createTransporter()
  const content = `
    <h2>Password Changed Successfully ✓</h2>
    <p>Hello ${username},</p>
    <p>Your Brivara account password has been successfully updated.</p>
    <p>If you didn't make this change, please <a href="${WEBSITE_URL}/support" style="color: ${BRAND_COLOR};">contact support</a> immediately.</p>
    <p><a href="${WEBSITE_URL}/login" class="button">Log In With New Password</a></p>
  `
  await transporter.sendMail({
    from: EMAIL_FROM,
    to: email,
    subject: 'Your Brivara Password Has Been Changed',
    html: emailTemplate('Password Reset Successful', content),
  })
}

export async function sendDepositEmail(email: string, amount: number, network: string, txId: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Dev: Deposit confirmed for ${email}: $${amount} on ${network}, TxID: ${txId}`)
    return
  }
  const transporter = createTransporter()
  const content = `
    <h2>Deposit Confirmed! 💰</h2>
    <p>Your deposit has been successfully confirmed on the blockchain.</p>
    <p><strong>Deposit Details:</strong></p>
    <ul>
      <li>Amount: <strong>$${amount.toFixed(2)}</strong></li>
      <li>Network: <strong>${network}</strong></li>
      <li>Transaction ID: <strong>${txId}</strong></li>
    </ul>
    <p>Your funds have been credited to your Brivara wallet and are ready to use.</p>
    <p><a href="${WEBSITE_URL}/dashboard" class="button">View Wallet</a></p>
  `
  await transporter.sendMail({
    from: EMAIL_FROM,
    to: email,
    subject: 'Deposit Confirmed - Funds Credited',
    html: emailTemplate('Deposit Confirmed', content),
  })
}

export async function sendWithdrawalEmail(email: string, amount: number, network: string, txId: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Dev: Withdrawal completed for ${email}: $${amount} on ${network}, TxID: ${txId}`)
    return
  }
  const transporter = createTransporter()
  const content = `
    <h2>Withdrawal Completed! ✓</h2>
    <p>Your withdrawal has been successfully processed and sent to your wallet.</p>
    <p><strong>Withdrawal Details:</strong></p>
    <ul>
      <li>Amount: <strong>$${amount.toFixed(2)}</strong></li>
      <li>Network: <strong>${network}</strong></li>
      <li>Transaction ID: <strong>${txId}</strong></li>
    </ul>
    <p>Please check your wallet. The funds should arrive within a few minutes depending on network confirmation.</p>
    <p><a href="${WEBSITE_URL}/wallet" class="button">Check Wallet</a></p>
  `
  await transporter.sendMail({
    from: EMAIL_FROM,
    to: email,
    subject: 'Withdrawal Completed - Funds Sent',
    html: emailTemplate('Withdrawal Completed', content),
  })
}

