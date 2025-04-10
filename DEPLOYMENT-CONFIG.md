# Deployment-Specific Configuration Guide

This document explains how to use deployment-specific settings to customize your Hinagiku instance without modifying the source code.

## Available Configuration Options

The following settings can be configured per deployment:

| Variable | Description | Default |
|----------|-------------|---------|
| `PUBLIC_SITE_TITLE` | Site title shown in the navbar | `Hinagiku` |
| `PUBLIC_PRIMARY_COLOR` | Primary theme color (hex format) | `#8b5cf6` |
| `PUBLIC_SECONDARY_COLOR` | Secondary theme color (hex format) | `#10b981` |

## How to Configure

### Local Development

1. Create a `.env` file in the root of your project (you can copy from `.env.example`)
2. Add or modify the deployment variables as needed:

```
# Deployment configuration
PUBLIC_SITE_TITLE="My Site Name"
PUBLIC_PRIMARY_COLOR="#ff5733"
PUBLIC_SECONDARY_COLOR="#4a90e2"
```

3. Run the application with `pnpm dev`

The environment variables will be loaded automatically when the application starts.

### Production Deployment

For production deployments, set these environment variables in your hosting platform's configuration:

- **Vercel**: Add them in the project settings under "Environment Variables"
- **Netlify**: Add them in the site settings under "Build & deploy" > "Environment"
- **Docker**: Add them to your docker-compose.yml or as `-e` flags when running the container

## Example Use Cases

### Custom Branding

```
PUBLIC_SITE_TITLE="Educational Discussion Platform"
PUBLIC_PRIMARY_COLOR="#4a90e2"
PUBLIC_SECONDARY_COLOR="#50e3c2"
```

## Technical Details

These settings are managed by the deployment configuration system in `src/lib/config/deployment.ts`. The configuration is loaded at runtime and does not require rebuilding the application.

For developers: If you need to access these settings in your code, import from the deployment config:

```typescript
import { deploymentConfig } from '$lib/config/deployment';

// Use the settings
const siteTitle = deploymentConfig.siteTitle;
``` 