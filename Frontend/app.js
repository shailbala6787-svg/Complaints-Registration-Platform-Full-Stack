const PRODUCTION_BACKEND_URL = 'https://complaints-registration-backend.onrender.com'; 

const BACKEND_BASE_URL = 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' || 
    window.location.hostname === '[::1]' ||
    window.location.protocol === 'file:'
        ? 'http://localhost:3000'
        : PRODUCTION_BACKEND_URL;

console.log(`[App] Using Backend URL: ${BACKEND_BASE_URL}`);

const API_BASE = `${BACKEND_BASE_URL}/api`;
const app = {
    user: null,
    token: localStorage.getItem('token'),
    currentPage: 'login',
    
    init() {
        this.cacheDOM();
        this.bindEvents();
        this.checkSession();
    },

    async apiFetch(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
            credentials: 'include'
        });
    },

    cacheDOM() {
        this.pageContainer = document.getElementById('page-container');
        this.navbar = document.getElementById('navbar');
        this.logoutBtn = document.getElementById('logout-btn');
        this.spinner = document.getElementById('loading-spinner');
        this.navMyComplaints = document.getElementById('nav-my-complaints');
        this.navAdminDashboard = document.getElementById('nav-admin-dashboard');
    },

    bindEvents() {
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
        this.navMyComplaints.addEventListener('click', () => this.navigate('my-complaints'));
        this.navAdminDashboard.addEventListener('click', () => this.navigate('admin-dashboard'));
        
        // Handle browser back/forward (simplified for this SPA)
        window.onpopstate = (event) => {
            if (event.state && event.state.page) {
                this.renderPage(event.state.page, false);
            }
        };
    },

    async checkSession() {
        this.showLoading(true);
        try {
            const res = await this.apiFetch('/auth/me');
            if (res.ok) {
                this.user = await res.json();
                this.updateUIForAuth();
                const defaultPage = this.user.role === 'admin' ? 'admin-dashboard' : 'my-complaints';
                this.navigate(defaultPage);
            } else {
                this.navigate('login');
            }
        } catch (err) {
            console.error('Session check failed', err);
            this.navigate('login');
        } finally {
            this.showLoading(false);
        }
    },

    navigate(page, data = null) {
        this.currentPage = page;
        this.renderPage(page, true, data);
    },

    updateUIForAuth() {
        if (this.user) {
            this.navbar.classList.remove('hidden');
            if (this.user.role === 'admin') {
                this.navAdminDashboard.classList.remove('hidden');
                this.navMyComplaints.classList.add('hidden');
            } else {
                this.navMyComplaints.classList.remove('hidden');
                this.navAdminDashboard.classList.add('hidden');
            }
        } else {
            this.navbar.classList.add('hidden');
        }
    },

    showLoading(show) {
        if (show) this.spinner.classList.remove('hidden');
        else this.spinner.classList.add('hidden');
    },

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    renderPage(page, pushState = true, data = null) {
        if (pushState) {
            window.history.pushState({ page }, '', `#${page}`);
        }

        switch (page) {
            case 'login':
                this.renderLogin();
                break;
            case 'register':
                this.renderRegister();
                break;
            case 'otp-verify':
                this.renderOTPVerify(data);
                break;
            case 'password-setup':
                this.renderPasswordSetup(data);
                break;
            case 'submit-complaint':
                this.renderSubmitComplaint();
                break;
            case 'my-complaints':
                this.renderMyComplaints();
                break;
            case 'admin-dashboard':
                this.renderAdminDashboard();
                break;
        }
    },

    // --- Page Renderers ---

    renderLogin() {
        this.pageContainer.innerHTML = `
            <div class="card">
                <h2>Welcome Back</h2>
                <form id="login-form">
                    <div class="form-group">
                        <label>Email Address</label>
                        <input type="email" id="email" required placeholder="name@company.com">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="password" required placeholder="••••••••">
                    </div>
                    <div id="login-error" class="error-msg"></div>
                    <button type="submit" class="btn-primary">Sign In</button>
                    <p class="text-center mt-2">
                        Don't have an account? <span class="link" id="go-register">Register</span>
                    </p>
                </form>
            </div>
        `;

        document.getElementById('go-register').onclick = () => this.navigate('register');
        document.getElementById('login-form').onsubmit = async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('login-error');

            this.showLoading(true);
            try {
                const res = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                    credentials: 'include'
                });
                const result = await res.json();
                if (res.ok) {
                    this.user = result;
                    this.token = result.token;
                    localStorage.setItem('token', this.token);
                    this.updateUIForAuth();
                    this.navigate(this.user.role === 'admin' ? 'admin-dashboard' : 'my-complaints');
                    this.showToast('Logged in successfully');
                } else {
                    errorDiv.textContent = result.error;
                    errorDiv.style.display = 'block';
                }
            } catch (err) {
                console.error('Login error:', err);
                const isNetworkError = err instanceof TypeError && err.message.includes('fetch');
                errorDiv.textContent = isNetworkError 
                    ? `Cannot reach server at ${BACKEND_BASE_URL}. Please ensure the backend is running.`
                    : 'An unexpected error occurred during login.';
                errorDiv.style.display = 'block';
            } finally {
                this.showLoading(false);
            }
        };
    },

    renderRegister() {
        this.pageContainer.innerHTML = `
            <div class="card">
                <h2>Create Account</h2>
                <form id="register-form">
                    <div class="form-group">
                        <label>Full Name</label>
                        <input type="text" id="name" required placeholder="John Doe">
                    </div>
                    <div class="form-group">
                        <label>Email Address</label>
                        <input type="email" id="email" required placeholder="name@company.com">
                    </div>
                    <div id="reg-error" class="error-msg"></div>
                    <button type="submit" class="btn-primary">Send OTP</button>
                    <p class="text-center mt-2">
                        Already have an account? <span class="link" id="go-login">Login</span>
                    </p>
                </form>
            </div>
        `;

        document.getElementById('go-login').onclick = () => this.navigate('login');
        document.getElementById('register-form').onsubmit = async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const errorDiv = document.getElementById('reg-error');

            this.showLoading(true);
            try {
                const res = await this.apiFetch('/auth/send-otp', {
                    method: 'POST',
                    body: JSON.stringify({ name, email })
                });
                const result = await res.json();
                if (res.ok) {
                    this.navigate('otp-verify', { email });
                    this.showToast('OTP sent to your email');
                } else {
                    errorDiv.textContent = result.error;
                    errorDiv.style.display = 'block';
                }
            } catch (err) {
                console.error('Registration error:', err);
                errorDiv.textContent = 'Server connection failed';
                errorDiv.style.display = 'block';
            } finally {
                this.showLoading(false);
            }
        };
    },

    renderOTPVerify(data) {
        this.pageContainer.innerHTML = `
            <div class="card">
                <h2>Verify OTP</h2>
                <p class="text-center text-muted" style="margin-bottom: 1.5rem">We've sent a code to ${data.email}</p>
                <form id="otp-form">
                    <div class="form-group">
                        <label>6-Digit Code</label>
                        <input type="text" id="otp" required maxlength="6" style="text-align: center; font-size: 1.5rem; letter-spacing: 0.5rem">
                    </div>
                    <div id="otp-error" class="error-msg"></div>
                    <button type="submit" class="btn-primary">Verify Code</button>
                    <p class="text-center mt-2">
                        Didn't get code? <span class="link" onclick="app.navigate('register')">Start Over</span>
                    </p>
                </form>
            </div>
        `;

        document.getElementById('otp-form').onsubmit = (e) => {
            e.preventDefault();
            const otp = document.getElementById('otp').value;
            this.navigate('password-setup', { email: data.email, otp });
        };
    },

    renderPasswordSetup(data) {
        this.pageContainer.innerHTML = `
            <div class="card">
                <h2>Set Password</h2>
                <form id="password-form">
                    <div class="form-group">
                        <label>New Password</label>
                        <input type="password" id="password" required placeholder="••••••••">
                    </div>
                    <div class="form-group">
                        <label>Confirm Password</label>
                        <input type="password" id="confirm-password" required placeholder="••••••••">
                    </div>
                    <div id="pw-error" class="error-msg"></div>
                    <button type="submit" class="btn-primary">Complete Registration</button>
                </form>
            </div>
        `;

        document.getElementById('password-form').onsubmit = async (e) => {
            e.preventDefault();
            const password = document.getElementById('password').value;
            const confirm = document.getElementById('confirm-password').value;
            const errorDiv = document.getElementById('pw-error');

            if (password !== confirm) {
                errorDiv.textContent = 'Passwords do not match';
                errorDiv.style.display = 'block';
                return;
            }

            this.showLoading(true);
            try {
                const res = await this.apiFetch('/auth/register', {
                    method: 'POST',
                    body: JSON.stringify({ email: data.email, otp: data.otp, password })
                });
                const result = await res.json();
                if (res.ok) {
                    this.navigate('login');
                    this.showToast('Registration complete! Please login.');
                } else {
                    errorDiv.textContent = result.error;
                    errorDiv.style.display = 'block';
                }
            } catch (err) {
                errorDiv.textContent = 'Server connection failed';
                errorDiv.style.display = 'block';
            } finally {
                this.showLoading(false);
            }
        };
    },

    async renderMyComplaints() {
        this.pageContainer.innerHTML = `
            <div class="header-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem">
                <h2 style="margin: 0">My Complaints</h2>
                <button class="btn-primary" style="width: auto; margin: 0" id="submit-new">Submit New Complaint</button>
            </div>
            <div id="complaints-list" class="complaints-list">
                <div class="text-center">Loading your complaints...</div>
            </div>
        `;

        document.getElementById('submit-new').onclick = () => this.navigate('submit-complaint');

        try {
            const res = await this.apiFetch('/complaints/my');
            if (res.ok) {
                const list = await res.json();
                const container = document.getElementById('complaints-list');
                if (list.length === 0) {
                    container.innerHTML = '<div class="card text-center">No complaints yet.</div>';
                } else {
                    container.innerHTML = list.map(c => `
                        <div class="complaint-card">
                            <div class="complaint-header">
                                <div class="user-info">
                                    <h4>Complaint #${c.id}</h4>
                                </div>
                                <div class="date">${new Date(c.createdAt).toLocaleDateString()}</div>
                            </div>
                            <div class="complaint-body">
                                <div>
                                    <div class="section-label">Original Complaint</div>
                                    <div class="text-content">${c.complaintText}</div>
                                </div>
                                <div class="ai-section">
                                    <div class="section-label">AI Follow-up</div>
                                    <div class="text-content" style="font-style: italic; color: var(--primary)">"${c.aiQuestion}"</div>
                                    <div class="section-label" style="margin-top: 0.8rem">Your Answer</div>
                                    <div class="text-content">${c.userAnswer}</div>
                                </div>
                            </div>
                        </div>
                    `).join('');
                }
            }
        } catch (err) {
            console.error(err);
        }
    },

    renderSubmitComplaint() {
        this.pageContainer.innerHTML = `
            <div class="card">
                <h2>Submit Complaint</h2>
                <div id="step-1">
                    <div class="form-group">
                        <label>What happened?</label>
                        <textarea id="complaint-text" rows="5" placeholder="Describe your issue in detail..."></textarea>
                    </div>
                    <button id="get-question" class="btn-primary">Continue</button>
                </div>
                
                <div id="step-2" class="hidden" style="margin-top: 2rem; border-top: 1px solid var(--glass-border); padding-top: 2rem">
                    <div class="ai-section" style="margin-bottom: 1.5rem">
                        <div class="section-label">AI Follow-up Question</div>
                        <p id="ai-question-text" style="font-weight: 500"></p>
                    </div>
                    <div class="form-group">
                        <label>Your Answer</label>
                        <textarea id="ai-answer" rows="3" placeholder="Provide more details..."></textarea>
                    </div>
                    <button id="final-submit" class="btn-primary">Submit Final Complaint</button>
                </div>
            </div>
        `;

        let aiQuestion = '';

        document.getElementById('get-question').onclick = async () => {
            const text = document.getElementById('complaint-text').value;
            if (!text) return;

            this.showLoading(true);
            try {
                const res = await this.apiFetch('/ai/question', {
                    method: 'POST',
                    body: JSON.stringify({ complaint_text: text })
                });
                const result = await res.json();
                if (res.ok) {
                    aiQuestion = result.question;
                    document.getElementById('ai-question-text').textContent = aiQuestion;
                    document.getElementById('step-2').classList.remove('hidden');
                    document.getElementById('get-question').classList.add('hidden');
                    document.getElementById('complaint-text').disabled = true;
                }
            } catch (err) {
                this.showToast('AI service temporarily unavailable', 'error');
            } finally {
                this.showLoading(false);
            }
        };

        document.getElementById('final-submit').onclick = async () => {
            const text = document.getElementById('complaint-text').value;
            const answer = document.getElementById('ai-answer').value;

            if (!answer) return;

            this.showLoading(true);
            try {
                const res = await this.apiFetch('/complaints', {
                    method: 'POST',
                    body: JSON.stringify({
                        complaint_text: text,
                        ai_question: aiQuestion,
                        ai_answer: answer
                    })
                });
                if (res.ok) {
                    this.showToast('Complaint submitted successfully');
                    this.navigate('my-complaints');
                }
            } catch (err) {
                this.showToast('Failed to submit complaint', 'error');
            } finally {
                this.showLoading(false);
            }
        };
    },

    async renderAdminDashboard() {
        this.pageContainer.innerHTML = `
            <div class="header-row" style="margin-bottom: 2rem">
                <h2 style="text-align: left">Admin Dashboard</h2>
                <p class="text-muted">Reviewing all user complaints</p>
            </div>
            <div id="admin-complaints-list" class="complaints-list">
                <div class="text-center">Loading all complaints...</div>
            </div>
        `;

        try {
            const res = await this.apiFetch('/admin/complaints');
            if (res.ok) {
                const list = await res.json();
                const container = document.getElementById('admin-complaints-list');
                if (list.length === 0) {
                    container.innerHTML = '<div class="card text-center">No complaints found.</div>';
                } else {
                    container.innerHTML = list.map(c => `
                        <div class="complaint-card">
                            <div class="complaint-header">
                                <div class="user-info">
                                    <h4>${c.userName}</h4>
                                    <p>${c.userEmail}</p>
                                </div>
                                <div class="date">${new Date(c.createdAt).toLocaleDateString()}</div>
                            </div>
                            <div class="complaint-body">
                                <div>
                                    <div class="section-label">Complaint</div>
                                    <div class="text-content">${c.complaintText}</div>
                                </div>
                                <div class="ai-section">
                                    <div class="section-label">AI Follow-up</div>
                                    <div class="text-content" style="color: var(--primary)">"${c.aiQuestion}"</div>
                                    <div class="section-label" style="margin-top: 0.8rem">User Answer</div>
                                    <div class="text-content">${c.userAnswer}</div>
                                </div>
                            </div>
                        </div>
                    `).join('');
                }
            }
        } catch (err) {
            console.error(err);
        }
    },

    async handleLogout() {
        try {
            await this.apiFetch('/auth/logout', { method: 'POST' });
            this.user = null;
            this.token = null;
            localStorage.removeItem('token');
            this.updateUIForAuth();
            this.navigate('login');
            this.showToast('Logged out');
        } catch (err) {
            console.error('Logout failed', err);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
