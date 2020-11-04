import { flush } from '@angular/core/testing';
/**
 * @license
 * Copyright 2020 Dynatrace LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Component, ElementRef, ViewChild } from '@angular/core';
import {
  async,
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import {
  DtDatepickerModule,
  DtTimeInput,
} from '@dynatrace/barista-components/experimental/datepicker';
import { createComponent } from '@dynatrace/testing/browser';

/**
 * - INPUT hour
 * - INPUT minute
 * - INPUT disabled
 * - OUTPUT eventemitter
 * - _hourInput and its corresponding functions
 * - _minuteInput and its corresponding functions
 * - Hour to Minute focus jump
 * - On blur should emit an event
 * - Test if the annoying characters aren't displayed
 * - Minute/Hour check for string formatting concerning validity
 */

describe('DtTimeInput', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [DtDatepickerModule],
      declarations: [SimpleTimeInputTestApp],
    });

    TestBed.compileComponents();
  }));

  describe('basic behavior', () => {
    let fixture: ComponentFixture<SimpleTimeInputTestApp>;
    // let element: HTMLElement;
    let component: SimpleTimeInputTestApp;

    beforeEach(() => {
      fixture = createComponent(SimpleTimeInputTestApp);
      // element = fixture.nativeElement;
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    describe('hour input property', () => {});

    describe('minute input property', () => {});

    describe.only('disabled input property', () => {
      // tslint:disable-next-line: dt-no-focused-tests
      it('should not be usable when disabled', fakeAsync(() => {
        // const hourEl = component._hourInput.nativeElement;
        // hourEl.focus();
        // fixture.detectChanges();
        // console.log(element);
        const hourEl = component.timeInput._hourInput.nativeElement;
        hourEl.focus();
        flush();
        fixture.detectChanges();
        tick();
        // console.log(element);
        // console.log(hourEl);
        // element.focus();
        // fixture.detectChanges();
        // console.log(document.activeElement, element);
        // const inputEl = fixture.debugElement.query(By.css('input')).nativeElement;
        expect(document.activeElement).toBe(hourEl);
        component.disabled = true;
        fixture.detectChanges();
        tick();

        console.log('hourEl ', hourEl);
        console.log('test ', hourEl.disabled);
        console.log('activeElement ', document.activeElement);
        expect(document.activeElement).toBe(document.body);
        expect(hourEl.disabled).toBeTruthy();
        // expect(hourEl.getAttribute('disabled')).toBeTruthy();
      }));
    });

    describe('timeChange event', () => {
      // element.focus();
      // fixture.detectChanges();
      // component.hour = 23;
      // component.minute = 55;
      const hourEl = component.timeInput._hourInput.nativeElement;
      hourEl.value = 'hello';
      // Simulate input event.
      // hourEl.triggerEventHandler('input', { target: hourEl });
      fixture.detectChanges();

      // fixture.detectChanges();
      // document.body.focus();
      // fixture.detectChanges();
    });

    describe('focus switch', () => {});

    describe('Input handling', () => {});

    describe('Unwanted characters', () => {});

    describe('Time validity', () => {});
  });
});

@Component({
  selector: 'dt-test-app',
  template: `
    <dt-timeinput
      [disabled]="disabled"
      [hour]="hour"
      [minute]="minute"
    ></dt-timeinput>
  `,
})
class SimpleTimeInputTestApp {
  hour = 11;
  minute = 53;
  disabled = false;

  @ViewChild(DtTimeInput) timeInput: DtTimeInput;

  /** @internal */
  @ViewChild('hours', { read: ElementRef }) _hourInput: ElementRef<
    HTMLInputElement
  >;

  /** @internal */
  @ViewChild('minutes', { read: ElementRef }) _minuteInput: ElementRef<
    HTMLInputElement
  >;

  // selectEvent: DtTimeInput;

  // ? We might need that in order to test events like the blur ...
  // handleTabChange(event: DtTimeInput): void {
  //   this.selectEvent = event;
  // }
}
