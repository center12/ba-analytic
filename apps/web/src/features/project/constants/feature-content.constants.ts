// ── SSR Document Template ─────────────────────────────────────────────────────

export const SSR_DOCUMENT_TEMPLATE = `# [System/Module Name] — System Requirements Specification

## Overview
[Brief description of the system or module and its purpose in the overall application.]

## Actors
| Actor | Role |
| :--- | :--- |
| [Actor Name] | [Description of role and permissions] |

## User Stories
* **US-01**: As a [actor], I want to [action] so that [benefit].
* **US-02**: As a [actor], I want to [action] so that [benefit].

## Functional Requirements
* **FR-01**: [Functional requirement description]
* **FR-02**: [Functional requirement description]

## Business Rules
* **BR-01**: [Business rule description]
* **BR-02**: [Business rule description]

## Acceptance Criteria
| ID | Given | When | Then |
| :--- | :--- | :--- | :--- |
| AC-01 | [Precondition] | [Trigger / user action] | [Expected outcome (reference BR/FR)] |
| AC-02 | [Precondition] | [Trigger / user action] | [Expected outcome (reference BR/FR)] |

## Data Entities
### [Entity Name]
| Field | Type | Description | Constraints |
| :--- | :--- | :--- | :--- |
| [field_name] | String | [Description] | [Required / Unique / Optional] |

## Validation Rules
* **VR-01**: [Validation rule description]
* **VR-02**: [Validation rule description]

## System Rules
* **SYS-01**: [System-level constraint: authentication, session management, audit logging, rate limiting, multi-tenancy isolation, etc.]

## Global Policies
* [Cross-cutting concern: GDPR/data retention, timezone handling, currency rules, accessibility requirements, etc.]

## Out of Scope
* [Feature or behavior explicitly not covered by this module]

## Assumptions & Dependencies
* **Dependencies**: [Other modules that depend on or are required by this module]
* **Assumptions**: [Key assumptions the implementation relies on]
`;

// ── Feature Document Template ─────────────────────────────────────────────────

export const FEATURE_DOCUMENT_TEMPLATE = `# [Feature Name]

## Overview
[Brief description of what this feature does and why it exists in the product.]

## Actors
| Actor | Role |
| :--- | :--- |
| [Actor Name] | [Role description] |

## User Stories
* **US-01**: As a [actor], I want to [action] so that [benefit].
* **US-02**: As a [actor], I want to [action] so that [benefit].

## Functional Requirements
* **FR-01**: [Functional requirement description]
* **FR-02**: [Functional requirement description]

## Business Rules
* **BR-01**: [Business rule description]
* **BR-02**: [Business rule description]

## Acceptance Criteria
| ID | Given | When | Then |
| :--- | :--- | :--- | :--- |
| AC-01 | [Precondition] | [Trigger] | [Expected result (reference BR/FR)] |

## Data Entities
### [Entity Name]
| Field | Type | Description | Constraints |
| :--- | :--- | :--- | :--- |
| [field] | String | [Description] | [Required / Optional] |

## Validation Rules
* **VR-01**: [Validation description]

## System Rules
* **SYS-01**: [System-level constraint: authentication, audit logging, rate limiting, multi-tenancy isolation, etc.]

## Global Policies
* [Cross-cutting concern: data retention, timezone handling, currency rules, etc.]
`;

// ── SSR Conversion Prompt ─────────────────────────────────────────────────────

export const SSR_CONVERSION_PROMPT = `You are a business analyst. Convert the raw document below into a structured SSR (System Requirements Specification) in Markdown format.

Use exactly this section structure:

# [System/Module Name] — System Requirements Specification

## Overview
[1-2 sentence summary]

## Actors
| Actor | Role |
| :--- | :--- |

## User Stories
* **US-01**: As a [actor], I want to [action] so that [benefit].

## Functional Requirements
* **FR-01**: [Requirement]

## Business Rules
* **BR-01**: [Rule]

## Acceptance Criteria
| ID | Given | When | Then |
| :--- | :--- | :--- | :--- |
| AC-01 | [Given] | [When] | [Then — reference relevant BR/FR IDs] |

## Data Entities
### [Entity]
| Field | Type | Description | Constraints |
| :--- | :--- | :--- | :--- |

## Validation Rules
* **VR-01**: [Validation]

## System Rules
* **SYS-01**: [System constraint: auth, audit logging, rate limiting, multi-tenancy, etc.]

## Global Policies
* [Cross-cutting concern: data retention, timezone handling, currency rules, etc.]

## Out of Scope
* [Items explicitly not covered]

## Assumptions & Dependencies
* **Dependencies**: [Other modules that depend on this]
* **Assumptions**: [Key assumptions]

IMPORTANT RULES:
- Detect the language of the input document and write ALL output in that same language
- Keep IDs (US-XX, FR-XX, BR-XX, AC-XX, VR-XX, SYS-XX) sequential and consistent
- In Acceptance Criteria, always reference the relevant BR/FR IDs in the "Then" column
- Do not invent requirements not present in the source document

Raw document to convert:
---
[PASTE YOUR DOCUMENT HERE]
---`;

// ── Feature Conversion Prompt ─────────────────────────────────────────────────

export const FEATURE_CONVERSION_PROMPT = `You are a business analyst. Convert the raw document below into a structured Feature Requirements document in Markdown format.

Use exactly this section structure:

# [Feature Name]

## Overview
[1-2 sentence summary]

## Actors
| Actor | Role |
| :--- | :--- |

## User Stories
* **US-01**: As a [actor], I want to [action] so that [benefit].

## Functional Requirements
* **FR-01**: [Requirement]

## Business Rules
* **BR-01**: [Rule]

## Acceptance Criteria
| ID | Given | When | Then |
| :--- | :--- | :--- | :--- |
| AC-01 | [Given] | [When] | [Then — reference relevant BR/FR IDs] |

## Data Entities
### [Entity]
| Field | Type | Description | Constraints |
| :--- | :--- | :--- | :--- |

## Validation Rules
* **VR-01**: [Validation]

## System Rules
* **SYS-01**: [System constraint: auth, session, audit logging, rate limiting, etc.]

## Global Policies
* [Cross-cutting concern: data retention, timezone handling, currency rules, etc.]

IMPORTANT RULES:
- Detect the language of the input document and write ALL output in that same language
- Keep IDs (US-XX, FR-XX, BR-XX, AC-XX, VR-XX, SYS-XX) sequential and consistent
- In Acceptance Criteria, always reference the relevant BR/FR IDs in the "Then" column
- Be concise but complete — do not invent requirements not present in the source

Raw document to convert:
---
[PASTE YOUR DOCUMENT HERE]
---`;
