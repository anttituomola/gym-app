import { v } from "convex/values";
import { action } from "./_generated/server";

/**
 * Server-side AI Equipment Recognition
 * 
 * This runs on Convex's servers, avoiding CORS issues when calling
 * external AI APIs like OpenAI and Anthropic.
 */

// Latest models as of March 2026
const DEFAULT_MODELS = {
  openai: "gpt-5.2",
  anthropic: "claude-sonnet-4.5",
} as const;

/**
 * Analyze equipment photos using AI vision models
 * Called from the frontend, executed on Convex servers
 */
export const analyzeEquipmentPhotos = action({
  args: {
    images: v.array(
      v.object({
        base64: v.string(),
        mimeType: v.string(),
      })
    ),
    provider: v.union(v.literal("openai"), v.literal("anthropic")),
    apiKey: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { images, provider, apiKey, model } = args;

    if (images.length === 0) {
      throw new Error("At least one image is required");
    }
    if (images.length > 3) {
      throw new Error("Maximum 3 images allowed");
    }

    const selectedModel = model || DEFAULT_MODELS[provider];

    try {
      if (provider === "openai") {
        return await callOpenAIVision(images, apiKey, selectedModel);
      } else {
        return await callAnthropicVision(images, apiKey, selectedModel);
      }
    } catch (error) {
      console.error("AI API error:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to analyze images"
      );
    }
  },
});

/**
 * Call OpenAI Vision API
 */
async function callOpenAIVision(
  images: { base64: string; mimeType: string }[],
  apiKey: string,
  model: string
) {
  const content: any[] = [
    {
      type: "text",
      text: buildRecognitionPrompt(images.length),
    },
    ...images.map((img) => ({
      type: "image_url",
      image_url: {
        url: `data:${img.mimeType};base64,${img.base64}`,
      },
    })),
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a fitness equipment expert that responds only with valid JSON.",
        },
        {
          role: "user",
          content: content as any,
        },
      ],
      max_completion_tokens: 2000,
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const rawContent = data.choices[0]?.message?.content || "";

  // Parse and validate the JSON response
  return parseAndValidateResponse(rawContent);
}

/**
 * Call Anthropic Vision API
 */
async function callAnthropicVision(
  images: { base64: string; mimeType: string }[],
  apiKey: string,
  model: string
) {
  const content: any[] = [
    {
      type: "text",
      text: `You are a fitness equipment expert that responds only with valid JSON.\n\n${buildRecognitionPrompt(images.length)}`,
    },
    ...images.map((img) => ({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mimeType,
        data: img.base64,
      },
    })),
  ];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: content as any,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const rawContent = data.content?.[0]?.text || "";

  return parseAndValidateResponse(rawContent);
}

/**
 * Build the prompt for equipment recognition
 */
function buildRecognitionPrompt(imageCount: number): string {
  const imageDescriptions = [
    "the primary/main image",
    "the detail/secondary image",
    "the usage guide plate image",
  ].slice(0, imageCount);

  return `You are an expert fitness equipment identifier. Analyze the ${imageCount > 1 ? `${imageCount} images` : "image"} of gym equipment I'm providing.

${imageCount > 1 ? `I'm providing ${imageCount} images:` : "The image shows:"}
${imageDescriptions.map((desc, i) => `${i + 1}. ${desc}`).join("\n")}

## YOUR TASK

1. **Identify the equipment**:
   - What is the standard/common name for this equipment?
   - Create a URL-friendly normalized name (lowercase, hyphens)
   - What category does it belong to?
   - Briefly describe what it is and how it's typically used
   - How confident are you in this identification (0.0-1.0)?

2. **Suggest exercises** (3-8 exercises that can be performed):
   - Standard exercise name
   - URL-friendly normalized name
   - Category: legs/push/pull/core/cardio/full-body
   - Primary muscles targeted (1-5 muscles)
   - Brief form description
   - Confidence this exercise works with this equipment (0.0-1.0)

## CATEGORIES
- barbell: Barbells, Olympic bars
- dumbbell: Dumbbells, adjustable dumbbells
- machine: Weight machines, Smith machines
- cable: Cable machines, pulley systems
- kettlebell: Kettlebells
- cardio: Treadmills, bikes, rowers, ellipticals
- bodyweight: Pull-up bars, dip stations, parallettes
- other: Anything else

## RESPONSE FORMAT
Respond with ONLY valid JSON:

{
  "equipment": {
    "name": "Cable Crossover Machine",
    "normalizedName": "cable-crossover-machine",
    "category": "cable",
    "description": "A machine with adjustable pulleys on both sides...",
    "confidence": 0.95
  },
  "suggestedExercises": [
    {
      "name": "Cable Chest Fly",
      "normalizedName": "cable-chest-fly",
      "category": "push",
      "primaryMuscles": ["chest", "front-delts"],
      "description": "Stand in center, bring handles together at chest level...",
      "confidence": 0.92
    }
  ]
}

Rules:
- Use standard gym terminology
- Be specific (e.g., "Adjustable Cable Machine" not just "Machine")
- If usage guide plate is visible, extract exercises shown there
- Only suggest exercises appropriate for the equipment type
- Confidence should reflect your certainty in identification`;
}

/**
 * Parse and validate the AI response
 */
function parseAndValidateResponse(rawResponse: string): any {
  // Parse JSON
  let parsed: any;
  try {
    parsed = JSON.parse(rawResponse);
  } catch (e) {
    throw new Error(
      `Failed to parse AI response as JSON: ${e instanceof Error ? e.message : "Unknown error"}`
    );
  }

  // Basic validation
  if (!parsed.equipment || !parsed.suggestedExercises) {
    throw new Error("AI response missing required fields");
  }

  if (parsed.equipment.confidence < 0.3) {
    throw new Error(
      "AI confidence too low (< 30%). Please try with clearer photos."
    );
  }

  return parsed;
}
