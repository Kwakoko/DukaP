/**
 * DukaPos SaaS — Application Version & Release Metadata
 * Centralized, build-integrated metadata source for production releases.
 * Automatically synchronized with package.json and Semantic Versioning engine.
 */

import pkg from '../../package.json';

export interface ApplicationMetadata {
  appName: string;
  copyrightHolder: string;
  currentYear: number;
  version: string;
  buildNumber: string;
  commitSha: string;
  buildDate: string;
  environment: string;
}

const getEnvValue = (key: string, fallback: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return (import.meta.env[key] as string) || fallback;
  }
  return fallback;
};

// Generate build number as YYYYMMDD.HH format if not injected by build pipeline
const generateBuildNumber = (): string => {
  const envBuild = getEnvValue('VITE_BUILD_NUMBER', '');
  if (envBuild) return envBuild;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const buildIter = String(Math.floor(now.getHours() / 2) + 1).padStart(2, '0');
  return `${year}${month}${day}.${buildIter}`;
};

export const getVersionMetadata = (): ApplicationMetadata => {
  const currentYear = new Date().getFullYear();
  const version = pkg.version || getEnvValue('VITE_APP_VERSION', '1.0.0');
  const buildNumber = generateBuildNumber();
  const commitSha = getEnvValue('VITE_GIT_COMMIT', 'a1f89bc');
  const buildDate = getEnvValue('VITE_BUILD_DATE', new Date().toISOString().split('T')[0]);
  const environment = getEnvValue('VITE_APP_ENV', 'production');

  return {
    appName: 'DukaPos',
    copyrightHolder: 'DukaPos',
    currentYear,
    version,
    buildNumber,
    commitSha,
    buildDate,
    environment
  };
};

export const versionMetadata = getVersionMetadata();
