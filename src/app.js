// 主应用模块 - 负责整个应用的协调和管理
import Storage from './storage.js';
import ResourceManager from './resourceManager.js';
import TaskManager from './taskManager.js';
import TagManager from './tagManager.js';
import Popup from './popup.js';
import { ImportValidator } from './validator.js';
import { HistoryStack, deepClone } from './utils.js';

class LearningResourceManager {
    constructor() {
        this.storage = new Storage();
        this.resourceManager = new ResourceManager(this.storage);
        this.taskManager = new TaskManager(this.storage);
        this.tagManager = new TagManager(this.storage);
        this.history = new HistoryStack(50); // 最多保存50个操作历史
        this.currentFilter = 'all';
        this.currentSearch = '';
        // 版本号配置 - 可以从环境变量或配置文件中获取
        this.appVersion = typeof process !== 'undefined' && process.env ? process.env.APP_VERSION || '1.0.0' : '1.0.0';
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
        this.displayVersionNumber();
        // 检查逾期任务并提醒
        this.checkOverdueTasks();
        // 渲染标签筛选
        this.renderTagFilter();
    }

    // 检查逾期任务并提醒
    checkOverdueTasks() {
        const allTasks = this.taskManager.getAllTasks();
        const now = new Date();
        const overdueTasks = allTasks.filter(task => {
            return task.dueDate &&
                   new Date(task.dueDate) < now &&
                   task.status !== 'completed';
        });

        if (overdueTasks.length > 0) {
            // 检查是否已经提醒过（避免每次打开都提醒）
            const lastReminder = this.storage.get('overdueReminderDate', '');
            const today = new Date().toDateString();

            if (lastReminder !== today) {
                // 保存今天的提醒日期
                this.storage.setImmediately('overdueReminderDate', today);

                // 显示提醒
                setTimeout(() => {
                    showModal('info', {
                        title: '任务逾期提醒',
                        message: `您有 ${overdueTasks.length} 个任务已逾期，请及时处理！`,
                        confirmText: '知道了'
                    });
                }, 1000);
            }
        }
    }

    // 撤销操作
    undo() {
        if (!this.history.canUndo()) {
            return;
        }

        const action = this.history.undoStack[this.history.undoStack.length - 1];
        if (!action) return;

        // 执行撤销操作
        if (action.type === 'resource') {
            if (action.operation === 'add') {
                // 撤销添加 = 删除
                this.resourceManager.deleteResource(action.data.id);
            } else if (action.operation === 'delete') {
                // 撤销删除 = 重新添加
                this.resourceManager.resources.push(action.data);
                this.resourceManager.save();
            } else if (action.operation === 'update') {
                // 撤销更新 = 恢复旧数据
                const index = this.resourceManager.resources.findIndex(r => r.id === action.data.id);
                if (index !== -1) {
                    this.resourceManager.resources[index] = action.oldData;
                    this.resourceManager.save();
                }
            }
            this.renderResources();
        } else if (action.type === 'task') {
            if (action.operation === 'add') {
                this.taskManager.deleteTask(action.data.id);
            } else if (action.operation === 'delete') {
                this.taskManager.tasks.push(action.data);
                this.taskManager.save();
            } else if (action.operation === 'update') {
                const index = this.taskManager.tasks.findIndex(t => t.id === action.data.id);
                if (index !== -1) {
                    this.taskManager.tasks[index] = action.oldData;
                    this.taskManager.save();
                }
            } else if (action.operation === 'status') {
                // 撤销状态变更
                const task = this.taskManager.getTaskById(action.data.id);
                if (task) {
                    task.status = action.oldStatus;
                    task.updatedAt = new Date().toISOString();
                    this.taskManager.save();
                }
            }
            this.renderTasks();
        }

        // 显示撤销成功提示
        showModal('info', {
            title: '撤销成功',
            message: '操作已撤销',
            confirmText: '确定'
        });
    }

