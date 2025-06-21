// Authentication Debug Tool
// Copy and paste this in browser console to check auth status

async function checkAuth() {
  try {
    // Get auth configuration from environment
    const supabaseUrl = document.querySelector('meta[name="supabase-url"]')?.content 
      || window.ENV_SUPABASE_URL;
    
    const supabaseKey = document.querySelector('meta[name="supabase-anon-key"]')?.content 
      || window.ENV_SUPABASE_ANON_KEY;
    
    console.log('Checking auth status with URL:', supabaseUrl ? `${supabaseUrl.substring(0, 15)}...` : 'Not found');
    
    if (!supabaseUrl || !supabaseKey) {
      return {
        status: 'error',
        message: 'Supabase configuration not found on page',
        url: !!supabaseUrl,
        key: !!supabaseKey
      };
    }
    
    // Check session cookie
    const hasCookies = document.cookie.includes('supabase');
    
    // Auto-detect Supabase client if available in window
    const client = window.supabase;
    
    if (!client) {
      return {
        status: 'error',
        message: 'Supabase client not found in window object',
        hasCookies
      };
    }
    
    // Try to get session
    const { data, error } = await client.auth.getSession();
    
    if (error) {
      return {
        status: 'error',
        message: error.message,
        hasCookies
      };
    }
    
    if (!data.session) {
      return { 
        status: 'unauthenticated',
        message: 'No active session found',
        hasCookies
      };
    }
    
    return {
      status: 'authenticated',
      user: {
        id: data.session.user.id,
        email: data.session.user.email,
        expires_at: new Date(data.session.expires_at * 1000).toISOString()
      },
      hasCookies
    };
  } catch (err) {
    return {
      status: 'error',
      message: err.message,
      stack: err.stack
    };
  }
}

// Execute and print results
checkAuth().then(result => {
  console.log('🔐 Authentication Status:');
  console.table(result);
  
  if (result.status === 'authenticated') {
    console.log('✅ You are authenticated!');
  } else if (result.status === 'unauthenticated') {
    console.log('❌ You are NOT authenticated. Please log in.');
    console.log('▶️ Navigate to /login to sign in');
  } else {
    console.log('⚠️ Error checking authentication.');
    console.log('▶️ Try logging out and back in');
  }
});

// Helper function to clear auth data and reload
function clearAuthAndReload() {
  localStorage.removeItem('supabase.auth.token');
  document.cookie.split(';').forEach(c => {
    document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
  });
  console.log('🧹 Auth data cleared. Reloading...');
  setTimeout(() => window.location.reload(), 1000);
} 