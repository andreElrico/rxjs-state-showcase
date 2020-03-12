import {
  ChangeDetectorRef,
  EmbeddedViewRef,
  NgZone,
  OnDestroy,
  Type,
} from '@angular/core';
import {
  getChangeDetectionHandler,
  observableValue,
  RemainHigherOrder,
} from './utils';
import {
  defer,
  NextObserver,
  Observable,
  PartialObserver,
  Subject,
  Subscription,
} from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { processCdAwareObservables } from './operators';

export interface CoalescingConfig {
  optimized: boolean;
}

// This abstract class holds all the shared logic for the push pipe and the let directive
// responsible for change detection
// If you extend this class you need to implement how the update of the rendered value happens.
// Also custom behaviour is something you need to implement in the extending class
export abstract class CdAware implements OnDestroy {
  readonly handleChangeDetection: <T>(
    component?: T
  ) => void = getChangeDetectionHandler(this.ngZone, this.cdRef);
  protected readonly subscription = new Subscription();
  protected readonly observablesSubject = new Subject<
    observableValue<any> | null | undefined
  >();
  // We have to defer the setup of observables$ until subscription as getConfigurableBehaviour is defined in the
  // extending class. So getConfigurableBehaviour is not available in the abstract layer
  protected readonly observables$ = defer(() =>
    this.observablesSubject.pipe(
      processCdAwareObservables(
        this.getResetContextBehaviour(),
        this.getUpdateContextBehaviour(),
        this.getConfigurableBehaviour()
      )
    )
  );

  constructor(
    protected readonly cdRef: ChangeDetectorRef,
    protected readonly ngZone: NgZone
  ) {}

  work(): void {
    this.handleChangeDetection(
      // cast is needed to make it work for typescript.
      // cdRef is kinda EmbeddedView
      (this.cdRef as EmbeddedViewRef<Type<any>>).context
    );
  }

  // The side effect for when a new potential observable enters
  // Only the NextObserver is needed as we handle error and complete somewhere else
  abstract getResetContextObserver<T>(): NextObserver<T>;

  // The side effect for when a new value is emitted from the passed observable
  // Here we can use the next, error and complete channels for side-effects
  // We dont handle the error here
  abstract getUpdateViewContextObserver<T>(): PartialObserver<T>;

  // The custom behaviour of the observable carrying the values to render
  // Here we apply potential configurations as well as behaviour for different implementers ob this abstract calss
  abstract getConfigurableBehaviour<T>(): RemainHigherOrder<T>;

  getUpdateContextBehaviour<T>(): RemainHigherOrder<T> {
    return map(value$ =>
      value$.pipe(tap<T>(this.getUpdateViewContextObserver()))
    );
  }

  getResetContextBehaviour<T>(): RemainHigherOrder<T> {
    return tap<Observable<T>>(this.getResetContextObserver());
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
