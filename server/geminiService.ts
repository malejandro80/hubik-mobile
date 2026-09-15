import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { PropertyRepository } from './propertyRepository';
import { Property, PropertyFilterParams, PropertyFilterSchema } from './types';

dotenv.config();

const SYSTEM_INSTRUCTION = `You are the Hubik Real Estate AI Assistant.
Your job is to help users find properties in the database by converting their natural language questions into structured search filter parameters using the search_properties tool.

Database Schema for "properties" table:
- title: string (e.g. "Modern 2-Bed Condo")
- property_type: "Apartment" | "Single Family" | "Townhouse" | "Studio" | "Condo"
- price: numeric (e.g. 385000)
- bedrooms: integer (0 for studio, 1, 2, 3, 4, 5)
- bathrooms: numeric (e.g. 1.0, 1.5, 2.0, 2.5)
- square_feet: integer (e.g. 1050)
- city: string ("Austin", "Miami", "Denver", "Seattle", "New York")
- address: string
- status: "Available" | "Pending" | "Sold"

Rules:
1. Always call the search_properties tool when the user is asking for, describing, or searching properties.
2. If the user does not specify a status, leave it empty or use "Available".
3. Extract exact numeric thresholds for price and bedrooms whenever mentioned (e.g. "under 400k" -> max_price: 400000, "2 bed" -> min_bedrooms: 2).
4. If the user asks a general conversational greeting (e.g. "Hello!"), answer politely and offer examples of queries they can ask.`;

const searchPropertiesDeclaration = {
  name: 'search_properties',
  description:
    'Search real estate properties in the database using structured filters extracted from the user query.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      city: {
        type: Type.STRING,
        description: 'City where the property is located (e.g. Austin, Miami, Denver, Seattle, New York)',
      },
      property_type: {
        type: Type.STRING,
        description: 'Type of property: Apartment, Single Family, Townhouse, Studio, or Condo',
      },
      min_price: {
        type: Type.NUMBER,
        description: 'Minimum price in USD',
      },
      max_price: {
        type: Type.NUMBER,
        description: 'Maximum price in USD',
      },
      min_bedrooms: {
        type: Type.INTEGER,
        description: 'Minimum number of bedrooms',
      },
      max_bedrooms: {
        type: Type.INTEGER,
        description: 'Maximum number of bedrooms',
      },
      min_bathrooms: {
        type: Type.NUMBER,
        description: 'Minimum number of bathrooms',
      },
      min_square_feet: {
        type: Type.INTEGER,
        description: 'Minimum square footage',
      },
      max_square_feet: {
        type: Type.INTEGER,
        description: 'Maximum square footage (e.g. "less than 1000 square feet" -> 1000)',
      },
      limit: {
        type: Type.INTEGER,
        description: 'Number of properties to return (e.g. "give 3 properties" -> 3)',
      },
      status: {
        type: Type.STRING,
        description: 'Status: Available, Pending, or Sold',
      },
      sort_by: {
        type: Type.STRING,
        description: 'Sort by: price_asc, price_desc, bedrooms_desc, square_feet_desc, newest',
      },
    },
  },
};

