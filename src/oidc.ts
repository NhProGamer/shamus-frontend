import { UserManager, WebStorageStateStore, type User } from 'oidc-client-ts';

const settings = {
    authority: 'https://auth-shamus.nhsoul.fr/oidc',
    client_id: 'alxcopl1qh6n85rrbkeyo',
    redirect_uri: `${window.location.origin}/oidc-callback`,
    response_type: 'code',
    scope: 'openid profile email',
    loadUserInfo: true,
    userStore: new WebStorageStateStore({ store: window.localStorage }),

    automaticSilentRenew: true,
    monitorSession: false,
};

export const userManager = new UserManager(settings);

export const getUser = async (): Promise<User | null> => {
    return await userManager.getUser();
};
