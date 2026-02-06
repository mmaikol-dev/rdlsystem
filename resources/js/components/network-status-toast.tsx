import * as React from 'react';
import { toast } from 'sonner';

const OFFLINE_TOAST_ID = 'network-offline';

export function NetworkStatusToast() {
    React.useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const showOffline = () => {
            toast.error("You're offline. Check your internet connection.", {
                id: OFFLINE_TOAST_ID,
                duration: Number.POSITIVE_INFINITY,
            });
        };

        const clearOffline = () => {
            toast.dismiss(OFFLINE_TOAST_ID);
        };

        if (!navigator.onLine) {
            showOffline();
        }

        window.addEventListener('offline', showOffline);
        window.addEventListener('online', clearOffline);

        return () => {
            window.removeEventListener('offline', showOffline);
            window.removeEventListener('online', clearOffline);
            clearOffline();
        };
    }, []);

    return null;
}
