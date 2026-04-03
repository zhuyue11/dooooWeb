import { test as teardown } from '@playwright/test';
import fs from 'fs';

teardown('cleanup auth state', async () => {
  // Remove saved auth state
  const authFile = 'tests/.auth/user.json';
  if (fs.existsSync(authFile)) {
    fs.unlinkSync(authFile);
  }
});
