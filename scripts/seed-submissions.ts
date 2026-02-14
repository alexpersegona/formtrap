import { faker } from '@faker-js/faker';

/**
 * Form Submission Seeder
 *
 * Seeds a form with test submission data
 *
 * Usage:
 *   bun scripts/seed-submissions.ts <form-url> [count]
 *
 * Examples:
 *   bun scripts/seed-submissions.ts http://localhost:8080/forms/T1ltMGAx4UA6mekOozqTI
 *   bun scripts/seed-submissions.ts http://localhost:8080/forms/T1ltMGAx4UA6mekOozqTI 20
 */

// Get command line arguments
const formUrl = process.argv[2];
const count = parseInt(process.argv[3] || '10');

if (!formUrl) {
	console.error('❌ Error: Form URL is required');
	console.log('\nUsage:');
	console.log('  bun scripts/seed-submissions.ts <form-url> [count]');
	console.log('\nExample:');
	console.log('  bun scripts/seed-submissions.ts http://localhost:8080/forms/T1ltMGAx4UA6mekOozqTI');
	process.exit(1);
}

// Validate URL format
try {
	new URL(formUrl);
} catch (error) {
	console.error('❌ Error: Invalid URL format');
	console.error(`   Received: ${formUrl}`);
	process.exit(1);
}

console.log(`\n🌱 Seeding ${count} submissions to form...`);
console.log(`📍 URL: ${formUrl}\n`);

// Generate realistic form data
function generateSubmissionData() {
	const firstName = faker.person.firstName();
	const lastName = faker.person.lastName();
	const email = faker.internet.email({ firstName, lastName });

	// Various form field patterns
	const fieldPatterns = [
		{
			name: firstName + ' ' + lastName,
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
			name: firstName + ' ' + lastName,
			email,
			company: faker.company.name(),
			message: faker.lorem.paragraph(),
			website: faker.internet.url(),
		},
		{
			fullName: firstName + ' ' + lastName,
			email,
			phone: faker.phone.number(),
			reason: faker.helpers.arrayElement(['Support', 'Sales', 'Partnership', 'Other']),
			message: faker.lorem.paragraph(),
		},
		{
			name: firstName + ' ' + lastName,
			email,
			message: faker.lorem.sentences(3),
		}
	];

	return faker.helpers.arrayElement(fieldPatterns);
}

// Submit a single form
async function submitForm(index: number) {
	const data = generateSubmissionData();

	try {
		const response = await fetch(formUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': faker.internet.userAgent(),
			},
			body: JSON.stringify(data)
		});

		if (response.ok) {
			console.log(`✅ Submission ${index + 1}/${count} - ${data.email || data.name || 'Anonymous'}`);
			return { success: true, data };
		} else {
			const errorText = await response.text();
			console.error(`❌ Submission ${index + 1}/${count} failed (${response.status}): ${errorText}`);
			return { success: false, error: errorText };
		}
	} catch (error) {
		console.error(`❌ Submission ${index + 1}/${count} failed:`, error instanceof Error ? error.message : error);
		return { success: false, error };
	}
}

// Main seeding function
async function seedSubmissions() {
	const results = [];

	for (let i = 0; i < count; i++) {
		const result = await submitForm(i);
		results.push(result);

		// Delay between submissions to avoid rate limiting
		// Using 2 seconds to be safe with API rate limits
		if (i < count - 1) {
			process.stdout.write('   ⏳ Waiting 2s before next submission...\r');
			await new Promise(resolve => setTimeout(resolve, 2000));
			process.stdout.write(''.padEnd(50) + '\r'); // Clear the waiting message
		}
	}

	// Summary
	const successful = results.filter(r => r.success).length;
	const failed = results.filter(r => !r.success).length;

	console.log('\n' + '='.repeat(50));
	console.log(`✨ Seeding complete!`);
	console.log(`   Successful: ${successful}`);
	console.log(`   Failed: ${failed}`);
	console.log('='.repeat(50) + '\n');

	if (failed > 0) {
		process.exit(1);
	}
}

// Run the seeder
seedSubmissions().catch(error => {
	console.error('\n❌ Seeding failed:', error);
	process.exit(1);
});
