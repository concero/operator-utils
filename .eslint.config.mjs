import pluginTs from '@typescript-eslint/eslint-plugin';
import parserTs from '@typescript-eslint/parser';
import pluginPrettier from 'eslint-plugin-prettier';

export default [
    {
        ignores: ['node_modules', 'cache', 'logs', 'dist', 'tests/**', 'jest.config.ts'],
    },
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: parserTs,
            parserOptions: {
                project: './tsconfig.json',
            },
        },
        plugins: {
            '@typescript-eslint': pluginTs,
            prettier: pluginPrettier,
        },
        rules: {
            ...pluginTs.configs.recommended.rules,
        },
    },
];
