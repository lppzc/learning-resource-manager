// 标签管理模块 - 负责标签的集中管理
import { generateId, generateRandomColor, uniqueArray } from './utils.js';

class TagManager {
    constructor(storage) {
        this.storage = storage;
        this.tags = this.storage.get('tags', []);
    }

    // 获取所有标签
    getAllTags() {
        return [...this.tags];
    }

    // 获取所有标签（按名称排序）
    getAllTagsSorted() {
        return [...this.tags].sort((a, b) => a.name.localeCompare(b.name));
    }

    // 根据ID获取标签
    getTagById(id) {
        return this.tags.find(tag => tag.id === id);
    }

    // 根据名称获取标签
    getTagByName(name) {
        return this.tags.find(tag => tag.name.toLowerCase() === name.toLowerCase());
    }

    // 创建标签
    createTag(name, color = null) {
        // 检查标签是否已存在
        const existingTag = this.getTagByName(name);
        if (existingTag) {
            return existingTag;
        }

        const newTag = {
            id: generateId(),
            name: name.trim(),
            color: color || generateRandomColor(),
            createdAt: new Date().toISOString()
        };

        this.tags.push(newTag);
        this.save();
        return newTag;
    }

    // 更新标签
    updateTag(id, updates) {
        const index = this.tags.findIndex(tag => tag.id === id);
        if (index === -1) return null;

        this.tags[index] = {
            ...this.tags[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        this.save();
        return this.tags[index];
    }

    // 删除标签
    deleteTag(id) {
        const index = this.tags.findIndex(tag => tag.id === id);
        if (index === -1) return false;

        this.tags.splice(index, 1);
        this.save();
        return true;
    }

    // 从所有资源中移除标签
    removeTagFromResources(resourceManager, tagId) {
        const resources = resourceManager.getAllResources();
        let hasChanges = false;

        resources.forEach(resource => {
            if (resource.tags && resource.tags.includes(tagId)) {
                resource.tags = resource.tags.filter(t => t !== tagId);
                resourceManager.updateResource(resource.id, { tags: resource.tags });
                hasChanges = true;
            }
        });

        return hasChanges;
    }

    // 从所有任务中移除标签关联
    removeTagFromTasks(taskManager, tagId) {
        // 任务中可能没有标签关联，这里预留扩展
        return false;
    }

    // 获取标签使用计数
    getTagUsageCount(resourceManager, tagId) {
        const resources = resourceManager.getAllResources();
        return resources.filter(resource =>
            resource.tags && resource.tags.includes(tagId)
        ).length;
    }

    // 获取所有未使用的标签
    getUnusedTags(resourceManager) {
        return this.tags.filter(tag =>
            this.getTagUsageCount(resourceManager, tag.id) === 0
        );
    }

    // 从资源中提取所有标签并添加到标签库
    extractTagsFromResources(resourceManager) {
        const resources = resourceManager.getAllResources();
        const allTagNames = [];

        resources.forEach(resource => {
            if (resource.tags && Array.isArray(resource.tags)) {
                allTagNames.push(...resource.tags);
            }
        });

        // 去重
        const uniqueTagNames = uniqueArray(allTagNames);

        // 创建不存在的标签
        const createdTags = [];
        uniqueTagNames.forEach(tagName => {
            if (!this.getTagByName(tagName)) {
                const newTag = this.createTag(tagName);
                createdTags.push(newTag);
            }
        });

        return createdTags;
    }

    // 保存到本地存储
    save() {
        this.storage.set('tags', this.tags);
    }

    // 立即保存
    saveImmediately() {
        this.storage.setImmediately('tags', this.tags);
    }
}

export default TagManager;
