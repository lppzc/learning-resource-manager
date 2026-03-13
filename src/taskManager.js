// 任务管理模块 - 负责学习任务的管理
import { generateId, formatDate, isOverdue, getDaysDifference } from './utils.js';

class TaskManager {
    constructor(storage) {
        this.storage = storage;
        this.tasks = this.storage.get('tasks', []);
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
    
    // 清空所有已完成的任务
    clearCompletedTasks() {
        const initialLength = this.tasks.length;
        this.tasks = this.tasks.filter(task => task.status !== 'completed');
        const deletedCount = initialLength - this.tasks.length;
        if (deletedCount > 0) {
            this.save();
        }
        return deletedCount;
    }
}

export default TaskManager;