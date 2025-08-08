// auth.js
const API_BASE_URL = 'http://localhost:3000/api'; // 后端API地址

// 辅助函数：显示消息
function showMessage(elementId, message, isError = false) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.className = `message ${isError ? 'error' : 'success'}`; // 添加成功/失败样式
    }
}

// --- 注册逻辑 ---
const registerForm = document.getElementById('registerForm');
const sendCodeBtn = document.getElementById('sendCodeBtn');

if (sendCodeBtn) {
    sendCodeBtn.addEventListener('click', async () => {
        const email = document.getElementById('regEmail').value;
        if (!email) {
            showMessage('registerMessage', '请输入邮箱。', true);
            return;
        }

        sendCodeBtn.disabled = true;
        sendCodeBtn.textContent = '发送中...';
        showMessage('registerMessage', '正在发送验证码，请稍候...');

        try {
            const response = await fetch(`${API_BASE_URL}/send-verification-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, purpose: 'register' })
            });
            const data = await response.json();
            if (response.ok) {
                showMessage('registerMessage', data.message);
                // 倒计时60秒
                let countdown = 60;
                const timer = setInterval(() => {
                    countdown--;
                    sendCodeBtn.textContent = `重新发送 (${countdown}s)`;
                    if (countdown <= 0) {
                        clearInterval(timer);
                        sendCodeBtn.textContent = '发送验证码';
                        sendCodeBtn.disabled = false;
                    }
                }, 1000);
            } else {
                showMessage('registerMessage', data.message, true);
                sendCodeBtn.disabled = false;
                sendCodeBtn.textContent = '发送验证码';
            }
        } catch (error) {
            console.error('发送验证码请求失败:', error);
            showMessage('registerMessage', '网络错误，请稍后再试。', true);
            sendCodeBtn.disabled = false;
            sendCodeBtn.textContent = '发送验证码';
        }
    });
}

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('regUsername').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;
        const verificationCode = document.getElementById('regCode').value;

        if (password !== confirmPassword) {
            showMessage('registerMessage', '两次输入的密码不一致。', true);
            return;
        }
        if (password.length < 6) {
            showMessage('registerMessage', '密码至少需要6位。', true);
            return;
        }

        showMessage('registerMessage', '正在注册，请稍候...');

        try {
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, verificationCode })
            });
            const data = await response.json();
            if (response.ok) {
                // 优化：使用 alert 突出显示账号ID
                alert(`恭喜您，注册成功！\n\n您的专属账号ID是：${data.accountId}\n\n请务必牢记此ID，因为它将是您登录的凭证之一！`);
                showMessage('registerMessage', `注册成功！您的账号ID是: ${data.accountId}。即将跳转到登录页...`);
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1000); // 缩短跳转时间，因为已经弹窗提示
            } else {
                showMessage('registerMessage', data.message, true);
            }
        } catch (error) {
            console.error('注册请求失败:', error);
            showMessage('registerMessage', '网络错误，注册失败。', true);
        }
    });
}

// --- 登录逻辑 ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = document.getElementById('identifier').value;
        const password = document.getElementById('password').value;

        showMessage('loginMessage', '正在登录，请稍候...');

        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password })
            });
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('jwtToken', data.token); // 存储 JWT
                localStorage.setItem('username', data.username);
                localStorage.setItem('accountId', data.accountId);
                showMessage('loginMessage', data.message);
                window.location.href = 'lobby.html'; // 跳转到大厅
            } else {
                showMessage('loginMessage', data.message, true);
            }
        } catch (error) {
            console.error('登录请求失败:', error);
            showMessage('loginMessage', '网络错误，登录失败。', true);
        }
    });
}

// --- 重置密码逻辑 ---
const resetPasswordForm = document.getElementById('resetPasswordForm');
const sendResetCodeBtn = document.getElementById('sendResetCodeBtn');

if (sendResetCodeBtn) {
    sendResetCodeBtn.addEventListener('click', async () => {
        const email = document.getElementById('resetEmail').value;
        if (!email) {
            showMessage('resetMessage', '请输入邮箱。', true);
            return;
        }

        sendResetCodeBtn.disabled = true;
        sendResetCodeBtn.textContent = '发送中...';
        showMessage('resetMessage', '正在发送验证码，请稍候...');

        try {
            const response = await fetch(`${API_BASE_URL}/send-verification-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, purpose: 'password_reset' })
            });
            const data = await response.json();
            if (response.ok) {
                showMessage('resetMessage', data.message);
                let countdown = 60;
                const timer = setInterval(() => {
                    countdown--;
                    sendResetCodeBtn.textContent = `重新发送 (${countdown}s)`;
                    if (countdown <= 0) {
                        clearInterval(timer);
                        sendResetCodeBtn.textContent = '发送验证码';
                        sendResetCodeBtn.disabled = false;
                    }
                }, 1000);
            } else {
                showMessage('resetMessage', data.message, true);
                sendResetCodeBtn.disabled = false;
                sendResetCodeBtn.textContent = '发送验证码';
            }
        } catch (error) {
            console.error('发送重置密码验证码请求失败:', error);
            showMessage('resetMessage', '网络错误，请稍后再试。', true);
            sendResetCodeBtn.disabled = false;
            sendResetCodeBtn.textContent = '发送验证码';
        }
    });
}

if (resetPasswordForm) {
    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('resetEmail').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;
        const verificationCode = document.getElementById('resetCode').value;

        if (newPassword !== confirmNewPassword) {
            showMessage('resetMessage', '两次输入的新密码不一致。', true);
            return;
        }
        if (newPassword.length < 6) {
            showMessage('resetMessage', '新密码至少需要6位。', true);
            return;
        }

        showMessage('resetMessage', '正在重置密码，请稍候...');

        try {
            const response = await fetch(`${API_BASE_URL}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, newPassword, verificationCode })
            });
            const data = await response.json();
            if (response.ok) {
                showMessage('resetMessage', `${data.message} 即将跳转到登录页...`);
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);
            } else {
                showMessage('resetMessage', data.message, true);
            }
        } catch (error) {
            console.error('重置密码请求失败:', error);
            showMessage('resetMessage', '网络错误，重置密码失败。', true);
        }
    });
}
