import { PROMPT_FILTER_CITIES } from '../constants/chatApi';
import {
  extractPropertyType,
  parsePromptFilters as parsePromptFiltersWithCities,
  PromptFilters,
} from '../../supabase/functions/_shared/promptFilters';

export { extractPropertyType };

export const parsePromptFilters = (message: string): PromptFilters =>
  parsePromptFiltersWithCities(message, PROMPT_FILTER_CITIES);
