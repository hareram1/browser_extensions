let message = document.getElementById("message");
let icon = document.getElementById("icon");

// Check if the page is using HTTPS
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  let currentTabUrl = tabs[0].url;

  if (currentTabUrl.startsWith("https://")) {
    message.textContent = "This page is secure (HTTPS).";
    message.style.color = "#28a745"; // Green
    icon.src = "images/icon48.png";
  } else {
    message.textContent = "This page is not secure (HTTP).";
    message.style.color = "#dc3545"; // Red
    icon.src = "images/icon48-red.png";
  }

  // Check for Mixed Content (insecure content on an HTTPS page)
  chrome.tabs.executeScript({
    code: `
      let mixedContent = Array.from(document.querySelectorAll("img[src^='http:'], script[src^='http:'], link[href^='http:']")).length > 0;
      mixedContent;
    `
  }, (results) => {
    if (results[0]) {
      message.textContent += "\nThis page has mixed content!";
      message.style.color = "#ff9900"; // Warning color
      icon.src = "images/icon48-warning.png";
    }
  });

  // Check for insecure login forms (using HTTP for form submission)
  chrome.tabs.executeScript({
    code: `
      let forms = Array.from(document.querySelectorAll("form"));
      let insecureForms = forms.filter(form => form.action && !form.action.startsWith('https'));
      insecureForms.length;
    `
  }, (results) => {
    if (results[0] > 0) {
      message.textContent += "\nWarning: Insecure login form detected!";
      message.style.color = "#ff3300"; // Alert color
      icon.src = "images/icon48-alert.png";
    }
  });

  // Safe Browsing API check for unsafe URLs
  fetch("https://safebrowsing.googleapis.com/v4/threatMatches:find?key=YOUR_API_KEY", {
    method: "POST",
    body: JSON.stringify({
      client: {
        clientId: "pageSecurityChecker",
        clientVersion: "2.0"
      },
      threatInfo: {
        threatTypes: ["MALWARE", "SOCIAL_ENGINEERING"],
        platformTypes: ["ANY_PLATFORM"],
        threatEntryTypes: ["URL"],
        threatEntries: [
          { url: currentTabUrl }
        ]
      }
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.matches) {
      message.textContent += "\nWarning: This page is flagged as unsafe!";
      message.style.color = "#ff0000"; // Red for danger
      icon.src = "images/icon48-danger.png";
    }
  });

  // Check for tracking scripts
  chrome.tabs.executeScript({
    code: `
      let trackingScripts = Array.from(document.querySelectorAll("script[src]")).filter(script =>
        script.src.includes("google-analytics") || script.src.includes("facebook.com/tr"));
      trackingScripts.length;
    `
  }, (results) => {
    if (results[0] > 0) {
      message.textContent += "\nThis page contains tracking scripts!";
      message.style.color = "#ff6600"; // Warning color
      icon.src = "images/icon48-tracking.png"; // Tracking warning icon
    }
  });
});
