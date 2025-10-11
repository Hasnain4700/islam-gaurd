// Wait for Firebase to load
function waitForFirebase() {
    if (typeof firebase !== 'undefined') {
        initializeApp();
    } else {
        setTimeout(waitForFirebase, 100);
    }
}

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCKrt1CNzWx60AzaJ-_hOc7LYhKOdPq-Vo",
    authDomain: "protectislam-424a4.firebaseapp.com",
    databaseURL: "https://protectislam-424a4-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "protectislam-424a4",
    storageBucket: "protectislam-424a4.firebasestorage.app",
    messagingSenderId: "968714563101",
    appId: "1:968714563101:web:1e01ec3c3cb607429a20f4",
    measurementId: "G-VG1Z1TRH7P"
};

// Initialize Firebase
let app, database, auth, googleProvider;

function initializeFirebase() {
    app = firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    auth = firebase.auth();
    googleProvider = new firebase.auth.GoogleAuthProvider();
}

// Global variables
let currentFilter = 'all';
let currentReportId = null;
let reportsData = {};
let currentUser = null;
let userReports = {};

// DOM elements
let navButtons, sections, filterButtons, reportsGrid, loadingSpinner, reportForm, reportModal, closeModalBtn, toastContainer;
let loginBtn, logoutBtn;
let profileAvatar, profileName, profileEmail, totalReports, pendingReports, resolvedReports, totalLikes, userReportsGrid;
let bottomNavButtons, bottomProfileNav, bottomNav, mainContent;

// Initialize app when DOM is loaded
function initializeApp() {
    // Initialize Firebase first
    initializeFirebase();
    
    // Get DOM elements
    navButtons = document.querySelectorAll('.nav-btn');
    sections = document.querySelectorAll('.section');
    filterButtons = document.querySelectorAll('.filter-btn');
    reportsGrid = document.getElementById('reports-grid');
    loadingSpinner = document.getElementById('loading-spinner');
    reportForm = document.getElementById('report-form');
    reportModal = document.getElementById('report-modal');
    closeModalBtn = document.getElementById('close-modal');
    toastContainer = document.getElementById('toast-container');

    // Auth elements
    loginBtn = document.getElementById('login-btn');
    logoutBtn = document.getElementById('logout-btn');

    // Profile elements
    profileAvatar = document.getElementById('profile-avatar');
    profileName = document.getElementById('profile-name');
    profileEmail = document.getElementById('profile-email');
    totalReports = document.getElementById('total-reports');
    pendingReports = document.getElementById('pending-reports');
    resolvedReports = document.getElementById('resolved-reports');
    totalLikes = document.getElementById('total-likes');
    userReportsGrid = document.getElementById('user-reports-grid');

    // Bottom navigation elements
    bottomNavButtons = document.querySelectorAll('.bottom-nav-btn');
    bottomProfileNav = document.getElementById('bottom-profile-nav');
    bottomNav = document.querySelector('.bottom-nav');
    mainContent = document.querySelector('.main-content');
    
    // Set initial active section
    showSection('home');
    
    // Hide bottom navigation by default
    if (bottomNav) {
        bottomNav.classList.remove('show');
    }
    if (mainContent) {
        mainContent.classList.remove('with-bottom-nav');
    }
    
    // Add smooth scrolling
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Initialize animations
    initializeAnimations();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize auth
    initializeAuth();
    
    // Load reports
    loadReports();
    
    // Load home statistics
    loadHomeStats();
}

// Setup event listeners
function setupEventListeners() {
    // Navigation buttons (header)
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            showSection(section);
            
            // Load user reports when profile section is opened
            if (section === 'profile') {
                loadUserReports();
            }
        });
    });

    // Bottom navigation buttons
    bottomNavButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            showSection(section);
            
            // Load user reports when profile section is opened
            if (section === 'profile') {
                loadUserReports();
            }
        });
    });

    // Filter buttons
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.dataset.filter;
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            displayReports();
        });
    });

    // Report form
    reportForm.addEventListener('submit', handleReportSubmission);

    // Modal close
    closeModalBtn.addEventListener('click', closeModal);
    reportModal.addEventListener('click', (e) => {
        if (e.target === reportModal) {
            closeModal();
        }
    });

    // Auth buttons
    loginBtn.addEventListener('click', handleGoogleSignIn);
}

