<script lang="ts">
  import type { BiometricsInput } from '$lib/types';
  import { validateBiometricField, getFieldError, type ValidationError } from '$lib/utils/onboardingValidation';
  import UnitToggle from './UnitToggle.svelte';

  interface Props {
    initialData?: Partial<BiometricsInput>;
    onSubmit: (data: BiometricsInput) => void;
    onBack: () => void;
  }

  let { initialData, onSubmit, onBack }: Props = $props();

  // Form state
  let sex = $state<BiometricsInput['sex']>(initialData?.sex ?? 'male');
  let bodyWeight = $state<number | ''>(initialData?.bodyWeight ?? '');
  let bodyWeightUnit = $state<BiometricsInput['bodyWeightUnit']>(initialData?.bodyWeightUnit ?? 'kg');
  let height = $state<number | ''>(initialData?.height ?? '');
  let heightUnit = $state<BiometricsInput['heightUnit']>(initialData?.heightUnit ?? 'cm');
  
  // Validation state
  let touched = $state<Record<string, boolean>>({});
  let errors = $state<ValidationError[]>([]);

  // Computed values
  let formData = $derived<Partial<BiometricsInput>>({
    sex,
    bodyWeight: bodyWeight === '' ? undefined : bodyWeight,
    bodyWeightUnit,
    height: height === '' ? undefined : height,
    heightUnit,
  });

  let isValid = $derived(() => {
    return sex && 
           bodyWeight !== '' && bodyWeight > 0 &&
           height !== '' && height > 0 &&
           errors.length === 0;
  });

  // Validate on change
  $effect(() => {
    const newErrors: ValidationError[] = [];
    
    const sexError = validateBiometricField('sex', sex);
    if (sexError) newErrors.push({ field: 'sex', message: sexError });
    
    const weightError = validateBiometricField('bodyWeight', bodyWeight, formData);
    if (weightError) newErrors.push({ field: 'bodyWeight', message: weightError });
    
    const heightError = validateBiometricField('height', height, formData);
    if (heightError) newErrors.push({ field: 'height', message: heightError });
    
    errors = newErrors;
  });

  function handleSubmit(e: Event) {
    e.preventDefault();
    
    // Mark all fields as touched
    touched = { sex: true, bodyWeight: true, height: true };
    
    if (isValid()) {
      onSubmit({
        sex,
        bodyWeight: Number(bodyWeight),
        bodyWeightUnit,
        height: Number(height),
        heightUnit,
      });
    }
  }

  function handleBlur(field: string) {
    touched = { ...touched, [field]: true };
  }
</script>

<form onsubmit={handleSubmit} class="flex flex-col h-full">
  <div class="flex-1 space-y-6">
    <!-- Header -->
    <div>
      <h2 class="text-xl font-bold mb-2">About You</h2>
      <p class="text-text-muted text-sm">
        Tell us about yourself to calculate your starting weights
      </p>
    </div>

    <!-- Sex Selection -->
    <div>
      <label class="block text-sm font-medium mb-2">Sex *</label>
      <div class="grid grid-cols-2 gap-3">
        <button
          type="button"
          class="p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 {sex === 'male' ? 'border-primary bg-primary bg-opacity-10' : 'border-surface-light bg-surface-light'}"
          onclick={() => sex = 'male'}
        >
          <span class="text-2xl">♂</span>
          <span class="font-medium">Male</span>
        </button>
        <button
          type="button"
          class="p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 {sex === 'female' ? 'border-primary bg-primary bg-opacity-10' : 'border-surface-light bg-surface-light'}"
          onclick={() => sex = 'female'}
        >
          <span class="text-2xl">♀</span>
          <span class="font-medium">Female</span>
        </button>
      </div>
      {#if touched.sex && getFieldError(errors, 'sex')}
        <p class="text-danger text-sm mt-1">{getFieldError(errors, 'sex')}</p>
      {/if}
    </div>

    <!-- Body Weight -->
    <div>
      <label class="block text-sm font-medium mb-2">Body Weight *</label>
      <div class="flex gap-3">
        <div class="flex-1">
          <input
            type="number"
            inputmode="decimal"
            step="0.1"
            min={bodyWeightUnit === 'kg' ? 30 : 66}
            max={bodyWeightUnit === 'kg' ? 300 : 660}
            bind:value={bodyWeight}
            onblur={() => handleBlur('bodyWeight')}
            placeholder={bodyWeightUnit === 'kg' ? '70' : '154'}
            class="w-full bg-bg border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors {touched.bodyWeight && getFieldError(errors, 'bodyWeight') ? 'border-danger' : 'border-surface-light'}"
          />
        </div>
        <UnitToggle
          value={bodyWeightUnit}
          options={[{ value: 'kg', label: 'kg' }, { value: 'lbs', label: 'lbs' }]}
          onChange={(v) => bodyWeightUnit = v as 'kg' | 'lbs'}
        />
      </div>
      {#if touched.bodyWeight && getFieldError(errors, 'bodyWeight')}
        <p class="text-danger text-sm mt-1">{getFieldError(errors, 'bodyWeight')}</p>
      {/if}
    </div>

    <!-- Height -->
    <div>
      <label class="block text-sm font-medium mb-2">Height *</label>
      <div class="flex gap-3">
        <div class="flex-1">
          <input
            type="number"
            inputmode="decimal"
            step={heightUnit === 'cm' ? 1 : 0.1}
            min={heightUnit === 'cm' ? 100 : 39}
            max={heightUnit === 'cm' ? 250 : 98}
            bind:value={height}
            onblur={() => handleBlur('height')}
            placeholder={heightUnit === 'cm' ? '175' : '5.9'}
            class="w-full bg-bg border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors {touched.height && getFieldError(errors, 'height') ? 'border-danger' : 'border-surface-light'}"
          />
        </div>
        <UnitToggle
          value={heightUnit}
          options={[{ value: 'cm', label: 'cm' }, { value: 'inches', label: 'in' }]}
          onChange={(v) => heightUnit = v as 'cm' | 'inches'}
        />
      </div>
      {#if touched.height && getFieldError(errors, 'height')}
        <p class="text-danger text-sm mt-1">{getFieldError(errors, 'height')}</p>
      {/if}
    </div>
  </div>

  <!-- Navigation -->
  <div class="flex gap-3 pt-6 mt-auto">
    <button
      type="button"
      onclick={onBack}
      class="px-6 py-3 bg-surface-light hover:bg-surface rounded-xl font-medium transition-colors"
    >
      Back
    </button>
    <button
      type="submit"
      disabled={!isValid()}
      class="flex-1 py-3 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-all active:scale-95"
    >
      Continue
    </button>
  </div>
</form>
