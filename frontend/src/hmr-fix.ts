// 修復 Cloudflare Tunnel + Vite HMR WebSocket 連接問題
// 這個腳本確保在 HTTPS 環境下使用正確的 WSS 協議

if (import.meta.hot && typeof window !== 'undefined') {
  // 檢測當前是否通過 HTTPS 訪問
  const isHTTPS = window.location.protocol === 'https:';
  const isCloudflareHost = window.location.hostname === 'files.94work.net';
  
  if (isHTTPS && isCloudflareHost) {
    // 覆蓋 Vite 的 HMR WebSocket 連接設置
    const originalWebSocket = window.WebSocket;
    
    window.WebSocket = new Proxy(originalWebSocket, {
      construct(target, args: [string | URL, string | string[] | undefined]) {
        let url = args[0];
        const protocols = args[1];
        
        // 將不安全的 WS 連接轉換為安全的 WSS 連接
        if (typeof url === 'string') {
          if (url.startsWith('ws://files.94work.net') || url.includes('files.94work.net')) {
            url = url.replace('ws://', 'wss://');
            // 移除端口號，因為 HTTPS 使用 443
            url = url.replace(':5175', '').replace(':5174', '').replace(':5173', '');
          }
          // 對於 localhost 的連接，也嘗試使用正確的端口
          if (url.includes('localhost') && window.location.hostname === 'files.94work.net') {
            url = url.replace('ws://localhost', 'wss://files.94work.net');
            url = url.replace(':5175', '').replace(':5174', '').replace(':5173', '');
          }
        }
        
        console.log('[HMR] 正在連接到:', url);
        return new target(url, protocols);
      }
    }) as typeof WebSocket;
  }
}
