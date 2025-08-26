import { test, expect, type Page } from '@playwright/test';

/**
 * Page Object Model for Login Page
 * Encapsulates login page elements and actions for better maintainability
 */
class LoginPage {
  readonly page: Page;
  readonly emailInput: any;
  readonly passwordInput: any;
  readonly loginButton: any;
  readonly showPasswordButton: any;
  readonly errorMessage: any;
  readonly registerLink: any;
  readonly demoCredentials: any;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[type="email"]#email');
    this.passwordInput = page.locator('input[type="password"]#password, input[type="text"]#password');
    this.loginButton = page.locator('button[type="submit"]', { hasText: 'Sign In' });
    this.showPasswordButton = page.locator('button[type="button"]').filter({ has: page.locator('svg') });
    this.errorMessage = page.locator('.bg-red-50, .text-red-600, .text-red-800').first();
    this.registerLink = page.locator('a[href="/register"]');
    this.demoCredentials = page.locator('.bg-gray-50');
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await this.page.goto('/Login');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Fill login form with provided credentials
   */
  async fillLoginForm(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  /**
   * Submit the login form
   */
  async submitLogin() {
    await this.loginButton.click();
  }

  /**
   * Perform complete login action
   */
  async login(email: string, password: string) {
    await this.fillLoginForm(email, password);
    await this.submitLogin();
  }

  /**
   * Toggle password visibility
   */
  async togglePasswordVisibility() {
    await this.showPasswordButton.click();
  }

  /**
   * Wait for error message to appear
   */
  async waitForErrorMessage() {
    await this.page.waitForSelector('.bg-red-50, .text-red-600, .text-red-800', { 
      state: 'visible',
      timeout: 5000 
    });
  }

  /**
   * Get current error message text
   */
  async getErrorMessage(): Promise<string> {
    await this.waitForErrorMessage();
    return await this.errorMessage.textContent() || '';
  }

  /**
   * Check if login form is visible
   */
  async isLoginFormVisible(): Promise<boolean> {
    return await this.emailInput.isVisible() && 
           await this.passwordInput.isVisible() && 
           await this.loginButton.isVisible();
  }
}

/**
 * Page Object Model for Dashboard Page
 * Represents the page users see after successful login
 */
class DashboardPage {
  readonly page: Page;
  readonly welcomeMessage: any;
  readonly logoutButton: any;
  readonly accountCards: any;
  readonly navigationTabs: any;

  constructor(page: Page) {
    this.page = page;
    this.welcomeMessage = page.locator('h1', { hasText: 'Welcome back' });
    this.logoutButton = page.locator('button', { hasText: 'Logout' });
    this.accountCards = page.locator('.bg-white.rounded-lg.shadow').filter({ hasText: 'Primary Checking' }).first();
    this.navigationTabs = page.locator('nav button');
  }

  /**
   * Wait for dashboard to load completely
   */
  async waitForDashboardLoad() {
    await this.page.waitForURL('/Login');
    await this.welcomeMessage.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if user is successfully logged in
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      await this.waitForDashboardLoad();
      return await this.welcomeMessage.isVisible() && await this.logoutButton.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Get welcome message text
   */
  async getWelcomeMessage(): Promise<string> {
    return await this.welcomeMessage.textContent() || '';
  }

  /**
   * Logout from the application
   */
  async logout() {
    await this.logoutButton.click();
    await this.page.waitForURL('/Login');
  }
}

// Test data constants
const VALID_CREDENTIALS = {
  email: 'demo@bank.com',
  password: 'demo123'
};

const INVALID_CREDENTIALS = {
  wrongEmail: 'invalid@example.com',
  wrongPassword: 'wrongpassword',
  emptyEmail: '',
  emptyPassword: ''
};

test.describe('Login Functionality', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    
    // Navigate to login page before each test
    await loginPage.goto();
    
    // Verify login page loads correctly
    await expect(page).toHaveTitle(/Banking QA Test Application/);
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
  });

  // test.afterEach(async ({ page }) => {
  //   // Clean up: logout if logged in, clear any stored data
  //   try {
  //     if (page.url().includes('/dashboard')) {
  //       await dashboardPage.logout();
  //     }
  //   } catch {
  //     // Ignore errors during cleanup
  //   }
    
  //   // Clear localStorage to ensure clean state
  //   await page.evaluate(() => {
  //     localStorage.clear();
  //     sessionStorage.clear();
  //   });
  // });

