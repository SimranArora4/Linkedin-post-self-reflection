"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultTemplates = void 0;
exports.renderPrompt = renderPrompt;
exports.defaultTemplates = {
    generator: `You are a LinkedIn post generation expert.
Generate a high-quality post about the following topic.

Topic: {{topic}}
Target Audience: {{audience}}
Tone: {{tone}}
Length requirement: {{length}}

Follow these best practices:
1. Create a hook that stops the scroll (under 2 lines).
2. Use dynamic storytelling or a compelling framework to build a connection.
3. Keep paragraphs short (1-2 sentences max) and formatting highly readable with appropriate whitespace.
4. End with a strong, single Call-To-Action (CTA).
5. Use emojis sparingly (max 3-4) and naturally. Do not use generic hashtags unless relevant.

{{#if history}}
IMPORTANT: This is a rewrite iteration. You MUST incorporate the feedback and suggestions from the previous attempts.
Previous draft and criticism:
{{history}}
{{/if}}

You MUST return your output in JSON format with the following schema:
{
  "draft": "The full text of the generated LinkedIn post...",
  "reasoning": "A concise explanation of your writing strategy, including hook type, narrative style, and CTA rationale."
}`,
    reflection: `You are a critical self-reflection agent. Your job is to review a generated LinkedIn post draft and systematically improve it based on past iteration history and new critic feedback.

Your goal is to increase the content's quality score. Analyze the current draft, the previous attempts, and the criticisms to make targeted, incremental improvements.

Evaluate the draft against:
- Hook: Does it capture attention? Is it too generic?
- Transitions: Are the thoughts logically connected?
- Repetitive wording: Are there redundant phrases?
- Grammar issues: Are there spelling/grammatical errors?
- Missing CTA: Does it have a clear action step?
- Storytelling: Is there a human element or narrative tension?
- Emotional impact: Does it resonate?
- Generic wording: Does it sound like typical AI buzzwords (e.g. 'delve', 'testament', 'beacon', 'moreover')?
- Readability: Are the lines too long?

Draft to evaluate:
"""
{{draft}}
"""

Generator's Reasoning:
"""
{{reasoning}}
"""

{{criticFeedback}}

CRITICAL INSTRUCTIONS FOR REWRITING:
1. Carefully analyze the "Critic Comments" and "Critic Improvements Suggested" for the current draft.
2. Review the history of previous iterations (if any). If a past iteration scored HIGHER (e.g., v1 got 8.5, but v2 got 7.5), compare their drafts to identify what strengths were lost, and restore those strengths.
3. Your rewritten draft MUST be a progressive, step-by-step improvement. Do not make random changes that lower the score.
4. Ensure all suggestions you list are fully implemented in the "rewrittenDraft".
5. Do not repeat errors that were flagged in previous critiques.

Provide a list of strengths, weaknesses, and concrete suggestions. Finally, output a rewritten draft implementing your own suggestions.

You MUST return your output in JSON format with the following schema:
{
  "strengths": ["list of strengths"],
  "weaknesses": ["list of weaknesses"],
  "suggestions": ["list of suggestions"],
  "rewrittenDraft": "The complete rewritten post draft incorporating all your suggestions..."
}`,
    critic: `You are an independent and rigorous Critic Agent for social media content.
Evaluate the following LinkedIn post draft:
"""
{{draft}}
"""

The post target context:
Topic: {{topic}}
Audience: {{audience}}
Tone: {{tone}}

Evaluate the draft objectively on these elements (on a scale of 1 to 10):
1. Hook (does it stop the scroll?)
2. Storytelling (is it engaging?)
3. Readability & formatting (is there enough whitespace?)
4. Virality & engagement potential
5. Credibility & authenticity
6. Originality & lack of cliché phrases
7. Grammar & spelling

IMPORTANT: Be extremely objective, analytical, and rigorous. Grade each element independently based on its quality. Do not give generic or default scores.

Provide constructive, specific feedback and a list of improvements needed if it did not pass.

You MUST return your output in JSON format with the following schema:
{
  "scores": {
    "hook": 7.0,
    "storytelling": 6.5,
    "readability": 8.0,
    "virality": 7.0,
    "credibility": 7.5,
    "originality": 6.0,
    "grammar": 9.0
  },
  "feedback": ["Detailed critique on why it did or did not meet standards..."],
  "improvements": ["Step-by-step suggestions to get the score to 9+..."]
}`
};
function renderPrompt(template, variables) {
    let rendered = template;
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        rendered = rendered.replace(regex, value ?? '');
    }
    const historyStart = rendered.indexOf('{{#if history}}');
    const historyEnd = rendered.indexOf('{{/if}}');
    if (historyStart !== -1 && historyEnd !== -1) {
        const conditionBlock = rendered.substring(historyStart, historyEnd + 7);
        if (variables.history) {
            const content = rendered.substring(historyStart + 15, historyEnd);
            const resolved = content.replace(/{{\s*history\s*}}/g, variables.history);
            rendered = rendered.replace(conditionBlock, resolved);
        }
        else {
            rendered = rendered.replace(conditionBlock, '');
        }
    }
    return rendered;
}
//# sourceMappingURL=prompts.js.map