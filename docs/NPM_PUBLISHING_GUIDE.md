# Publishing Your Codex-Enabled Claude Flow to npm

## 🎯 Goal
Publish your own version with Codex support so you can use:
```bash
npx @yourname/claude-flow task create general "task" --provider codex
```

## 📦 Two Options

### Option 1: Scoped Package (Recommended) ✅

**Pros:**
- Free on npm
- No naming conflicts
- Can have same command name
- Professional looking

**Package name:** `@yourname/claude-flow`
**Usage:** `npx @yourname/claude-flow ...`

### Option 2: Different Package Name

**Pros:**
- Shorter to type
- No scope needed

**Package name:** `claude-flow-codex` or `yourname-claude-flow`
**Usage:** `npx claude-flow-codex ...`

---

## 🚀 Method 1: Scoped Package (Recommended)

### Step 1: Update package.json

```bash
# Edit package.json
code package.json
```

Change these fields:

```json
{
  "name": "@beckett/claude-flow",  // Changed from "claude-flow"
  "version": "2.5.0-codex.1",      // Changed to avoid confusion
  "description": "Claude Flow with Codex integration - Enterprise AI orchestration",
  "bin": {
    "claude-flow": "bin/claude-flow.js"  // Keep the same command name!
  },
  // ... rest stays the same
}
```

### Step 2: Create npm Account (if needed)

```bash
# Check if you're logged in
npm whoami

# If not logged in, create account and login
npm adduser
# Or if you have an account:
npm login
```

### Step 3: Build Your Package

```bash
npm run build
```

### Step 4: Publish to npm

```bash
# For scoped packages, you need to specify public access
npm publish --access public

# Or for beta/alpha versions:
npm publish --access public --tag codex-beta
```

### Step 5: Use From Anywhere!

```bash
# Now from any directory:
npx @beckett/claude-flow task create general "test" --provider codex

# Or install globally:
npm install -g @beckett/claude-flow
claude-flow task create general "test" --provider codex
```

---

## 🔄 Method 2: Different Package Name

### Step 1: Update package.json

```json
{
  "name": "claude-flow-codex",     // New unique name
  "version": "1.0.0",              // Start fresh
  "description": "Claude Flow with Codex integration",
  "bin": {
    "claude-flow-codex": "bin/claude-flow.js"  // Different command name
  },
  // ... rest stays the same
}
```

### Step 2: Update Binary References

```bash
# Update bin/claude-flow.js references if needed
# Usually this works automatically
```

### Step 3: Publish

```bash
npm run build
npm publish
```

### Step 4: Use From Anywhere

```bash
npx claude-flow-codex task create general "test" --provider codex

# Or install globally:
npm install -g claude-flow-codex
claude-flow-codex task create general "test" --provider codex
```

---

## 📝 Complete Step-by-Step (Scoped Package)

Let's do Option 1 with your actual npm username:

### 1. **Check Your npm Username**

```bash
npm whoami
# Returns your username, e.g., "beckett"
```

### 2. **Update package.json**

```bash
# Make a backup first
cp package.json package.json.backup

# Edit package.json - change just these lines:
```

**Before:**
```json
{
  "name": "claude-flow",
  "version": "2.5.0-alpha.140",
```

**After:**
```json
{
  "name": "@beckett/claude-flow",
  "version": "1.0.0-codex.1",
```

### 3. **Test Locally First**

```bash
# Build
npm run build

# Test locally
npx . task create general "test" --provider codex

# Should work!
```

### 4. **Publish**

```bash
# First publish (requires --access public for scoped packages)
npm publish --access public

# You'll see:
# + @beckett/claude-flow@1.0.0-codex.1
```

### 5. **Test From Another Directory**

```bash
# Go somewhere else
cd ~/Desktop

# Test it!
npx @beckett/claude-flow task create general "Hello from Codex!" --provider codex

# 🎉 It works!
```

### 6. **Update Versions Later**

```bash
# Update version
npm version patch  # 1.0.0-codex.1 → 1.0.0-codex.2

# Publish update
npm publish --access public
```

---

## 🏷️ Version Tagging Strategy

For your Codex-enabled fork:

```bash
# Initial release
"version": "1.0.0-codex.1"

# Bug fixes
npm version patch → "1.0.0-codex.2"

# New features
npm version minor → "1.1.0-codex.1"

# Breaking changes
npm version major → "2.0.0-codex.1"
```

Or use dist-tags:

