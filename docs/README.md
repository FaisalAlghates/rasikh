# Rasikh documentation

A complete documentation set, written to ISO/IEC/IEEE 29148 and C4 conventions and kept in step with the code. Start with the SRS for _what_, the architecture for _how_, and the operations guide for _running it_.

| Document                                                                      | Question it answers                                              | Audience                           |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------- |
| [SRS](SRS.md)                                                                 | What must the system do, and how do we verify it?                | Product, QA, compliance, engineers |
| [ARCHITECTURE](ARCHITECTURE.md)                                               | How is it built, and why (with decision records)?                | Engineers                          |
| [DATA-MODEL](DATA-MODEL.md)                                                   | What is stored, where, and who may read or write it?             | Engineers, security                |
| [API](API.md)                                                                 | Which privileged operations exist and what do they promise?      | Engineers                          |
| [SECURITY](SECURITY.md)                                                       | What can go wrong and what stops it (STRIDE, PDPL)?              | Security, legal, engineers         |
| [TEST-PLAN](TEST-PLAN.md)                                                     | How do we know it works?                                         | QA, engineers                      |
| [OPERATIONS](OPERATIONS.md)                                                   | How do we run, deploy, monitor, back up and pay for it?          | Owner, operations                  |
| [CONTRIBUTING](CONTRIBUTING.md)                                               | What are the working rules and the definition of done?           | Contributors                       |
| [USER-GUIDE.ar](USER-GUIDE.ar.md)                                             | كيف يستخدمه كل دور؟ (بالعربية)                                   | Users, support                     |
| [ENGINEERING_OFFICE](ENGINEERING_OFFICE.md)                                   | Spec and implementation status of the engineering office.        | Engineers, offices                 |
| [FIREBASE-SETUP](FIREBASE-SETUP.md)                                           | Setting up a real Firebase project, step by step (Arabic).       | Owner                              |
| [STORE-READINESS](STORE-READINESS.md)                                         | What the app stores need.                                        | Owner                              |
| [CREDITS](CREDITS.md)                                                         | Photograph, map and data credits.                                | Everyone                           |
| [../CLAUDE.md](../CLAUDE.md)                                                  | Product rules, stack, design system, AI rules (source of truth). | Everyone                           |
| [../PLAN.md](../PLAN.md) · [../CHANGELOG.md](../CHANGELOG.md)                 | Phases and progress; what changed.                               | Product, engineers                 |
| [../REMAINING.md](../REMAINING.md) · [../REMAINING.ar.md](../REMAINING.ar.md) | What still needs the owner.                                      | Owner                              |

## How the documents stay true

- A behaviour change updates the SRS requirement and its trace in the same pull request.
- A new collection updates DATA-MODEL and gets a per-role rules test; a new callable updates API.
- Architecture decisions are appended to the ADR table in ARCHITECTURE; they are not edited after the fact, they are superseded.
- Walkthrough videos and screenshots are regenerated from the real app (`pnpm --filter @rasikh/web videos`), never drawn by hand.

## Reading order

1. New to the project: [README](../README.md), then [SRS](SRS.md) §1 to §2.
2. Building a feature: [CONTRIBUTING](CONTRIBUTING.md), [ARCHITECTURE](ARCHITECTURE.md), [DATA-MODEL](DATA-MODEL.md), the relevant SRS section.
3. Reviewing for launch: [SRS](SRS.md) §7, [SECURITY](SECURITY.md) §4, [OPERATIONS](OPERATIONS.md), [../REMAINING.md](../REMAINING.md).
