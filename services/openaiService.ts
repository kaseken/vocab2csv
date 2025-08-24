import OpenAI from 'openai';

// You'll need to set your OpenAI API key
const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
});

export interface VocabPair {
  en: string;
  ja: string;
}

export async function processVocabularyText(extractedText: string[]): Promise<VocabPair[]> {
  try {
    const textToProcess = extractedText.join('\n');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `Instructions:
• Extract pairs of English words <-> Japanese explanations from OCR-scanned text.
• Correct any OCR reading errors that you identify.
• Output Format: Return as JSON array of objects with "en" and "ja" fields/
• Do not include pronunciation symbols, parts of speech, synonyms, or other supplementary information.

Example output format:
[
  {"en": "evaporate", "ja": "蒸発する、気化する；霧消する"},
  {"en": "cunning", "ja": "ずる賢い、狡猾な；巧妙な、精巧な"}
]`
        },
        {
          role: "user",
          content: `Input:
${textToProcess}`
        }
      ],
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const vocabPairs: VocabPair[] = JSON.parse(response);
    return vocabPairs;

  } catch (error) {
    console.error('Error processing vocabulary text:', error);
    throw error;
  }
}
