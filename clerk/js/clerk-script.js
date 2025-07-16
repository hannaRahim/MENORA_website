// -----------------------------------------------------------------------------
// Supabase Initialization
// -----------------------------------------------------------------------------
// IMPORTANT: Replace with your actual Supabase URL and Anon Key
const SUPABASE_URL = 'https://gnjjqhchzmcwhoelugen.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduampxaGNoem1jd2hvZWx1Z2VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MTM1MDAsImV4cCI6MjA2Nzk4OTUwMH0.U9fzz-njmirRZBGhYmdxj9gPWvIS_srS6vvBf2_5g20';

// Create a Supabase client
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// -----------------------------------------------------------------------------
// Utility Functions (Manual Authentication)
// -----------------------------------------------------------------------------

/**
 * Checks if a user is currently logged in by checking sessionStorage.
 * If not, it redirects them to the login page.
 * This is the replacement for Supabase's built-in protected routes.
 */
function protectedRoute() {
    const userString = sessionStorage.getItem('loggedInUser');
    if (!userString) {
        // No user in session storage, redirect to login
        if (window.location.pathname !== '/loginclerk.html') {
            window.location.href = 'loginclerk.html';
        }
        return null;
    }

    const userData = JSON.parse(userString);

    // Optional: double-check the role
    if (userData.role !== 'clerk') {
        sessionStorage.removeItem('loggedInUser');
        if (window.location.pathname !== '/loginclerk.html') {
            window.location.href = 'loginclerk.html';
        }
        return null;
    }

    return userData; // Return the user object if authenticated
}

// -----------------------------------------------------------------------------
// Authentication (loginclerk.html & Logout)
// -----------------------------------------------------------------------------

/**
 * Handles the clerk login by checking the 'users' table manually.
 * @param {Event} event The form submission event.
 */
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        alert('Please enter both email and password.');
        return;
    }

    try {
        // Step 1: Find a user with the matching email
        const { data: userData, error } = await db
            .from('users')
            .select('*')
            .eq('email', email)
            .single(); // .single() expects only one result

        if (error || !userData) {
            throw new Error('Invalid email or password.');
        }

        // Step 2: Check if the password matches
        if (userData.password !== password) {
            throw new Error('Invalid email or password.');
        }

        // Step 3: Check if the role is 'clerk'
        if (userData.role !== 'clerk') {
            throw new Error('Access denied. This portal is for clerks only.');
        }

        // Step 4: If everything is correct, store user info in sessionStorage
        sessionStorage.setItem('loggedInUser', JSON.stringify(userData));

        // Step 5: Redirect to the dashboard
        window.location.href = 'dashboardclerk.html';

    } catch (error) {
        console.error('Login Error:', error);
        alert(error.message);
    }
}

/**
 * Handles user logout by clearing sessionStorage.
 */
function handleLogout() {
    sessionStorage.removeItem('loggedInUser');
    window.location.href = 'loginclerk.html';
}


// -----------------------------------------------------------------------------
// Dashboard Page (dashboardclerk.html)
// -----------------------------------------------------------------------------

/**
 * Fetches and displays statistics for the dashboard.
 */
async function displayDashboardStats() {
    try {
        // 1. Get total user count
        const { count: userCount, error: userError } = await db
            .from('users')
            .select('*', { count: 'exact', head: true });
        if (userError) throw userError;
        document.querySelector('#new-sign-up-stat').textContent = userCount || 0;

        // 2. Get active readers count
        const { count: activeReadersCount, error: activeReadersError } = await db
            .from('reading_progress')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'reading');
        if (activeReadersError) throw activeReadersError;
        document.querySelector('#active-readers-stat').textContent = activeReadersCount || 0;

        // 3. Get total books count
        const { count: bookCount, error: bookError } = await db
            .from('ebook')
            .select('*', { count: 'exact', head: true });
        if (bookError) throw bookError;
        document.querySelector('#books-added-stat').textContent = bookCount || 0;

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        alert('Could not load dashboard statistics.');
    }
}

/**
 * Fetches and displays a preview of the latest 3 users on the dashboard.
 */
