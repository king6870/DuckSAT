#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 * 
 * This script validates that all required environment variables are present
 * before the build process starts. It runs during the prebuild phase to ensure
 * fail-fast behavior if any critical variables are missing.
 * 
 * Features:
 * - Logs presence (not values) of each required variable
 * - Shows length of string variables for verification
 * - Exits with code 1 if any required variable is missing
 * - Clear, color-coded output for easy debugging
 * - Never logs actual secret values
 * 
 * Usage:
 *   node scripts/check-env.js
 *   
 * Or via npm:
 *   npm run prebuild
 */

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Log a message with color
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Log a section header
 */
function logSection(title) {
  console.log('');
  log('='.repeat(70), colors.cyan);
  log(`${colors.bright}${title}`, colors.cyan);
  log('='.repeat(70), colors.cyan);
}

/**
 * List of required environment variables
 */
const REQUIRED_ENV_VARS = [
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'DATABASE_URL',
  'DATABASE_URL_UNPOOLED',
];

/**
 * Check a single environment variable
 */
function checkEnvVar(varName) {
  const value = process.env[varName];
  const isPresent = !!value;
  const length = value ? value.length : 0;

  return {
    name: varName,
    present: isPresent,
    length: length,
  };
}

/**
 * Format the status display for a variable
 */
function formatStatus(result) {
  const statusIcon = result.present ? '✅' : '❌';
  const statusText = result.present ? 'present' : 'MISSING';
  const statusColor = result.present ? colors.green : colors.red;
  const lengthInfo = result.present ? ` (length: ${result.length})` : '';
  
  return {
    icon: statusIcon,
    message: `${result.name}: ${statusText}${lengthInfo}`,
    color: statusColor,
  };
}

/**
 * Main validation function
 */
function validateEnvironment() {
  logSection('🔍 Environment Variable Validation');
  
  log('\nChecking required environment variables...', colors.blue);
  log('(Values are never logged, only presence and length)\n', colors.yellow);

  const results = REQUIRED_ENV_VARS.map(checkEnvVar);
  const missingVars = results.filter(r => !r.present);

  // Display all variables
  results.forEach(result => {
    const status = formatStatus(result);
    log(`${status.icon} ${status.message}`, status.color);
  });

  // Summary
  console.log('');
  log('─'.repeat(70), colors.cyan);
  
  if (missingVars.length === 0) {
    log('✅ All required environment variables are present!', colors.green);
    log('─'.repeat(70), colors.cyan);
    console.log('');
    return true;
  } else {
    log(`❌ ${missingVars.length} required environment variable(s) missing:`, colors.red);
    missingVars.forEach(result => {
      log(`   • ${result.name}`, colors.red);
    });
    log('─'.repeat(70), colors.cyan);
    
    console.log('');
    log('🚨 Build cannot proceed with missing environment variables!', colors.red);
    console.log('');
    log('How to fix:', colors.yellow);
    log('  1. Check your .env.local file (for local development)', colors.yellow);
    log('  2. Set variables in Vercel Dashboard → Settings → Environment Variables', colors.yellow);
    log('  3. Ensure variables are set for the correct environment (Production/Preview)', colors.yellow);
    log('  4. Redeploy after adding variables', colors.yellow);
    console.log('');
    log('For detailed setup instructions, see:', colors.yellow);
    log('  • docs/VERCEL_ENV_SETUP.md', colors.yellow);
    log('  • README.md', colors.yellow);
    console.log('');
    
    return false;
  }
}

/**
 * Main entry point
 */
function main() {
  try {
    const success = validateEnvironment();
    process.exit(success ? 0 : 1);
  } catch (error) {
    log('\n❌ Error during environment validation:', colors.red);
    console.error(error);
    process.exit(1);
  }
}

// Run the validation
main();
