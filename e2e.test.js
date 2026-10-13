const { test, expect } = require('@playwright/test');
const path = require('path');

test('End-to-End Resume Upload and Parse Pipeline', async ({ page }) => {
  test.setTimeout(600000); // 10 minute timeout for the whole test

  console.log('Navigating to app...');
  await page.goto('http://localhost:5174/register');

  console.log('Registering test user...');
  const testEmail = `test_${Date.now()}@example.com`;
  await page.fill('input[name="full_name"]', 'Test User');
  await page.fill('input[name="email"]', testEmail);
  await page.fill('input[name="password"]', 'password123');
  await page.click('button:has-text("Register")');

  // Wait for redirect to login or dashboard
  await page.waitForTimeout(2000);
  
  if (page.url().includes('login')) {
    console.log('Logging in...');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Login")');
  }

  // Wait for dashboard to load
  try {
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  } catch (err) {
    console.log('Failed to redirect. Taking screenshot...');
    await page.screenshot({ path: 'login-error.png' });
    throw err;
  }
  console.log('Logged in successfully.');

  // 2. Upload Resume
  console.log('Uploading SABARISASTHA V.pdf...');
  // We locate the file input inside the label
  const fileChooserPromise = page.waitForEvent('filechooser');
  // Click the area that triggers the file input
  await page.click('button:has-text("Upload PDF")');
  const fileChooser = await fileChooserPromise;
  
  await fileChooser.setFiles(path.join(__dirname, 'SABARISASTHA V.pdf'));

  // It should immediately show the progress overlay
  console.log('Waiting for parsing to complete... (this may take up to 3 mins)');
  
  // Wait for the "Complete! Redirecting to Builder..." text
  await expect(page.locator('text="Complete! Redirecting to Builder..."')).toBeVisible({ timeout: 400000 });
  console.log('Parsing complete! Waiting for redirect to builder...');

  // 3. Verify Redirection to Builder
  await page.waitForURL('**/builder/*');
  console.log('Redirected to builder successfully.');

  // Wait for the form to populate
  await page.waitForTimeout(2000);

  // 4. Verify the populated data
  const nameValue = await page.inputValue('input[name="full_name"]');
  console.log(`Extracted Name: ${nameValue}`);
  expect(nameValue).not.toBe('');

  const emailValue = await page.inputValue('input[name="email"]');
  console.log(`Extracted Email: ${emailValue}`);
  expect(emailValue).not.toBe('');

  console.log('✅ End-to-End Test Passed Successfully!');
});
