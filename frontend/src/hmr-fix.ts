// 修復 Cloudflare Tunnel + Vite HMR WebSocket 連接問題
// 這個腳本確保在 HTTPS 環境下使用正確的 WSS 協議

if (import.meta.hot && typeof window !== 'undefined') {
  // 檢測當前是否通過 HTTPS 訪問
  const isHTTPS = window.location.protocol === 'https:';
  const isCloudflareHost = window.location.hostname === 'files.94work.net';
  
  if (isHTTPS && isCloudflareHost) {
    // 覆蓋 Vite 的 HMR WebSocket 連接設置
    const originalWebSocket = window.WebSocket;
    
    window.WebSocket = function(url, protocols) {
      // 將不安全的 WS 連接轉換為安全的 WSS 連接
      if (typeof url === 'string' && url.startsWith('ws://files.94work.net')) {
        url = url.replace('ws://', 'wss://');
        // 移除端口號，因為 HTTPS 使用 443
        url = url.replace(':5175', '').replace(':5174', '').replace(':5173', '');
      }
      
      console.log('[HMR] 正在連接到:', url);
      return new originalWebSocket(url, protocols);
    };
    
    // 複製原始 WebSocket 的靜態屬性
    Object.setPrototypeOf(window.WebSocket, originalWebSocket);
    Object.defineProperty(window.WebSocket, 'prototype', {
      value: originalWebSocket.prototype,
      writable: false
    });
  }
}
