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

import { Component, ViewChild, ElementRef } from '@angular/core';
import { TestBed, ComponentFixture, waitForAsync } from '@angular/core/testing';
import { createComponent } from '@dynatrace/testing/browser';
import { DtDatepickerModule, DtTimepicker } from '..';

describe('DtTimePicker', () => {
  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        imports: [DtDatepickerModule],
        declarations: [SimpleTimePickerTestApp],
      });

      TestBed.compileComponents();
    }),
  );

  describe('basic behavior', () => {
    let fixture: ComponentFixture<SimpleTimePickerTestApp>;
    let component: SimpleTimePickerTestApp;

    beforeEach(() => {
      fixture = createComponent(SimpleTimePickerTestApp);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    /**
     * Add tests for the range mode which will be added in a later version.
     */
  });
});

@Component({
  selector: 'dt-test-app',
  template: `
    <dt-timepicker
      [disabled]="disabled"
      [hour]="hour"
      [minute]="minute"
      [isTimeRangeEnabled]="false"
    ></dt-timepicker>
  `,
})
class SimpleTimePickerTestApp {
  hour = 11;
  minute = 53;
  disabled = false;

  @ViewChild(DtTimepicker) timePicker: DtTimepicker;
}
