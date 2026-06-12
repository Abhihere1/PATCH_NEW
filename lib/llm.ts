export interface LLMResponseSchema {
  response: string;
  user_probable_options: string[];
  input_card_variables: { name: string; label: string; required: boolean }[];
  needs_count_first: boolean;
  count_prompt: string;
  total_cards: number;
  should_escalate: boolean;
  escalation_data: {
    reason: string;
    group: string;
    priority: string;
    urgency: string;
    impact: string;
  };
  should_resolve: boolean;
}

const SYSTEM_PROMPT = `You are Patch, a professional IT self-service support assistant for Discount Tire store associates. You help diagnose and resolve IT issues using the provided knowledge base content.

STRICT RULES:
1. ONLY use the provided KB context to answer. Do not invent solutions not in the KB.
2. You MUST respond ONLY in the JSON format below. No additional text outside the JSON.
3. Prioritize completing the troubleshooting workflow over open-ended conversation.
4. If the user sends off-topic messages, briefly acknowledge and redirect back to the issue: "I understand, but let's focus on resolving your [issue]. [next step]"
5. Never discuss topics outside of IT support for Discount Tire systems.
6. Use clear, direct, professional language. Avoid creative paraphrasing.
7. When KB contains images referenced as ![alt](filename), include them VERBATIM in your response field.
8. For repeated device data entry, ask for the count first before presenting form fields.

RESPONSE FORMAT (always valid JSON, no markdown fences):
{
  "response": "Your response text here. Preserve image tags like ![alt](filename.png) verbatim.",
  "user_probable_options": [],
  "input_card_variables": [],
  "needs_count_first": false,
  "count_prompt": "",
  "total_cards": 0,
  "should_escalate": false,
  "escalation_data": {
    "reason": "",
    "group": "",
    "priority": "Medium",
    "urgency": "Medium",
    "impact": "Medium"
  },
  "should_resolve": false
}

FIELD RULES:
- user_probable_options: Array of 2-4 short option labels when asking yes/no or multiple-choice. Empty array otherwise.
- input_card_variables: Array of {name, label, required} field descriptors only when collecting structured data.
- needs_count_first: true when you need to know a device/item count before showing form fields.
- count_prompt: The question to ask for the count (e.g., "How many scanners need to be configured?").
- total_cards: Set to the user-provided count once known, so the UI renders that many form cards.
- should_escalate: true only when you cannot resolve the issue with available KB content.
- should_resolve: true only when the user confirms the issue is resolved.`;

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export async function callLLM(
  kbContext: string,
  history: ConversationMessage[],
  userMessage: string
): Promise<LLMResponseSchema> {
  const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "gemma4:31b-cloud";
  const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY ?? "";

  const messages: { role: string; content: string }[] = [
    {
      role: "system",
      content: kbContext
        ? `${SYSTEM_PROMPT}\n\nKNOWLEDGE BASE:\n${kbContext}`
        : SYSTEM_PROMPT,
    },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  const headers: Record<string, string> = { "Content-Type": "application/json" };


  const res = await fetch(`${OLLAMA_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model: OLLAMA_MODEL, messages, temperature: 0.2 }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM request failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  const raw: string = data?.choices?.[0]?.message?.content ?? "";

  return parseLLMResponse(raw);
}

function parseLLMResponse(raw: string): LLMResponseSchema {
  const defaults: LLMResponseSchema = {
    response: "",
    user_probable_options: [],
    input_card_variables: [],
    needs_count_first: false,
    count_prompt: "",
    total_cards: 0,
    should_escalate: false,
    escalation_data: { reason: "", group: "", priority: "Medium", urgency: "Medium", impact: "Medium" },
    should_resolve: false,
  };

  let stripped = raw.trim();

  // Strip markdown code fences
  stripped = stripped.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

  let parsed: Partial<LLMResponseSchema> = {};
  try {
    parsed = JSON.parse(stripped);
  } catch {
    // Try extracting JSON from mixed-format responses
    const match = stripped.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        console.error("[LLM] Failed to parse response:", raw.substring(0, 200));
        return { ...defaults, response: raw || "I encountered an issue. Please try again." };
      }
    } else {
      console.error("[LLM] No JSON found in response:", raw.substring(0, 200));
      return { ...defaults, response: raw || "I encountered an issue. Please try again." };
    }
  }

  // Normalize and apply defaults
  return {
    response: String(parsed.response ?? defaults.response),
    user_probable_options: Array.isArray(parsed.user_probable_options)
      ? parsed.user_probable_options.map(String)
      : defaults.user_probable_options,
    input_card_variables: Array.isArray(parsed.input_card_variables)
      ? parsed.input_card_variables
      : defaults.input_card_variables,
    needs_count_first:
      parsed.needs_count_first === true || parsed.needs_count_first === ("true" as unknown),
    count_prompt: String(parsed.count_prompt ?? ""),
    total_cards: Number(parsed.total_cards ?? 0),
    should_escalate:
      parsed.should_escalate === true || parsed.should_escalate === ("true" as unknown),
    escalation_data: {
      reason: String(parsed.escalation_data?.reason ?? ""),
      group: String(parsed.escalation_data?.group ?? ""),
      priority: String(parsed.escalation_data?.priority ?? "Medium"),
      urgency: String(parsed.escalation_data?.urgency ?? "Medium"),
      impact: String(parsed.escalation_data?.impact ?? "Medium"),
    },
    should_resolve:
      parsed.should_resolve === true || parsed.should_resolve === ("true" as unknown),
  };
}