    // 重做操作
    redo() {
        if (!this.history.canRedo()) {
            return;
        }

        const action = this.history.redoStack[this.history.redoStack.length - 1];
        if (!action) return;

        // 执行重做操作
        if (action.type === 'resource') {
            if (action.operation === 'add') {
                this.resourceManager.resources.push(action.data);
                this.resourceManager.save();
            } else if (action.operation === 'delete') {
                const index = this.resourceManager.resources.findIndex(r => r.id === action.data.id);
                if (index !== -1) {
                    this.resourceManager.resources.splice(index, 1);
                    this.resourceManager.save();
                }
            } else if (action.operation === 'update') {
                const index = this.resourceManager.resources.findIndex(r => r.id === action.data.id);
                if (index !== -1) {
                    this.resourceManager.resources[index] = action.data;
                    this.resourceManager.save();
                }
            }
            this.renderResources();
        } else if (action.type === 'task') {
            if (action.operation === 'add') {
                this.taskManager.tasks.push(action.data);
                this.taskManager.save();
            } else if (action.operation === 'delete') {
                const index = this.taskManager.tasks.findIndex(t => t.id === action.data.id);
                if (index !== -1) {
                    this.taskManager.tasks.splice(index, 1);
                    this.taskManager.save();
                }
            } else if (action.operation === 'update') {
                const index = this.taskManager.tasks.findIndex(t => t.id === action.data.id);
                if (index !== -1) {
                    this.taskManager.tasks[index] = action.data;
                    this.taskManager.save();
                }
            } else if (action.operation === 'status') {
                const task = this.taskManager.getTaskById(action.data.id);
                if (task) {
                    task.status = action.newStatus;
                    task.updatedAt = new Date().toISOString();
                    this.taskManager.save();
                }
            }
            this.renderTasks();
        }

        // 显示重做成功提示
        showModal('info', {
            title: '重做成功',
            message: '操作已重做',
            confirmText: '确定'
        });
    }

    // 记录操作到历史（供内部使用）
    recordOperation(type, operation, data, oldData = null, oldStatus = null, newStatus = null) {
        this.history.execute(
            () => {}, // 重做时不需要额外操作，因为在 redo 方法中处理
            () => {}  // 撤销时不需要额外操作，因为在 undo 方法中处理
        );
        // 手动添加到历史栈
        this.history.undoStack.push({
            type,
            operation,
            data: deepClone(data),
            oldData: oldData ? deepClone(oldData) : null,
            oldStatus,
            newStatus
        });
        // 清除重做栈
        this.history.redoStack = [];
    }
    
    // 显示版本号
    displayVersionNumber() {
        console.log('displayVersionNumber called');
        console.log('appVersion:', this.appVersion);
        const versionElement = document.getElementById('versionNumber');
        console.log('versionElement:', versionElement);
        if (versionElement) {
            versionElement.textContent = `版本 ${this.appVersion}`;
            console.log('Version updated successfully');
        }
    }

