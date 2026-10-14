import {
  ArrowDownLeftIcon,
  ArrowLeftRightIcon,
  BanknoteIcon,
  BriefcaseIcon,
  BusIcon,
  CarIcon,
  CircleDashedIcon,
  CircleHelpIcon,
  ClapperboardIcon,
  CoffeeIcon,
  GiftIcon,
  HandCoinsIcon,
  HeartPulseIcon,
  HouseIcon,
  LandmarkIcon,
  PlaneIcon,
  RepeatIcon,
  ScissorsIcon,
  ShoppingBagIcon,
  ShoppingBasketIcon,
  SmartphoneIcon,
  TrendingUpIcon,
  Undo2Icon,
  UsersIcon,
  UtensilsIcon,
  type LucideIcon,
} from 'lucide-react';
import type { TileTone } from '@/blocks/tile';

// One icon for each category (patterns.md §5: the same thing always has the same icon), and for the
// rows that have no category of their own. A renamed or new category falls back to the dashed circle
// until Settings (B12) lets a category carry its icon.
const BY_NAME: Record<string, LucideIcon> = {
  Meals: UtensilsIcon,
  'Drinks & desserts': CoffeeIcon,
  Groceries: ShoppingBasketIcon,
  Transport: BusIcon,
  Car: CarIcon,
  'Phone & internet': SmartphoneIcon,
  'Home & bills': HouseIcon,
  Shopping: ShoppingBagIcon,
  Entertainment: ClapperboardIcon,
  Subscriptions: RepeatIcon,
  Health: HeartPulseIcon,
  'Personal care': ScissorsIcon,
  'Gifts & treats': GiftIcon,
  Family: UsersIcon,
  Travel: PlaneIcon,
  'Fees & charges': LandmarkIcon,
  Cash: BanknoteIcon,
  Unaccounted: CircleHelpIcon,
  Salary: BriefcaseIcon,
  'Interest & returns': TrendingUpIcon,
  'Other income': HandCoinsIcon,
  Transfer: ArrowLeftRightIcon,
  'Money in': ArrowDownLeftIcon,
  'Paid back': Undo2Icon,
  Refund: Undo2Icon,
};

export const categoryIcon = (name: string | null | undefined): LucideIcon =>
  (name && BY_NAME[name]) || CircleDashedIcon;

const ORDER = Object.keys(BY_NAME);
/**
 * A category's tile tint (D130): one of the chart palette's three hues, by its place in the list, so
 * neighbours differ and a category keeps its tint. The tint only helps scanning; the icon and the name
 * carry the meaning, and charts still name categories in words (patterns.md §4).
 */
export const categoryTone = (name: string | null | undefined): TileTone => {
  const i = name ? ORDER.indexOf(name) : -1;
  return i < 0 ? 'neutral' : (['hue1', 'hue2', 'hue3'] as const)[i % 3]!;
};
