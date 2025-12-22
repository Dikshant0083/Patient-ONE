// ===================================================================
// BROWSER CACHING IMPLEMENTATION
// ===================================================================
// Using IndexedDB (for complex data) + LocalStorage (for simple data)
// ===================================================================


// ===================================================================
// FILE: public/js/cache-manager.js (NEW FILE)
// ===================================================================

class CacheManager {
  constructor() {
    this.dbName = 'MediCareDB';
    this.dbVersion = 1;
    this.db = null;
    this.init();
  }

  // Initialize IndexedDB
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores
        if (!db.objectStoreNames.contains('records')) {
          db.createObjectStore('records', { keyPath: '_id' });
        }
        if (!db.objectStoreNames.contains('appointments')) {
          db.createObjectStore('appointments', { keyPath: '_id' });
        }
        if (!db.objectStoreNames.contains('doctors')) {
          db.createObjectStore('doctors', { keyPath: '_id' });
        }
        if (!db.objectStoreNames.contains('messages')) {
          const messagesStore = db.createObjectStore('messages', { 
            keyPath: '_id', 
            autoIncrement: true 
          });
          messagesStore.createIndex('roomId', 'roomId', { unique: false });
        }
      };
    });
  }

  // ===== IndexedDB Methods =====

  // Save data to IndexedDB
  async saveToIndexedDB(storeName, data) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      if (Array.isArray(data)) {
        // Save multiple items
        data.forEach(item => store.put(item));
      } else {
        // Save single item
        store.put(data);
      }

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Get data from IndexedDB
  async getFromIndexedDB(storeName, key) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all data from IndexedDB
  async getAllFromIndexedDB(storeName) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Delete from IndexedDB
  async deleteFromIndexedDB(storeName, key) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // Clear store
  async clearStore(storeName) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // ===== LocalStorage Methods =====

  // Save to LocalStorage
  saveToLocalStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('LocalStorage save error:', error);
      return false;
    }
  }

  // Get from LocalStorage
  getFromLocalStorage(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('LocalStorage get error:', error);
      return null;
    }
  }

  // Delete from LocalStorage
  deleteFromLocalStorage(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('LocalStorage delete error:', error);
      return false;
    }
  }

  // ===== SessionStorage Methods =====

  // Save to SessionStorage
  saveToSessionStorage(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('SessionStorage save error:', error);
      return false;
    }
  }

  // Get from SessionStorage
  getFromSessionStorage(key) {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('SessionStorage get error:', error);
      return null;
    }
  }

  // ===== High-Level Cache Methods =====

  // Cache medical records
  async cacheMedicalRecords(records) {
    await this.saveToIndexedDB('records', records);
    this.saveToLocalStorage('records_timestamp', Date.now());
  }

  // Get cached medical records
  async getCachedMedicalRecords() {
    const timestamp = this.getFromLocalStorage('records_timestamp');
    const cacheAge = Date.now() - (timestamp || 0);
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    if (cacheAge < CACHE_DURATION) {
      return await this.getAllFromIndexedDB('records');
    }
    return null;
  }

  // Cache appointments
  async cacheAppointments(appointments) {
    await this.saveToIndexedDB('appointments', appointments);
    this.saveToLocalStorage('appointments_timestamp', Date.now());
  }

  // Get cached appointments
  async getCachedAppointments() {
    const timestamp = this.getFromLocalStorage('appointments_timestamp');
    const cacheAge = Date.now() - (timestamp || 0);
    const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

    if (cacheAge < CACHE_DURATION) {
      return await this.getAllFromIndexedDB('appointments');
    }
    return null;
  }

  // Cache doctors list
  async cacheDoctors(doctors) {
    await this.saveToIndexedDB('doctors', doctors);
    this.saveToLocalStorage('doctors_timestamp', Date.now());
  }

  // Get cached doctors
  async getCachedDoctors() {
    const timestamp = this.getFromLocalStorage('doctors_timestamp');
    const cacheAge = Date.now() - (timestamp || 0);
    const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

    if (cacheAge < CACHE_DURATION) {
      return await this.getAllFromIndexedDB('doctors');
    }
    return null;
  }

  // Cache chat messages
  async cacheMessage(message, roomId) {
    const messageWithRoom = { ...message, roomId, _id: `${roomId}_${Date.now()}` };
    await this.saveToIndexedDB('messages', messageWithRoom);
  }

  // Get cached messages for room
  async getCachedMessages(roomId) {
    const allMessages = await this.getAllFromIndexedDB('messages');
    return allMessages.filter(msg => msg.roomId === roomId);
  }

  // Cache user preferences
  saveUserPreferences(preferences) {
    this.saveToLocalStorage('user_preferences', preferences);
  }

  // Get user preferences
  getUserPreferences() {
    return this.getFromLocalStorage('user_preferences') || {
      theme: 'light',
      notifications: true,
      language: 'en'
    };
  }

  // Cache dashboard stats
  cacheDashboardStats(stats) {
    this.saveToSessionStorage('dashboard_stats', stats);
  }

  // Get cached dashboard stats
  getCachedDashboardStats() {
    return this.getFromSessionStorage('dashboard_stats');
  }

  // Clear all cache
  async clearAllCache() {
    await this.clearStore('records');
    await this.clearStore('appointments');
    await this.clearStore('doctors');
    await this.clearStore('messages');
    localStorage.clear();
    sessionStorage.clear();
  }
}

