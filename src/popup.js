// 弹窗模块 - 负责自定义弹窗功能
class Popup {
    constructor() {
        this.overlay = document.getElementById('customModalOverlay');
        this.modal = document.getElementById('customModal');
        this.title = document.getElementById('customModalTitle');
        this.message = document.getElementById('customModalMessage');
        this.inputGroup = document.getElementById('customModalInputGroup');
        this.inputLabel = document.getElementById('customModalInputLabel');
        this.input = document.getElementById('customModalInput');
        this.textarea = document.getElementById('customModalTextarea'); // 新增：多行文本框引用
        this.select = document.getElementById('customModalSelect'); // 新增：下拉选择框引用
        this.cancelBtn = document.getElementById('customModalCancel');
        this.confirmBtn = document.getElementById('customModalConfirm');
        
        this.currentModalType = '';
        this.confirmCallback = null;
        this.cancelCallback = null;
        this.isShowingNewModal = false;
        
        this.bindEvents();
    }
    
    // 绑定事件
    bindEvents() {
        // 点击遮罩层关闭弹窗
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.hide();
            }
        });
        
        // 键盘事件：ESC 关闭弹窗
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hide();
            }
        });
        
        // 绑定按钮事件
        this.confirmBtn.addEventListener('click', () => this.handleConfirm());
        this.cancelBtn.addEventListener('click', () => this.hide());
        this.modal.querySelector('.custom-modal-close').addEventListener('click', () => this.hide());
    }
    
    // 显示弹窗
    show(type, options = {}) {
        // 设置标志，表示正在显示新弹窗
        this.isShowingNewModal = true;
        
        // 设置弹窗类型
        this.currentModalType = type;
        this.modal.className = `custom-modal ${type}`;
        
        // 设置标题和内容
        this.title.textContent = options.title || '提示';
        
        // 检查是否需要支持HTML内容
        if (options.html) {
            this.message.innerHTML = options.message || '';
        } else {
            this.message.textContent = options.message || '';
        }
        
        // 保存回调函数
        this.confirmCallback = options.onConfirm || null;
        this.cancelCallback = options.onCancel || null;
        
        // 配置按钮
        if (type === 'info') {
            // 信息提示弹窗 - 仅显示确定按钮
            this.cancelBtn.style.display = 'none';
            this.confirmBtn.textContent = options.confirmText || '确定';
        } else if (type === 'confirm') {
            // 确认对话框 - 显示确定和取消按钮
            this.cancelBtn.style.display = 'inline-flex';
            this.cancelBtn.textContent = options.cancelText || '取消';
            this.confirmBtn.textContent = options.confirmText || '确定';
        } else if (type === 'input') {
            // 输入对话框 - 显示输入框和两个按钮
            this.cancelBtn.style.display = 'inline-flex';
            this.cancelBtn.textContent = options.cancelText || '取消';
            this.confirmBtn.textContent = options.confirmText || '确定';

            // 显示输入框组
            this.inputGroup.style.display = 'block';
            this.inputLabel.textContent = options.inputLabel || '输入内容';

            // 配置输入类型和下拉选择
            const inputType = options.inputType || 'text';
            this.input.style.display = (inputType === 'text' || inputType === 'date' || inputType === 'datetime-local') ? 'block' : 'none';
            this.textarea.style.display = inputType === 'textarea' ? 'block' : 'none';
            this.select.style.display = inputType === 'select' ? 'block' : 'none';

            // 设置输入框属性
            this.input.placeholder = options.inputPlaceholder || '请输入内容';
            this.input.type = inputType === 'select' || inputType === 'textarea' ? 'text' : inputType;
            this.textarea.placeholder = options.inputPlaceholder || '请输入内容';

            // 设置默认值
            if (inputType === 'text' || inputType === 'date' || inputType === 'datetime-local') {
                this.input.value = options.inputValue || '';
                this.input.focus();
            } else if (inputType === 'textarea') {
                this.textarea.value = options.inputValue || '';
                this.textarea.focus();
            } else {
                // 更新下拉选项
                if (options.inputOptions) {
                    this.select.innerHTML = '';
                    options.inputOptions.forEach(option => {
                        const opt = document.createElement('option');
                        opt.value = option.value;
                        opt.textContent = option.text;
                        this.select.appendChild(opt);
                    });
                }

                this.select.value = options.inputValue || '';
            }
        }
        
        // 显示弹窗
        this.overlay.classList.add('active');
    }
    
    // 隐藏弹窗
    hide() {
        this.overlay.classList.remove('active');
        
        // 重置输入框和下拉选择框 - 优化DOM操作，减少重排
        this.inputGroup.style.display = 'none';
        
        // 批量重置输入值
        this.input.value = '';
        this.textarea.value = '';
        this.select.value = '';
        
        // 批量设置显示状态
        this.input.style.display = 'block';
        this.textarea.style.display = 'none';
        this.select.style.display = 'none';
        
        // 重置标志
        this.isShowingNewModal = false;
        
        // 调用取消回调
        if (typeof this.cancelCallback === 'function') {
            this.cancelCallback();
        }
    }
    
    // 处理确认按钮点击
    handleConfirm() {
        let result = true;
        
        // 如果是输入对话框，获取输入值或选择值
        if (this.currentModalType === 'input') {
            // 根据当前显示的输入类型获取值
            let inputType = 'text';
            if (this.input.style.display === 'block') {
                inputType = 'text';
            } else if (this.textarea.style.display === 'block') {
                inputType = 'textarea';
            } else {
                inputType = 'select';
            }
            
            if (inputType === 'text') {
                result = this.input.value;
            } else if (inputType === 'textarea') {
                result = this.textarea.value;
            } else {
                result = this.select.value;
            }
        }
        
        // 调用回调函数前重置标志
        this.isShowingNewModal = false;
        
        // 调用回调函数
        if (typeof this.confirmCallback === 'function') {
            this.confirmCallback(result);
        }
        
        // 如果回调函数没有显示新弹窗，则隐藏当前弹窗
        if (!this.isShowingNewModal) {
            this.hide();
        }
    }
    
    // 替换浏览器默认的alert
    alert(message, options = {}) {
        return new Promise((resolve) => {
            this.show('info', {
                message,
                ...options,
                onConfirm: () => resolve()
            });
        });
    }
    
    // 替换浏览器默认的confirm
    confirm(message, options = {}) {
        return new Promise((resolve) => {
            this.show('confirm', {
                message,
                ...options,
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false)
            });
        });
    }
    
    // 替换浏览器默认的prompt
    prompt(message, defaultValue = '', options = {}) {
        return new Promise((resolve) => {
            this.show('input', {
                message,
                inputValue: defaultValue,
                ...options,
                onConfirm: (value) => resolve(value),
                onCancel: () => resolve(null)
            });
        });
    }
}

export default Popup;