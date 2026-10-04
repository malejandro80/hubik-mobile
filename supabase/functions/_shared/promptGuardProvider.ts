import { PromptGuard } from './promptGuard.ts';
import { regexPromptGuard } from './regexPromptGuard.ts';

export const promptGuard: PromptGuard = regexPromptGuard;
