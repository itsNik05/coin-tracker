// Firebase Configuration (Replace with your actual config)
const firebaseConfig = {
  apiKey: "AIzaSyAJCuq-CEftttLiirQijz27XCxsja3MqVg",
  authDomain: "coin-tracker-1ea73.firebaseapp.com",
  projectId: "coin-tracker-1ea73",
  storageBucket: "coin-tracker-1ea73.firebasestorage.app",
  messagingSenderId: "952209322496",
  appId: "1:952209322496:web:8f94a2cee2e4ab22e99ee5",
  measurementId: "G-FXP640JDTB"
};

// Initialize Firebase (uncomment when you have config)
// firebase.initializeApp(firebaseConfig);
// const auth = firebase.auth();
// const googleProvider = new firebase.auth.GoogleAuthProvider();
// const microsoftProvider = new firebase.auth.OAuthProvider('microsoft.com');

// App State
let currentUser = null;
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let currentTransactionType = 'income';

// DOM Elements
const menuBtn = document.getElementById('menuBtn');
const dropdownMenu = document.getElementById('dropdownMenu');
const authSection = document.getElementById('authSection');
const incomeTab = document.getElementById('incomeTab');
const expenseTab = document.getElementById('expenseTab');
const sourceInput = document.getElementById('source');
const amountInput = document.getElementById('amount');
const dateInput = document.getElementById('date');
const addBtn = document.getElementById('addBtn');
const transactionType = document.getElementById('transactionType');
const transactionsList = document.getElementById('transactionsList');
const weeklyBtn = document.getElementById('weeklyBtn');
const monthlyBtn = document.getElementById('monthlyBtn');
const loginModal = document.getElementById('loginModal');
const closeModal = document.getElementById('closeModal');
const googleLogin = document.getElementById('googleLogin');
const outlookLogin = document.getElementById('outlookLogin');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const totalIncome = document.getElementById('totalIncome');
const totalExpense = document.getElementById('totalExpense');
const totalBalance = document.getElementById('totalBalance');

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    
    // Load transactions
    renderTransactions();
    updateSummary();
    updateAuthUI();
    
    // Event Listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Menu toggle
    menuBtn.addEventListener('click', toggleDropdown);
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.nav-menu')) {
            dropdownMenu.classList.remove('show');
        }
    });

    // Tab switching
    incomeTab.addEventListener('click', () => switchTab('income'));
    expenseTab.addEventListener('click', () => switchTab('expense'));

    // Add transaction
    addBtn.addEventListener('click', addTransaction);

    // Download buttons
    weeklyBtn.addEventListener('click', () => downloadPDF('weekly'));
    monthlyBtn.addEventListener('click', () => downloadPDF('monthly'));

    // Modal
    closeModal.addEventListener('click', hideModal);
    loginModal.addEventListener('click', function(e) {
        if (e.target === loginModal) hideModal();
    });

    // Auth buttons (mock for now)
    googleLogin.addEventListener('click', mockGoogleLogin);
    outlookLogin.addEventListener('click', mockOutlookLogin);

    // Form validation
    [sourceInput, amountInput, dateInput].forEach(input => {
        input.addEventListener('input', validateForm);
    });
}

function toggleDropdown() {
    dropdownMenu.classList.toggle('show');
}

function switchTab(type) {
    currentTransactionType = type;
    
    // Update tab appearance
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-type="${type}"]`).classList.add('active');
    
    // Update button text
    transactionType.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    
    // Update form styling
    updateFormStyling();
}

function updateFormStyling() {
    const formContainer = document.querySelector('.form-container');
    const addBtnEl = document.getElementById('addBtn');
    
    if (currentTransactionType === 'income') {
        addBtnEl.style.background = 'var(--success-color)';
    } else {
        addBtnEl.style.background = 'var(--danger-color)';
    }
}

function validateForm() {
    const isValid = sourceInput.value.trim() && 
                   amountInput.value && 
                   parseFloat(amountInput.value) > 0 && 
                   dateInput.value;
    
    addBtn.disabled = !isValid;
    addBtn.style.opacity = isValid ? '1' : '0.6';
}

function addTransaction() {
    const source = sourceInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const date = dateInput.value;
    
    if (!source || !amount || !date) {
        showToast('Please fill all fields');
        return;
    }
    
    const transaction = {
        id: Date.now().toString(),
        type: currentTransactionType,
        source,
        amount,
        date,
        timestamp: new Date().toISOString()
    };
    
    transactions.unshift(transaction);
    localStorage.setItem('transactions', JSON.stringify(transactions));
    
    // Clear form
    sourceInput.value = '';
    amountInput.value = '';
    dateInput.value = new Date().toISOString().split('T')[0];
    
    // Update UI
    renderTransactions();
    updateSummary();
    
    showToast(`${currentTransactionType.charAt(0).toUpperCase() + currentTransactionType.slice(1)} added successfully!`);
}

function renderTransactions() {
    const recentTransactions = transactions.slice(0, 5);
    
    if (recentTransactions.length === 0) {
        transactionsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>No transactions yet. Add your first transaction above!</p>
            </div>
        `;
        return;
    }
    
    transactionsList.innerHTML = recentTransactions.map(transaction => `
        <div class="transaction-item">
            <div class="transaction-info">
                <h4>${transaction.source}</h4>
                <p>${formatDate(transaction.date)}</p>
            </div>
            <div class="transaction-amount ${transaction.type}">
                ${transaction.type === 'income' ? '+' : '-'}₹${transaction.amount.toFixed(2)}
            </div>
        </div>
    `).join('');
}

