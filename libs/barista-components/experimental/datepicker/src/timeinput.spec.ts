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

import { isValidHour, valueTo2DigitString } from './timeinput';

describe('timeinput', () => {
  describe('_validateAndParseInput', () => {});

  describe('valueTo2DigitString', () => {
    it('should cast a number value to string', () => {
      expect(valueTo2DigitString(20)).toBe('20');
    });

    it('should prepend zeros for numbers smaller than 10', () => {
      expect(valueTo2DigitString(8)).toBe('08');
      expect(valueTo2DigitString(0)).toBe('00');
    });
  });

  describe('isValidHour', () => {
    it('should return true with a integer between 0 and 23', () => {
      expect(isValidHour(0)).toBeTruthy();
      expect(isValidHour(12)).toBeTruthy();
      expect(isValidHour(23)).toBeTruthy();
    });
    it('should return false with a float between 0 and 23', () => {
      expect(isValidHour(0.3)).toBeFalsy();
      expect(isValidHour(5.1)).toBeFalsy();
    });
    it('should return false with a integer outside the valid range', () => {
      expect(isValidHour(25)).toBeFalsy();
      expect(isValidHour(-1)).toBeFalsy();
      expect(isValidHour(35.1)).toBeFalsy();
      expect(isValidHour(-5.1)).toBeFalsy();
      expect(isValidHour('0000008')).toBeFalsy();
      expect(isValidHour('25')).toBeFalsy();
      expect(isValidHour('-1')).toBeFalsy();
      expect(isValidHour('35.1')).toBeFalsy();
      expect(isValidHour('-5.1')).toBeFalsy();
      expect(isValidHour('5.0')).toBeFalsy();
    });
  });
});
