// popup.js

// Define platforms with their base URLs, API endpoints, and corresponding fetch/display functions
const platforms = {
  github: {
    baseUrl: "https://github.com/",
    apiUrl: "https://api.github.com/users/",
    usernames: [],
    fetchFunction: fetchGitHubData,
    displayFunction: displayGitHubData
  },
  leetcode: {
    baseUrl: "https://leetcode.com/",
    apiUrl: "https://leetcode.com/graphql",
    usernames: [],
    fetchFunction: fetchLeetCodeData,
    displayFunction: displayLeetCodeData
  },
  gfg: {
    baseUrl: "https://auth.geeksforgeeks.org/",
    apiUrl: "https://auth.geeksforgeeks.org/user/profile", // Replace with actual API endpoint if available
    usernames: [],
    fetchFunction: fetchGFGData,
    displayFunction: displayGFGData
}
  // Add more platforms as needed
};

// Initialize the extension when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  loadUsernames();
  setupEventListeners();
});

// Load saved usernames from chrome.storage
function loadUsernames() {
  chrome.storage.sync.get(['platforms'], (result) => {
    if (result.platforms) {
      Object.keys(result.platforms).forEach(platform => {
        if (platforms[platform]) {
          platforms[platform].usernames = result.platforms[platform].usernames || [];
          renderUsernames(platform);
          platforms[platform].displayFunction(platform);
        }
      });
    }
  });
}

// Setup event listeners for Add buttons
function setupEventListeners() {
  // GitHub
  const addGitHubButton = document.getElementById('add-github');
  if (addGitHubButton) {
    addGitHubButton.addEventListener('click', () => {
      addUsername('github');
    });
  }
  
  // LeetCode
  const addLeetCodeButton = document.getElementById('add-leetcode');
  if (addLeetCodeButton) {
    addLeetCodeButton.addEventListener('click', () => {
      addUsername('leetcode');
    });
  }

  // GeeksforGeeks
  const addGFGButton = document.getElementById('add-gfg');
  if (addGFGButton) {
      addGFGButton.addEventListener('click', () => {
          addUsername('gfg');
      });
  }
  
  // Add more event listeners for additional platforms
}

// Add a username to the specified platform
function addUsername(platform) {
  const input = document.getElementById(`${platform}-username`);
  const username = input.value.trim();
  if (username && !platforms[platform].usernames.includes(username)) {
    platforms[platform].usernames.push(username);
    saveUsernames();
    renderUsernames(platform);
    platforms[platform].displayFunction(platform);
    input.value = '';
  }
}

// Save usernames to chrome.storage
function saveUsernames() {
  const storageData = {};
  Object.keys(platforms).forEach(platform => {
    storageData[platform] = {
      usernames: platforms[platform].usernames
    };
  });
  chrome.storage.sync.set({ platforms: storageData }, () => {
    console.log('Usernames saved');
  });
}

// Render the list of usernames for a platform
function renderUsernames(platform) {
  const list = document.getElementById(`${platform}-list`);
  if (!list) return;
  
  list.innerHTML = '';
  platforms[platform].usernames.forEach(username => {
    const listItem = document.createElement('li');
    const link = document.createElement('a');
    link.href = platforms[platform].baseUrl + username;
    link.textContent = username;
    link.target = "_blank";
    listItem.appendChild(link);
    list.appendChild(listItem);
  });
}

// Fetch GitHub user data using the background script
async function fetchGitHubData(username) {
  const url = platforms.github.apiUrl + username;
  try {
    const response = await sendMessageToBackground({ action: 'fetchData', url });
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data;
  } catch (error) {
    throw error;
  }
}

// Fetch LeetCode user data using the background script
async function fetchLeetCodeData(username) {
  const query = `
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        username
        submitStats {
          acSubmissionNum {
            difficulty
            count
            submissions
          }
        }
      }
    }
  `;
  
  const variables = { username };
  
  try {
    const response = await sendMessageToBackground({
      action: 'fetchData',
      url: platforms.leetcode.apiUrl,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables })
    });
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data.data.matchedUser;
  } catch (error) {
    throw error;
  }
}

