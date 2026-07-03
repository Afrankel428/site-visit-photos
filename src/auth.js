// Microsoft sign-in (MSAL) setup. Config comes from environment variables so
// no IDs live in the code. These four VITE_ values are baked in at build time,
// so they must be set in Vercel BEFORE the build that uses them.
import { PublicClientApplication } from '@azure/msal-browser'

const clientId = import.meta.env.VITE_MSAL_CLIENT_ID
const tenantId = import.meta.env.VITE_MSAL_TENANT_ID

// True only when both required values are present (i.e. env vars are set).
export const authConfigured = Boolean(clientId && tenantId)

// Graph permissions we ask for at sign-in (matches the app registration).
export const LOGIN_SCOPES = ['User.Read', 'Sites.ReadWrite.All', 'Files.ReadWrite.All']

export const msalInstance = new PublicClientApplication({
  auth: {
    clientId: clientId || 'not-configured',
    authority: `https://login.microsoftonline.com/${tenantId || 'common'}`,
    redirectUri: window.location.origin,
  },
  cache: { cacheLocation: 'localStorage' },
})

let initialized = false

// Initialize MSAL, finish any redirect sign-in, and return the signed-in
// account (or null). Safe to call more than once.
export async function initAuth() {
  if (!authConfigured) return null
  if (!initialized) {
    await msalInstance.initialize()
    const result = await msalInstance.handleRedirectPromise()
    if (result?.account) msalInstance.setActiveAccount(result.account)
    initialized = true
  }
  const account = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0] || null
  if (account) msalInstance.setActiveAccount(account)
  return account
}

export function signIn() {
  return msalInstance.loginRedirect({ scopes: LOGIN_SCOPES })
}

export function signOutUser() {
  return msalInstance.logoutRedirect()
}

export function getActiveAccount() {
  return msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0] || null
}

// Get a Microsoft Graph access token for the signed-in user (for uploads).
// Tries silently; if that needs interaction, redirects to sign in again.
export async function getGraphToken() {
  const account = getActiveAccount()
  if (!account) throw new Error('Please sign in again.')
  const request = { scopes: ['Sites.ReadWrite.All', 'Files.ReadWrite.All'], account }
  try {
    const res = await msalInstance.acquireTokenSilent(request)
    return res.accessToken
  } catch {
    await msalInstance.acquireTokenRedirect(request)
    throw new Error('Redirecting to sign in…')
  }
}
