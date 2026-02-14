import Mailgun from 'mailgun.js';
import formData from 'form-data';
import { env } from '$env/dynamic/private';

const mailgun = new Mailgun(formData);

// Initialize Mailgun client
const getMailgunClient = () => {
	if (!env.MAILGUN_API_KEY || !env.MAILGUN_DOMAIN) {
		throw new Error('Mailgun is not configured. Please set MAILGUN_API_KEY and MAILGUN_DOMAIN in .env');
	}

	return mailgun.client({
		username: 'api',
		key: env.MAILGUN_API_KEY
	});
};

interface SendEmailOptions {
	to: string;
	subject: string;
	html: string;
	text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
	const fromEmail = env.MAILGUN_FROM_EMAIL || 'noreply@example.com';
	const fromName = env.MAILGUN_FROM_NAME || 'App';

	const mg = getMailgunClient();

	try {
		console.log(`📧 Sending email via Mailgun to: ${to}`);
		console.log(`📧 From: ${fromName} <${fromEmail}>`);
		console.log(`📧 Domain: ${env.MAILGUN_DOMAIN}`);

		const result = await mg.messages.create(env.MAILGUN_DOMAIN!, {
			from: `${fromName} <${fromEmail}>`,
			to: [to],
			subject,
			html,
			text: text || html.replace(/<[^>]*>/g, '') // Strip HTML tags for plain text fallback
		});

		console.log(`✅ Email sent successfully! Message ID: ${result.id}`);
		return { success: true, messageId: result.id };
	} catch (error) {
		console.error('❌ Failed to send email:', error);
		throw error;
	}
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
	const subject = 'Reset Your Password';
	const html = `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="utf-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Reset Your Password</title>
		</head>
		<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
			<div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
				<h1 style="color: white; margin: 0; font-size: 24px;">Reset Your Password</h1>
			</div>

			<div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
				<p style="font-size: 16px; margin-bottom: 20px;">
					Hello,
				</p>

				<p style="font-size: 16px; margin-bottom: 20px;">
					We received a request to reset your password. Click the button below to create a new password:
				</p>

				<div style="text-align: center; margin: 30px 0;">
					<a href="${resetUrl}" style="display: inline-block; background: linear-gradient(to bottom right, #10b981, #059669); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 500; font-size: 16px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
						Reset Password
					</a>
				</div>

				<p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
					Or copy and paste this link into your browser:
				</p>

				<p style="font-size: 14px; color: #10b981; word-break: break-all; background: #f3f4f6; padding: 12px; border-radius: 4px;">
					${resetUrl}
				</p>

				<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

				<p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
					<strong>This link will expire in 1 hour.</strong>
				</p>

				<p style="font-size: 14px; color: #6b7280;">
					If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
				</p>
			</div>

			<div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
				<p>© ${new Date().getFullYear()} ${env.MAILGUN_FROM_NAME || 'Your App'}. All rights reserved.</p>
			</div>
		</body>
		</html>
	`;

	return sendEmail({ to, subject, html });
}

export async function sendVerificationEmail(to: string, verificationUrl: string) {
	const subject = 'Verify Your Email Address';
	const html = `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="utf-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Verify Your Email</title>
		</head>
		<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
			<div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
				<h1 style="color: white; margin: 0; font-size: 24px;">Verify Your Email</h1>
			</div>

			<div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
				<p style="font-size: 16px; margin-bottom: 20px;">
					Hello,
				</p>

				<p style="font-size: 16px; margin-bottom: 20px;">
					Thank you for registering! Please verify your email address by clicking the button below:
				</p>

				<div style="text-align: center; margin: 30px 0;">
					<a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(to bottom right, #10b981, #059669); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 500; font-size: 16px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
						Verify Email Address
					</a>
				</div>

				<p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
					Or copy and paste this link into your browser:
				</p>

				<p style="font-size: 14px; color: #10b981; word-break: break-all; background: #f3f4f6; padding: 12px; border-radius: 4px;">
					${verificationUrl}
				</p>

				<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

				<p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
					<strong>This link will expire in 24 hours.</strong>
				</p>

				<p style="font-size: 14px; color: #6b7280;">
					If you didn't create an account, you can safely ignore this email.
				</p>
			</div>

			<div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
				<p>© ${new Date().getFullYear()} ${env.MAILGUN_FROM_NAME || 'Your App'}. All rights reserved.</p>
			</div>
		</body>
		</html>
	`;

	return sendEmail({ to, subject, html });
}
