import {
  ChangeDetectorRef,
  Directive,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';

import {
  NextObserver,
  Observable,
  PartialObserver,
  pipe,
  ReplaySubject,
} from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  startWith,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import {
  CdAware,
  // This will later on replaced by a new NgRxLetConfig interface
  CoalescingConfig as NgRxLetConfig,
  RemainHigherOrder,
} from '../core';

export interface LetContext {
  // to enable `let` syntax we have to use $implicit (var; let v = var)
  $implicit?: any;
  // to enable `as` syntax we have to assign the directives selector (var as v)
  ngrxLet?: any;
  // set context var complete to true (var$; let v = $error)
  $error?: Error | undefined;
  // set context var complete to true (var$; let v = $complete)
  $complete?: boolean | undefined;
}

function getLetContextObj(): LetContext {
  return {
    $implicit: undefined,
    ngrxLet: undefined,
    $error: undefined,
    $complete: undefined,
  };
}

@Directive({
  selector: '[ngrxLet]',
})
export class LetDirective extends CdAware implements OnInit, OnDestroy {
  private readonly ViewContext = getLetContextObj();
  private readonly configSubject = new ReplaySubject<NgRxLetConfig>();
  private readonly config$ = this.configSubject.pipe(
    filter(v => v !== undefined),
    distinctUntilChanged(),
    startWith({ optimized: true })
  );

  @Input()
  set ngrxLet(potentialObservable: Observable<any>) {
    this.observablesSubject.next(potentialObservable);
  }

  @Input()
  set ngrxLetConfig(config: NgRxLetConfig) {
    this.configSubject.next(config || { optimized: true });
  }

  constructor(
    cdRef: ChangeDetectorRef,
    ngZone: NgZone,
    private readonly templateRef: TemplateRef<LetContext>,
    private readonly viewContainerRef: ViewContainerRef
  ) {
    super(cdRef, ngZone);
    this.subscription.add(this.observables$.subscribe());
  }

  ngOnInit() {
    this.viewContainerRef.createEmbeddedView(
      this.templateRef,
      this.ViewContext
    );
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.viewContainerRef.clear();
  }

  getResetContextObserver(): NextObserver<any> {
    return {
      next: _ => {
        this.ViewContext.$implicit = undefined;
        this.ViewContext.ngrxLet = undefined;
        this.ViewContext.$error = undefined;
        this.ViewContext.$complete = undefined;
      },
    };
  }

  getUpdateViewContextObserver<T>(): PartialObserver<T> {
    return {
      next: value => {
        this.ViewContext.$implicit = value;
        this.ViewContext.ngrxLet = value;
      },
      error: error => (this.ViewContext.$error = error),
      complete: () => (this.ViewContext.$complete = true),
    };
  }

  getConfigurableBehaviour<T>(): RemainHigherOrder<T> {
    return pipe(
      withLatestFrom(this.config$),
      map(([value$, config]: [Observable<any>, NgRxLetConfig]) => {
        // As discussed with Brandon we keep it here because in the beta we implement configuration behavior here
        return !config.optimized
          ? value$.pipe(tap(() => this.work()))
          : value$.pipe(
              // @TODO add coalesce operator here
              tap(() => this.work())
            );
      })
    );
  }
}
