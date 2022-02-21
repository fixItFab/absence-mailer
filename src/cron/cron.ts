import { schedule } from "node-cron";
import { Observable } from "rxjs";

export function cron(expr: string): Observable<void> {
  return new Observable((subscriber) => {
    const task = schedule(expr, () => {
      subscriber.next();
    });

    task.start();

    return () => task.stop();
  });
}