// Authentication functions
function initializeAuth() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            updateUIForLoggedInUser(user);
        } else {
            currentUser = null;
            updateUIForLoggedOutUser();
        }
    });
}

function updateUIForLoggedInUser(user) {
    // Show bottom navigation
    if (bottomNav) {
        bottomNav.classList.add('show');
    }
    if (mainContent) {
        mainContent.classList.add('with-bottom-nav');
    }
    
    // Show profile button in bottom nav
    bottomProfileNav.style.display = 'flex';
    
    // Update profile info
    profileAvatar.src = user.photoURL || 'https://via.placeholder.com/100';
    profileName.textContent = user.displayName || 'User';
    profileEmail.textContent = user.email || '';
    
    // Update home section login content
    updateHomeLoginContent(user);
}

function updateUIForLoggedOutUser() {
    // Hide profile button in bottom nav
    bottomProfileNav.style.display = 'none';
    
    // Hide bottom navigation
    if (bottomNav) {
        bottomNav.classList.remove('show');
    }
    if (mainContent) {
        mainContent.classList.remove('with-bottom-nav');
    }
    
    // Clear profile info
    profileAvatar.src = '';
    profileName.textContent = 'Loading...';
    profileEmail.textContent = 'Loading...';
    
    // Update home section login content
    updateHomeLoginContent(null);
    
    // Redirect to home/login section
    showSection('home');
}

async function handleGoogleSignIn() {
    try {
        const result = await auth.signInWithPopup(googleProvider);
        showToast('Successfully signed in!', 'success');
    } catch (error) {
        console.error('Error signing in:', error);
        showToast('Failed to sign in. Please try again.', 'error');
    }
}

async function handleSignOut() {
    try {
        await auth.signOut();
        showToast('Successfully signed out!', 'success');
    } catch (error) {
        console.error('Error signing out:', error);
        showToast('Failed to sign out. Please try again.', 'error');
    }
}

