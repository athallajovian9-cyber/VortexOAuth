// Cloudflare Pages Function - Discord OAuth Callback
// Exchanges code for tokens, fetches user guilds, shows server selection

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  
  // Handle Discord errors
  if (error) {
    return new Response(`Discord OAuth error: ${error}`, { status: 400 });
  }
  
  if (!code) {
    return new Response("Missing authorization code", { status: 400 });
  }
  
  // Validate state cookie (optional)
  const cookieState = request.headers.get("Cookie")?.match(/oauth_state=([^;]+)/)?.[1];
  if (state && cookieState && state !== cookieState) {
    return new Response("Invalid state parameter", { status: 400 });
  }
  
  const clientId = env.DISCORD_CLIENT_ID;
  const clientSecret = env.DISCORD_CLIENT_SECRET;
  const redirectUri = env.DISCORD_REDIRECT_URI;
  const botToken = env.DISCORD_BOT_TOKEN;
  
  if (!clientId || !clientSecret || !redirectUri || !botToken) {
    return new Response("Missing required environment variables", { status: 500 });
  }
  
  try {
    // Exchange code for access token
    const tokenResponse = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return new Response(`Token exchange failed: ${errorText}`, { status: 400 });
    }
    
    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, token_type, scope } = tokenData;
    
    // Fetch user's guilds
    const guildsResponse = await fetch("https://discord.com/api/v10/users/@me/guilds", {
      headers: {
        "Authorization": `Bearer ${access_token}`,
      },
    });
    
    if (!guildsResponse.ok) {
      return new Response("Failed to fetch user guilds", { status: 400 });
    }
    
    const guilds = await guildsResponse.json();
    
    // Filter guilds where user has MANAGE_GUILD permission (can add bot)
    const manageableGuilds = guilds.filter(guild => 
      (guild.permissions & 0x20) === 0x20 // MANAGE_GUILD = 0x20
    );
    
    // Fetch bot's current guilds to show which servers bot is already in
    const botGuildsResponse = await fetch("https://discord.com/api/v10/users/@me/guilds", {
      headers: {
        "Authorization": `Bot ${botToken}`,
      },
    });
    
    let botGuildIds = new Set();
    if (botGuildsResponse.ok) {
      const botGuilds = await botGuildsResponse.json();
      botGuildIds = new Set(botGuilds.map(g => g.id));
    }
    
    // Render server selection page
    return new Response(renderServerSelectionPage(manageableGuilds, botGuildIds, access_token, refresh_token), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Set-Cookie": `oauth_token=${access_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`,
      },
    });
    
  } catch (error) {
    console.error("OAuth callback error:", error);
    return new Response(`Internal server error: ${error.message}`, { status: 500 });
  }
}

