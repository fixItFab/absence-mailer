import axios, { AxiosResponse } from "axios";
import * as dotenv from "dotenv";
import * as hawk from "hawk";
import { DateTime, Settings } from "luxon";
import { createTransport, SentMessageInfo } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { from, Observable } from "rxjs";
import { map, switchMap } from "rxjs/operators";
import { Absence, AbsencePayload } from "./absense.model";

dotenv.config();

Settings.defaultLocale = "de";
const startOfTodayIso = DateTime.utc().startOf("day").toISO();

getAbsences()
  .pipe(map(makeAbendsenceText), switchMap(sendMail))
  .subscribe((mailInfo) => {
    console.log(mailInfo);
  });

function sendMail(text: string): Observable<SentMessageInfo> {
  let transporter = createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secureConnection: false,
    tls: { ciphers: "SSLv3" },
    auth: {
      user: process.env.SMTP_AUTH_USER,
      pass: process.env.SMTP_AUTH_PASS,
    },
  } as SMTPTransport.Options);

  return from(
    transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: process.env.MAIL_TO,
      html: text,
    })
  );
}

function makeAbendsenceText(absences: Absence[]): string {
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
    const isTodayTheLastDay = isOnlyOneDay || lastDayStart === startOfTodayIso;

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

function getAbsences(): Observable<Absence[]> {
  const startOfTodayIso = DateTime.utc().startOf("day").toISO();

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
    axios.post<any, AxiosResponse<AbsencePayload>>(
      "https://app.absence.io/api/v2/absences",
      payload,
      {
        headers: { Authorization: header },
      }
    )
  );

  return absence$.pipe(map(({ data }) => data.data));
}
