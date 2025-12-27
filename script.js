// 学习资源管理器 JavaScript 逻辑

// 1. LocalStorage 数据存储封装
class Storage {
    constructor() {
        this.prefix = 'learning_resource_manager_';
        this.debounceTimers = {};
        this.debounceDelay = 300; // 300ms防抖延迟
    }

    // 设置数据 - 防抖实现
    set(key, value) {
        // 清除之前的定时器
        if (this.debounceTimers[key]) {
            clearTimeout(this.debounceTimers[key]);
        }

        // 设置新的定时器
        this.debounceTimers[key] = setTimeout(() => {
            try {
                const data = JSON.stringify(value);
                localStorage.setItem(`${this.prefix}${key}`, data);
                delete this.debounceTimers[key];
            } catch (error) {
                console.error('存储数据失败:', error);
            }
        }, this.debounceDelay);

        return true;
    }

    // 立即设置数据（不使用防抖）
    setImmediately(key, value) {
        try {
            const data = JSON.stringify(value);
            localStorage.setItem(`${this.prefix}${key}`, data);
            return true;
        } catch (error) {
            console.error('存储数据失败:', error);
            return false;
        }
    }

    // 获取数据
    get(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(`${this.prefix}${key}`);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('获取数据失败:', error);
            return defaultValue;
        }
    }

    // 删除数据
    remove(key) {
        try {
            localStorage.removeItem(`${this.prefix}${key}`);
            return true;
        } catch (error) {
            console.error('删除数据失败:', error);
            return false;
        }
    }

    // 清空所有数据
    clear() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.error('清空数据失败:', error);
            return false;
        }
    }
}

// 2. 学习资源管理模块
class ResourceManager {
    constructor(storage) {
        this.storage = storage;
        this.resources = this.storage.get('resources', []);
    }

