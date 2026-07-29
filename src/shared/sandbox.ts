import { bash } from '@flue/runtime';
import { Bash } from 'just-bash';

/**
 * A virtual sandbox with network access, shared by both benchmark agents so the
 * skill stays the only variable between them.
 *
 * just-bash disables the network by default and only registers `curl` and `wget`
 * when a `network` config is present. Several benchmark prompts name a repo URL
 * or need current information, so the agents have to be able to fetch. There is
 * no web-search command and no `git`: the only network tool is `curl`, usually
 * piped through `html-to-markdown`.
 *
 * ponytail: full internet access. Two known ceilings, both accepted because this
 * is a local benchmark against public docs with no credentials in the workspace.
 *
 * 1. The flag overrides `allowedMethods`, so POST/PUT/DELETE are permitted, not
 *    just GET/HEAD.
 * 2. Private ranges stay reachable, including the Flue dev server on
 *    127.0.0.1:3583. `denyPrivateRanges: true` is the intended fix but it makes
 *    every request fail on Node 22 with "DNS pinning unavailable for private IP
 *    enforcement" (just-bash 3.2.0), so it is off rather than silently breaking
 *    all fetches.
 *
 * To close both, drop `dangerouslyAllowFullInternetAccess` and list origins
 * instead. That restores the GET/HEAD default and makes private ranges
 * unreachable by omission, with no DNS pinning involved:
 *
 *   network: { allowedUrlPrefixes: ['https://raw.githubusercontent.com', ...] }
 */
export const NETWORK = {
	dangerouslyAllowFullInternetAccess: true,
	maxRedirects: 5,
};

export const WEB_SANDBOX = bash(() => new Bash({ cwd: '/workspace', network: NETWORK }));
