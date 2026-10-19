// Names are optional. When either name is blank, every place that would show
// them (hero, envelope, footer, share text) falls back to a title instead.
// Keeping the rule in one function means those places can never disagree.

export const DEFAULT_TITLE = 'Our Wedding'

export function hasCoupleNames(couple) {
  return Boolean(couple?.partnerOne?.trim() && couple?.partnerTwo?.trim())
}

// "Aleya & Haris", or the title (e.g. "Our Wedding") when names are hidden.
export function coupleTitle(couple) {
  if (hasCoupleNames(couple)) return `${couple.partnerOne.trim()} & ${couple.partnerTwo.trim()}`
  return couple?.title?.trim() || DEFAULT_TITLE
}

export function shareMessage(couple, dateLabel) {
  return hasCoupleNames(couple)
    ? `You're invited to the wedding of ${coupleTitle(couple)} on ${dateLabel}.`
    : `You're invited to our wedding on ${dateLabel}.`
}
