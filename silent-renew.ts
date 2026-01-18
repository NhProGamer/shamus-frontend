import { useOidcStore } from "vue3-oidc";

const { state: oidcState } = useOidcStore();
oidcState.value.userManager?.signinSilentCallback();

const searchParams = new URLSearchParams(window.location.search);
const error = searchParams.get("error");
const state = searchParams.get("state");

console.error(`Error: \n error: ${error} \n state: ${state}`);

localStorage.clear();
sessionStorage.clear();
top?.location.reload();
