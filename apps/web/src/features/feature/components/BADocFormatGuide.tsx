import { useState } from 'react';
import { BookOpen, Copy, Check, Download } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

const BA_TEMPLATE = `# [Feature Name]

## Overview
One or two sentences describing the feature and its business purpose.

## Actors

| Actor | Role |
|---|---|
| [Actor 1] | Description of role |
| [Actor 2] | Description of role |

## User Stories

- US-01: As a [actor], I want to [action] so that [benefit]
- US-02: As a [actor], I want to [action] so that [benefit]

## Functional Requirements

- FR-01: The system shall allow [actor] to [action]
- FR-02: The system shall validate [field] when [condition]
- FR-03: The system shall notify [actor] when [event]

## Business Rules

- BR-01: [Constraint or policy, e.g. "Order total must be greater than 0"]
- BR-02: [Rule]
- BR-03: [Rule]

## Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| AC-01 | [precondition / system state] | [user action or event] | [expected outcome] |
| AC-02 | [precondition] | [action] | [outcome] |

## Data Entities

### [Entity1]

| Field | Type | Description | Constraints |
|---|---|---|---|
| id | UUID | Primary key | Required, auto-generated |
| [field] | [type] | [description] | [e.g. required, unique, max 255] |

## User Flows / Actions

1. [Actor] navigates to [location]
2. [Actor] fills in [fields]
3. System validates [conditions] — see BR-01, BR-02
4. System performs [operation]
5. [Actor] sees [result]

## Validation Rules

- VR-01: [Field X] is required
- VR-02: [Field Y] must be between [min] and [max]
- VR-03: [Field Z] must match pattern [pattern]

## Out of Scope

- [What this feature does NOT cover]

## Assumptions & Dependencies

- [Assumption 1]
- [Dependency on system/service X]
`;

const CONVERSION_PROMPT = `Convert the following document into a structured Markdown BA document.
Use exactly these sections (include only those with relevant content):

# [Feature Name]
## Overview
## Actors          ← Markdown table: Actor | Role
## User Stories    ← Bullet list with IDs: US-01, US-02, ...
## Functional Requirements  ← Bullet list with IDs: FR-01, FR-02, ...
## Business Rules  ← Bullet list with IDs: BR-01, BR-02, ...
## Acceptance Criteria  ← Markdown table: ID | Given | When | Then
## Data Entities   ← One sub-section (###) per entity, each with a Markdown table: Field | Type | Description | Constraints
## User Flows / Actions  ← Numbered steps, reference rule IDs where applicable
## Validation Rules  ← Bullet list with IDs: VR-01, VR-02, ...
## Out of Scope
## Assumptions & Dependencies

Rules:
- Assign sequential IDs to every requirement, rule, and criterion (FR-01, BR-01, AC-01, VR-01, US-01).
- Preserve all requirements, rules, and criteria — do not omit or summarize.
- Acceptance Criteria MUST use the Given/When/Then table format.
- Data Entities MUST use Markdown tables with Field, Type, Description, and Constraints columns.
- Remove images, screenshots, headers/footers, and page numbers.
- Output plain Markdown only — no HTML, no LaTeX.

Document to convert:
[paste your document here]`;

export function BADocFormatGuide() {
  const [open, setOpen]     = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDownloadTemplate = () => {
    const blob = new Blob([BA_TEMPLATE], { type: 'text/markdown' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'ba-document-template.md'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(CONVERSION_PROMPT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 border px-3 py-1.5 rounded text-sm hover:bg-muted text-muted-foreground"
        title="BA document format guide"
      >
        <BookOpen size={14} /> Format guide
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>BA Document Format Guide</DialogTitle>
            <DialogDescription>
              Only <strong>.md</strong> (Markdown) files are accepted. Use the template or convert
              your existing document with the AI conversion prompt.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs hover:bg-muted font-medium"
            >
              <Download size={12} /> Download template
            </button>
            <button
              onClick={handleCopyPrompt}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs hover:bg-muted"
            >
              {copied
                ? <><Check size={12} className="text-green-600" /> Copied!</>
                : <><Copy size={12} /> Copy AI conversion prompt</>}
            </button>
          </div>

          <div className="text-sm">
            <p className="font-medium mb-1">Conversion instructions</p>
            <ol className="list-decimal list-inside text-muted-foreground space-y-1">
              <li>Click <strong>Copy AI conversion prompt</strong> above.</li>
              <li>Open ChatGPT, Claude, or any AI chat tool.</li>
              <li>Paste the prompt, then paste your document below it.</li>
              <li>Copy the Markdown response and save it as <code className="bg-muted px-1 rounded">.md</code>.</li>
              <li>Upload the <code className="bg-muted px-1 rounded">.md</code> file here.</li>
            </ol>
          </div>

          <div className="text-sm">
            <p className="font-medium mb-2">Template preview</p>
            <pre className="text-xs bg-muted rounded p-3 overflow-x-auto whitespace-pre leading-relaxed max-h-72 overflow-y-auto">
              {BA_TEMPLATE}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
