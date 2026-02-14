import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user, organization, form, submission, contactSubmission } from '$lib/server/db/schema';
import { count, sql, gte, eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	// Parallel queries for all metrics
	const [
		totalUsersResult,
		totalSpacesResult,
		totalFormsResult,
		totalSubmissionsResult,
		verifiedUsersResult,
		pausedSpacesResult,
		unreadContactResult,
		signupsByDay,
		submissionsByDay,
		recentUsers,
		recentSubmissions
	] = await Promise.all([
		// Total counts
		db.select({ count: count() }).from(user),
		db.select({ count: count() }).from(organization),
		db.select({ count: count() }).from(form),
		db.select({ count: count() }).from(submission),

		// Verified users
		db
			.select({ count: count() })
			.from(user)
			.where(eq(user.emailVerified, true)),

		// Paused spaces
		db
			.select({ count: count() })
			.from(organization)
			.where(eq(organization.isPaused, true)),

		// Unread contact submissions
		db
			.select({ count: count() })
			.from(contactSubmission)
			.where(eq(contactSubmission.isRead, false)),

		// Signups over time (last 30 days)
		db
			.select({
				date: sql<string>`DATE(${user.createdAt})`.as('date'),
				count: count()
			})
			.from(user)
			.where(gte(user.createdAt, thirtyDaysAgo))
			.groupBy(sql`DATE(${user.createdAt})`)
			.orderBy(sql`DATE(${user.createdAt})`),

		// Submissions over time (last 30 days)
		db
			.select({
				date: sql<string>`DATE(${submission.createdAt})`.as('date'),
				count: count()
			})
			.from(submission)
			.where(gte(submission.createdAt, thirtyDaysAgo))
			.groupBy(sql`DATE(${submission.createdAt})`)
			.orderBy(sql`DATE(${submission.createdAt})`),

		// Recent users (last 5)
		db
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				image: user.image,
				createdAt: user.createdAt,
				emailVerified: user.emailVerified
			})
			.from(user)
			.orderBy(desc(user.createdAt))
			.limit(5),

		// Recent submissions (last 5)
		db
			.select({
				id: submission.id,
				email: submission.email,
				name: submission.name,
				createdAt: submission.createdAt,
				formId: submission.formId,
				isSpam: submission.isSpam
			})
			.from(submission)
			.orderBy(desc(submission.createdAt))
			.limit(5)
	]);

	return {
		metrics: {
			totalUsers: totalUsersResult[0]?.count ?? 0,
			totalSpaces: totalSpacesResult[0]?.count ?? 0,
			totalForms: totalFormsResult[0]?.count ?? 0,
			totalSubmissions: totalSubmissionsResult[0]?.count ?? 0,
			verifiedUsers: verifiedUsersResult[0]?.count ?? 0,
			pausedSpaces: pausedSpacesResult[0]?.count ?? 0,
			unreadContact: unreadContactResult[0]?.count ?? 0
		},
		charts: {
			signupsByDay,
			submissionsByDay
		},
		recent: {
			users: recentUsers,
			submissions: recentSubmissions
		}
	};
};