export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private repository: PropertyRepository;

  constructor(
    repository: PropertyRepository,
    options?: { useFallbackOnly?: boolean }
  ) {
    this.repository = repository;
    const isTest = process.env.NODE_ENV === 'test';
    const useFallback =
      options?.useFallbackOnly ?? (isTest && !process.env.LIVE_AI_TEST);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!useFallback && apiKey && apiKey !== 'your_gemini_api_key_here') {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  /**
   * Main end-to-end flow:
   * 1. Schema Grounding & Tool Calling via Gemini
   * 2. Parameter Sanitization via Zod
   * 3. Parameterized Query Execution
   * 4. Natural Language Synthesis
   */
  async processQuery(userMessage: string): Promise<{
    answer: string;
    data: Property[];
    applied_filters?: PropertyFilterParams;
  }> {
    if (!this.ai) {
      // Offline / No API Key rule-based heuristic fallback
      return this.heuristicFallback(userMessage);
    }

    try {
      // Step 1: Tool Calling with Gemini
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userMessage,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: [searchPropertiesDeclaration] }],
        },
      });

      const functionCalls = response.functionCalls;
      const searchCall = functionCalls?.find((fc) => fc.name === 'search_properties');

      if (!searchCall) {
        // Model provided a direct conversational response
        const text = response.text || 'How can I assist you with finding properties today?';
        return { answer: text, data: [] };
      }

      // Step 2 & 3: Validate structured filters & Execute parameterized query
      const validatedFilters = PropertyFilterSchema.parse(searchCall.args || {});
      const properties = await this.repository.filterProperties(validatedFilters);

      // Step 4: Synthesize summary using LLM
      const synthesisPrompt = `The user asked: "${userMessage}".
Here are the ${properties.length} matching properties found in the database:
${JSON.stringify(
  properties.map((p) => ({
    title: p.title,
    city: p.city,
    type: p.property_type,
    price: p.price,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    status: p.status,
  }))
)}

Provide a concise, engaging summary (2-3 sentences) presenting these options to the user. If no properties match, explain politely and suggest broadening the search criteria.`;

      const synthesisResponse = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: synthesisPrompt,
      });

      const answer =
        synthesisResponse.text ||
        `I found ${properties.length} matching properties for your search.`;

      return {
        answer,
        data: properties,
        applied_filters: validatedFilters,
      };
    } catch (error) {
      console.warn('⚠️ [GeminiService] Gemini API call failed, using heuristic fallback:', error);
      return this.heuristicFallback(userMessage);
    }
  }

  /**
   * Rule-based heuristic extraction fallback (runs when GEMINI_API_KEY is not configured
   * or when operating in offline/testing environments).
   */
  private async heuristicFallback(message: string): Promise<{
    answer: string;
    data: Property[];
    applied_filters?: PropertyFilterParams;
  }> {
    const lower = message.toLowerCase();
    const filters: Partial<PropertyFilterParams> = {};

    // City extraction
    const cities = ['Austin', 'Miami', 'Denver', 'Seattle', 'New York'];
    for (const city of cities) {
      if (lower.includes(city.toLowerCase())) {
        filters.city = city;
        break;
      }
    }

    // Property type extraction
    if (lower.includes('apartment') || lower.includes('flat')) {
      filters.property_type = 'Apartment';
    } else if (lower.includes('condo')) {
      filters.property_type = 'Condo';
    } else if (lower.includes('townhouse') || lower.includes('townhome')) {
      filters.property_type = 'Townhouse';
    } else if (lower.includes('studio')) {
      filters.property_type = 'Studio';
    } else if (lower.includes('house') || lower.includes('single family') || lower.includes('home')) {
      filters.property_type = 'Single Family';
    }

    // Price extraction (e.g. "under $400k", "under 400000", "< 500k")
    const maxPriceMatch = lower.match(/(?:under|below|less than|<|max)\s*\$?(\d+)(?:k|,\d{3}|\.000)?/);
    if (maxPriceMatch) {
      let val = parseInt(maxPriceMatch[1], 10);
      if (lower.includes(`${maxPriceMatch[1]}k`)) val *= 1000;
      filters.max_price = val;
    }

    // Bedrooms extraction (e.g. "2-bedroom", "2 bed", "3 bedrooms")
    const bedMatch = lower.match(/(\d+)\s*(?:-| )?(?:bed|bedroom|br)/);
    if (bedMatch) {
      filters.min_bedrooms = parseInt(bedMatch[1], 10);
    }

    // Square feet extraction (e.g. "less 1000 square feets", "under 1000 sqft", "> 1500 sqft")
    const maxSqftMatch = lower.match(
      /(?:less than|less|under|below|<|max)\s*(\d+)\s*(?:square feet|square feets|sqft|sq ft|sq\.ft)?/
    );
    if (maxSqftMatch && (lower.includes('square') || lower.includes('sqft') || lower.includes('sq ft'))) {
      filters.max_square_feet = parseInt(maxSqftMatch[1], 10);
    }
    const minSqftMatch = lower.match(
      /(?:more than|over|above|>|min)\s*(\d+)\s*(?:square feet|square feets|sqft|sq ft|sq\.ft)?/
    );
    if (minSqftMatch && (lower.includes('square') || lower.includes('sqft') || lower.includes('sq ft'))) {
      filters.min_square_feet = parseInt(minSqftMatch[1], 10);
    }

    // Limit extraction (e.g. "give 3 properties", "give 3 properites", "top 5", "show 3")
    const limitMatch = lower.match(/(?:give|show|find|list|top)\s*(?:me\s*)?(\d+)/);
    if (limitMatch) {
      filters.limit = parseInt(limitMatch[1], 10);
    }

    // Sorting extraction
    if (lower.includes('cheapest') || lower.includes('lowest price')) {
      filters.sort_by = 'price_asc';
    } else if (lower.includes('most expensive') || lower.includes('highest price') || lower.includes('luxury')) {
      filters.sort_by = 'price_desc';
    }

    const validatedFilters = PropertyFilterSchema.parse(filters);
    const properties = await this.repository.filterProperties(validatedFilters);

    let answer: string;
    if (properties.length === 0) {
      answer = `I couldn't find any properties matching those criteria. Try expanding your search or asking for properties in Austin, Miami, Denver, Seattle, or New York.`;
    } else {
      const cityText = filters.city ? ` in ${filters.city}` : '';
      const typeText = filters.property_type ? ` ${filters.property_type.toLowerCase()}s` : ' properties';
      answer = `Here are ${properties.length}${typeText}${cityText} matching your criteria:`;
    }

    return {
      answer,
      data: properties,
      applied_filters: validatedFilters,
    };
  }
}
