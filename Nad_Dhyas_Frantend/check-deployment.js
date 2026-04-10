/**
 * Deployment Health Check Script
 * Run this to check if your deployment is configured correctly
 * Usage: node check-deployment.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Deployment Configuration...\n');

// Check 1: Environment Variables
console.log('1. Checking Environment Variables...');
const envLocalPath = path.join(__dirname, '.env.local');
const envPath = path.join(__dirname, '.env');

let hasEnvFile = false;
let backendUrl = null;

if (fs.existsSync(envLocalPath)) {
  console.log('   ✅ .env.local found');
  hasEnvFile = true;
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  const backendMatch = envContent.match(/BACKEND_URL=(.+)/);
  if (backendMatch) {
    backendUrl = backendMatch[1].trim();
    console.log(`   ✅ BACKEND_URL is set: ${backendUrl}`);
  } else {
    console.log('   ⚠️  BACKEND_URL not found in .env.local');
  }
} else if (fs.existsSync(envPath)) {
  console.log('   ✅ .env found');
  hasEnvFile = true;
  const envContent = fs.readFileSync(envPath, 'utf8');
  const backendMatch = envContent.match(/BACKEND_URL=(.+)/);
  if (backendMatch) {
    backendUrl = backendMatch[1].trim();
    console.log(`   ✅ BACKEND_URL is set: ${backendUrl}`);
  } else {
    console.log('   ⚠️  BACKEND_URL not found in .env');
  }
} else {
  console.log('   ❌ No .env.local or .env file found');
  console.log('   ⚠️  Create .env.local with BACKEND_URL=your-backend-url');
}

// Check 2: Public Assets
console.log('\n2. Checking Public Assets...');
const publicPath = path.join(__dirname, 'public');
const logoPath = path.join(publicPath, 'Logo.png');

if (fs.existsSync(publicPath)) {
  console.log('   ✅ public folder exists');
  if (fs.existsSync(logoPath)) {
    console.log('   ✅ Logo.png found');
  } else {
    console.log('   ⚠️  Logo.png not found in public folder');
  }
} else {
  console.log('   ❌ public folder not found');
}

// Check 3: Next.js Build
console.log('\n3. Checking Next.js Build...');
const nextPath = path.join(__dirname, '.next');

if (fs.existsSync(nextPath)) {
  console.log('   ✅ .next folder exists (project has been built)');
} else {
  console.log('   ⚠️  .next folder not found');
  console.log('   💡 Run: npm run build');
}

// Check 4: Package.json
console.log('\n4. Checking Dependencies...');
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  console.log(`   ✅ package.json found`);
  console.log(`   📦 Next.js version: ${packageJson.dependencies?.next || 'not found'}`);
  console.log(`   📦 React version: ${packageJson.dependencies?.react || 'not found'}`);
  
  // Check if recharts is installed (for charts)
  if (packageJson.dependencies?.recharts) {
    console.log(`   ✅ recharts installed (for charts)`);
  } else {
    console.log(`   ⚠️  recharts not found (charts may not work)`);
  }
} else {
  console.log('   ❌ package.json not found');
}

// Check 5: API Routes
console.log('\n5. Checking API Routes...');
const apiPath = path.join(__dirname, 'app', 'api');
if (fs.existsSync(apiPath)) {
  console.log('   ✅ API routes folder exists');
  
  // Check some critical API routes
  const criticalRoutes = [
    'admin/login',
    'admin/stats',
    'branch-manager/login',
    'branch-manager/dashboard'
  ];
  
  criticalRoutes.forEach(route => {
    const routePath = path.join(apiPath, route, 'route.ts');
    if (fs.existsSync(routePath)) {
      console.log(`   ✅ ${route}/route.ts exists`);
    } else {
      console.log(`   ⚠️  ${route}/route.ts not found`);
    }
  });
} else {
  console.log('   ❌ API routes folder not found');
}

// Summary
console.log('\n📋 Summary:');
console.log('─'.repeat(50));

if (!hasEnvFile || !backendUrl) {
  console.log('❌ CRITICAL: BACKEND_URL not configured');
  console.log('   → Create .env.local file with: BACKEND_URL=your-backend-url');
}

if (!fs.existsSync(nextPath)) {
  console.log('⚠️  WARNING: Project not built');
  console.log('   → Run: npm run build');
}

console.log('\n💡 Next Steps:');
console.log('1. Set BACKEND_URL in .env.local');
console.log('2. Run: npm run build');
console.log('3. Test locally: npm start');
console.log('4. Check browser console for errors after deployment');
console.log('5. Verify all API endpoints are accessible');

console.log('\n✅ Check complete!\n');