    // 生成唯一ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // 添加资源
    addResource(resource) {
        const newResource = {
            id: this.generateId(),
            title: resource.title,
            type: resource.type,
            url: resource.url || '',
            description: resource.description || '',
            tags: resource.tags || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.resources.push(newResource);
        this.save();
        return newResource;
    }

    // 获取所有资源
    getAllResources() {
        return [...this.resources];
    }

    // 根据ID获取资源
    getResourceById(id) {
        // 使用Map或对象存储索引会更快，但为了简单起见，这里继续使用find
        return this.resources.find(resource => resource.id === id);
    }

    // 根据类型获取资源
    getResourcesByType(type) {
        return this.resources.filter(resource => resource.type === type);
    }

    // 更新资源
    updateResource(id, updates) {
        const index = this.resources.findIndex(resource => resource.id === id);
        if (index === -1) return null;

        this.resources[index] = {
            ...this.resources[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        this.save();
        return this.resources[index];
    }

    // 删除资源
    deleteResource(id) {
        const index = this.resources.findIndex(resource => resource.id === id);
        if (index === -1) return false;

        this.resources.splice(index, 1);
        this.save();
        return true;
    }

    // 搜索资源 - 优化版本
    searchResources(query) {
        if (!query) return this.resources;
        
        const lowerQuery = query.toLowerCase();
        // 预编译正则表达式可以提高性能
        const regex = new RegExp(lowerQuery, 'i');
        
        return this.resources.filter(resource => 
            regex.test(resource.title) ||
            regex.test(resource.description) ||
            resource.tags.some(tag => regex.test(tag))
        );
    }

    // 保存到本地存储
    save() {
        this.storage.set('resources', this.resources);
    }

    // 立即保存到本地存储（用于导入等重要操作）
    saveImmediately() {
        this.storage.setImmediately('resources', this.resources);
    }
}

// 3. 学习任务管理模块
class TaskManager {
    constructor(storage) {
        this.storage = storage;
        this.tasks = this.storage.get('tasks', []);
    }

    // 生成唯一ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // 添加任务
    addTask(task) {
        const newTask = {
            id: this.generateId(),
            title: task.title,
            description: task.description || '',
            resourceId: task.resourceId || null,
            status: 'pending', // pending, in-progress, completed
            priority: task.priority || 'medium', // low, medium, high
            dueDate: task.dueDate || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.tasks.push(newTask);
        this.save();
        return newTask;
    }

    // 获取所有任务
    getAllTasks() {
        return [...this.tasks];
    }

    // 根据状态获取任务
    getTasksByStatus(status) {
        let tasks = this.tasks.filter(task => task.status === status);
        // 按更新时间倒序排序，确保任务顺序一致
        // 已完成任务：最新完成的在顶部
        // 其他状态任务：最新更新的在顶部
        tasks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        return tasks;
    }

    // 根据ID获取任务
    getTaskById(id) {
        return this.tasks.find(task => task.id === id);
    }

    // 更新任务
    updateTask(id, updates) {
        const index = this.tasks.findIndex(task => task.id === id);
        if (index === -1) return null;

        this.tasks[index] = {
            ...this.tasks[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        this.save();
        return this.tasks[index];
    }

    // 更新任务状态
    updateTaskStatus(id, status) {
        return this.updateTask(id, { status });
    }

    // 删除任务
    deleteTask(id) {
        const index = this.tasks.findIndex(task => task.id === id);
        if (index === -1) return false;

        this.tasks.splice(index, 1);
        this.save();
        return true;
    }
    
    // 添加资源到任务
    addResourceToTask(taskId, resourceId) {
        const task = this.getTaskById(taskId);
        if (!task) return null;

        // 确保resources数组存在
        if (!task.resources) {
            task.resources = [];
        }

        // 避免重复添加
        if (!task.resources.includes(resourceId)) {
            task.resources.push(resourceId);
            task.updatedAt = new Date().toISOString();
            this.save();
        }

        return task;
    }
    
    // 从任务中移除资源
    removeResourceFromTask(taskId, resourceId) {
        const task = this.getTaskById(taskId);
        if (!task) return null;

        let hasChanges = false;

        // 处理新格式：resources数组
        if (task.resources && task.resources.length > 0) {
            const index = task.resources.indexOf(resourceId);
            if (index !== -1) {
                task.resources.splice(index, 1);
                task.updatedAt = new Date().toISOString();
                hasChanges = true;
            }
        }
        
        // 处理旧格式：resourceId字段
        if (task.resourceId === resourceId) {
            task.resourceId = null;
            task.updatedAt = new Date().toISOString();
            hasChanges = true;
        }

        if (hasChanges) {
            this.save();
            return task;
        }

        return null;
    }
    
    // 获取任务关联的资源
    getResourcesByTaskId(taskId) {
        const task = this.getTaskById(taskId);
        if (!task) return [];
        
        return task.resources || [];
    }
    
    // 从所有任务中移除指定资源
    removeResourceFromAllTasks(resourceId) {
        let hasChanges = false;
        
        this.tasks.forEach(task => {
            // 处理新格式：resources数组
            if (task.resources && task.resources.length > 0) {
                const index = task.resources.indexOf(resourceId);
                if (index !== -1) {
                    task.resources.splice(index, 1);
                    task.updatedAt = new Date().toISOString();
                    hasChanges = true;
                }
            }
            
            // 处理旧格式：resourceId字段
            if (task.resourceId === resourceId) {
                task.resourceId = null;
                task.updatedAt = new Date().toISOString();
                hasChanges = true;
            }
        });
        
        if (hasChanges) {
            this.save();
        }
        
        return hasChanges;
    }

    // 搜索任务 - 优化版本
    searchTasks(query) {
        if (!query) return this.tasks;
        
        const lowerQuery = query.toLowerCase();
        // 预编译正则表达式可以提高性能
        const regex = new RegExp(lowerQuery, 'i');
        
        return this.tasks.filter(task => 
            regex.test(task.title) ||
            regex.test(task.description)
        );
    }

    // 保存到本地存储
    save() {
        this.storage.set('tasks', this.tasks);
    }

    // 立即保存到本地存储（用于导入等重要操作）
    saveImmediately() {
        this.storage.setImmediately('tasks', this.tasks);
    }
}

// 4. 主应用类
class LearningResourceManager {
    constructor() {
        this.storage = new Storage();
        this.resourceManager = new ResourceManager(this.storage);
        this.taskManager = new TaskManager(this.storage);
        this.currentFilter = 'all';
        this.currentSearch = '';
        this.init();
    }
    
    // 从文本中提取资源信息（支持批量提取）
    static extractResourceFromText(text) {
        if (!text || typeof text !== 'string') {
            return {
                success: false,
                resources: [],
                error: '请输入有效的文本'
            };
        }
        
        // 按行分割文本，每行一个资源
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const extractedResources = [];
        
        // URL正则表达式
        const urlRegex = /(https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=.]+)/gi;
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            // 提取当前行中的所有URL
            const urls = [...trimmedLine.matchAll(urlRegex)];
            
            if (urls.length === 0) {
                // 跳过没有URL的行
                continue;
            }
            
            for (const urlMatch of urls) {
                const url = urlMatch[0];
                
                // 验证URL格式
                try {
                    new URL(url);
                } catch (e) {
                    // 跳过无效URL
                    continue;
                }
                
                // 推断资源类型
                let type = '';
                const lowerUrl = url.toLowerCase();
                
                // 视频网站
                if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youku.com') || 
                    lowerUrl.includes('bilibili.com') || lowerUrl.includes('vimeo.com') ||
                    lowerUrl.includes('tencentvideo.com') || lowerUrl.includes('iqiyi.com')) {
                    type = 'video';
                } 
                // 文档类型
                else if (lowerUrl.endsWith('.pdf') || lowerUrl.endsWith('.doc') || 
                         lowerUrl.endsWith('.docx') || lowerUrl.endsWith('.txt') ||
                         lowerUrl.endsWith('.md') || lowerUrl.endsWith('.html') ||
                         lowerUrl.includes('docs.google.com')) {
                    type = 'document';
                } 
                // 文件类型
                else if (lowerUrl.endsWith('.zip') || lowerUrl.endsWith('.rar') || 
                         lowerUrl.endsWith('.7z') || lowerUrl.endsWith('.exe') ||
                         lowerUrl.endsWith('.dmg') || lowerUrl.endsWith('.pkg')) {
                    type = 'file';
                }
                
                // 提取标题
                let title = '';
                // 移除当前URL后的标题
                const textWithoutUrl = trimmedLine.replace(url, '').trim();
                
                if (textWithoutUrl) {
                    title = textWithoutUrl;
                } else {
                    // 从URL中提取标题
                    const urlObj = new URL(url);
                    let pathname = urlObj.pathname;
                    // 移除扩展名
                    pathname = pathname.replace(/\.[^/.]+$/, '');
                    // 移除最后一个斜杠
                    pathname = pathname.replace(/\/$/, '');
                    // 获取最后一个路径段
                    const lastSegment = pathname.split('/').pop();
                    if (lastSegment) {
                        title = decodeURIComponent(lastSegment).replace(/-|_/g, ' ');
                    } else {
                        title = urlObj.hostname.replace(/^www\./, '');
                    }
                }
                
                // 添加到提取资源列表
                extractedResources.push({
                    title: title,
                    type: type,
                    url: url,
                    description: '',
                    tags: []
                });
            }
        }
        
        if (extractedResources.length === 0) {
            return {
                success: false,
                resources: [],
                error: '未找到有效的URL'
            };
        }
        
        return {
            success: true,
            resources: extractedResources,
            error: null
        };
    }

    // 初始化应用
    init() {
        this.bindEvents();
        this.renderResources();
        this.renderTasks();
        this.initCompletedColumnState();
    }

    // 绑定事件
    bindEvents() {
        // 资源相关事件
        document.getElementById('addResourceBtn').addEventListener('click', () => this.showAddResourceModal());
        document.getElementById('resourceSearch').addEventListener('input', (e) => this.handleResourceSearch(e));
        
        // 资源标签切换
        document.querySelectorAll('.resource-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleResourceFilter(e));
        });

        // 任务相关事件
        document.getElementById('addTaskBtn').addEventListener('click', () => this.showAddTaskModal());

        // 导入/导出相关事件
        document.getElementById('importBtn').addEventListener('click', () => this.showImportExportModal('import'));
        document.getElementById('exportBtn').addEventListener('click', () => this.showImportExportModal('export'));
        document.getElementById('closeModal').addEventListener('click', () => this.hideImportExportModal());
        document.getElementById('cancelModal').addEventListener('click', () => this.hideImportExportModal());
        
        // 模态框标签切换
        document.querySelectorAll('.import-export-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleModalTab(e));
        });

        // 导出功能
        document.getElementById('downloadExport').addEventListener('click', () => this.exportData());
        
        // 导入文件选择
        document.getElementById('importFile').addEventListener('change', (e) => this.handleFileImport(e));

        // 任务拖拽事件
        this.bindDragEvents();
        
        // 垃圾桶拖拽事件
        this.bindTrashEvents();
        
        // 折叠/展开已完成列表事件
        const toggleBtn = document.getElementById('toggleCompleted');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleCompletedColumn());
        }
        
