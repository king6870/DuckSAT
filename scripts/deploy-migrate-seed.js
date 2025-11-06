#!/usr/bin/env node

/**
 * Automated Deployment Script
 * 
 * This script automates the database deployment process by:
 * 1. Running all pending Prisma migrations (using `prisma migrate deploy`)
 * 2. Seeding the database with sample/test question data
 * 
 * Usage:
 *   npm run deploy:migrate-seed
 *   
 * Or directly:
 *   node scripts/deploy-migrate-seed.js
 * 
 * Prerequisites:
 *   - DATABASE_URL environment variable must be set
 *   - Node.js installed
 *   - npm dependencies installed
 * 
 * This script is useful for:
 *   - Initial deployment setup
 *   - Fixing production DB schema issues (e.g., missing 'topics' table)
 *   - CI/CD pipeline integration
 *   - Local development environment setup
 */

const { execSync } = require('child_process');
const path = require('path');

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
 * Log a message with color and formatting
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Log a section header
 */
function logSection(title) {
  console.log('');
  log('='.repeat(60), colors.cyan);
  log(`${colors.bright}${title}`, colors.cyan);
  log('='.repeat(60), colors.cyan);
}

/**
 * Execute a command and handle errors
 */
function runCommand(command, description) {
  log(`\n${description}...`, colors.blue);
  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: process.env,
    });
    log(`✅ ${description} completed successfully`, colors.green);
    return true;
  } catch (error) {
    log(`❌ ${description} failed`, colors.red);
    log(`Error: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * Main deployment function
 */
function deploy() {
  logSection('🚀 Starting Automated Deployment');
  
  const startTime = Date.now();

  log('\n📊 Checking database connection...', colors.cyan);

  // Step 1: Run Prisma migrations
  logSection('📦 Step 1: Running Prisma Migrations');
  const migrationsSuccess = runCommand(
    'npx prisma migrate deploy',
    'Running pending migrations'
  );

  if (!migrationsSuccess) {
    log('\n❌ Migration failed. Aborting deployment.', colors.red);
    process.exit(1);
  }

  // Step 2: Run seed script
  logSection('🌱 Step 2: Seeding Database');
  const seedSuccess = runCommand(
    'npm run seed:questions-test',
    'Seeding test questions'
  );

  if (!seedSuccess) {
    log('\n❌ Seeding failed. Database schema is updated, but test data was not loaded.', colors.red);
    process.exit(1);
  }

  // Success!
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  logSection('✅ Deployment Completed Successfully');
  log(`\n⏱️  Total time: ${duration} seconds`, colors.green);
  log('\nYour database is now ready with:', colors.green);
  log('  ✓ All migrations applied', colors.green);
  log('  ✓ Test questions seeded', colors.green);
  log('  ✓ Topics and subtopics created', colors.green);
  log('\n' + '='.repeat(60), colors.cyan);
  
  process.exit(0);
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  log('\n❌ Unhandled error occurred:', colors.red);
  console.error(error);
  process.exit(1);
});

// Run the deployment
try {
  deploy();
} catch (error) {
  log('\n❌ Deployment failed:', colors.red);
  console.error(error);
  process.exit(1);
}
