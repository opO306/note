// LocalStorage utility functions
export const safeLocalStorage = {
    setItem: (key: string, value: string) => {
        try {
            localStorage.setItem(key, value);
        } catch (error) {
            console.warn(
                `Failed to save ${key} to localStorage:`,
                error,
            );
        }
    },
    getItem: (key: string): string | null => {
        try {
            return localStorage.getItem(key);
        } catch (error) {
            console.warn(
                `Failed to get ${key} from localStorage:`,
                error,
            );
            return null;
        }
    },
    setJSON: (key: string, value: any) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.warn(
                `Failed to save ${key} to localStorage:`,
                error,
            );
        }
    },
    getJSON: (key: string, defaultValue: any): any => {
        try {
            const item = localStorage.getItem(key);
            if (item === null) return defaultValue;
            return JSON.parse(item);
        } catch (error) {
            console.warn(
                `Failed to parse ${key} from localStorage:`,
                error,
            );
            return defaultValue;
        }
    },
    getNumber: (key: string, defaultValue: number): number => {
        try {
            const item = localStorage.getItem(key);
            if (item === null) return defaultValue;
            const parsed = parseInt(item);
            return isNaN(parsed) ? defaultValue : parsed;
        } catch (error) {
            console.warn(
                `Failed to get number ${key} from localStorage:`,
                error,
            );
            return defaultValue;
        }
    },
};