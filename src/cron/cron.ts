import { schedule } from "node-cron";
import { Observable } from "rxjs";

export function cron(expr: string, timezone: string): Observable<void> {
  return new Observable((subscriber) => {
    const task = schedule(
      expr,
      () => {
        subscriber.next();
      },
      { timezone }
    );

    task.start();

    return () => task.stop();
  });
}
