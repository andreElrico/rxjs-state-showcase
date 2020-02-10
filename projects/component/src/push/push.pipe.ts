import { ChangeDetectorRef, NgZone, Pipe, PipeTransform } from '@angular/core';
import { NextObserver, Observable, PartialObserver, pipe, Subject } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import {
  remainHigherOrder,
  CdAware,
  coalesce,
  CoalescingConfig,
  processCdAwareObservables,
  STATE_DEFAULT,
} from '../core';

interface NgRxPushPipeConfig extends CoalescingConfig {}

@Pipe({ name: 'ngrxPush', pure: false })
export class PushPipe extends CdAware implements PipeTransform {
  private renderedValue: any = STATE_DEFAULT;

  configSubject = new Subject<NgRxPushPipeConfig>();
  config$ = this.configSubject.asObservable().pipe(
    filter(v => v !== undefined),
    distinctUntilChanged()
  );

  protected observablesSubject = new Subject<
    Observable<any> | Promise<any> | null | undefined
  >();
  protected observables$ = this.observablesSubject.pipe(
    processCdAwareObservables(
      this.getResetContextBehaviour(),
      this.getUpdateContextBehaviour(),
      this.getConfigurableBehaviour()
    )
  );

  constructor(cdRef: ChangeDetectorRef, ngZone: NgZone) {
    super(cdRef, ngZone);
    this.initCdAware();
    this.cdAwareSubscription = this.observables$.subscribe();
  }

  transform<T>(obj: null | undefined, config?: NgRxPushPipeConfig): null;
  transform<T>(obj: Observable<T>, config?: NgRxPushPipeConfig): T;
  transform<T>(
    obs: Observable<T> | null | undefined,
    config: NgRxPushPipeConfig = { optimized: true }
  ): T | null | undefined {
    this.configSubject.next(config);
    this.observablesSubject.next(obs);
    return this.renderedValue;
  }

  getConfigurableBehaviour<T>(): remainHigherOrder<T> {
    return pipe(
      withLatestFrom(this.config$),
      map(([value$, config]) => {
        return !config.optimized
          ? value$.pipe(tap(v => this.work()))
          : value$.pipe(
              coalesce({
                context: (this.cdRef as any)._cdRefInjectingView,
                executionContextRef: this.requestAnimationFrameRef,
              })
            );
      })
    );
  }

  getUpdateViewContextObserver(): PartialObserver<any> {
    return {
      // assign value that will get returned from the transform function on the next change detection
      next: (value: any) => (this.renderedValue = value),
      error: (error: Error) => (this.renderedValue = error.message),
    };
  }

  getResetContextObserver(): NextObserver<any> {
    return {
      next: (value: any) => (this.renderedValue = STATE_DEFAULT),
    };
  }
}
