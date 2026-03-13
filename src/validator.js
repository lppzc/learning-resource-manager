// 数据验证模块 - 负责数据导入导出时的验证
import { isValidUrl, validateRequiredFields } from './utils.js';

/**
 * 资源数据验证
 */
export const ResourceValidator = {
    // 资源类型
    validTypes: ['video', 'document', 'file'],

    // 验证资源数据
    validate(resource, isImport = false) {
        const errors = [];

        // 必填字段验证
        const requiredResult = validateRequiredFields(resource, ['title', 'type']);
        if (!requiredResult.valid) {
            errors.push(`缺少必填字段: ${requiredResult.missing.join(', ')}`);
        }

        // 类型验证
        if (resource.type && !this.validTypes.includes(resource.type)) {
            errors.push(`无效的资源类型: ${resource.type}，有效值为: ${this.validTypes.join(', ')}`);
        }

        // URL格式验证
        if (resource.url && !isValidUrl(resource.url)) {
            errors.push(`无效的URL格式: ${resource.url}`);
        }

        // 标签格式验证
        if (resource.tags) {
            if (!Array.isArray(resource.tags)) {
                errors.push('标签必须是数组格式');
            } else {
                resource.tags.forEach((tag, index) => {
                    if (typeof tag !== 'string') {
                        errors.push(`标签[${index}]必须是字符串类型`);
                    }
                });
            }
        }

        // 创建时间验证
        if (resource.createdAt && isNaN(new Date(resource.createdAt).getTime())) {
            errors.push(`无效的创建时间: ${resource.createdAt}`);
        }

        return {
            valid: errors.length === 0,
            errors,
            data: isImport ? this.sanitize(resource) : resource
        };
    },

    // 清理和规范化数据
    sanitize(resource) {
        return {
            id: resource.id || this.generateTempId(),
            title: String(resource.title || '').trim(),
            type: resource.type || 'file',
            url: String(resource.url || '').trim(),
            description: String(resource.description || '').trim(),
            tags: Array.isArray(resource.tags) ? resource.tags.filter(t => typeof t === 'string') : [],
            createdAt: resource.createdAt || new Date().toISOString(),
            updatedAt: resource.updatedAt || new Date().toISOString()
        };
    },

    // 生成临时ID（导入时使用）
    generateTempId() {
        return 'import_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    },

    // 批量验证
    validateBatch(resources) {
        if (!Array.isArray(resources)) {
            return {
                valid: false,
                errors: ['资源数据必须是数组格式'],
                validCount: 0,
                invalidCount: 0,
                results: []
            };
        }

        const results = resources.map((resource, index) => ({
            index,
            ...this.validate(resource, true)
        }));

        const validResults = results.filter(r => r.valid);
        const invalidResults = results.filter(r => !r.valid);

        return {
            valid: invalidResults.length === 0,
            errors: invalidResults.flatMap(r => r.errors.map(e => `资源[${r.index}]: ${e}`)),
            validCount: validResults.length,
            invalidCount: invalidResults.length,
            results
        };
    }
};

/**
 * 任务数据验证
 */
export const TaskValidator = {
    // 任务状态
    validStatuses: ['pending', 'in-progress', 'completed'],

    // 任务优先级
    validPriorities: ['low', 'medium', 'high'],

    // 验证任务数据
    validate(task, isImport = false) {
        const errors = [];

        // 必填字段验证
        const requiredResult = validateRequiredFields(task, ['title', 'status']);
        if (!requiredResult.valid) {
            errors.push(`缺少必填字段: ${requiredResult.missing.join(', ')}`);
        }

        // 状态验证
        if (task.status && !this.validStatuses.includes(task.status)) {
            errors.push(`无效的任务状态: ${task.status}，有效值为: ${this.validStatuses.join(', ')}`);
        }

        // 优先级验证
        if (task.priority && !this.validPriorities.includes(task.priority)) {
            errors.push(`无效的优先级: ${task.priority}，有效值为: ${this.validPriorities.join(', ')}`);
        }

        // 截止日期验证
        if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            if (isNaN(dueDate.getTime())) {
                errors.push(`无效的截止日期: ${task.dueDate}`);
            }
        }

        // 关联资源验证
        if (task.resources) {
            if (!Array.isArray(task.resources)) {
                errors.push('关联资源必须是数组格式');
            }
        }

        if (task.resourceId && typeof task.resourceId !== 'string') {
            errors.push('resourceId 必须是字符串类型');
        }

        // 创建时间验证
        if (task.createdAt && isNaN(new Date(task.createdAt).getTime())) {
            errors.push(`无效的创建时间: ${task.createdAt}`);
        }

        return {
            valid: errors.length === 0,
            errors,
            data: isImport ? this.sanitize(task) : task
        };
    },

    // 清理和规范化数据
    sanitize(task) {
        return {
            id: task.id || this.generateTempId(),
            title: String(task.title || '').trim(),
            description: String(task.description || '').trim(),
            resourceId: task.resourceId || null,
            resources: Array.isArray(task.resources) ? task.resources : [],
            status: task.status || 'pending',
            priority: task.priority || 'medium',
            dueDate: task.dueDate || null,
            createdAt: task.createdAt || new Date().toISOString(),
            updatedAt: task.updatedAt || new Date().toISOString()
        };
    },

    // 生成临时ID
    generateTempId() {
        return 'import_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    },

    // 批量验证
    validateBatch(tasks) {
        if (!Array.isArray(tasks)) {
            return {
                valid: false,
                errors: ['任务数据必须是数组格式'],
                validCount: 0,
                invalidCount: 0,
                results: []
            };
        }

        const results = tasks.map((task, index) => ({
            index,
            ...this.validate(task, true)
        }));

        const validResults = results.filter(r => r.valid);
        const invalidResults = results.filter(r => !r.valid);

        return {
            valid: invalidResults.length === 0,
            errors: invalidResults.flatMap(r => r.errors.map(e => `任务[${r.index}]: ${e}`)),
            validCount: validResults.length,
            invalidCount: invalidResults.length,
            results
        };
    }
};

/**
 * 导入数据验证
 */
export const ImportValidator = {
    // 验证整个导入数据包
    validateImportData(data) {
        const errors = [];
        let resources = [];
        let tasks = [];

        // 基本结构验证
        if (!data || typeof data !== 'object') {
            return {
                valid: false,
                errors: ['无效的数据格式，数据必须是对象类型'],
                resources: [],
                tasks: []
            };
        }

        // 验证资源数据
        if (data.resources) {
            const resourceValidation = ResourceValidator.validateBatch(data.resources);
            resources = resourceValidation.results
                .filter(r => r.valid)
                .map(r => r.data);
            if (resourceValidation.errors.length > 0) {
                errors.push(...resourceValidation.errors);
            }
        }

        // 验证任务数据
        if (data.tasks) {
            const taskValidation = TaskValidator.validateBatch(data.tasks);
            tasks = taskValidation.results
                .filter(r => r.valid)
                .map(r => r.data);
            if (taskValidation.errors.length > 0) {
                errors.push(...taskValidation.errors);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            resources,
            tasks,
            summary: {
                totalResources: resources.length,
                totalTasks: tasks.length,
                resourceErrors: data.resources ? data.resources.length - resources.length : 0,
                taskErrors: data.tasks ? data.tasks.length - tasks.length : 0
            }
        };
    }
};

export default {
    ResourceValidator,
    TaskValidator,
    ImportValidator
};
