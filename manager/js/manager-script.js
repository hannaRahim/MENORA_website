/*
 * --------------------------------------------------------------------
 * Supabase Manager Script
 * --------------------------------------------------------------------
 * This script handles all interactions with the Supabase database
 * for the manager-specific pages of the Menora application.
 *
 * It includes functions for:
 * - Authentication (Login, Logout)
 * - Fetching dashboard statistics
 * - Managing clerk accounts
 * - Generating user and book reports
 * - Fetching user activity logs
 * --------------------------------------------------------------------
 */

// 1. SUPABASE CLIENT INITIALIZATION
// --------------------------------------------------------------------
// !! IMPORTANT !!
// YOU MUST REPLACE THESE VALUES WITH YOUR OWN SUPABASE PROJECT DETAILS
// Get these from your Supabase Project Settings > API
const SUPABASE_URL = 'https://gnjjqhchzmcwhoelugen.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduampxaGNoem1jd2hvZWx1Z2VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MTM1MDAsImV4cCI6MjA2Nzk4OTUwMH0.U9fzz-njmirRZBGhYmdxj9gPWvIS_srS6vvBf2_5g20'; 

// Create a single Supabase client for interacting with your database
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// --------------------------------------------------------------------
// 2. AUTHENTICATION FUNCTIONS
// --------------------------------------------------------------------

/**
 * Logs in a user and verifies they have the 'manager' role.
 * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 * @returns {object|null} The user object if login is successful and role is correct, otherwise null.
 */
async function loginManager(email, password) {
    try {
        // Query the 'users' table using email and password
        const { data: userData, error } = await supabase
            .from('users')
            .select('id, name, email, role')
            .eq('email', email)
            .eq('password', password) // ⚠️ assuming plain text password
            .single(); // We expect only one user

        if (error) {
            console.error('Login error:', error.message);
            return null;
        }

        // Check if user is a manager
        if (userData && userData.role.toLowerCase() === 'manager') {
            console.log('Manager login successful:', userData);
            localStorage.setItem('loggedInUser', JSON.stringify(userData));
            return userData;
        } else {
            console.warn('User is not a manager.');
            return null;
        }
    } catch (error) {
        console.error('Unexpected error during login:', error.message);
        return null;
    }
}

/**
 * Logs the current user out.
 */
async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Logout Error:', error.message);
    }
    // Clear user data from localStorage and redirect to login page
    localStorage.removeItem('loggedInUser');
    window.location.href = "./loginmanager.html";
}


// --------------------------------------------------------------------
// 3. DASHBOARD FUNCTIONS (`dashboardmanager.html`)
// --------------------------------------------------------------------

/**
 * Fetches statistics for the manager dashboard.
 * @returns {object} An object containing dashboard stats.
 */
async function getDashboardStats() {
    try {
        // Get the date 7 days ago to count "new" sign-ups
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        // Fetch all data in parallel for efficiency
        const [newSignUps, activeReaders, booksAdded] = await Promise.all([
            // a) Count users created in the last 7 days
            supabase.from('users').select('id', { count: 'exact' }).gte('created_at', sevenDaysAgo),
            // b) Count distinct users with 'reading' status
            supabase.from('reading_progress').select('user_id', { count: 'exact', head: true }).eq('status', 'reading'),
            // c) Count all books in the ebook table
            supabase.from('ebook').select('ebook_id', { count: 'exact', head: true })
        ]);

        if (newSignUps.error) console.error("Error fetching new sign-ups:", newSignUps.error.message);
        if (activeReaders.error) console.error("Error fetching active readers:", activeReaders.error.message);
        if (booksAdded.error) console.error("Error fetching book count:", booksAdded.error.message);

        return {
            newSignUps: newSignUps.count ?? 0,
            activeReaders: activeReaders.count ?? 0,
            booksAdded: booksAdded.count ?? 0,
        };
    } catch (error) {
        console.error('Failed to fetch dashboard stats:', error.message);
        return { newSignUps: 0, activeReaders: 0, booksAdded: 0 };
    }
}


// --------------------------------------------------------------------
// 4. CLERK MANAGEMENT FUNCTIONS (`manage-clerk.html`)
// --------------------------------------------------------------------

/**
 * Fetches all users with the 'clerk' role.
 * @returns {Array} A list of clerk users.
 */
async function getClerks() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, email, created_at')
            .eq('role', 'clerk')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching clerks:', error.message);
            return [];
        }
        return data;
    } catch (error) {
        console.error('An unexpected error occurred while fetching clerks:', error.message);
        return [];
    }
}

/**
 * Deletes a clerk user.
 * NOTE: This requires admin privileges and should be handled with care.
 * Deleting a user can have cascading effects on related data.
 * It's often safer to "deactivate" a user than to delete them.
 * @param {string} clerkId - The UUID of the clerk to delete.
 * @returns {boolean} True if deletion was successful, otherwise false.
 */
async function deleteClerk(clerkId) {
    try {
        // To delete a user, you need to use the admin client.
        // This function assumes the manager has the necessary rights.
        // In a real-world scenario, you would call a secure Edge Function (RPC)
        // that performs this action after verifying permissions.
        const { data, error } = await supabase.auth.admin.deleteUser(clerkId);

        if (error) {
            console.error('Error deleting clerk:', error.message);
            alert(`Error: ${error.message}`); // Provide feedback to the UI
            return false;
        }
        console.log('Clerk deleted successfully:', data);
        return true;
    } catch (error) {
        console.error('An unexpected error occurred while deleting a clerk:', error.message);
        alert('An unexpected error occurred. See console for details.');
        return false;
    }
}


// --------------------------------------------------------------------
// 5. REPORTING FUNCTIONS (`generate-report.html`)
// --------------------------------------------------------------------

/**
 * Fetches all users for generating a report.
 * @returns {Array} A list of all users.
 */
async function getUsersReport() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching users for report:', error.message);
        return [];
    }
}

/**
 * Fetches all books for generating a report.
 * @returns {Array} A list of all books.
 */
async function getBooksReport() {
    try {
        const { data, error } = await supabase
            .from('ebook')
            .select('*')
            .order('year_published', { ascending: false });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching books for report:', error.message);
        return [];
    }
}

// --------------------------------------------------------------------
// 6. USER ACTIVITY FUNCTIONS (`user-activity.html`)
// --------------------------------------------------------------------

/**
 * Fetches user activity data based on filters.
 * For this example, we'll just fetch user sign-up data.
 * A real implementation could join multiple tables (reviews, reading_progress).
 * @param {object} filters - The filters to apply.
 * @param {string} [filters.role] - Filter by user role ('clerk', 'reader').
 * @param {string} [filters.startDate] - The start of the date range.
 * @param {string} [filters.endDate] - The end of the date range.
 * @returns {Array} A list of user activity records.
 */
async function getUserActivity(filters = {}) {
    try {
        let query = supabase.from('users').select('id, name, email, role, created_at');

        // Apply filters
        if (filters.role && filters.role !== 'All') {
            query = query.eq('role', filters.role.toLowerCase());
        }
        if (filters.startDate) {
            query = query.gte('created_at', filters.startDate);
        }
        if (filters.endDate) {
            // Add 1 day to the end date to make it inclusive
            const inclusiveEndDate = new Date(filters.endDate);
            inclusiveEndDate.setDate(inclusiveEndDate.getDate() + 1);
            query = query.lte('created_at', inclusiveEndDate.toISOString());
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        return data;

    } catch (error) {
        console.error('Error fetching user activity:', error.message);
        return [];
    }
}
