// Copy and paste this script into your browser's console when on the purchase orders page
// to help debug why purchase orders aren't showing up

console.log("=== PURCHASE ORDER DEBUG SCRIPT ===");

// 1. Check if the purchase orders are actually in the state
(function() {
  // Look for React DevTools
  const reactInstance = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (reactInstance) {
    console.log("React DevTools detected. You can use React DevTools to inspect component state.");
  } else {
    console.log("React DevTools not detected. Install React DevTools extension for better debugging.");
  }
  
  // Try to find purchase orders in global scope variables
  const purchaseOrdersStateFound = !!window._purchaseOrders;
  console.log("PurchaseOrders in global state:", purchaseOrdersStateFound);
})();

// 2. Check for permission/authentication issues
(function() {
  const token = localStorage.getItem('supabase.auth.token');
  console.log("Auth token exists:", !!token);
  
  const session = localStorage.getItem('supabase-auth');
  console.log("Session exists:", !!session);
  
  if (session) {
    try {
      const sessionData = JSON.parse(session);
      console.log("User authenticated:", !!sessionData?.currentSession);
      console.log("User role:", sessionData?.currentSession?.user?.role);
      console.log("Session expiry:", new Date(sessionData?.currentSession?.expires_at * 1000).toLocaleString());
      const isExpired = sessionData?.currentSession?.expires_at * 1000 < Date.now();
      console.log("Session expired:", isExpired);
    } catch (e) {
      console.log("Error parsing session:", e);
    }
  }
})();

// 3. Gather information about current project
(function() {
  // Look for project ID in URL or page content
  const url = window.location.href;
  console.log("Current URL:", url);
  
  const projectIdMatch = url.match(/project\/([^\/]+)/);
  if (projectIdMatch) {
    console.log("Project ID from URL:", projectIdMatch[1]);
  }
  
  // Look for any Purchase Order API calls in the recent network requests
  if (window.performance && window.performance.getEntries) {
    const apiCalls = window.performance.getEntries()
      .filter(entry => entry.name.includes('purchase_orders'))
      .map(entry => ({
        url: entry.name,
        duration: entry.duration,
        startTime: entry.startTime,
        type: entry.entryType
      }));
    
    console.log("Recent purchase order API calls:", apiCalls);
  }
})();

// 4. Test fetchPurchaseOrders function if available
(function() {
  if (window.fetchPurchaseOrders) {
    console.log("Found fetchPurchaseOrders function, testing...");
    try {
      // Get project ID from URL if possible
      const url = window.location.href;
      const projectIdMatch = url.match(/project\/([^\/]+)/);
      const projectId = projectIdMatch ? projectIdMatch[1] : null;
      
      if (projectId) {
        console.log(`Testing fetchPurchaseOrders with project ID: ${projectId}`);
        window.fetchPurchaseOrders(projectId)
          .then(result => {
            console.log("fetchPurchaseOrders direct test result:", result);
          })
          .catch(err => {
            console.error("Error testing fetchPurchaseOrders:", err);
          });
      }
    } catch (e) {
      console.error("Error running fetchPurchaseOrders test:", e);
    }
  } else {
    console.log("fetchPurchaseOrders function not available globally");
  }
})();

console.log("=== END DEBUG SCRIPT ===");
console.log("Check the above output for clues about why purchase orders aren't showing");
console.log("Also check for any errors in red in the console output"); 