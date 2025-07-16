// -----------------------------------------------------------------------------
// Supabase Initialization
// -----------------------------------------------------------------------------
const SUPABASE_URL = 'https://gnjjqhchzmcwhoelugen.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduampxaGNoem1jd2hvZWx1Z2VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MTM1MDAsImV4cCI6MjA2Nzk4OTUwMH0.U9fzz-njmirRZBGhYmdxj9gPWvIS_srS6vvBf2_5g20';
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// -----------------------------------------------------------------------------
// Utility Functions (Manual Authentication & Modal)
// -----------------------------------------------------------------------------
function protectedRoute() {
    const userString = sessionStorage.getItem('loggedInUser');
    if (!userString) {
        if (window.location.pathname.split('/').pop() !== 'loginclerk.html') {
            window.location.href = 'loginclerk.html';
        }
        return null;
    }
    const userData = JSON.parse(userString);
    if (userData.role !== 'clerk') {
        sessionStorage.removeItem('loggedInUser');
        if (window.location.pathname.split('/').pop() !== 'loginclerk.html') {
            window.location.href = 'loginclerk.html';
        }
        return null;
    }
    return userData;
}

function showConfirmationModal(title, message, onConfirm) {
    const modal = document.getElementById('confirmation-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const confirmBtn = document.getElementById('modal-confirm-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');
    if (!modal || !modalTitle || !modalMessage || !confirmBtn || !cancelBtn) {
        if (confirm(message)) {
            if(onConfirm) onConfirm();
        }
        return;
    }
    modalTitle.textContent = title;
    modalMessage.textContent = message;

    if (onConfirm) {
        confirmBtn.classList.remove('hidden');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        newConfirmBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            onConfirm();
        }, { once: true });
    } else {
        confirmBtn.classList.add('hidden');
    }
    
    modal.classList.remove('hidden');
    cancelBtn.addEventListener('click', () => modal.classList.add('hidden'), { once: true });
}

// -----------------------------------------------------------------------------
// Authentication
// -----------------------------------------------------------------------------
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if (!email || !password) {
        alert('Please enter both email and password.');
        return;
    }
    try {
        const { data: userData, error } = await db.from('users').select('*').eq('email', email).single();
        if (error || !userData) throw new Error('Invalid email or password.');
        if (userData.password !== password) throw new Error('Invalid email or password.');
        if (userData.role !== 'clerk') throw new Error('Access denied. This portal is for clerks only.');
        sessionStorage.setItem('loggedInUser', JSON.stringify(userData));
        window.location.href = 'dashboardclerk.html';
    } catch (error) {
        console.error('Login Error:', error);
        alert(error.message);
    }
}

function handleLogout() {
    sessionStorage.removeItem('loggedInUser');
    window.location.href = 'loginclerk.html';
}

// -----------------------------------------------------------------------------
// Dashboard Page
// -----------------------------------------------------------------------------
async function displayDashboardStats() {
    try {
        const { count: userCount } = await db.from('users').select('*', { count: 'exact', head: true });
        document.getElementById('new-sign-up-stat').textContent = userCount || 0;
        const { count: activeReadersCount } = await db.from('reading_progress').select('*', { count: 'exact', head: true }).eq('status', 'reading');
        document.getElementById('active-readers-stat').textContent = activeReadersCount || 0;
        const { count: bookCount } = await db.from('ebook').select('*', { count: 'exact', head: true });
        document.getElementById('books-added-stat').textContent = bookCount || 0;
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
    }
}

