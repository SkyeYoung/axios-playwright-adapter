# @iskyex/axios-playwright-adapter

Route axios requests through Playwright's `APIRequestContext` for full trace visibility.

[![npm version](https://img.shields.io/npm/v/@iskyex/axios-playwright-adapter.svg)](https://www.npmjs.com/package/@iskyex/axios-playwright-adapter)
[![CI](https://github.com/SkyeYoung/axios-playwright-adapter/actions/workflows/ci.yml/badge.svg)](https://github.com/SkyeYoung/axios-playwright-adapter/actions/workflows/ci.yml)

## Install

```bash
npm install @iskyex/axios-playwright-adapter
```

## Usage

### With Axios

```typescript
import axios from 'axios';
import { test, expect } from '@playwright/test';
import { createPlaywrightAdapter } from '@iskyex/axios-playwright-adapter';

test('API requests appear in Playwright trace', async ({ request }) => {
  const client = axios.create({
    adapter: createPlaywrightAdapter(request),
    baseURL: 'https://api.example.com',
  });

  const response = await client.get('/users');
  expect(response.status).toBe(200);
});
```

### With Custom Fixture

```typescript
// fixtures.ts
import { test as base } from '@playwright/test';
import axios, { AxiosInstance } from 'axios';
import { createPlaywrightAdapter } from '@iskyex/axios-playwright-adapter';

export const test = base.extend<{ api: AxiosInstance }>({
  api: async ({ request }, use) => {
    const client = axios.create({
      adapter: createPlaywrightAdapter(request),
      baseURL: 'https://api.example.com',
    });
    await use(client);
  },
});

// my-test.spec.ts
import { test } from './fixtures';

test('uses api fixture', async ({ api }) => {
  const response = await api.get('/users');
});
```

### With better-fetch

```typescript
import { createFetch } from '@better-fetch/fetch';
import { test } from '@playwright/test';
import { createPlaywrightFetch } from '@iskyex/axios-playwright-adapter';

test('API call shows in trace', async ({ request }) => {
  const $fetch = createFetch({
    baseURL: 'https://api.example.com',
    customFetchImpl: createPlaywrightFetch(request),
  });

  const { data } = await $fetch('/users');
});
```

Works with interceptors, SDKs, FormData, file uploads, and all standard axios features.

## API

### `createPlaywrightAdapter(requestContext, options?)`

Creates an axios adapter that routes requests through Playwright.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `failOnStatusCode` | `boolean` | `false` | Throw on non-2xx/3xx responses |
| `ignoreHTTPSErrors` | `boolean` | - | Ignore SSL errors |
| `maxRedirects` | `number` | `20` | Max redirects to follow |
| `maxRetries` | `number` | `0` | Retry attempts on network errors |

### `createPlaywrightFetch(requestContext, options?)`

Creates a fetch-compatible function for use with better-fetch and other fetch-based clients.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timeout` | `number` | - | Request timeout in milliseconds |
| `ignoreHTTPSErrors` | `boolean` | - | Ignore SSL errors |
| `maxRedirects` | `number` | `20` | Max redirects to follow |
| `maxRetries` | `number` | `0` | Retry attempts on network errors |

## Limitations

- **Streaming**: Returns buffer, not stream (Playwright limitation)
- **Progress events**: Not supported (Playwright limitation)
- **Proxy**: Configure at browser/context level, not per-request

## Compatibility

| Package | Version |
|---------|---------|
| axios | ^1.8.0 |
| @playwright/test | ^1.50.0 |
| Node.js | 18+ |

## License

MIT
