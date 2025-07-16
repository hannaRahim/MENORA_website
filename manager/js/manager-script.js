/*
 * =============================================================================
 * Supabase Manager Script (manager-script.js)
 * =============================================================================
 * Description: This script handles all the client-side interactions with the
 * Supabase database for the Manager role. It includes functions
 * for authentication, data fetching for dashboards, reports,
 * and management of other user roles.
 *
 * Instructions:
 * 1. Replace the placeholder Supabase URL and Anon Key with your actual
 * project credentials.
 * 2. Ensure this script is included in all your manager-facing HTML pages.
 * 3. The login function here uses Supabase Auth. You should adapt your
 * loginmanager.html to use this `login` function instead of the
 * hardcoded credentials for a secure application.
 * =============================================================================
 */

// --- 1. SUPABASE INITIALIZATION ---
// Replace with your actual Supabase project URL and Anon Key.
const supabaseUrl = 'https://gnjjqhchzmcwhoelugen.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduampxaGNoem1jd2hvZWx1Z2VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MTM1MDAsImV4cCI6MjA2Nzk4OTUwMH0.U9fzz-njmirRZBGhYmdxj9gPWvIS_srS6vvBf2_5g20';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);


// --- 2. AUTHENTICATION & SESSION MANAGEMENT ---

/**
 * Logs in a user with email and password and verifies their role is 'manager'.
 * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 * @returns {object|null} The user object if login is successful and role is correct, otherwise null.
 */
async function login(email, password) {
    try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (authError) {
            console.error('Authentication error:', authError.message);
            return null;
        }

        if (!authData.user) {
            console.error('Login failed: No user data returned.');
            return null;
        }

        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, name, email, role')
            .eq('id', authData.user.id)
            .single();

        if (userError) {
            console.error('Error fetching user role:', userError.message);
            await logout();
            return null;
        }

        if (userData && userData.role === 'manager') {
            console.log('Manager login successful.');
            localStorage.setItem('loggedInUser', JSON.stringify(userData));
            return userData;
        } else {
            console.warn('Login attempt by non-manager user or user not found.');
            await logout();
            return null;
        }
    } catch (error) {
        console.error('An unexpected error occurred during login:', error.message);
        return null;
    }
}

/**
 * Logs out the current user, clears session data, and redirects to the login page.
 */
async function logout() {
    await supabase.auth.signOut();
    localStorage.removeItem('loggedInUser');
    window.location.href = './loginmanager.html';
}


// --- 3. DASHBOARD STATISTICS & PREVIEWS ---

/**
 * Fetches statistics for the manager dashboard cards.
 * @returns {object} An object containing stats for newSignUps, activeReaders, and booksAdded.
 */
async function getDashboardStats() {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count: newSignUps, error: signUpsError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', thirtyDaysAgo.toISOString());
        if (signUpsError) console.error("Error fetching new sign-ups:", signUpsError.message);

        const { data: activeReadersData, error: readersError } = await supabase
            .from('reading_progress')
            .select('user_id', { count: 'exact' })
            .eq('status', 'reading');
        if (readersError) console.error("Error fetching active readers:", readersError.message);
        const activeReaders = new Set(activeReadersData.map(p => p.user_id)).size;

        const { count: booksAdded, error: booksError } = await supabase
            .from('ebook')
            .select('*', { count: 'exact', head: true });
        if (booksError) console.error("Error fetching book count:", booksError.message);

        return {
            newSignUps: newSignUps || 0,
            activeReaders: activeReaders || 0,
            booksAdded: booksAdded || 0,
        };
    } catch (error) {
        console.error('Error fetching dashboard stats:', error.message);
        return { newSignUps: 0, activeReaders: 0, booksAdded: 0 };
    }
}

/**
 * Fetches a limited list of clerks for the dashboard preview.
 * @param {number} limit - The number of clerks to fetch.
 * @returns {Array} An array of clerk user objects.
 */
async function getClerksPreview(limit = 4) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('name, email')
            .eq('role', 'clerk')
            .limit(limit);
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching clerks preview:', error.message);
        return [];
    }
}

/**
 * Fetches the latest user activity for the dashboard preview.
 * @param {number} limit - The number of activities to fetch.
 * @returns {Array} An array of the latest user activities.
 */
async function getUserActivityPreview(limit = 4) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('name, role, created_at')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching user activity preview:', error.message);
        return [];
    }
}


// --- 4. CLERK MANAGEMENT ---

/**
 * Fetches all users with the 'clerk' role.
 * @returns {Array} An array of clerk user objects.
 */
async function getClerks() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, email, created_at')
            .eq('role', 'clerk');

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
 * Deletes a clerk by their ID.
 * @param {string} clerkId - The UUID of the clerk to delete.
 * @returns {boolean} True if deletion was successful, otherwise false.
 */
async function deleteClerk(clerkId) {
    try {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', clerkId);

        if (error) {
            console.error('Error deleting clerk:', error.message);
            alert(`Failed to delete clerk. Reason: ${error.message}`);
            return false;
        }
        console.log(`Clerk with ID ${clerkId} deleted successfully.`);
        return true;
    } catch (error) {
        console.error('An unexpected error occurred during clerk deletion:', error.message);
        return false;
    }
}


// --- 5. USER ACTIVITY & REPORTS ---

/**
 * Fetches user activity based on provided filters.
 * @param {object} filters - An object containing role, startDate, and endDate.
 * @returns {Array} An array of user objects matching the filters.
 */
async function getUserActivity(filters) {
    try {
        let query = supabase.from('users').select('name, email, role, created_at');

        if (filters.role && filters.role.toLowerCase() !== 'all') {
            query = query.eq('role', filters.role.toLowerCase());
        }
        if (filters.startDate) {
            query = query.gte('created_at', filters.startDate);
        }
        if (filters.endDate) {
            query = query.lte('created_at', filters.endDate);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching user activity:', error.message);
            return [];
        }
        return data;
    } catch (error) {
        console.error('An unexpected error occurred while fetching user activity:', error.message);
        return [];
    }
}

/**
 * Fetches a complete list of all users for reporting.
 * @returns {Array} An array of all user objects.
 */
async function getUsersReport() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, email, role, created_at');

        if (error) {
            console.error('Error fetching users report:', error.message);
            return [];
        }
        return data;
    } catch (error) {
        console.error('An unexpected error occurred while fetching the users report:', error.message);
        return [];
    }
}

/**
 * Fetches a complete list of all books for reporting.
 * @returns {Array} An array of all book objects.
 */
async function getBooksReport() {
    try {
        const { data, error } = await supabase
            .from('ebook')
            .select('*');

        if (error) {
            console.error('Error fetching books report:', error.message);
            return [];
        }
        return data;
    } catch (error) {
        console.error('An unexpected error occurred while fetching the books report:', error.message);
        return [];
    }
}
