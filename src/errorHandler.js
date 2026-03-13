// 错误处理模块 - 负责全局错误捕获和处理
import Popup from './popup.js';

class ErrorHandler {
    constructor() {
        this.popup = null;
        this.errorLog = [];
        this.maxLogSize = 100;
        this.init();
    }

    init() {
        // 等待 DOM 加载完成后再初始化 popup
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupErrorHandlers());
        } else {
            this.setupErrorHandlers();
        }
    }

    setupErrorHandlers() {
        // 获取 popup 实例
        this.popup = window.popup || new Popup();

        // 捕获 JavaScript 运行时错误
        window.addEventListener('error', (event) => {
            this.handleError(event.error, 'runtime');
        });

        // 捕获 Promise 拒绝
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, 'promise');
        });

        // 捕获资源加载错误
        window.addEventListener('load', () => {
            const resources = document.querySelectorAll('img, script, link');
            resources.forEach(resource => {
                resource.addEventListener('error', (event) => {
                    this.handleError(new Error(`资源加载失败: ${event.target.src || event.target.href}`), 'resource');
                });
            });
        });

        // 捕获 LocalStorage 错误
        this.wrapLocalStorage();

        console.log('[ErrorHandler] 全局错误处理已启用');
    }

    // 包装 LocalStorage 以捕获存储错误
    wrapLocalStorage() {
        const originalSetItem = localStorage.setItem.bind(localStorage);
        const originalGetItem = localStorage.getItem.bind(localStorage);

        try {
            localStorage.setItem = (key, value) => {
                try {
                    originalSetItem(key, value);
                } catch (e) {
                    this.handleError(e, 'storage');
                    throw e;
                }
            };

            localStorage.getItem = (key) => {
                try {
                    return originalGetItem(key);
                } catch (e) {
                    this.handleError(e, 'storage');
                    return null;
                }
            };
        } catch (e) {
            console.error('无法包装 LocalStorage:', e);
        }
    }

    // 处理错误
    handleError(error, type = 'unknown') {
        // 记录错误
        const errorInfo = {
            message: error?.message || String(error),
            stack: error?.stack || '',
            type,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        this.logError(errorInfo);

        // 开发环境下输出到控制台
        if (this.isDevelopment()) {
            console.error('[Error]', errorInfo);
            return;
        }

        // 生产环境显示友好提示
        this.showUserFriendlyMessage(errorInfo);
    }

    // 显示用户友好的错误消息
    showUserFriendlyMessage(errorInfo) {
        const messageMap = {
            runtime: '应用程序遇到了一些问题，请刷新页面重试。',
            promise: '某些操作未能完成，请检查网络连接后重试。',
            storage: '数据保存失败，可能是存储空间不足。请清理一些数据后重试。',
            resource: '部分资源加载失败，请检查网络连接。',
            unknown: '发生了一些意外错误，请稍后重试。'
        };

        const message = messageMap[errorInfo.type] || messageMap.unknown;

        // 避免重复显示相同错误
        const lastError = this.errorLog[this.errorLog.length - 1];
        if (lastError && lastError.message === errorInfo.message) {
            return;
        }

        if (this.popup) {
            this.popup.alert(message, {
                title: '提示'
            });
        } else {
            alert(message);
        }
    }

    // 记录错误到日志
    logError(errorInfo) {
        this.errorLog.push(errorInfo);
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.shift();
        }
    }

    // 获取错误日志
    getErrorLog() {
        return [...this.errorLog];
    }

    // 清空错误日志
    clearErrorLog() {
        this.errorLog = [];
    }

    // 判断是否为开发环境
    isDevelopment() {
        return window.location.hostname === 'localhost' ||
               window.location.hostname === '127.0.0.1' ||
               window.location.protocol === 'file:';
    }

    // 手动触发错误报告
    reportError(error, context = {}) {
        this.handleError(error, 'manual');
        console.error('[Error Report]', { error, context });
    }
}

// 创建全局错误处理器实例
const errorHandler = new ErrorHandler();

// 导出错误处理器
export default errorHandler;

// 导出错误处理函数供直接调用
export function reportError(error, context) {
    errorHandler.reportError(error, context);
}
