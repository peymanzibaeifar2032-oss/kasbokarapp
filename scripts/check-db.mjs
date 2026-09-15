#!/usr/bin/env node

/**
 * Database health check script
 * Usage: node scripts/check-db.mjs
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

try {
  // Test basic connection
  const psql = spawn('psql', [dbUrl, '-c', 'SELECT 1']);
  
  psql.stdout.on('data', (data) => {
    console.log('✅ Database connection OK');
  });
  
  psql.stderr.on('data', (data) => {
    console.error('❌ Database error:', data.toString());
    process.exit(1);
  });
  
  psql.on('close', (code) => {
    if (code === 0) {
      // Check tables
      const tables = spawn('psql', [dbUrl, '-c', 'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=\'public\'']);
      
      tables.stdout.on('data', (data) => {
        console.log('✅ Tables found:', data.toString().trim());
      });
      
      tables.on('close', () => {
        // Check categories
        const cats = spawn('psql', [dbUrl, '-c', 'SELECT COUNT(*) FROM categories']);
        
        cats.stdout.on('data', (data) => {
          const count = parseInt(data.toString().trim());
          if (count > 0) {
            console.log(`✅ Categories: ${count}`);
          } else {
            console.warn('⚠️  No categories found - running seed');
          }
        });
        
        cats.on('close', () => process.exit(0));
      });
    } else {
      process.exit(1);
    }
  });
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
