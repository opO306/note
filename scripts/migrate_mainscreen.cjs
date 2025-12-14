const fs = require('fs');
const path = require('path');

const srcPath = 'src/components/MainScreen/MainScreenRefactored.tsx';
const destPath = 'src/screens/main/MainScreen/MainScreenRefactored.tsx';

if (!fs.existsSync(srcPath)) {
  console.error(`Source file not found: ${srcPath}`);
  process.exit(1);
}

let content = fs.readFileSync(srcPath, 'utf8');

// Replacements
const replacements = [
  { from: '../../firebase', to: '@/firebase' },
  { from: '../AdminReportScreen', to: '@/screens/settings/admin/AdminScreen' },
  { from: '../useLumens', to: '@/components/useLumens' },
  { from: '../useAchievements', to: '@/components/useAchievements' },
  { from: '../hooks/usePosts', to: '@/components/hooks/usePosts' },
  { from: '../layout/BottomNavigation', to: '@/components/layout/BottomNavigation' },
  { from: '../MyPageScreen', to: '@/screens/profile/MyPageScreen' },
  { from: '../CategoryScreen', to: '@/screens/explore/CategoryScreen' },
  { from: '../SearchScreen', to: '@/screens/explore/SearchScreen' },
  { from: '../RankingScreen', to: '@/screens/gamification/RankingScreen' },
  { from: '../BookmarkScreen', to: '@/screens/explore/BookmarkScreen' },
  { from: '../WriteScreen', to: '@/screens/main/WriteScreen' },
  { from: '../TitleShop', to: '@/components/TitleShop' },
  { from: '../TitlesCollection', to: '@/components/TitlesCollection' },
  { from: '../AchievementsScreen', to: '@/screens/gamification/AchievementsScreen' },
  { from: '../FollowListScreen', to: '@/screens/profile/FollowListScreen' },
  { from: '../UserProfileDialog', to: '@/screens/profile/UserProfileDialog' },
  { from: '../NotificationSettingsDialog', to: '@/components/NotificationSettingsDialog' },
  { from: '../ReportDialog', to: '@/components/ReportDialog' },
  { from: '../CommunityGuidelinesScreen', to: '@/screens/auth/CommunityGuidelinesScreen' },
  { from: '../MyContentListScreen', to: '@/screens/profile/MyContentListScreen' },
  { from: '../ui/alert-dialog-simple', to: '@/components/ui/alert-dialog-simple' },
  { from: '../hooks/useOnlineStatus', to: '@/components/hooks/useOnlineStatus' },
  { from: '@/components/utils/deletedUserHelpers', to: '@/components/utils/deletedUserHelpers' }, // Already correct?
  { from: '@/data/categoryData', to: '@/data/categoryData' }, // Already correct
];

// Apply replacements
replacements.forEach(({ from, to }) => {
  // Regex to match exact import string
  // import ... from "..." or import("...")
  const regex = new RegExp(`from "${from}"`, 'g');
  const regexImport = new RegExp(`import\\("${from}"\\)`, 'g');
  
  content = content.replace(regex, `from "${to}"`);
  content = content.replace(regexImport, `import("${to}")`);
});

// Write to destination
fs.writeFileSync(destPath, content, 'utf8');
console.log(`Successfully migrated MainScreenRefactored.tsx`);

// Delete source file
fs.unlinkSync(srcPath);
console.log(`Deleted old file`);

