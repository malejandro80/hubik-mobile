import { resolveSlashMenu } from '../slashCommands';
import { REGISTER_COMMAND } from '../chatRegistration';
import { CLEAR_COMMAND } from '../../constants/slashCommands';
import { AuthStatus, RoleCapabilities } from '../../types/auth';

const caps = (overrides: Partial<RoleCapabilities> = {}): RoleCapabilities => ({
  canRegisterProperty: false,
  canCreateAgency: false,
  canViewAgencyListings: false,
  ...overrides,
});

const agent = caps({ canRegisterProperty: true });

const commandsOf = (state: ReturnType<typeof resolveSlashMenu>) =>
  state.kind === 'commands' ? state.commands.map((item) => item.command) : [];

describe('resolveSlashMenu', () => {
  it('stays hidden until the text starts with a slash', () => {
    expect(resolveSlashMenu('', agent, 'signedIn')).toEqual({ kind: 'hidden' });
    expect(resolveSlashMenu('pisos en Madrid', agent, 'signedIn')).toEqual({ kind: 'hidden' });
    expect(resolveSlashMenu(' /agregar', agent, 'signedIn')).toEqual({ kind: 'hidden' });
  });

  it('offers the register and clear commands to an agent as soon as they type a slash', () => {
    expect(commandsOf(resolveSlashMenu('/', agent, 'signedIn'))).toStrictEqual([REGISTER_COMMAND, CLEAR_COMMAND]);
  });

  it('narrows to the clear command by prefix', () => {
    expect(commandsOf(resolveSlashMenu('/lim', agent, 'signedIn'))).toStrictEqual([CLEAR_COMMAND]);
  });

  it('narrows by prefix, ignoring case', () => {
    expect(commandsOf(resolveSlashMenu('/agr', agent, 'signedIn'))).toEqual([REGISTER_COMMAND]);
    expect(commandsOf(resolveSlashMenu('/AGREGAR-PROP', agent, 'signedIn'))).toEqual([REGISTER_COMMAND]);
    expect(commandsOf(resolveSlashMenu(REGISTER_COMMAND, agent, 'signedIn'))).toEqual([REGISTER_COMMAND]);
  });

  it('closes when nothing matches, including once an argument is typed', () => {
    expect(resolveSlashMenu('/zzz', agent, 'signedIn')).toEqual({ kind: 'hidden' });
    expect(resolveSlashMenu(`${REGISTER_COMMAND} extra`, agent, 'signedIn')).toEqual({ kind: 'hidden' });
  });

  it('gives each command its key and capability-checked visibility', () => {
    const state = resolveSlashMenu('/', agent, 'signedIn');

    expect(state.kind === 'commands' && state.commands[0].key).toBe('register');
  });

  it.each<[string, RoleCapabilities, AuthStatus]>([
    ['a signed-out visitor', caps(), 'signedOut'],
    ['a client', caps({ canCreateAgency: true }), 'signedIn'],
    ['an owner without publishing rights', caps({ canViewAgencyListings: true }), 'signedIn'],
  ])('shows only a note to %s', (_label, capabilities, status) => {
    expect(resolveSlashMenu('/', capabilities, status)).toEqual({ kind: 'note' });
    expect(resolveSlashMenu('/agr', capabilities, status)).toEqual({ kind: 'note' });
  });

  it('shows nothing while the session is loading', () => {
    expect(resolveSlashMenu('/', caps(), 'loading')).toEqual({ kind: 'hidden' });
    expect(resolveSlashMenu('/', agent, 'loading')).toEqual({ kind: 'hidden' });
  });
});
