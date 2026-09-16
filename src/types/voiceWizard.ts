export type WizardStep = 1 | 2 | 3;

export type Step1SubState =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'review_draft'
  | 'clarifying'
  | 'step_1_complete';

export type Step2SubState =
  | 'location_check'
  | 'photo_upload'
  | 'step_2_complete';

export type Step3SubState =
  | 'cadastral_check'
  | 'owner_data'
  | 'final_review'
  | 'publishing'
  | 'published';

export interface ExtractedPropertyData {
  property_type?: string;
  operation_type?: 'sale' | 'rent';
  title?: string;
  city?: string;
  neighborhood?: string;
  address?: string;
  price?: number;
  currency?: 'EUR' | 'USD';
  bedrooms?: number;
  bathrooms?: number;
  square_meters?: number;
  has_elevator?: boolean;
  elevator_cota_cero?: boolean;
  has_parking?: boolean;
  parking_included?: boolean;
  description?: string;
  confidence?: number;
}

export interface ClarificationQuestion {
  id: string;
  field: keyof ExtractedPropertyData;
  question: string;
  explanation?: string;
  answered: boolean;
  answer?: boolean;
}

export type PhotoCategory = 'fachada' | 'salon' | 'cocina' | 'otros';

export interface CategorizedPhoto {
  id: string;
  category: PhotoCategory;
  uri: string;
  label: string;
}

export interface WizardState {
  currentStep: WizardStep;
  step1State: Step1SubState;
  step2State: Step2SubState;
  step3State: Step3SubState;
  transcript: string;
  data: ExtractedPropertyData;
  questions: ClarificationQuestion[];
  activeQuestionIndex: number;
  photos: CategorizedPhoto[];
  cadastralReference?: string;
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  isPublishing: boolean;
  error?: string;
}

export type WizardAction =
  | { type: 'START_RECORDING' }
  | { type: 'STOP_RECORDING' }
  | { type: 'PROCESS_TEXT'; payload: string }
  | { type: 'EXTRACTION_SUCCESS'; payload: { data: ExtractedPropertyData; questions?: ClarificationQuestion[] } }
  | { type: 'EXTRACTION_ERROR'; payload: string }
  | { type: 'ANSWER_QUESTION'; payload: { questionId: string; answer: boolean } }
  | { type: 'UPDATE_FIELD'; payload: { field: keyof ExtractedPropertyData; value: any } }
  | { type: 'CONFIRM_LOCATION'; payload: { address: string; city: string; neighborhood: string } }
  | { type: 'ADD_PHOTO'; payload: CategorizedPhoto }
  | { type: 'REMOVE_PHOTO'; payload: string }
  | { type: 'SET_CADASTRAL_REF'; payload: string }
  | { type: 'SET_OWNER_DATA'; payload: { name: string; phone: string; email: string } }
  | { type: 'GO_TO_STEP'; payload: WizardStep }
  | { type: 'START_PUBLISHING' }
  | { type: 'PUBLISH_SUCCESS' }
  | { type: 'PUBLISH_ERROR'; payload: string }
  | { type: 'RESET' };
