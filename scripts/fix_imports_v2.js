const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles) {
    try {
        const files = fs.readdirSync(dirPath);

        arrayOfFiles = arrayOfFiles || [];

        files.forEach(function (file) {
            const fullPath = path.join(dirPath, file);
            if (fs.statSync(fullPath).isDirectory()) {
                arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
            } else {
                if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                    arrayOfFiles.push(fullPath);
                }
            }
        });

        return arrayOfFiles;
    } catch (e) {
        console.error(`Error scanning directory ${dirPath}:`, e);
        return [];
    }
}

const targetDir = path.join(__dirname, '../src/screens');
console.log(`Scanning directory: ${targetDir}`);

if (!fs.existsSync(targetDir)) {
    console.error(`Target directory not found!`);
    process.exit(1);
}

const files = getAllFiles(targetDir);
console.log(`Found ${files.length} files.`);

let modifiedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;

    // 1. UI Components
    content = content.replace(/from\s+["']\.\/ui\/([^"']+)["']/g, 'from "@/components/ui/$1"');

    // 2. Firebase
    content = content.replace(/from\s+["'](\.\.\/)+firebase["']/g, 'from "@/firebase"');

    // 3. ToastHelper
    content = content.replace(/from\s+["'](\.\.\/)+toastHelper["']/g, 'from "@/toastHelper"');

    // 4. Icons
    content = content.replace(/from\s+["']\.\/icons\/([^"']+)["']/g, 'from "@/components/icons/$1"');

    // 5. Hooks
    content = content.replace(/from\s+["']\.\/hooks\/([^"']+)["']/g, 'from "@/components/hooks/$1"');

    // 6. Layout
    content = content.replace(/from\s+["']\.\/layout\/([^"']+)["']/g, 'from "@/components/layout/$1"');

    // 7. Component-specific fixes
    content = content.replace(/from\s+["']\.\/TermsOfServiceScreen["']/g, 'from "@/screens/settings/TermsOfServiceScreen"');
    content = content.replace(/from\s+["']\.\/PrivacyPolicyScreen["']/g, 'from "@/screens/settings/PrivacyPolicyScreen"');
    content = content.replace(/from\s+["']\.\/SettingsScreen["']/g, 'from "@/screens/settings/SettingsScreen"');
    content = content.replace(/from\s+["']\.\/OptimizedAvatar["']/g, 'from "@/components/OptimizedAvatar"');
    content = content.replace(/from\s+["']\.\/useAchievements["']/g, 'from "@/components/useAchievements"');
    content = content.replace(/from\s+["']\.\/achievements["']/g, 'from "@/components/achievements"');

    // Fix imports from "../components/..."
    content = content.replace(/from\s+["']\.\.\/components\/([^"']+)["']/g, 'from "@/components/$1"');

    if (content !== originalContent) {
        console.log(`Fixing imports in: ${file}`);
        fs.writeFileSync(file, content, 'utf8');
        modifiedCount++;
    }
});

console.log(`Total files modified: ${modifiedCount}`);
