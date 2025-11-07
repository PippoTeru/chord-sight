/**
 * Service Worker登録
 * SF2ファイルをキャッシュして高速化
 */

export async function registerServiceWorker(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('[SW] Service Worker not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    console.log('[SW] Service Worker registered:', registration);

    // 更新をチェック
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            console.log('[SW] New Service Worker activated');
          }
        });
      }
    });
  } catch (error) {
    console.error('[SW] Service Worker registration failed:', error);
  }
}

/**
 * Service Workerを解除（開発時のデバッグ用）
 */
export async function unregisterServiceWorker(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      console.log('[SW] Service Worker unregistered');
    }
  } catch (error) {
    console.error('[SW] Service Worker unregistration failed:', error);
  }
}
