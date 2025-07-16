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
        if (window.location.pathname !== '/loginclerk.html') window.location.href = 'loginclerk.html';
        return null;
    }
    const userData = JSON.parse(userString);
    if (userData.role !== 'clerk') {
        sessionStorage.removeItem('loggedInUser');
        if (window.location.pathname !== '/loginclerk.html') window.location.href = 'loginclerk.html';
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
        if (confirm(message)) onConfirm();
        return;
    }
    modalTitle.textContent = title;
    modalMessage.textContent = message;

    // Show confirm button only if onConfirm is provided
    if (onConfirm) {
        confirmBtn.classList.remove('hidden');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        newConfirmBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            onConfirm();
        });
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
    const email = document.getElementById('email').value, password = document.getElementById('password').value;
    if (!email || !password) { alert('Please enter both email and password.'); return; }
    try {
        const { data: userData, error } = await db.from('users').select('*').eq('email', email).single();
        if (error || !userData) throw new Error('Invalid email or password.');
        if (userData.password !== password) throw new Error('Invalid email or password.');
        if (userData.role !== 'clerk') throw new Error('Access denied. This portal is for clerks only.');
        sessionStorage.setItem('loggedInUser', JSON.stringify(userData));
        window.location.href = 'dashboardclerk.html';
    } catch (error) { console.error('Login Error:', error); alert(error.message); }
}

function handleLogout() {
    sessionStorage.removeItem('loggedInUser');
    window.location.href = 'loginclerk.html';
}

// -----------------------------------------------------------------------------
// Dashboard Page
// -----------------------------------------------------------------------------
async function displayDashboardStats() { /* ... existing code ... */ }
async function displayUserPreview() { /* ... existing code ... */ }
async function displayBookPreview() { /* ... existing code ... */ }
async function displayWishlistPreview() { /* ... existing code ... */ }

// -----------------------------------------------------------------------------
// User Management Page
// -----------------------------------------------------------------------------
async function displayUsers() { /* ... existing code ... */ }
function deleteUser(userId, userName) { /* ... existing code ... */ }

// -----------------------------------------------------------------------------
// Book Management Page (book-management.html)
// -----------------------------------------------------------------------------
let allBooks = [];
let filteredBooks = [];
let currentBookPage = 1;
const booksPerPage = 70;
async function initializeBookManagement() { /* ... existing code ... */ }
function renderBookPage() { /* ... existing code ... */ }
function searchBooks(event) { /* ... existing code ... */ }
function deleteBook(bookId, bookTitle) { /* ... existing code ... */ }

// -----------------------------------------------------------------------------
// Wishlist Review Page
// -----------------------------------------------------------------------------

// State variable to hold the ID of the wishlist item being processed
let currentWishlistItemId = null;

/**
 * Fetches and displays wishlist items that are 'not reviewed'.
 */
async function displayWishlist() {
    const tableBody = document.getElementById('wishlist-table-body');
    if (!tableBody) return;

    try {
        const { data: wishlistItems, error } = await db
            .from('wishlists')
            .select('id, book_title, book_author')
            .eq('status', 'not reviewed');

        if (error) throw error;

        tableBody.innerHTML = ''; // Clear existing rows
        if (wishlistItems.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-10 text-gray-500">No new wishlist items to review.</td></tr>`;
            return;
        }

        wishlistItems.forEach(item => {
            const row = `
                <tr class="wishlist-item border-b border-gray-200 bg-white hover:bg-gray-50" 
                    data-wishlist-id="${item.id}" 
                    data-title="${item.book_title}" 
                    data-author="${item.book_author || ''}">
                    <td class="py-3 px-4">${item.book_title}</td>
                    <td class="py-3 px-4">${item.book_author || 'N/A'}</td>
                    <td class="py-3 px-4 flex items-center gap-4">
                        <button class="edit-btn text-blue-500 hover:text-blue-700" title="Process this item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="delete-wishlist-btn text-red-500 hover:text-red-700" title="Reject and delete this item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </td>
                </tr>
            `;
            tableBody.insertAdjacentHTML('beforeend', row);
        });

    } catch (error) {
        console.error('Error fetching wishlist:', error);
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-10 text-red-500">Error loading wishlist.</td></tr>`;
    }
}

