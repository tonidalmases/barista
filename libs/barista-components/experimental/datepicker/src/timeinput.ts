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

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  BACKSPACE,
  DELETE,
  DOWN_ARROW,
  ENTER,
  LEFT_ARROW,
  RIGHT_ARROW,
  TAB,
  UP_ARROW,
} from '@angular/cdk/keycodes';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {
  isDefined,
  isNumber,
  isString,
  _readKeyCode,
} from '@dynatrace/barista-components/core';
import { Subject } from 'rxjs';

const MAX_HOURS = 23;
const MAX_MINUTES = 59;
const MIN_HOURS = 0;
const MIN_MINUTES = 0;
const NUMBER_REGEX = /^\d+$/g;

export class DtTimeChangeEvent {
  get value(): string {
    return `${_valueTo2DigitString(this.hour)}
    : ${_valueTo2DigitString(this.minute)}`;
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
export class DtTimeInput implements OnDestroy {
  @Input()
  get hour(): number | null {
    return this._hour;
  }
  set hour(value: number | null) {
    if (value === this._hour || (this._hour == null && value == null)) {
      return;
    }

    this._hour = _tryParseHourInput(value, this._hour);
    this._emitTimeChangeEvent();

    if (
      this._hasMininmumTwoDigits(this._hour) &&
      !this._hasMininmumTwoDigits(this._minute)
    ) {
      this._focusMinutes();
    }

    this._tryUpdateInputElementValues();
    this._changeDetectorRef.markForCheck();
  }
  private _hour: number | null = null;

  @Input()
  get minute(): number | null {
    return this._minute;
  }
  set minute(value: number | null) {
    if (value === this._minute || (this._minute == null && value == null)) {
      return;
    }

    this._minute = _tryParseMinutesInput(value, this._minute);
    this._emitTimeChangeEvent();

    if (
      this._hasMininmumTwoDigits(this._minute) &&
      !this._hasMininmumTwoDigits(this._hour)
    ) {
      this._focusHours();
    }

    this._tryUpdateInputElementValues();
    this._changeDetectorRef.markForCheck();
  }
  private _minute: number | null = null;

  /** Binding for the disabled state. */
  @Input()
  get disabled(): boolean {
    return this._isDisabled;
  }
  set disabled(disabled: boolean) {
    if (isDefined(disabled)) {
      this._isDisabled = coerceBooleanProperty(disabled);
      this._changeDetectorRef.markForCheck();
    }
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

  private _destroy$ = new Subject<void>();

  constructor(private _changeDetectorRef: ChangeDetectorRef) {}

  /**
   * @internal
   * Emits the `time change` event.
   */
  _emitTimeChangeEvent(): void {
    const event = new DtTimeChangeEvent(this._hour || 0, this._minute || 0);
    this.timeChanges.emit(event);
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  /** @internal */
  _focusMinutes(): void {
    if (this._minuteInput) {
      this._minuteInput.nativeElement.focus();
    }
  }

  /** @internal */
  _focusHours(): void {
    if (this._hourInput) {
      this._hourInput.nativeElement.focus();
    }
  }

  /** @internal */
  _hasMininmumTwoDigits(input: number | null): boolean {
    return input !== null && input >= 10;
  }

  /** @internal Handler for the users key down events. */
  _handleKeydown(event: KeyboardEvent): void {
    const keyCode = _readKeyCode(event);

    if (
      this._isSpecialCharAllowed(keyCode) ||
      (event.key && event.key.match(NUMBER_REGEX))
    ) {
      return;
    }

    // invalid character, prevent input
    event.preventDefault();
  }

  _isSpecialCharAllowed(keyCode: number): boolean {
    const allowedSpecialChars = [
      ENTER,
      BACKSPACE,
      TAB,
      LEFT_ARROW,
      RIGHT_ARROW,
      UP_ARROW,
      DOWN_ARROW,
      DELETE,
    ];

    return allowedSpecialChars.includes(keyCode);
  }

  private _tryUpdateInputElementValues(): void {
    this._tryUpdateHourInputElementValue();
    this._tryUpdateMinutesInputElementValue();
  }

  private _tryUpdateHourInputElementValue(): void {
    if (this._hourInput) {
      this._hourInput.nativeElement.value =
        this._hour !== null ? this._hour.toString() : '';
    }
  }

  private _tryUpdateMinutesInputElementValue(): void {
    if (this._minuteInput) {
      this._minuteInput.nativeElement.value =
        this._minute !== null ? this._minute.toString() : '';
    }
  }
}

/** @internal */
export function _tryParseHourInput(
  value: any,
  fallbackValue: number | null,
): number | null {
  return _tryParseInput(value, MIN_HOURS, MAX_HOURS, fallbackValue);
}

/** @internal */
export function _tryParseMinutesInput(
  value: any,
  fallbackValue: number | null,
): number | null {
  return _tryParseInput(value, MIN_MINUTES, MAX_MINUTES, fallbackValue);
}

/** @internal */
export function _tryParseInput(
  value: any,
  min: number,
  max: number,
  fallbackValue: number | null,
): number | null {
  if (value == null) {
    return null;
  }

  if (isString(value) && NUMBER_REGEX.test(value)) {
    value = parseInt(value, 10);
  }

  if (!isNumber(value)) {
    return isNumber(fallbackValue) ? fallbackValue : null;
  }

  if (value >= min && value <= max) {
    return value;
  }

  return isNumber(fallbackValue) ? fallbackValue : null;
}

/** @internal */
export function _valueTo2DigitString(value: number): string {
  return value < 10 ? `0${value}` : value.toString();
}
