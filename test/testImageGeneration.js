// test/testImageGeneration.js
import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config(); // Load .env variables

async function generateTimeGuessrImage(prompt) {
  const openai_api_key = process.env.VITE_OPENAI_API_KEY;

  if (!openai_api_key) {
    throw new Error("Missing OPENAI_API_KEY in .env");
  }

  const startTime = Date.now();

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/images/generations",
      {
        model: "gpt-image-1",
        prompt: prompt,
        moderation: "low",
        n: 1,
        output_format: "jpeg", // Important: We expect a JPEG
        quality: "high",
        size: "1024x1024",
      },
      {
        headers: {
          "Authorization": `Bearer ${openai_api_key}`,
          "Content-Type": "application/json"
        }
      }
    );

    const { data } = response;
    const imageData = data?.data?.[0];

    if (!imageData) {
      throw new Error("No image data found in the response.");
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (imageData.url) {
      console.log("✅ Image generated (URL):", imageData.url);
      console.log(`⏱️ Completed in ${duration}s`);
      return { type: "url", content: imageData.url };
    } 
    
    if (imageData.b64_json) {
      console.log("✅ Image generated (Base64): [base64 string]");
      console.log(`⏱️ Completed in ${duration}s`);
      return { type: "b64_json", content: imageData.b64_json };
    }

    throw new Error("Neither URL nor Base64 image found in the response.");

  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || error.message || "Unknown error";
    console.error("❌ Error generating image:", errorMessage);
    throw error;
  }
}

async function runTest() {
  const testPrompt = "A highly detailed, photo-realistic image of a historic nonviolent protest march in rural India during the 1930s. The scene shows a line of peaceful demonstrators walking along a dusty road, wearing traditional cotton garments, some carrying walking sticks or containers for salt. Salt pans shimmer in the distance, with colonial officers observing from afar. The lighting reflects the heat of midday with long shadows and a determined, focused atmosphere. No text or modern artifacts. Realistic proportions, cinematic style.";

  try {
    const result = await generateTimeGuessrImage(testPrompt);

    if (result.type === "url") {
      console.log("🖼️ Image URL:", result.content);
    } else if (result.type === "b64_json") {
      // Prepare the output folder
      const outputDir = path.resolve("test", "images");
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Decode Base64 and save
      const filename = `generated_${Date.now()}.jpeg`; // You can customize filename here
      const filePath = path.join(outputDir, filename);

      const base64Data = result.content.replace(/^data:image\/jpeg;base64,/, ""); // Clean Base64 header if exists
      fs.writeFileSync(filePath, base64Data, "base64");

      console.log(`🖼️ Image saved at: ${filePath}`);
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

runTest();