// Report submission
async function handleReportSubmission(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showToast('Please sign in to submit a report', 'error');
        return;
    }
    
    const formData = new FormData(reportForm);
    const reportData = {
        title: formData.get('title').trim(),
        category: formData.get('category'),
        url: formData.get('url').trim(),
        description: formData.get('description').trim(),
        reporterName: currentUser.displayName || 'Anonymous',
        reporterId: currentUser.uid,
        reporterEmail: currentUser.email,
        status: 'pending',
        likes: 0,
        comments: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // Validate required fields
    if (!reportData.title || !reportData.category || !reportData.description) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    // Validate URL if provided
    if (reportData.url && !isValidUrl(reportData.url)) {
        showToast('Please enter a valid URL', 'error');
        return;
    }

    const submitBtn = reportForm.querySelector('.submit-btn');
    const originalText = submitBtn.innerHTML;
    
    try {
        // Show loading state
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;

        // Push to Firebase
        const reportsRef = database.ref('reports');
        const newReportRef = reportsRef.push();
        await newReportRef.set(reportData);

        // Reset form
        reportForm.reset();
        showToast('Report submitted successfully!', 'success');
        
        // Switch to reports section
        showSection('reports');
        
    } catch (error) {
        console.error('Error submitting report:', error);
        showToast('Failed to submit report. Please try again.', 'error');
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Load reports from Firebase
function loadReports() {
    const reportsRef = database.ref('reports');
    
    reportsRef.on('value', (snapshot) => {
        const data = snapshot.val();
        reportsData = data || {};
        displayReports();
        loadHomeStats(); // Update home statistics
        hideLoadingSpinner();
    }, (error) => {
        console.error('Error loading reports:', error);
        showToast('Failed to load reports', 'error');
        hideLoadingSpinner();
    });
}

// Display reports in the grid
function displayReports() {
    if (!reportsData || Object.keys(reportsData).length === 0) {
        reportsGrid.innerHTML = `
            <div class="no-reports">
                <i class="fas fa-inbox"></i>
                <h3>No reports yet</h3>
                <p>Be the first to submit a report!</p>
            </div>
        `;
        return;
    }

    const reportsArray = Object.entries(reportsData)
        .map(([id, report]) => ({ id, ...report }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const filteredReports = filterReports(reportsArray);
    reportsGrid.innerHTML = filteredReports.map(report => createReportCard(report)).join('');

    // Add click listeners to report cards
    document.querySelectorAll('.report-card').forEach(card => {
        card.addEventListener('click', () => {
            const reportId = card.dataset.reportId;
            openReportModal(reportId);
        });
    });
}

// Filter reports based on current filter
function filterReports(reports) {
    if (currentFilter === 'all') {
        return reports;
    }
    return reports.filter(report => report.status === currentFilter);
}

// Create report card HTML
function createReportCard(report) {
    const commentsCount = Object.keys(report.comments || {}).length;
    const formattedDate = formatDate(report.createdAt);
    const isOwner = currentUser && report.reporterId === currentUser.uid;
    
    return `
        <div class="report-card" data-report-id="${report.id}">
            <div class="report-header">
                <h3 class="report-title">${escapeHtml(report.title)}</h3>
                ${isOwner ? '<span class="owner-badge">Your Report</span>' : ''}
            </div>
            <div class="report-meta">
                <span class="category-badge">${report.category.replace('-', ' ')}</span>
                <span class="status-badge status-${report.status}">${report.status}</span>
            </div>
            <div class="report-description">
                ${escapeHtml(report.description)}
            </div>
            <div class="report-footer">
                <span class="report-date">${formattedDate}</span>
                <div class="report-stats">
                    <div class="stat-item">
                        <i class="fas fa-heart"></i>
                        <span>${report.likes || 0}</span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-comment"></i>
                        <span>${commentsCount}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Open report modal
function openReportModal(reportId) {
    const report = reportsData[reportId];
    if (!report) return;

    currentReportId = reportId;
    
    // Populate modal content
    document.getElementById('modal-title').textContent = report.title;
    document.getElementById('modal-category').textContent = report.category.replace('-', ' ');
    document.getElementById('modal-status').textContent = report.status;
    document.getElementById('modal-status').className = `status-badge status-${report.status}`;
    document.getElementById('modal-date').textContent = formatDate(report.createdAt);
    document.getElementById('modal-description').textContent = report.description;
    
    // Handle URL
    const urlElement = document.getElementById('modal-url');
    const urlLink = document.getElementById('modal-url-link');
    if (report.url) {
        urlElement.style.display = 'block';
        urlLink.href = report.url;
    } else {
        urlElement.style.display = 'none';
    }
    
    // Setup interactions
    setupModalInteractions(reportId);
    
    // Show modal
    reportModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Setup modal interactions (like, comment, and status change)
function setupModalInteractions(reportId) {
    const report = reportsData[reportId];
    const isOwner = currentUser && report.reporterId === currentUser.uid;
    
    // Show/hide status change section based on ownership
    const statusChangeSection = document.getElementById('status-change-section');
    if (isOwner) {
        statusChangeSection.style.display = 'block';
        setupStatusChangeButtons(reportId);
    } else {
        statusChangeSection.style.display = 'none';
    }
    
    // Setup like button
    const likeBtn = document.getElementById('like-btn');
    const likeCount = document.getElementById('like-count');
    
    likeBtn.onclick = () => toggleLike(reportId);
    likeCount.textContent = report.likes || 0;
    
    // Setup comment form
    const commentForm = document.querySelector('.comment-form');
    const commentInput = document.getElementById('comment-input');
    const addCommentBtn = document.getElementById('add-comment-btn');
    
    addCommentBtn.onclick = () => addComment(reportId, commentInput.value.trim());
    commentInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
            addComment(reportId, commentInput.value.trim());
        }
    };
    
    // Display existing comments
    displayComments(reportId);
}

// Setup status change buttons
function setupStatusChangeButtons(reportId) {
    const statusButtons = document.querySelectorAll('.status-btn');
    const report = reportsData[reportId];
    
    // Set active button based on current status
    statusButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.status === report.status) {
            btn.classList.add('active');
        }
    });
    
    // Add click listeners
    statusButtons.forEach(btn => {
        btn.onclick = async (e) => {
            e.stopPropagation();
            const newStatus = btn.dataset.status;
            await updateReportStatus(reportId, newStatus);
        };
    });
}

// Update report status
async function updateReportStatus(reportId, newStatus) {
    try {
        const reportRef = database.ref(`reports/${reportId}`);
        await reportRef.update({
            status: newStatus,
            updatedAt: new Date().toISOString()
        });
        
        // Update UI
        document.getElementById('modal-status').textContent = newStatus;
        document.getElementById('modal-status').className = `status-badge status-${newStatus}`;
        
        // Update status buttons
        const statusButtons = document.querySelectorAll('.status-btn');
        statusButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.status === newStatus) {
                btn.classList.add('active');
            }
        });
        
        showToast(`Report marked as ${newStatus}!`, 'success');
        
    } catch (error) {
        console.error('Error updating status:', error);
        showToast('Failed to update status', 'error');
    }
}

// Toggle like on report
async function toggleLike(reportId) {
    if (!currentUser) {
        showToast('Please sign in to like reports', 'error');
        return;
    }
    
    try {
        const reportRef = database.ref(`reports/${reportId}`);
        const currentLikes = reportsData[reportId].likes || 0;
        const newLikes = currentLikes + 1;
        
        await reportRef.update({ likes: newLikes });
        document.getElementById('like-count').textContent = newLikes;
        showToast('Report liked!', 'success');
        
    } catch (error) {
        console.error('Error liking report:', error);
        showToast('Failed to like report', 'error');
    }
}

// Add comment to report
async function addComment(reportId, commentText) {
    if (!currentUser) {
        showToast('Please sign in to comment', 'error');
        return;
    }
    
    if (!commentText.trim()) {
        showToast('Please enter a comment', 'error');
        return;
    }
    
    try {
        const commentRef = database.ref(`reports/${reportId}/comments`).push();
        const commentData = {
            text: commentText,
            author: currentUser.displayName || 'Anonymous',
            authorId: currentUser.uid,
            createdAt: new Date().toISOString()
        };
        
        await commentRef.set(commentData);
        
        // Clear input
        document.getElementById('comment-input').value = '';
        showToast('Comment added!', 'success');
        
    } catch (error) {
        console.error('Error adding comment:', error);
        showToast('Failed to add comment', 'error');
    }
}

// Display comments for a report
function displayComments(reportId) {
    const commentsList = document.getElementById('comments-list');
    const report = reportsData[reportId];
    const comments = report.comments || {};
    
    if (Object.keys(comments).length === 0) {
        commentsList.innerHTML = '<p class="no-comments">No comments yet. Be the first to comment!</p>';
        return;
    }
    
    const commentsArray = Object.entries(comments)
        .map(([id, comment]) => ({ id, ...comment }))
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    commentsList.innerHTML = commentsArray.map(comment => `
        <div class="comment-item">
            <div class="comment-header">
                <strong>${escapeHtml(comment.author)}</strong>
                <span class="comment-date">${formatDate(comment.createdAt)}</span>
            </div>
            <div class="comment-text">${escapeHtml(comment.text)}</div>
        </div>
    `).join('');
}

// Close modal
function closeModal() {
    reportModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentReportId = null;
}

// Show section
function showSection(sectionName) {
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Update header nav buttons
    navButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Update bottom nav buttons
    bottomNavButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    const targetSection = document.getElementById(`${sectionName}-section`);
    const targetHeaderBtn = document.querySelector(`.nav-btn[data-section="${sectionName}"]`);
    const targetBottomBtn = document.querySelector(`.bottom-nav-btn[data-section="${sectionName}"]`);
    
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    if (targetHeaderBtn) {
        targetHeaderBtn.classList.add('active');
    }
    
    if (targetBottomBtn) {
        targetBottomBtn.classList.add('active');
    }
    
    // Handle bottom navigation visibility
    if (sectionName === 'home' && !currentUser) {
        // Hide bottom nav on home section when not logged in
        if (bottomNav) {
            bottomNav.classList.remove('show');
        }
        if (mainContent) {
            mainContent.classList.remove('with-bottom-nav');
        }
    } else if (currentUser) {
        // Show bottom nav when user is logged in
        if (bottomNav) {
            bottomNav.classList.add('show');
        }
        if (mainContent) {
            mainContent.classList.add('with-bottom-nav');
        }
    }
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return 'Just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString();
    }
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Validate URL
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toastContainer.removeChild(toast);
        }, 300);
    }, 3000);
}

// Hide loading spinner
function hideLoadingSpinner() {
    if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
    }
}

// Initialize animations
function initializeAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, observerOptions);
    
    document.addEventListener('DOMContentLoaded', () => {
        const reportCards = document.querySelectorAll('.report-card');
        reportCards.forEach(card => {
            observer.observe(card);
        });
    });
}

// Home section functions
function updateHomeLoginContent(user) {
    const loginContent = document.getElementById('login-content');
    const welcomeContent = document.getElementById('welcome-content');
    const welcomeAvatar = document.getElementById('welcome-avatar');
    const welcomeName = document.getElementById('welcome-name');
    const welcomeEmail = document.getElementById('welcome-email');
    
    if (user) {
        // User is logged in
        loginContent.style.display = 'none';
        welcomeContent.style.display = 'block';
        
        welcomeAvatar.src = user.photoURL || 'https://via.placeholder.com/50';
        welcomeName.textContent = `Welcome back, ${user.displayName || 'User'}!`;
        welcomeEmail.textContent = user.email || '';
    } else {
        // User is not logged in
        loginContent.style.display = 'block';
        welcomeContent.style.display = 'none';
    }
}

function loadHomeStats() {
    // Update statistics from reports data
    if (reportsData && Object.keys(reportsData).length > 0) {
        const reportsArray = Object.values(reportsData);
        const totalReports = reportsArray.length;
        const resolvedReports = reportsArray.filter(r => r.status === 'resolved').length;
        const uniqueUsers = new Set(reportsArray.map(r => r.reporterId)).size;
        
        // Animate the numbers
        animateNumber('total-reports-count', totalReports);
        animateNumber('resolved-count', resolvedReports);
        animateNumber('active-users', uniqueUsers);
    }
}

function animateNumber(elementId, targetNumber) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startNumber = 0;
    const duration = 2000; // 2 seconds
    const increment = targetNumber / (duration / 16); // 60fps
    let currentNumber = startNumber;
    
    const timer = setInterval(() => {
        currentNumber += increment;
        if (currentNumber >= targetNumber) {
            currentNumber = targetNumber;
            clearInterval(timer);
        }
        element.textContent = Math.floor(currentNumber);
    }, 16);
}

// Profile functions
function loadUserReports() {
    if (!currentUser) return;
    
    const userReportsArray = Object.entries(reportsData)
        .filter(([id, report]) => report.reporterId === currentUser.uid)
        .map(([id, report]) => ({ id, ...report }));
    
    // Sort by creation date (newest first)
    userReportsArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Update statistics
    updateProfileStats(userReportsArray);
    
    // Display user reports
    displayUserReports(userReportsArray);
}

function updateProfileStats(userReports) {
    const total = userReports.length;
    const pending = userReports.filter(r => r.status === 'pending').length;
    const resolved = userReports.filter(r => r.status === 'resolved').length;
    const totalLikesCount = userReports.reduce((sum, r) => sum + (r.likes || 0), 0);
    
    totalReports.textContent = total;
    pendingReports.textContent = pending;
    resolvedReports.textContent = resolved;
    totalLikes.textContent = totalLikesCount;
}

function displayUserReports(userReports) {
    if (userReports.length === 0) {
        userReportsGrid.innerHTML = `
            <div class="no-reports">
                <i class="fas fa-inbox"></i>
                <h3>No reports submitted yet</h3>
                <p>Start by submitting your first report!</p>
            </div>
        `;
        return;
    }
    
    userReportsGrid.innerHTML = userReports.map(report => createUserReportCard(report)).join('');
    
    // Add click listeners to user report cards
    document.querySelectorAll('.user-report-card').forEach(card => {
        card.addEventListener('click', () => {
            const reportId = card.dataset.reportId;
            openReportModal(reportId);
        });
    });
}

function createUserReportCard(report) {
    const commentsCount = Object.keys(report.comments || {}).length;
    const formattedDate = formatDate(report.createdAt);
    
    return `
        <div class="report-card user-report-card" data-report-id="${report.id}">
            <div class="report-header">
                <h3 class="report-title">${escapeHtml(report.title)}</h3>
                <span class="owner-badge">Your Report</span>
            </div>
            <div class="report-meta">
                <span class="category-badge">${report.category.replace('-', ' ')}</span>
                <span class="status-badge status-${report.status}">${report.status}</span>
            </div>
            <div class="report-description">
                ${escapeHtml(report.description)}
            </div>
            <div class="report-footer">
                <span class="report-date">${formattedDate}</span>
                <div class="report-stats">
                    <div class="stat-item">
                        <i class="fas fa-heart"></i>
                        <span>${report.likes || 0}</span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-comment"></i>
                        <span>${commentsCount}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Make functions global for onclick handlers
window.showSection = showSection;
window.handleSignOut = handleSignOut;

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', waitForFirebase);
