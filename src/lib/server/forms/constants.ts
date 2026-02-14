/**
 * Form & Submission Constants
 */

export const SUBMISSION_STATUS = {
	NEW: 'new',
	READ: 'read',
	RESOLVED: 'resolved',
	SPAM: 'spam'
} as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUS)[keyof typeof SUBMISSION_STATUS];
