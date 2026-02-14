import { faker } from '@faker-js/faker';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/lib/server/db/schema';
import { randomBytes } from 'crypto';
import 'dotenv/config';

// Create database connection for script
if (!process.env.DATABASE_URL) {
	console.error('❌ Error: DATABASE_URL is not set in .env file');
	process.exit(1);
}

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client, { schema });

// Generate a unique ID similar to nanoid
function generateId(length = 21) {
	const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const bytes = randomBytes(length);
	let id = '';
	for (let i = 0; i < length; i++) {
		id += charset[bytes[i] % charset.length];
	}
	return id;
}

/**
 * Database Form Submission Seeder
 *
 * Seeds a form with test submission data directly in the database
 * (bypasses API and rate limiting)
 *
 * Usage:
 *   bun scripts/seed-submissions-db.ts <form-id> [count]
 *
 * Examples:
 *   bun scripts/seed-submissions-db.ts T1ltMGAx4UA6mekOozqTI
 *   bun scripts/seed-submissions-db.ts T1ltMGAx4UA6mekOozqTI 20
 */

// Get command line arguments
const formId = process.argv[2];
const count = parseInt(process.argv[3] || '10');

if (!formId) {
	console.error('❌ Error: Form ID is required');
	console.log('\nUsage:');
	console.log('  bun scripts/seed-submissions-db.ts <form-id> [count]');
	console.log('\nExample:');
	console.log('  bun scripts/seed-submissions-db.ts T1ltMGAx4UA6mekOozqTI');
	process.exit(1);
}

console.log(`\n🌱 Seeding ${count} submissions to database...`);
console.log(`📍 Form ID: ${formId}\n`);

// Generate realistic form data
function generateSubmissionData() {
	const firstName = faker.person.firstName();
	const lastName = faker.person.lastName();
	const email = faker.internet.email({ firstName, lastName });
	const fullName = `${firstName} ${lastName}`;

	// Various form field patterns
	const fieldPatterns = [
		{
			name: fullName,
			email,
			message: faker.lorem.paragraph(),
			phone: faker.phone.number(),
		},
		{
			firstName,
			lastName,
			email,
			subject: faker.lorem.sentence(),
			message: faker.lorem.paragraphs(2),
		},
		{
			name: fullName,
			email,
			company: faker.company.name(),
			message: faker.lorem.paragraph(),
			website: faker.internet.url(),
		},
		{
			fullName,
			email,
			phone: faker.phone.number(),
			reason: faker.helpers.arrayElement(['Support', 'Sales', 'Partnership', 'Other']),
			message: faker.lorem.paragraph(),
		},
		{
			name: fullName,
			email,
			message: faker.lorem.sentences(3),
		},
	];

	const data = faker.helpers.arrayElement(fieldPatterns);

	return {
		email,
		name: fullName,
		data,
	};
}

// Generate device/browser info
function generateMetadata() {
	const devices = [
		{ device: 'Desktop', deviceType: 'Windows PC', os: 'Windows 11' },
		{ device: 'Desktop', deviceType: 'MacBook Pro', os: 'macOS 14.2' },
		{ device: 'Mobile', deviceType: 'iPhone 15', os: 'iOS 17.2' },
		{ device: 'Mobile', deviceType: 'Samsung Galaxy', os: 'Android 14' },
		{ device: 'Tablet', deviceType: 'iPad Pro', os: 'iPadOS 17.2' },
	];

	const browsers = [
		'Chrome 120',
		'Safari 17',
		'Firefox 121',
		'Edge 120',
		'Arc 1.23',
	];

	const deviceInfo = faker.helpers.arrayElement(devices);
	const browser = faker.helpers.arrayElement(browsers);

	return {
		...deviceInfo,
		browser,
		ipAddress: faker.internet.ipv4(),
		userAgent: faker.internet.userAgent(),
		referer: faker.helpers.arrayElement([
			'https://www.google.com',
			'https://twitter.com',
			'https://www.linkedin.com',
			null,
		]),
		isRobot: false,
	};
}

// Generate submission status
function generateStatus() {
	const statusOptions = [
		{ status: 'new', isRead: false, isClosed: false, isSpam: false },
		{ status: 'read', isRead: true, isClosed: false, isSpam: false },
		{ status: 'resolved', isRead: true, isClosed: true, isSpam: false },
		{ status: 'new', isRead: false, isClosed: false, isSpam: true },
	];

	// Weight towards new/unread submissions (80% new, 10% read, 5% resolved, 5% spam)
	const weights = [80, 10, 5, 5];
	const random = Math.random() * 100;
	let cumulative = 0;

	for (let i = 0; i < weights.length; i++) {
		cumulative += weights[i];
		if (random <= cumulative) {
			return statusOptions[i];
		}
	}

	return statusOptions[0];
}

// Generate a random timestamp within the last 30 days
function generateTimestamp() {
	const now = new Date();
	const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
	return faker.date.between({ from: thirtyDaysAgo, to: now });
}

// Main seeding function
async function seedSubmissions() {
	try {
		const submissions = [];

		for (let i = 0; i < count; i++) {
			const { email, name, data } = generateSubmissionData();
			const metadata = generateMetadata();
			const status = generateStatus();
			const createdAt = generateTimestamp();

			const submissionData = {
				id: generateId(),
				formId,
				email,
				name,
				data,
				...status,
				...metadata,
				createdAt,
				updatedAt: createdAt,
			};

			submissions.push(submissionData);
		}

		// Batch insert all submissions
		console.log('💾 Inserting submissions into database...\n');
		await db.insert(schema.submission).values(submissions);

		// Show what was created
		submissions.forEach((sub, i) => {
			const statusEmoji = sub.isSpam ? '🚫' : sub.status === 'resolved' ? '✅' : sub.status === 'read' ? '👁️' : '📧';
			console.log(`${statusEmoji} Submission ${i + 1}/${count} - ${sub.email} (${sub.status})`);
		});

		console.log('\n' + '='.repeat(50));
		console.log(`✨ Seeding complete!`);
		console.log(`   Total: ${count} submissions`);
		console.log('='.repeat(50) + '\n');

		// Close database connection
		await client.end();
		process.exit(0);
	} catch (error) {
		console.error('\n❌ Seeding failed:', error);
		await client.end();
		process.exit(1);
	}
}

// Run the seeder
seedSubmissions();
