import type { VueOidcSettings } from 'vue3-oidc'
import { createOidc, useOidcStore, useAuth } from 'vue3-oidc'
import { unref } from 'vue'

const origin = window.location.origin

const { state } = useOidcStore()
const { setRedirectUri } = useAuth()

const oidcSettings: VueOidcSettings = {
    authority: 'https://discord.com',      // Issuer
    client_id: '678251890081005588',
    redirect_uri: origin + '/oidc-callback',
    response_type: 'code',
    scope: 'openid guilds identify email',
    loadUserInfo: true,
    onSigninRedirectCallback(user) {
        console.log(user)
        window.location.href = unref(state).redirect_uri || '/play'
    },
    onBeforeSigninRedirectCallback() {
        setRedirectUri(location.pathname + location.search)
    },
}

createOidc({
    oidcSettings,
    auth: false,               // auto-auth si possible
    events: {
        addUserLoaded: (user) => {
            console.log(user);
        },
        addUserSignedOut: () => {},
    },
    refreshToken: {           // refresh auto (optionnel)
        enable: true,
        time: 30000,
    },
})
