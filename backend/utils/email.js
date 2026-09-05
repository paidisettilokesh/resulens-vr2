import nodemailer from 'nodemailer';
import axios from 'axios';

/**
 * Generate a modern, branded HTML email template for password reset
 */
const getPasswordResetHtml = ({ name, resetUrl, expiryMinutes }) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your ResuLens Password</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0b0f19;
      color: #e2e8f0;
    }
    .wrapper {
      max-width: 580px;
      margin: 40px auto;
      background-color: #111827;
      border: 1px solid #1f2937;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    }
    .header {
      padding: 32px 40px 24px;
      border-bottom: 1px solid #1f2937;
      background: linear-gradient(180deg, #161f30 0%, #111827 100%);
    }
    .logo {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #38bdf8;
      text-decoration: none;
    }
    .content {
      padding: 36px 40px;
    }
    h1 {
      margin: 0 0 16px;
      font-size: 22px;
      font-weight: 700;
      color: #f8fafc;
      letter-spacing: -0.3px;
    }
    p {
      margin: 0 0 20px;
      font-size: 15px;
      line-height: 1.6;
      color: #94a3b8;
    }
    .btn-container {
      margin: 32px 0;
      text-align: center;
    }
    .btn {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      border-radius: 10px;
      box-shadow: 0 4px 14px rgba(14, 165, 233, 0.4);
    }
    .callout {
      background-color: #1e293b;
      border-left: 4px solid #38bdf8;
      padding: 14px 18px;
      border-radius: 6px;
      font-size: 13px;
      color: #cbd5e1;
      margin-bottom: 24px;
    }
    .fallback-url {
      word-break: break-all;
      font-size: 12px;
      color: #38bdf8;
      text-decoration: underline;
    }
    .footer {
      padding: 24px 40px;
      border-top: 1px solid #1f2937;
      background-color: #0b0f19;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">ResuLens<span style="color: #6366f1;">.ai</span></div>
    </div>
    <div class="content">
      <h1>Reset Your Password</h1>
      <p>Hello${name ? ' ' + name : ''},</p>
      <p>We received a request to reset the password for your ResuLens account. Click the button below to choose a new password:</p>
      
      <div class="btn-container">
        <a href="${resetUrl}" target="_blank" class="btn">Reset Password</a>
      </div>

      <div class="callout">
        ⏱️ <strong>Security Notice:</strong> This link is valid for <strong>${expiryMinutes} minutes</strong> and can only be used once.
      </div>

      <p style="font-size: 13px;">If the button above does not work, copy and paste this link into your browser:</p>
      <p><a href="${resetUrl}" class="fallback-url">${resetUrl}</a></p>

      <hr style="border: none; border-top: 1px solid #1f2937; margin: 28px 0;" />

      <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
        If you did not request this password reset, you can safely ignore this email. Your password will remain unchanged and your account is secure.
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} ResuLens. AI-Powered Career & Resume Intelligence. All rights reserved.
    </div>
  </div>
</body>
</html>
    `.trim();
};

/**
 * Generate HTML email template for password change confirmation
 */
const getPasswordChangedHtml = ({ name, date, ip }) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Your ResuLens Password Was Changed</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #e2e8f0; }
    .wrapper { max-width: 580px; margin: 40px auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; }
    .header { padding: 32px 40px 24px; border-bottom: 1px solid #1f2937; }
    .logo { font-size: 24px; font-weight: 800; color: #38bdf8; text-decoration: none; }
    .content { padding: 36px 40px; }
    h1 { margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #f8fafc; }
    p { margin: 0 0 18px; font-size: 14px; line-height: 1.6; color: #94a3b8; }
    .details { background-color: #1e293b; padding: 14px 18px; border-radius: 8px; font-size: 13px; color: #cbd5e1; margin: 20px 0; }
    .footer { padding: 20px 40px; border-top: 1px solid #1f2937; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">ResuLens<span style="color: #6366f1;">.ai</span></div>
    </div>
    <div class="content">
      <h1>Your Password Was Changed</h1>
      <p>Hello${name ? ' ' + name : ''},</p>
      <p>This is confirmation that the password for your ResuLens account was recently changed.</p>
      <div class="details">
        <div><strong>Time:</strong> ${date}</div>
        ${ip ? `<div><strong>IP Address:</strong> ${ip}</div>` : ''}
      </div>
      <p>All previous active sessions on other devices have been automatically logged out for your security.</p>
      <p style="color: #f87171; font-size: 13px;">
        <strong>Didn't make this change?</strong> Please reset your password immediately or contact our support team.
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} ResuLens. All rights reserved.
    </div>
  </div>
</body>
</html>
    `.trim();
};

/**
 * Send email using the configured provider (Resend HTTPS API, Nodemailer SMTP, or Dev fallback)
 */
export const sendEmail = async ({ to, subject, html, text }) => {
    const resendApiKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;
    const defaultFrom = resendApiKey ? 'ResuLens <onboarding@resend.dev>' : `ResuLens <${process.env.FROM_EMAIL || 'noreply@resulens.ai'}>`;
    const fromAddress = process.env.EMAIL_FROM || defaultFrom;
    const isProduction = process.env.NODE_ENV === 'production';

    // 1. Resend HTTP API (Primary recommended for production on cloud hosts like Render)
    if (resendApiKey || process.env.EMAIL_PROVIDER === 'resend') {
        if (!resendApiKey) {
            throw new Error('EMAIL_PROVIDER is set to resend but RESEND_API_KEY is missing');
        }
        try {
            const response = await axios.post(
                'https://api.resend.com/emails',
                {
                    from: fromAddress,
                    to: Array.isArray(to) ? to : [to],
                    subject,
                    html,
                    text
                },
                {
                    headers: {
                        Authorization: `Bearer ${resendApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 8000
                }
            );
            return { success: true, id: response.data?.id, provider: 'resend' };
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message;
            console.error('❌ Resend email delivery failed:', errorMsg);
            throw new Error(`Email provider failure: ${errorMsg}`);
        }
    }

    // 2. Custom / Configured SMTP Provider
    const hasSmtpCredentials = process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS;
    if (hasSmtpCredentials || process.env.EMAIL_PROVIDER === 'smtp') {
        const port = parseInt(process.env.SMTP_PORT || '587', 10);
        const secure = process.env.SMTP_SECURE === 'true' || port === 465;

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port,
            secure,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            connectionTimeout: 6000,
            greetingTimeout: 6000,
            socketTimeout: 8000
        });

        try {
            const info = await transporter.sendMail({
                from: fromAddress,
                to,
                subject,
                text,
                html
            });
            return { success: true, messageId: info.messageId, provider: 'smtp' };
        } catch (err) {
            console.error('❌ SMTP delivery failed (Render blocks outbound SMTP ports 25, 465, and 587 on free plans):', err.message);
            console.warn('⚠️ Preserving reset token and logging email to server logs:');
            console.log(`\n================== 📩 [RESULENS EMAIL LOG] ==================`);
            console.log(`To: ${to}`);
            console.log(`Subject: ${subject}`);
            console.log(`Content:\n${text}`);
            console.log(`=============================================================\n`);
            return { success: true, provider: 'smtp-fallback-log', warning: err.message };
        }
    }

    // 3. Fallback when no production email provider (RESEND_API_KEY or SMTP) is configured
    console.warn('⚠️ No email provider configured (RESEND_API_KEY or SMTP_USER). Email dispatched to server logs:');
    console.log(`\n================== 📩 [RESULENS EMAIL LOG] ==================`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content:\n${text}`);
    console.log(`=============================================================\n`);

    if (!isProduction) {
        // In local development, also attempt Ethereal for visual testing if possible
        try {
            let timeoutId;
            const testAccountPromise = nodemailer.createTestAccount();
            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error('Ethereal timeout')), 2500);
                if (timeoutId.unref) timeoutId.unref();
            });
            const testAccount = await Promise.race([testAccountPromise, timeoutPromise]).finally(() => {
                if (timeoutId) clearTimeout(timeoutId);
            });

            const transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: { user: testAccount.user, pass: testAccount.pass },
                connectionTimeout: 2500
            });

            const info = await transporter.sendMail({ from: fromAddress, to, subject, text, html });
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) console.log(`📩 [DEV PREVIEW URL]: ${previewUrl}`);
            return { success: true, previewUrl, provider: 'ethereal' };
        } catch {
            return { success: true, provider: 'console-fallback' };
        }
    }

    return { success: true, provider: 'console-log' };
};

/**
 * Dispatch Password Reset Email
 */
export const sendPasswordResetEmail = async ({ email, name, resetToken }) => {
    const appUrl = (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
    const expiryMinutes = 15;

    const subject = 'Reset Your ResuLens Password';
    const text = `Hello${name ? ' ' + name : ''},\n\nWe received a request to reset the password for your ResuLens account.\n\nPlease reset your password using the following link:\n${resetUrl}\n\nThis link will expire in ${expiryMinutes} minutes.\n\nIf you did not request this password reset, please ignore this email.`;
    const html = getPasswordResetHtml({ name, resetUrl, expiryMinutes });

    return await sendEmail({
        to: email,
        subject,
        text,
        html
    });
};

/**
 * Dispatch Password Changed Confirmation Email
 */
export const sendPasswordChangedEmail = async ({ email, name, ip }) => {
    const date = new Date().toUTCString();
    const subject = 'Your ResuLens password was changed';
    const text = `Hello${name ? ' ' + name : ''},\n\nYour ResuLens account password was successfully changed on ${date}.\n\nIf you did not make this change, please reset your password immediately and contact support.`;
    const html = getPasswordChangedHtml({ name, date, ip });

    return await sendEmail({
        to: email,
        subject,
        text,
        html
    });
};
