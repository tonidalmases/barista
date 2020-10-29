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

import { FocusOrigin } from '@angular/cdk/a11y';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {
  isDefined,
  isEmpty,
  isNumberLike,
  isString,
} from '@dynatrace/barista-components/core';

const MAX_HOURS = 23;
const MAX_MINUTES = 59;
const MIN_HOURS = 0;
const MIN_MINUTES = 0;
const INVALID_TIME_REGEX = /[0]{3,}|[.-]|[0]{2}[0-9]/g;

export class DtTimeChangeEvent {
  format(): string {
    return `${valueTo2DigitString(this.hour)}
    : ${valueTo2DigitString(this.minute)}`;
  }
  constructor(public hour: number, public minute: number) {}
}

@Component({
  selector: 'dt-timeinput',
  templateUrl: 'timeinput.html',
  styleUrls: ['timeinput.scss'],
  host: {
    class: 'dt-timeinput',
  },
  encapsulation: ViewEncapsulation.Emulated,
  preserveWhitespaces: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DtTimeInput {
  @Input()
  get hour(): number | null {
    return this._hour;
  }
  set hour(value: number | null) {
    if (value === this._hour) {
      return;
    }

    this._hour = value;
    this._changeDetectorRef.markForCheck();
  }
  private _hour: number | null = null;

  @Input()
  get minute(): number | null {
    return this._minute;
  }
  set minute(value: number | null) {
    if (value === this._minute) {
      return;
    }

    this._minute = value;
    this._changeDetectorRef.markForCheck();
  }
  private _minute: number | null = null;

  /** Binding for the disabled state. */
  @Input()
  get disabled(): boolean {
    return this._isDisabled;
  }
  set disabled(disabled: boolean) {
    this._isDisabled = coerceBooleanProperty(disabled);
    this._changeDetectorRef.markForCheck();
  }
  private _isDisabled: boolean = false;

  /** Emits when the new hour or minute value changes. */
  @Output() timeChanges = new EventEmitter<DtTimeChangeEvent>();

  /** @internal */
  @ViewChild('hours', { read: ElementRef }) _hourInput: ElementRef<
    HTMLInputElement
  >;

  /** @internal */
  @ViewChild('minutes', { read: ElementRef }) _minuteInput: ElementRef<
    HTMLInputElement
  >;

  constructor(private _changeDetectorRef: ChangeDetectorRef) {}

  /**
   * @internal
   * Emits the `time change` event.
   */
  _emitTimeChangeEvent(): void {
    console.log('event emitted');
    const event = new DtTimeChangeEvent(this._hour || 0, this._minute || 0);
    this.timeChanges.emit(event);
  }

  // Add the focus switch from the hour input to the minute input when the user typed in at least 2 digits.
  _onHourKeyUp(): void {
    if (
      hasMininmumTwoDigits(this._hour) &&
      !hasMininmumTwoDigits(this._minute)
    ) {
      this._minuteInput.nativeElement.focus();
    }
  }

  _onInputBlur(origin: FocusOrigin): void {
    if (origin === null) {
      this._emitTimeChangeEvent();
    }
  }

  /**
   * @internal Handler for the user's hour input events.
   * (If keydown event is used to prevent adding invalid input, we cannot access the whole value, just the last typed character)
   */
  _handleHourInput(event: InputEvent): void {
    const value = (event.currentTarget as HTMLInputElement).value;

    if (isValidHour(value)) {
      this._hour = parseInt(value, 10);
    } else {
      this._hourInput.nativeElement.value = isDefined(this._hour)
        ? `${this._hour}`
        : ''; // reset the value to something valid
    }

    this._changeDetectorRef.markForCheck();
  }

  /** @internal Handler for the user's minute input events. */
  _handleMinuteInput(event: InputEvent): void {
    const value = (event.currentTarget as HTMLInputElement).value;

    if (isValidMinute(value)) {
      this._minute = parseInt(value, 10);
    } else {
      this._minuteInput.nativeElement.value = isDefined(this._minute)
        ? `${this._minute}`
        : ''; // reset the value to something valid
    }

    this._changeDetectorRef.markForCheck();
  }

  /**
   * @internal Prevent typing in '.' and "-", since the input value will not reflect it on the change event
   * (the event target value does not include trailing '.' or "-" -> or it does not trigger any event in case the user types in "-" for example)
   */
  _handleKeydown(event: KeyboardEvent): boolean {
    return event.key !== '.' && event.key !== '-';
  }
}

/** Check is the hour value is valid. */
export function isValidHour(value: any): boolean {
  return isValid(value, MIN_HOURS, MAX_HOURS);
}

/** Check if the minute value is valid. */
export function isValidMinute(value: any): boolean {
  return isValid(value, MIN_MINUTES, MAX_MINUTES);
}

/** Check if a value if a valid hour/minute number in the range */
export function isValid(value: any, min: number, max: number): boolean {
  if (isEmpty(value)) {
    return true;
  }

  if (!isNumberLike(value)) {
    return false;
  }

  // the regex is necessary for invalidating chars like '-' or '.', as well as multiple leading 0s.
  if (isString(value) && value.match(INVALID_TIME_REGEX)) {
    return false;
  }

  const parsedValue = parseInt(value, 10);
  return parsedValue >= min && parsedValue <= max;
}

/** Check if a number has at least two digits or is null. */
export function hasMininmumTwoDigits(input: number | null): boolean {
  return input !== null && input >= 10;
}

/** Format a number to have two digits (with a leading 0 in case it is a single digit or convert it to string otherwise). */
export function valueTo2DigitString(value: number): string {
  return value < 10 ? `0${value}` : value.toString();
}
