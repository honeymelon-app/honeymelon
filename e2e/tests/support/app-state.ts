import type { AppDataSnapshot, LicenseSnapshot } from '../../helpers/tauri';

export const baseLicense: LicenseSnapshot = {
  key: 'E2E-TEST-KEY',
  licenseId: 'test-license',
  orderId: 'test-order',
  maxMajorVersion: 1,
  issuedAt: 1_700_000_000,
  payload: 'e2e-license',
  signature: 'e2e-license',
  activatedAt: 1_700_000_900,
};

export function withLicense(data: Partial<LicenseSnapshot> = {}): AppDataSnapshot {
  return {
    license: {
      ...baseLicense,
      ...data,
    },
  };
}
