
import OpenAI from 'openai';

const client = new OpenAI({
    baseURL: 'https://inference.do-ai.run/v1',
    apiKey: 'sk-do-6vAbkUCpsvK-675fcvLi0f1QFlgwVACHPZa_9HCVs92D-y4z9a4P-hH-aE',
});

async function main() {
    try {
        console.log("Testing DigitalOcean Serverless Inference API...\n");

        // 1. List Available Models
        console.log("Fetching available models...");
        const models = await client.models.list();
        console.log("Available models:");
        models.data.forEach(model => console.log(`- ${model.id}`));
        console.log("\n-----------------------------------\n");

        // 2. Ask "Who is Elon Musk?"
        console.log("Asking: Who is Elon Musk?...");
        const completion = await client.chat.completions.create({
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: "Who is Donald Trump?" }
            ],
            model: "llama3-8b-instruct",
        });

        console.log("Response received:");
        console.log(completion.choices[0].message.content);

    } catch (error) {
        console.error("Error:", error);
    }
}

main();