```bash
# Publish with tag
npm publish --tag codex-beta --access public

# Users install with:
npx @beckett/claude-flow@codex-beta task create ...
```

---

## 📋 package.json Template (Ready to Use)

Here's a complete example:

```json
{
  "name": "@beckett/claude-flow",
  "version": "1.0.0-codex.1",
  "description": "Claude Flow with Codex integration - Enterprise AI orchestration with multi-provider support",
  "keywords": [
    "ai",
    "agents",
    "orchestration",
    "codex",
    "claude",
    "swarm",
    "multi-agent"
  ],
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/claude-flow-fork"
  },
  "homepage": "https://github.com/yourusername/claude-flow-fork#readme",
  "bugs": {
    "url": "https://github.com/yourusername/claude-flow-fork/issues"
  },
  "main": "cli.mjs",
  "bin": {
    "claude-flow": "bin/claude-flow.js"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  // ... rest of the original package.json
}
```

---

## 🔐 npm Authentication

### First Time Setup

```bash
# Create npm account (if you don't have one)
npm adduser
# Enter: username, password, email

# Or login if you have an account
npm login
```

### Two-Factor Authentication

```bash
# If you have 2FA enabled, use:
npm publish --otp=123456 --access public
# Replace 123456 with your 2FA code
```

---

## 🌍 Making It Public

### Set Public Access (for scoped packages)

```bash
# In package.json
{
  "publishConfig": {
    "access": "public"
  }
}

# Then just:
npm publish
```

---

## 📦 What Gets Published

npm will include:
- ✅ `bin/` - Your CLI binaries
- ✅ `dist/` - Built JavaScript
- ✅ `package.json` - Package metadata
- ✅ `README.md` - Documentation

npm will **NOT** include (via .npmignore):
- ❌ `src/` - TypeScript source (not needed)
- ❌ `node_modules/` - Dependencies
- ❌ `.git/` - Git history
- ❌ Tests and dev files

### Create .npmignore

```bash
# Create .npmignore file
cat > .npmignore << 'EOF'
# Source files (we include built dist/)
src/
*.ts
!*.d.ts

# Tests
__tests__/
*.test.js
*.spec.js

# Dev files
.git/
.github/
node_modules/
coverage/
.vscode/
.idea/

# Build artifacts we don't need
dist-cjs/
*.log
*.tsbuildinfo
EOF
```

---

## 🎯 Quick Reference Card

### Publish Checklist

- [ ] Update `package.json` name (scoped or unique)
- [ ] Update version
- [ ] Test locally: `npx . task create general "test" --provider codex`
- [ ] Build: `npm run build`
- [ ] Login: `npm login`
- [ ] Publish: `npm publish --access public`
- [ ] Test remotely: `npx @yourname/claude-flow --help`

### Common Commands

```bash
# Build
npm run build

# Publish first time
npm publish --access public

# Update version and publish
npm version patch
npm publish --access public

# Unpublish (within 72 hours)
npm unpublish @yourname/claude-flow@1.0.0 --force

# Check what will be published
npm pack --dry-run
```

---

## 🚨 Important Notes

### 1. **Original Package**
The original `claude-flow@alpha` will still exist. Your scoped version is separate:
- Original: `npx claude-flow@alpha ...`
- Yours: `npx @beckett/claude-flow ...`

### 2. **Updates**
You control your package independently. You can:
- Pull updates from original repo
- Add your own features
- Merge as needed

### 3. **Documentation**
Update README.md to mention:
```markdown
# @beckett/claude-flow

This is a fork of claude-flow with integrated Codex support.

## Installation

\`\`\`bash
npm install -g @beckett/claude-flow
\`\`\`

## Usage with Codex

\`\`\`bash
claude-flow task create general "Your task" --provider codex
\`\`\`
```

---

## 🎉 Final Example

```bash
# 1. Update package.json
{
  "name": "@beckett/claude-flow",
  "version": "1.0.0-codex.1"
}

# 2. Build
npm run build

# 3. Login to npm
npm login

# 4. Publish
npm publish --access public

# 5. Use from anywhere!
cd ~/Projects/any-project
npx @beckett/claude-flow task create general "Build API" --provider codex

# 🎊 Success!
```

---

## 📚 Resources

- **npm Documentation**: https://docs.npmjs.com/
- **Scoped Packages**: https://docs.npmjs.com/about-scopes
- **Publishing Guide**: https://docs.npmjs.com/creating-and-publishing-scoped-public-packages

---

**Ready to publish your Codex-enabled Claude Flow to the world! 🚀**
