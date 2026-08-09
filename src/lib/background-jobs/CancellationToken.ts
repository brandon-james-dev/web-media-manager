import { Subject } from "rxjs";

export class CancellationToken {
  private cancelSubject = new Subject<void>();

  cancel() {
    this.cancelSubject.next();
  }

  get onCancel$() {
    return this.cancelSubject.asObservable();
  }
}
