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
    gap: 0.5rem;
    font-family: system-ui, -apple-system, sans-serif;
    margin: 1rem;
  }

  .theme-picker.column {
    flex-direction: column;
    align-items: flex-start;
  }

  .theme-button {
    background: none;
    border: 2px solid transparent;
    border-radius: 50%;
    width: 2.5rem;
    height: 2.5rem;
    font-size: 1.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    position: relative;
    scale: 0.85;
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
    scale: 1;
  }
</style>
