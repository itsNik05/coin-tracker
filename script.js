// Firebase config
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAJCuq-CEftttLiirQijz27XCxsja3MqVg",
  authDomain: "coin-tracker-1ea73.firebaseapp.com",
  projectId: "coin-tracker-1ea73",
  storageBucket: "coin-tracker-1ea73.firebasestorage.app",
  messagingSenderId: "952209322496",
  appId: "1:952209322496:web:8f94a2cee2e4ab22e99ee5",
  measurementId: "G-FXP640JDTB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// App-level state
let currentUser = null;
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let currentTransactionType = 'income';

document.addEventListener('DOMContentLoaded', function() {
    // Firebase objects
    const auth = firebase.auth();
    const googleProvider = new firebase.auth.GoogleAuthProvider();

    // --- DOM elements ---
    const menuBtn = document.getElementById('menuBtn');
    const dropdownMenu = document.getElementById('dropdownMenu');
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
    const totalIncome = document.getElementById('totalIncome');
    const totalExpense = document.getElementById('totalExpense');
    const totalBalance = document.getElementById('totalBalance');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    // --- Menu ---
    menuBtn.addEventListener('click', function(event) {
        dropdownMenu.classList.toggle('show');
        event.stopPropagation();
        updateAuthUI(); // in case auth changed since last open
    });
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.nav-menu')) {
            dropdownMenu.classList.remove('show');
        }
    });

    // --- Tabs ---
    incomeTab.addEventListener('click', () => switchTab('income'));
    expenseTab.addEventListener('click', () => switchTab('expense'));

    // --- Add Transaction ---
    addBtn.addEventListener('click', addTransaction);

    // --- Download PDF ---
    weeklyBtn.addEventListener('click', () => downloadPDF('weekly'));
    monthlyBtn.addEventListener('click', () => downloadPDF('monthly'));

    // --- Modal ---
    closeModal.addEventListener('click', hideModal);
    loginModal.addEventListener('click', function(e) {
        if (e.target === loginModal) hideModal();
    });

    [sourceInput, amountInput, dateInput].forEach(input => {
        input.addEventListener('input', validateForm);
    });

    // --- Set today's date by default ---
    dateInput.value = (new Date()).toISOString().split('T')[0];

    // --- Auth watcher ---
    auth.onAuthStateChanged(function(user) {
        if (user) {
            currentUser = {
                name: user.displayName ? user.displayName : user.email.split('@')[0],
                email: user.email,
                provider: user.providerData[0].providerId
            };
        } else {
            currentUser = null;
        }
        updateAuthUI();
    });

    // --- Initial UI ---
    renderTransactions();
    updateSummary();
    updateAuthUI();
    validateForm();

    // --- App Functions ---

    function switchTab(type) {
        currentTransactionType = type;
        [incomeTab, expenseTab].forEach(btn => btn.classList.remove('active'));
        if (type === 'income') incomeTab.classList.add('active');
        else expenseTab.classList.add('active');
        transactionType.textContent = type.charAt(0).toUpperCase() + type.slice(1);
        addBtn.style.background = (type === "income") ?
            'var(--success-color)' : 'var(--danger-color)';
    }

    function validateForm() {
        const isValid = sourceInput.value.trim() && amountInput.value && parseFloat(amountInput.value) > 0 && dateInput.value;
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
        sourceInput.value = '';
        amountInput.value = '';
        dateInput.value = (new Date()).toISOString().split('T')[0];
        renderTransactions();
        updateSummary();
        showToast(`${currentTransactionType.charAt(0).toUpperCase() + currentTransactionType.slice(1)} added!`);
        validateForm();
    }

    function renderTransactions() {
        if (transactions.length === 0) {
            transactionsList.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><p>No transactions yet. Add your first transaction above!</p></div>`;
            return;
        }
        transactionsList.innerHTML = transactions.slice(0, 5).map(transaction => `
            <div class="transaction-item">
                <div class="transaction-info"><h4>${transaction.source}</h4><p>${formatDate(transaction.date)}</p></div>
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'income' ? '+' : '-'}₹${transaction.amount.toFixed(2)}
                </div>
            </div>
        `).join('');
    }

    function updateSummary() {
        const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const balance = income - expense;
        totalIncome.textContent = `₹${income.toFixed(2)}`;
        totalExpense.textContent = `₹${expense.toFixed(2)}`;
        totalBalance.textContent = `₹${balance.toFixed(2)}`;
        totalBalance.style.color = balance >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
    }

    function showModal() {
        loginModal.classList.add('show');
        updateAuthUI(); // always refresh modal content when shown
    }
    function hideModal() { loginModal.classList.remove('show'); }

    function downloadPDF(period) {
        if (!currentUser) {
            showModal();
            return;
        }
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
        doc.setFontSize(20); doc.setTextColor(37, 99, 235); doc.text('Coin Tracker', 20, 25);
        doc.setFontSize(16); doc.setTextColor(0, 0, 0); doc.text(`${period.charAt(0).toUpperCase() + period.slice(1)} Statement`, 20, 35);
        doc.setFontSize(12);
        doc.text(`Generated for: ${currentUser.name}`, 20, 45); doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 52);

        // Summary
        const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        doc.setFontSize(14); doc.text('Summary:', 20, 70);
        doc.setFontSize(12); doc.setTextColor(16, 185, 129); doc.text(`Total Income: ₹${income.toFixed(2)}`, 20, 80);
        doc.setTextColor(239, 68, 68); doc.text(`Total Expense: ₹${expense.toFixed(2)}`, 20, 88);
        doc.setTextColor(0, 0, 0); doc.text(`Balance: ₹${(income - expense).toFixed(2)}`, 20, 96);
        // Transactions
        doc.setFontSize(14); doc.text('Transactions:', 20, 115);
        let yPosition = 125; doc.setFontSize(10);
        if (transactions.length === 0) {
            doc.text('No transactions found for this period.', 20, yPosition);
        } else {
            transactions.forEach((transaction) => {
                if (yPosition > 270) { doc.addPage(); yPosition = 20; }
                const sign = transaction.type === 'income' ? '+' : '-';
                const text = `${formatDate(transaction.date)} | ${transaction.source} | ${sign}₹${transaction.amount.toFixed(2)}`;
                doc.text(text, 20, yPosition);
                yPosition += 8;
            });
        }
        doc.save(`coin-tracker-${period}-statement.pdf`);
        showToast('PDF downloaded successfully!');
    }

    function showToast(message) {
        toastMessage.textContent = message;
        toast.classList.add('show');
        setTimeout(() => { toast.classList.remove('show'); }, 3000);
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    // ---- Auth Functions (Google, Email/Password) ----

    function googleLoginFunc() {
        auth.signInWithPopup(googleProvider)
        .then((result) => {
            currentUser = {
                name: result.user.displayName || result.user.email.split('@')[0],
                email: result.user.email,
                provider: "google"
            };
            updateAuthUI();
            hideModal();
            showToast('Signed in with Google!');
        })
        .catch((error) => {
            showToast(error.message);
        });
    }

    function emailRegisterFunc(email, password) {
        if(!email || !password) {
            showToast("Email and password required.");
            return;
        }
        auth.createUserWithEmailAndPassword(email, password)
        .then((result) => {
            currentUser = {
                name: result.user.email.split('@')[0],
                email: result.user.email,
                provider: 'password'
            };
            updateAuthUI();
            hideModal();
            showToast('Registered and logged in!');
        })
        .catch((error) => {
            showToast(error.message);
        });
    }

    function emailLoginFunc(email, password) {
        if (!email || !password) {
            showToast("Email and password required.");
            return;
        }
        auth.signInWithEmailAndPassword(email, password)
        .then((result) => {
            currentUser = {
                name: result.user.email.split('@')[0],
                email: result.user.email,
                provider: 'password'
            };
            updateAuthUI();
            hideModal();
            showToast('Logged in!');
        })
        .catch((error) => {
            showToast(error.message);
        });
    }

    window.logout = function logout() {
        auth.signOut().then(() => {
            currentUser = null;
            updateAuthUI();
            showToast('Signed out!');
        });
    };

    // --- AUTH UI for Modal and Side menu ---
    function updateAuthUI() {
        const dropdownAuth = document.getElementById('dropdownAuthSection');
        const modalAuth = document.getElementById('modalAuthSection');
        const authHTML = currentUser ? `
            <div class="user-info">
                <h4>${currentUser.name}</h4>
                <p>${currentUser.email}</p>
                <button class="auth-btn" onclick="logout()" style="background: var(--danger-color); margin-top: 1rem;">
                    <i class="fas fa-sign-out-alt"></i>
                    Sign Out
                </button>
            </div>
        ` : `
            <button class="auth-btn google-btn" id="googleLoginInside">
                <i class="fab fa-google"></i>
                Sign in with Google
            </button>
            <input type="email" id="emailInput" class="auth-field" placeholder="Email" autocomplete="email" required>
            <input type="password" id="passwordInput" class="auth-field" placeholder="Password" autocomplete="current-password" required>
            <button class="auth-btn email-btn" id="emailRegisterInside">
                Register
            </button>
            <button class="auth-btn email-btn" id="emailLoginInside">
                Login
            </button>
        `;
        if (dropdownAuth) dropdownAuth.innerHTML = authHTML;
        if (modalAuth) modalAuth.innerHTML = authHTML;

        // Add event listeners for the dynamically created fields/buttons in both locations
        ['','Inside'].forEach(suffix => {
            const glb = document.getElementById('googleLogin' + suffix);
            const regb = document.getElementById('emailRegister' + suffix);
            const loginb = document.getElementById('emailLogin' + suffix);
            if (glb) glb.onclick = googleLoginFunc;
            if (regb) regb.onclick = function() {
                const emailVal = document.getElementById('emailInput').value.trim();
                const passVal = document.getElementById('passwordInput').value;
                emailRegisterFunc(emailVal, passVal);
            };
            if (loginb) loginb.onclick = function() {
                const emailVal = document.getElementById('emailInput').value.trim();
                const passVal = document.getElementById('passwordInput').value;
                emailLoginFunc(emailVal, passVal);
            };
        });
    }
});