// Fetch GeeksforGeeks user data using the background script
async function fetchGFGData(username) {
  const url = `${platforms.gfg.apiUrl}/${username}`;
  try {
      const response = await sendMessageToBackground({ action: 'fetchData', url });
      if (response.error) {
          throw new Error(response.error);
      }
      // Assuming the API returns JSON with fields like streaks, questions_solved
      return response.data;
  } catch (error) {
      throw error;
  }
}




// Display GitHub user data in the popup
async function displayGitHubData(platform) {
  const container = document.getElementById(`${platform}-data`);
  if (!container) return;
  
  container.innerHTML = ''; // Clear previous data

  for (const username of platforms[platform].usernames) {
    try {
      const data = await platforms[platform].fetchFunction(username);
      const userDiv = document.createElement('div');
      userDiv.classList.add('user-data');

      userDiv.innerHTML = `
        <h3><a href="${data.html_url}" target="_blank">${data.login}</a></h3>
        <p>Name: ${data.name || 'N/A'}</p>
        <p>Public Repos: ${data.public_repos}</p>
        <p>Followers: ${data.followers}</p>
        <p>Following: ${data.following}</p>
      `;
      container.appendChild(userDiv);
    } catch (error) {
      console.error(error);
      container.innerHTML += `<p class="error">Error fetching data for ${username}: ${error.message}</p>`;
    }
  }
}

// Display LeetCode user data in the popup
async function displayLeetCodeData(platform) {
  const container = document.getElementById(`${platform}-data`);
  if (!container) return;
  
  container.innerHTML = ''; // Clear previous data

  for (const username of platforms[platform].usernames) {
    try {
      const data = await platforms[platform].fetchFunction(username);
      if (!data) {
        throw new Error('User not found');
      }
      const submissionStats = data.submitStats.acSubmissionNum;
      let easy = 0, medium = 0, hard = 0;
      submissionStats.forEach(stat => {
        if (stat.difficulty.toLowerCase() === 'easy') easy = stat.count;
        if (stat.difficulty.toLowerCase() === 'medium') medium = stat.count;
        if (stat.difficulty.toLowerCase() === 'hard') hard = stat.count;
      });

      const userDiv = document.createElement('div');
      userDiv.classList.add('user-data');

      userDiv.innerHTML = `
        <h3><a href="${platforms[platform].baseUrl}${data.username}" target="_blank">${data.username}</a></h3>
        <p>Easy Problems Solved: ${easy}</p>
        <p>Medium Problems Solved: ${medium}</p>
        <p>Hard Problems Solved: ${hard}</p>
      `;
      container.appendChild(userDiv);
    } catch (error) {
      console.error(error);
      container.innerHTML += `<p class="error">Error fetching data for ${username}: ${error.message}</p>`;
    }
  }
}

// Display GeeksforGeeks user data in the popup
async function displayGFGData(platform) {
  const container = document.getElementById(`${platform}-data`);
  if (!container) return;

  container.innerHTML = ''; // Clear previous data

  for (const username of platforms[platform].usernames) {
      try {
          const data = await platforms[platform].fetchFunction(username);
          if (!data) {
              throw new Error('User not found');
          }

          const userDiv = document.createElement('div');
          userDiv.classList.add('user-data');

          // Assuming data has fields: streaks, questions_solved, contributions
          userDiv.innerHTML = `
              <h3><a href="${platforms[platform].baseUrl}${username}" target="_blank">${username}</a></h3>
              <p>Streaks: ${data.streaks || 'N/A'}</p>
              <p>Questions Solved: ${data.questions_solved || 'N/A'}</p>
              <p>Contributions: ${data.contributions || 'N/A'}</p>
          `;
          container.appendChild(userDiv);
      } catch (error) {
          console.error(error);
          container.innerHTML += `<p class="error">Error fetching data for ${username}: ${error.message}</p>`;
      }
  }
}


// Send a message to the background script to perform fetch
function sendMessageToBackground(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}
