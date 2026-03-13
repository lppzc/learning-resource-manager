// 状态管理模块 - 提供统一的应用状态管理
import { EventBus, deepClone } from './utils.js';

class Store extends EventBus {
    constructor() {
        super();
        this.state = {
            // 资源相关状态
            resources: [],
            currentResourceFilter: 'all',
            currentResourceSearch: '',

            // 任务相关状态
            tasks: [],
            completedColumnCollapsed: true,

            // 标签相关状态
            tags: [],

            // UI相关状态
            isLoading: false,
            activeModal: null,

            // 应用相关状态
            appVersion: '1.0.0'
        };
    }

    // 获取状态
    getState() {
        return this.state;
    }

    // 获取特定状态
    get(key) {
        return deepClone(this.state[key]);
    }

    // 设置状态
    set(key, value) {
        const oldValue = this.state[key];
        this.state[key] = deepClone(value);

        // 触发状态变更事件
        this.emit('change', {
            key,
            oldValue,
            newValue: deepClone(value)
        });
    }

    // 批量设置状态
    setState(updates) {
        const changes = {};
        for (const key in updates) {
            if (this.state.hasOwnProperty(key)) {
                const oldValue = this.state[key];
                this.state[key] = deepClone(updates[key]);
                changes[key] = { oldValue, newValue: deepClone(updates[key]) };
            }
        }

        // 触发批量变更事件
        if (Object.keys(changes).length > 0) {
            this.emit('batchChange', changes);
        }
    }

    // 重置状态
    reset() {
        this.state = {
            resources: [],
            currentResourceFilter: 'all',
            currentResourceSearch: '',
            tasks: [],
            completedColumnCollapsed: true,
            tags: [],
            isLoading: false,
            activeModal: null,
            appVersion: '1.0.0'
        };
        this.emit('reset');
    }

    // 订阅状态变更
    subscribe(key, callback) {
        return this.on('change', (data) => {
            if (data.key === key) {
                callback(data.newValue, data.oldValue);
            }
        });
    }

    // 订阅批量变更
    subscribeToBatch(callback) {
        return this.on('batchChange', callback);
    }

    // 计算属性 - 获取待办任务
    get pendingTasks() {
        return this.state.tasks.filter(task => task.status === 'pending');
    }

    // 计算属性 - 获取进行中任务
    get inProgressTasks() {
        return this.state.tasks.filter(task => task.status === 'in-progress');
    }

    // 计算属性 - 获取已完成任务
    get completedTasks() {
        return this.state.tasks.filter(task => task.status === 'completed');
    }

    // 计算属性 - 获取资源数量
    get resourceCount() {
        return this.state.resources.length;
    }

    // 计算属性 - 获取任务总数
    get taskCount() {
        return this.state.tasks.length;
    }

    // 计算属性 - 获取逾期任务
    get overdueTasks() {
        const now = new Date();
        return this.state.tasks.filter(task =>
            task.dueDate &&
            new Date(task.dueDate) < now &&
            task.status !== 'completed'
        );
    }
}

// 创建全局Store实例
const store = new Store();

export default store;
export { Store };