// Export singleton instance
const cacheManager = new CacheManager();

// ===================================================================
// USAGE EXAMPLES
// ===================================================================

// Example 1: Cache medical records on dashboard load
async function loadDashboardWithCache() {
  // Try to get from cache first
  const cachedRecords = await cacheManager.getCachedMedicalRecords();
  
  if (cachedRecords && cachedRecords.length > 0) {
    console.log('Loading from cache...');
    displayRecords(cachedRecords);
  } else {
    console.log('Fetching from server...');
    const response = await fetch('/api/patient/records');
    const records = await response.json();
    
    // Cache for next time
    await cacheManager.cacheMedicalRecords(records);
    displayRecords(records);
  }
}

// Example 2: Cache appointments
async function loadAppointmentsWithCache() {
  const cached = await cacheManager.getCachedAppointments();
  
  if (cached) {
    return cached;
  }
  
  const response = await fetch('/api/patient/appointments');
  const appointments = await response.json();
  await cacheManager.cacheAppointments(appointments);
  return appointments;
}

// Example 3: Save chat messages offline
async function sendMessageWithCache(message, roomId) {
  // Save to cache immediately
  await cacheManager.cacheMessage(message, roomId);
  
  // Try to send to server
  try {
    await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, roomId })
    });
  } catch (error) {
    console.log('Offline - message saved locally');
  }
}

// Example 4: Load cached messages on chat open
async function loadChatWithCache(roomId) {
  // Load from cache first (instant display)
  const cachedMessages = await cacheManager.getCachedMessages(roomId);
  displayMessages(cachedMessages);
  
  // Then fetch latest from server
  const response = await fetch(`/api/chat/messages/${roomId}`);
  const latestMessages = await response.json();
  
  // Update cache and display
  for (const msg of latestMessages) {
    await cacheManager.cacheMessage(msg, roomId);
  }
  displayMessages(latestMessages);
}

// Example 5: User preferences
function saveThemePreference(theme) {
  const prefs = cacheManager.getUserPreferences();
  prefs.theme = theme;
  cacheManager.saveUserPreferences(prefs);
  applyTheme(theme);
}

// Example 6: Dashboard stats (session only)
function cacheDashboardData(stats) {
  cacheManager.cacheDashboardStats(stats);
}

function getDashboardData() {
  return cacheManager.getCachedDashboardStats();
}