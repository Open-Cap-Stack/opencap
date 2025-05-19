const fs = require('fs');
const path = require('path');

// Define the routes directory
const routesDir = path.join(__dirname, '../routes/v1');

// Get all route files
const routeFiles = fs.readdirSync(routesDir).filter(file => file.endsWith('Routes.js'));

// Track changes
let changesMade = 0;

routeFiles.forEach(file => {
    const filePath = path.join(routesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    
    // Fix model imports (from '../models/ModelName' to '../../models/ModelName')
    const modelImportRegex = /require\('(\.\.\/models\/[^']+)'\)/g;
    content = content.replace(modelImportRegex, (match, p1) => {
        // Check if the path needs to be updated
        if (p1.startsWith('../models/')) {
            updated = true;
            return `require('${p1.replace('../models/', '../../models/')}')`;
        }
        return match;
    });
    
    // Fix controller imports (from '../controllers/controller' to '../../controllers/controller')
    const controllerImportRegex = /require\('(\.\.\/controllers\/[^']+)'\)/g;
    content = content.replace(controllerImportRegex, (match, p1) => {
        if (p1.startsWith('../controllers/')) {
            updated = true;
            return `require('${p1.replace('../controllers/', '../../controllers/')}')`;
        }
        return match;
    });
    
    // Save changes if any
    if (updated) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated imports in ${file}`);
        changesMade++;
    }
});

console.log(`\n✅ Fixed imports in ${changesMade} route files.`);
