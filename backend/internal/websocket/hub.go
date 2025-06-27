package websocket

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

// FileSystemEvent 檔案系統事件結構
type FileSystemEvent struct {
	Type      string      `json:"type"`      // upload, delete, create, move, rename
	FolderId  *int        `json:"folderId"`  // 影響的資料夾ID
	Message   string      `json:"message"`   // 事件描述
	Data      interface{} `json:"data"`      // 事件相關數據
	Timestamp int64       `json:"timestamp"` // 事件時間戳
}

// Client 代表一個 WebSocket 連線
type Client struct {
	conn     *websocket.Conn
	send     chan FileSystemEvent
	hub      *Hub
	folderId *int // 客戶端正在瀏覽的資料夾ID（可選）
}

// Hub 管理所有 WebSocket 連線
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan FileSystemEvent
	register   chan *Client
	unregister chan *Client
	mutex      sync.RWMutex
}

// NewHub 創建新的 Hub
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan FileSystemEvent),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

// Run 運行 Hub
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client] = true
			h.mutex.Unlock()
			log.Printf("客戶端已連接，總連線數: %d", len(h.clients))

		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				h.mutex.Unlock()
				log.Printf("客戶端已斷開，總連線數: %d", len(h.clients))
			} else {
				h.mutex.Unlock()
			}

		case event := <-h.broadcast:
			h.mutex.RLock()
			for client := range h.clients {
				// 檢查是否應該向此客戶端發送事件
				if h.shouldSendToClient(client, event) {
					select {
					case client.send <- event:
					default:
						// 如果發送失敗，關閉此客戶端
						delete(h.clients, client)
						close(client.send)
					}
				}
			}
			h.mutex.RUnlock()
		}
	}
}

// shouldSendToClient 判斷是否應該向特定客戶端發送事件
func (h *Hub) shouldSendToClient(client *Client, event FileSystemEvent) bool {
	// 如果客戶端沒有設置特定資料夾，發送所有事件
	if client.folderId == nil {
		return true
	}

	// 如果事件沒有指定資料夾，發送給所有客戶端
	if event.FolderId == nil {
		return true
	}

	// 如果客戶端正在瀏覽的資料夾與事件相關，發送事件
	return *client.folderId == *event.FolderId
}

// BroadcastEvent 廣播事件到所有相關客戶端
func (h *Hub) BroadcastEvent(event FileSystemEvent) {
	select {
	case h.broadcast <- event:
	default:
		log.Printf("警告: 廣播頻道已滿，事件可能丟失")
	}
}

// ReadPump 處理從客戶端讀取訊息
func (c *Client) ReadPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	// 設置讀取參數
	c.conn.SetReadLimit(512)

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket 意外關閉: %v", err)
			}
			break
		}

		// 處理客戶端發送的訊息（例如設置當前資料夾）
		var msg map[string]interface{}
		if err := json.Unmarshal(message, &msg); err == nil {
			if msgType, ok := msg["type"].(string); ok {
				switch msgType {
				case "set_folder":
					if folderIdFloat, ok := msg["folderId"].(float64); ok {
						folderId := int(folderIdFloat)
						c.folderId = &folderId
						log.Printf("客戶端設置當前資料夾: %d", folderId)
					}
				case "ping":
					// 心跳包，發送 pong 回應
					pong := FileSystemEvent{
						Type:      "pong",
						Message:   "pong",
						Timestamp: 0, // 將在實際使用時設置
					}
					select {
					case c.send <- pong:
					default:
						return
					}
				}
			}
		}
	}
}

// WritePump 處理向客戶端發送訊息
func (c *Client) WritePump() {
	defer c.conn.Close()

	for {
		select {
		case event, ok := <-c.send:
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteJSON(event); err != nil {
				log.Printf("寫入 WebSocket 訊息失敗: %v", err)
				return
			}
		}
	}
}