<script lang="ts">
  interface Props {
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
    disabled?: boolean;
  }

  let { value, options, onChange, disabled = false }: Props = $props();
</script>

<div class="flex rounded-lg bg-surface-light p-1">
  {#each options as option}
    <button
      type="button"
      class="flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 {value === option.value ? 'bg-primary text-white' : 'text-text-muted'} {value !== option.value && !disabled ? 'hover:text-text' : ''} {disabled ? 'cursor-not-allowed' : ''}"
      onclick={() => !disabled && onChange(option.value)}
      disabled={disabled}
    >
      {option.label}
    </button>
  {/each}
</div>
