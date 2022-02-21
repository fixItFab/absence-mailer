import axios, { AxiosResponse } from "axios";
import * as hawk from "hawk";
import { DateTime, Settings } from "luxon";
import { from, Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Absence, AbsencePayload } from "./absense.model";

export class AbsenceService {
  constructor(locale = "de") {
    Settings.defaultLocale = locale;
  }

  makeAbendsenceText(absences: Absence[]): string {
    if (absences.length === 0) {
      return "Es sind alle da 🎉";
    }

    const lines = absences.map((absence) => {
      let halfDay = "";

      if (absence.days.length === 1 && absence.days[0].value === 0.5) {
        const day = absence.days[0];

        DateTime.fromISO(day.startTime).hour <= 1
          ? (halfDay = "Vormittags ")
          : (halfDay = "Nachmittags ");
      }

      const lastDayStart = absence.days[absence.days.length - 1].date;
      const isOnlyOneDay = absence.start === lastDayStart;
      const isTodayTheLastDay =
        isOnlyOneDay || lastDayStart === this.startOfTodayIso;

      const until =
        isOnlyOneDay || isTodayTheLastDay
          ? ""
          : `bis einschließlich ${DateTime.fromISO(lastDayStart).toFormat(
              "d. LLLL"
            )} `;

      const substitution = absence.substitute
        ? ` - Vertretung: ${absence.substitute.name}`
        : "";

      return `<li>${absence.assignedTo.name} (${halfDay}${absence.reason.name}) ${until} ${substitution}</li>`;
    });

    return ["<ul>", ...lines, "</ul>"].join("");
  }

  getAbsences(): Observable<Absence[]> {
    const startOfTodayIso = this.startOfTodayIso;

    const payload = {
      skip: 0,
      limit: 100,
      filter: {
        start: {
          $lte: startOfTodayIso,
        },
        end: {
          $gte: startOfTodayIso,
        },
      },
      relations: ["assignedToId", "reasonId", "substituteId"],
    };

    const credentials = {
      id: process.env.ABSENCE_ID,
      key: process.env.ABSENCE_KEY,
      algorithm: "sha256",
    };

    const absenceUrl = "https://app.absence.io/api/v2/absences";

    const { header } = hawk.client.header(absenceUrl, "post", {
      credentials: credentials,
    });

    const absence$ = from(
      axios.post<any, AxiosResponse<AbsencePayload>>(absenceUrl, payload, {
        headers: { Authorization: header },
      })
    );

    return absence$.pipe(map(({ data }) => data.data));
  }

  private get startOfTodayIso(): string {
    return DateTime.utc().startOf("day").toISO();
  }
}