/**
 * Deletes a wishlist item after confirmation.
 * @param {string} wishlistId The ID of the wishlist item to delete.
 * @param {string} bookTitle The title of the book for the confirmation message.
 */
function deleteWishlistItem(wishlistId, bookTitle) {
    showConfirmationModal(
        'Confirm Rejection',
        `Are you sure you want to reject and permanently delete the wishlist request for "${bookTitle}"? This cannot be undone.`,
        async () => {
            try {
                const { error } = await db.from('wishlists').delete().eq('id', wishlistId);
                if (error) throw error;

                // Remove the row from the table on success
                document.querySelector(`tr[data-wishlist-id="${wishlistId}"]`).remove();
                
                // Check if the table is now empty and show a message if it is
                const tableBody = document.getElementById('wishlist-table-body');
                if (tableBody.children.length === 0) {
                     tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-10 text-gray-500">No new wishlist items to review.</td></tr>`;
                }

            } catch (error) {
                console.error('Error deleting wishlist item:', error);
                showConfirmationModal('Operation Failed', 'Failed to delete wishlist item.');
            }
        }
    );
}


/**
 * Populates the 'Add Book' form when an edit button is clicked.
 * @param {Event} event The click event from the edit button.
 */
function populateAddBookForm(event) {
    const itemRow = event.currentTarget.closest('.wishlist-item');
    const addBookSection = document.getElementById('add-book-section');
    const mainContainer = document.getElementById('main-container');

    // Store the ID of the selected item
    currentWishlistItemId = itemRow.dataset.wishlistId;
    
    // Populate the form
    document.getElementById('title-input').value = itemRow.dataset.title;
    document.getElementById('author-input').value = itemRow.dataset.author;

    // Show the form and adjust layout
    addBookSection.classList.remove('hidden');
    mainContainer.classList.remove('lg:grid-cols-1');
    mainContainer.classList.add('lg:grid-cols-2');
}

/**
 * Handles the submission of the 'Add Book' form to make a wishlist item available.
 * @param {Event} event The form submission event.
 */
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

    // Get all form data
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

    // Basic validation
    if (!newBook.ebook_id || !newBook.title) {
        showConfirmationModal('Validation Error', 'Book ID and Title are required fields.');
        return;
    }

    try {
        // 1. Insert the new book into the 'ebook' table
        const { error: insertError } = await db.from('ebook').insert([newBook]);
        if (insertError) {
            // Handle potential duplicate book ID error
            if (insertError.code === '23505') { // PostgreSQL unique violation
                 throw new Error(`Error adding book: A book with ID "${newBook.ebook_id}" already exists.`);
            }
            throw new Error(`Error adding book: ${insertError.message}`);
        }

        // 2. Update the wishlist item status to 'available' and set processed_by
        const { error: updateError } = await db
            .from('wishlists')
            .update({ status: 'available', processed_by: clerkUser.id })
            .eq('id', currentWishlistItemId);

        if (updateError) {
            // This is a problem. The book was added but the wishlist wasn't updated.
            // A more robust solution would use a database transaction or a server-side function.
            throw new Error(`Book added, but failed to update wishlist status: ${updateError.message}`);
        }

        showConfirmationModal('Success', 'Book successfully added and wishlist updated!');

        // Reset UI
        document.getElementById('add-book-form').reset();
        document.getElementById('add-book-section').classList.add('hidden');
        document.getElementById('main-container').classList.add('lg:grid-cols-1');
        document.getElementById('main-container').classList.remove('lg:grid-cols-2');
        currentWishlistItemId = null;

        // Refresh the wishlist to remove the processed item
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
    const path = window.location.pathname;

    if (path.includes('loginclerk.html')) {
        // ... login page logic
    } else if (path.includes('dashboardclerk.html')) {
        // ... dashboard page logic
    } else if (path.includes('manage-user.html')) {
        // ... manage user page logic
    } else if (path.includes('book-management.html')) {
        // ... book management logic
    } else if (path.includes('wishlist-review.html')) {
        protectedRoute();
        displayWishlist();

        // Use event delegation for edit and delete buttons
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
        
        // Form submission listener
        document.getElementById('add-book-form').addEventListener('submit', addBookFromWishlist);
    }
});
