export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // LINE API
  line: {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    channelSecret: process.env.LINE_CHANNEL_SECRET || '',
    channelId: process.env.LINE_CHANNEL_ID || '',
  },

  // MemoryArk API
  memoryark: {
    apiUrl: process.env.MEMORYARK_API_URL || 'http://localhost:8081',
    apiToken: process.env.MEMORYARK_API_TOKEN || '',
    uploadEndpoint: process.env.MEMORYARK_UPLOAD_ENDPOINT || '/api/api-access/files/upload',
    maxFileSize: parseInt(process.env.MEMORYARK_MAX_FILE_SIZE || '20971520'), // 20MB
    allowedMimeTypes: (process.env.MEMORYARK_ALLOWED_MIME_TYPES || 'image/jpeg,image/png,image/gif,image/webp,image/bmp').split(','),
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0'),
  },

  // Server
  server: {
    port: parseInt(process.env.PORT || '3000'),
    env: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
  },
};

// 驗證必要配置
export function validateConfig() {
  const required = [
    'LINE_CHANNEL_ACCESS_TOKEN',
    'LINE_CHANNEL_SECRET',
    'LINE_CHANNEL_ID',
    'MEMORYARK_API_URL',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  // 驗證 LINE 配置
  if (!config.line.channelAccessToken || !config.line.channelSecret) {
    throw new Error('LINE channel access token and secret are required');
  }

  // 驗證 MemoryArk 配置
  if (!config.memoryark.apiUrl) {
    throw new Error('MemoryArk API URL is required');
  }

  // API Token 是可選的，用於外部通訊時的認證
  if (config.memoryark.apiToken && config.memoryark.apiToken.trim()) {
    console.log('✅ Using API Token authentication for MemoryArk');
  } else {
    console.log('🔗 Using internal container communication (no token)');
  }

  // 驗證檔案大小限制
  if (config.memoryark.maxFileSize <= 0) {
    throw new Error('MemoryArk max file size must be greater than 0');
  }

  // 驗證端口設定
  if (config.server.port <= 0 || config.server.port > 65535) {
    throw new Error('Server port must be between 1 and 65535');
  }
}
