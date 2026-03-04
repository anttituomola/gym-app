<script lang="ts">
  import { compressImage } from '$lib/services/equipmentRecognition';
  import type { CapturedImage } from '$lib/types/equipment';
  
  /**
   * Generate a UUID, with fallback for browsers that don't support crypto.randomUUID
   */
  function generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers or non-secure contexts
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  interface Props {
    onImagesCaptured: (images: CapturedImage[]) => void;
    onCancel: () => void;
    maxImages?: number;
  }
  
  let { onImagesCaptured, onCancel, maxImages = 3 }: Props = $props();
  
  let images: CapturedImage[] = $state([]);
  let isProcessing = $state(false);
  let error: string | null = $state(null);
  
  const imageTypes: { type: CapturedImage['type']; label: string; description: string }[] = [
    { type: 'primary', label: 'Main View', description: 'Full equipment photo (required)' },
    { type: 'detail', label: 'Detail View', description: 'Different angle or close-up (optional)' },
    { type: 'usage_plate', label: 'Usage Guide', description: 'Exercise diagram/label (optional)' },
  ];
  
  function handleFileSelect(type: CapturedImage['type'], event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      error = 'Please select an image file';
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      error = 'Image too large (max 10MB)';
      return;
    }
    
    error = null;
    processFile(file, type);
  }
  
  async function processFile(file: File, type: CapturedImage['type']) {
    isProcessing = true;
    error = null;
    
    try {
      // Compress image
      const compressed = await compressImage(file, 1024, 1024, 0.85);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      
      // Remove existing image of same type
      images = images.filter(img => img.type !== type);
      
      // Add new image (with fallback UUID generation for older browsers)
      const newImage: CapturedImage = {
        id: generateUUID(),
        base64: compressed.base64,
        mimeType: compressed.mimeType,
        file,
        previewUrl,
        type,
      };
      
      images = [...images, newImage].sort((a, b) => {
        const order = { primary: 0, detail: 1, usage_plate: 2 };
        return order[a.type] - order[b.type];
      });
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to process image';
    } finally {
      isProcessing = false;
    }
  }
  
  function removeImage(id: string) {
    const image = images.find(img => img.id === id);
    if (image) {
      URL.revokeObjectURL(image.previewUrl);
      images = images.filter(img => img.id !== id);
    }
  }
  
  function handleAnalyze() {
    if (images.length === 0) {
      error = 'Please add at least one photo';
      return;
    }
    
    onImagesCaptured(images);
  }
  
  function handleCancel() {
    // Clean up preview URLs
    images.forEach(img => URL.revokeObjectURL(img.previewUrl));
    onCancel();
  }
  
  // Check if we have a primary image
  const hasPrimary = $derived(images.some(img => img.type === 'primary'));
  const canAnalyze = $derived(hasPrimary && !isProcessing);
</script>

<div class="bg-surface rounded-xl p-4 pb-6 space-y-4">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-lg font-semibold">Add Equipment by Photo</h2>
      <p class="text-sm text-text-muted">Take 1-3 photos for best results</p>
    </div>
    <button 
      onclick={handleCancel}
      class="p-2 hover:bg-surface-light rounded-lg transition-colors"
      aria-label="Cancel"
      title="Cancel"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
  
  <!-- Error -->
  {#if error}
    <div class="bg-danger/20 text-danger rounded-lg p-3 text-sm">
      {error}
    </div>
  {/if}
  
  <!-- Image Upload Slots -->
  <div class="space-y-3">
    {#each imageTypes as { type, label, description }}
      {@const existingImage = images.find(img => img.type === type)}
      
      {#if existingImage}
        <!-- Image Preview -->
        <div class="relative rounded-xl overflow-hidden bg-surface-light">
          <img 
            src={existingImage.previewUrl} 
            alt={label}
            class="w-full h-40 object-cover"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
            <div class="flex items-center justify-between w-full">
              <div>
                <span class="text-white font-medium text-sm">{label}</span>
                <span class="text-white/70 text-xs block">{description}</span>
              </div>
              <button
                onclick={() => removeImage(existingImage.id)}
                class="p-2 bg-danger/80 hover:bg-danger text-white rounded-lg transition-colors"
                aria-label="Remove image"
                title="Remove image"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
          {#if type === 'primary'}
            <div class="absolute top-2 left-2">
              <span class="bg-primary text-white text-xs px-2 py-1 rounded-full">Required</span>
            </div>
          {/if}
        </div>
      {:else}
        <!-- Upload Slot -->
        <label class="block cursor-pointer">
          <input
            type="file"
            accept="image/*"
            capture={type === 'primary' ? 'environment' : undefined}
            onchange={(e) => handleFileSelect(type, e)}
            class="hidden"
            disabled={isProcessing}
          />
          <div class="border-2 border-dashed border-surface-light hover:border-primary/50 rounded-xl p-6 transition-colors {
            type === 'primary' ? 'border-primary/30 bg-primary/5' : ''
          }">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-xl bg-surface-light flex items-center justify-center">
                <svg class="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {#if type === 'primary'}
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  {:else if type === 'detail'}
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  {:else}
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  {/if}
                </svg>
              </div>
              <div class="flex-1">
                <div class="font-medium {type === 'primary' ? 'text-primary' : 'text-text'}">
                  {type === 'primary' ? '📷 Take Photo' : `Add ${label}`}
                </div>
                <div class="text-sm text-text-muted">{description}</div>
              </div>
              <svg class="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
        </label>
      {/if}
    {/each}
  </div>
  
  <!-- Processing Indicator -->
  {#if isProcessing}
    <div class="flex items-center gap-2 text-sm text-text-muted">
      <div class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      Processing image...
    </div>
  {/if}
  
  <!-- Tips -->
  <div class="bg-surface-light/50 rounded-lg p-3 text-sm space-y-1">
    <p class="font-medium text-text">📸 Photo Tips:</p>
    <ul class="text-text-muted space-y-1 ml-4">
      <li>• Good lighting helps identification</li>
      <li>• Include the whole equipment in main photo</li>
      <li>• Usage guide plate shows intended exercises</li>
    </ul>
  </div>
  
  <!-- Actions -->
  <div class="flex gap-3 pt-2 pb-4">
    <button
      onclick={handleCancel}
      class="flex-1 px-4 py-3 rounded-xl border border-surface-light text-text hover:bg-surface-light transition-colors"
    >
      Cancel
    </button>
    <button
      onclick={handleAnalyze}
      disabled={!canAnalyze}
      class="flex-1 px-4 py-3 rounded-xl bg-primary text-white font-medium transition-all {
        canAnalyze 
          ? 'hover:bg-primary/90 active:scale-[0.98]' 
          : 'opacity-50 cursor-not-allowed'
      }"
    >
      {#if isProcessing}
        Processing...
      {:else}
        Analyze Equipment
      {/if}
    </button>
  </div>
</div>
