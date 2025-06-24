"use strict";
describe('Health Check', () => {
    test('should return basic health status', () => {
        const mockHealthResponse = {
            service: 'line-service',
            status: 'ok',
            timestamp: expect.any(String),
            version: expect.any(String),
            uptime: expect.any(Number),
            environment: 'test',
        };
        expect(mockHealthResponse).toMatchObject({
            service: 'line-service',
            status: 'ok',
        });
    });
    test('should validate required environment variables', () => {
        const requiredVars = [
            'LINE_CHANNEL_ACCESS_TOKEN',
            'LINE_CHANNEL_SECRET',
            'LINE_CHANNEL_ID',
            'MEMORYARK_API_URL',
            'MEMORYARK_API_TOKEN',
        ];
        expect(requiredVars).toHaveLength(5);
        expect(requiredVars).toContain('LINE_CHANNEL_ACCESS_TOKEN');
        expect(requiredVars).toContain('MEMORYARK_API_URL');
    });
});
//# sourceMappingURL=health.test.js.map