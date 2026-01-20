<template>
  <div>Connexion en cours...</div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { userManager } from '@/oidc';

const router = useRouter();

onMounted(async () => {
  try {
    const user = await userManager.signinCallback();

    const targetPath = (user.state as any)?.path || '/play';

    router.push(targetPath);
  } catch (err) {
    console.error("Erreur de connexion OIDC:", err);
    router.push('/');
  }
});
</script>