function renderServerSelectionPage(guilds, botGuildIds, accessToken, refreshToken) {
  const tokenData = btoa(JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }));
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Vortex - Select Servers</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0d1117; color: #e6edf3; min-height: 100vh; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 32px; padding: 24px; background: linear-gradient(135deg, #161b22 0%, #0d1117 100%); border: 1px solid #30363d; border-radius: 12px; }
    .header h1 { font-size: 2rem; font-weight: 700; background: linear-gradient(135deg, #58a6ff, #a371f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px; }
    .header p { color: #8b949e; }
    .guild-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .guild-card { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 20px; transition: all 0.2s; position: relative; }
    .guild-card:hover { border-color: #58a6ff; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(88, 166, 255, 0.15); }
    .guild-card.bot-present { border-color: #3fb950; background: rgba(63, 185, 80, 0.1); }
    .guild-card.bot-present::before { content: "✓ Bot added"; position: absolute; top: 12px; right: 12px; background: #3fb950; color: #fff; font-size: 0.7rem; font-weight: 600; padding: 2px 8px; border-radius: 4px; }
    .guild-icon { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; margin-bottom: 12px; }
    .guild-name { font-size: 1.1rem; font-weight: 600; margin-bottom: 4px; word-break: break-word; }
    .guild-members { color: #8b949e; font-size: 0.85rem; margin-bottom: 16px; }
    .btn { width: 100%; padding: 12px 16px; border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .btn-primary { background: linear-gradient(135deg, #58a6ff, #a371f7); color: #fff; }
    .btn-primary:hover { transform: scale(1.02); box-shadow: 0 4px 16px rgba(88, 166, 255, 0.4); }
    .btn-success { background: linear-gradient(135deg, #3fb950, #2ea043); color: #fff; }
    .btn-success:hover { transform: scale(1.02); box-shadow: 0 4px 16px rgba(63, 185, 80, 0.4); }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    .guild-perms { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
    .perm-badge { font-size: 0.7rem; padding: 2px 8px; border-radius: 4px; background: #21262d; border: 1px solid #30363d; color: #8b949e; }
    .perm-badge.owner { background: rgba(255, 192, 0, 0.1); border-color: #ffc000; color: #ffc000; }
    .footer { text-align: center; margin-top: 32px; padding: 20px; color: #8b949e; font-size: 0.85rem; }
    .loading { display: none; text-align: center; padding: 20px; }
    .spinner { width: 24px; height: 24px; border: 3px solid #30363d; border-top-color: #58a6ff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 8px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .toast { position: fixed; bottom: 20px; right: 20px; padding: 12px 20px; border-radius: 8px; background: #161b22; border: 1px solid #30363d; display: none; z-index: 1000; animation: slideIn 0.3s ease; }
    @keyframes slideIn { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .toast.success { border-color: #3fb950; }
    .toast.error { border-color: #f85149; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ Vortex Protector</h1>
      <p>Select servers to add Vortex Protector bot</p>
    </div>
    
    ${guilds.length === 0 ? `
      <div style="text-align: center; padding: 60px 20px; color: #8b949e;">
        <h2>No manageable servers found</h2>
        <p>You need "Manage Server" permission to add the bot.</p>
      </div>
    ` : `
      <div class="guild-grid" id="guildGrid">
        ${guilds.map(guild => {
          const botPresent = botGuildIds.has(guild.id);
          const isOwner = guild.owner;
          const perms = [];
          if (guild.permissions & 0x20) perms.push("Manage Server");
          if (guild.permissions & 0x8) perms.push("Administrator");
          if (isOwner) perms.push("Owner");
          
          return `
            <div class="guild-card ${botPresent ? 'bot-present' : ''}" data-guild-id="${guild.id}">
              ${guild.icon ? `<img src="https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128" alt="" class="guild-icon">` : `<div class="guild-icon" style="background: linear-gradient(135deg, #58a6ff, #a371f7); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; color: #fff;">${guild.name.charAt(0).toUpperCase()}</div>`}
              <div class="guild-name">${guild.name}</div>
              <div class="guild-members">${guild.approximate_member_count?.toLocaleString() || "Unknown"} members</div>
              <div class="guild-perms">
                ${perms.map(p => `<span class="perm-badge${isOwner ? ' owner' : ''}">${p}</span>`).join('')}
              </div>
              <button class="btn ${botPresent ? 'btn-success' : 'btn-primary'}" 
                      onclick="addBotToServer('${guild.id}', '${guild.name.replace(/'/g, "\\'")}')"
                      ${botPresent ? 'disabled' : ''}>
                ${botPresent ? '✓ Bot Added' : 'Add Bot'}
              </button>
            </div>
          `;
        }).join('')}
      </div>
    `}
    
    <div class="footer">
      <p>Vortex Protector - Wick-style Discord Server Protection</p>
      <p><a href="https://github.com/athallajovian9-cyber/VortexProtector" target="_blank" style="color: #58a6ff;">GitHub</a> | <a href="https://discord.gg/QtyBucygQ6" target="_blank" style="color: #58a6ff;">Support Server</a></p>
    </div>
  </div>
  
  <div class="loading" id="loading">
    <div class="spinner"></div>
    <p>Adding bot to server...</p>
  </div>
  
  <div class="toast" id="toast"></div>
  
  <script>
    async function addBotToServer(guildId, guildName) {
      const loading = document.getElementById('loading');
      const toast = document.getElementById('toast');
      const btn = document.querySelector(\`[data-guild-id="\${guildId}"] button\`);
      
      loading.style.display = 'block';
      btn.disabled = true;
      
      try {
        // Get stored token
        const tokenData = getCookie('oauth_token');
        if (!tokenData) throw new Error('Session expired. Please re-authorize.');
        
        // Add bot to guild using Discord API
        const response = await fetch(\`https://discord.com/api/v10/guilds/\${guildId}/members/@me\`, {
          method: 'PUT',
          headers: {
            'Authorization': \`Bearer \${tokenData}\`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            access_token: tokenData
          })
        });
        
        if (response.ok) {
          showToast(\`✅ Bot added to \${guildName}!\`, 'success');
          btn.textContent = '✓ Bot Added';
          btn.classList.remove('btn-primary');
          btn.classList.add('btn-success');
          btn.disabled = true;
          btn.closest('.guild-card').classList.add('bot-present');
          btn.closest('.guild-card').insertAdjacentHTML('afterbegin', '<div style="position: absolute; top: 12px; right: 12px; background: #3fb950; color: #fff; font-size: 0.7rem; font-weight: 600; padding: 2px 8px; border-radius: 4px;">✓ Bot added</div>');
        } else {
          const error = await response.json();
          throw new Error(error.message || 'Failed to add bot');
        }
      } catch (error) {
        showToast(\`❌ Failed to add bot: \${error.message}\`, 'error');
        btn.disabled = false;
      } finally {
        loading.style.display = 'none';
      }
    }
    
    function getCookie(name) {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? match[2] : null;
    }
    
    function showToast(message, type = 'success') {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.className = 'toast ' + type;
      toast.style.display = 'block';
      setTimeout(() => { toast.style.display = 'none'; }, 5000);
    }
  </script>
</body>
</html>`;
}