/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
    testEnvironment: "node",
    transform: {
        "^.+\\.tsx?$": ["ts-jest", {}],
    },
    preset: "ts-jest",
    testTimeout: 30000, // Longer timeout for real API calls
    setupFiles: ["<rootDir>/tests/production/setup.ts"],
}; 