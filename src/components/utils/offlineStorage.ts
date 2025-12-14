/**
 * Offline storage utilities for caching data
 * Uses IndexedDB for larger data and localStorage for smaller data
 */

const DB_NAME = "BiYuNote_Offline";
const DB_VERSION = 1;
const STORES = {
  posts: "posts",
  replies: "replies",
  drafts: "drafts",
  images: "images",
} as const;

type StoreName = keyof typeof STORES;

/**
 * Initialize IndexedDB
 */
function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.posts)) {
        const postsStore = db.createObjectStore(STORES.posts, { keyPath: "id" });
        postsStore.createIndex("category", "category", { unique: false });
        postsStore.createIndex("timestamp", "cachedAt", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.replies)) {
        const repliesStore = db.createObjectStore(STORES.replies, { keyPath: "id" });
        repliesStore.createIndex("postId", "postId", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.drafts)) {
        db.createObjectStore(STORES.drafts, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(STORES.images)) {
        db.createObjectStore(STORES.images, { keyPath: "url" });
      }
    };
  });
}

/**
 * Generic IndexedDB operations
 */
export const offlineStorage = {
  /**
   * Save data to IndexedDB
   */
  async save<T>(storeName: StoreName, data: T): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES[storeName]], "readwrite");
      const store = transaction.objectStore(STORES[storeName]);
      const request = store.put({
        ...data,
        cachedAt: Date.now(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Save multiple items
   */
  async saveMany<T>(storeName: StoreName, items: T[]): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES[storeName]], "readwrite");
      const store = transaction.objectStore(STORES[storeName]);

      let completed = 0;
      let hasError = false;

      items.forEach((item) => {
        const request = store.put({
          ...item,
          cachedAt: Date.now(),
        });

        request.onsuccess = () => {
          completed++;
          if (completed === items.length && !hasError) {
            resolve();
          }
        };

        request.onerror = () => {
          if (!hasError) {
            hasError = true;
            reject(request.error);
          }
        };
      });

      if (items.length === 0) {
        resolve();
      }
    });
  },

  /**
   * Get data from IndexedDB
   */
  async get<T>(storeName: StoreName, key: any): Promise<T | null> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES[storeName]], "readonly");
      const store = transaction.objectStore(STORES[storeName]);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Get all data from store
   */
  async getAll<T>(storeName: StoreName): Promise<T[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES[storeName]], "readonly");
      const store = transaction.objectStore(STORES[storeName]);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Delete data from IndexedDB
   */
  async delete(storeName: StoreName, key: any): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES[storeName]], "readwrite");
      const store = transaction.objectStore(STORES[storeName]);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Clear entire store
   */
  async clear(storeName: StoreName): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES[storeName]], "readwrite");
      const store = transaction.objectStore(STORES[storeName]);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Query by index
   */
  async getByIndex<T>(
    storeName: StoreName,
    indexName: string,
    value: any
  ): Promise<T[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES[storeName]], "readonly");
      const store = transaction.objectStore(STORES[storeName]);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Clean old cached data
   */
  async cleanOldCache(storeName: StoreName, maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const db = await initDB();
    const cutoffTime = Date.now() - maxAge;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES[storeName]], "readwrite");
      const store = transaction.objectStore(STORES[storeName]);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const data = cursor.value;
          if (data.cachedAt && data.cachedAt < cutoffTime) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Get cache size
   */
  async getCacheSize(): Promise<number> {
    let totalSize = 0;

    for (const storeName of Object.keys(STORES) as StoreName[]) {
      const items = await this.getAll(storeName);
      totalSize += items.length;
    }

    return totalSize;
  },
};

/**
 * Simple localStorage wrapper with error handling
 */
export const simpleStorage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Failed to get ${key} from localStorage:`, error);
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to set ${key} in localStorage:`, error);
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove ${key} from localStorage:`, error);
    }
  },

  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error("Failed to clear localStorage:", error);
    }
  },
};

/**
 * Cache expiration utilities
 */
export const cacheUtils = {
  /**
   * Check if cached data is still valid
   */
  isValid(cachedAt: number, maxAge: number = 5 * 60 * 1000): boolean {
    return Date.now() - cachedAt < maxAge;
  },

  /**
   * Get cache age in milliseconds
   */
  getAge(cachedAt: number): number {
    return Date.now() - cachedAt;
  },

  /**
   * Get cache age in human readable format
   */
  getAgeString(cachedAt: number): string {
    const age = this.getAge(cachedAt);
    const minutes = Math.floor(age / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return "방금";
  },
};
