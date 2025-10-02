import { createDefaultPreset } from 'ts-jest';

const tsJestTransformCfg = createDefaultPreset().transform;

export default {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    transform: {
        '^.+\\.[tj]sx?$': ['ts-jest', { useESM: true, diagnostics: { warnOnly: true } }],
        '^.+\\.[cm]?js$': 'babel-jest',
    },
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    transformIgnorePatterns: [],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '^@/(.*)$': '<rootDir>/src/$1',
    },
};
