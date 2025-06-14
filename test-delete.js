// 測試前端刪除功能
async function testDelete() {
    try {
        console.log('=== 開始測試刪除功能 ===');
        
        // 1. 檢查當前文件列表
        console.log('1. 獲取當前文件列表...');
        let response = await fetch('/api/files');
        let data = await response.json();
        console.log('當前文件:', data.data.files.map(f => ({ id: f.id, name: f.name })));
        
        if (data.data.files.length === 0) {
            console.log('沒有文件可刪除，先上傳一個文件進行測試');
            return;
        }
        
        // 2. 刪除第一個文件
        const fileToDelete = data.data.files[0];
        console.log(`2. 刪除文件: ${fileToDelete.name} (ID: ${fileToDelete.id})`);
        
        const deleteResponse = await fetch(`/api/files/${fileToDelete.id}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        const deleteData = await deleteResponse.json();
        console.log('刪除API響應:', deleteData);
        
        if (!deleteData.success) {
            console.error('刪除失敗:', deleteData.message);
            return;
        }
        
        // 3. 再次檢查文件列表
        console.log('3. 檢查刪除後的文件列表...');
        response = await fetch('/api/files');
        data = await response.json();
        console.log('刪除後文件:', data.data.files.map(f => ({ id: f.id, name: f.name })));
        
        console.log('=== 測試完成 ===');
        
    } catch (error) {
        console.error('測試錯誤:', error);
    }
}

// 運行測試
testDelete();
