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
  Output,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { isNumberLike, _readKeyCode } from '@dynatrace/barista-components/core';

const MAX_HOURS = 23;
const MAX_MINUTES = 59;
const MIN_HOURS = 0;
const MIN_MINUTES = 0;

export class DtTimeChangeEvent {
  format(): string {
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

  _onHourKeyUp(): void {
    if (
      _hasMininmumTwoDigits(this._hour) &&
      !_hasMininmumTwoDigits(this._minute)
    ) {
      this._minuteInput.nativeElement.focus();
    }
  }

  _onInputBlur(origin: FocusOrigin): void {
    if (origin === null) {
      this._emitTimeChangeEvent();
    }
  }

  /** @internal Handler for the users input events. */
  _handleInput(event: KeyboardEvent, inputType: 'hour' | 'minute'): void {
    const keyCode = _readKeyCode(event);
    const validatorFn =
      inputType === 'hour' ? _isValidHour : _isValidMinuteInput;
    // This is the value before the keydown event is registered
    const value = (event.currentTarget as HTMLInputElement).value;
    const valid = _isSpecialCharAllowed(keyCode) || validatorFn(value);
    if (valid) {
      const parsedValue = parseInt(value, 10);
      if (inputType === 'hour') {
        this._hour = parsedValue;
      } else {
        this._minute = parsedValue;
      }
    } else {
      // reset the value to something valid
      if (inputType === 'hour') {
        this._hourInput.nativeElement.value = `${this._hour}`;
      } else {
        this._minute = this._minute;
      }
    }

    this._changeDetectorRef.markForCheck();
  }
}

/** @internal */
export function _isValidHour(value: any): boolean {
  if (!isNumberLike(value)) {
    return false;
  }

  const parsedValue = parseInt(value, 10);
  return parsedValue >= MIN_HOURS && parsedValue <= MAX_HOURS;
}

/** @internal */
export function _isValidMinuteInput(value: any): boolean {
  if (!isNumberLike(value)) {
    return false;
  }

  const parsedValue = parseInt(value, 10);
  return parsedValue >= MIN_MINUTES && parsedValue <= MAX_MINUTES;
}

/** @internal */
export function _hasMininmumTwoDigits(input: number | null): boolean {
  return input !== null && input >= 10;
}

export function _isSpecialCharAllowed(keyCode: number): boolean {
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

/** @internal */
export function _valueTo2DigitString(value: number): string {
  return value < 10 ? `0${value}` : value.toString();
}
