// 主入口文件 - 整合所有模块
import LearningResourceManager from './app.js';
import Popup from './popup.js';

// 初始化弹窗实例
const popup = new Popup();

// 替换浏览器默认弹窗
window.alert = (message, options) => popup.alert(message, options);
window.confirm = (message, options) => popup.confirm(message, options);
window.prompt = (message, defaultValue, options) => popup.prompt(message, defaultValue, options);

// 为了向后兼容，保留showModal函数
function showModal(type, options = {}) {
    popup.show(type, options);
}

function hideModal() {
    popup.hide();
}

function handleConfirm() {
    // 这个函数不再需要，因为Popup类已经处理了确认逻辑
}

// 暴露到全局作用域
window.showModal = showModal;
window.hideModal = hideModal;
window.handleConfirm = handleConfirm;

// 初始化应用
const app = new LearningResourceManager();
// 将app对象暴露到全局作用域，以便HTML事件处理器访问
window.app = app;