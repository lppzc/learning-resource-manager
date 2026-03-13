// 工具函数模块 - 提供通用的工具函数

/**
 * 生成唯一ID
 * @returns {string} 唯一ID字符串
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间(毫秒)
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 时间限制(毫秒)
 * @returns {Function} 节流后的函数
 */
export function throttle(func, limit = 100) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 深度克隆对象
 * @param {any} obj - 要克隆的对象
 * @returns {any} 克隆后的对象
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }

    if (obj instanceof Array) {
        return obj.map(item => deepClone(item));
    }

    if (obj instanceof Object) {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

/**
 * 格式化日期
 * @param {string|Date} date - 日期字符串或Date对象
 * @param {string} format - 格式字符串 (默认: 'YYYY-MM-DD HH:mm')
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date, format = 'YYYY-MM-DD HH:mm') {
    if (!date) return '';

    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
}

/**
 * 获取相对时间描述
 * @param {string|Date} date - 日期字符串或Date对象
 * @returns {string} 相对时间描述
 */
export function getRelativeTime(date) {
    if (!date) return '';

    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const now = new Date();
    const diff = now - d;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    if (days < 30) return `${Math.floor(days / 7)}周前`;
    if (days < 365) return `${Math.floor(days / 30)}月前`;
    return `${Math.floor(days / 365)}年前`;
}

/**
 * 检查是否逾期
 * @param {string|Date} dueDate - 截止日期
 * @returns {boolean} 是否逾期
 */
export function isOverdue(dueDate) {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const now = new Date();
    return due < now;
}

/**
 * 获取日期差（天数）
 * @param {string|Date} date1 - 日期1
 * @param {string|Date} date2 - 日期2 (默认: 当前时间)
 * @returns {number} 日期差（天数）
 */
export function getDaysDifference(date1, date2 = new Date()) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * URL验证
 * @param {string} url - URL字符串
 * @returns {boolean} 是否为有效URL
 */
export function isValidUrl(url) {
    if (!url) return false;
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * 从URL提取域名
 * @param {string} url - URL字符串
 * @returns {string} 域名
 */
export function getDomainFromUrl(url) {
    if (!url) return '';
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch {
        return '';
    }
}

/**
 * 截断文本
 * @param {string} text - 文本
 * @param {number} maxLength - 最大长度
 * @returns {string} 截断后的文本
 */
export function truncateText(text, maxLength = 50) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * 生成随机颜色
 * @returns {string} 随机颜色值
 */
export function generateRandomColor() {
    const colors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
        '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * 字符串脱敏
 * @param {string} str - 字符串
 * @param {number} startLen - 保留开头字符数
 * @param {number} endLen - 保留结尾字符数
 * @returns {string} 脱敏后的字符串
 */
export function maskString(str, startLen = 3, endLen = 4) {
    if (!str || str.length <= startLen + endLen) return str;
    const start = str.substring(0, startLen);
    const end = str.substring(str.length - endLen);
    return `${start}***${end}`;
}

/**
 * 数组去重
 * @param {Array} array - 数组
 * @param {string} key - 去重的键名（可选）
 * @returns {Array} 去重后的数组
 */
export function uniqueArray(array, key) {
    if (!key) {
        return [...new Set(array)];
    }
    const seen = new Set();
    return array.filter(item => {
        const val = item[key];
        if (seen.has(val)) return false;
        seen.add(val);
        return true;
    });
}

/**
 * 排序数组
 * @param {Array} array - 数组
 * @param {string} key - 排序键名
 * @param {string} order - 排序顺序 ('asc' | 'desc')
 * @returns {Array} 排序后的数组
 */
export function sortBy(array, key, order = 'asc') {
    return [...array].sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];

        if (aVal === bVal) return 0;

        let comparison = 0;
        if (aVal === null || aVal === undefined) comparison = 1;
        else if (bVal === null || bVal === undefined) comparison = -1;
        else comparison = aVal < bVal ? -1 : 1;

        return order === 'desc' ? -comparison : comparison;
    });
}

/**
 * 验证必填字段
 * @param {Object} data - 数据对象
 * @param {string[]} requiredFields - 必填字段数组
 * @returns {Object} { valid: boolean, missing: string[] }
 */
export function validateRequiredFields(data, requiredFields) {
    const missing = requiredFields.filter(field => {
        const value = data[field];
        return value === null || value === undefined || value === '';
    });
    return {
        valid: missing.length === 0,
        missing
    };
}

/**
 * 本地存储工具类
 */
export class LocalStorageHelper {
    constructor(prefix = 'lrm_') {
        this.prefix = prefix;
    }

    set(key, value) {
        try {
            localStorage.setItem(`${this.prefix}${key}`, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            return false;
        }
    }

    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(`${this.prefix}${key}`);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Storage get error:', e);
            return defaultValue;
        }
    }

    remove(key) {
        try {
            localStorage.removeItem(`${this.prefix}${key}`);
            return true;
        } catch (e) {
            console.error('Storage remove error:', e);
            return false;
        }
    }

    clear() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (e) {
            console.error('Storage clear error:', e);
            return false;
        }
    }
}

/**
 * 事件总线类
 */
export class EventBus {
    constructor() {
        this.events = {};
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

    emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => callback(data));
    }

    once(event, callback) {
        const wrapper = (data) => {
            callback(data);
            this.off(event, wrapper);
        };
        this.on(event, wrapper);
    }
}

/**
 * 操作历史栈类（用于撤销/重做）
 */
export class HistoryStack {
    constructor(maxSize = 50) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxSize = maxSize;
    }

    /**
     * 执行操作并记录到历史
     * @param {Function} redo - 重做函数
     * @param {Function} undo - 撤销函数
     */
    execute(redo, undo) {
        redo();
        this.undoStack.push({ redo, undo });
        if (this.undoStack.length > this.maxSize) {
            this.undoStack.shift();
        }
        this.redoStack = []; // 清除重做栈
    }

    /**
     * 撤销操作
     * @returns {boolean} 是否成功撤销
     */
    undo() {
        if (this.undoStack.length === 0) return false;
        const action = this.undoStack.pop();
        action.undo();
        this.redoStack.push(action);
        return true;
    }

    /**
     * 重做操作
     * @returns {boolean} 是否成功重做
     */
    redo() {
        if (this.redoStack.length === 0) return false;
        const action = this.redoStack.pop();
        action.redo();
        this.undoStack.push(action);
        return true;
    }

    /**
     * 是否可以撤销
     * @returns {boolean}
     */
    canUndo() {
        return this.undoStack.length > 0;
    }

    /**
     * 是否可以重做
     * @returns {boolean}
     */
    canRedo() {
        return this.redoStack.length > 0;
    }

    /**
     * 清空历史
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
    }
}

export default {
    generateId,
    debounce,
    throttle,
    deepClone,
    formatDate,
    getRelativeTime,
    isOverdue,
    getDaysDifference,
    isValidUrl,
    getDomainFromUrl,
    truncateText,
    generateRandomColor,
    maskString,
    uniqueArray,
    sortBy,
    validateRequiredFields,
    LocalStorageHelper,
    EventBus,
    HistoryStack
};
