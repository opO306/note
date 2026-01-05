import React from 'react';
(window as any).__reactVersions ??= new Set();
(window as any).__reactVersions.add(React.version);
console.log('[React versions loaded]', [...(window as any).__reactVersions]);
