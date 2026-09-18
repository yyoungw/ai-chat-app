export type EmotionKind =
  | "positive"
  | "apology"
  | "warning"
  | "curious"
  | "neutral";

export type EmotionResult = {
  kind: EmotionKind;
  emoji: string;
  label: string;
};

const RULES: Array<{
  kind: EmotionKind;
  emoji: string;
  label: string;
  patterns: RegExp[];
}> = [
  {
    kind: "positive",
    emoji: "😊",
    label: "긍정적",
    patterns: [
      /감사/,
      /고마워/,
      /고맙/,
      /축하/,
      /좋아/,
      /행복/,
      /기쁘/,
      /delight/i,
      /thank/i,
      /great/i,
      /awesome/i,
      /glad/i,
    ],
  },
  {
    kind: "apology",
    emoji: "🙏",
    label: "사과",
    patterns: [/죄송/, /미안/, /sorry/i, /apolog/i, /유감/],
  },
  {
    kind: "warning",
    emoji: "⚠️",
    label: "경고",
    patterns: [/주의/, /경고/, /위험/, /caution/i, /warning/i, /danger/i, /조심/],
  },
  {
    kind: "curious",
    emoji: "🤔",
    label: "호기심",
    patterns: [/\?/, /까요/, /습니까/, /궁금/, /how /i, /what /i, /why /i],
  },
];

/** 본문 키워드 휴리스틱으로 감정·이모지 판별. O(규칙×패턴). */
export function detectEmotion(text: string): EmotionResult {
  const sample = text.slice(0, 800);

  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(sample))) {
      return {
        kind: rule.kind,
        emoji: rule.emoji,
        label: rule.label,
      };
    }
  }

  return { kind: "neutral", emoji: "💬", label: "보통" };
}
