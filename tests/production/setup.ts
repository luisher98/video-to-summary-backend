// Verify required environment variables for production tests
const requiredEnvVars = [
    'OPENAI_API_KEY',
    'YOUTUBE_API_KEY'
];

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`❌ Required environment variable ${envVar} is not set`);
        console.error('Production tests require actual API keys to run');
        console.error('Please set all required environment variables and try again');
        process.exit(1);
    }
}

// Verify we're running in production test mode
if (process.env.TEST_ENV !== 'production') {
    console.error('❌ This test suite should only be run with npm run test:prod');
    process.exit(1);
}

console.log('✅ Production test environment verified');
console.log('⚠️  Warning: These tests will make real API calls and may incur costs'); 