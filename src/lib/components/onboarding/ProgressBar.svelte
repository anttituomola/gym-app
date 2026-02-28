<script lang="ts">
  interface Props {
    currentStep: number;
    totalSteps: number;
  }

  let { currentStep, totalSteps }: Props = $props();

  const progress = $derived((currentStep / totalSteps) * 100);
</script>

<div class="w-full">
  <div class="flex justify-between text-xs text-text-muted mb-2">
    <span>Step {currentStep} of {totalSteps}</span>
    <span>{Math.round(progress)}%</span>
  </div>
  <div class="h-2 bg-surface-light rounded-full overflow-hidden">
    <div 
      class="h-full bg-primary transition-all duration-500 ease-out rounded-full"
      style="width: {progress}%"
    ></div>
  </div>
</div>
