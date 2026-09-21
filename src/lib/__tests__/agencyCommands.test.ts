import { parseAgencyCommand } from '../agencyCommands';

describe('parseAgencyCommand add', () => {
  it.each([
    ['agrega a ana@correo.com como agente', 'ana@correo.com'],
    ['Agrega a Ana@Correo.COM como agente', 'ana@correo.com'],
    ['añade a ana@correo.com', 'ana@correo.com'],
    ['invita a ana@correo.com a mi inmobiliaria', 'ana@correo.com'],
    ['ana@correo.com como agente, por favor', 'ana@correo.com'],
    ['por favor agrega ana@correo.com.', 'ana@correo.com'],
    ['quiero agregar como agente a ana.perez+hubik@correo.co.uk', 'ana.perez+hubik@correo.co.uk'],
  ])('reads "%s" as adding %s', (text, email) => {
    expect(parseAgencyCommand(text)).toEqual({ type: 'add_agent', email });
  });

  it.each(['agrega un agente', 'quiero añadir un agente nuevo', 'invitar agente'])(
    'asks for the email when "%s" has none',
    (text) => {
      expect(parseAgencyCommand(text)).toEqual({ type: 'add_agent_missing_email' });
    }
  );

  it('does not treat a bare email as a command', () => {
    expect(parseAgencyCommand('ana@correo.com')).toBeNull();
  });
});

describe('parseAgencyCommand cancel', () => {
  it.each([
    ['cancela la invitación de luis@correo.com', 'luis@correo.com'],
    ['Cancelar invitación a Luis@Correo.com', 'luis@correo.com'],
    ['quita a luis@correo.com', 'luis@correo.com'],
    ['elimina la invitación de luis@correo.com', 'luis@correo.com'],
    ['borra luis@correo.com de las invitaciones', 'luis@correo.com'],
  ])('reads "%s" as cancelling %s', (text, email) => {
    expect(parseAgencyCommand(text)).toEqual({ type: 'cancel_invite', email });
  });

  it('lets a cancel word win over an add word in the same sentence', () => {
    expect(parseAgencyCommand('no agregues, cancela a luis@correo.com como agente')).toEqual({
      type: 'cancel_invite',
      email: 'luis@correo.com',
    });
  });

  it('does not guess when there is no email', () => {
    expect(parseAgencyCommand('cancela la invitación')).toBeNull();
  });
});

describe('parseAgencyCommand team questions', () => {
  it.each(['¿cuántos agentes tengo?', 'cuantos agentes hay', 'número de agentes', 'cuántas invitaciones tengo'])(
    'reads "%s" as a count',
    (text) => {
      expect(parseAgencyCommand(text)).toEqual({ type: 'count_team' });
    }
  );

  it.each(['¿quiénes son mis agentes?', 'quiénes son mi equipo', 'muéstrame mis agentes', 'lista mi equipo', 'ver invitaciones'])(
    'reads "%s" as a list request',
    (text) => {
      expect(parseAgencyCommand(text)).toEqual({ type: 'list_team' });
    }
  );
});

describe('parseAgencyCommand go home', () => {
  it.each(['vuelve al inicio', 'llévame al inicio', 'ir al chat', 'volver al chat principal', 'regresa a la pantalla principal'])(
    'reads "%s" as going home',
    (text) => {
      expect(parseAgencyCommand(text)).toEqual({ type: 'go_home' });
    }
  );
});

describe('parseAgencyCommand unrelated text', () => {
  it.each(['hola', 'busca casas en Madrid', 'gracias', '', '   ', '¿qué tiempo hace?'])('returns null for "%s"', (text) => {
    expect(parseAgencyCommand(text)).toBeNull();
  });
});
