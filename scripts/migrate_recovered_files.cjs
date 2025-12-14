const fs = require('fs');
const path = require('path');

// 헬퍼 함수: 파일 이동 및 내용 수정
function migrateFile(src, dest, replacements) {
    if (!fs.existsSync(src)) {
        console.log(`Skipping ${src}: File not found`);
        return;
    }

    let content = fs.readFileSync(src, 'utf8');

    // Replacements 적용
    replacements.forEach(({ from, to }) => {
        // 정확한 문자열 매칭을 위해 단순 replaceAll 대신 정규식 사용 고려
        // 여기서는 간단히 replaceAll (Node v15+) 또는 split/join 사용
        // 하지만 import 구문 등은 문맥이 중요하므로 정규식 권장

        // 1. from "..." -> from "..."
        const regexFrom = new RegExp(`from "${from}"`, 'g');
        content = content.replace(regexFrom, `from "${to}"`);

        // 2. import("...") -> import("...") (Dynamic imports)
        const regexImport = new RegExp(`import\\("${from}"\\)`, 'g');
        content = content.replace(regexImport, `import("${to}")`);

        // 3. 단순 문자열 치환 (필요한 경우)
        // 예: MainScreenRefactored -> MainScreen
        if (!from.startsWith('.') && !from.startsWith('@') && !from.includes('/')) {
            const regexWord = new RegExp(`\\b${from}\\b`, 'g');
            content = content.replace(regexWord, to);
        }
    });

    // 디렉토리 생성
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }

    // 파일 쓰기
    fs.writeFileSync(dest, content, 'utf8');
    console.log(`Migrated: ${src} -> ${dest}`);

    // 원본 삭제
    fs.unlinkSync(src);
}

// 1. MainScreenRefactored.tsx -> MainScreen.tsx
const mainScreenReplacements = [
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
    // 이름 변경
    { from: 'MainScreenRefactored', to: 'MainScreen' }
];

migrateFile(
    'src/components/MainScreen/MainScreenRefactored.tsx',
    'src/screens/main/MainScreen/MainScreen.tsx',
    mainScreenReplacements
);

// 2. SettingsScreen.tsx
const settingsReplacements = [
    { from: '../ui/button', to: '@/components/ui/button' },
    { from: './ui/button', to: '@/components/ui/button' },
    { from: '@/components/ui/card', to: '@/components/ui/card' }, // 이미 되어있을 수도 있음
    { from: '../toastHelper', to: '@/toastHelper' },
    { from: '@/firebase', to: '@/firebase' },
    { from: './NotificationSettingsDialog', to: '@/components/NotificationSettingsDialog' },
    { from: './hooks/useOnlineStatus', to: '@/components/hooks/useOnlineStatus' },
    { from: './hooks/useNotifications', to: '@/components/hooks/useNotifications' },
    { from: './hooks/useNotificationPermission', to: '@/components/hooks/useNotificationPermission' }
];
// 상대 경로 패턴이 다양할 수 있어, 확실한 것만 추가하고 나머지는 manual fix 고려
// 하지만 기본적인 것들은 여기서 처리

migrateFile(
    'src/components/SettingsScreen.tsx',
    'src/screens/settings/SettingsScreen.tsx',
    settingsReplacements
);

// 3. SearchScreen.tsx
const searchReplacements = [
    { from: './ui/keyboard-dismiss-button', to: '@/components/ui/keyboard-dismiss-button' },
    { from: './ui/offline-indicator', to: '@/components/ui/offline-indicator' },
    { from: './ui/button', to: '@/components/ui/button' },
    { from: './ui/card', to: '@/components/ui/card' },
    { from: './ui/badge', to: '@/components/ui/badge' },
    { from: './ui/input', to: '@/components/ui/input' },
    { from: './ui/switch', to: '@/components/ui/switch' },
    { from: './icons/Lantern', to: '@/components/icons/Lantern' },
    { from: './ui/state-message', to: '@/components/ui/state-message' },
    { from: '../firebase', to: '@/firebase' },
    { from: './hooks/useKeyboard', to: '@/components/hooks/useKeyboard' },
    { from: './hooks/useScrollIntoView', to: '@/components/hooks/useScrollIntoView' }
];

migrateFile(
    'src/components/SearchScreen.tsx',
    'src/screens/explore/SearchScreen.tsx',
    searchReplacements
);

console.log('Migration completed.');

