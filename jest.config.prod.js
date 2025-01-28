/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
    testEnvironment: "node",
    transform: {
        "^.+\\.tsx?$": ["ts-jest", {
            useESM: true,
        }],
    },
    preset: "ts-jest",
    testTimeout: 60000, // Increased timeout for real API calls
    testMatch: ["**/*.production.test.ts"],  // Only run production tests
    setupFiles: ["<rootDir>/tests/production/setup.ts"],
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
}; 