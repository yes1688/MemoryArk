package websocket

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// 生產環境中應該檢查來源
		return true
	},
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// WebSocketHandler WebSocket 處理器
type WebSocketHandler struct {
	hub *Hub
}

// NewWebSocketHandler 創建新的 WebSocket 處理器
func NewWebSocketHandler() *WebSocketHandler {
	hub := NewHub()
	go hub.Run()
	return &WebSocketHandler{
		hub: hub,
	}
}

// HandleWebSocket 處理 WebSocket 連線
func (h *WebSocketHandler) HandleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket 升級失敗: %v", err)
		return
	}

	client := &Client{
		conn: conn,
		send: make(chan FileSystemEvent, 256),
		hub:  h.hub,
	}

	client.hub.register <- client

	// 啟動讀寫協程
	go client.WritePump()
	go client.ReadPump()

	log.Printf("新的 WebSocket 連線已建立")
}

// BroadcastFileEvent 廣播檔案系統事件
func (h *WebSocketHandler) BroadcastFileEvent(eventType string, folderId *int, message string, data interface{}) {
	event := FileSystemEvent{
		Type:      eventType,
		FolderId:  folderId,
		Message:   message,
		Data:      data,
		Timestamp: time.Now().Unix(),
	}

	h.hub.BroadcastEvent(event)
	log.Printf("廣播檔案系統事件: %s, 資料夾: %v, 訊息: %s", eventType, folderId, message)
}

// GetHub 獲取 Hub 實例（用於其他處理器廣播事件）
func (h *WebSocketHandler) GetHub() *Hub {
	return h.hub
}