        // 点击列标题也可以切换折叠状态
        const completedColumnHeader = document.querySelector('.task-column[data-status="completed"] .column-header');
        if (completedColumnHeader) {
            completedColumnHeader.addEventListener('click', (e) => {
                // 排除点击按钮的情况，避免重复触发
                if (!e.target.closest('.column-toggle-btn')) {
                    this.toggleCompletedColumn();
                }
            });
        }
    }
    
    // 切换已完成列表的折叠状态
    toggleCompletedColumn() {
        const completedColumn = document.querySelector('.task-column[data-status="completed"]');
        const isCollapsed = completedColumn.classList.toggle('collapsed');
        
        // 保存状态到本地存储
        this.storage.set('completedColumnCollapsed', isCollapsed);
        
        // 更新按钮图标
        const toggleBtn = document.getElementById('toggleCompleted');
        if (toggleBtn) {
            const icon = toggleBtn.querySelector('i');
            icon.className = isCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
        }
    }
    
    // 初始化已完成列表的折叠状态
    initCompletedColumnState() {
        // 默认状态为收起
        const isCollapsed = this.storage.get('completedColumnCollapsed', true);
        const completedColumn = document.querySelector('.task-column[data-status="completed"]');
        
        if (isCollapsed) {
            completedColumn.classList.add('collapsed');
        }
        
        // 更新按钮图标
        const toggleBtn = document.getElementById('toggleCompleted');
        if (toggleBtn) {
            const icon = toggleBtn.querySelector('i');
            icon.className = isCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
        }
    }
    
    // 绑定垃圾桶拖拽事件
    bindTrashEvents() {
        const trash = document.getElementById('taskTrash');
        if (trash) {
            trash.addEventListener('dragover', (e) => this.handleTrashDragOver(e));
            trash.addEventListener('dragenter', (e) => this.handleTrashDragEnter(e));
            trash.addEventListener('dragleave', (e) => this.handleTrashDragLeave(e));
            trash.addEventListener('drop', (e) => this.handleTrashDrop(e));
        }
    }

    // 绑定拖拽事件
    bindDragEvents() {
        // 获取所有任务列表
        const taskLists = document.querySelectorAll('.task-list');
        
        taskLists.forEach(list => {
            list.addEventListener('dragover', (e) => this.handleDragOver(e));
            list.addEventListener('dragenter', (e) => this.handleDragEnter(e));
            list.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            list.addEventListener('drop', (e) => this.handleDrop(e));
        });
    }

    // 拖拽开始事件
    handleDragStart(e) {
        // 确保获取的是任务卡片元素，而不是内部元素
        let taskCard = e.target;
        while (taskCard && !taskCard.classList.contains('task-card')) {
            taskCard = taskCard.parentElement;
        }
        
        if (!taskCard) return;
        
        const taskId = taskCard.dataset.id;
        e.dataTransfer.setData('text/plain', taskId);
        // 添加任务类型标识，明确区分任务拖拽
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'task',
            id: taskId
        }));
        taskCard.classList.add('dragging');
        
        // 放大垃圾桶
        const trash = document.getElementById('taskTrash');
        if (trash) {
            trash.classList.add('zoom-in');
        }
    }

    // 拖拽结束事件
    handleDragEnd(e) {
        // 确保获取的是任务卡片元素，而不是内部元素
        let taskCard = e.target;
        while (taskCard && !taskCard.classList.contains('task-card')) {
            taskCard = taskCard.parentElement;
        }
        
        if (taskCard) {
            taskCard.classList.remove('dragging');
        }
        
        // 恢复垃圾桶大小
        const trash = document.getElementById('taskTrash');
        if (trash) {
            trash.classList.remove('zoom-in');
            trash.classList.remove('drag-over');
        }
        
        // 移除拖拽任务卡片的特殊样式
        const draggingTask = document.querySelector('.task-card.dragging-to-trash');
        if (draggingTask) {
            draggingTask.classList.remove('dragging-to-trash');
        }
    }
    
    // 资源拖拽开始事件
    handleResourceDragStart(e, resource) {
        e.dataTransfer.setData('text/plain', resource.id);
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'resource',
            id: resource.id,
            title: resource.title,
            resourceType: resource.type
        }));
        e.dataTransfer.effectAllowed = 'link';
        e.target.classList.add('dragging');
        
        // 放大垃圾桶
        const trash = document.getElementById('taskTrash');
        if (trash) {
            trash.classList.add('zoom-in');
        }
    }
    
    // 资源拖拽结束事件
    handleResourceDragEnd(e) {
        e.target.classList.remove('dragging');
        
        // 恢复垃圾桶大小
        const trash = document.getElementById('taskTrash');
        if (trash) {
            trash.classList.remove('zoom-in');
            trash.classList.remove('drag-over');
        }
    }

    // 拖拽经过事件
    handleDragOver(e) {
        e.preventDefault(); // 允许放置
    }

    // 拖拽进入事件
    handleDragEnter(e) {
        e.preventDefault();
        const taskList = e.currentTarget;
        taskList.classList.add('drag-over');
    }

    // 拖拽离开事件
    handleDragLeave(e) {
        const taskList = e.currentTarget;
        // 检查是否真的离开容器
        if (!taskList.contains(e.relatedTarget)) {
            taskList.classList.remove('drag-over');
        }
    }

    // 放置事件
    handleDrop(e) {
        e.preventDefault();
        
        const taskList = e.currentTarget;
        const taskColumn = taskList.closest('.task-column');
        const newStatus = taskColumn.dataset.status;
        
        // 尝试获取拖拽的JSON数据
        const jsonData = e.dataTransfer.getData('application/json');
        const taskId = e.dataTransfer.getData('text/plain');
        
        // 优先处理任务拖拽
        if (jsonData) {
            try {
                const dragData = JSON.parse(jsonData);
                if (dragData.type === 'task' && dragData.id) {
                    // 处理任务拖拽，更新状态
                    this.taskManager.updateTaskStatus(dragData.id, newStatus);
                    
                    // 重新渲染任务列表
                    this.renderTasks();
                    
                    // 移除drag-over类
                    taskList.classList.remove('drag-over');
                    document.querySelectorAll('.task-list').forEach(list => {
                        list.classList.remove('drag-over');
                    });
                    
                    return;
                } else if (dragData.type === 'resource') {
                    // 处理资源拖拽，自动创建新任务
                    const newTask = this.taskManager.addTask({
                        title: dragData.title,
                        description: '',
                        resourceId: dragData.id,
                        status: newStatus,
                        priority: 'medium'
                    });
                    
                    // 重新渲染任务列表
                    this.renderTasks();
                    
                    // 移除drag-over类
                    taskList.classList.remove('drag-over');
                    document.querySelectorAll('.task-list').forEach(list => {
                        list.classList.remove('drag-over');
                    });
                    
                    return;
                }
            } catch (error) {
                console.error('解析拖拽数据失败:', error);
            }
        }
        
        // 处理传统任务拖拽（兼容旧格式）
        if (taskId) {
            // 更新任务状态
            this.taskManager.updateTaskStatus(taskId, newStatus);
            
            // 重新渲染任务列表
            this.renderTasks();
            
            // 移除drag-over类
            taskList.classList.remove('drag-over');
            // 移除所有任务列表的drag-over类
            document.querySelectorAll('.task-list').forEach(list => {
                list.classList.remove('drag-over');
            });
        }
    }
    
    // 垃圾桶拖拽经过事件
    handleTrashDragOver(e) {
        e.preventDefault(); // 允许放置
        e.dataTransfer.dropEffect = 'move'; // 设置拖拽效果为移动
    }
    
    // 垃圾桶拖拽进入事件
    handleTrashDragEnter(e) {
        e.preventDefault();
        const trash = document.getElementById('taskTrash');
        trash.classList.add('drag-over');
        
        // 给拖拽的任务卡片添加特殊样式
        const draggingTask = document.querySelector('.task-card.dragging');
        if (draggingTask) {
            draggingTask.classList.add('dragging-to-trash');
        }
    }
    
    // 垃圾桶拖拽离开事件
    handleTrashDragLeave(e) {
        const trash = document.getElementById('taskTrash');
        // 检查是否真的离开垃圾桶
        if (!trash.contains(e.relatedTarget)) {
            trash.classList.remove('drag-over');
            
            // 移除拖拽任务卡片的特殊样式
            const draggingTask = document.querySelector('.task-card.dragging');
            if (draggingTask) {
                draggingTask.classList.remove('dragging-to-trash');
            }
        }
    }
    
    // 垃圾桶放置事件
    handleTrashDrop(e) {
        e.preventDefault();
        
        const trash = document.getElementById('taskTrash');
        trash.classList.remove('drag-over');
        
        // 移除拖拽任务卡片的特殊样式
        const draggingTask = document.querySelector('.task-card.dragging');
        if (draggingTask) {
            draggingTask.classList.remove('dragging-to-trash');
        }
        
        // 获取拖拽的任务ID
        const taskId = e.dataTransfer.getData('text/plain');
        if (taskId) {
            // 删除任务
            this.taskManager.deleteTask(taskId);
            // 重新渲染任务列表
            this.renderTasks();
        }
    }

    // 渲染资源列表
    renderResources() {
        const resourceList = document.getElementById('resourceList');
        let resources = this.resourceManager.getAllResources();

        // 应用筛选
        if (this.currentFilter !== 'all') {
            resources = resources.filter(resource => resource.type === this.currentFilter);
        }

        // 应用搜索
        if (this.currentSearch) {
            resources = this.resourceManager.searchResources(this.currentSearch);
        }

        if (resources.length === 0) {
            resourceList.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">暂无资源</div>';
            return;
        }

        // 使用DocumentFragment进行批量DOM操作，减少重排重绘
        const fragment = document.createDocumentFragment();
        resources.forEach(resource => {
            const resourceElement = this.createResourceElement(resource);
            fragment.appendChild(resourceElement);
        });

        // 清空列表并添加新内容
        resourceList.innerHTML = '';
        resourceList.appendChild(fragment);
    }

    // 创建资源DOM元素
    createResourceElement(resource) {
        const div = document.createElement('div');
        div.className = `resource-item ${resource.type}`;
        div.dataset.id = resource.id;
        div.draggable = true; // 启用拖拽功能
        
        div.innerHTML = `
            <div class="resource-icon">
                <i class="fas fa-${this.getResourceIcon(resource.type)}"></i>
            </div>
            <div class="resource-info">
                <h3 class="resource-title">${resource.title}</h3>
                ${resource.url ? `<div class="resource-url" style="font-size: 0.8em; color: var(--text-muted); margin: 4px 0; word-break: break-all;"><i class="fas fa-link"></i> ${resource.url.length > 50 ? resource.url.substring(0, 50) + '...' : resource.url}</div>` : ''}
                <div class="resource-meta">
                    <span><i class="fas fa-tag"></i> ${resource.tags.join(', ') || '无标签'}</span>
                    <span><i class="fas fa-calendar"></i> ${new Date(resource.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
            <div class="resource-actions">
                <button class="btn btn-small" onclick="app.editResource('${resource.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-small" onclick="app.deleteResource('${resource.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // 绑定点击事件
        div.addEventListener('click', (e) => {
            if (!e.target.closest('.resource-actions')) {
                this.showResourceDetails(resource.id);
            }
        });
        
        // 添加拖拽事件监听器
        div.addEventListener('dragstart', (e) => this.handleResourceDragStart(e, resource));
        div.addEventListener('dragend', (e) => this.handleResourceDragEnd(e));
        
        return div;
    }

    // 创建资源HTML
    createResourceHTML(resource) {
        return `
            <div class="resource-item ${resource.type}" data-id="${resource.id}">
                <div class="resource-icon">
                    <i class="fas fa-${this.getResourceIcon(resource.type)}"></i>
                </div>
                <div class="resource-info">
                    <h3 class="resource-title">${resource.title}</h3>
                    ${resource.url ? `<div class="resource-url" style="font-size: 0.8em; color: var(--text-muted); margin: 4px 0; word-break: break-all;"><i class="fas fa-link"></i> ${resource.url.length > 50 ? resource.url.substring(0, 50) + '...' : resource.url}</div>` : ''}
                    <div class="resource-meta">
                        <span><i class="fas fa-tag"></i> ${resource.tags.join(', ') || '无标签'}</span>
                        <span><i class="fas fa-calendar"></i> ${new Date(resource.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="resource-actions">
                    <button class="btn btn-small" onclick="app.editResource('${resource.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-small" onclick="app.deleteResource('${resource.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // 获取资源图标
    getResourceIcon(type) {
        const icons = {
            video: 'video',
            document: 'file-alt',
            file: 'file'
        };
        return icons[type] || 'book';
    }

    // 渲染任务列表
    renderTasks() {
        // 获取各状态任务
        const pending = this.taskManager.getTasksByStatus('pending');
        const inProgress = this.taskManager.getTasksByStatus('in-progress');
        const completed = this.taskManager.getTasksByStatus('completed');

        // 使用DocumentFragment进行批量DOM操作，减少重排重绘
        this.renderTaskList('pendingTasks', pending);
        this.renderTaskList('inProgressTasks', inProgress);
        this.renderTaskList('completedTasks', completed);

        // 更新任务计数
        document.querySelector('[data-status="pending"] .task-count').textContent = pending.length;
        document.querySelector('[data-status="in-progress"] .task-count').textContent = inProgress.length;
        document.querySelector('[data-status="completed"] .task-count').textContent = completed.length;
    }

    // 渲染单个任务列表
    renderTaskList(containerId, tasks) {
        const container = document.getElementById(containerId);
        const fragment = document.createDocumentFragment();
        
        tasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            fragment.appendChild(taskElement);
        });
        
        container.innerHTML = '';
        container.appendChild(fragment);
    }

    // 创建任务DOM元素
    createTaskElement(task) {
        const div = document.createElement('div');
        div.className = 'task-card';
        div.dataset.id = task.id;
        div.draggable = true; // 启用拖拽
        
        // 获取任务关联的资源列表
        const resourceIds = task.resources || (task.resourceId ? [task.resourceId] : []);
        // 过滤出实际存在的资源
        const validResourceIds = resourceIds.filter(resourceId => this.resourceManager.getResourceById(resourceId));
        
        div.innerHTML = `
            <div class="task-header">
                <h3 class="task-title">${task.title}</h3>
                <button class="task-delete-btn" onclick="app.deleteTask('${task.id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            ${task.description ? `<p class="task-description">${task.description}</p>` : ''}
            
            <!-- 关联资源列表 -->
            ${validResourceIds.length > 0 ? `
                <div class="task-resources">
                    ${validResourceIds.map(resourceId => {
                        const resource = this.resourceManager.getResourceById(resourceId);
                        return resource ? `
                            <span class="resource-tag" data-resource-id="${resourceId}" onclick="app.showResourceDetails('${resourceId}')">
                                <i class="fas fa-${this.getResourceIcon(resource.type)}"></i>
                                ${resource.title.length > 20 ? resource.title.substring(0, 20) + '...' : resource.title}
                                <button class="resource-tag-remove" onclick="event.stopPropagation(); app.removeResourceFromTask('${task.id}', '${resourceId}')">
                                    <i class="fas fa-times"></i>
                                </button>
                            </span>
                        ` : '';
                    }).join('')}
                </div>
            ` : ''}
            
            <div class="task-meta">
                <span class="task-priority ${task.priority}">${task.priority}</span>
                ${task.dueDate ? `<span class="task-due-date"><i class="fas fa-calendar"></i> ${new Date(task.dueDate).toLocaleDateString()}</span>` : ''}
                ${validResourceIds.length > 0 ? `<span class="task-resource"><i class="fas fa-link"></i> 关联${validResourceIds.length}个资源</span>` : ''}
            </div>
        `;
        
        // 添加拖拽事件监听器
        div.addEventListener('dragstart', (e) => this.handleDragStart(e));
        div.addEventListener('dragend', (e) => this.handleDragEnd(e));
        
        // 添加拖拽目标事件监听器（用于接收资源拖拽）
        div.addEventListener('dragover', (e) => this.handleTaskDragOver(e));
        div.addEventListener('dragenter', (e) => this.handleTaskDragEnter(e));
        div.addEventListener('dragleave', (e) => this.handleTaskDragLeave(e));
        div.addEventListener('drop', (e) => this.handleTaskDrop(e, task));
        
        return div;
    }

    // 显示资源详情
    showResourceDetails(id) {
        const resource = this.resourceManager.getResourceById(id);
        if (!resource) return;

        // 构建资源详情HTML，使URL可点击
        let detailsHTML = `
            <div style="text-align: left; max-width: 400px; margin: 0 auto;">
                <p><strong>标题：</strong>${resource.title}</p>
                <p><strong>类型：</strong>${resource.type}</p>
                ${resource.url ? `<p><strong>URL：</strong><a href="${resource.url}" target="_blank" style="color: var(--primary-color); text-decoration: none;">${resource.url}</a></p>` : ''}
                <p><strong>描述：</strong>${resource.description || '无描述'}</p>
                <p><strong>标签：</strong>${resource.tags.join(', ') || '无标签'}</p>
                <p><strong>创建时间：</strong>${new Date(resource.createdAt).toLocaleString()}</p>
            </div>
        `;

        // 使用自定义弹窗显示资源详情
        showModal('info', {
            title: '资源详情',
            message: detailsHTML,
            html: true,
            confirmText: '关闭'
        });
    }

    // 显示添加资源模态框
    showAddResourceModal() {
        // 初始选择：手动添加或粘贴文本
        showModal('input', {
            title: '添加资源',
            message: '请选择添加方式',
            inputLabel: '添加方式',
            inputType: 'select',
            inputValue: 'manual', // 默认值
            inputOptions: [
                { value: 'manual', text: '手动添加' },
                { value: 'paste', text: '粘贴文本' }
            ],
            confirmText: '确定',
            onConfirm: (method) => {
                if (method === 'manual') {
                    this.showManualAddResourceFlow();
                } else if (method === 'paste') {
                    this.showPasteAddResourceFlow();
                }
            }
        });
    }
    
    // 手动添加资源流程（原有流程）
    showManualAddResourceFlow() {
        // 使用自定义输入弹窗添加资源
        let newResource = { title: '', type: '', url: '', description: '', tags: [] };
        
        // 第一步：输入标题
        showModal('input', {
            title: '添加资源',
            message: '请输入资源标题',
            inputLabel: '资源标题',
            inputPlaceholder: '请输入资源标题',
            confirmText: '下一步',
            onConfirm: (title) => {
                if (title) {
                    newResource.title = title;
                    // 第二步：选择类型
                    showModal('input', {
                        title: '添加资源',
                        message: '请选择资源类型',
                        inputLabel: '资源类型',
                        inputType: 'select',
                        inputValue: 'video', // 默认值
                        inputOptions: [
                            { value: 'video', text: '视频' },
                            { value: 'document', text: '文档' },
                            { value: 'file', text: '文件' }
                        ],
                        confirmText: '下一步',
                        onConfirm: (type) => {
                            if (type && ['video', 'document', 'file'].includes(type)) {
                                newResource.type = type;
                                // 第三步：输入URL
                                showModal('input', {
                                    title: '添加资源',
                                    message: '请输入资源URL（可选）',
                                    inputLabel: '资源URL',
                                    inputPlaceholder: 'https://example.com',
                                    confirmText: '下一步',
                                    onConfirm: (url) => {
                                        newResource.url = url;
                                        // 第四步：输入描述
                                        showModal('input', {
                                            title: '添加资源',
                                            message: '请输入资源描述（可选）',
                                            inputLabel: '资源描述',
                                            inputPlaceholder: '请输入资源描述',
                                            confirmText: '下一步',
                                            onConfirm: (description) => {
                                                newResource.description = description;
                                                // 第五步：输入标签
                                                showModal('input', {
                                                    title: '添加资源',
                                                    message: '请输入资源标签（可选，逗号分隔）',
                                                    inputLabel: '资源标签',
                                                    inputPlaceholder: '标签1,标签2',
                                                    confirmText: '添加',
                                                    onConfirm: (tags) => {
                                                        newResource.tags = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
                                                        this.resourceManager.addResource(newResource);
                                                        this.renderResources();
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            } else {
                                showModal('info', {
                                    title: '错误',
                                    message: '无效的资源类型，请选择 video、document 或 file',
                                    confirmText: '确定'
                                });
                            }
                        }
                    });
                }
            }
        });
    }

    // 显示粘贴文本添加资源流程（支持批量）
    showPasteAddResourceFlow() {
        // 第一步：输入包含资源信息的文本
        showModal('input', {
            title: '添加资源',
            message: '请粘贴包含资源信息的文本（支持多行，每行一个资源，格式："标题 https://example.com"）',
            inputLabel: '资源文本',
            inputPlaceholder: '请粘贴资源文本',
            inputType: 'textarea',
            confirmText: '提取',
            onConfirm: (text) => {
                if (text) {
                    // 提取资源信息
                    const extractionResult = LearningResourceManager.extractResourceFromText(text);
                    
                    if (!extractionResult.success) {
                        // 提取失败，显示错误信息
                        showModal('info', {
                            title: '提取失败',
                            message: extractionResult.error,
                            confirmText: '确定'
                        });
                        return;
                    }
                    
                    const extractedResources = extractionResult.resources;
                    
                    // 显示提取结果，允许用户修改
                    this.showBatchResourcePreview(extractedResources);
                }
            }
        });
    }
    
    // 显示批量资源预览和确认
    showBatchResourcePreview(resources) {
        if (!resources || resources.length === 0) {
            showModal('info', {
                title: '提取失败',
                message: '未找到有效的资源',
                confirmText: '确定'
            });
            return;
        }
        
        // 构建预览HTML
        let previewHTML = `
            <div style="max-height: 300px; overflow-y: auto;">
                <h4 style="margin-bottom: 15px;">共提取到 ${resources.length} 个资源：</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border-color);">
                            <th style="text-align: left; padding: 8px;">标题</th>
                            <th style="text-align: left; padding: 8px;">类型</th>
                            <th style="text-align: left; padding: 8px;">URL</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        for (const resource of resources) {
            previewHTML += `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 8px;">${resource.title}</td>
                    <td style="padding: 8px;">${resource.type || '未分类'}</td>
                    <td style="padding: 8px; word-break: break-all;">${resource.url}</td>
                </tr>
            `;
        }
        
        previewHTML += `
                    </tbody>
                </table>
            </div>
        `;
        
        // 显示批量预览
        showModal('input', {
            title: '批量资源预览',
            message: previewHTML,
            html: true,
            confirmText: '确认添加',
            cancelText: '取消',
            onConfirm: () => {
                // 批量添加资源
                resources.forEach(resource => {
                    this.resourceManager.addResource(resource);
                });
                
                // 重新渲染资源列表
                this.renderResources();
                
                // 显示成功消息
                showModal('info', {
                    title: '添加成功',
                    message: `成功添加 ${resources.length} 个资源`,
                    confirmText: '确定'
                });
            }
        });
    }
    
    // 编辑资源
    editResource(id) {
        const resource = this.resourceManager.getResourceById(id);
        if (!resource) return;

        // 使用自定义输入弹窗编辑资源
        showModal('input', {
            title: '编辑资源',
            message: '请输入新的资源标题',
            inputLabel: '资源标题',
            inputPlaceholder: '请输入资源标题',
            inputValue: resource.title,
            confirmText: '保存',
            onConfirm: (title) => {
                if (title) {
                    this.resourceManager.updateResource(id, { title });
                    this.renderResources();
                }
            }
        });
    }

    // 删除资源
    deleteResource(id) {
        // 使用自定义确认弹窗删除资源
        showModal('confirm', {
            title: '确认删除',
            message: '确定要删除这个资源吗？删除后将自动从所有关联任务中移除。',
            cancelText: '取消',
            confirmText: '确定',
            onConfirm: () => {
                // 从所有任务中移除该资源
                this.taskManager.removeResourceFromAllTasks(id);
                // 删除资源
                this.resourceManager.deleteResource(id);
                // 重新渲染资源和任务列表
                this.renderResources();
                this.renderTasks();
            }
        });
    }

    // 显示添加任务模态框
    showAddTaskModal() {
        // 使用自定义输入弹窗添加任务
        let newTask = { title: '', description: '', priority: 'medium' };
        
        // 第一步：输入标题
        showModal('input', {
            title: '添加任务',
            message: '请输入任务标题',
            inputLabel: '任务标题',
            inputPlaceholder: '请输入任务标题',
            confirmText: '下一步',
            onConfirm: (title) => {
                if (title) {
                    newTask.title = title;
                    // 第二步：输入描述
                    showModal('input', {
                        title: '添加任务',
                        message: '请输入任务描述（可选）',
                        inputLabel: '任务描述',
                        inputPlaceholder: '请输入任务描述',
                        confirmText: '下一步',
                        onConfirm: (description) => {
                            newTask.description = description;
                            // 第三步：输入优先级
                            showModal('input', {
                                title: '添加任务',
                                message: '请选择优先级',
                                inputLabel: '优先级',
                                inputType: 'select',
                                inputValue: 'medium',
                                inputOptions: [
                                    { value: 'low', text: '低 (low)' },
                                    { value: 'medium', text: '中 (medium)' },
                                    { value: 'high', text: '高 (high)' }
                                ],
                                confirmText: '添加',
                                onConfirm: (priority) => {
                                    newTask.priority = priority || 'medium';
                                    this.taskManager.addTask(newTask);
                                    this.renderTasks();
                                }
                            });
                        }
                    });
                }
            }
        });
    }

    // 处理资源搜索 - 防抖实现
    handleResourceSearch(e) {
        // 清除之前的定时器
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // 设置新的定时器
        this.searchTimeout = setTimeout(() => {
            this.currentSearch = e.target.value;
            this.renderResources();
            delete this.searchTimeout;
        }, 300); // 300ms防抖延迟
    }

    // 处理资源筛选
    handleResourceFilter(e) {
        // 更新标签状态
        document.querySelectorAll('.resource-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');

        this.currentFilter = e.target.dataset.type;
        this.renderResources();
    }
    
    // 从任务中移除资源（供HTML调用）
    removeResourceFromTask(taskId, resourceId) {
        this.taskManager.removeResourceFromTask(taskId, resourceId);
        this.renderTasks();
    }
    
    // 删除任务
    deleteTask(id) {
        // 使用自定义确认弹窗删除任务
        showModal('confirm', {
            title: '确认删除',
            message: '确定要删除这个任务吗？',
            cancelText: '取消',
            confirmText: '确定',
            onConfirm: () => {
                // 删除任务
                this.taskManager.deleteTask(id);
                // 重新渲染任务列表
                this.renderTasks();
            }
        });
    }
    
    // 任务拖拽经过事件
    handleTaskDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'link';
    }
    
    // 任务拖拽进入事件
    handleTaskDragEnter(e) {
        e.target.closest('.task-card').classList.add('drag-over');
    }
    
    // 任务拖拽离开事件
    handleTaskDragLeave(e) {
        const taskCard = e.target.closest('.task-card');
        if (taskCard && !taskCard.contains(e.relatedTarget)) {
            taskCard.classList.remove('drag-over');
        }
    }
    
    // 任务拖拽放置事件
    handleTaskDrop(e, task) {
        e.preventDefault();
        e.stopPropagation(); // 阻止事件冒泡到任务列表，避免创建新任务
        
        // 尝试获取拖拽的JSON数据，判断拖拽类型
        const jsonData = e.dataTransfer.getData('application/json');
        
        if (jsonData) {
            try {
                const dragData = JSON.parse(jsonData);
                if (dragData.type === 'resource') {
                    // 只有当拖拽的是资源时，才添加到任务中
                    this.taskManager.addResourceToTask(task.id, dragData.id);
                    
                    // 重新渲染任务列表
                    this.renderTasks();
                }
                // 如果拖拽的是任务，不执行任何操作
            } catch (error) {
                console.error('解析拖拽数据失败:', error);
            }
        }
        
        // 移除拖拽高亮效果
        const taskCard = e.target.closest('.task-card');
        if (taskCard) {
            taskCard.classList.remove('drag-over');
        }
    }

    // 显示导入/导出模态框
    showImportExportModal(activeTab = 'import') {
        const modal = document.getElementById('importExportModal');
        modal.classList.add('active');

        // 切换到指定标签
        this.switchModalTab(activeTab);
    }

    // 隐藏导入/导出模态框
    hideImportExportModal() {
        const modal = document.getElementById('importExportModal');
        modal.classList.remove('active');
    }

    // 处理模态框标签切换
    handleModalTab(e) {
        const tab = e.target.dataset.tab;
        this.switchModalTab(tab);
    }

    // 切换模态框标签
    switchModalTab(tab) {
        // 更新标签按钮状态
        document.querySelectorAll('.import-export-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

        // 更新内容显示
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tab}Tab`).classList.add('active');
    }

    // 导出数据
    exportData() {
        const exportResources = document.getElementById('exportResources').checked;
        const exportTasks = document.getElementById('exportTasks').checked;

        const exportData = {};
        
        if (exportResources) {
            exportData.resources = this.resourceManager.getAllResources();
        }
        
        if (exportTasks) {
            exportData.tasks = this.taskManager.getAllTasks();
        }

        // 创建下载链接
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `learning-resources-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // 处理文件导入
    handleFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importData = JSON.parse(event.target.result);
                this.showImportPreview(importData);
            } catch (error) {
                showModal('info', {
                    title: '导入失败',
                    message: '无效的JSON文件',
                    confirmText: '确定'
                });
            }
        };
        reader.readAsText(file);
    }

    // 显示导入预览
    showImportPreview(data) {
        const preview = document.getElementById('importPreview');
        const confirmBtn = document.getElementById('confirmImport');
        
        let previewHTML = '<h4>导入预览</h4>';
        
        if (data.resources && data.resources.length > 0) {
            previewHTML += `<p>资源数量：${data.resources.length}</p>`;
        }
        
        if (data.tasks && data.tasks.length > 0) {
            previewHTML += `<p>任务数量：${data.tasks.length}</p>`;
        }
        
        preview.innerHTML = previewHTML;
        confirmBtn.style.display = 'inline-block';
        
        // 绑定确认导入事件
        confirmBtn.onclick = () => {
            this.confirmImport(data);
        };
    }

    // 确认导入
    confirmImport(data) {
        if (data.resources && data.resources.length > 0) {
            data.resources.forEach(resource => {
                this.resourceManager.addResource(resource);
            });
            // 立即保存资源数据
            this.resourceManager.saveImmediately();
        }
        
        if (data.tasks && data.tasks.length > 0) {
            data.tasks.forEach(task => {
                this.taskManager.addTask(task);
            });
            // 立即保存任务数据
            this.taskManager.saveImmediately();
        }
        
        // 重新渲染
        this.renderResources();
        this.renderTasks();
        
        // 隐藏模态框
        this.hideImportExportModal();
        
        showModal('info', {
            title: '导入成功',
            message: '数据已成功导入',
            confirmText: '确定'
        });
    }
}

// 5. 自定义弹窗类
class Popup {
    constructor() {
        this.overlay = document.getElementById('customModalOverlay');
        this.modal = document.getElementById('customModal');
        this.title = document.getElementById('customModalTitle');
        this.message = document.getElementById('customModalMessage');
        this.inputGroup = document.getElementById('customModalInputGroup');
        this.inputLabel = document.getElementById('customModalInputLabel');
        this.input = document.getElementById('customModalInput');
        this.textarea = document.getElementById('customModalTextarea'); // 新增：多行文本框引用
        this.select = document.getElementById('customModalSelect'); // 新增：下拉选择框引用
        this.cancelBtn = document.getElementById('customModalCancel');
        this.confirmBtn = document.getElementById('customModalConfirm');
        
        this.currentModalType = '';
        this.confirmCallback = null;
        this.cancelCallback = null;
        this.isShowingNewModal = false;
        
        this.bindEvents();
    }
    
    // 绑定事件
    bindEvents() {
        // 点击遮罩层关闭弹窗
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.hide();
            }
        });
        
        // 键盘事件：ESC 关闭弹窗
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hide();
            }
        });
        
        // 绑定按钮事件
        this.confirmBtn.addEventListener('click', () => this.handleConfirm());
        this.cancelBtn.addEventListener('click', () => this.hide());
        this.modal.querySelector('.custom-modal-close').addEventListener('click', () => this.hide());
    }
    
    // 显示弹窗
    show(type, options = {}) {
        // 设置标志，表示正在显示新弹窗
        this.isShowingNewModal = true;
        
        // 设置弹窗类型
        this.currentModalType = type;
        this.modal.className = `custom-modal ${type}`;
        
        // 设置标题和内容
        this.title.textContent = options.title || '提示';
        
        // 检查是否需要支持HTML内容
        if (options.html) {
            this.message.innerHTML = options.message || '';
        } else {
            this.message.textContent = options.message || '';
        }
        
        // 保存回调函数
        this.confirmCallback = options.onConfirm || null;
        this.cancelCallback = options.onCancel || null;
        
        // 配置按钮
        if (type === 'info') {
            // 信息提示弹窗 - 仅显示确定按钮
            this.cancelBtn.style.display = 'none';
            this.confirmBtn.textContent = options.confirmText || '确定';
        } else if (type === 'confirm') {
            // 确认对话框 - 显示确定和取消按钮
            this.cancelBtn.style.display = 'inline-flex';
            this.cancelBtn.textContent = options.cancelText || '取消';
            this.confirmBtn.textContent = options.confirmText || '确定';
        } else if (type === 'input') {
            // 输入对话框 - 显示输入框和两个按钮
            this.cancelBtn.style.display = 'inline-flex';
            this.cancelBtn.textContent = options.cancelText || '取消';
            this.confirmBtn.textContent = options.confirmText || '确定';
            
            // 显示输入框组
            this.inputGroup.style.display = 'block';
            this.inputLabel.textContent = options.inputLabel || '输入内容';
            
            // 配置输入类型和下拉选择
            const inputType = options.inputType || 'text';
            this.input.style.display = inputType === 'text' ? 'block' : 'none';
            this.textarea.style.display = inputType === 'textarea' ? 'block' : 'none';
            this.select.style.display = inputType === 'select' ? 'block' : 'none';
            
            // 设置输入框属性
            this.input.placeholder = options.inputPlaceholder || '请输入内容';
            this.textarea.placeholder = options.inputPlaceholder || '请输入内容';
            
            // 设置默认值
            if (inputType === 'text') {
                this.input.value = options.inputValue || '';
                this.input.focus();
            } else if (inputType === 'textarea') {
                this.textarea.value = options.inputValue || '';
                this.textarea.focus();
            } else {
                // 更新下拉选项
                if (options.inputOptions) {
                    this.select.innerHTML = '';
                    options.inputOptions.forEach(option => {
                        const opt = document.createElement('option');
                        opt.value = option.value;
                        opt.textContent = option.text;
                        this.select.appendChild(opt);
                    });
                }
                
                this.select.value = options.inputValue || '';
            }
        }
        
        // 显示弹窗
        this.overlay.classList.add('active');
    }
    
    // 隐藏弹窗
    hide() {
        this.overlay.classList.remove('active');
        
        // 重置输入框和下拉选择框 - 优化DOM操作，减少重排
        this.inputGroup.style.display = 'none';
        
        // 批量重置输入值
        this.input.value = '';
        this.textarea.value = '';
        this.select.value = '';
        
        // 批量设置显示状态
        this.input.style.display = 'block';
        this.textarea.style.display = 'none';
        this.select.style.display = 'none';
        
        // 重置标志
        this.isShowingNewModal = false;
        
        // 调用取消回调
        if (typeof this.cancelCallback === 'function') {
            this.cancelCallback();
        }
    }
    
    // 处理确认按钮点击
    handleConfirm() {
        let result = true;
        
        // 如果是输入对话框，获取输入值或选择值
        if (this.currentModalType === 'input') {
            // 根据当前显示的输入类型获取值
            let inputType = 'text';
            if (this.input.style.display === 'block') {
                inputType = 'text';
            } else if (this.textarea.style.display === 'block') {
                inputType = 'textarea';
            } else {
                inputType = 'select';
            }
            
            if (inputType === 'text') {
                result = this.input.value;
            } else if (inputType === 'textarea') {
                result = this.textarea.value;
            } else {
                result = this.select.value;
            }
        }
        
        // 调用回调函数前重置标志
        this.isShowingNewModal = false;
        
        // 调用回调函数
        if (typeof this.confirmCallback === 'function') {
            this.confirmCallback(result);
        }
        
        // 如果回调函数没有显示新弹窗，则隐藏当前弹窗
        if (!this.isShowingNewModal) {
            this.hide();
        }
    }
    
    // 替换浏览器默认的alert
    alert(message, options = {}) {
        return new Promise((resolve) => {
            this.show('info', {
                message,
                ...options,
                onConfirm: () => resolve()
            });
        });
    }
    
    // 替换浏览器默认的confirm
    confirm(message, options = {}) {
        return new Promise((resolve) => {
            this.show('confirm', {
                message,
                ...options,
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false)
            });
        });
    }
    
    // 替换浏览器默认的prompt
    prompt(message, defaultValue = '', options = {}) {
        return new Promise((resolve) => {
            this.show('input', {
                message,
                inputValue: defaultValue,
                ...options,
                onConfirm: (value) => resolve(value),
                onCancel: () => resolve(null)
            });
        });
    }
}

// 初始化弹窗实例
const popup = new Popup();

// 替换浏览器默认弹窗
window.alert = (message, options) => popup.alert(message, options);
window.confirm = (message, options) => popup.confirm(message, options);
window.prompt = (message, defaultValue, options) => popup.prompt(message, defaultValue, options);

// 初始化应用
const app = new LearningResourceManager();
// 将app对象暴露到全局作用域，以便HTML事件处理器访问
window.app = app;