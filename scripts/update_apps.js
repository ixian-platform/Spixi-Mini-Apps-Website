const fs = require('fs');
const path = require('path');
const https = require('https');

const GITHUB_OWNER = 'ixian-platform';
const GITHUB_REPO = 'Spixi-Mini-Apps';
const GITHUB_BRANCH = 'master';
const APPS_PATH = 'apps';
const APPS_JSON_PATH = path.join(__dirname, '../data/apps.json');

// Helper to fetch JSON from URL
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Node.js' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
          }
        } else {
          reject(new Error(`Request failed with status ${res.statusCode}: ${url}`));
        }
      });
    }).on('error', reject);
  });
}

// Helper to fetch text from URL
function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Node.js' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          // Try to handle 404 gracefully if needed, but for appinfo it should exist
          reject(new Error(`Request failed with status ${res.statusCode}: ${url}`));
        }
      });
    }).on('error', reject);
  });
}

// Parse .spixi key-value format
function parseSpixiFile(content) {
  const lines = content.split('\n');
  const data = {};
  for (const line of lines) {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      data[key] = value;
    }
  }
  return data;
}

async function updateApps() {
  console.log('Starting apps update...');

  // 1. Read existing apps.json to preserve descriptions/categories if needed
  let existingApps = {};
  let existingCategories = ["All", "AI", "Games", "IoT", "Tools", "Dev Tools"];
  if (fs.existsSync(APPS_JSON_PATH)) {
    try {
      const fileContent = fs.readFileSync(APPS_JSON_PATH, 'utf8');
      const json = JSON.parse(fileContent);
      existingApps = json.apps.reduce((acc, app) => {
        acc[app.id] = app;
        return acc;
      }, {});
      if (json.categories) existingCategories = json.categories;
    } catch (e) {
      console.warn('Could not read existing apps.json:', e.message);
    }
  }

  // 2. Fetch list of apps from GitHub contents API
  // https://api.github.com/repos/ixian-platform/Spixi-Mini-Apps/contents/apps
  const contentsUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${APPS_PATH}`;
  console.log(`Fetching app list from ${contentsUrl}...`);

  try {
    const contents = await fetchJson(contentsUrl);
    const appDirs = contents.filter(item => item.type === 'dir');

    const newAppsList = [];

    for (const dir of appDirs) {
      const appId = dir.name;
      console.log(`Processing ${appId}...`);

      // 3. Fetch appinfo.spixi
      const appInfoUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${APPS_PATH}/${appId}/appinfo.spixi`;

      try {
        const spixiContent = await fetchText(appInfoUrl);
        const spixiData = parseSpixiFile(spixiContent);

        // Meta from .spixi
        const name = spixiData.name || appId;
        const publisher = spixiData.publisher || 'Unknown';
        const version = spixiData.version || '0.0.0';
        const description = spixiData.description; // Might be undefined

        // Fallback to existing data for description and category
        const existing = existingApps[appId] || {};
        const finalDescription = description || existing.description || 'No description available.';
        const finalCategory = existing.category || 'Tools'; // Default to Tools

        // Validate icon URL
        const iconUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${APPS_PATH}/${appId}/icon.png`;
        let validIcon = iconUrl;
        try {
          // Check if icon exists (HEAD request)
          await checkUrlExists(iconUrl);
        } catch (e) {
          console.warn(`Icon missing for ${appId}, using placeholder.`);
          validIcon = 'assets/images/placeholder-app.png';
        }

        // Construct app object
        const appObject = {
          id: appId,
          name: name,
          publisher: publisher,
          description: finalDescription,
          category: finalCategory,
          featured: existing.featured || false, // Preserve featured status
          version: version,
          icon: validIcon,
          spixiUrl: `spixi://app/${appId}`,
          github: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/tree/${GITHUB_BRANCH}/${APPS_PATH}/${appId}`
        };

        newAppsList.push(appObject);

      } catch (err) {
        console.error(`Failed to process ${appId}:`, err.message);
        // If we fail to fetch remote info, maybe keep the existing one if it exists? 
        // For now, let's skip it to ensure clean data from source-of-truth.
      }
    }

    // 4. Save to apps.json
    const output = {
      apps: newAppsList,
      categories: existingCategories
    };

    fs.writeFileSync(APPS_JSON_PATH, JSON.stringify(output, null, 2));
    console.log(`Successfully updated apps.json with ${newAppsList.length} apps.`);

    // 5. Inject into index.html (SSG)
    injectIntoIndexHtml(output);

  } catch (err) {
    console.error('Fatal error updating apps:', err);
    process.exit(1);
  }
}

function injectIntoIndexHtml(data) {
  const INDEX_PATH = path.join(__dirname, '../index.html');
  if (!fs.existsSync(INDEX_PATH)) {
    console.error('index.html not found, skipping SSG injection.');
    return;
  }

  let html = fs.readFileSync(INDEX_PATH, 'utf8');

  // 1. Inject Data
  const scriptTag = `<script>window.SPIXI_APPS = ${JSON.stringify(data)};</script>`;
  // Replace old injection or placeholder
  const dataMarker = '<!-- SPIXI_APPS_DATA -->';
  if (html.includes(dataMarker)) {
    html = html.replace(dataMarker, scriptTag + '\n' + dataMarker); // Keep marker for future updates? Or just replace. Let's replace but keeping a marker might be useful if we run this locally multiple times.
    // Actually, better to use a precise replacement regex or marker.
    // Let's replace the marker with the script AND the marker, so it stays for next time?
    // No, if we commit index.html, it will have the data.
    // The user wants "hardcode... app list will only change when i commit".
    // Use a standard replacement.
    html = html.replace(dataMarker, `${scriptTag}\n${dataMarker}`);
  } else if (html.includes('window.SPIXI_APPS =')) {
    // Regex replace existing data
    html = html.replace(/<script>window\.SPIXI_APPS = .*?<\/script>/s, scriptTag);
  }

  // 2. Pre-render Featured Apps
  const featuredApps = data.apps.filter(app => app.featured);
  const featuredHtml = featuredApps.map(app => createAppCardHtml(app)).join('');

  // Inject into carousel
  // Look for <div class="featured__carousel">...</div>
  const carouselRegex = /(<div class="featured__carousel">)([\s\S]*?)(<\/div>)/;
  html = html.replace(carouselRegex, `$1${featuredHtml}$3`);

  fs.writeFileSync(INDEX_PATH, html, 'utf8');
  console.log('Successfully injected apps into index.html');
}

// Server-side version of createAppCard (must match app.js structure)
function createAppCardHtml(app) {
  const githubLink = app.github
    ? `<a href="${app.github}" class="app-card__github" target="_blank" rel="noopener noreferrer" aria-label="View on GitHub">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256" fill="currentColor">
          <path d="M208.31,75.68A59.78,59.78,0,0,0,202.93,28,8,8,0,0,0,196,24a59.75,59.75,0,0,0-48,24H108A59.75,59.75,0,0,0,60,24a8,8,0,0,0-6.93,4,59.78,59.78,0,0,0-5.38,47.68A58.14,58.14,0,0,0,40,104v8a56.06,56.06,0,0,0,48.44,55.47A39.8,39.8,0,0,0,80,192v8H72a24,24,0,0,1-24-24A40,40,0,0,0,8,136a8,8,0,0,0,0,16,24,24,0,0,1,24,24,40,40,0,0,0,40,40h8v16a8,8,0,0,0,16,0V192a24,24,0,0,1,48,0v40a8,8,0,0,0,16,0V192a39.8,39.8,0,0,0-8.44-24.53A56.06,56.06,0,0,0,200,112v-8A58.14,58.14,0,0,0,208.31,75.68ZM184,112a40,40,0,0,1-40,40H112a40,40,0,0,1-40-40v-8a41.74,41.74,0,0,1,6.9-22.48A8,8,0,0,0,80,73.55a43.81,43.81,0,0,1,.79-33.58,43.88,43.88,0,0,1,32.32,20.06A8,8,0,0,0,119.82,64h16.36a8,8,0,0,0,6.71-3.97,43.88,43.88,0,0,1,32.32-20.06A43.81,43.81,0,0,1,176,73.55a8,8,0,0,0,1.1,7.97A41.74,41.74,0,0,1,184,104Z"/>
        </svg>
      </a>`
    : '';

  const websiteLink = app.website || 'https://spixi.io';
  // Note: Assuming websiteLink logic same as app.js (fallback to spixi.io)
  const webLink = `<a href="${websiteLink}" class="app-card__github" target="_blank" rel="noopener noreferrer" aria-label="Visit Website">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256" fill="currentColor">
        <path d="M128,24h0A104,104,0,1,0,232,128,104.12,104.12,0,0,0,128,24Zm78.36,64H170.71a135.28,135.28,0,0,0-22.3-45.6A88.29,88.29,0,0,1,206.37,88ZM216,128a87.61,87.61,0,0,1-3.33,24H174.16a157.44,157.44,0,0,0,0-48h38.51A87.61,87.61,0,0,1,216,128ZM128,43a115.27,115.27,0,0,1,26,45H102A115.11,115.11,0,0,1,128,43ZM102,168H154a115.11,115.11,0,0,1-26,45A115.27,115.27,0,0,1,102,168Zm-3.9-16a140.84,140.84,0,0,1,0-48h59.88a140.84,140.84,0,0,1,0,48Zm50.35,61.6a135.28,135.28,0,0,0,22.3-45.6h35.66A88.29,88.29,0,0,1,148.41,213.6Z"/>
      </svg>
    </a>`;

  let userCapabilityIcons = '';
  if (app.singleUser || app.multiUser) {
    userCapabilityIcons = '<div class="app-card__user-capabilities">';
    if (app.singleUser) {
      userCapabilityIcons += `
        <div class="app-card__user-icon" title="Single User">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor">
            <path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z"/>
          </svg>
        </div>`;
    }
    if (app.multiUser) {
      userCapabilityIcons += `
        <div class="app-card__user-icon" title="Multi User">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor">
            <path d="M117.25,157.92a60,60,0,1,0-66.5,0A95.83,95.83,0,0,0,3.53,195.63a8,8,0,1,0,13.4,8.74,80,80,0,0,1,134.14,0,8,8,0,0,0,13.4-8.74A95.83,95.83,0,0,0,117.25,157.92ZM40,108a44,44,0,1,1,44,44A44.05,44.05,0,0,1,40,108Zm210.14,98.7a8,8,0,0,1-11.07-2.33A79.83,79.83,0,0,0,172,168a8,8,0,0,1,0-16,44,44,0,1,0-16.34-84.87,8,8,0,1,1-5.94-14.85,60,60,0,0,1,55.53,105.64,95.83,95.83,0,0,1,47.22,37.71A8,8,0,0,1,250.14,206.7Z"/>
          </svg>
        </div>`;
    }
    userCapabilityIcons += '</div>';
  }

  const actionUrl = app.spixiUrl || (app.files && app.files.spixi) || '#';

  return `
    <article class="app-card">
      <div class="app-card__header">
        <img class="app-card__icon" src="${app.icon}" alt="${app.name}" onerror="this.src='assets/images/placeholder-app.png'">
        <div class="app-card__header-right">
          ${userCapabilityIcons}
          <span class="badge">${app.category}</span>
        </div>
      </div>
      <div class="app-card__content">
        <div class="app-card__details">
          <div class="app-card__meta">
            <h3 class="app-card__title">${app.name}</h3>
            <p class="app-card__publisher">${app.publisher}</p>
          </div>
          <p class="app-card__description">${app.description}</p>
          ${app.version ? `<span class="app-card__version">v${app.version}</span>` : ''}
        </div>
      </div>
      <div class="app-card__footer">
        <a href="${actionUrl}" class="btn btn-sm btn-outlined">
          <span class="btn__label">Try in Spixi</span>
          <span class="btn__icon btn__icon--trailing">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor">
              <path d="M200,64V168a8,8,0,0,1-16,0V83.31L69.66,197.66a8,8,0,0,1-11.32-11.32L172.69,72H88a8,8,0,0,1,0-16H192A8,8,0,0,1,200,64Z"/>
            </svg>
          </span>
        </a>
        <div class="app-card__actions">
          ${webLink}
          ${githubLink}
        </div>
      </div>
    </article>
  `;
}

updateApps();
