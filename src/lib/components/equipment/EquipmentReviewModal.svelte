<script lang="ts">
  import type { 
    EquipmentRecognitionResponse,
    EquipmentDeduplicationResult,
    CapturedImage,
    Equipment,
  } from '$lib/types/equipment';
  import { formatCategory, normalizeName } from '$lib/types/equipment';
  import { EQUIPMENT_CATEGORIES } from '$lib/types/equipment';
  
  interface Props {
    images: CapturedImage[];
    recognition: EquipmentRecognitionResponse;
    deduplication: EquipmentDeduplicationResult;
    onSave: (data: {
      name: string;
      normalizedName: string;
      category: typeof EQUIPMENT_CATEGORIES[number];
      description?: string;
      recognitionConfidence: number;
    }) => void;
    onCancel: () => void;
    onViewExisting?: (equipment: Equipment) => void;
    isSaving?: boolean;
  }
  
  let { 
    images, 
    recognition, 
    deduplication, 
    onSave, 
    onCancel, 
    onViewExisting,
    isSaving = false 
  }: Props = $props();
  
  // Editable state
  let equipmentName = $state(recognition.equipment.name);
  let equipmentCategory = $state(recognition.equipment.category);
  let error: string | null = $state(null);
  
  // Check if name has been changed and might conflict
  let nameConflict = $state<{ exists: boolean; similarTo?: string } | null>(null);
  
  function handleNameChange(newName: string) {
    equipmentName = newName;
    error = null;
    
    // Check for potential conflicts
    const normalized = normalizeName(newName);
    if (deduplication.existingEquipment && 
        normalized !== deduplication.existingEquipment.normalizedName) {
      // Name was changed, mark as new but check similarity
      const similarity = calculateStringSimilarity(
        normalized, 
        deduplication.existingEquipment.normalizedName
      );
      if (similarity > 0.8) {
        nameConflict = { exists: true, similarTo: deduplication.existingEquipment.name };
      } else {
        nameConflict = null;
      }
    } else {
      nameConflict = null;
    }
  }
  
  function calculateStringSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1;
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0) return 1;
    
    const costs: number[] = [];
    for (let i = 0; i <= shorter.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= longer.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (shorter[i - 1] !== longer[j - 1]) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      costs[longer.length] = lastValue;
    }
    return (longer.length - costs[longer.length]) / longer.length;
  }
  
  function handleSave() {
    if (!equipmentName.trim()) {
      error = 'Equipment name is required';
      return;
    }
    
    const normalizedName = normalizeName(equipmentName);
    
    // If exact match exists and we haven't changed the name, prevent save
    if (deduplication.status === 'exact_match' && !nameConflict) {
      error = 'This equipment already exists in your gym';
      return;
    }
    
    onSave({
      name: equipmentName.trim(),
      normalizedName,
      category: equipmentCategory,
      description: recognition.equipment.description,
      recognitionConfidence: recognition.equipment.confidence,
    });
  }
  
  function getConfidenceColor(confidence: number): string {
    if (confidence >= 0.9) return 'text-success';
    if (confidence >= 0.7) return 'text-warning';
    return 'text-danger';
  }
  
  function getConfidenceLabel(confidence: number): string {
    if (confidence >= 0.9) return 'High';
    if (confidence >= 0.7) return 'Medium';
    return 'Low';
  }
  
  // Determine what to show based on deduplication status
  const isExactMatch = $derived(deduplication.status === 'exact_match');
  const isSimilar = $derived(deduplication.status === 'similar');
  const isNew = $derived(deduplication.status === 'new');
</script>

