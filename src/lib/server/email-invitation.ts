import { sendEmail } from './email';
import { env } from '$env/dynamic/private';

export async function sendInvitationEmail(
	to: string,
	inviterName: string,
	spaceName: string,
	invitationUrl: string
) {
	const subject = `You've been invited to join ${spaceName}`;
	const html = `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="utf-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Space Invitation</title>
		</head>
		<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
			<div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
				<h1 style="color: white; margin: 0; font-size: 24px;">Space Invitation</h1>
			</div>

			<div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
				<p style="font-size: 16px; margin-bottom: 20px;">
					Hello,
				</p>

				<p style="font-size: 16px; margin-bottom: 20px;">
					<strong>${inviterName}</strong> has invited you to join the space <strong>"${spaceName}"</strong>.
				</p>

				<p style="font-size: 16px; margin-bottom: 20px;">
					Click the button below to accept the invitation and join the space:
				</p>

				<div style="text-align: center; margin: 30px 0;">
					<a href="${invitationUrl}" style="display: inline-block; background: linear-gradient(to bottom right, #10b981, #059669); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 500; font-size: 16px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
						Accept Invitation
					</a>
				</div>

				<p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
					Or copy and paste this link into your browser:
				</p>

				<p style="font-size: 14px; color: #10b981; word-break: break-all; background: #f3f4f6; padding: 12px; border-radius: 4px;">
					${invitationUrl}
				</p>

				<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

				<p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
					<strong>This invitation will expire in 7 days.</strong>
				</p>

				<p style="font-size: 14px; color: #6b7280;">
					If you don't have an account yet, you'll need to register first using this email address (${to}) to accept the invitation.
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
