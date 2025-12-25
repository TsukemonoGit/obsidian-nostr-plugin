import sveltePreprocess from "svelte-preprocess";

export default {
  preprocess: sveltePreprocess(),
  compilerOptions: {
    // Svelte 5 Runes mode
    runes: true,
  },
};
