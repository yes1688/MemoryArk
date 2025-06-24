import { Router } from 'express';
import { handleWebhook, healthCheck } from '../controllers/webhook';
import {
  validateLineSignature,
  validateLineWebhookRequest,
  lineWebhookErrorHandler,
  logLineWebhookRequest,
  rateLimitLineWebhook,
  lineWebhookCors,
  bypassHealthCheck,
} from '../middleware/lineWebhook';

/**
 * LINE Webhook 路由設定
 */
export function createWebhookRouter(channelSecret: string): Router {
  const router = Router();

  // 健康檢查繞過中間件
  router.use(bypassHealthCheck);

  // CORS 設定
  router.use(lineWebhookCors);

  // 請求日誌
  router.use(logLineWebhookRequest);

  // 速率限制 (每分鐘最多 100 個請求)
  router.use(rateLimitLineWebhook(100, 60000));

  // LINE Webhook 路由
  router.post('/line',
    validateLineSignature(channelSecret),
    validateLineWebhookRequest,
    handleWebhook
  );

  // 健康檢查路由
  router.get('/health', healthCheck);

  // Webhook 專用錯誤處理
  router.use(lineWebhookErrorHandler);

  return router;
}

export default createWebhookRouter;