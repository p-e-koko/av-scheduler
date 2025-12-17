import { API_BASE_URL, APIError } from './api';

let serverTimeOffset = 0;
let isInitialized = false;

interface HealthResponse {
    status: string;
    timestamp: string;
    service: string;
}

/**
 * Initializes the server time offset by fetching the current time from the server.
 * This should be called once when the application starts or when precision is needed.
 */
export const initServerTime = async (): Promise<void> => {
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch server time: ${response.status}`);
        }

        const data: HealthResponse = await response.json();
        const serverTime = new Date(data.timestamp).getTime();
        const clientTime = Date.now();

        // Calculate difference: positive if server is ahead, negative if server is behind
        // serverTime = clientTime + offset
        // offset = serverTime - clientTime
        serverTimeOffset = serverTime - clientTime;
        isInitialized = true;

        console.log(`Server time synchronized. Offset: ${serverTimeOffset}ms`);
    } catch (error) {
        console.error('Failed to initialize server time, falling back to client time:', error);
        // Fallback to 0 offset (client time)
        serverTimeOffset = 0;
        isInitialized = true; // Mark as initialized to prevent repeated failures
    }
};

/**
 * Returns a Date object representing the current time on the server.
 * If server time hasn't been initialized, it returns the client time (or approximates it if offset is 0).
 */
export const getServerTime = (): Date => {
    if (!isInitialized) {
        // If not yet initialized, use client time but trigger initialization in background
        // This is a "lazy" init potentially, but ideally initServerTime is called at app boot
        // For now we just return client time if not ready to avoid blocking
        return new Date();
    }
    return new Date(Date.now() + serverTimeOffset);
};

/**
 * Converts a specific client date to server time (if the date was created with client clock).
 * This is useful if you have a "now" from client and want to shift it.
 * But usually you should just use getServerTime() instead of new Date().
 */
export const toServerTime = (clientDate: Date): Date => {
    return new Date(clientDate.getTime() + serverTimeOffset);
};

/**
 * Get today's date in YYYY-MM-DD format based on server time.
 */
export const getServerTodayResult = (): string => {
    const d = getServerTime();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
