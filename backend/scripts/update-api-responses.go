package main

import (
	"bufio"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// 定義需要替換的模式
var replacementPatterns = []struct {
	pattern     *regexp.Regexp
	replacement string
}{
	// 成功響應模式
	{
		pattern:     regexp.MustCompile(`c\.JSON\(http\.StatusOK,\s*gin\.H\{\s*"success":\s*true,\s*"data":\s*([^}]+)\s*\}\)`),
		replacement: "api.Success(c, $1)",
	},
	{
		pattern:     regexp.MustCompile(`c\.JSON\(http\.StatusCreated,\s*gin\.H\{\s*"success":\s*true,\s*"data":\s*([^}]+)\s*\}\)`),
		replacement: "c.Status(http.StatusCreated)\n\tapi.Success(c, $1)",
	},
	// 錯誤響應模式
	{
		pattern:     regexp.MustCompile(`c\.JSON\(http\.StatusUnauthorized,\s*gin\.H\{\s*"success":\s*false,\s*"error":\s*gin\.H\{\s*"code":\s*"UNAUTHORIZED",\s*"message":\s*"([^"]+)"\s*\}\s*\}\)`),
		replacement: `api.Unauthorized(c, "$1")`,
	},
	{
		pattern:     regexp.MustCompile(`c\.JSON\(http\.StatusBadRequest,\s*gin\.H\{\s*"success":\s*false,\s*"error":\s*gin\.H\{\s*"code":\s*"[^"]+",\s*"message":\s*"([^"]+)"\s*\}\s*\}\)`),
		replacement: `api.BadRequest(c, "$1")`,
	},
	{
		pattern:     regexp.MustCompile(`c\.JSON\(http\.StatusInternalServerError,\s*gin\.H\{\s*"success":\s*false,\s*"error":\s*gin\.H\{\s*"code":\s*"[^"]+",\s*"message":\s*"([^"]+)"\s*\}\s*\}\)`),
		replacement: `api.InternalServerError(c, "$1")`,
	},
	{
		pattern:     regexp.MustCompile(`c\.JSON\(http\.StatusNotFound,\s*gin\.H\{\s*"success":\s*false,\s*"error":\s*gin\.H\{\s*"code":\s*"[^"]+",\s*"message":\s*"([^"]+)不存在"\s*\}\s*\}\)`),
		replacement: `api.NotFound(c, "$1")`,
	},
}

func main() {
	// 處理所有 handler 文件
	handlersDir := "/home/davidliou/MyProject/MemoryArk2/backend/internal/api/handlers"
	
	files, err := filepath.Glob(filepath.Join(handlersDir, "*.go"))
	if err != nil {
		fmt.Printf("Error finding handler files: %v\n", err)
		return
	}

	for _, file := range files {
		if strings.HasSuffix(file, "_test.go") {
			continue
		}

		fmt.Printf("Processing %s...\n", filepath.Base(file))
		if err := processFile(file); err != nil {
			fmt.Printf("Error processing %s: %v\n", file, err)
		}
	}
}

func processFile(filename string) error {
	// 讀取文件內容
	content, err := ioutil.ReadFile(filename)
	if err != nil {
		return err
	}

	originalContent := string(content)
	modifiedContent := originalContent

	// 檢查是否已經導入了 api package
	hasApiImport := strings.Contains(modifiedContent, `"memoryark/pkg/api"`)

	// 應用所有替換模式
	for _, rp := range replacementPatterns {
		modifiedContent = rp.pattern.ReplaceAllString(modifiedContent, rp.replacement)
	}

	// 如果內容有變化且需要 api package
	if modifiedContent != originalContent && !hasApiImport {
		// 添加 api import
		importPattern := regexp.MustCompile(`(import\s*\(\s*\n)`)
		modifiedContent = importPattern.ReplaceAllString(modifiedContent, `${1}	"memoryark/pkg/api"`+"\n")
	}

	// 如果內容有變化，寫回文件
	if modifiedContent != originalContent {
		return ioutil.WriteFile(filename, []byte(modifiedContent), 0644)
	}

	return nil
}