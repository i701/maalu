/** Income split into the part kept and the part spent, as shares of the income (0 to 1); null when
 * there is no income to share. Spending past the income leaves nothing kept. */
export function keptSplit(
	income: number,
	spent: number,
): { keptShare: number; spentShare: number } | null {
	if (!(income > 0)) return null;
	const keptShare = Math.min(Math.max(income - spent, 0) / income, 1);
	return { keptShare, spentShare: 1 - keptShare };
}