async function displayUserPreview() {
    const container = document.querySelector('#user-preview-container');
    if (!container) return;

    try {
        const { data: users, error } = await db
            .from('users')
            .select('name, email, created_at')
            .eq('role', 'reader')
            .limit(3);

        if (error) throw error;
        
        if (users.length === 0) {
            container.innerHTML = `<p class="text-center text-gray-400 py-8">No users to display.</p>`;
            return;
        }

        let tableHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full text-sm">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="text-left py-2 px-3 font-semibold text-gray-600">Name</th>
                            <th class="text-left py-2 px-3 font-semibold text-gray-600">Email</th>
                            <th class="text-left py-2 px-3 font-semibold text-gray-600">Joined</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        users.forEach(user => {
            tableHTML += `
                <tr class="border-b border-gray-200">
                    <td class="py-2 px-3">${user.name || 'N/A'}</td>
                    <td class="py-2 px-3">${user.email}</td>
                    <td class="py-2 px-3">${new Date(user.created_at).toLocaleDateString()}</td>
                </tr>
            `;
        });
        tableHTML += `</tbody></table></div>`;
        container.innerHTML = tableHTML;

    } catch (error) {
        console.error('Error fetching user preview:', error);
        container.innerHTML = `<p class="text-center text-red-500 py-8">Error loading user preview.</p>`;
    }
}

/**
 * Fetches and displays a preview of the latest 3 books on the dashboard.
 */
async function displayBookPreview() {
    const container = document.querySelector('#book-preview-container');
    if (!container) return;

    try {
        const { data: books, error } = await db
            .from('ebook')
            .select('title, author, genre')
            .limit(3);

        if (error) throw error;

        if (books.length === 0) {
            container.innerHTML = `<p class="text-center text-gray-400 py-8">No books to display.</p>`;
            return;
        }

        let tableHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full text-sm">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="text-left py-2 px-3 font-semibold text-gray-600">Title</th>
                            <th class="text-left py-2 px-3 font-semibold text-gray-600">Author</th>
                            <th class="text-left py-2 px-3 font-semibold text-gray-600">Genre</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        books.forEach(book => {
            tableHTML += `
                <tr class="border-b border-gray-200">
                    <td class="py-2 px-3">${book.title}</td>
                    <td class="py-2 px-3">${book.author || 'N/A'}</td>
                    <td class="py-2 px-3">${book.genre || 'N/A'}</td>
                </tr>
            `;
        });
        tableHTML += `</tbody></table></div>`;
        container.innerHTML = tableHTML;

    } catch (error) {
        console.error('Error fetching book preview:', error);
        container.innerHTML = `<p class="text-center text-red-500 py-8">Error loading book preview.</p>`;
    }
}

/**
 * Fetches and displays a preview of the latest 3 wishlist items on the dashboard.
 */
async function displayWishlistPreview() {
    const container = document.querySelector('#wishlist-preview-container');
    if (!container) return;

    try {
        const { data: wishlists, error } = await db
            .from('wishlists')
            .select('book_title, book_author')
            .eq('status', 'not reviewed')
            .limit(3);

        if (error) throw error;

        if (wishlists.length === 0) {
            container.innerHTML = `<p class="text-center text-gray-400 py-8">No new wishlist items.</p>`;
            return;
        }

        let tableHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full text-sm">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="text-left py-2 px-3 font-semibold text-gray-600">Book Title</th>
                            <th class="text-left py-2 px-3 font-semibold text-gray-600">Author</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        wishlists.forEach(item => {
            tableHTML += `
                <tr class="border-b border-gray-200">
                    <td class="py-2 px-3">${item.book_title}</td>
                    <td class="py-2 px-3">${item.book_author || 'N/A'}</td>
                </tr>
            `;
        });
        tableHTML += `</tbody></table></div>`;
        container.innerHTML = tableHTML;

    } catch (error) {
        console.error('Error fetching wishlist preview:', error);
        container.innerHTML = `<p class="text-center text-red-500 py-8">Error loading wishlist preview.</p>`;
    }
}


// -----------------------------------------------------------------------------
// User Management Page (manage-user.html)
// -----------------------------------------------------------------------------

/**
 * Fetches and displays all users with the 'reader' role.
 */
async function displayUsers() {
    const tableBody = document.querySelector('#user-table-body');
    if (!tableBody) return;

    try {
        const { data: users, error } = await db
            .from('users')
            .select('id, name, email, created_at')
            .eq('role', 'reader');

        if (error) throw error;

        tableBody.innerHTML = ''; // Clear existing rows
        if (users.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4">No reader users found.</td></tr>`;
            return;
        }

        users.forEach(user => {
            const row = `
                <tr class="border-b border-gray-200" data-user-id="${user.id}">
                    <td class="py-3 px-4">${user.id}</td>
                    <td class="py-3 px-4">${user.name || 'N/A'}</td>
                    <td class="py-3 px-4">${user.email}</td>
                    <td class="py-3 px-4">${new Date(user.created_at).toLocaleDateString()}</td>
                    <td class="py-3 px-4">
                        <button class="delete-user-btn text-red-500 hover:text-red-700">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </td>
                </tr>
            `;
            tableBody.insertAdjacentHTML('beforeend', row);
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500">Error loading users.</td></tr>`;
    }
}

/**
 * Deletes a user after confirmation.
 * @param {string} userId The UUID of the user to delete.
 */
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }
    try {
        // In a real app, you'd call a server-side function to delete the auth user.
        // Supabase client-side cannot delete other users.
        // We will just delete the record from the 'users' table for this example.
        const { error } = await db.from('users').delete().eq('id', userId);
        if (error) throw error;

        alert('User deleted successfully.');
        document.querySelector(`tr[data-user-id="${userId}"]`).remove(); // Remove from UI
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user. See console for details.');
    }
}

