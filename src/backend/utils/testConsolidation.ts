import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_BUILD_ENV, ENVIRONMENT_CONFIG, BuildEnvironment } from '../config/constants';

export function ensureTempDirectory(): string {
  const testDir = path.join(__dirname, '..', 'temp');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
  }
  return testDir;
}

export function createTestFile(testCode: string, testId?: string): string {
  const testDir = ensureTempDirectory();
  const filename = testId ? `test-${testId}.spec.ts` : 'current-test.spec.ts';
  const testFile = path.join(testDir, filename);

  fs.writeFileSync(testFile, testCode);

  return testFile;
}

export function createConsolidatedTestFile(testCases: any[], buildEnv: BuildEnvironment = DEFAULT_BUILD_ENV): string {
  const testDir = ensureTempDirectory();
  const testFile = path.join(testDir, 'all-tests.spec.ts');

  // For single test case, just write it directly without wrapping
  if (testCases.length === 1) {
    let testCode = testCases[0].test;

    // Replace environment URLs based on BUILD_ENV
    if (buildEnv === 'prod') {
      testCode = testCode.replace(
        /https?:\/\/cleartax-[a-z0-9-]+-http\.internal\.cleartax\.co/g,
        ENVIRONMENT_CONFIG.prod.baseUrl
      );
    } else if (buildEnv === 'dev' || buildEnv === 'qa') {
      testCode = testCode.replace(
        /https?:\/\/cleartax-[a-z0-9-]+-http\.internal\.cleartax\.co/g,
        ENVIRONMENT_CONFIG[buildEnv].baseUrl
      );
    }

    fs.writeFileSync(testFile, testCode);
    return testFile;
  }

  // For multiple tests, use the wrapping approach
  let consolidatedCode = `
import { test as base, expect } from '@playwright/test';

const test = base.extend({
  page: async ({ page }, use) => {
    await use(page);
  },
});

const describe = (name, fn) => fn();
`;

  testCases.forEach((testCase) => {
    let testCode = testCase.test;

    // Remove import statements
    testCode = testCode.replace(/import.*?;(\r?\n|\r)/g, '');

    // Remove duplicate test re-declarations
    testCode = testCode.replace(/const\s+test\s*=.*?;/g, '');

    // Replace environment URLs
    if (buildEnv === 'prod') {
      testCode = testCode.replace(
        /https?:\/\/cleartax-[a-z0-9-]+-http\.internal\.cleartax\.co/g,
        ENVIRONMENT_CONFIG.prod.baseUrl
      );
    } else if (buildEnv === 'dev' || buildEnv === 'qa') {
      testCode = testCode.replace(
        /https?:\/\/cleartax-[a-z0-9-]+-http\.internal\.cleartax\.co/g,
        ENVIRONMENT_CONFIG[buildEnv].baseUrl
      );
    }

    consolidatedCode += `
// Test Case: ${testCase.name} (${testCase._id})
test.describe('${testCase.name.replace(/'/g, "\\'")}', () => {
  ${testCode}
});
`;
  });

  fs.writeFileSync(testFile, consolidatedCode);

  return testFile;
}

export const getResultJsonSpecs = (
  suite: any
): { name: string; ok: boolean }[] => {
  const specs = [];
  if (suite.specs) {
    for (const spec of suite.specs) {
      specs.push({ name: suite.title, ok: spec.ok });
    }
  }
  if (suite.suites) {
    for (const child of suite.suites) specs.push(...getResultJsonSpecs(child));
  }
  return specs;
};