<div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
  <div class="bg-surface rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
    <!-- Header -->
    <div class="sticky top-0 bg-surface border-b border-surface-light p-4 flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold">
          {#if isExactMatch}
            ⚠️ Equipment Already Exists
          {:else if isSimilar}
            🔍 Similar Equipment Found
          {:else}
            ✓ Equipment Recognized
          {/if}
        </h2>
        <p class="text-sm text-text-muted">
          {#if isExactMatch}
            You've already added this equipment
          {:else if isSimilar}
            Is this what you're looking for?
          {:else}
            Review AI analysis before saving
          {/if}
        </p>
      </div>
      <button 
        onclick={onCancel}
        class="p-2 hover:bg-surface-light rounded-lg transition-colors"
        aria-label="Close"
        title="Close"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    
    <div class="p-4 space-y-4">
      <!-- Error -->
      {#if error}
        <div class="bg-danger/20 text-danger rounded-lg p-3 text-sm">
          {error}
        </div>
      {/if}
      
      <!-- Deduplication Warning -->
      {#if isExactMatch}
        <div class="bg-warning/20 border border-warning/30 rounded-xl p-4">
          <div class="flex items-start gap-3">
            <span class="text-2xl">📦</span>
            <div class="flex-1">
              <p class="font-medium text-warning">"{deduplication.existingEquipment?.name}" already in your gym</p>
              <p class="text-sm text-text-muted mt-1">
                You added this equipment on {new Date(deduplication.existingEquipment?.createdAt || 0).toLocaleDateString()}.
              </p>
              {#if onViewExisting}
                <button
                  onclick={() => deduplication.existingEquipment && onViewExisting(deduplication.existingEquipment)}
                  class="mt-2 text-sm text-primary hover:underline"
                >
                  View existing equipment →
                </button>
              {/if}
            </div>
          </div>
        </div>
      {:else if isSimilar}
        <div class="bg-info/20 border border-info/30 rounded-xl p-4">
          <div class="flex items-start gap-3">
            <span class="text-2xl">🔍</span>
            <div class="flex-1">
              <p class="font-medium">Did you mean "{deduplication.existingEquipment?.name}"?</p>
              <p class="text-sm text-text-muted mt-1">
                This looks similar to equipment you already have ({Math.round((deduplication.similarityScore || 0) * 100)}% match).
              </p>
              <div class="flex gap-2 mt-2">
                {#if onViewExisting}
                  <button
                    onclick={() => deduplication.existingEquipment && onViewExisting(deduplication.existingEquipment)}
                    class="text-sm text-primary hover:underline"
                  >
                    View existing
                  </button>
                  <span class="text-text-muted">•</span>
                {/if}
                <button
                  onclick={() => {/* Change name to differentiate */}}
                  class="text-sm text-primary hover:underline"
                >
                  Edit name to differentiate
                </button>
              </div>
            </div>
          </div>
        </div>
      {/if}
      
      <!-- Photos Preview -->
      <div class="flex gap-2 overflow-x-auto pb-2">
        {#each images as image}
          <div class="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-surface-light">
            <img 
              src={image.previewUrl} 
              alt={image.type}
              class="w-full h-full object-cover"
            />
          </div>
        {/each}
      </div>
      
      <!-- Equipment Details Form -->
      <div class="bg-surface-light/50 rounded-xl p-4 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-medium">Equipment Details</h3>
          <span class="text-sm {getConfidenceColor(recognition.equipment.confidence)}">
            AI Confidence: {getConfidenceLabel(recognition.equipment.confidence)}
          </span>
        </div>
        
        <!-- Name Input -->
        <div>
          <label class="block text-sm text-text-muted mb-1">Name</label>
          <input
            type="text"
            value={equipmentName}
            oninput={(e) => handleNameChange(e.currentTarget.value)}
            class="w-full bg-bg rounded-lg px-3 py-2 border border-surface-light focus:border-primary focus:outline-none {
              nameConflict ? 'border-warning' : ''
            }"
            disabled={isSaving}
          />
          {#if nameConflict}
            <p class="text-xs text-warning mt-1">
              ⚠️ Similar to existing: "{nameConflict.similarTo}"
            </p>
          {/if}
        </div>
        
        <!-- Category Select -->
        <div>
          <label class="block text-sm text-text-muted mb-1">Category</label>
          <select
            value={equipmentCategory}
            onchange={(e) => equipmentCategory = e.currentTarget.value as typeof EQUIPMENT_CATEGORIES[number]}
            class="w-full bg-bg rounded-lg px-3 py-2 border border-surface-light focus:border-primary focus:outline-none capitalize"
            disabled={isSaving}
          >
            {#each EQUIPMENT_CATEGORIES as category}
              <option value={category}>
                {formatCategory(category)}
              </option>
            {/each}
          </select>
        </div>
        
        <!-- Description -->
        {#if recognition.equipment.description}
          <div>
            <label class="block text-sm text-text-muted mb-1">Description</label>
            <p class="text-sm text-text bg-bg rounded-lg px-3 py-2">
              {recognition.equipment.description}
            </p>
          </div>
        {/if}
      </div>
      
      <!-- Exercise Preview (Phase 2 placeholder) -->
      <div class="bg-surface-light/50 rounded-xl p-4">
        <h3 class="font-medium mb-2">Exercises</h3>
        <p class="text-sm text-text-muted">
          {#if recognition.suggestedExercises.length > 0}
            {recognition.suggestedExercises.length} exercises suggested. 
            Full exercise management coming in next update.
          {:else}
            No exercises suggested. You can add them later.
          {/if}
        </p>
        <!-- Exercise list preview (read-only for Phase 1) -->
        {#if recognition.suggestedExercises.length > 0}
          <div class="mt-3 space-y-1">
            {#each recognition.suggestedExercises.slice(0, 3) as exercise}
              <div class="flex items-center gap-2 text-sm">
                <span class="w-2 h-2 rounded-full bg-primary"></span>
                <span>{exercise.name}</span>
                <span class="text-text-muted text-xs">({exercise.category})</span>
              </div>
            {/each}
            {#if recognition.suggestedExercises.length > 3}
              <p class="text-xs text-text-muted pl-4">
                +{recognition.suggestedExercises.length - 3} more
              </p>
            {/if}
          </div>
        {/if}
      </div>
      
      <!-- Actions -->
      <div class="flex gap-3 pt-2">
        <button
          onclick={onCancel}
          disabled={isSaving}
          class="flex-1 px-4 py-3 rounded-xl border border-surface-light text-text hover:bg-surface-light transition-colors disabled:opacity-50"
        >
          {isExactMatch ? 'Close' : 'Cancel'}
        </button>
        
        {#if !isExactMatch}
          <button
            onclick={handleSave}
            disabled={isSaving}
            class="flex-1 px-4 py-3 rounded-xl bg-primary text-white font-medium transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {#if isSaving}
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Saving...
            {:else}
              Save Equipment
            {/if}
          </button>
        {/if}
      </div>
    </div>
  </div>
</div>
