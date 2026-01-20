import { UserManager, WebStorageStateStore, type User } from 'oidc-client-ts';

const settings = {
    authority: 'https://discord.com',
    client_id: '678251890081005588',
    redirect_uri: `${window.location.origin}/oidc-callback`,
    response_type: 'code',
    scope: 'openid guilds identify email',
    userStore: new WebStorageStateStore({ store: window.localStorage }),

    automaticSilentRenew: true,
    monitorSession: false,
    metadata: {
        issuer: 'https://discord.com',
        authorization_endpoint: 'https://discord.com/api/oauth2/authorize',
        token_endpoint: 'https://discord.com/api/oauth2/token',
        userinfo_endpoint: 'https://discord.com/api/users/@me',
        jwks_uri: 'https://discord.com/api/oauth2/keys'
    }
};

export const userManager = new UserManager(settings);

export const getUser = async (): Promise<User | null> => {
    return await userManager.getUser();
};
