const fs = require('fs');
const path = require('path');
const https = require('https');

const GITHUB_TOKEN = process.argv[2];
const REPO_NAME = 'simorgh-lifeos-android';
const PROJECT_DIR = 'c:/Users/SYeD Hadi Mosavi/Downloads/jarvis-3d-human-face-v10/simorgh-lifeos-android';

function githubApi(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint.startsWith('http') ? endpoint : `https://api.github.com${endpoint}`);
    const postBody = data ? JSON.stringify(data) : null;
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'User-Agent': 'Simorgh-LifeOS-Uploader',
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        ...(postBody ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postBody) } : {})
      }
    };

    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json;
        try { json = JSON.parse(body); } catch { json = body; }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(json);
        } else {
          reject({ status: res.statusCode, body: json });
        }
      });
    });

    req.on('error', reject);
    if (postBody) req.write(postBody);
    req.end();
  });
}

function walk(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    if (item === '.git' || item === 'build' || item === '.gradle' || item === 'test-suite.js' || item === 'audit-logic.js') continue;
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      files = files.concat(walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  console.log('1. Checking GitHub user authentication...');
  const user = await githubApi('/user');
  console.log(`Authenticated as GitHub user: @${user.login} (${user.name || ''})`);

  console.log(`2. Creating public repository '${REPO_NAME}'...`);
  let repo;
  try {
    repo = await githubApi('/user/repos', 'POST', {
      name: REPO_NAME,
      description: 'Simorgh LifeOS — سوپراپلیکیشن آفلاین و هوشمند مدیریت دخل‌وخرج، پیامک‌های بانکی و زندگی روزمره | سازنده: سید هادی موسوی',
      private: false,
      auto_init: true
    });
    console.log(`Repository created: ${repo.html_url}`);
  } catch (err) {
    if (err.status === 422) {
      console.log(`Repository '${REPO_NAME}' already exists, fetching existing repo...`);
      repo = await githubApi(`/repos/${user.login}/${REPO_NAME}`);
      console.log(`Existing repository: ${repo.html_url}`);
    } else {
      throw err;
    }
  }

  // Wait 2 seconds for initial commit if auto_init was used
  await new Promise(r => setTimeout(r, 2000));

  console.log('3. Fetching main branch ref...');
  let defaultBranch = repo.default_branch || 'main';
  let refData;
  try {
    refData = await githubApi(`/repos/${user.login}/${REPO_NAME}/git/ref/heads/${defaultBranch}`);
  } catch (err) {
    defaultBranch = 'master';
    refData = await githubApi(`/repos/${user.login}/${REPO_NAME}/git/ref/heads/${defaultBranch}`);
  }
  const baseCommitSha = refData.object.sha;
  console.log(`Base commit: ${baseCommitSha} on branch ${defaultBranch}`);

  console.log('4. Scanning project files...');
  const localFiles = walk(PROJECT_DIR);
  console.log(`Found ${localFiles.length} files to upload.`);

  console.log('5. Creating Git Blobs...');
  const treeItems = [];
  let count = 0;
  for (const f of localFiles) {
    const relPath = path.relative(PROJECT_DIR, f).replace(/\\/g, '/');
    const contentBuffer = fs.readFileSync(f);
    // Check if binary or text
    const isBinary = contentBuffer.includes(0);
    const blobPayload = isBinary
      ? { content: contentBuffer.toString('base64'), encoding: 'base64' }
      : { content: contentBuffer.toString('utf8'), encoding: 'utf-8' };

    const blob = await githubApi(`/repos/${user.login}/${REPO_NAME}/git/blobs`, 'POST', blobPayload);
    treeItems.push({
      path: relPath,
      mode: '100644',
      type: 'blob',
      sha: blob.sha
    });
    count++;
    if (count % 5 === 0 || count === localFiles.length) {
      console.log(`Uploaded blobs: ${count}/${localFiles.length}`);
    }
  }

  console.log('6. Creating Git Tree...');
  const tree = await githubApi(`/repos/${user.login}/${REPO_NAME}/git/trees`, 'POST', {
    tree: treeItems
  });
  console.log(`Tree created: ${tree.sha}`);

  console.log('7. Creating Git Commit...');
  const commit = await githubApi(`/repos/${user.login}/${REPO_NAME}/git/commits`, 'POST', {
    message: 'Initial commit: Simorgh LifeOS Android source code and GitHub Actions APK build workflow\n\nCreator: Syed Hadi Mosavi (سید هادی موسوی)\nCompany: Simorgh Co. (شرکت سیمرغ)',
    tree: tree.sha,
    parents: [baseCommitSha]
  });
  console.log(`Commit created: ${commit.sha}`);

  console.log('8. Updating branch ref...');
  await githubApi(`/repos/${user.login}/${REPO_NAME}/git/refs/heads/${defaultBranch}`, 'PATCH', {
    sha: commit.sha,
    force: true
  });

  console.log('\n=============================================');
  console.log('SUCCESS! Simorgh LifeOS successfully pushed!');
  console.log(`Repository URL: ${repo.html_url}`);
  console.log(`GitHub Actions URL: ${repo.html_url}/actions`);
  console.log('=============================================');
}

main().catch(err => {
  console.error('Error during GitHub push:', err);
  process.exit(1);
});
