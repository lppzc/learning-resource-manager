// 存储模块 - 负责LocalStorage数据存储封装
class Storage {
    constructor() {
        this.prefix = 'learning_resource_manager_';
        this.debounceTimers = {};
        this.debounceDelay = 150; // 150ms防抖延迟（优化为更快的响应）
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

export default Storage;