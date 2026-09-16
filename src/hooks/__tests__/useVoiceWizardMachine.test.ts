import { act, renderHook } from '@testing-library/react-native';
import { useVoiceWizardMachine } from '../useVoiceWizardMachine';

describe('useVoiceWizardMachine', () => {
  it('initializes in Step 1 Idle state with empty draft', () => {
    const { result } = renderHook(() => useVoiceWizardMachine());

    expect(result.current.state.currentStep).toBe(1);
    expect(result.current.state.step1State).toBe('idle');
    expect(result.current.state.data).toEqual({});
    expect(result.current.state.questions).toEqual([]);
    expect(result.current.state.photos).toEqual([]);
  });

  it('handles recording lifecycle: start -> stop', () => {
    const { result } = renderHook(() => useVoiceWizardMachine());

    act(() => {
      result.current.startRecording();
    });
    expect(result.current.state.step1State).toBe('recording');

    act(() => {
      result.current.stopRecording();
    });
    expect(result.current.state.step1State).toBe('processing');
  });

  it('processes text/speech and extracts structured attributes with binary questions', () => {
    const { result } = renderHook(() => useVoiceWizardMachine());

    const samplePrompt =
      'Quiero poner a la venta mi piso en Chamberí de 3 habitaciones por 420.000 euros con ascensor.';

    act(() => {
      result.current.processInput(samplePrompt);
    });

    expect(result.current.state.transcript).toBe(samplePrompt);
    expect(result.current.state.data.property_type).toBe('Piso');
    expect(result.current.state.data.neighborhood).toBe('Chamberí');
    expect(result.current.state.data.bedrooms).toBe(3);
    expect(result.current.state.data.price).toBe(420000);
    expect(result.current.state.data.has_elevator).toBe(true);

    // Should generate 2 senior-friendly binary clarification questions
    expect(result.current.state.questions.length).toBe(2);
    expect(result.current.state.step1State).toBe('clarifying');
    expect(result.current.state.activeQuestionIndex).toBe(0);
  });

  it('answers binary questions sequentially and marks Step 1 complete', () => {
    const { result } = renderHook(() => useVoiceWizardMachine());

    act(() => {
      result.current.processInput('Piso en Chamberí con ascensor por 420000');
    });

    const firstQuestion = result.current.state.questions[0];
    const secondQuestion = result.current.state.questions[1];

    // Answer [SÍ] to first question (cota cero)
    act(() => {
      result.current.answerQuestion(firstQuestion.id, true);
    });

    expect(result.current.state.data.elevator_cota_cero).toBe(true);
    expect(result.current.state.activeQuestionIndex).toBe(1);
    expect(result.current.state.step1State).toBe('clarifying');

    // Answer [NO] to second question (parking)
    act(() => {
      result.current.answerQuestion(secondQuestion.id, false);
    });

    expect(result.current.state.data.parking_included).toBe(false);
    expect(result.current.state.step1State).toBe('step_1_complete');
  });

  it('allows manual field updates in draft review', () => {
    const { result } = renderHook(() => useVoiceWizardMachine());

    act(() => {
      result.current.processInput('Piso en Chamberí');
    });

    act(() => {
      result.current.updateField('price', 450000);
      result.current.updateField('bathrooms', 2);
    });

    expect(result.current.state.data.price).toBe(450000);
    expect(result.current.state.data.bathrooms).toBe(2);
  });

  it('navigates to Step 2 and manages location and categorized photos', () => {
    const { result } = renderHook(() => useVoiceWizardMachine());

    act(() => {
      result.current.processInput('Piso en Chamberí 420000');
    });

    act(() => {
      result.current.goToStep(2);
    });

    expect(result.current.state.currentStep).toBe(2);
    expect(result.current.state.step2State).toBe('location_check');

    // Confirm location
    act(() => {
      result.current.confirmLocation({
        address: 'Calle Santa Engracia 45',
        city: 'Madrid',
        neighborhood: 'Chamberí',
      });
    });

    expect(result.current.state.data.address).toBe('Calle Santa Engracia 45');
    expect(result.current.state.data.city).toBe('Madrid');
    expect(result.current.state.step2State).toBe('photo_upload');

    // Add categorized photos
    act(() => {
      result.current.addPhoto({
        id: 'photo-1',
        category: 'fachada',
        uri: 'file:///photo-1.jpg',
        label: 'Fachada principal',
      });
      result.current.addPhoto({
        id: 'photo-2',
        category: 'salon',
        uri: 'file:///photo-2.jpg',
        label: 'Salón luminoso',
      });
    });

    expect(result.current.state.photos.length).toBe(2);

    // Remove photo
    act(() => {
      result.current.removePhoto('photo-2');
    });
    expect(result.current.state.photos.length).toBe(1);
    expect(result.current.state.photos[0].id).toBe('photo-1');
  });

  it('navigates to Step 3 and manages cadastral and isolated owner PII', () => {
    const { result } = renderHook(() => useVoiceWizardMachine());

    act(() => {
      result.current.goToStep(3);
    });

    expect(result.current.state.currentStep).toBe(3);
    expect(result.current.state.step3State).toBe('cadastral_check');

    // Set cadastral reference
    act(() => {
      result.current.setCadastralRef('9872023VH5797S0001WX');
    });

    expect(result.current.state.cadastralReference).toBe('9872023VH5797S0001WX');
    expect(result.current.state.step3State).toBe('owner_data');

    // Set isolated owner PII
    act(() => {
      result.current.setOwnerData({
        name: 'Don Carlos',
        phone: '+34 600 123 456',
        email: 'carlos@example.com',
      });
    });

    expect(result.current.state.ownerName).toBe('Don Carlos');
    expect(result.current.state.ownerPhone).toBe('+34 600 123 456');
    expect(result.current.state.ownerEmail).toBe('carlos@example.com');
    expect(result.current.state.step3State).toBe('final_review');

    // Publish
    act(() => {
      result.current.publishProperty();
    });
    expect(result.current.state.step3State).toBe('published');
  });

  it('resets the wizard back to initial Step 1 state', () => {
    const { result } = renderHook(() => useVoiceWizardMachine());

    act(() => {
      result.current.processInput('Piso en Chamberí');
      result.current.goToStep(2);
    });

    expect(result.current.state.currentStep).toBe(2);

    act(() => {
      result.current.reset();
    });

    expect(result.current.state.currentStep).toBe(1);
    expect(result.current.state.step1State).toBe('idle');
    expect(result.current.state.data).toEqual({});
  });
});
