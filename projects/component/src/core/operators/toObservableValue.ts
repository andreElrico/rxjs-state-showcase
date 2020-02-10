import { from, Observable, of } from 'rxjs';
import {
  ArgumentNotObservableError,
  isObservableGuard,
  isPromiseGuard,
  isUndefinedOrNullGuard,
  potentialObservableValue,
} from '../utils';

// @TODO make it a OperatorFunction
export function toObservableValue<T>(
  potentialObservableValue$: potentialObservableValue<T>
): Observable<T | undefined | null> {
  if (isUndefinedOrNullGuard(potentialObservableValue$)) {
    return of(potentialObservableValue$);
  }

  if (
    isPromiseGuard(potentialObservableValue$) ||
    isObservableGuard(potentialObservableValue$)
  ) {
    return from(potentialObservableValue$);
  }

  throw new ArgumentNotObservableError();
}
