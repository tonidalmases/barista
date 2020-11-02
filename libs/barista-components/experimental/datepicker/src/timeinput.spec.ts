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
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { DtTimeInput } from '@dynatrace/barista-components/experimental/datepicker';
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
      imports: [FormsModule],
      declarations: [SimpleTimeInputTestApp, DtTimeInput],
    });

    TestBed.compileComponents();
  }));

  describe('basic behavior', () => {
    let fixture: ComponentFixture<SimpleTimeInputTestApp>;
    let element: HTMLElement;
    let component: SimpleTimeInputTestApp;

    beforeEach(() => {
      fixture = createComponent(SimpleTimeInputTestApp);
      element = fixture.nativeElement;
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    describe('hour input property', () => {});

    describe('minute input property', () => {});

    describe.only('disabled input property', () => {
      // tslint:disable-next-line: dt-no-focused-tests
      it.only('should not be usable when disabled', () => {
        element.focus();
        fixture.detectChanges();
        console.log(document.activeElement, element);
        expect(document.activeElement).toBe(element);
        component.disabled = true;
        fixture.detectChanges();
        expect(document.activeElement).toBe(document.body);
      });
    });

    describe('timeChange event', () => {
      element.focus();
      fixture.detectChanges();
      component.hour = 23;
      component.minute = 55;
      fixture.detectChanges();
      document.body.focus();
      fixture.detectChanges();
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

  /** @internal */
  @ViewChild('hours', { read: ElementRef }) _hourInput: ElementRef<
    HTMLInputElement
  >;

  /** @internal */
  @ViewChild('minutes', { read: ElementRef }) _minuteInput: ElementRef<
    HTMLInputElement
  >;
  selectEvent: DtTimeInput;

  // ? We might need that in order to test events like the blur ...
  // handleTabChange(event: DtTimeInput): void {
  //   this.selectEvent = event;
  // }
}