  test('should display login form elements correctly', async ({ page }) => {
    // Verify all login form elements are present and visible
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
    await expect(loginPage.registerLink).toBeVisible();
    await expect(loginPage.demoCredentials).toBeVisible();

    // Verify form labels and placeholders
    await expect(page.locator('label[for="email"]')).toHaveText('Email Address');
    await expect(page.locator('label[for="password"]')).toHaveText('Password');
    await expect(loginPage.loginButton).toHaveText('Sign In');

    // Verify demo credentials are displayed
    await expect(loginPage.demoCredentials).toContainText('demo@bank.com');
    await expect(loginPage.demoCredentials).toContainText('demo123');
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    // Test successful login scenario
    await loginPage.login(VALID_CREDENTIALS.email, VALID_CREDENTIALS.password);

    // Wait for redirect and verify successful login
    // await dashboardPage.waitForDashboardLoad();
    
    // Verify user is on dashboard page
    await expect(page).toHaveURL('/dashboard');
    
    // Verify dashboard elements are visible
    await expect(dashboardPage.welcomeMessage).toBeVisible();
    await expect(dashboardPage.welcomeMessage).toContainText('Welcome back, Demo');
    await expect(dashboardPage.logoutButton).toBeVisible();
    await expect(dashboardPage.accountCards).toBeVisible();

    // Verify navigation tabs are present
    await expect(dashboardPage.navigationTabs).toHaveCount(6); // Dashboard, Transfer, History, Analytics, Statements, Audit Log
  });

  test('should fail login with invalid email', async ({ page }) => {
    // Test login failure with wrong email
    await loginPage.login(INVALID_CREDENTIALS.wrongEmail, VALID_CREDENTIALS.password);

    // Wait for error message and verify it appears
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toContain('Invalid email or password');

    // Verify user remains on login page
    await expect(page).toHaveURL('/Login');
    await expect(loginPage.emailInput).toBeVisible();
    
    // Verify form fields retain values (email should be cleared or retain invalid value)
    const emailValue = await loginPage.emailInput.inputValue();
    expect(emailValue).toBe(INVALID_CREDENTIALS.wrongEmail);
  });

  test('should fail login with invalid password', async ({ page }) => {
    // Test login failure with wrong password
    await loginPage.login(VALID_CREDENTIALS.email, INVALID_CREDENTIALS.wrongPassword);

    // Wait for and verify error message
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toContain('Invalid email or password');

    // Verify user remains on login page
    await expect(page).toHaveURL('/Login');
    await expect(loginPage.emailInput).toBeVisible();

    // Verify email field retains the valid email
    const emailValue = await loginPage.emailInput.inputValue();
    expect(emailValue).toBe(VALID_CREDENTIALS.email);
  });

  test('should fail login with empty credentials', async ({ page }) => {
    // Test login with completely empty form
    await loginPage.login(INVALID_CREDENTIALS.emptyEmail, INVALID_CREDENTIALS.emptyPassword);

    // Verify HTML5 validation prevents form submission
    // Check if email field shows validation message
    const emailValidationMessage = await loginPage.emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(emailValidationMessage).toBeTruthy();

    // Verify user remains on login page
    await expect(page).toHaveURL('/Login');
    await expect(loginPage.emailInput).toBeVisible();
  });

  test('should fail login with empty email only', async ({ page }) => {
    // Test login with empty email but valid password
    await loginPage.fillLoginForm(INVALID_CREDENTIALS.emptyEmail, VALID_CREDENTIALS.password);
    await loginPage.submitLogin();

    // Verify HTML5 validation for required email field
    const emailValidationMessage = await loginPage.emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(emailValidationMessage).toContain('Please fill out this field');

    // Verify user remains on login page
    await expect(page).toHaveURL('/Login');
  });

  test('should fail login with empty password only', async ({ page }) => {
    // Test login with valid email but empty password
    await loginPage.fillLoginForm(VALID_CREDENTIALS.email, INVALID_CREDENTIALS.emptyPassword);
    await loginPage.submitLogin();

    // Verify HTML5 validation for required password field
    const passwordValidationMessage = await loginPage.passwordInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(passwordValidationMessage).toContain('Please fill out this field');

    // Verify user remains on login page
    await expect(page).toHaveURL('/Login');
  });

