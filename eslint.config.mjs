import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

/** Config ESLint « flat » standard Next.js 15 (core-web-vitals + TypeScript). */
const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  { ignores: ['.next/**', 'node_modules/**', 'Contexte/**', 'next-env.d.ts'] },
];

export default config;
