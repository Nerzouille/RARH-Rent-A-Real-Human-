/**
 * Catalog of realistic tasks an AI agent would outsource to verified humans.
 * Each reflects a real HITL (Human-in-the-Loop) use case.
 */

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(23, 59, 59, 0);
  return d.toISOString();
}

export const TASK_CATALOG = [
  {
    title:       "Label 50 street photos for object detection",
    description: "Draw bounding boxes around cars, pedestrians, and cyclists in the provided image batch. Use the annotation tool at the shared link. Accuracy > 95% required — this feeds a production model.",
    budget_hbar: 40,
    deadline:    daysFromNow(3),
  },
  {
    title:       "Record a 30-second voice sample (English, neutral accent)",
    description: "Read the provided paragraph aloud in a quiet environment. Submit a clean .mp3 or .wav file. Used for fine-tuning a speech recognition model — no background noise.",
    budget_hbar: 15,
    deadline:    daysFromNow(2),
  },
  {
    title:       "Verify smart contract audit report — section 4.2",
    description: "A human auditor needs to confirm the findings in section 4.2 of the attached audit report are consistent with the deployed contract at 0xDEAD...BEEF. Flag any discrepancies.",
    budget_hbar: 80,
    deadline:    daysFromNow(5),
  },
  {
    title:       "Moderate 30 user-generated content items",
    description: "Review the provided list of text submissions and flag any that violate community guidelines (hate speech, spam, adult content). Return a JSON with item ID + decision.",
    budget_hbar: 25,
    deadline:    daysFromNow(1),
  },
  {
    title:       "Translate UI copy from English to French (200 strings)",
    description: "Translate the provided i18n JSON file from English to French. Technical context: a developer tool. Maintain placeholder syntax like {userName} and <br/> tags intact.",
    budget_hbar: 35,
    deadline:    daysFromNow(4),
  },
];

export type TaskDef = typeof TASK_CATALOG[number];