function updateSummary() {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = income - expense;
    
    totalIncome.textContent = `₹${income.toFixed(2)}`;
    totalExpense.textContent = `₹${expense.toFixed(2)}`;
    totalBalance.textContent = `₹${balance.toFixed(2)}`;
    
    // Update balance color
    totalBalance.style.color = balance >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
}

function downloadPDF(period) {
    if (!currentUser) {
        showModal();
        return;
    }
    
    // Filter transactions based on period
    const now = new Date();
    let filteredTransactions = transactions;
    
    if (period === 'weekly') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredTransactions = transactions.filter(t => new Date(t.date) >= weekAgo);
    } else if (period === 'monthly') {
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        filteredTransactions = transactions.filter(t => new Date(t.date) >= monthAgo);
    }
    
    generatePDF(filteredTransactions, period);
}

function generatePDF(transactions, period) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text('Coin Tracker', 20, 25);
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(`${period.charAt(0).toUpperCase() + period.slice(1)} Statement`, 20, 35);
    
    // User info
    doc.setFontSize(12);
    doc.text(`Generated for: ${currentUser.name}`, 20, 45);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 52);
    
    // Summary
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    doc.setFontSize(14);
    doc.text('Summary:', 20, 70);
    doc.setFontSize(12);
    doc.setTextColor(16, 185, 129);
    doc.text(`Total Income: ₹${income.toFixed(2)}`, 20, 80);
    doc.setTextColor(239, 68, 68);
    doc.text(`Total Expense: ₹${expense.toFixed(2)}`, 20, 88);
    doc.setTextColor(0, 0, 0);
    doc.text(`Balance: ₹${(income - expense).toFixed(2)}`, 20, 96);
    
    // Transactions
    doc.setFontSize(14);
    doc.text('Transactions:', 20, 115);
    
    let yPosition = 125;
    doc.setFontSize(10);
    
    if (transactions.length === 0) {
        doc.text('No transactions found for this period.', 20, yPosition);
    } else {
        transactions.forEach((transaction, index) => {
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 20;
            }
            
            const sign = transaction.type === 'income' ? '+' : '-';
            const text = `${formatDate(transaction.date)} | ${transaction.source} | ${sign}₹${transaction.amount.toFixed(2)}`;
            doc.text(text, 20, yPosition);
            yPosition += 8;
        });
    }
    
    // Save PDF
    doc.save(`coin-tracker-${period}-statement.pdf`);
    showToast('PDF downloaded successfully!');
}

function showModal() {
    loginModal.classList.add('show');
}

function hideModal() {
    loginModal.classList.remove('show');
}

// Mock authentication functions (replace with real Firebase auth)
function mockGoogleLogin() {
    currentUser = {
        name: 'John Doe',
        email: 'john.doe@gmail.com',
        provider: 'google'
    };
    updateAuthUI();
    hideModal();
    showToast('Signed in with Google successfully!');
}

function mockOutlookLogin() {
    currentUser = {
        name: 'Jane Smith',
        email: 'jane.smith@outlook.com',
        provider: 'microsoft'
    };
    updateAuthUI();
    hideModal();
    showToast('Signed in with Outlook successfully!');
}

function logout() {
    currentUser = null;
    updateAuthUI();
    showToast('Signed out successfully!');
}

function updateAuthUI() {
    if (currentUser) {
        authSection.innerHTML = `
            <div class="user-info">
                <h4>${currentUser.name}</h4>
                <p>${currentUser.email}</p>
                <button class="auth-btn" onclick="logout()" style="background: var(--danger-color); margin-top: 1rem;">
                    <i class="fas fa-sign-out-alt"></i>
                    Sign Out
                </button>
            </div>
        `;
    } else {
        authSection.innerHTML = `
            <button class="auth-btn google-btn" onclick="mockGoogleLogin()">
                <i class="fab fa-google"></i>
                Sign in with Google
            </button>
            <button class="auth-btn outlook-btn" onclick="mockOutlookLogin()">
                <i class="fab fa-microsoft"></i>
                Sign in with Outlook
            </button>
        `;
    }
}

function showToast(message) {
    toastMessage.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// Initialize form validation
validateForm();
