import { Temporal } from '@js-temporal/polyfill';

import { Calendar } from '../polyfills/Utils.ts';
import { Daf } from './Daf.ts';
import { JewishCalendar } from './JewishCalendar.ts';
import { IllegalArgumentException } from '../polyfills/errors.ts';

/**
 * This class calculates the <a href="https://en.wikipedia.org/wiki/Jerusalem_Talmud">Talmud Yerusalmi</a> <a href=
 * "https://en.wikipedia.org/wiki/Daf_Yomi">Daf Yomi</a> page ({@link Daf}) for the a given date.
 *
 * @author &copy; elihaidv
 * @author &copy; Eliyahu Hershfeld 2017 - 2019
 */
export class YerushalmiYomiCalculator {
  /**
   * The start date of the first Daf Yomi Yerushalmi cycle of February 2, 1980 / 15 Shevat, 5740.
   */
  private static readonly DAF_YOMI_START_DAY: Temporal.PlainDate = Temporal.PlainDate.from({
    year: 1980,
    month: Calendar.FEBRUARY + 1,
    day: 2,
  });

  /** The number of pages in the Talmud Yerushalmi. */
  private static readonly WHOLE_SHAS_DAFS: number = 1554;

  /** The number of pages per <em>masechta</em> (tractate). */
  private static readonly BLATT_PER_MASECHTA: number[] = [68, 37, 34, 44, 31, 59, 26, 33, 28, 20, 13, 92, 65, 71, 22,
    22, 42, 26, 26, 33, 34, 22, 19, 85, 72, 47, 40, 47, 54, 48, 44, 37, 34, 44, 9, 57, 37, 19, 13];

  /**
   * Returns the <a href="https://en.wikipedia.org/wiki/Daf_Yomi">Daf Yomi</a>
   * <a href="https://en.wikipedia.org/wiki/Jerusalem_Talmud">Yerusalmi</a> page ({@link Daf}) for a given date.
   * The first Daf Yomi cycle started on 15 Shevat (Tu Bishvat) 5740 (February, 2, 1980) and calculations
   * prior to this date will result in an IllegalArgumentException thrown. A null will be returned on Tisha B'Av or
   * Yom Kippur.
   *
   * @param jewishCalendar
   *            the calendar date for calculation
   * @return the {@link Daf} or null if the date is on Tisha B'Av or Yom Kippur.
   *
   * @throws IllegalArgumentException
   *             if the date is prior to the February 2, 1980, the start date of the first Daf Yomi Yerushalmi cycle
   */
  public static getDafYomiYerushalmi(jewishCalendar: JewishCalendar) {
    let nextCycle: Temporal.PlainDate = YerushalmiYomiCalculator.DAF_YOMI_START_DAY;
    let prevCycle: Temporal.PlainDate = YerushalmiYomiCalculator.DAF_YOMI_START_DAY;
    const requested: Temporal.PlainDate = jewishCalendar.getDate();
    let masechta: number = 0;
    let dafYomi: Daf;

    // There is no Daf Yomi on Yom Kippur or Tisha B'Av.
    if (jewishCalendar.getYomTovIndex() === JewishCalendar.YOM_KIPPUR || jewishCalendar.getYomTovIndex() === JewishCalendar.TISHA_BEAV) {
      return null;
    }

    if (Temporal.PlainDate.compare(requested, YerushalmiYomiCalculator.DAF_YOMI_START_DAY) == -1) {
      throw new IllegalArgumentException(`${requested} is prior to organized Daf Yomi Yerushalmi cycles that started on ${YerushalmiYomiCalculator.DAF_YOMI_START_DAY}`);
    }

    // Start to calculate current cycle. Initialize the start day
    // nextCycle = YerushalmiYomiCalculator.DAF_YOMI_START_DAY;

    // Go cycle by cycle, until we get the next cycle
    while (Temporal.PlainDate.compare(nextCycle, requested) == -1) {
      prevCycle = nextCycle;

      // Adds the number of whole shas dafs, and then the number of days that not have daf.
      nextCycle = nextCycle.add({ days: YerushalmiYomiCalculator.WHOLE_SHAS_DAFS });
      // This needs to be a separate step
      nextCycle = nextCycle.add({ days: YerushalmiYomiCalculator.getNumOfSpecialDays(prevCycle, nextCycle) });
    }

    // Get the number of days from cycle start until request.
    const dafNo: number = requested.since(prevCycle).total({ unit: 'days' });

    // Get the number of special days to subtract
    const specialDays: number = YerushalmiYomiCalculator.getNumOfSpecialDays(prevCycle, requested);
    let total: number = dafNo - specialDays;

    // Finally find the daf.
    for (let i: number = 0; i < YerushalmiYomiCalculator.BLATT_PER_MASECHTA.length; i++) {
      if (total <= YerushalmiYomiCalculator.BLATT_PER_MASECHTA[i]) {
        dafYomi = new Daf(masechta, total + 1);
        break;
      }
      total -= YerushalmiYomiCalculator.BLATT_PER_MASECHTA[i];
      masechta++;
    }

    return dafYomi!;
  }

  /**
   * Return the number of special days (Yom Kippur and Tisha B'Av) on which there is no daf, between the two given dates
   *
   * @param start - start date to calculate
   * @param end - end date to calculate
   * @return the number of special days
   */
  private static getNumOfSpecialDays(start: Temporal.PlainDate, end: Temporal.PlainDate): number {
    // Find the start and end Jewish years
    const jewishStartYear: number = new JewishCalendar(start).getJewishYear();
    const jewishEndYear: number = new JewishCalendar(end).getJewishYear();

    // Value to return
    let specialDays: number = 0;

    // Instant of special dates
    const yomKippur: JewishCalendar = new JewishCalendar(jewishStartYear, 7, 10);
    const tishaBeav: JewishCalendar = new JewishCalendar(jewishStartYear, 5, 9);

    // Go over the years and find special dates
    for (let i: number = jewishStartYear; i <= jewishEndYear; i++) {
      yomKippur.setJewishYear(i);
      tishaBeav.setJewishYear(i);

      if (rangeDates(start, yomKippur.getDate(), end)) specialDays++;
      if (rangeDates(start, tishaBeav.getDate(), end)) specialDays++;
    }

    return specialDays;
  }
}

function rangeDates(start: Temporal.PlainDate, middle:Temporal.PlainDate, end: Temporal.PlainDate, inclusive=true) {
  const acceptedValues = [1];
  if (inclusive)
    acceptedValues.push(0);

  return acceptedValues.includes(Temporal.PlainDate.compare(middle, start)) && acceptedValues.includes(Temporal.PlainDate.compare(end, middle))
};