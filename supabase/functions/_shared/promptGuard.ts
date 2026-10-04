export interface PromptInspection {
  question: string;
  context: string[];
}

export type PromptVerdict =
  | { allowed: true }
  | { allowed: false; reason: 'threat' | 'sensitive'; category: string };

export interface PromptGuard {
  inspect(input: PromptInspection): Promise<PromptVerdict>;
}
