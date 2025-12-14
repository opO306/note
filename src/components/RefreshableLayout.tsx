import React from 'react';

// 아이콘을 위해 react-icons 같은 라이브러리를 쓰거나, 이미지 태그를 쓰세요
// npm install react-icons
import { FiRefreshCw } from "react-icons/fi";

interface Props {
    children: React.ReactNode;
    title: string;
    onRefresh?: () => void; // 새로고침 함수가 있으면 버튼 표시
}

export default function PageLayout({ children, title, onRefresh }: Props) {
    return (
        <div style={styles.container}>
            {/* 1. 공통 헤더 */}
            <header style={styles.header}>
                <h1 style={styles.title}>{title}</h1>

                {/* onRefresh 함수가 전달된 경우에만 버튼 표시 */}
                {onRefresh && (
                    <button onClick={onRefresh} style={styles.refreshButton}>
                        <FiRefreshCw /> {/* 또는 "새로고침" 텍스트 */}
                    </button>
                )}
            </header>

            {/* 2. 실제 컨텐츠 영역 */}
            <main style={styles.content}>
                {children}
            </main>
        </div>
    );
}

// 간단한 스타일 (CSS-in-JS 예시)
const styles = {
    container: {
        maxWidth: '600px', // 모바일 웹 느낌을 낸다면
        margin: '0 auto',
        border: '1px solid #ddd',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column' as const,
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '15px',
        borderBottom: '1px solid #eee',
        backgroundColor: 'white',
        position: 'sticky' as const,
        top: 0,
        zIndex: 10,
    },
    title: {
        fontSize: '18px',
        margin: 0,
    },
    refreshButton: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '20px',
    },
    content: {
        padding: '15px',
        flex: 1,
    }
};