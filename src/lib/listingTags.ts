import { labels as defaultLabels, Labels } from '../constants/labels';
import { DAYS_PER_MONTH, DAYS_PER_WEEK, DAYS_PER_YEAR, MS_PER_DAY, WHOLE_UNIT_THRESHOLD } from '../constants/listingTags';
import { formatAmount } from './propertyDetail';

const roundForDisplay = (value: number): number =>
  value >= WHOLE_UNIT_THRESHOLD ? Math.round(value) : Math.round(value * 10) / 10;

export function pricePerSquareMeterLabel(
  rawPrice: string | undefined,
  rawSquareMeters: string | undefined,
  currency: string | undefined,
  operationType: string | undefined,
  labels: Labels = defaultLabels
): string | null {
  const price = Number(rawPrice);
  const squareMeters = Number(rawSquareMeters);
  if (!(price > 0) || !(squareMeters > 0)) return null;
  const amount = formatAmount(roundForDisplay(price / squareMeters), currency);
  return operationType === 'rent'
    ? labels.propertyDetail.pricePerSquareMeterRent(amount)
    : labels.propertyDetail.pricePerSquareMeter(amount);
}

export function publishedAgoLabel(
  createdAt: string | undefined,
  now: Date = new Date(),
  labels: Labels = defaultLabels
): string | null {
  const published = createdAt ? new Date(createdAt).getTime() : NaN;
  if (Number.isNaN(published)) return null;
  const days = Math.max(0, Math.floor((now.getTime() - published) / MS_PER_DAY));
  const copy = labels.propertyDetail.published;
  if (days === 0) return copy.today;
  if (days === 1) return copy.yesterday;
  if (days < DAYS_PER_WEEK) return copy.days(days);
  if (days < DAYS_PER_MONTH) return copy.weeks(Math.floor(days / DAYS_PER_WEEK));
  if (days < DAYS_PER_YEAR) return copy.months(Math.floor(days / DAYS_PER_MONTH));
  return copy.overAYear;
}
