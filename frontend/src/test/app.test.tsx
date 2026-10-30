import { describe, it, expect } from 'vitest';
import {
  formatBytes,
  formatCategoryLabel,
  getRiskBadgeStyles,
  MANDATORY_DISCLAIMER,
} from '../lib/utils';
import { loginFormSchema, registerFormSchema } from '../schemas';

describe('PrivacyGuard AI Frontend Utilities & Validation Suite', () => {
  it('1. Formats byte sizes accurately', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
  });

  it('2. Maps sensitive categories to human-readable labels', () => {
    expect(formatCategoryLabel('government_identity')).toBe('Government Identity');
    expect(formatCategoryLabel('authentication_credentials')).toBe('Auth Credentials & Secrets');
    expect(formatCategoryLabel('financial_information')).toBe('Financial Information');
  });

  it('3. Assigns proper risk badge styles for all 4 risk tiers', () => {
    expect(getRiskBadgeStyles('low').label).toBe('Low Risk');
    expect(getRiskBadgeStyles('moderate').label).toBe('Moderate Risk');
    expect(getRiskBadgeStyles('high').label).toBe('High Risk');
    expect(getRiskBadgeStyles('critical').label).toBe('Critical Risk');
  });

  it('4. Enforces registration and login Zod schemas', () => {
    const invalidLogin = loginFormSchema.safeParse({ email: 'not-an-email', password: '' });
    expect(invalidLogin.success).toBe(false);

    const validRegister = registerFormSchema.safeParse({
      fullName: 'Priya Nair',
      email: 'priya@privacyguard.ai',
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
      acceptTerms: true,
    });
    expect(validRegister.success).toBe(true);
  });

  it('5. Includes mandatory product disclaimer text', () => {
    expect(MANDATORY_DISCLAIMER).toContain(
      'PrivacyGuard AI helps identify potential sensitive information and reduce accidental data exposure.'
    );
  });
});

