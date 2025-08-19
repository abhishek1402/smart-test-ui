import { devices } from 'playwright/test';

const role1Projects = [
  {
    name: 'chrome-role1',
    use: {
      ...devices['Desktop Chrome'],
      storageState: 'playwright/.auth/role1.json',
    },
    // dependencies: ['setup'],
  },
  {
    name: 'firefox-role1',
    use: {
      ...devices['Desktop Safari'],
      storageState: 'playwright/.auth/role1.json',
    },
    // dependencies: ['setup'],
  },
];
const role2Projects = [
  {
    name: 'chrome-role2',
    use: {
      ...devices['Desktop Chrome'],
      storageState: 'playwright/.auth/role2.json',
    },
    // dependencies: ['setup'],
  },
  {
    name: 'firefox-role2',
    use: {
      ...devices['Desktop Safari'],
      storageState: 'playwright/.auth/role2.json',
    },
  },
];
const role3Projects = [
  {
    name: 'chrome-role3',
    use: {
      ...devices['Desktop Chrome'],
      storageState: 'playwright/.auth/role3.json',
    },
    // dependencies: ['setup'],
  },
  {
    name: 'firefox-role3',
    use: {
      ...devices['Desktop Safari'],
      storageState: 'playwright/.auth/role3.json',
    },
    // dependencies: ['setup'],
  },
];

export const userProjectsConfig = [
  ...role1Projects,
  ...role2Projects,
  ...role3Projects,
];
// dependencies: ['setup'],
