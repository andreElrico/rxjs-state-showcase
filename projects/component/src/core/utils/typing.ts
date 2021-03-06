import { isObservable, Observable, OperatorFunction } from 'rxjs';

export type observableValue<T> = Promise<T> | Observable<T>;

export type RemainHigherOrder<T> = (
  o$$: Observable<Observable<T>>
) => Observable<Observable<T>>;

export function isPromiseGuard<T>(value: any): value is Promise<T> {
  return (
    !!value &&
    typeof (value as any).subscribe !== 'function' &&
    typeof (value as any).then === 'function'
  );
}

export function isObservableGuard<T>(
  potentialObservable: any
): potentialObservable is Observable<T> {
  return isObservable(potentialObservable);
}

export function isOperateFnArrayGuard<T>(
  op: any[]
): op is OperatorFunction<T, any>[] {
  return op.every((i: any) => typeof i !== 'string');
}

export function isStringArrayGuard(op: any[]): op is string[] {
  return op.every((i: any) => typeof i !== 'string');
}

export function isDefinedGuard<T>(opr: any): opr is T {
  return !!opr;
}

export function isIterableGuard<T>(obj: any): obj is Array<T> {
  if (obj === undefined) {
    return false;
  }
  return typeof (obj as any)[Symbol.iterator] === 'function';
}
