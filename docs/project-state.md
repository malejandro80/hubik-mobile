# Living Project State

- **Last Updated**: 2026-09-12
- **Current Milestone**: Template Inception & Scaffolding
- **Status**: Ready for Project Instantiation

---

## 🎯 Architecture Summary
- **Governance**: Root `AGENTS.md` index + `.agents/rules/`.
- **Skill Suite**: Unified Single Pack (8 lifecycle skills in `.agents/skills/`).
- **Language Support**: Polyglot auto-detection (Python, TypeScript, Go, Rust, Java).
- **Quality Gates**: Universal 4-target toolchain contract (`scripts/verify.sh`) + pre-commit secret quarantine hook.

---

## 📌 Next Action Items
1. Run `./scripts/init-project.sh --name <app> --stack <lang>` to bootstrap your desired language environment.
2. Draft first RFC in `specs/` using `specs/000-spec-template.md`.