async function displayUserPreview() {
    const container = document.querySelector('#user-preview-container');
    if (!container) return;
    try {
        const { data: users, error } = await db.from('users').select('name, email, created_at').eq('role', 'reader').limit(3);
        if (error) throw error;
        if (users.length === 0) {
            container.innerHTML = `<p class="text-center text-gray-400 py-8">No users to display.</p>`;
            return;
        }
        let tableHTML = `<div class="overflow-x-auto"><table class="min-w-full text-sm"><thead class="bg-gray-100"><tr><th class="text-left py-2 px-3 font-semibold text-gray-600">Name</th><th class="text-left py-2 px-3 font-semibold text-gray-600">Email</th><th class="text-left py-2 px-3 font-semibold text-gray-600">Joined</th></tr></thead><tbody>`;
        users.forEach(user => {
            tableHTML += `<tr class="border-b border-gray-200"><td class="py-2 px-3">${user.name || 'N/A'}</td><td class="py-2 px-3">${user.email}</td><td class="py-2 px-3">${new Date(user.created_at).toLocaleDateString()}</td></tr>`;
        });
        tableHTML += `</tbody></table></div>`;
        container.innerHTML = tableHTML;
    } catch (error) {
        console.error('Error fetching user preview:', error);
        container.innerHTML = `<p class="text-center text-red-500 py-8">Error loading user preview.</p>`;
    }
}

async function displayBookPreview() {
    const container = document.querySelector('#book-preview-container');
    if (!container) return;
    try {
        const { data: books, error } = await db.from('ebook').select('title, author, genre').limit(3);
        if (error) throw error;
        if (books.length === 0) {
            container.innerHTML = `<p class="text-center text-gray-400 py-8">No books to display.</p>`;
            return;
        }
        let tableHTML = `<div class="overflow-x-auto"><table class="min-w-full text-sm"><thead class="bg-gray-100"><tr><th class="text-left py-2 px-3 font-semibold text-gray-600">Title</th><th class="text-left py-2 px-3 font-semibold text-gray-600">Author</th><th class="text-left py-2 px-3 font-semibold text-gray-600">Genre</th></tr></thead><tbody>`;
        books.forEach(book => {
            tableHTML += `<tr class="border-b border-gray-200"><td class="py-2 px-3">${book.title}</td><td class="py-2 px-3">${book.author || 'N/A'}</td><td class="py-2 px-3">${book.genre || 'N/A'}</td></tr>`;
        });
        tableHTML += `</tbody></table></div>`;
        container.innerHTML = tableHTML;
    } catch (error) {
        console.error('Error fetching book preview:', error);
        container.innerHTML = `<p class="text-center text-red-500 py-8">Error loading book preview.</p>`;
    }
}

async function displayWishlistPreview() {
    const container = document.querySelector('#wishlist-preview-container');
    if (!container) return;
    try {
        const { data: wishlists, error } = await db.from('wishlists').select('book_title, book_author').eq('status', 'not reviewed').limit(3);
        if (error) throw error;
        if (wishlists.length === 0) {
            container.innerHTML = `<p class="text-center text-gray-400 py-8">No new wishlist items.</p>`;
            return;
        }
        let tableHTML = `<div class="overflow-x-auto"><table class="min-w-full text-sm"><thead class="bg-gray-100"><tr><th class="text-left py-2 px-3 font-semibold text-gray-600">Book Title</th><th class="text-left py-2 px-3 font-semibold text-gray-600">Author</th></tr></thead><tbody>`;
        wishlists.forEach(item => {
            tableHTML += `<tr class="border-b border-gray-200"><td class="py-2 px-3">${item.book_title}</td><td class="py-2 px-3">${item.book_author || 'N/A'}</td></tr>`;
        });
        tableHTML += `</tbody></table></div>`;
        container.innerHTML = tableHTML;
    } catch (error) {
        console.error('Error fetching wishlist preview:', error);
        container.innerHTML = `<p class="text-center text-red-500 py-8">Error loading wishlist preview.</p>`;
    }
}

