// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchData') {
      fetch(request.url, {
        method: request.method || 'GET',
        headers: request.headers || {},
        body: request.body || null,
        mode: 'cors' 
        
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          // Check if response is JSON
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.indexOf("application/json") !== -1) {
            return response.json();
          } else {
            return response.text();
          }
        })
        .then(data => {
          sendResponse({ data });
        })
        .catch(error => {
          sendResponse({ error: error.message });
        });
      return true;
    }
  });
  
