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

                // Construct app object
                const appObject = {
                    id: appId,
                    name: name,
                    publisher: publisher,
                    description: finalDescription,
                    category: finalCategory,
                    featured: existing.featured || false, // Preserve featured status
                    version: version,
                    icon: `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${APPS_PATH}/${appId}/icon.png`,
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

    } catch (err) {
        console.error('Fatal error updating apps:', err);
    }
}

updateApps();