// -----------------------------------------------------------------------------
// User Management Page
// -----------------------------------------------------------------------------
async function displayUsers() {
    const tableBody = document.querySelector('#user-table-body');
    if (!tableBody) return;
    try {
        const { data: users, error } = await db.from('users').select('id, name, email, created_at').eq('role', 'reader');
        if (error) throw error;
        tableBody.innerHTML = '';
        if (users.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4">No reader users found.</td></tr>`;
            return;
        }
        users.forEach(user => {
            const row = `<tr class="border-b border-gray-200" data-user-id="${user.id}" data-user-name="${user.name || user.email}"><td class="py-3 px-4">${user.id}</td><td class="py-3 px-4">${user.name || 'N/A'}</td><td class="py-3 px-4">${user.email}</td><td class="py-3 px-4">${new Date(user.created_at).toLocaleDateString()}</td><td class="py-3 px-4"><button class="delete-user-btn text-red-500 hover:text-red-700"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button></td></tr>`;
            tableBody.insertAdjacentHTML('beforeend', row);
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500">Error loading users.</td></tr>`;
    }
}

function deleteUser(userId, userName) {
    showConfirmationModal('Confirm Deletion', `Are you sure you want to permanently delete the user "${userName}"? This action cannot be undone.`, async () => {
        try {
            const { error } = await db.from('users').delete().eq('id', userId);
            if (error) throw error;
            document.querySelector(`tr[data-user-id="${userId}"]`).remove();
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to delete user. They may have related data in other tables.');
        }
    });
}

// -----------------------------------------------------------------------------
// Book Management Page
// -----------------------------------------------------------------------------
let allBooks = [];
let filteredBooks = [];
let currentBookPage = 1;
const booksPerPage = 70;

async function initializeBookManagement() {
    try {
        const { data, error } = await db.from('ebook').select('ebook_id, title, author, publisher, genre');
        if (error) throw error;
        allBooks = data;
        filteredBooks = allBooks;
        currentBookPage = 1;
        renderBookPage();
    } catch (error) {
        console.error('Error fetching books:', error);
        document.getElementById('book-table-body').innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500">Error loading books.</td></tr>`;
    }
}

function renderBookPage() {
    const tableBody = document.getElementById('book-table-body');
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    if (!tableBody || !pageInfo || !prevBtn || !nextBtn) return;
    tableBody.innerHTML = '';
    if (filteredBooks.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-gray-500">No books found.</td></tr>`;
        pageInfo.textContent = 'Page 0 of 0';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }
    const totalPages = Math.ceil(filteredBooks.length / booksPerPage);
    pageInfo.textContent = `Page ${currentBookPage} of ${totalPages}`;
    const startIndex = (currentBookPage - 1) * booksPerPage;
    const endIndex = startIndex + booksPerPage;
    const pageBooks = filteredBooks.slice(startIndex, endIndex);
    pageBooks.forEach(book => {
        const row = `<tr class="border-b border-gray-200" data-book-id="${book.ebook_id}" data-book-title="${book.title}"><td class="py-3 px-4">${book.title}</td><td class="py-3 px-4">${book.author || 'N/A'}</td><td class="py-3 px-4">${book.publisher || 'N/A'}</td><td class="py-3 px-4">${book.genre || 'N/A'}</td><td class="py-3 px-4"><button class="delete-book-btn text-red-500 hover:text-red-700"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button></td></tr>`;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
    prevBtn.disabled = currentBookPage === 1;
    nextBtn.disabled = currentBookPage === totalPages;
}

function searchBooks(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    if (searchTerm === '') {
        filteredBooks = allBooks;
    } else {
        filteredBooks = allBooks.filter(book => (book.title && book.title.toLowerCase().includes(searchTerm)) || (book.author && book.author.toLowerCase().includes(searchTerm)) || (book.publisher && book.publisher.toLowerCase().includes(searchTerm)) || (book.genre && book.genre.toLowerCase().includes(searchTerm)));
    }
    currentBookPage = 1;
    renderBookPage();
}

function deleteBook(bookId, bookTitle) {
    showConfirmationModal('Confirm Deletion', `Are you sure you want to permanently delete the book "${bookTitle}"? This action cannot be undone.`, async () => {
        try {
            const { error } = await db.from('ebook').delete().eq('ebook_id', bookId);
            if (error) throw error;
            allBooks = allBooks.filter(b => b.ebook_id != bookId);
            filteredBooks = filteredBooks.filter(b => b.ebook_id != bookId);
            const totalPages = Math.ceil(filteredBooks.length / booksPerPage);
            if (currentBookPage > totalPages && totalPages > 0) {
                currentBookPage = totalPages;
            }
            renderBookPage();
        } catch (error) {
            console.error('Error deleting book:', error);
            alert('Failed to delete book. It might be referenced in other tables (e.g., collections, reviews).');
        }
    });
}

// -----------------------------------------------------------------------------
// Wishlist Review Page
// -----------------------------------------------------------------------------
let currentWishlistItemId = null;

async function displayWishlist() {
    const tableBody = document.getElementById('wishlist-table-body');
    if (!tableBody) return;
    try {
        const { data: wishlistItems, error } = await db.from('wishlists').select('id, book_title, book_author').eq('status', 'not reviewed');
        if (error) throw error;
        tableBody.innerHTML = '';
        if (wishlistItems.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-10 text-gray-500">No new wishlist items to review.</td></tr>`;
            return;
        }
        wishlistItems.forEach(item => {
            const row = `<tr class="wishlist-item border-b border-gray-200 bg-white hover:bg-gray-50" data-wishlist-id="${item.id}" data-title="${item.book_title}" data-author="${item.book_author || ''}"><td class="py-3 px-4">${item.book_title}</td><td class="py-3 px-4">${item.book_author || 'N/A'}</td><td class="py-3 px-4 flex items-center gap-4"><button class="edit-btn text-blue-500 hover:text-blue-700" title="Process this item"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button><button class="delete-wishlist-btn text-red-500 hover:text-red-700" title="Reject and delete this item"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button></td></tr>`;
            tableBody.insertAdjacentHTML('beforeend', row);
        });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-10 text-red-500">Error loading wishlist.</td></tr>`;
    }
}

function deleteWishlistItem(wishlistId, bookTitle) {
    showConfirmationModal('Confirm Rejection', `Are you sure you want to reject and permanently delete the wishlist request for "${bookTitle}"? This cannot be undone.`, async () => {
        try {
            const { error } = await db.from('wishlists').delete().eq('id', wishlistId);
            if (error) throw error;
            document.querySelector(`tr[data-wishlist-id="${wishlistId}"]`).remove();
            const tableBody = document.getElementById('wishlist-table-body');
            if (tableBody.children.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-10 text-gray-500">No new wishlist items to review.</td></tr>`;
            }
        } catch (error) {
            console.error('Error deleting wishlist item:', error);
            showConfirmationModal('Operation Failed', 'Failed to delete wishlist item.');
        }
    });
}

function populateAddBookForm(event) {
    const itemRow = event.target.closest('.wishlist-item');
    const addBookSection = document.getElementById('add-book-section');
    const mainContainer = document.getElementById('main-container');
    currentWishlistItemId = itemRow.dataset.wishlistId;
    document.getElementById('title-input').value = itemRow.dataset.title;
    document.getElementById('author-input').value = itemRow.dataset.author;
    
    const nextId = await getNextEbookId();
    bookIdInput.value = nextId;
    bookIdInput.readOnly = true; 
    
    addBookSection.classList.remove('hidden');
    mainContainer.classList.remove('lg:grid-cols-1');
    mainContainer.classList.add('lg:grid-cols-2');
}

async function addBookFromWishlist(event) {
    event.preventDefault();
    if (!currentWishlistItemId) {
        showConfirmationModal('Error', 'Please select a wishlist item first.');
        return;
    }
    const clerkUser = protectedRoute();
    if (!clerkUser) {
        showConfirmationModal('Authentication Error', 'Could not verify user. Please log in again.');
        return;
    }
    const newBook = {
        ebook_id: document.getElementById('book-id').value,
        title: document.getElementById('title-input').value,
        author: document.getElementById('author-input').value || null,
        page_number: document.getElementById('page-number').value || null,
        price: document.getElementById('price').value || null,
        year_published: document.getElementById('year-publish').value || null,
        publisher: document.getElementById('publisher').value || null,
        genre: document.getElementById('genre').value || null,
    };
    if (!newBook.ebook_id || !newBook.title) {
        showConfirmationModal('Validation Error', 'Book ID and Title are required fields.');
        return;
    }
    try {
        const { error: insertError } = await db.from('ebook').insert([newBook]);
        if (insertError) {
            if (insertError.code === '23505') {
                throw new Error(`Error adding book: A book with ID "${newBook.ebook_id}" already exists.`);
            }
            throw new Error(`Error adding book: ${insertError.message}`);
        }
        const { error: updateError } = await db.from('wishlists').update({ status: 'available', processed_by: clerkUser.id }).eq('id', currentWishlistItemId);
        if (updateError) {
            throw new Error(`Book added, but failed to update wishlist status: ${updateError.message}`);
        }
        showConfirmationModal('Success', 'Book successfully added and wishlist updated!');
        document.getElementById('add-book-form').reset();
        document.getElementById('add-book-section').classList.add('hidden');
        document.getElementById('main-container').classList.add('lg:grid-cols-1');
        document.getElementById('main-container').classList.remove('lg:grid-cols-2');
        currentWishlistItemId = null;
        displayWishlist();
    } catch (error) {
        console.error('Error processing wishlist item:', error);
        showConfirmationModal('Operation Failed', error.message);
    }
}

// -----------------------------------------------------------------------------
// Event Listeners and Page Routing
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname.split('/').pop();

    if (path === 'loginclerk.html') {
        if (typeof feather !== 'undefined') feather.replace();
        document.querySelector('.login-form').addEventListener('submit', handleLogin);
    } else if (path === 'dashboardclerk.html') {
        protectedRoute();
        displayDashboardStats();
        displayUserPreview();
        displayBookPreview();
        displayWishlistPreview();
        document.querySelector('a[href="loginclerk.html"]').addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    } else if (path === 'manage-user.html') {
        protectedRoute();
        displayUsers();
        document.querySelector('#user-table-body').addEventListener('click', (e) => {
            const deleteButton = e.target.closest('.delete-user-btn');
            if (deleteButton) {
                const userRow = deleteButton.closest('tr');
                const userId = userRow.dataset.userId;
                const userName = userRow.dataset.userName;
                deleteUser(userId, userName);
            }
        });
    } else if (path === 'book-management.html') {
        protectedRoute();
        initializeBookManagement();
        document.getElementById('book-search-input').addEventListener('input', searchBooks);
        document.getElementById('next-page-btn').addEventListener('click', () => {
            const totalPages = Math.ceil(filteredBooks.length / booksPerPage);
            if (currentBookPage < totalPages) {
                currentBookPage++;
                renderBookPage();
            }
        });
        document.getElementById('prev-page-btn').addEventListener('click', () => {
            if (currentBookPage > 1) {
                currentBookPage--;
                renderBookPage();
            }
        });
        document.getElementById('book-table-body').addEventListener('click', (e) => {
            const deleteButton = e.target.closest('.delete-book-btn');
            if (deleteButton) {
                const bookRow = deleteButton.closest('tr');
                const bookId = bookRow.dataset.bookId;
                const bookTitle = bookRow.dataset.bookTitle;
                deleteBook(bookId, bookTitle);
            }
        });
    } else if (path === 'wishlist-review.html') {
        protectedRoute();
        displayWishlist();
        document.getElementById('wishlist-table-body').addEventListener('click', (e) => {
            const editButton = e.target.closest('.edit-btn');
            const deleteButton = e.target.closest('.delete-wishlist-btn');
            if (editButton) {
                populateAddBookForm(e);
            } else if (deleteButton) {
                const itemRow = deleteButton.closest('.wishlist-item');
                const wishlistId = itemRow.dataset.wishlistId;
                const bookTitle = itemRow.dataset.title;
                deleteWishlistItem(wishlistId, bookTitle);
            }
        });
        document.getElementById('add-book-section').addEventListener('submit', addBookFromWishlist);
    }
});
