import dotenv from 'dotenv';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

dotenv.config();

const IcebreakerSchema = z.object({
    items: z.array(
        z.object({
            topic: z.string(),
            questions: z.array(z.string()).length(5)
        }),
    ),
}).describe('Icebreaker questions for each topic');

const SYSTEM_PROMPT = [
    `You are an expert in generating engaging icebreaker questions for group discussions between strangers.`,
    `For each topic provided, generate 5 icebreaker discussion questions.`,
    `Questions should be spicy, fun, thought-provoking, or controversial in nature to lead to spirited debate or discussion.`,
    `Try to tie recent news, developments, or trends into the questions.`,
    `There is no need to cite sources.`,
    `Follow the same order as the topics provided.`,
].join(' ');

export async function generateIcebreakerQuestions(topics: string[]): Promise<{ topic: string; questions: string[] }[]> {
    if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL) {
        console.warn('Missing OpenAI API key or model. Returning empty results.');
        return topics.map(topic => ({ topic, questions: [] }));
    }

    const sanitizedTopics = topics.map(topic => 
        topic.replace(/[^0-9a-z-_?! ]/gi, '').trim()
    );
    const userPrompt = sanitizedTopics.map(topic => `* ${topic}`).join('\n');

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: process.env.OPENAI_MODEL || 'gpt-4.1-nano',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: userPrompt },
                ],
                ...(process.env.SEARCH_ENABLED === '1'
                    ? {
                        web_search_options: {
                            search_context_size: 'medium',
                            user_location: { type: 'approximate', approximate: { country: 'US' } },
                        },
                    }
                    : {}
                ),
                max_tokens: 8192,
                response_format: {
                    "type": "json_schema",
                    "json_schema": {
                        "name": "output",
                        "description": "Icebreaker questions for each topic",
                        "strict": true,
                        "schema": zodToJsonSchema(IcebreakerSchema),
                    },
                },
            }),
        });


        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;

        // Validate the structured JSON output using Zod
        const parsedItems = IcebreakerSchema.parse(JSON.parse(content)).items;

        // Remap the result topic names to the input topics based on their order
        return sanitizedTopics.map((inputTopic, index) => ({
            topic: inputTopic,
            questions: parsedItems[index]?.questions || []
        }));
    } catch (error) {
        console.error(`Failed to generate icebreaker questions for topics: ${topics.join(', ')}`, error);
        return topics.map(topic => ({ topic, questions: [] }));
    }
}
