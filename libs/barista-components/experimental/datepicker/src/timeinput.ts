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
  SimpleChanges,
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
    // this._hour = _tryParseHourInput(value, this._hour);
    // this._changeDetectorRef.detectChanges();
    console.log(`parsed hour ${this._hour}`);
    // this._emitTimeChangeEvent();
    // this._handleMinuteFocusSwitch();
    // this._tryUpdateInputElementValues();
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
    // this._minute = _tryParseMinutesInput(value, this._minute);
    // this._emitTimeChangeEvent();
    // this._handleHourFocusSwitch();
    // this._tryUpdateInputElementValues();
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

  ngDoCheck(): void {
    console.log(`ngDoCheck hour ${this._hour}`);
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log(`ngOnChanges ${changes}`);
  }

  /**
   * @internal
   * Emits the `time change` event.
   */
  _emitTimeChangeEvent(): void {
    console.log('event emitted');
    const event = new DtTimeChangeEvent(this._hour || 0, this._minute || 0);
    this.timeChanges.emit(event);
  }

  // /** @internal */
  _focusMinutes(): void {
    this._minuteInput.nativeElement.focus();
  }

  // /** @internal */
  // _focusHours(): void {
  //   // if (this._hourInput) {
  //   this._hourInput.nativeElement.focus();
  //   // }
  // }

  // /** @internal */
  _onHourChange(value: number | null): void {
    this.hour = value;
    console.log('hour changed', value);
    // this._emitTimeChangeEvent();
  }

  // /** @internal */
  // _minuteChanged(value: number | null): void {
  //   console.log('minute changed', value);
  //   this.minute = value;
  //   // this._emitTimeChangeEvent();
  // }

  _handleHourFocusSwitch(): void {
    // if (
    //   this._hasMininmumTwoDigits(this._minute) &&
    //   !this._hasMininmumTwoDigits(this._hour)
    // ) {
    //   this._focusHours();
    // }
  }

  _onHourKeyUp(): void {
    // check if hour has focus
    if (
      this._hasMininmumTwoDigits(this._hour) &&
      !this._hasMininmumTwoDigits(this._minute)
    ) {
      this._focusMinutes();
    }
  }

  _onInputBlur(origin: FocusOrigin): void {
    if (origin === null) {
      this._emitTimeChangeEvent();
    }
  }

  // get _handleHourInput(): string {
  //   console.log(this._hourInput);
  //   this._hour = _tryParseHourInput(this.hour, this._hour);
  //   this._handleMinuteFocusSwitch();
  //   this._tryUpdateInputElementValues();
  //   this._emitTimeChangeEvent();
  //   this._changeDetectorRef.markForCheck();
  //   return this.formattedHour;
  // }
  // set _handleHourInput(value: string) {
  //   this.hour = value as any;
  // }

  // _handleMinuteInput(): void {
  //   this._handleHourFocusSwitch();
  //   this._tryUpdateInputElementValues();
  // }

  /** @internal */
  _hasMininmumTwoDigits(input: number | null): boolean {
    return input !== null && input >= 10;
  }

  /** @internal Handler for the users input events. */
  _handleInput(event: KeyboardEvent, inputType: 'hour' | 'minute'): void {
    const keyCode = _readKeyCode(event);
    const validatorFn =
      inputType === 'hour' ? _isValidHourInput : _isValidMinuteInput;
    // This is the value before the keydown event is registered
    const value = (event.currentTarget as HTMLInputElement).value;
    const valid = this._isSpecialCharAllowed(keyCode) || validatorFn(value);
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

  // private _tryUpdateInputElementValues(): void {
  //   this._tryUpdateHourInputElementValue();
  //   this._tryUpdateMinutesInputElementValue();
  // }

  // private _tryUpdateHourInputElementValue(): void {
  //   // if (this._hourInput) {
  //   this._hourInput.nativeElement.value = _valueTo2DigitString(this.hour || 0);
  //   // }
  // }

  // private _tryUpdateMinutesInputElementValue(): void {
  //   // if (this._minuteInput) {
  //   this._minuteInput.nativeElement.value = _valueTo2DigitString(this.minute || 0);
  //   // }
  // }

  // get formattedHour(): string {
  //   return isDefined(this.hour) ? `${_valueTo2DigitString(this.hour)}` : '';
  // }
  // set formattedHour(value: string) {
  //   this.hour = value as any;
  // }

  // get formattedMinute(): string {
  //   return isDefined(this.minute) ? `${_valueTo2DigitString(this.minute)}` : '';
  // }
  // set formattedMinute(value: string) {
  //   this.minute = value as any;
  // }
}

/** @internal */
export function _isValidHourInput(value: any): boolean {
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

// /** @internal */
// export function _tryParseHourInput(
//   value: any,
//   fallbackValue: number | null,
// ): number | null {
//   return _tryParseInput(value, MIN_HOURS, MAX_HOURS, fallbackValue);
// }

// /** @internal */
// export function _tryParseMinutesInput(
//   value: any,
//   fallbackValue: number | null,
// ): number | null {
//   return _tryParseInput(value, MIN_MINUTES, MAX_MINUTES, fallbackValue);
// }

// /** @internal */
// export function _tryParseInput(
//   value: any,
//   min: number,
//   max: number,
//   fallbackValue: number | null,
// ): number | null {
//   if (value == null) {
//     return null;
//   }

//   if (isString(value) && NUMBER_REGEX.test(value)) {
//     value = parseInt(value, 10);
//   }

//   if (isNumber(value) && value >= min && value <= max) {
//     return value;
//   }

//   return isNumber(fallbackValue) ? fallbackValue : null;
// }

//pipe
/** @internal */
export function _valueTo2DigitString(value: number): string {
  return value < 10 ? `0${value}` : value.toString();
}
