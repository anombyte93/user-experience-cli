# @user-experience/cli

**Ruthless UX auditing for CLI tools from a fresh user perspective.**

## What It Does

Simulates a new user encountering your tool for the first time:
- ✅ Tests installation instructions
- ✅ Verifies functionality claims
- ✅ Spot-checks data accuracy
- ✅ Documents red flags
- ✅ Generates actionable reports
- ✅ Validates findings with doubt-agent protocol

## Installation

### Global Install (Recommended)

```bash
npm install -g @user-experience/cli
```

### Local Install

```bash
npm install -D @user-experience/cli
npx user-experience audit ./your-tool
```

### From Source

```bash
git clone https://github.com/user-experience/cli.git
cd cli
npm install
npm run build
npm link
```

## Usage

```bash
# Basic audit
user-experience audit ./your-tool

# With context
user-experience audit ./your-tool --context "e-commerce checkout"

# Custom output location
user-experience audit ./your-tool -o ./reports/ux-audit.md

# Skip validation (faster)
user-experience audit ./your-tool --no-validation

# Enable verbose logging
user-experience audit ./your-tool -v
```

## Audit Report

The CLI generates a comprehensive report covering:

1. **First Impressions** - README quality, installation clarity, code examples
2. **Installation Test** - Installation success, duration, errors encountered
3. **Functionality Check** - Commands tested, success rates, missing features
4. **Data Verification** - Claims verified against actual behavior
5. **Red Flags** - Critical, high, medium, and low priority issues
6. **Recommendations** - Actionable improvements

## Dashboard

View your audit history in the web dashboard:

```bash
# Start dashboard
user-experience dashboard

# Enable Tailscale access (private URL)
user-experience dashboard --tailscale
```

Dashboard features:
- View all audit reports
- Filter by severity or score
- Track improvements over time
- Export to PDF

## License Tiers

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Audits/month | 5 | 100 | Unlimited |
| Dashboard | ❌ | ✅ | ✅ |
| Validation | ❌ | ✅ | ✅ |
| PDF Export | ❌ | ✅ | ✅ |
| Support | Community | Priority | Dedicated |
| **Price** | **Free** | **$10/mo** | **Custom** |

## Pricing

Visit [https://dashboard.userexperience.cli/pricing](https://dashboard.userexperience.cli/pricing)

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build
npm run build

# Lint
npm run lint

# Format
npm run format
```

## Contributing

Contributions welcome! Please read our contributing guidelines.

## License

MIT © user-experience

## Support

- **Documentation**: [https://docs.userexperience.cli](https://docs.userexperience.cli)
- **Issues**: [https://github.com/user-experience/cli/issues](https://github.com/user-experience/cli/issues)
- **Discord**: [https://discord.gg/user-experience](https://discord.gg/user-experience)

## Roadmap

- [ ] VS Code extension
- [ ] GitHub Actions integration
- [ ] CI/CD pipeline auditing
- [ ] Multi-language support (Python, Go, Rust)
- [ ] Custom scoring rules
- [ ] Team collaboration features