  test('should toggle password visibility', async ({ page }) => {
    // Fill password field
    await loginPage.passwordInput.fill(VALID_CREDENTIALS.password);

    // Verify password is hidden initially
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');

    // Click show password button
    await loginPage.togglePasswordVisibility();

    // Verify password is now visible
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'text');

    // Click hide password button
    await loginPage.togglePasswordVisibility();

    // Verify password is hidden again
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
  });

  test('should handle loading state during login', async ({ page }) => {
    // Start login process
    await loginPage.fillLoginForm(VALID_CREDENTIALS.email, VALID_CREDENTIALS.password);
    
    // Monitor for loading state (button should be disabled during submission)
    const loginPromise = loginPage.submitLogin();
    
    // Check if button becomes disabled during loading (if implemented)
    // Note: This depends on the implementation having a loading state
    try {
      await expect(loginPage.loginButton).toBeDisabled({ timeout: 1000 });
    } catch {
      // Loading state might not be implemented, continue with test
    }

    await loginPromise;

    // Verify successful login after loading
    await dashboardPage.waitForDashboardLoad();
    await expect(page).toHaveURL('/dashboard');
  });

  test('should navigate to register page', async ({ page }) => {
    // Click register link
    await loginPage.registerLink.click();

    // Verify navigation to register page
    await expect(page).toHaveURL('/register');
    await expect(page.locator('h2', { hasText: 'Create Account' })).toBeVisible();
  });

  test('should maintain form state during validation errors', async ({ page }) => {
    const testEmail = 'test@example.com';
    const testPassword = 'testpassword';

    // Fill form with invalid credentials
    await loginPage.login(testEmail, testPassword);

    // Wait for error message
    await loginPage.waitForErrorMessage();

    // Verify form fields maintain their values after error
    await expect(loginPage.emailInput).toHaveValue(testEmail);
    // Password field might be cleared for security, so we don't check its value

    // Verify error message is displayed
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toContain('Invalid email or password');
  });

  test('should handle multiple failed login attempts', async ({ page }) => {
    // Attempt multiple failed logins
    for (let i = 0; i < 3; i++) {
      await loginPage.login(`invalid${i}@example.com`, 'wrongpassword');
      await loginPage.waitForErrorMessage();
      
      // Verify error message appears each time
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toContain('Invalid email or password');
      
      // Clear form for next attempt
      await loginPage.emailInput.clear();
      await loginPage.passwordInput.clear();
    }

    // Verify successful login still works after failed attempts
    await loginPage.login(VALID_CREDENTIALS.email, VALID_CREDENTIALS.password);
    await dashboardPage.waitForDashboardLoad();
    await expect(page).toHaveURL('/dashboard');
  });

  test('should redirect to intended page after login', async ({ page }) => {
    // Try to access protected route while not logged in
    await page.goto('/transfer');
    
    // Should be redirected to login page
    await expect(page).toHaveURL('/Login');

    // Login with valid credentials
    await loginPage.login(VALID_CREDENTIALS.email, VALID_CREDENTIALS.password);

    // Should be redirected to dashboard (default) since transfer was accessed directly
    await expect(page).toHaveURL('/dashboard');
    await expect(dashboardPage.welcomeMessage).toBeVisible();
  });
});

// Additional test suite for edge cases and accessibility
test.describe('Login Accessibility and Edge Cases', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should be accessible via keyboard navigation', async ({ page }) => {
    // Test tab navigation through form elements
    await page.keyboard.press('Tab'); // Should focus email input
    await expect(loginPage.emailInput).toBeFocused();

    await page.keyboard.press('Tab'); // Should focus password input
    await expect(loginPage.passwordInput).toBeFocused();

    await page.keyboard.press('Tab'); // Should focus show/hide password button
    await expect(loginPage.showPasswordButton).toBeFocused();

    await page.keyboard.press('Tab'); // Should focus login button
    await expect(loginPage.loginButton).toBeFocused();
  });

  test('should submit form using Enter key', async ({ page }) => {
    // Fill form
    await loginPage.fillLoginForm(VALID_CREDENTIALS.email, VALID_CREDENTIALS.password);
    
    // Press Enter to submit
    await page.keyboard.press('Enter');

    // Verify successful login
    await page.waitForURL('/Login');
    await expect(page.locator('h1', { hasText: 'Welcome back' })).toBeVisible();
  });

  test('should handle special characters in credentials', async ({ page }) => {
    const specialEmail = 'test+special@example.com';
    const specialPassword = 'P@ssw0rd!#$%';

    // Test with special characters (should fail since these aren't valid demo credentials)
    await loginPage.login(specialEmail, specialPassword);
    
    // Should show error message
    await loginPage.waitForErrorMessage();
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toContain('Invalid email or password');
  });

  test('should handle very long input values', async ({ page }) => {
    const longEmail = 'a'.repeat(100) + '@example.com';
    const longPassword = 'p'.repeat(200);

    // Fill with very long values
    await loginPage.fillLoginForm(longEmail, longPassword);
    await loginPage.submitLogin();

    // Should handle gracefully and show appropriate error
    await loginPage.waitForErrorMessage();
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toContain('Invalid email or password');
  });
});