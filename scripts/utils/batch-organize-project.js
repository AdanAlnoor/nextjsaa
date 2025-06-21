/**
 * Batch Project Organization Master Script
 * Runs all batch organization scripts in sequence to clean up project structure
 * This version doesn't require any user input
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = process.cwd();
const scriptsDir = path.join(rootDir, 'scripts', 'utils');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Execute a script with colored output
 */
function executeScript(scriptPath, description) {
  console.log(`\n${colors.cyan}=======================================${colors.reset}`);
  console.log(`${colors.magenta}${description}${colors.reset}`);
  console.log(`${colors.cyan}=======================================${colors.reset}\n`);
  
  try {
    execSync(`node ${scriptPath}`, { stdio: 'inherit' });
    console.log(`\n${colors.green}✓ Script completed successfully${colors.reset}\n`);
    return true;
  } catch (error) {
    console.error(`\n${colors.red}✗ Script failed: ${error.message}${colors.reset}\n`);
    return false;
  }
}

/**
 * Run the entire organization process in batch mode
 */
async function organizeProject() {
  console.log(`\n${colors.blue}=============================================${colors.reset}`);
  console.log(`${colors.blue}    BATCH PROJECT ORGANIZATION SCRIPT${colors.reset}`);
  console.log(`${colors.blue}=============================================${colors.reset}\n`);
  
  // 1. Create necessary directories
  console.log(`${colors.yellow}Creating directory structure...${colors.reset}`);
  
  const dirs = [
    path.join(rootDir, 'migrations'),
    path.join(rootDir, 'migrations', 'schema'),
    path.join(rootDir, 'migrations', 'functions'),
    path.join(rootDir, 'migrations', 'triggers'),
    path.join(rootDir, 'migrations', 'data'),
    path.join(rootDir, 'docs'),
    path.join(rootDir, 'docs', 'api'),
    path.join(rootDir, 'docs', 'database'),
    path.join(rootDir, 'docs', 'guides'),
    path.join(rootDir, 'config'),
    path.join(rootDir, 'scripts', 'db')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
  
  // 2. Run each batch organization script
  const scripts = [
    {
      path: path.join(scriptsDir, 'batch-migrate-sql-files.js'),
      description: 'Organizing SQL Files into Migration Structure'
    },
    {
      path: path.join(scriptsDir, 'batch-organize-files.js'),
      description: 'Organizing Markdown and JSON Files'
    },
    {
      path: path.join(scriptsDir, 'batch-organize-js-files.js'),
      description: 'Organizing JavaScript Database Files'
    }
  ];
  
  let allSuccessful = true;
  
  for (const script of scripts) {
    const success = executeScript(script.path, script.description);
    if (!success) {
      allSuccessful = false;
      console.log(`${colors.yellow}Continuing with next script...${colors.reset}`);
    }
  }
  
  // 3. Now fix the cookie parser issue in middleware.ts
  console.log(`\n${colors.cyan}=======================================${colors.reset}`);
  console.log(`${colors.magenta}Fixing Cookie Parser in middleware.ts${colors.reset}`);
  console.log(`${colors.cyan}=======================================${colors.reset}\n`);
  
  try {
    const middlewarePath = path.join(rootDir, 'src', 'middleware.ts');
    
    if (fs.existsSync(middlewarePath)) {
      let middlewareContent = fs.readFileSync(middlewarePath, 'utf8');
      
      // Update the safelyParseSupabaseCookies function to properly handle base64 prefixes
      const oldFunctionRegex = /function safelyParseSupabaseCookies\(cookieStr: string\) \{[\s\S]*?try \{[\s\S]*?return cookieStr[\s\S]*?}\s*catch[\s\S]*?}/;
      
      const newFunction = `function safelyParseSupabaseCookies(cookieStr: string) {
  if (!cookieStr) return {};
  
  try {
    return cookieStr.split(';')
      .map(pair => pair.trim())
      .filter(pair => pair.includes('='))
      .reduce((acc, pair) => {
        const [key, ...values] = pair.split('=');
        // Join back values in case there are '=' characters in the value itself
        let value = values.join('=');
        
        // Handle base64 prefixed cookies - just store them as-is without trying to parse JSON
        if (value && typeof value === 'string' && value.startsWith('base64-')) {
          const base64Value = value.replace(/^base64-/, '');
          acc[key.trim()] = base64Value;
        } else if (key && value) {
          acc[key.trim()] = value.trim();
        }
        
        return acc;
      }, {} as Record<string, string>);
  } catch (error) {
    console.error('Failed to parse cookie string:', error);
    return {};
  }
}`;
      
      middlewareContent = middlewareContent.replace(oldFunctionRegex, newFunction);
      
      fs.writeFileSync(middlewarePath, middlewareContent);
      console.log(`${colors.green}✓ Updated cookie parsing function in middleware.ts${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠ middleware.ts not found in src directory${colors.reset}`);
    }
  } catch (err) {
    console.error(`${colors.red}✗ Failed to update middleware.ts: ${err.message}${colors.reset}`);
  }
  
  // 4. Summary
  console.log(`\n${colors.blue}=============================================${colors.reset}`);
  console.log(`${colors.blue}              SUMMARY${colors.reset}`);
  console.log(`${colors.blue}=============================================${colors.reset}\n`);
  
  if (allSuccessful) {
    console.log(`${colors.green}All organization scripts completed successfully!${colors.reset}`);
  } else {
    console.log(`${colors.yellow}Some scripts encountered issues. Please check the output above.${colors.reset}`);
  }
  
  console.log(`\n${colors.cyan}Next steps:${colors.reset}`);
  console.log(`1. Verify that your project works correctly with the new structure`);
  console.log(`2. Update imports/paths if necessary`);
  console.log(`3. Delete original files from the root directory after confirming everything works\n`);
  
  console.log(`For details on the new structure, see ${colors.green}PROJECT_STRUCTURE.md${colors.reset}\n`);
}

// Run the organization
organizeProject().catch(err => {
  console.error(`${colors.red}Error in project organization: ${err.message}${colors.reset}`);
  process.exit(1);
}); 