// 资源管理模块 - 负责学习资源的管理
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

export default ResourceManager;