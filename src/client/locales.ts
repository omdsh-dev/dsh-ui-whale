/** `whale` namespace dictionaries. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'title': '像素鲸鱼',
  'mood.idle': '休息中',
  'mood.sleeping': '睡觉中',
  'mood.thinking': '思考中',
  'mood.working': '工作中',
  'mood.running': '运行中',
  'mood.spouting': '完成啦',
} satisfies Record<string, string>

/** The whale namespace key union. */
export type WhaleKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'title': 'Pixel whale',
  'mood.idle': 'Resting',
  'mood.sleeping': 'Sleeping',
  'mood.thinking': 'Thinking',
  'mood.working': 'Working',
  'mood.running': 'Running',
  'mood.spouting': 'Done',
} satisfies Record<WhaleKey, string>
