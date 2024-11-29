import { Configuration, OpenAIApi } from "openai-edge";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create a Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Create a rate limiter that allows 5 requests per 24 hours
const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, "1440 m"),
});

export const runtime = "edge";

// Helper function to poll Replicate prediction
async function pollReplicatePrediction(
  predictionId: string,
  maxAttempts = 120,
  interval = 2000
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        {
          headers: {
            Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const prediction = await response.json();
      console.log(`Attempt ${attempt + 1}: Status - ${prediction.status}`);

      if (prediction.status === "succeeded") {
        return prediction.output[0];
      }

      if (prediction.status === "failed") {
        throw new Error(`Prediction failed: ${prediction.error}`);
      }

      if (prediction.status === "canceled") {
        throw new Error("Prediction was canceled");
      }

      if (!["starting", "processing"].includes(prediction.status)) {
        throw new Error(`Unexpected status: ${prediction.status}`);
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      console.error(`Attempt ${attempt + 1} failed:`, error);
    }
  }

  throw new Error("Prediction timed out");
}

// Helper function to extract JSON from a string that might contain extra text
function extractJSON(str: string): any {
  try {
    // First try parsing the string directly
    return JSON.parse(str);
  } catch (e) {
    // If that fails, try to find JSON-like content
    const match = str.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e) {
        throw new Error("Failed to parse metadata JSON");
      }
    }
    throw new Error("No valid JSON found in response");
  }
}

export async function POST(req: Request) {
  // Skip rate limiting in development
  if (process.env.NODE_ENV === "development") {
    // Proceed without rate limit check
  } else {
    // Existing rate limit logic
    const ip = req.headers.get("x-forwarded-for");
    const { success } = await ratelimit.limit(ip ?? "anonymous");
    if (!success) {
      return new Response(
        "You have exceeded the rate limit. Please try again later.",
        { status: 429 }
      );
    }
  }

  // Extract the prompt from the body
  const { prompt } = await req.json();

  // Generate comprehensive NFT metadata using GPT-4
  const { textStream: metadataStream } = await streamText({
    model: openai("gpt-4o-mini"),
    messages: [
      {
        role: "system",
        content: `You are an NFT metadata specialist. Your task is to return ONLY a JSON object with no additional text or explanation.
The JSON must follow this exact structure:
{
  "title": "A creative title for the NFT",
  "enhancedPrompt": "The enhanced art generation prompt",
  "description": "A detailed description of the artwork",
  "attributes": [
    {
      "trait_type": "Art Style",
      "value": "The primary art style"
    },
    {
      "trait_type": "Color Palette",
      "value": "Main colors used"
    },
    {
      "trait_type": "Mood",
      "value": "The emotional tone"
    },
    {
      "trait_type": "Theme",
      "value": "The main theme"
    }
  ]
}

Remember:
1. Return ONLY the JSON object
2. No explanations or additional text
3. Ensure it's valid JSON with proper quotes and commas`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    maxTokens: 500,
    temperature: 0.7,
  });

  // Convert the stream to a string and safely parse the JSON
  const metadataString = await streamToString(metadataStream);
  let metadata;
  try {
    metadata = extractJSON(metadataString);
  } catch (error) {
    console.error("Failed to parse metadata:", metadataString);
    return new Response(
      JSON.stringify({
        error: "Failed to generate metadata",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500 }
    );
  }

  // Generate the image using Replicate with the enhanced prompt
  const imageResponse = await fetch(
    "https://api.replicate.com/v1/predictions",
    {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version:
          "a45f82a1382bed5c7aeb861dac7c7d191b0fdf74d8d57c4a0e6ed7d4d0bf7d24",
        input: {
          prompt: metadata.enhancedPrompt,
          negative_prompt: "ugly, blurry, low quality, distorted, deformed",
          num_inference_steps: 50,
          guidance_scale: 7.5,
          width: 1024,
          height: 1024,
        },
      }),
    }
  );

  if (!imageResponse.ok) {
    const error = await imageResponse.json();
    console.error("Replicate API error:", error);
    throw new Error(
      `Failed to generate image: ${error.detail || "Unknown error"}`
    );
  }

  const imageJson = await imageResponse.json();

  // Poll for the prediction result
  try {
    const imageUrl = await pollReplicatePrediction(imageJson.id);

    // Return the metadata and image URL
    const result = JSON.stringify({
      imageUrl,
      originalPrompt: prompt,
      ...metadata,
    });

    // Return the response
    return new Response(result, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Prediction error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate image",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500 }
    );
  }
}

async function streamToString(stream: ReadableStream<any>): Promise<string> {
  const reader = stream.getReader();
  const chunks: string[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  return chunks.join("");
}
