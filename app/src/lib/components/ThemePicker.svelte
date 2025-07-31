<script lang="ts">
  import { themes, currentTheme, applyTheme } from '$lib/theme';

  export let direction: 'row' | 'column' = 'row';

  // Map themes to emojis
  const themeEmojis: Record<string, string> = {
    'default': '☀️',
    'dark': '🌙',
    'birthday': '🎂',
    'neon': '🦄'
  };

  function handleThemeClick(theme: typeof themes[0]) {
    applyTheme(theme);
  }
</script>

<div class="theme-picker" class:column={direction === 'column'}>
  {#each themes as theme}
    <button
      class="theme-button"
      class:active={$currentTheme.name === theme.name}
      on:click={() => handleThemeClick(theme)}
      title={theme.name}
      aria-label="Switch to {theme.name} theme"
    >
      {themeEmojis[theme.name] || '🎨'}
    </button>
  {/each}
</div>

<style>
    :root {
        --active-bg: color-mix(in srgb, var(--primary-color) 50%, transparent);
    }

  .theme-picker {
    display: flex;
    align-items: center;
    gap: 0.5em;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .theme-picker.column {
    flex-direction: column;
    align-items: flex-start;
  }

  .theme-button {
    background: none;
    border: transparent;
    border-radius: 50%;
    width: 1.5em;
    height: 1.5em;
    font-size: 1em;
    padding: 0.5em;
    font-size: 1.25em;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    background-color: transparent;
  }

  .theme-button:hover {
    transform: scale(1.1);
    scale: 1.1 !important;
    background-color: transparent;
  }

  .theme-button:focus {
    outline: none;
    scale: 1.1 !important;
    background-color: transparent;
  }

  .theme-button.active {
    background-color: var(--active-bg);
  }
</style>
