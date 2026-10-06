// Cloudflare Pages Function - Discord OAuth Initiation
// Redirects user to Discord authorization page

export async function onRequestGet(context) {
  const { request, env } = context;
  
  const clientId = env.DISCORD_CLIENT_ID;
  const redirectUri = env.DISCORD_REDIRECT_URI;
  
  if (!clientId || !redirectUri) {
    return new Response("Configuration missing: DISCORD_CLIENT_ID or DISCORD_REDIRECT_URI", { status: 500 });
  }
  
  // Discord OAuth2 scopes needed
  const scopes = [
    "identify",           // Basic user info
    "guilds",             // List user's guilds
    "guilds.members.read", // Read member info in guilds
    "bot"                 // Add bot to guilds
  ].join(" ");
  
  const state = crypto.randomUUID();
  
  // Store state in KV or cookie for validation (optional but recommended)
  const url = new URL("https://discord.com/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes);
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "consent");
  
  // Set state cookie for validation
  const headers = new Headers();
  headers.set("Location", url.toString());
  headers.set("Set-Cookie", `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  
  return new Response(null, { status: 302, headers });
}