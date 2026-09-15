import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { createNodes } from './agents';
import {
  resolveArtifactPaths,
  sanitizeIntent,
  writeArtifacts,
} from './artifacts';
import { evaluateGatekeeper, routeAfterGatekeeper } from './gatekeeper';
import { GeminiRoleProvider } from './llm';
import type {
  ArchitectureState,
  GatekeeperStatus,
  RoleProvider,
} from './types';

const StateAnnotation = Annotation.Root({
  intent: Annotation<string>,
  topologyNotes: Annotation<string>,
  systemsApproved: Annotation<boolean>,
  specDraft: Annotation<string>,
  securityFindings: Annotation<string>,
  securityApproved: Annotation<boolean>,
  qaPlan: Annotation<string>,
  gatekeeperStatus: Annotation<GatekeeperStatus>,
  iteration: Annotation<number>,
  feedback: Annotation<string[]>({
    default: () => [],
    reducer: (a, b) => a.concat(b),
  }),
  specPath: Annotation<string>,
  adrPath: Annotation<string>,
  visited: Annotation<string[]>({
    default: () => [],
    reducer: (a, b) => a.concat(b),
  }),
});

export interface GraphDeps {
  provider?: RoleProvider;
  baseDir?: string;
}

export function compileGraph(deps: GraphDeps = {}) {
  const provider = deps.provider ?? new GeminiRoleProvider();
  const baseDir = deps.baseDir ?? process.cwd();
  const nodes = createNodes(provider);

  const writeArtifactsNode = async (state: ArchitectureState) => {
    const paths = resolveArtifactPaths(state.intent, baseDir);
    writeArtifacts({ ...state, ...paths }, baseDir);
    return {
      ...paths,
      gatekeeperStatus: 'APPROVED' as GatekeeperStatus,
      visited: ['writeArtifacts'],
    };
  };

  const escalateNode = async () => ({
    gatekeeperStatus: 'ESCALATED' as GatekeeperStatus,
    visited: ['escalate'],
  });

  const gatekeeperNode = async (state: ArchitectureState) => {
    const verdict = evaluateGatekeeper(state);
    return {
      gatekeeperStatus: verdict.status,
      iteration: verdict.iteration,
      feedback: verdict.feedback,
      visited: ['gatekeeper'],
    };
  };

  return new StateGraph(StateAnnotation)
    .addNode('lead', async (s) => ({
      ...(await nodes.lead(s)),
      visited: ['lead'],
    }))
    .addNode('systems', async (s) => ({
      ...(await nodes.systems(s)),
      visited: ['systems'],
    }))
    .addNode('spec', async (s) => ({
      ...(await nodes.spec(s)),
      visited: ['spec'],
    }))
    .addNode('security', async (s) => ({
      ...(await nodes.security(s)),
      visited: ['security'],
    }))
    .addNode('qa', async (s) => ({
      ...(await nodes.qa(s)),
      visited: ['qa'],
    }))
    .addNode('gatekeeper', gatekeeperNode)
    .addNode('writeArtifacts', writeArtifactsNode)
    .addNode('escalate', escalateNode)
    .addEdge(START, 'lead')
    .addEdge('lead', 'systems')
    .addEdge('systems', 'spec')
    .addEdge('spec', 'security')
    .addEdge('security', 'qa')
    .addEdge('qa', 'gatekeeper')
    .addConditionalEdges('gatekeeper', routeAfterGatekeeper, {
      approve: 'writeArtifacts',
      revision: 'spec',
      escalate: 'escalate',
    })
    .addEdge('writeArtifacts', END)
    .addEdge('escalate', END)
    .compile();
}

export async function runArchitecturePipeline(
  intent: string,
  deps?: GraphDeps
): Promise<ArchitectureState> {
  const graph = compileGraph(deps);
  const result = await graph.invoke({
    intent,
    gatekeeperStatus: 'PENDING',
    iteration: 0,
    systemsApproved: false,
    securityApproved: false,
    specPath: '',
    adrPath: '',
  });
  return result as ArchitectureState;
}

async function main(): Promise<void> {
  const intent = process.argv[2] ?? '';
  if (!sanitizeIntent(intent)) {
    console.error('Usage: npm run arch-team -- "<mobile-feature-or-system-goal>"');
    process.exit(1);
  }
  try {
    const state = await runArchitecturePipeline(intent);
    console.log(`\n🧩 Architecture Team trace: ${state.visited.join(' → ')}`);
    console.log(`Status: ${state.gatekeeperStatus}`);
    if (state.specPath) console.log(`Spec:  ${state.specPath}`);
    if (state.adrPath) console.log(`ADR:   ${state.adrPath}`);
    if (state.feedback.length) console.log(`Feedback: ${state.feedback.join('; ')}`);
    process.exit(state.gatekeeperStatus === 'ESCALATED' ? 2 : 0);
  } catch (error) {
    console.error('[arch-team] Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  void main();
}
