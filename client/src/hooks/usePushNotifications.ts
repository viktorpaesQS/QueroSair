import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// VAPID public key - in production, this should come from environment
const VAPID_PUBLIC_KEY = 'BMi4---c8fDLaxxMrJOEy4-S8i-xf5GQGA3LgYMBBxs7VMoCgalBFd0PEezzo6rHv81TKBvOtuGIoQQ4W_WdgpI';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  // Check if push notifications are supported
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          setIsSubscribed(true);
          setSubscription(subscription);
        }
      }
    } catch (error) {
      console.error('Error checking push subscription:', error);
    }
  };

  const subscribeMutation = useMutation({
    mutationFn: async (subscriptionData: PushSubscriptionJSON) => {
      return apiRequest('/api/push/subscribe', {
        method: 'POST',
        body: JSON.stringify(subscriptionData),
      });
    },
    onSuccess: () => {
      setIsSubscribed(true);
    },
    onError: (error) => {
      console.error('Failed to save push subscription:', error);
    },
  });

  const subscribe = async () => {
    if (!isSupported) {
      throw new Error('Push notifications are not supported');
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        throw new Error('Service worker not registered');
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      setSubscription(subscription);
      
      // Save subscription to server
      await subscribeMutation.mutateAsync(subscription.toJSON());
      
      return subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      throw error;
    }
  };

  const unsubscribe = async () => {
    if (subscription) {
      try {
        await subscription.unsubscribe();
        setIsSubscribed(false);
        setSubscription(null);
        
        // Optionally notify server about unsubscription
        await apiRequest('/api/push/unsubscribe', {
          method: 'POST',
        });
      } catch (error) {
        console.error('Error unsubscribing from push notifications:', error);
        throw error;
      }
    }
  };

  return {
    isSupported,
    isSubscribed,
    subscription,
    subscribe,
    unsubscribe,
    isSubscribing: subscribeMutation.isPending,
  };
}