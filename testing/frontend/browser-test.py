#!/usr/bin/env python3
"""
MemoryArk 2.0 瀏覽器交互測試
模擬真實用戶操作場景
"""

import asyncio
import json
import time
from datetime import datetime
from pathlib import Path
import requests
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

class MemoryArkBrowserTester:
    def __init__(self):
        self.base_url = "http://localhost:7001"
        self.test_results = []
        self.start_time = None
        self.driver = None
        
    def setup_driver(self):
        """設置 Chrome WebDriver"""
        try:
            chrome_options = Options()
            chrome_options.add_argument("--headless")  # 無頭模式
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--window-size=1920,1080")
            chrome_options.add_argument("--ignore-certificate-errors")
            chrome_options.add_argument("--ignore-ssl-errors")
            
            self.driver = webdriver.Chrome(options=chrome_options)
            self.driver.implicitly_wait(10)
            return True
        except Exception as e:
            print(f"❌ 無法設置 Chrome WebDriver: {e}")
            return False
    
    def log_test(self, test_id, test_name, status, details="", error="", screenshot=None):
        """記錄測試結果"""
        result = {
            "test_id": test_id,
            "test_name": test_name,
            "status": status,
            "timestamp": datetime.now().isoformat(),
            "details": details,
            "error": error,
            "screenshot": screenshot
        }
        self.test_results.append(result)
        
        status_symbol = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⏭️"
        print(f"{status_symbol} {test_id}: {test_name}")
        if details:
            print(f"   詳情: {details}")
        if error:
            print(f"   錯誤: {error}")
    
    def take_screenshot(self, name):
        """截圖"""
        if self.driver:
            try:
                screenshot_dir = Path("/home/davidliou/MyProject/MemoryArk2/testing/frontend/screenshots")
                screenshot_dir.mkdir(parents=True, exist_ok=True)
                
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"{name}_{timestamp}.png"
                filepath = screenshot_dir / filename
                
                self.driver.save_screenshot(str(filepath))
                return str(filepath)
            except Exception as e:
                print(f"截圖失敗: {e}")
                return None
        return None
    
    async def test_page_load_performance(self):
        """TC009: 頁面載入效能測試"""
        try:
            start_time = time.time()
            self.driver.get(self.base_url)
            
            # 等待頁面載入完成
            WebDriverWait(self.driver, 15).until(
                lambda driver: driver.execute_script("return document.readyState") == "complete"
            )
            
            load_time = time.time() - start_time
            
            # 檢查基本元素是否存在
            try:
                body = self.driver.find_element(By.TAG_NAME, "body")
                title = self.driver.title
                
                screenshot = self.take_screenshot("page_load")
                
                if load_time < 5.0:  # 5秒內載入完成
                    self.log_test("TC009", "頁面載入效能測試", "PASS", 
                                f"載入時間: {load_time:.2f}秒, 標題: {title}", 
                                screenshot=screenshot)
                else:
                    self.log_test("TC009", "頁面載入效能測試", "FAIL", 
                                f"載入時間過長: {load_time:.2f}秒", 
                                screenshot=screenshot)
                    
            except NoSuchElementException:
                self.log_test("TC009", "頁面載入效能測試", "FAIL", 
                            "頁面元素載入失敗")
                
        except TimeoutException:
            self.log_test("TC009", "頁面載入效能測試", "FAIL", 
                        "頁面載入超時 (15秒)")
        except Exception as e:
            self.log_test("TC009", "頁面載入效能測試", "FAIL", error=str(e))
    
    async def test_responsive_breakpoints(self):
        """TC010: 響應式斷點測試"""
        breakpoints = [
            (1920, 1080, "Desktop"),
            (1024, 768, "Tablet Landscape"),
            (768, 1024, "Tablet Portrait"),
            (414, 896, "Mobile"),
            (375, 667, "Mobile Small")
        ]
        
        for width, height, device in breakpoints:
            try:
                self.driver.set_window_size(width, height)
                time.sleep(1)  # 等待響應式調整
                
                # 檢查頁面是否正常顯示
                body = self.driver.find_element(By.TAG_NAME, "body")
                body_width = self.driver.execute_script("return document.body.scrollWidth")
                viewport_width = self.driver.execute_script("return window.innerWidth")
                
                screenshot = self.take_screenshot(f"responsive_{device.lower().replace(' ', '_')}")
                
                # 檢查是否有水平滾動條（除非是必要的）
                has_horizontal_scroll = body_width > viewport_width + 10  # 10px 容錯
                
                if not has_horizontal_scroll:
                    self.log_test("TC010", f"響應式測試 - {device}", "PASS", 
                                f"視窗: {width}x{height}, 無不必要的水平滾動", 
                                screenshot=screenshot)
                else:
                    self.log_test("TC010", f"響應式測試 - {device}", "FAIL", 
                                f"視窗: {width}x{height}, 出現水平滾動條", 
                                screenshot=screenshot)
                    
            except Exception as e:
                self.log_test("TC010", f"響應式測試 - {device}", "FAIL", error=str(e))
    
    async def test_navigation_elements(self):
        """TC011: 導航元素測試"""
        try:
            # 檢查常見的導航元素
            navigation_selectors = [
                ("nav", "主導航"),
                ("[role='navigation']", "導航角色"),
                (".navbar", "導航欄"),
                (".sidebar", "側邊欄"),
                (".menu", "選單"),
                ("header", "頁首"),
                ("main", "主內容區")
            ]
            
            found_elements = 0
            
            for selector, description in navigation_selectors:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    if elements:
                        found_elements += 1
                        self.log_test("TC011", f"導航元素測試 - {description}", "PASS", 
                                    f"找到 {len(elements)} 個元素")
                    else:
                        self.log_test("TC011", f"導航元素測試 - {description}", "FAIL", 
                                    "元素不存在")
                except Exception as e:
                    self.log_test("TC011", f"導航元素測試 - {description}", "FAIL", 
                                error=str(e))
            
            screenshot = self.take_screenshot("navigation_elements")
            
            if found_elements >= 3:
                self.log_test("TC011", "導航元素總體測試", "PASS", 
                            f"找到 {found_elements}/7 個導航元素", 
                            screenshot=screenshot)
            else:
                self.log_test("TC011", "導航元素總體測試", "FAIL", 
                            f"僅找到 {found_elements}/7 個導航元素", 
                            screenshot=screenshot)
                
        except Exception as e:
            self.log_test("TC011", "導航元素測試", "FAIL", error=str(e))
    
    async def test_form_elements(self):
        """TC012: 表單元素測試"""
        try:
            # 檢查表單相關元素
            form_selectors = [
                ("input", "輸入框"),
                ("button", "按鈕"),
                ("form", "表單"),
                ("select", "下拉選單"),
                ("textarea", "文字區域"),
                ("[type='file']", "檔案上傳"),
                ("[type='submit']", "提交按鈕")
            ]
            
            found_forms = 0
            
            for selector, description in form_selectors:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    if elements:
                        found_forms += 1
                        # 檢查第一個元素是否可見
                        first_element = elements[0]
                        is_visible = first_element.is_displayed()
                        
                        self.log_test("TC012", f"表單元素測試 - {description}", "PASS", 
                                    f"找到 {len(elements)} 個, 可見: {is_visible}")
                    else:
                        self.log_test("TC012", f"表單元素測試 - {description}", "SKIP", 
                                    "當前頁面無此元素")
                except Exception as e:
                    self.log_test("TC012", f"表單元素測試 - {description}", "FAIL", 
                                error=str(e))
            
            screenshot = self.take_screenshot("form_elements")
            
        except Exception as e:
            self.log_test("TC012", "表單元素測試", "FAIL", error=str(e))
    
    async def test_console_errors(self):
        """TC013: JavaScript 控制台錯誤測試"""
        try:
            # 獲取瀏覽器控制台日誌
            logs = self.driver.get_log('browser')
            
            errors = [log for log in logs if log['level'] == 'SEVERE']
            warnings = [log for log in logs if log['level'] == 'WARNING']
            
            if len(errors) == 0:
                self.log_test("TC013", "JavaScript 控制台錯誤測試", "PASS", 
                            f"無錯誤, 警告數: {len(warnings)}")
            elif len(errors) <= 2:  # 容許少量錯誤
                self.log_test("TC013", "JavaScript 控制台錯誤測試", "PASS", 
                            f"輕微錯誤: {len(errors)}, 警告: {len(warnings)}")
            else:
                error_messages = [log['message'] for log in errors[:3]]  # 只顯示前3個
                self.log_test("TC013", "JavaScript 控制台錯誤測試", "FAIL", 
                            f"錯誤數: {len(errors)}", 
                            error="; ".join(error_messages))
                
        except Exception as e:
            self.log_test("TC013", "JavaScript 控制台錯誤測試", "FAIL", error=str(e))
    
    async def test_accessibility_basics(self):
        """TC014: 基本無障礙功能測試"""
        try:
            # 檢查基本的無障礙屬性
            accessibility_checks = []
            
            # 檢查 alt 屬性
            images = self.driver.find_elements(By.TAG_NAME, "img")
            images_with_alt = [img for img in images if img.get_attribute("alt")]
            accessibility_checks.append(
                (len(images_with_alt), len(images), "圖片 alt 屬性")
            )
            
            # 檢查標題結構
            headings = self.driver.find_elements(By.CSS_SELECTOR, "h1, h2, h3, h4, h5, h6")
            accessibility_checks.append(
                (len(headings), "N/A", "標題結構")
            )
            
            # 檢查 ARIA 標籤
            aria_elements = self.driver.find_elements(By.CSS_SELECTOR, "[aria-label], [aria-labelledby], [role]")
            accessibility_checks.append(
                (len(aria_elements), "N/A", "ARIA 標籤")
            )
            
            # 檢查焦點可見性
            focusable = self.driver.find_elements(By.CSS_SELECTOR, 
                "a, button, input, select, textarea, [tabindex]")
            accessibility_checks.append(
                (len(focusable), "N/A", "可聚焦元素")
            )
            
            screenshot = self.take_screenshot("accessibility")
            
            passed_checks = 0
            total_checks = len(accessibility_checks)
            
            for value, total, description in accessibility_checks:
                if isinstance(total, int):
                    if total > 0 and value / total >= 0.8:  # 80% 覆蓋率
                        passed_checks += 1
                        status = "PASS"
                    else:
                        status = "FAIL"
                    self.log_test("TC014", f"無障礙測試 - {description}", status, 
                                f"{value}/{total}")
                else:
                    if value > 0:
                        passed_checks += 1
                        status = "PASS"
                    else:
                        status = "FAIL"
                    self.log_test("TC014", f"無障礙測試 - {description}", status, 
                                f"找到 {value} 個")
            
            if passed_checks >= total_checks * 0.75:
                self.log_test("TC014", "無障礙功能總體測試", "PASS", 
                            f"通過 {passed_checks}/{total_checks} 項檢查", 
                            screenshot=screenshot)
            else:
                self.log_test("TC014", "無障礙功能總體測試", "FAIL", 
                            f"僅通過 {passed_checks}/{total_checks} 項檢查", 
                            screenshot=screenshot)
                
        except Exception as e:
            self.log_test("TC014", "無障礙功能測試", "FAIL", error=str(e))
    
    async def run_all_tests(self):
        """執行所有瀏覽器測試"""
        print("🌐 開始 MemoryArk 2.0 瀏覽器交互測試")
        print("="*50)
        
        if not self.setup_driver():
            print("❌ WebDriver 設置失敗，跳過瀏覽器測試")
            return
        
        self.start_time = time.time()
        
        try:
            # 效能測試
            print("\n⚡ 效能測試")
            await self.test_page_load_performance()
            
            # 響應式測試
            print("\n📱 響應式設計測試")
            await self.test_responsive_breakpoints()
            
            # 界面元素測試
            print("\n🎨 界面元素測試")
            await self.test_navigation_elements()
            await self.test_form_elements()
            
            # JavaScript 測試
            print("\n💻 JavaScript 測試")
            await self.test_console_errors()
            
            # 無障礙測試
            print("\n♿ 無障礙功能測試")
            await self.test_accessibility_basics()
            
        finally:
            if self.driver:
                self.driver.quit()
        
        # 生成報告
        await self.generate_report()
    
    async def generate_report(self):
        """生成測試報告"""
        end_time = time.time()
        duration = end_time - self.start_time
        
        # 統計結果
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["status"] == "PASS"])
        failed_tests = len([r for r in self.test_results if r["status"] == "FAIL"])
        skipped_tests = len([r for r in self.test_results if r["status"] == "SKIP"])
        
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        # 控制台摘要
        print("\n" + "="*50)
        print("📊 瀏覽器測試結果摘要")
        print("="*50)
        print(f"總測試數: {total_tests}")
        print(f"通過: {passed_tests} ✅")
        print(f"失敗: {failed_tests} ❌") 
        print(f"跳過: {skipped_tests} ⏭️")
        print(f"成功率: {success_rate:.1f}%")
        print(f"執行時間: {duration:.2f}秒")
        
        # 生成 JSON 報告
        report = {
            "test_session": {
                "start_time": datetime.fromtimestamp(self.start_time).isoformat(),
                "end_time": datetime.now().isoformat(),
                "duration_seconds": duration,
                "base_url": self.base_url,
                "test_type": "browser_interaction"
            },
            "summary": {
                "total_tests": total_tests,
                "passed": passed_tests,
                "failed": failed_tests,
                "skipped": skipped_tests,
                "success_rate": success_rate
            },
            "test_results": self.test_results
        }
        
        # 保存報告
        test_dir = Path("/home/davidliou/MyProject/MemoryArk2/testing/frontend/results")
        test_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        json_file = test_dir / f"browser_test_report_{timestamp}.json"
        
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print(f"\n📄 瀏覽器測試報告已保存: {json_file}")
        
        return report

async def main():
    """主函數"""
    tester = MemoryArkBrowserTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())