import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const generateFollowUpQuestion = async (complaintText: string) => {
  // Using gemini-1.5-flash as gemini-2.5-flash-lite is not a known version yet
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const prompt = `
    You are a helpful customer service assistant. 
    A user has submitted the following complaint:
    "${complaintText}"
    
    Please generate exactly one short, relevant follow-up question to help understand the situation better.
    Return only the question text.
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text().trim();
};
