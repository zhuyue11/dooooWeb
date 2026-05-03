/**
 * Google Identity Services (GIS) wrapper.
 *
 * Lazy-loads the GIS script and exposes helpers for the "Sign In With Google"
 * button flow in popup mode. The hidden-button pattern lets us keep our own
 * styled button while delegating the actual OAuth popup to Google's SDK.
 */

// ---------------------------------------------------------------------------
// Type declarations for Google Identity Services
// ---------------------------------------------------------------------------
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: CredentialResponse) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            ux_mode?: 'popup' | 'redirect';
            itp_support?: boolean;
          }) => void;
          prompt: (notification?: (n: PromptNotification) => void) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              width?: number;
            },
          ) => void;
          revoke: (hint: string, callback: () => void) => void;
        };
      };
    };
  }
}

export interface CredentialResponse {
  credential: string; // the id_token JWT
  select_by: string;
}

interface PromptNotification {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  isDismissedMoment: () => boolean;
  getDismissedReason: () => string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const GOOGLE_BUTTON_CONTAINER_ID = '__gsi_hidden_btn';

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

// ---------------------------------------------------------------------------
// Script loader (idempotent)
// ---------------------------------------------------------------------------
let scriptPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    // Already loaded (e.g. by another component)
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null; // allow retry
      reject(new Error('Failed to load Google Identity Services script'));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load GIS, initialize with the given client_id + callback, and render a
 * hidden Google button into the container element.
 *
 * Call this once on LoginPage mount. The `callback` fires after the user
 * completes Google sign-in in the popup.
 */
export async function initGoogleSignIn(
  clientId: string,
  callback: (response: CredentialResponse) => void,
): Promise<void> {
  await loadGoogleScript();

  const gsi = window.google?.accounts?.id;
  if (!gsi) throw new Error('Google Identity Services not available');

  gsi.initialize({
    client_id: clientId,
    callback,
    ux_mode: 'popup',
    auto_select: false,
    itp_support: true,
  });

  // Render Google's button into the hidden container so we can click it later
  const container = document.getElementById(GOOGLE_BUTTON_CONTAINER_ID);
  if (container) {
    gsi.renderButton(container, {
      type: 'standard',
      size: 'large',
      theme: 'outline',
    });
  }
}

/**
 * Programmatically click the hidden Google button to open the popup.
 * Called when the user clicks our visible styled button.
 */
export function clickHiddenGoogleButton(): void {
  const container = document.getElementById(GOOGLE_BUTTON_CONTAINER_ID);
  if (!container) return;

  // Google renders an iframe inside the container; the clickable element is
  // the first div > div > div or the iframe itself. Find any clickable child.
  const btn =
    container.querySelector<HTMLElement>('[role="button"]') ??
    container.querySelector<HTMLElement>('div[aria-labelledby]') ??
    container.querySelector<HTMLElement>('iframe');

  if (btn) {
    btn.click();
  }
}
