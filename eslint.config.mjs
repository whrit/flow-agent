import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";
import js from "@eslint/js";

const jsRecommendedRules = js.configs.recommended.rules ?? {};
const tsRecommendedRules = typescriptEslint.configs.recommended.rules ?? {};

const config = [
    {
        ignores: [
            "**/dist/**",
            "**/dist-cjs/**",
            "**/bin/**",
            "**/coverage/**",
            "**/node_modules/**",
            "**/*.js",
            "**/*.cjs",
            "examples/**",
            "tests/**",
            "src/cli/commands/swarm-new.ts",
        ],
    },
    {
        files: ["src/**/*.ts", "src/**/*.tsx"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                sourceType: "module",
                ecmaVersion: "latest",
            },
            globals: {
                ...globals.node,
            },
        },
        plugins: {
            "@typescript-eslint": typescriptEslint,
        },
        rules: {
            ...jsRecommendedRules,
            ...tsRecommendedRules,
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-non-null-assertion": "warn",
            "no-console": ["warn", { allow: ["warn", "error"] }],
            "prefer-const": "error",
            "no-var": "error",
        },
    },
    {
        files: ["src/**/*.bench.ts", "src/**/__tests__/**/*.ts"],
        rules: {
            "no-console": "off",
        },
    },
];

export default config;
