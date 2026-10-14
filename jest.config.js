module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["**/?(*.)+(spec|test).[tj]s?(x)"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "Audio/runtime/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!Audio/runtime/**/*.d.ts",
  ],
};