    // 绑定事件
    bindEvents() {
        // 资源相关事件
        document.getElementById('addResourceBtn').addEventListener('click', () => this.showAddResourceModal());
        document.getElementById('resourceSearch').addEventListener('input', (e) => this.handleResourceSearch(e));

        // 标签管理按钮
        document.getElementById('manageTagsBtn').addEventListener('click', () => this.showTagManagerModal());

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
                if (!e.target.closest('.column-toggle-btn') && !e.target.closest('.column-action-btn')) {
                    this.toggleCompletedColumn();
                }
            });
        }

        // 键盘快捷键：Ctrl+Z 撤销，Ctrl+Y 重做
        document.addEventListener('keydown', (e) => {
            // 检查是否按下了 Ctrl 或 Cmd 键
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    this.undo();
                } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
                    e.preventDefault();
                    this.redo();
                }
            }
        });
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

    // 显示标签管理模态框
    showTagManagerModal() {
        const tags = this.tagManager.getAllTagsSorted();

        let tagsHTML = '<div class="tag-manager-list">';

        if (tags.length === 0) {
            tagsHTML += '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">暂无标签，请创建标签</p>';
        } else {
            tags.forEach(tag => {
                const usageCount = this.tagManager.getTagUsageCount(this.resourceManager, tag.id);
                tagsHTML += `
                    <div class="tag-manager-item" data-tag-id="${tag.id}">
                        <span class="tag-color" style="background-color: ${tag.color};"></span>
                        <span class="tag-name">${tag.name}</span>
                        <span class="tag-usage-count">${usageCount} 个资源</span>
                        <div class="tag-actions">
                            <button class="btn-icon edit-tag-btn" title="编辑" onclick="app.editTag('${tag.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon delete-tag-btn" title="删除" onclick="app.deleteTag('${tag.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
        }
        tagsHTML += '</div>';

        const html = `
            <div class="tag-manager-container">
                <div class="tag-manager-header">
                    <h4>标签管理</h4>
                    <button class="btn btn-primary btn-small" id="addNewTagBtn">
                        <i class="fas fa-plus"></i> 新建标签
                    </button>
                </div>
                ${tagsHTML}
            </div>
        `;

        showModal('info', {
            title: '标签管理',
            message: html,
            confirmText: '关闭',
            html: true,
            onConfirm: () => {}
        });

        // 绑定新建标签按钮事件
        setTimeout(() => {
            const addBtn = document.getElementById('addNewTagBtn');
            if (addBtn) {
                addBtn.addEventListener('click', () => this.addNewTag());
            }
        }, 100);
    }

    // 添加新标签
    addNewTag() {
        showModal('input', {
            title: '新建标签',
            message: '请输入标签名称',
            inputLabel: '标签名称',
            inputPlaceholder: '请输入标签名称',
            confirmText: '创建',
            onConfirm: (name) => {
                if (name && name.trim()) {
                    this.tagManager.createTag(name.trim());
                    this.showTagManagerModal(); // 刷新列表

                    showModal('info', {
                        title: '创建成功',
                        message: `标签 "${name}" 创建成功`,
                        confirmText: '确定'
                    });
                }
            }
        });
    }

    // 编辑标签
    editTag(tagId) {
        const tag = this.tagManager.getTagById(tagId);
        if (!tag) return;

        showModal('input', {
            title: '编辑标签',
            message: '请输入新的标签名称',
            inputLabel: '标签名称',
            inputValue: tag.name,
            inputPlaceholder: '请输入标签名称',
            confirmText: '保存',
            onConfirm: (name) => {
                if (name && name.trim()) {
                    this.tagManager.updateTag(tagId, { name: name.trim() });
                    this.showTagManagerModal(); // 刷新列表
                }
            }
        });
    }

    // 删除标签
    deleteTag(tagId) {
        const tag = this.tagManager.getTagById(tagId);
        if (!tag) return;

        const usageCount = this.tagManager.getTagUsageCount(this.resourceManager, tagId);

        showModal('confirm', {
            title: '确认删除',
            message: `确定要删除标签 "${tag.name}" 吗？${usageCount > 0 ? `<br>该标签正在被 ${usageCount} 个资源使用，删除后将从这些资源中移除。` : ''}`,
            confirmText: '删除',
            onConfirm: () => {
                // 从所有资源中移除该标签
                this.tagManager.removeTagFromResources(this.resourceManager, tagId);
                // 删除标签
                this.tagManager.deleteTag(tagId);
                this.showTagManagerModal(); // 刷新列表
            }
        });
    }

    // 渲染标签筛选列表
    renderTagFilter() {
        const tagFilterArea = document.getElementById('tagFilterArea');
        const tagFilterList = document.getElementById('tagFilterList');
        if (!tagFilterArea || !tagFilterList) return;

        const tags = this.tagManager.getAllTagsSorted();

        if (tags.length === 0) {
            tagFilterArea.style.display = 'none';
            return;
        }

        tagFilterArea.style.display = 'flex';
        let html = '';

        tags.forEach(tag => {
            html += `<span class="tag-filter-item" data-tag-id="${tag.id}" style="background-color: ${tag.color};">${tag.name}</span>`;
        });

        tagFilterList.innerHTML = html;

        // 绑定点击事件
        tagFilterList.querySelectorAll('.tag-filter-item').forEach(item => {
            item.addEventListener('click', () => {
                const tagId = item.dataset.tagId;
                this.filterByTag(tagId);
            });
        });
    }

    // 按标签筛选
    filterByTag(tagId) {
        // 切换选中状态
        const tagFilterItems = document.querySelectorAll('.tag-filter-item');
        tagFilterItems.forEach(item => {
            if (item.dataset.tagId === tagId) {
                item.classList.toggle('active');
            }
        });

        // 筛选资源
        const activeTagIds = Array.from(document.querySelectorAll('.tag-filter-item.active'))
            .map(item => item.dataset.tagId);

        const resourceList = document.getElementById('resourceList');
        let resources = this.resourceManager.getAllResources();

        // 应用类型筛选
        if (this.currentFilter !== 'all') {
            resources = resources.filter(resource => resource.type === this.currentFilter);
        }

        // 应用标签筛选
        if (activeTagIds.length > 0) {
            resources = resources.filter(resource =>
                resource.tags && resource.tags.some(tagId => activeTagIds.includes(tagId))
            );
        }

        // 应用搜索
        if (this.currentSearch) {
            resources = this.resourceManager.searchResources(this.currentSearch);
        }

        // 渲染
        const fragment = document.createDocumentFragment();
        resources.forEach(resource => {
            const resourceElement = this.createResourceElement(resource);
            fragment.appendChild(resourceElement);
        });
        resourceList.innerHTML = '';
        resourceList.appendChild(fragment);
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

        // 检查是否逾期
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
        const overdueClass = isOverdue ? 'overdue' : '';
        const overdueText = isOverdue ? `<span class="task-overdue-badge"><i class="fas fa-exclamation-triangle"></i> 已逾期</span>` : '';

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

            <div class="task-meta ${overdueClass}">
                <span class="task-priority ${task.priority}">${task.priority}</span>
                ${task.dueDate ? `<span class="task-due-date ${isOverdue ? 'overdue' : ''}"><i class="fas fa-calendar"></i> ${new Date(task.dueDate).toLocaleDateString()}</span>` : ''}
                ${overdueText}
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
        let newTask = { title: '', description: '', priority: 'medium', dueDate: null };

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
                            // 第三步：选择优先级
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
                                confirmText: '下一步',
                                onConfirm: (priority) => {
                                    newTask.priority = priority || 'medium';
                                    // 第四步：选择截止日期（可选）
                                    showModal('input', {
                                        title: '添加任务',
                                        message: '请选择截止日期（可选，不选择则无截止日期）',
                                        inputLabel: '截止日期',
                                        inputType: 'date',
                                        inputPlaceholder: '请选择截止日期',
                                        confirmText: '添加',
                                        onConfirm: (dueDate) => {
                                            // 如果用户选择了截止日期，保存日期
                                            newTask.dueDate = dueDate || null;
                                            this.taskManager.addTask(newTask);
                                            this.renderTasks();
                                        }
                                    });
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

        // 设置新的定时器（优化为150ms）
        this.searchTimeout = setTimeout(() => {
            this.currentSearch = e.target.value;
            this.renderResources();
            delete this.searchTimeout;
        }, 150); // 150ms防抖延迟
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

        // 使用验证器验证数据
        const validation = ImportValidator.validateImportData(data);

        let previewHTML = '<h4>导入预览</h4>';

        if (validation.errors.length > 0) {
            previewHTML += `<div class="import-warnings">`;
            previewHTML += `<p class="warning-title"><i class="fas fa-exclamation-triangle"></i> 发现以下问题：</p>`;
            previewHTML += `<ul class="warning-list">`;
            validation.errors.slice(0, 5).forEach(err => {
                previewHTML += `<li>${err}</li>`;
            });
            if (validation.errors.length > 5) {
                previewHTML += `<li>...还有 ${validation.errors.length - 5} 个问题</li>`;
            }
            previewHTML += `</ul></div>`;
        }

        previewHTML += `<div class="import-summary">`;
        previewHTML += `<p><strong>资源：</strong> ${validation.summary.totalResources} 个`;
        if (validation.summary.resourceErrors > 0) {
            previewHTML += ` <span class="error-count">(${validation.summary.resourceErrors} 个无效)</span>`;
        }
        previewHTML += `</p>`;

        previewHTML += `<p><strong>任务：</strong> ${validation.summary.totalTasks} 个`;
        if (validation.summary.taskErrors > 0) {
            previewHTML += ` <span class="error-count">(${validation.summary.taskErrors} 个无效)</span>`;
        }
        previewHTML += `</p>`;
        previewHTML += `</div>`;

        // 存储验证后的数据
        this._importData = validation;

        preview.innerHTML = previewHTML;
        confirmBtn.style.display = 'inline-block';

        // 绑定确认导入事件
        confirmBtn.onclick = () => {
            this.confirmImport(validation);
        };
    }

    // 确认导入
    confirmImport(validation) {
        const data = validation;

        // 使用验证后的数据
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

        // 根据验证结果显示不同的消息
        const message = validation.errors.length > 0
            ? `数据已导入，但有 ${validation.errors.length} 个问题已自动修复`
            : '数据已成功导入';

        showModal('info', {
            title: '导入完成',
            message: message,
            confirmText: '确定'
        });

        // 清理临时数据
        this._importData = null;
    }
    
    // 清空已完成的任务
    clearCompletedTasks() {
        // 使用自定义确认弹窗
        showModal('confirm', {
            title: '确认清空',
            message: '确定要清空所有已完成的任务吗？',
            cancelText: '取消',
            confirmText: '确定',
            onConfirm: () => {
                const deletedCount = this.taskManager.clearCompletedTasks();
                // 重新渲染任务列表
                this.renderTasks();
                
                // 显示成功消息
                showModal('info', {
                    title: '清空成功',
                    message: `成功清空了 ${deletedCount} 个已完成的任务`,
                    confirmText: '确定'
                });
            }
        });
    }
}

export default LearningResourceManager;