// -----------------------------------------------------------------------------
// Book Management Page (book-management.html)
// -----------------------------------------------------------------------------

let allBooks = []; // Cache for search functionality

/**
 * Fetches and displays all books.
 */
async function displayBooks() {
    const tableBody = document.querySelector('#book-table-body');
    if (!tableBody) return;

    try {
        const { data: books, error } = await db
            .from('ebook')
            .select('ebook_id, title, author, publisher, genre');

        if (error) throw error;

        allBooks = books; // Cache the books
        renderBooks(allBooks);

    } catch (error) {
        console.error('Error fetching books:', error);
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500">Error loading books.</td></tr>`;
    }
}

/**
 * Renders a list of books to the table.
 * @param {Array} books The array of book objects to render.
 */
function renderBooks(books) {
    const tableBody = document.querySelector('#book-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = ''; // Clear existing rows
    if (books.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4">No books found.</td></tr>`;
        return;
    }

    books.forEach(book => {
        const row = `
            <tr class="border-b border-gray-200" data-book-id="${book.ebook_id}">
                <td class="py-3 px-4">${book.title}</td>
                <td class="py-3 px-4">${book.author || 'N/A'}</td>
                <td class="py-3 px-4">${book.publisher || 'N/A'}</td>
                <td class="py-3 px-4">${book.genre || 'N/A'}</td>
                <td class="py-3 px-4">
                    <button class="delete-book-btn text-red-500 hover:text-red-700">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </td>
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
}

/**
 * Deletes a book after confirmation.
 * @param {string} bookId The ID of the book to delete.
 */
async function deleteBook(bookId) {
    if (!confirm('Are you sure you want to delete this book?')) {
        return;
    }
    try {
        const { error } = await db.from('ebook').delete().eq('ebook_id', bookId);
        if (error) throw error;

        alert('Book deleted successfully.');
        document.querySelector(`tr[data-book-id="${bookId}"]`).remove();
    } catch (error) {
        console.error('Error deleting book:', error);
        alert('Failed to delete book. It might be referenced in other tables.');
    }
}

/**
 * Searches books based on input.
 * @param {Event} event The input event from the search bar.
 */
function searchBooks(event) {
    const searchTerm = event.target.value.toLowerCase();
    const filteredBooks = allBooks.filter(book =>
        book.title.toLowerCase().includes(searchTerm) ||
        (book.author && book.author.toLowerCase().includes(searchTerm)) ||
        (book.genre && book.genre.toLowerCase().includes(searchTerm))
    );
    renderBooks(filteredBooks);
}

// -----------------------------------------------------------------------------
// Wishlist Review Page (wishlist-review.html)
// -----------------------------------------------------------------------------

let currentWishlistItem = null; // To store data of the item being edited

/**
 * Fetches and displays wishlist items that are 'not reviewed'.
 */
async function displayWishlist() {
    const tableBody = document.querySelector('#wishlist-table-body');
    if (!tableBody) return;

    try {
        const { data: wishlistItems, error } = await db
            .from('wishlists')
            .select('id, book_title, book_author')
            .eq('status', 'not reviewed');

        if (error) throw error;

        tableBody.innerHTML = ''; // Clear existing rows
        if (wishlistItems.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4">No new wishlist items to review.</td></tr>`;
            return;
        }

        wishlistItems.forEach(item => {
            const row = `
                <tr class="wishlist-item border-b border-gray-200 bg-white" data-wishlist-id="${item.id}" data-title="${item.book_title}" data-author="${item.book_author}">
                    <td class="py-3 px-4">${item.book_title}</td>
                    <td class="py-3 px-4">${item.book_author}</td>
                    <td class="py-3 px-4">
                        <button class="edit-btn text-blue-500 hover:text-blue-700">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                    </td>
                </tr>
            `;
            tableBody.insertAdjacentHTML('beforeend', row);
        });

    } catch (error) {
        console.error('Error fetching wishlist:', error);
        tableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-red-500">Error loading wishlist.</td></tr>`;
    }
}

/**
 * Populates the 'Add Book' form when an edit button is clicked.
 * @param {Event} event The click event from the edit button.
 */
function populateAddBookForm(event) {
    const itemRow = event.currentTarget.closest('.wishlist-item');
    const addBookSection = document.getElementById('add-book-section');
    const mainContainer = document.getElementById('main-container');

    // Store the data of the selected item
    currentWishlistItem = {
        id: itemRow.dataset.wishlistId,
        title: itemRow.dataset.title,
        author: itemRow.dataset.author,
    };

    // Populate the form
    document.getElementById('title-input').value = currentWishlistItem.title;
    document.getElementById('author-input').value = currentWishlistItem.author;

    // Show the form and adjust layout
    addBookSection.classList.remove('hidden');
    mainContainer.classList.remove('lg:grid-cols-1');
    mainContainer.classList.add('lg:grid-cols-2');
}

/**
 * Handles the submission of the 'Add Book' form.
 * @param {Event} event The form submission event.
 */
async function addBookFromWishlist(event) {
    event.preventDefault();
    if (!currentWishlistItem) {
        alert('Please select a wishlist item first.');
        return;
    }

    const clerkUser = protectedRoute(); // Get user from session storage
    if (!clerkUser) {
        alert('Authentication error. Please log in again.');
        return;
    }

    // Get all form data
    const newBook = {
        ebook_id: document.getElementById('book-id').value,
        title: document.getElementById('title-input').value,
        author: document.getElementById('author-input').value,
        page_number: document.getElementById('page-number').value,
        price: document.getElementById('price').value,
        year_published: document.getElementById('year-publish').value,
        publisher: document.getElementById('publisher').value,
        genre: document.getElementById('genre').value,
    };

    // Basic validation
    if (!newBook.ebook_id || !newBook.title) {
        alert('Book ID and Title are required.');
        return;
    }

    try {
        // 1. Insert the new book into the 'ebook' table
        const { error: insertError } = await db.from('ebook').insert([newBook]);
        if (insertError) {
            throw new Error(`Error adding book: ${insertError.message}`);
        }

        // 2. Update the wishlist item status to 'available'
        const { error: updateError } = await db
            .from('wishlists')
            .update({ status: 'available', processed_by: clerkUser.id })
            .eq('id', currentWishlistItem.id);

        if (updateError) {
            // This is a problem. The book was added but the wishlist wasn't updated.
            // A more robust solution would use a database transaction.
            throw new Error(`Book added, but failed to update wishlist: ${updateError.message}`);
        }

        alert('Book successfully added and wishlist updated!');

        // Reset UI
        document.getElementById('add-book-form').reset();
        document.getElementById('add-book-section').classList.add('hidden');
        document.getElementById('main-container').classList.add('lg:grid-cols-1');
        document.getElementById('main-container').classList.remove('lg:grid-cols-2');
        currentWishlistItem = null;

        // Refresh the wishlist
        displayWishlist();

    } catch (error) {
        console.error('Error processing wishlist item:', error);
        alert(error.message);
    }
}


// -----------------------------------------------------------------------------
// Event Listeners and Page Routing
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path.includes('loginclerk.html')) {
        feather.replace(); // Renders icons
        const loginForm = document.querySelector('.login-form');
        if (loginForm) loginForm.addEventListener('submit', handleLogin);

    } else if (path.includes('dashboardclerk.html')) {
        protectedRoute(); // Check if user is logged in
        displayDashboardStats();
        displayUserPreview();
        displayBookPreview();
        displayWishlistPreview();
        // Add logout listener
        const logoutButton = document.querySelector('a[href="loginclerk.html"]');
        if (logoutButton) {
            logoutButton.addEventListener('click', (e) => {
                e.preventDefault();
                handleLogout();
            });
        }
    } else if (path.includes('manage-user.html')) {
        protectedRoute();
        displayUsers();
        document.body.addEventListener('click', (e) => {
            if (e.target.closest('.delete-user-btn')) {
                const userId = e.target.closest('tr').dataset.userId;
                deleteUser(userId);
            }
        });

    } else if (path.includes('book-management.html')) {
        protectedRoute();
        displayBooks();
        // Search listener
        const searchInput = document.querySelector('input[type="text"][placeholder="search"]');
        if (searchInput) searchInput.addEventListener('input', searchBooks);
        // Delete listener
        document.body.addEventListener('click', (e) => {
            if (e.target.closest('.delete-book-btn')) {
                const bookId = e.target.closest('tr').dataset.bookId;
                deleteBook(bookId);
            }
        });

    } else if (path.includes('wishlist-review.html')) {
        protectedRoute();
        displayWishlist();
        // Edit button listener
        document.body.addEventListener('click', (e) => {
            if (e.target.closest('.edit-btn')) {
                populateAddBookForm(e);
            }
        });
        // Form submission listener
        const addBookForm = document.getElementById('add-book-form');
        if (addBookForm) addBookForm.addEventListener('submit', addBookFromWishlist);
    }
});
