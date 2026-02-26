<script lang="ts">
  import { parseStrongliftsCSV, convertToDbFormat, extractCurrentWeights, type ImportResult } from '$lib/utils/importStronglifts';
  
  type DbWorkout = ReturnType<typeof convertToDbFormat>;
  type CurrentWeights = ReturnType<typeof extractCurrentWeights>;
  
  export let onImport: (data: {
    workouts: DbWorkout[];
    currentWeights: CurrentWeights;
  }) => Promise<void>;
  
  let fileInput: HTMLInputElement;
  let isParsing = false;
  let parseError: string | null = null;
  let previewData: ImportResult | null = null;
  let isImporting = false;
  let importSuccess = false;
  
  async function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;
    
    isParsing = true;
    parseError = null;
    previewData = null;
    
    try {
      const text = await file.text();
      previewData = parseStrongliftsCSV(text);
    } catch (err) {
      parseError = err instanceof Error ? err.message : 'Failed to parse CSV';
    } finally {
      isParsing = false;
    }
  }
  
  async function handleImport() {
    if (!previewData) return;
    
    isImporting = true;
    
    try {
      const dbWorkouts = previewData.workouts.map(convertToDbFormat);
      const currentWeights = extractCurrentWeights(previewData);
      
      await onImport({ workouts: dbWorkouts, currentWeights });
      importSuccess = true;
      
      // Reset after success
      setTimeout(() => {
        previewData = null;
        importSuccess = false;
        if (fileInput) fileInput.value = '';
      }, 3000);
    } catch (err) {
      parseError = err instanceof Error ? err.message : 'Import failed';
    } finally {
      isImporting = false;
    }
  }
  
  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
</script>

<div class="bg-surface rounded-xl p-4">
  <h3 class="text-lg font-semibold mb-3">Import from Stronglifts</h3>
  
  {#if importSuccess}
    <div class="bg-success/20 text-success rounded-xl p-4 text-center">
      <div class="text-2xl mb-1">✅</div>
      <p class="font-medium">Import successful!</p>
    </div>
  {:else}
    <input
      bind:this={fileInput}
      type="file"
      accept=".csv"
      on:change={handleFileSelect}
      class="hidden"
      id="stronglifts-file"
    />
    
    <label
      for="stronglifts-file"
      class="block w-full p-4 border-2 border-dashed border-surface-light rounded-xl text-center cursor-pointer hover:border-primary hover:bg-surface-light/50 transition-all"
    >
      {#if isParsing}
        <div class="animate-spin text-2xl mb-2">⏳</div>
        <p>Parsing CSV...</p>
      {:else}
        <div class="text-3xl mb-2">📁</div>
        <p class="font-medium">Tap to select Stronglifts CSV</p>
        <p class="text-sm text-text-muted mt-1">Export from Stronglifts app</p>
      {/if}
    </label>
    
    {#if parseError}
      <div class="mt-3 p-3 bg-danger/20 text-danger rounded-lg text-sm">
        {parseError}
      </div>
    {/if}
    
    {#if previewData}
      <div class="mt-4 space-y-3">
        <!-- Stats -->
        <div class="bg-surface-light rounded-xl p-3">
          <h4 class="font-medium mb-2">Preview</h4>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="text-text-muted">Workouts:</div>
            <div class="text-right font-medium">{previewData.stats.totalWorkouts}</div>
            <div class="text-text-muted">Exercises:</div>
            <div class="text-right font-medium">{previewData.stats.totalExercises}</div>
            <div class="text-text-muted">Sets:</div>
            <div class="text-right font-medium">{previewData.stats.totalSets}</div>
            <div class="text-text-muted">Date range:</div>
            <div class="text-right font-medium text-xs">
              {formatDate(previewData.stats.dateRange.start)} - {formatDate(previewData.stats.dateRange.end)}
            </div>
          </div>
        </div>
        
        <!-- Exercise Summary -->
        <div class="bg-surface-light rounded-xl p-3">
          <h4 class="font-medium mb-2">Exercises found</h4>
          <div class="flex flex-wrap gap-2">
            {#each previewData.exerciseIds as exerciseId}
              <span class="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full">
                {exerciseId}
              </span>
            {/each}
          </div>
        </div>
        
        <!-- Weights to Import -->
        {#if Object.keys(extractCurrentWeights(previewData)).length > 0}
          <div class="bg-surface-light rounded-xl p-3">
            <h4 class="font-medium mb-2">Current weights to import</h4>
            <div class="space-y-1 text-sm">
              {#each Object.entries(extractCurrentWeights(previewData)) as [exerciseId, data]}
                <div class="flex justify-between">
                  <span class="text-text-muted">{exerciseId}:</span>
                  <span class="font-medium">{data.weight} kg</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
        
        <!-- Import Button -->
        <button
          on:click={handleImport}
          disabled={isImporting}
          class="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 active:scale-95 transition-all rounded-xl p-3 font-semibold"
        >
          {#if isImporting}
            <span class="animate-pulse">Importing...</span>
          {:else}
            Import {previewData.stats.totalWorkouts} workouts
          {/if}
        </button>
      </div>
    {/if}
  {/if}
</div>
