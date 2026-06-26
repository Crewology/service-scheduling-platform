import { readFileSync, writeFileSync } from 'fs';

// Helper: replace `$${expr.toFixed(2)}` with `${formatPrice(expr)}`
// and `${expr.toFixed(2)}` (without leading $) with `${formatPrice(expr)}`
// This handles the common patterns in the codebase

const files = [
  'client/src/pages/BookingConfirmation.tsx',
  'client/src/pages/BookingDetail.tsx',
  'client/src/pages/MyBookings.tsx',
  'client/src/pages/MyQuotes.tsx',
  'client/src/pages/ProviderCalendar.tsx',
  'client/src/pages/ProviderDashboard.tsx',
  'client/src/pages/ProviderOnboarding.tsx',
  'client/src/pages/ReferralProgram.tsx',
  'client/src/pages/ServiceDetail.tsx',
  'client/src/pages/CustomerPricing.tsx',
  'client/src/pages/SubscriptionManagement.tsx',
  'client/src/pages/AdminDashboard.tsx',
];

// Import statement to add
const importLine = 'import { formatPrice } from "@shared/formatPrice";';

for (const file of files) {
  let content = readFileSync(file, 'utf8');
  const originalContent = content;
  
  // Pattern 1: `$${expr.toFixed(2)}` → `${formatPrice(expr)}`
  // This handles: ${depositAmount.toFixed(2)}, ${parseFloat(x).toFixed(2)}, etc.
  content = content.replace(/\$\$\{([^}]+?)\.toFixed\(2\)\}/g, (match, expr) => {
    return `\${formatPrice(${expr})}`;
  });
  
  // Pattern 2: `$${(expr).toFixed(2)}` with parens wrapping
  content = content.replace(/\$\$\{(\([^)]+\))\.toFixed\(2\)\}/g, (match, expr) => {
    return `\${formatPrice(${expr})}`;
  });
  
  // Pattern 3: return `$${expr.toFixed(2)}` 
  content = content.replace(/`\$\$\{([^}]+?)\.toFixed\(2\)\}`/g, (match, expr) => {
    return `formatPrice(${expr})`;
  });
  
  // Pattern 4: Standalone in JSX like >${expr.toFixed(2)}<
  // These are already handled by pattern 1 since they're in template literals
  
  // Add import if we made changes and it doesn't already have the import
  if (content !== originalContent && !content.includes('formatPrice')) {
    // Actually the replacement already uses formatPrice, so we need the import
  }
  if (content !== originalContent && !content.includes('@shared/formatPrice')) {
    // Add import after the last import line
    const lines = content.split('\n');
    let lastImportIdx = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) lastImportIdx = i;
    }
    lines.splice(lastImportIdx + 1, 0, importLine);
    content = lines.join('\n');
  }
  
  if (content !== originalContent) {
    writeFileSync(file, content);
    console.log(`Updated: ${file}`);
  } else {
    console.log(`No changes: ${file}`);
  }
}
