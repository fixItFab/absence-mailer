import * as dotenv from "dotenv";
import { of } from "rxjs";
import { map, startWith, switchMap, take } from "rxjs/operators";
import { AbsenceService } from "./absence/absence.service";
import { cron } from "./cron/cron";
import { MailService } from "./mail/mail.service";
require("log-timestamp");

dotenv.config();
const absenceService = new AbsenceService("de");

// periodically execution or only once
const trigger$ = process.env.CRON_EXPRESSION
  ? cron(process.env.CRON_EXPRESSION)
  : of().pipe(startWith(""), take(1));

trigger$
  .pipe(
    switchMap(() => absenceService.getAbsences()),
    map((absences) => absenceService.makeAbendsenceText(absences)),
    switchMap((absenceText) => MailService.send(absenceText))
  )
  .subscribe((mailInfo) => {
    console.info(mailInfo);
  });
